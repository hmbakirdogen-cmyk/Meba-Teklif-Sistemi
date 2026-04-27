import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const HTML2CANVAS_OPTIONS = {
  scale: 3.5,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  allowTaint: false,
  imageTimeout: 30000,
  letterRendering: true,
  rendererType: 'canvas' as const,
};

const PRINT_HTML2CANVAS_OPTIONS = {
  ...HTML2CANVAS_OPTIONS,
  scale: 5,
};

const EMAIL_HTML2CANVAS_OPTIONS = {
  ...HTML2CANVAS_OPTIONS,
  scale: 2.2,
};

type PageImageFormat = 'PNG' | 'JPEG';

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

  // Offscreen (-9999px) container'ı viewport'a çek — font hinting düzgün çalışsın
  const offscreen = clonedEl.closest<HTMLElement>('[style*="-9999px"]');
  if (offscreen) {
    offscreen.style.left = '0px';
    offscreen.style.top = '0px';
    offscreen.style.position = 'fixed';
    offscreen.style.zIndex = '-9999';
  }

  clonedEl.style.overflow = 'visible';

  // Görseller için doğal render
  const images = clonedEl.querySelectorAll('img');
  images.forEach((img) => {
    (img as HTMLElement).style.imageRendering = 'auto';
    (img as HTMLElement).style.setProperty('-webkit-print-color-adjust', 'exact');
  });
}

async function renderPageImages(
  pagedRootEl: HTMLElement,
  renderOptions: typeof HTML2CANVAS_OPTIONS,
  format: PageImageFormat,
  quality?: number,
): Promise<string[]> {
  await document.fonts.ready;

  const pageEls = Array.from(
    pagedRootEl.querySelectorAll<HTMLElement>('[data-pdf-page="true"]'),
  );

  if (pageEls.length === 0) {
    throw new Error('PDF sayfalari bulunamadi.');
  }

  const pageImages: string[] = [];

  for (let i = 0; i < pageEls.length; i += 1) {
    const el = pageEls[i];
    const elWidth = el.scrollWidth || el.offsetWidth || Math.round(210 * (96 / 25.4));

    const canvas = await html2canvas(el, {
      ...renderOptions,
      windowWidth: elWidth,
      onclone: (_clonedDoc, clonedEl) => {
        applyCloneQualityFixes(clonedEl);
      },
    });

    if (format === 'JPEG') {
      pageImages.push(canvas.toDataURL('image/jpeg', quality ?? 0.8));
    } else {
      pageImages.push(canvas.toDataURL('image/png'));
    }
  }

  return pageImages;
}

export async function buildPdf(
  pagedRootEl: HTMLElement,
): Promise<{ pdf: jsPDF; pageImages: string[] }> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, precision: 16 });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const pageImages = await renderPageImages(pagedRootEl, HTML2CANVAS_OPTIONS, 'PNG');

  for (let i = 0; i < pageImages.length; i += 1) {
    if (i > 0) pdf.addPage();

    const imgData = pageImages[i];
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'NONE');
  }

  return { pdf, pageImages };
}

export async function buildEmailPdf(
  pagedRootEl: HTMLElement,
): Promise<{ pdf: jsPDF; pageImages: string[] }> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, precision: 12 });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const pageImages = await renderPageImages(pagedRootEl, EMAIL_HTML2CANVAS_OPTIONS, 'JPEG', 0.72);

  for (let i = 0; i < pageImages.length; i += 1) {
    if (i > 0) pdf.addPage();

    const imgData = pageImages[i];
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
  }

  return { pdf, pageImages };
}

export async function buildPrintImages(
  pagedRootEl: HTMLElement,
): Promise<string[]> {
  return renderPageImages(pagedRootEl, PRINT_HTML2CANVAS_OPTIONS, 'PNG');
}
