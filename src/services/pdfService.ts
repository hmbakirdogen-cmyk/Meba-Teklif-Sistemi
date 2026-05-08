import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * pdfService — A4 önizlemesini lossless PDF'e çevirir.
 *
 * Standart "PDF İndir" akışı:
 *   - Her sayfa html2canvas ile dinamik scale (devicePixelRatio × 3, 3–9 arası)
 *     yüksekliğinde raster edilir.
 *   - Çıktı doğrudan PNG (lossless) olarak jsPDF'e gömülür → addImage('PNG', …,
 *     'NONE'). PDF stream'i jsPDF'in lossless flate sıkıştırmasıyla küçülür.
 *   - Hiçbir kalite kaybı yok; dosya boyutu serbest.
 *
 * E-posta akışı (buildEmailPdf):
 *   - Önce PNG dener; ≤ 1 MB ise döner. Aksi halde JPEG quality + hafif
 *     downscale zinciriyle (0.95 → 0.92 → 0.88 → 0.85) en iyi sığan halini
 *     döndürür.
 *
 * Yazdırma (buildPrintImages):
 *   - PNG döndürür; iframe ile @page A4 portrait basar.
 */

/** E-posta PDF için maksimum dosya boyutu (SMTP eklerinde minimum sürtünme). */
const EMAIL_MAX_BYTES = 1024 * 1024;

/**
 * Sabit scale = 4 (~384 DPI A4). Her ekranda en yüksek netlik; dosya boyutu
 * lossless flate ile yönetilebilir kalıyor.
 */
function getOptimalScale(): number {
  return 4;
}

/**
 * Tüm html2canvas çağrılarında ortak olan baz seçenekler. `scale` her render
 * öncesi `getOptimalScale()` ile dinamik atanır.
 */
const HTML2CANVAS_BASE_OPTIONS = {
  useCORS: true,
  allowTaint: false,
  logging: false,
  // A4 belge her zaman beyaz — transparent (null) edge anti-aliasing'inde
  // koyu header / genel toplam alanlarında çok ince renk drift yaratıyordu.
  // Beyaz arka plan kompozisyonu tamamen flatten edip ekrandaki rengi
  // korur (PDF arka planı zaten beyaz, transparency'ye gerek yok).
  backgroundColor: '#ffffff',
  imageTimeout: 60000,
  foreignObjectRendering: false,
  letterRendering: true,
} as const;

/**
 * Clone DOM'una enjekte edilen renk-tutarlılık stylesheet'i. `@media print`
 * bloğunda zaten benzer kurallar var ama html2canvas screen modunda render
 * ettiği için print kuralları tetiklenmiyordu. Bu stylesheet clone'a inline
 * eklenerek tüm descendant'larda print-color-adjust:exact zorlanır;
 * taraycının koyu/gradient alanlarda "economy" optimizasyonu yapması
 * engellenir. Sonuç: ekrandaki ile bire bir renk.
 */
const CLONE_QUALITY_STYLESHEET = `
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  html, body {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  img {
    image-rendering: auto !important;
  }
`;

type JpegAttempt = {
  quality: number;
  downscale: number;
  compression: 'NONE' | 'FAST' | 'MEDIUM';
};

/**
 * html2canvas'ın oluşturduğu DOM kopyasında ekrandaki kalite ipuçlarını
 * çoğaltır: print-color-adjust, font kerning/smoothing, geometric text
 * rendering. Logo gibi <img>'lerde imageRendering 'auto' (lanczos) korunur.
 */
function applyCloneQualityFixes(clonedDoc: Document, clonedEl: HTMLElement): void {
  // 1) Global stylesheet enjeksiyonu — tüm descendant'larda color-adjust:exact
  //    !important. Tek inline style ile root'a yazmak inheritance için yeterli
  //    değil; bazı child'lar kendi `color-adjust: economy` ya da implicit
  //    optimizasyon hint'leri ile taraycıyı "hafif renkleri at" moduna
  //    sokabiliyor. !important ile zorluyoruz.
  try {
    const styleEl = clonedDoc.createElement('style');
    styleEl.setAttribute('data-pdf-quality', 'true');
    styleEl.textContent = CLONE_QUALITY_STYLESHEET;
    const head = clonedDoc.head || clonedDoc.documentElement;
    if (head) head.appendChild(styleEl);
  } catch { /* clonedDoc head yoksa fallback'e düş */ }

  // 2) Root'a font-smoothing + text-rendering kalıtımı (CSS inheritance ile
  //    child'lara geçer). Eski querySelectorAll('*') + getComputedStyle loop'u
  //    büyük belgelerde n× DOM walk darboğazı yaratıyordu.
  clonedEl.style.setProperty('-webkit-print-color-adjust', 'exact');
  clonedEl.style.printColorAdjust = 'exact';
  clonedEl.style.setProperty('color-adjust', 'exact');
  clonedEl.style.textRendering = 'geometricPrecision';
  clonedEl.style.setProperty('-webkit-font-smoothing', 'antialiased');
  clonedEl.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
  clonedEl.style.fontKerning = 'normal';
  clonedEl.style.setProperty('font-feature-settings', '"kern" 1');
  clonedEl.style.overflow = 'visible';
}

/**
 * pagedRootEl içinde `data-pdf-page="true"` markerli her sayfayı ayrı bir
 * canvas'a render eder. Sayfa kırma mantığı template tarafında önceden
 * hesaplanmıştır; burada sadece her sayfa elementi kendi A4 ölçüsünde
 * raster edilir.
 */
async function renderPageCanvases(pagedRootEl: HTMLElement): Promise<HTMLCanvasElement[]> {
  await document.fonts.ready;

  const pageEls = Array.from(
    pagedRootEl.querySelectorAll<HTMLElement>('[data-pdf-page="true"]'),
  );

  if (pageEls.length === 0) {
    throw new Error('PDF sayfalari bulunamadi.');
  }

  const scale = getOptimalScale();

  // Sayfalar paralel render edilir — html2canvas DOM kopyası üzerinde çalıştığı
  // için birbirine karışmaz, ve I/O (font/decoder) örtüşür. 3-5 sayfa için
  // memory artmaşı ihmal edilebilir; tek sayfada da ek maliyet yok.
  const canvases = await Promise.all(
    pageEls.map(async (el) => {
      const rect = el.getBoundingClientRect();
      // CSS pixel → integer (subpixel boyut blur yapar)
      const renderWidth  = Math.max(1, Math.round(rect.width  || el.scrollWidth  || el.offsetWidth  || Math.round(210 * (96 / 25.4))));
      const renderHeight = Math.max(1, Math.round(rect.height || el.scrollHeight || el.offsetHeight || Math.round(297 * (96 / 25.4))));

      return html2canvas(el, {
        ...HTML2CANVAS_BASE_OPTIONS,
        scale,
        width: renderWidth,
        height: renderHeight,
        windowWidth: renderWidth,
        windowHeight: renderHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc, clonedEl) => {
          applyCloneQualityFixes(clonedDoc, clonedEl);
        },
      });
    }),
  );

  return canvases;
}

/** Canvas → lossless PNG data URL. */
function encodeCanvasToPng(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/** Canvas → JPEG (e-posta fallback). Hafif downscale destekli. */
function encodeCanvasToJpeg(
  sourceCanvas: HTMLCanvasElement,
  quality: number,
  downscale: number,
): string {
  if (downscale >= 0.999) {
    return sourceCanvas.toDataURL('image/jpeg', quality);
  }

  const targetWidth  = Math.max(1, Math.round(sourceCanvas.width  * downscale));
  const targetHeight = Math.max(1, Math.round(sourceCanvas.height * downscale));
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width  = targetWidth;
  tempCanvas.height = targetHeight;
  const context = tempCanvas.getContext('2d');
  if (!context) {
    return sourceCanvas.toDataURL('image/jpeg', quality);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  return tempCanvas.toDataURL('image/jpeg', quality);
}

/**
 * Sayfa görüntüleri (PNG veya JPEG) ile A4 portrait jsPDF üretir.
 * compress=true → PDF stream lossless flate sıkıştırması (kalite kaybı yok).
 */
function buildPdfFromImages(
  pageImages: string[],
  imageType: 'PNG' | 'JPEG',
  imageCompression: 'NONE' | 'FAST' | 'MEDIUM',
): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    precision: 16,
  });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pageImages.length; i += 1) {
    if (i > 0) pdf.addPage();
    const imgData = pageImages[i];
    pdf.addImage(imgData, imageType, 0, 0, pdfW, pdfH, undefined, imageCompression);
  }

  return pdf;
}

/**
 * Standart "PDF İndir" akışı — lossless PNG, dosya boyutu sınırı yok.
 * Ekrandaki A4 önizlemesi ile PDF arasında gözle fark edilebilir kalite
 * kaybı bulunmaz.
 */
export async function buildPdf(
  pagedRootEl: HTMLElement,
): Promise<{ pdf: jsPDF; pageImages: string[] }> {
  const canvases = await renderPageCanvases(pagedRootEl);
  const pageImages = canvases.map(encodeCanvasToPng);
  const pdf = buildPdfFromImages(pageImages, 'PNG', 'NONE');
  return { pdf, pageImages };
}

/**
 * E-posta PDF — 1 MB cap'e sığmaya çalışır. Önce PNG; aşıyorsa yüksek
 * kaliteden başlayan JPEG zinciri. Zincir hâlâ aşıyorsa en küçük JPEG
 * çıktısını döndürür.
 */
export async function buildEmailPdf(
  pagedRootEl: HTMLElement,
): Promise<{ pdf: jsPDF; pageImages: string[] }> {
  const canvases = await renderPageCanvases(pagedRootEl);

  // E-posta PDF'i pratikte hep > 1 MB (PNG olarak); önce PNG denemesi 2× boş
  // iş yapıyordu. Direkt JPEG 0.92'den başla; cap'e sığanı döndür.
  const attempts: JpegAttempt[] = [
    { quality: 0.92, downscale: 1.0,  compression: 'FAST' },
    { quality: 0.88, downscale: 0.95, compression: 'FAST' },
    { quality: 0.85, downscale: 0.90, compression: 'FAST' },
  ];

  let bestPdf: jsPDF | null = null;
  let bestImages: string[] = [];
  let bestBytes = Number.POSITIVE_INFINITY;

  for (const attempt of attempts) {
    const pageImages = canvases.map((c) => encodeCanvasToJpeg(c, attempt.quality, attempt.downscale));
    const pdf = buildPdfFromImages(pageImages, 'JPEG', attempt.compression);
    const bytes = (pdf.output('arraybuffer') as ArrayBuffer).byteLength;
    if (bytes < bestBytes) { bestBytes = bytes; bestPdf = pdf; bestImages = pageImages; }
    if (bytes <= EMAIL_MAX_BYTES) return { pdf, pageImages };
  }

  return { pdf: bestPdf!, pageImages: bestImages };
}

/** Yazdırma için her sayfanın PNG data URL'ini döndürür. */
export async function buildPrintImages(
  pagedRootEl: HTMLElement,
): Promise<string[]> {
  const canvases = await renderPageCanvases(pagedRootEl);
  return canvases.map(encodeCanvasToPng);
}
