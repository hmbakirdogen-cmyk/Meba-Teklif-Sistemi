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
 * Aktif ekran/cihaz pixel oranına göre html2canvas scale değeri.
 * 1× ekran → 3, 2× retina → 6, 3× → 9 (üst sınır 9). Daha yüksek scale =
 * daha keskin metin ve ince çizgi, ama bellek/CPU lineer artar.
 */
function getOptimalScale(): number {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  return Math.min(9, Math.max(3, Math.ceil(dpr * 3)));
}

/**
 * Tüm html2canvas çağrılarında ortak olan baz seçenekler. `scale` her render
 * öncesi `getOptimalScale()` ile dinamik atanır.
 */
const HTML2CANVAS_BASE_OPTIONS = {
  useCORS: true,
  allowTaint: false,
  logging: false,
  // backgroundColor null → transparent destekle. DOCUMENT_ROOT_STYLE zaten
  // arka planı beyaz yapıyor, bu sadece transparent piksellerin doğru
  // composite olmasını sağlar.
  backgroundColor: null,
  imageTimeout: 60000,
  foreignObjectRendering: false,
  letterRendering: true,
} as const;

type JpegAttempt = {
  quality: number;
  downscale: number;
  compression: 'NONE' | 'FAST' | 'MEDIUM';
};

/** E-posta için JPEG fallback zinciri — yüksek kaliteden başlayarak iner. */
const EMAIL_JPEG_ATTEMPTS: JpegAttempt[] = [
  { quality: 0.95, downscale: 1.0,  compression: 'MEDIUM' },
  { quality: 0.92, downscale: 0.95, compression: 'MEDIUM' },
  { quality: 0.88, downscale: 0.90, compression: 'FAST' },
  { quality: 0.85, downscale: 0.86, compression: 'FAST' },
];

/**
 * html2canvas'ın oluşturduğu DOM kopyasında ekrandaki kalite ipuçlarını
 * çoğaltır: print-color-adjust, font kerning/smoothing, geometric text
 * rendering. Logo gibi <img>'lerde imageRendering 'auto' (lanczos) korunur.
 */
function applyCloneQualityFixes(clonedEl: HTMLElement): void {
  if (clonedEl.style) {
    clonedEl.style.setProperty('-webkit-print-color-adjust', 'exact');
    clonedEl.style.printColorAdjust = 'exact';
    clonedEl.style.setProperty('color-adjust', 'exact');
  }

  const allElements = clonedEl.querySelectorAll<HTMLElement>('*');
  allElements.forEach((el) => {
    const computed = window.getComputedStyle(el);
    const ff = computed.fontFamily;
    if (ff && ff !== 'serif') {
      el.style.fontFamily = ff;
    }
    el.style.textRendering = 'geometricPrecision';
    el.style.setProperty('-webkit-font-smoothing', 'antialiased');
    el.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
    el.style.fontKerning = 'normal';
    el.style.setProperty('font-feature-settings', '"kern" 1');
  });

  clonedEl.style.overflow = 'visible';

  const images = clonedEl.querySelectorAll<HTMLElement>('img');
  images.forEach((img) => {
    img.style.imageRendering = 'auto';
    img.style.setProperty('-webkit-print-color-adjust', 'exact');
  });
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
  const canvases: HTMLCanvasElement[] = [];

  for (let i = 0; i < pageEls.length; i += 1) {
    const el = pageEls[i];
    const rect = el.getBoundingClientRect();
    // CSS pixel → integer (subpixel boyut blur yapar)
    const renderWidth  = Math.max(1, Math.round(rect.width  || el.scrollWidth  || el.offsetWidth  || Math.round(210 * (96 / 25.4))));
    const renderHeight = Math.max(1, Math.round(rect.height || el.scrollHeight || el.offsetHeight || Math.round(297 * (96 / 25.4))));

    const canvas = await html2canvas(el, {
      ...HTML2CANVAS_BASE_OPTIONS,
      scale,
      width: renderWidth,
      height: renderHeight,
      windowWidth: renderWidth,
      windowHeight: renderHeight,
      scrollX: 0,
      scrollY: 0,
      onclone: (_clonedDoc, clonedEl) => {
        applyCloneQualityFixes(clonedEl);
      },
    });

    canvases.push(canvas);
  }

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

  // 1) PNG denemesi (lossless)
  const pngImages = canvases.map(encodeCanvasToPng);
  const pngPdf = buildPdfFromImages(pngImages, 'PNG', 'NONE');
  const pngBytes = (pngPdf.output('arraybuffer') as ArrayBuffer).byteLength;
  if (pngBytes <= EMAIL_MAX_BYTES) {
    return { pdf: pngPdf, pageImages: pngImages };
  }

  // 2) JPEG zinciri — en yüksek kaliteden başla, cap'e sığan ilkini döndür
  let bestPdf: jsPDF | null = null;
  let bestImages: string[] = [];
  let bestBytes = Number.POSITIVE_INFINITY;

  for (const attempt of EMAIL_JPEG_ATTEMPTS) {
    const pageImages = canvases.map((c) => encodeCanvasToJpeg(c, attempt.quality, attempt.downscale));
    const pdf = buildPdfFromImages(pageImages, 'JPEG', attempt.compression);
    const bytes = (pdf.output('arraybuffer') as ArrayBuffer).byteLength;

    if (bytes < bestBytes) {
      bestBytes = bytes;
      bestPdf = pdf;
      bestImages = pageImages;
    }

    if (bytes <= EMAIL_MAX_BYTES) {
      return { pdf, pageImages };
    }
  }

  // 3) Hâlâ büyükse en küçük çıktıyı döndür (zincir bittiği için en agresif sıkıştırılmış)
  if (bestPdf && bestImages.length > 0) {
    return { pdf: bestPdf, pageImages: bestImages };
  }
  // Teorik fallback — buraya düşmemeli
  return { pdf: pngPdf, pageImages: pngImages };
}

/** Yazdırma için her sayfanın PNG data URL'ini döndürür. */
export async function buildPrintImages(
  pagedRootEl: HTMLElement,
): Promise<string[]> {
  const canvases = await renderPageCanvases(pagedRootEl);
  return canvases.map(encodeCanvasToPng);
}
