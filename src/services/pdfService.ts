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

export async function buildPdf(
  pagedRootEl: HTMLElement,
): Promise<{ pdf: jsPDF; pageImages: string[] }> {
  await document.fonts.ready;

  const pageEls = Array.from(
    pagedRootEl.querySelectorAll<HTMLElement>('[data-pdf-page="true"]'),
  );

  if (pageEls.length === 0) {
    throw new Error('PDF sayfalari bulunamadi.');
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, precision: 16 });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const pageImages: string[] = [];

  for (let i = 0; i < pageEls.length; i += 1) {
    if (i > 0) pdf.addPage();

    const el = pageEls[i];
    const elWidth = el.scrollWidth || el.offsetWidth || Math.round(210 * (96 / 25.4));

    const canvas = await html2canvas(el, {
      ...HTML2CANVAS_OPTIONS,
      windowWidth: elWidth,
      onclone: (_clonedDoc, clonedEl) => {
        // Print CSS'i zorla uygula
        if (clonedEl.style) {
          clonedEl.style.WebkitPrintColorAdjust = 'exact';
          clonedEl.style.printColorAdjust = 'exact';
          clonedEl.style.colorAdjust = 'exact';
        }
        // Offscreen (-9999px) container'ı viewport'a çek — font hinting düzgün çalışsın
        const offscreen = clonedEl.closest<HTMLElement>('[style*="-9999px"]');
        if (offscreen) {
          offscreen.style.left = '0px';
          offscreen.style.top = '0px';
          offscreen.style.position = 'fixed';
          offscreen.style.zIndex = '-9999';
        }
        clonedEl.style.overflow = 'visible';
        // Tüm images için high-quality rendering
        const images = clonedEl.querySelectorAll('img');
        images.forEach((img) => {
          (img as HTMLElement).style.imageRendering = 'crisp-edges';
          (img as HTMLElement).style.WebkitPrintColorAdjust = 'exact';
        });
      },
    });

    const imgData = canvas.toDataURL('image/png');
    pageImages.push(imgData);
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'NONE');
  }

  return { pdf, pageImages };
}
