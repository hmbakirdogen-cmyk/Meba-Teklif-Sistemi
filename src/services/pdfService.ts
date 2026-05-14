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
  /* Düzenleme yardımcıları (action paneli, iskonto rozeti, ToolbarIcons vb.)
     PDF clone'unda HER KOŞULDA gizli kalır. html2canvas data-html2canvas-ignore
     attribute'unu da honor eder; bu stylesheet ikinci güvenlik katmanı. */
  .no-export,
  [data-html2canvas-ignore="true"] {
    display: none !important;
    visibility: hidden !important;
  }
  /* Aktif hücre highlight'ı (mavi inset shadow + soluk arka plan) PDF'te
     görünmemeli — clone'da td.is-active-cell stilini sıfırla. */
  td.is-active-cell {
    box-shadow: none !important;
    background-color: transparent !important;
    border-radius: 0 !important;
  }
  /* Optical separator pseudo katmanı html2canvas'ta bazı tarayıcılarda
     sıfır-ölçü gradient canvas'ına düşebiliyor. PDF clone'unda güvenli
     fallback'e dön: pseudo'yu kapat, gerçek border ile çiz. */
  .offer-table thead th.optical-separator-col,
  .offer-table tbody td.optical-separator-col {
    box-shadow: none !important;
    border-left: 1px solid rgba(26, 43, 66, 0.10) !important;
  }
  .offer-table thead th.optical-separator-col::before,
  .offer-table tbody td.optical-separator-col::before,
  .belge-inline .offer-table tbody tr[data-satir-id] > td::after {
    content: none !important;
    display: none !important;
    background: none !important;
    box-shadow: none !important;
  }
`;

type JpegAttempt = {
  quality: number;
  downscale: number;
  compression: 'NONE' | 'FAST' | 'MEDIUM';
};

export class PdfPageCountMismatchError extends Error {
  renderedPageCount: number;
  pdfPageCount: number;
  expectedPageCount: number | null;

  constructor(params: { renderedPageCount: number; pdfPageCount: number; expectedPageCount: number | null }) {
    super(
      `PDF sayfa sayısı doğrulanamadı. Render edilen sayfa: ${params.renderedPageCount}, PDF sayfası: ${params.pdfPageCount}.`,
    );
    this.name = 'PdfPageCountMismatchError';
    this.renderedPageCount = params.renderedPageCount;
    this.pdfPageCount = params.pdfPageCount;
    this.expectedPageCount = params.expectedPageCount;
  }
}

type PagedDomSnapshot = {
  pageEls: HTMLElement[];
  renderedPageCount: number;
  expectedPageCount: number | null;
};

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function inspectPagedDom(pagedRootEl: HTMLElement): PagedDomSnapshot {
  const pageEls = Array.from(
    pagedRootEl.querySelectorAll<HTMLElement>('[data-pdf-page="true"]'),
  );
  return {
    pageEls,
    renderedPageCount: pageEls.length,
    expectedPageCount: parsePositiveInt(pagedRootEl.dataset.expectedPageCount),
  };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForPagedDomReady(pagedRootEl: HTMLElement): Promise<PagedDomSnapshot> {
  const startedAt = Date.now();
  // 5s — paged layout effect, async logo fetch, fitLevel ölçümü ve
  // DescText useLayoutEffect zincirlerinin tümünün tamamlanması için
  // konservatif tavan. Stable-DOM tespiti gerçek bekleyişi kısa tutar.
  const timeoutMs = 5000;
  // Sayfalar render edildikten sonra ardışık `stableWindowMs` boyunca
  // sayfa sayısı / ready bayrağı değişmediğinde DOM "kararlı" sayılır.
  // ~150ms iki frame'den daha uzun → React commit chain'in oturmasına yeter.
  const stableWindowMs = 150;
  let stableSince: number | null = null;
  let lastSignature = '';

  while (Date.now() - startedAt < timeoutMs) {
    const snapshot = inspectPagedDom(pagedRootEl);
    const markedReady = pagedRootEl.dataset.pdfRenderReady !== 'false';
    const expectedMatches = snapshot.expectedPageCount == null
      || snapshot.renderedPageCount === snapshot.expectedPageCount;

    const ready = markedReady && snapshot.renderedPageCount > 0 && expectedMatches;
    const signature = `${markedReady}|${snapshot.renderedPageCount}|${snapshot.expectedPageCount}`;
    if (ready) {
      if (signature !== lastSignature) {
        lastSignature = signature;
        stableSince = Date.now();
      } else if (stableSince != null && Date.now() - stableSince >= stableWindowMs) {
        return snapshot;
      }
    } else {
      stableSince = null;
      lastSignature = signature;
    }

    await nextFrame();
  }

  const snapshot = inspectPagedDom(pagedRootEl);
  const pdfPageCount = snapshot.renderedPageCount;
  console.error('[pdfService] Paged DOM hazır değil veya sayfa sayısı uyuşmuyor.', {
    renderedPageCount: snapshot.renderedPageCount,
    expectedPageCount: snapshot.expectedPageCount,
    pdfRenderReady: pagedRootEl.dataset.pdfRenderReady,
  });
  throw new PdfPageCountMismatchError({
    renderedPageCount: snapshot.renderedPageCount,
    pdfPageCount,
    expectedPageCount: snapshot.expectedPageCount,
  });
}

/**
 * Paged DOM'daki tüm <img>'lerin (firma logoları + müşteri logosu + overlay
 * görselleri) yüklenmesini bekler. html2canvas yüklenmeyen img'leri boş
 * çerçeveyle yakalardı; bu yardımcı, render öncesi async resim trafiğinin
 * bittiğini garanti eder. Per-image timeout 5s — slow R2 / cold CDN için
 * yeterli pay. Yüklenemeyen img sessizce atlanır (PDF render bloklanmaz).
 */
async function ensureImagesLoaded(pagedRootEl: HTMLElement): Promise<void> {
  const imgs = Array.from(pagedRootEl.querySelectorAll<HTMLImageElement>('img'));
  if (imgs.length === 0) return;

  await Promise.all(
    imgs.map((img) => {
      // already-loaded shortcut
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          img.removeEventListener('load', done);
          img.removeEventListener('error', done);
          resolve();
        };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        // Per-image safety net — CDN/R2 yavaşlığında bütün PDF akışını bloklamasın.
        setTimeout(done, 5000);
      });
    }),
  );
}

/**
 * Browser bazı font subset'lerini (latin-ext: ı, ğ, ş, ç, ö, ü) yalnızca o
 * karakterler ekranda kullanıldığında lazily indirir. `document.fonts.ready`
 * o anda DOM'da olmayan ama clone'da olabilecek karakterleri kapsamaz.
 * Burada Türkçe karakterleri içeren bir test stringi ile fontu explicit
 * load ederek subset'in PDF render anında hazır olmasını sağlıyoruz.
 */
async function ensureTurkishFontSubsetReady(): Promise<void> {
  try {
    // Inter 11px-13px ana boyutlar, 400/600/700 ağırlıklar A4'te kullanılan
    // varyantları kapsar. Türkçe karakterler subset'i tetikler.
    const probes = [
      '11px "Inter"',
      '12px "Inter"',
      '13px 600 "Inter"',
      '13px 700 "Inter"',
    ];
    const tr = 'ığüşöçİĞÜŞÖÇ — abcABC';
    await Promise.all(probes.map((p) => document.fonts.load(p, tr).catch(() => null)));
    await document.fonts.ready;
  } catch {
    // document.fonts API not available — silently continue.
  }
}

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
  clonedEl.style.setProperty('font-feature-settings', '"kern" 1, "calt" 1, "ss01" 1');
  // Tek font garantisi: render'da fallback'e düşmesin diye Inter cascade'i
  // doğrudan zorla (inherit chain bazı clone child'larda kopabiliyor).
  clonedEl.style.setProperty('font-family', 'var(--font-sans)', 'important');
  clonedEl.style.overflow = 'visible';

  // 3) EditableField hover overlay'inin clone'a sızmasına karşı emniyet
  //    kuşağı. html2canvas screen modunda :hover render etmez, ama pseudo
  //    ::after gradient'i bazı edge case'lerde clone'da pixellenebilir.
  try {
    const editableSafetyCss = clonedDoc.createElement('style');
    editableSafetyCss.setAttribute('data-pdf-editable-safety', 'true');
    editableSafetyCss.textContent =
      '[data-editable]{cursor:default !important;user-select:auto !important;-webkit-user-select:auto !important;}' +
      '[data-editable]::after{display:none !important;opacity:0 !important;}';
    const head = clonedDoc.head || clonedDoc.documentElement;
    if (head) head.appendChild(editableSafetyCss);
  } catch { /* ignore */ }
}

/**
 * pagedRootEl içinde `data-pdf-page="true"` markerli her sayfayı ayrı bir
 * canvas'a render eder. Sayfa kırma mantığı template tarafında önceden
 * hesaplanmıştır; burada sadece her sayfa elementi kendi A4 ölçüsünde
 * raster edilir.
 */
async function renderPageCanvases(
  pagedRootEl: HTMLElement,
): Promise<{ canvases: HTMLCanvasElement[]; renderedPageCount: number; expectedPageCount: number | null }> {
  // 1) Font subset garantisi — Türkçe karakterler dahil tüm glyph'ler için
  //    Inter weight/size matrisi yüklenir. document.fonts.ready tek başına
  //    bazı lazy subset'leri atlayabiliyor.
  await ensureTurkishFontSubsetReady();

  // 2) Layout / pagination kararlı olana kadar bekle.
  const { pageEls, renderedPageCount, expectedPageCount } = await waitForPagedDomReady(pagedRootEl);

  // 3) Tüm <img>'lerin (firma logosu, müşteri logosu, overlay görseller)
  //    decode edilmiş olduğundan emin ol — aksi halde html2canvas boş
  //    çerçeve çizebilir.
  await ensureImagesLoaded(pagedRootEl);

  // 4) Son layout commit + paint için iki frame nefes payı.
  await nextFrame();
  await nextFrame();

  if (pageEls.length === 0) {
    throw new Error('PDF sayfaları bulunamadı.');
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

  return { canvases, renderedPageCount, expectedPageCount };
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

function getJsPdfPageCount(pdf: jsPDF): number {
  if (typeof pdf.getNumberOfPages === 'function') {
    return pdf.getNumberOfPages();
  }
  const internal = pdf.internal as unknown as { getNumberOfPages?: () => number };
  return typeof internal.getNumberOfPages === 'function' ? internal.getNumberOfPages() : 0;
}

function assertPdfPageCount(
  pdf: jsPDF,
  renderedPageCount: number,
  expectedPageCount: number | null,
): void {
  const pdfPageCount = getJsPdfPageCount(pdf);
  if (renderedPageCount !== pdfPageCount) {
    console.error('[pdfService] Render/PDF sayfa sayısı uyuşmuyor.', {
      renderedPageCount,
      pdfPageCount,
      expectedPageCount,
    });
    throw new PdfPageCountMismatchError({ renderedPageCount, pdfPageCount, expectedPageCount });
  }
}

/**
 * Standart "PDF İndir" akışı — lossless PNG, dosya boyutu sınırı yok.
 * Ekrandaki A4 önizlemesi ile PDF arasında gözle fark edilebilir kalite
 * kaybı bulunmaz.
 */
export async function buildPdf(
  pagedRootEl: HTMLElement,
): Promise<{ pdf: jsPDF; pageImages: string[]; renderedPageCount: number; pdfPageCount: number }> {
  const { canvases, renderedPageCount, expectedPageCount } = await renderPageCanvases(pagedRootEl);
  const pageImages = canvases.map(encodeCanvasToPng);
  const pdf = buildPdfFromImages(pageImages, 'PNG', 'FAST');
  assertPdfPageCount(pdf, renderedPageCount, expectedPageCount);
  return { pdf, pageImages, renderedPageCount, pdfPageCount: getJsPdfPageCount(pdf) };
}

/**
 * E-posta PDF — 1 MB cap'e sığmaya çalışır. Önce PNG; aşıyorsa yüksek
 * kaliteden başlayan JPEG zinciri. Zincir hâlâ aşıyorsa en küçük JPEG
 * çıktısını döndürür.
 */
export async function buildEmailPdf(
  pagedRootEl: HTMLElement,
): Promise<{ pdf: jsPDF; pageImages: string[]; renderedPageCount: number; pdfPageCount: number }> {
  const { canvases, renderedPageCount, expectedPageCount } = await renderPageCanvases(pagedRootEl);

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
    if (bytes <= EMAIL_MAX_BYTES) {
      assertPdfPageCount(pdf, renderedPageCount, expectedPageCount);
      return { pdf, pageImages, renderedPageCount, pdfPageCount: getJsPdfPageCount(pdf) };
    }
  }

  assertPdfPageCount(bestPdf!, renderedPageCount, expectedPageCount);
  return { pdf: bestPdf!, pageImages: bestImages, renderedPageCount, pdfPageCount: getJsPdfPageCount(bestPdf!) };
}

/** Yazdırma için her sayfanın PNG data URL'ini döndürür. */
export async function buildPrintImages(
  pagedRootEl: HTMLElement,
): Promise<string[]> {
  const { canvases } = await renderPageCanvases(pagedRootEl);
  return canvases.map(encodeCanvasToPng);
}
