import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MAX_PDF_BYTES = 1024 * 1024;

export const HTML2CANVAS_OPTIONS = {
  scale: 4.5,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  allowTaint: false,
  imageTimeout: 30000,
  foreignObjectRendering: false,
  letterRendering: false,
  rendererType: 'canvas' as const,
};

const PDF_HTML2CANVAS_OPTIONS = {
  ...HTML2CANVAS_OPTIONS,
  // Standart PDF indirme akisinda metin keskinligini artir.
  scale: 7,
};

const PRINT_HTML2CANVAS_OPTIONS = {
  ...HTML2CANVAS_OPTIONS,
  scale: 6,
};

const EMAIL_HTML2CANVAS_OPTIONS = {
  ...HTML2CANVAS_OPTIONS,
  scale: 4.2,
};

type JpegAttempt = {
  quality: number;
  downscale: number;
  compression: 'NONE' | 'FAST' | 'MEDIUM';
};

const STANDARD_JPEG_ATTEMPTS: JpegAttempt[] = [
  { quality: 0.94, downscale: 1, compression: 'MEDIUM' },
  { quality: 0.9, downscale: 0.96, compression: 'MEDIUM' },
  { quality: 0.86, downscale: 0.92, compression: 'FAST' },
  { quality: 0.82, downscale: 0.88, compression: 'FAST' },
  { quality: 0.78, downscale: 0.84, compression: 'FAST' },
  { quality: 0.74, downscale: 0.8, compression: 'FAST' },
];

const EMAIL_JPEG_ATTEMPTS: JpegAttempt[] = [
  { quality: 0.9, downscale: 0.94, compression: 'MEDIUM' },
  { quality: 0.86, downscale: 0.9, compression: 'FAST' },
  { quality: 0.82, downscale: 0.86, compression: 'FAST' },
  { quality: 0.78, downscale: 0.82, compression: 'FAST' },
  { quality: 0.74, downscale: 0.78, compression: 'FAST' },
];

function applyCloneQualityFixes(clonedEl: HTMLElement): void {
  // Print CSS'i zorla uygula
  if (clonedEl.style) {
    clonedEl.style.setProperty('-webkit-print-color-adjust', 'exact');
    clonedEl.style.printColorAdjust = 'exact';
    clonedEl.style.setProperty('color-adjust', 'exact');
  }

  // Tüm elements için font-family preserve et
  const allElements = clonedEl.querySelectorAll('*');
  allElements.forEach((el) => {
    const computed = window.getComputedStyle(el);
    const ff = computed.fontFamily;
    if (ff && ff !== 'serif') {
      (el as HTMLElement).style.fontFamily = ff;
    }
    (el as HTMLElement).style.textRendering = 'geometricPrecision';
  });

  clonedEl.style.overflow = 'visible';

  // Görseller için doğal render
  const images = clonedEl.querySelectorAll('img');
  images.forEach((img) => {
    (img as HTMLElement).style.imageRendering = 'auto';
    (img as HTMLElement).style.setProperty('-webkit-print-color-adjust', 'exact');
  });
}

async function renderPageCanvases(
  pagedRootEl: HTMLElement,
  renderOptions: typeof HTML2CANVAS_OPTIONS,
): Promise<HTMLCanvasElement[]> {
  await document.fonts.ready;

  const pageEls = Array.from(
    pagedRootEl.querySelectorAll<HTMLElement>('[data-pdf-page="true"]'),
  );

  if (pageEls.length === 0) {
    throw new Error('PDF sayfalari bulunamadi.');
  }

  const canvases: HTMLCanvasElement[] = [];

  for (let i = 0; i < pageEls.length; i += 1) {
    const el = pageEls[i];
    const rect = el.getBoundingClientRect();
    const renderWidth = Math.max(1, Math.round(rect.width || el.scrollWidth || el.offsetWidth || Math.round(210 * (96 / 25.4))));
    const renderHeight = Math.max(1, Math.round(rect.height || el.scrollHeight || el.offsetHeight || Math.round(297 * (96 / 25.4))));

    const canvas = await html2canvas(el, {
      ...renderOptions,
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

function encodeCanvasToJpeg(
  sourceCanvas: HTMLCanvasElement,
  quality: number,
  downscale: number,
): string {
  if (downscale >= 0.999) {
    return sourceCanvas.toDataURL('image/jpeg', quality);
  }

  const targetWidth = Math.max(1, Math.round(sourceCanvas.width * downscale));
  const targetHeight = Math.max(1, Math.round(sourceCanvas.height * downscale));
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = targetWidth;
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

function buildPdfFromImages(
  pageImages: string[],
  compression: 'NONE' | 'FAST' | 'MEDIUM',
  pdfCompress: boolean,
  precision: number,
): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: pdfCompress, precision });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pageImages.length; i += 1) {
    if (i > 0) pdf.addPage();
    const imgData = pageImages[i];
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, compression);
  }

  return pdf;
}

function buildCappedJpegPdf(
  canvases: HTMLCanvasElement[],
  attempts: JpegAttempt[],
  pdfCompress: boolean,
  precision: number,
): { pdf: jsPDF; pageImages: string[] } {
  let bestPdf: jsPDF | null = null;
  let bestImages: string[] = [];
  let bestBytes = Number.POSITIVE_INFINITY;

  for (const attempt of attempts) {
    const pageImages = canvases.map((canvas) => encodeCanvasToJpeg(canvas, attempt.quality, attempt.downscale));
    const pdf = buildPdfFromImages(pageImages, attempt.compression, pdfCompress, precision);
    const bytes = (pdf.output('arraybuffer') as ArrayBuffer).byteLength;

    if (bytes < bestBytes) {
      bestBytes = bytes;
      bestPdf = pdf;
      bestImages = pageImages;
    }

    if (bytes <= MAX_PDF_BYTES) {
      return { pdf, pageImages };
    }
  }

  return {
    pdf: bestPdf ?? buildPdfFromImages(canvases.map((canvas) => encodeCanvasToJpeg(canvas, 0.78, 0.82)), 'FAST', pdfCompress, precision),
    pageImages: bestImages.length > 0 ? bestImages : canvases.map((canvas) => encodeCanvasToJpeg(canvas, 0.78, 0.82)),
  };
}

export async function buildPdf(
  pagedRootEl: HTMLElement,
): Promise<{ pdf: jsPDF; pageImages: string[] }> {
  const canvases = await renderPageCanvases(pagedRootEl, PDF_HTML2CANVAS_OPTIONS);
  return buildCappedJpegPdf(canvases, STANDARD_JPEG_ATTEMPTS, true, 14);
}

export async function buildEmailPdf(
  pagedRootEl: HTMLElement,
): Promise<{ pdf: jsPDF; pageImages: string[] }> {
  const canvases = await renderPageCanvases(pagedRootEl, EMAIL_HTML2CANVAS_OPTIONS);
  return buildCappedJpegPdf(canvases, EMAIL_JPEG_ATTEMPTS, true, 12);
}

export async function buildPrintImages(
  pagedRootEl: HTMLElement,
): Promise<string[]> {
  const canvases = await renderPageCanvases(pagedRootEl, PRINT_HTML2CANVAS_OPTIONS);
  return canvases.map((canvas) => canvas.toDataURL('image/png'));
}
