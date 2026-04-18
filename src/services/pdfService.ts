/**
 * pdfService.ts
 * PDF oluşturma motoru — html2canvas + jsPDF pipeline.
 * Yalnızca DOM referansları alır.
 * Sayfa kesim algoritması hem PDF hem ekran önizlemesi tarafından paylaşılır.
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// scale:7 → ~672 DPI eşdeğeri (210mm A4 @ 96dpi × 7 ≈ 5558px)
// letterRendering: her karakteri ayrı konumlar → metin render kalitesi maksimum
// windowWidth: html2canvas'ın viewport genişliğini A4 mm genişliğiyle eşler
//   → media-query hesapları ve viewport-birim çözümlemeleri doğru yapılır
export const HTML2CANVAS_OPTIONS = {
  scale: 7,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  allowTaint: false,
  imageTimeout: 30000,
  letterRendering: true,
  windowWidth: Math.round(210 * (96 / 25.4)),   // A4 @ 96 dpi ≈ 794 px
};

// Footer yoksa kullanılan varsayılan alt kenar boşluğu (mm)
const SAYFA_KENAR_MM = 8;

/** Tüm <tr>'lerin sablonEl'e göre {ust, alt} CSS px değerlerini döndürür. */
export function satirSinirlariniAl(sablonEl: HTMLElement) {
  return Array.from(sablonEl.querySelectorAll<HTMLTableRowElement>('tr')).map((satir) => {
    let ust = 0;
    let el: HTMLElement | null = satir;
    while (el && el !== sablonEl) {
      ust += el.offsetTop;
      el = el.offsetParent as HTMLElement | null;
    }
    return { ust, alt: ust + satir.offsetHeight };
  });
}

export function satirKesiminiBul(
  sinirlar: Array<{ ust: number; alt: number }>,
  start: number,
  naifBitis: number,
): number {
  const bolunecek = sinirlar.find(
    (s) => s.ust >= start && s.ust < naifBitis && s.alt > naifBitis,
  );
  const sonraki = bolunecek ? bolunecek.ust : naifBitis;
  return sonraki <= start ? naifBitis : sonraki;
}

/**
 * Değişken sayfa yüksekliğiyle çalışan akıllı kesim algoritması.
 * Sayfa 1: page1H  — tam sayfa eksi alt boşluk
 * Sayfa 2+: page2H — kompakt antet yüksekliği eksi alt boşluk
 * Satır bütünlüğü korunur (bir satır iki sayfaya bölünmez).
 * contentEndCssPx: içerik sonu (alt blok dahil edilmez; varsa scrollHeight yerine kullanılır).
 */
export function sayfaKesimleriniHesapla(
  sablonEl: HTMLElement,
  page1HCssPx: number,
  page2HCssPx: number,
  contentEndCssPx?: number,
): number[] {
  const sinirlar = satirSinirlariniAl(sablonEl);
  const toplamH = contentEndCssPx ?? sablonEl.scrollHeight;
  const kesimler: number[] = [];
  let start = 0;
  let ilkSayfa = true;

  while (true) {
    const sayfaH = ilkSayfa ? page1HCssPx : page2HCssPx;
    const naifBitis = start + sayfaH;
    if (naifBitis >= toplamH - 1) break;
    const sonraki = satirKesiminiBul(sinirlar, start, naifBitis);

    if (sonraki <= start) {          // sonsuz döngü koruması
      kesimler.push(naifBitis);
      start = naifBitis;
    } else {
      kesimler.push(sonraki);
      start = sonraki;
    }
    ilkSayfa = false;
  }
  return kesimler;
}

export function sonSayfaKesiminiAyarla(
  sablonEl: HTMLElement,
  kesimler: number[],
  contentEndCssPx: number,
  lastPageHCssPx: number,
): number[] {
  if (kesimler.length === 0 || lastPageHCssPx <= 0) return kesimler;

  const sonBaslangic = kesimler[kesimler.length - 1];
  if (contentEndCssPx - sonBaslangic <= lastPageHCssPx + 1) return kesimler;

  const sinirlar = satirSinirlariniAl(sablonEl);
  const hedefBitis = Math.max(sonBaslangic + 1, contentEndCssPx - lastPageHCssPx);
  const ekKesim = satirKesiminiBul(sinirlar, sonBaslangic, hedefBitis);
  if (ekKesim <= sonBaslangic || ekKesim >= contentEndCssPx - 1) return kesimler;

  return [...kesimler, ekKesim];
}

/** Kaynak canvas'tan dikey dilim canvas'ı oluşturur. */
export function dilimCanvas(
  src: HTMLCanvasElement,
  startY: number,
  height: number,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, startY, src.width, height, 0, 0, src.width, height);
  }
  return c;
}

export async function buildPdf(
  sablonEl: HTMLElement,
  kompaktHeaderEl: HTMLElement,
): Promise<{ pdf: jsPDF; pageImages: string[] }> {
  // Font render kalitesi: tüm fontların tamamen yüklenmesini bekle.
  await document.fonts.ready;

  const SCALE = HTML2CANVAS_OPTIONS.scale;

  // ── Alt blok ve thead DOM pozisyonlarını html2canvas'tan ÖNCE ölç ──────
  function olcDomUst(el: HTMLElement): number {
    let ust = 0;
    let cur: HTMLElement | null = el;
    while (cur && cur !== sablonEl) { ust += cur.offsetTop; cur = cur.offsetParent as HTMLElement | null; }
    return ust;
  }

  let bbTopCssPx    = 0;
  let bbHeightCssPx = 0;
  const bbEl = sablonEl.querySelector<HTMLElement>('#pdf-bottom-block');
  if (bbEl) { bbTopCssPx = olcDomUst(bbEl); bbHeightCssPx = bbEl.offsetHeight; }

  let footerTopCssPx    = 0;
  let footerHeightCssPx = 0;
  const footerEl = sablonEl.querySelector<HTMLElement>('#pdf-page-footer');
  if (footerEl) { footerTopCssPx = olcDomUst(footerEl); footerHeightCssPx = footerEl.offsetHeight; }

  let theadTopCssPx    = 0;
  let theadHeightCssPx = 0;
  const theadEl = sablonEl.querySelector<HTMLElement>('#pdf-thead');
  if (theadEl) { theadTopCssPx = olcDomUst(theadEl); theadHeightCssPx = theadEl.offsetHeight; }

  // İki canvas eş zamanlı render
  const [mainCanvas, headerCanvas] = await Promise.all([
    html2canvas(sablonEl, HTML2CANVAS_OPTIONS),
    html2canvas(kompaktHeaderEl, HTML2CANVAS_OPTIONS),
  ]);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
  const pdfW = pdf.internal.pageSize.getWidth();   // 210 mm
  const pdfH = pdf.internal.pageSize.getHeight();  // 297 mm
  const pxToMm = pdfW / mainCanvas.width;

  const toplamHMm  = mainCanvas.height * pxToMm;
  const bbStartPx  = Math.min(Math.round(bbTopCssPx    * SCALE), mainCanvas.height);
  const bbEndPx    = Math.min(Math.round((bbTopCssPx + bbHeightCssPx) * SCALE), mainCanvas.height);
  const bbHeightPx = Math.max(0, bbEndPx - bbStartPx);
  const footerStartPx  = Math.min(Math.round(footerTopCssPx * SCALE), mainCanvas.height);
  const footerEndPx    = Math.min(Math.round((footerTopCssPx + footerHeightCssPx) * SCALE), mainCanvas.height);
  const footerHeightPx = Math.max(0, footerEndPx - footerStartPx);
  const signatureHeightCssPx = footerTopCssPx > bbTopCssPx ? Math.max(0, footerTopCssPx - bbTopCssPx) : bbHeightCssPx;
  const signatureHeightPx = footerStartPx > bbStartPx ? Math.max(0, footerStartPx - bbStartPx) : bbHeightPx;
  const pageImages: string[] = [];

  // ── Tek sayfa ──────────────────────────────────────────────────────
  if (toplamHMm <= pdfH + 1) {
    const imgData = mainCanvas.toDataURL('image/png');
    pageImages.push(imgData);
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, Math.min(toplamHMm, pdfH), undefined, 'NONE');
    return { pdf, pageImages };
  }

  // ── Çok sayfalı ────────────────────────────────────────────────────
  const headerHMm = headerCanvas.height * pxToMm;

  let theadCanvas: HTMLCanvasElement | null = null;
  if (theadHeightCssPx > 0) {
    const thStartPx = Math.min(Math.round(theadTopCssPx * SCALE), mainCanvas.height);
    const thEndPx   = Math.min(Math.round((theadTopCssPx + theadHeightCssPx) * SCALE), mainCanvas.height);
    if (thEndPx > thStartPx) {
      theadCanvas = dilimCanvas(mainCanvas, thStartPx, thEndPx - thStartPx);
    }
  }
  const theadHMm = theadCanvas ? theadCanvas.height * pxToMm : 0;
  const footerCanvas = footerHeightPx > 0
    ? dilimCanvas(mainCanvas, footerStartPx, footerHeightPx)
    : null;
  const footerHMm = footerCanvas ? footerCanvas.height * pxToMm : SAYFA_KENAR_MM;

  const HEADER_TO_THEAD_CSS_PX = 0;
  const POST_THEAD_CSS_PX      = 7;
  const headerToTheadCanvasPx  = Math.round(HEADER_TO_THEAD_CSS_PX * SCALE);
  const postTheadCanvasPx      = Math.round(POST_THEAD_CSS_PX       * SCALE);
  const headerToTheadMm        = HEADER_TO_THEAD_CSS_PX * SCALE * pxToMm;
  const postTheadMm            = POST_THEAD_CSS_PX       * SCALE * pxToMm;

  const page1HCssPx    = (pdfH - footerHMm) / (SCALE * pxToMm);
  const page2HCssPx    = (pdfH - headerHMm - headerToTheadMm - theadHMm - postTheadMm - footerHMm) / (SCALE * pxToMm);
  const lastPageHCssPx = Math.max(page1HCssPx * 0.25, page2HCssPx - signatureHeightCssPx);

  const contentEndCssPx = bbTopCssPx > 0 ? bbTopCssPx : (footerTopCssPx > 0 ? footerTopCssPx : undefined);
  const baseKesimlerCssPx = sayfaKesimleriniHesapla(
    sablonEl,
    page1HCssPx,
    Math.max(page2HCssPx, page1HCssPx * 0.4),
    contentEndCssPx,
  );
  const kesimlerCssPx = contentEndCssPx
    ? sonSayfaKesiminiAyarla(sablonEl, baseKesimlerCssPx, contentEndCssPx, lastPageHCssPx)
    : baseKesimlerCssPx;
  const baslangiclар = [0, ...kesimlerCssPx];

  const fullPagePx = Math.round(pdfH / pxToMm);

  for (let i = 0; i < baslangiclар.length; i++) {
    if (i > 0) pdf.addPage();

    const isLastPage  = i === baslangiclар.length - 1;
    const startCssPx  = baslangiclар[i];
    const startPx     = Math.round(startCssPx * SCALE);
    const isPage2Plus = i > 0;
    // Sayfa 2+: içerik 2 CSS piksel önce başlasın — sub-pixel anti-alias kaybolması önlenir
    const adjustedStartPx = isPage2Plus ? Math.max(0, startPx - 2 * SCALE) : startPx;
    const headerHPx       = isPage2Plus ? headerCanvas.height : 0;
    const hdrToTheadPx    = isPage2Plus ? headerToTheadCanvasPx : 0;
    const theadHPx        = (isPage2Plus && theadCanvas) ? theadCanvas.height : 0;
    const postTheadMargPx = isPage2Plus ? postTheadCanvasPx : 0;
    const contentStartY   = headerHPx + hdrToTheadPx + theadHPx + postTheadMargPx;

    const pageCanvas  = document.createElement('canvas');
    pageCanvas.width  = mainCanvas.width;
    pageCanvas.height = fullPagePx;
    const ctx = pageCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    if (isPage2Plus) {
      ctx.drawImage(headerCanvas, 0, 0);
      if (theadCanvas) ctx.drawImage(theadCanvas, 0, headerHPx + hdrToTheadPx);
    }

    if (isLastPage) {
      // ── Son sayfa: alt blok sayfanın mutlak altına sabitlenir ──────
      const contentEndPx = Math.min(
        bbHeightPx > 0 ? bbStartPx : (footerHeightPx > 0 ? footerStartPx : mainCanvas.height),
        mainCanvas.height,
      );
      const contentLen = Math.max(0, contentEndPx - adjustedStartPx);
      if (contentLen > 0) {
        ctx.drawImage(mainCanvas, 0, adjustedStartPx, mainCanvas.width, contentLen, 0, contentStartY, mainCanvas.width, contentLen);
      }
      if (signatureHeightPx > 0) {
        const signatureY = Math.max(contentStartY, fullPagePx - footerHeightPx - signatureHeightPx);
        ctx.drawImage(mainCanvas, 0, bbStartPx, mainCanvas.width, signatureHeightPx, 0, signatureY, mainCanvas.width, signatureHeightPx);
      }
    } else {
      // ── Ara sayfalar ────────────────────────────────────────────────
      const endCssPx = baslangiclар[i + 1];
      const endPx    = Math.min(Math.round(endCssPx * SCALE), mainCanvas.height);
      const slicePx  = Math.max(1, endPx - startPx);
      ctx.drawImage(mainCanvas, 0, adjustedStartPx, mainCanvas.width, slicePx, 0, contentStartY, mainCanvas.width, slicePx);
    }

    if (footerCanvas) {
      ctx.drawImage(footerCanvas, 0, fullPagePx - footerHeightPx);
    }

    const imgDataPage = pageCanvas.toDataURL('image/png');
    pageImages.push(imgDataPage);
    pdf.addImage(imgDataPage, 'PNG', 0, 0, pdfW, pdfH, undefined, 'NONE');
  }

  return { pdf, pageImages };
}
