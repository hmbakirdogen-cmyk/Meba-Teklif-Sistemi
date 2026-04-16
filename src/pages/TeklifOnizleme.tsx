import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { Alert, App, Button, Modal, Space, Spin, Typography } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  FolderOpenOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import TeklifSablonu, { KompaktAntet } from '../templates/TeklifSablonu';
import { teklifService } from '../services/teklifService';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import type { Teklif } from '../types';
import { buttonClassNames } from '../styles/buttonStyles';
import { formatCariAdi } from '../utils/formatters';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../context/useTheme';

// scale:5 → ~480 DPI eşdeğeri (210mm A4 @ 96dpi × 5 ≈ 3969px)
// letterRendering: her karakteri ayrı konumlar → metin render kalitesi maksimum
// windowWidth: html2canvas'ın viewport genişliğini A4 mm genişliğiyle eşler
//   → media-query hesapları ve viewport-birim çözümlemeleri doğru yapılır
const HTML2CANVAS_OPTIONS = {
  scale: 5,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  allowTaint: false,
  imageTimeout: 15000,
  letterRendering: true,
  windowWidth: Math.round(210 * (96 / 25.4)),   // A4 @ 96 dpi ≈ 794 px
};

// Her sayfanın alt + üst kenar boşluğu (mm) — dengeli nefes alanı
// Sayfa 1: içerik üstten başlar, altta SAYFA_KENAR_MM boşluk
// Sayfa 2+: kompakt antet + thead + SAYFA_KENAR_MM üst boşluk → içerik → SAYFA_KENAR_MM alt boşluk
const SAYFA_KENAR_MM = 8;

/** Tüm <tr>'lerin sablonEl'e göre {top, bottom} değerlerini CSS px cinsinden döndürür. */
function satirSinirlariniAl(sablonEl: HTMLElement) {
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

/**
 * Değişken sayfa yüksekliğiyle çalışan akıllı kesim algoritması.
 * Sayfa 1: page1H  — tam sayfa eksi alt boşluk
 * Sayfa 2+: page2H — kompakt antet yüksekliği eksi alt boşluk
 * Satır bütünlüğü korunur (bir satır iki sayfaya bölünmez).
 * contentEndCssPx: içerik sonu (alt blok dahil edilmez; varsa scrollHeight yerine kullanılır).
 */
function sayfaKesimleriniHesapla(
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

    const bolunecek = sinirlar.find(
      (s) => s.ust >= start && s.ust < naifBitis && s.alt > naifBitis,
    );
    const sonraki = bolunecek ? bolunecek.ust : naifBitis;

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

/** Kaynak canvas'tan dikey dilim canvas'ı oluşturur. */
function dilimCanvas(
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

/**
 * Kompakt antet + üst boşluk + (isteğe bağlı) thead + sayfa-1 boşluğuyla eşit spacer + içerik dilimini tek canvas'ta birleştirir.
 * Sayfa 2+ yapısı: [antet] [headerToTheadMarginPx boşluk] [thead] [postTheadMarginPx boşluk] [içerik dilimi]
 * headerToTheadMarginPx → antet alt çizgisi ile thead arasındaki nefes alanı (sayfa 1 ile aynı görsel başlangıç)
 * postTheadMarginPx    → thead alt çizgisi ile ilk satır arasındaki boşluk (sayfa 1'deki 5px spacer eşdeğeri)
 */
function sayfaCanvasBirlestir(
  headerCanvas: HTMLCanvasElement,
  theadCanvas: HTMLCanvasElement | null,
  mainCanvas: HTMLCanvasElement,
  contentStartY: number,
  contentHeight: number,
  headerToTheadMarginPx: number = 0,
  postTheadMarginPx: number = 0,
): HTMLCanvasElement {
  const theadH = theadCanvas ? theadCanvas.height : 0;
  const c = document.createElement('canvas');
  c.width = mainCanvas.width;
  c.height = headerCanvas.height + headerToTheadMarginPx + theadH + postTheadMarginPx + contentHeight;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(headerCanvas, 0, 0);
    if (theadCanvas) {
      ctx.drawImage(theadCanvas, 0, headerCanvas.height + headerToTheadMarginPx);
    }
    ctx.drawImage(
      mainCanvas,
      0, contentStartY, mainCanvas.width, contentHeight,
      0, headerCanvas.height + headerToTheadMarginPx + theadH + postTheadMarginPx, mainCanvas.width, contentHeight,
    );
  }
  return c;
}

async function buildPdf(
  sablonEl: HTMLElement,
  kompaktHeaderEl: HTMLElement,
): Promise<jsPDF> {
  // Font render kalitesi: tüm fontların tamamen yüklenmesini bekle.
  // Inter yüklenmeden render edilirse sistem fontu fallback'e düşer.
  await document.fonts.ready;

  const SCALE = HTML2CANVAS_OPTIONS.scale;

  // ── Alt blok ve thead DOM pozisyonlarını html2canvas'tan ÖNCE ölç ──────
  // Bu ölçümler footer sabitleme ve thead tekrarı için kullanılır.
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

  let theadTopCssPx    = 0;
  let theadHeightCssPx = 0;
  const theadEl = sablonEl.querySelector<HTMLElement>('#pdf-thead');
  if (theadEl) { theadTopCssPx = olcDomUst(theadEl); theadHeightCssPx = theadEl.offsetHeight; }

  // İki canvas eş zamanlı render
  const [mainCanvas, headerCanvas] = await Promise.all([
    html2canvas(sablonEl, HTML2CANVAS_OPTIONS),
    html2canvas(kompaktHeaderEl, HTML2CANVAS_OPTIONS),
  ]);

  // compress: false — JPEG zaten sıkıştırılmış; FlateDecode üst üste eklemene gerek yok
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
  const pdfW = pdf.internal.pageSize.getWidth();   // 210 mm
  const pdfH = pdf.internal.pageSize.getHeight();  // 297 mm
  const pxToMm = pdfW / mainCanvas.width;

  const toplamHMm  = mainCanvas.height * pxToMm;
  // Alt bloğun canvas koordinatları
  const bbStartPx  = Math.min(Math.round(bbTopCssPx    * SCALE), mainCanvas.height);
  const bbEndPx    = Math.min(Math.round((bbTopCssPx + bbHeightCssPx) * SCALE), mainCanvas.height);
  const bbHeightPx = Math.max(0, bbEndPx - bbStartPx);

  // ── Tek sayfa ──────────────────────────────────────────────────────
  // Flex layout (flex:1 içerik + pdf-bottom-block) zaten footer'ı
  // minHeight:297mm kutusunun altına iter — ek işlem gerekmez.
  if (toplamHMm <= pdfH + 1) {
    pdf.addImage(mainCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfW, Math.min(toplamHMm, pdfH), undefined, 'FAST');
    return pdf;
  }

  // ── Çok sayfalı ────────────────────────────────────────────────────
  const headerHMm = headerCanvas.height * pxToMm;

  // Thead canvas: ana canvas'tan kesilir — sayfa 2+'de tablo başlığı tekrarlanır
  let theadCanvas: HTMLCanvasElement | null = null;
  if (theadHeightCssPx > 0) {
    const thStartPx = Math.min(Math.round(theadTopCssPx * SCALE), mainCanvas.height);
    const thEndPx   = Math.min(Math.round((theadTopCssPx + theadHeightCssPx) * SCALE), mainCanvas.height);
    if (thEndPx > thStartPx) {
      theadCanvas = dilimCanvas(mainCanvas, thStartPx, thEndPx - thStartPx);
    }
  }
  const theadHMm = theadCanvas ? theadCanvas.height * pxToMm : 0;

  // Canvas piksel cinsinden boşluklar (sayfa 2+ için)
  // pxToMm = mm/canvas-px → canvas-px/mm = 1/pxToMm
  // Ekran önizlemesiyle birebir eşleşme:
  //   • antet → thead arası: 0px (kompakt antet hemen altında thead başlar)
  //   • thead → ilk data satırı arası: 5px CSS (sayfa 1'deki aria-hidden spacer <tr> ile aynı)
  const HEADER_TO_THEAD_CSS_PX = 0;           // antet alt çizgisi ile thead arası — ekranla aynı
  const POST_THEAD_CSS_PX      = 7;           // sayfa 1'deki aria-hidden spacer <tr> (5px) + alt borderSpacing (2px)
  const headerToTheadCanvasPx  = Math.round(HEADER_TO_THEAD_CSS_PX * SCALE);
  const postTheadCanvasPx      = Math.round(POST_THEAD_CSS_PX       * SCALE);
  const headerToTheadMm        = HEADER_TO_THEAD_CSS_PX * SCALE * pxToMm;
  const postTheadMm            = POST_THEAD_CSS_PX       * SCALE * pxToMm;

  // Sayfa 1: üstten başlar, altta SAYFA_KENAR_MM nefes alanı
  // Sayfa 2+: antet + 0px + thead + 5px + içerik + SAYFA_KENAR_MM alt
  const page1HCssPx = (pdfH - SAYFA_KENAR_MM)                                                               / (SCALE * pxToMm);
  const page2HCssPx = (pdfH - headerHMm - headerToTheadMm - theadHMm - postTheadMm - SAYFA_KENAR_MM)        / (SCALE * pxToMm);

  // Kesimler yalnızca içerik alanı için hesaplanır; alt blok kapsam dışı.
  const contentEndCssPx = bbTopCssPx > 0 ? bbTopCssPx : undefined;
  const kesimlerCssPx   = sayfaKesimleriniHesapla(sablonEl, page1HCssPx, Math.max(page2HCssPx, page1HCssPx * 0.4), contentEndCssPx);
  const baslangiclар    = [0, ...kesimlerCssPx];

  // Tam sayfa yüksekliği canvas piksel cinsinden
  const fullPagePx = Math.round(pdfH / pxToMm);

  for (let i = 0; i < baslangiclар.length; i++) {
    if (i > 0) pdf.addPage();

    const isLastPage  = i === baslangiclар.length - 1;
    const startCssPx  = baslangiclар[i];
    const startPx     = Math.round(startCssPx * SCALE);
    const isPage2Plus = i > 0;
    // Sayfa 2+: içerik 2 CSS piksel (= 2*SCALE canvas px) önce başlasın.
    // Bu sayede kesim noktasındaki satırın üst borderSpacing aralığı da dahil edilir;
    // satırın 0.75px borderTop'u clip Y=0'a gelmez → sub-pixel anti-alias kaybolması önlenir.
    const adjustedStartPx = isPage2Plus ? Math.max(0, startPx - 2 * SCALE) : startPx;

    if (isLastPage && bbHeightPx > 0) {
      // ── Son sayfa: alt blok sayfanın mutlak altına sabitlenir ──────
      const headerHPx       = isPage2Plus ? headerCanvas.height : 0;
      const hdrToTheadPx    = isPage2Plus ? headerToTheadCanvasPx : 0;
      const theadHPx        = (isPage2Plus && theadCanvas) ? theadCanvas.height : 0;
      const postTheadMargPx = isPage2Plus ? postTheadCanvasPx : 0;

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

      const contentStartY = headerHPx + hdrToTheadPx + theadHPx + postTheadMargPx;
      const contentEndPx  = Math.min(bbStartPx, mainCanvas.height);
      const contentLen    = Math.max(0, contentEndPx - adjustedStartPx);
      if (contentLen > 0) {
        ctx.drawImage(mainCanvas, 0, adjustedStartPx, mainCanvas.width, contentLen, 0, contentStartY, mainCanvas.width, contentLen);
      }

      ctx.drawImage(mainCanvas, 0, bbStartPx, mainCanvas.width, bbHeightPx, 0, fullPagePx - bbHeightPx, mainCanvas.width, bbHeightPx);

      pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH, undefined, 'FAST');

    } else {
      // ── Ara sayfalar ────────────────────────────────────────────────
      const endCssPx = baslangiclар[i + 1];
      const endPx    = Math.min(Math.round(endCssPx * SCALE), mainCanvas.height);
      const slicePx  = Math.max(1, endPx - startPx);

      let sayfaCanvas: HTMLCanvasElement;
      if (!isPage2Plus) {
        sayfaCanvas = dilimCanvas(mainCanvas, startPx, slicePx);
      } else {
        sayfaCanvas = sayfaCanvasBirlestir(headerCanvas, theadCanvas, mainCanvas, adjustedStartPx, slicePx, headerToTheadCanvasPx, postTheadCanvasPx);
      }
      pdf.addImage(sayfaCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfW, sayfaCanvas.height * pxToMm, undefined, 'FAST');
    }
  }

  return pdf;
}

export default function TeklifOnizleme() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const sablonRef = useRef<HTMLDivElement>(null);
  const kompaktHeaderRef = useRef<HTMLDivElement>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);
  const uretiliyorRef = useRef(false);
  const sonOtomatikUretimRef = useRef<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile(768);
  const C = useColors();
  const { isDark } = useTheme();
  const [teklif, setTeklif] = useState<Teklif | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfHazir, setPdfHazir] = useState(false);
  const [uretiliyor, setUretiliyor] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  const [pageBreaks, setPageBreaks] = useState<number[]>([]);
  const [kompaktHeaderHeight, setKompaktHeaderHeight] = useState(0);
  const [theadTopCssPx, setTheadTopCssPx]   = useState(0);
  const [theadHCssPx,   setTheadHCssPx]     = useState(0);
  const [previewBbTopPx,    setPreviewBbTopPx]    = useState(0);
  const [previewBbHeightPx, setPreviewBbHeightPx] = useState(0);
  const [saveResult, setSaveResult] = useState<{
    filePath: string;
    folderPath: string;
  } | null>(null);

  const isElectron = Boolean(window.electronAPI?.isElectron);

  useEffect(() => {
    // ID değiştiğinde eski PDF blob'unu hemen temizle.
    // Böylece yeni teklif yüklenirken "İndir" butonu devre dışı kalır
    // ve eski teklife ait PDF kaydedilemez.
    setPdfBlob(null);
    setPdfHazir(false);
    sonOtomatikUretimRef.current = null; // A→B→A rotasında A için tekrar üretim yapılır
    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
    }

    if (!id) {
      setHata('Teklif ID bulunamadi.');
      return;
    }

    const bulunan = teklifService.teklifGetir(id);
    if (!bulunan) {
      setHata('Teklif bulunamadi.');
      return;
    }

    setTeklif(bulunan);
  }, [id]);

  const pdfOlustur = useCallback(async () => {
    if (!sablonRef.current || !kompaktHeaderRef.current || !teklif || uretiliyorRef.current) return;

    uretiliyorRef.current = true;
    setUretiliyor(true);
    setPdfHazir(false);
    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
    }

    try {
      const pdf = await buildPdf(sablonRef.current, kompaktHeaderRef.current!);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      pdfBlobUrlRef.current = url;
      setPdfBlob(blob);
      setPdfHazir(true);
    } catch (err) {
      console.error('[PDF] buildPdf hatası:', err);
      message.error('PDF oluşturulurken bir hata oluştu.');
    } finally {
      uretiliyorRef.current = false;
      setUretiliyor(false);
    }
  }, [teklif]);

  useEffect(() => {
    if (!teklif || !sablonRef.current || sonOtomatikUretimRef.current === teklif.id) return undefined;

    const timeoutId = window.setTimeout(() => {
      sonOtomatikUretimRef.current = teklif.id;
      void pdfOlustur();
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [teklif, pdfOlustur]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
        pdfBlobUrlRef.current = null;
      }
    };
  }, []);

  // Önizleme ölçeği: container genişliği / 210mm (A4)
  // transform: scale → layout etkilenmez, height ve width manuel hesaplanır.
  // teklif bağımlılığı: refs teklif yüklenince DOM'a eklenir; effect'i yeniden çalıştır.
  useEffect(() => {
    const container = previewContainerRef.current;
    const content   = previewContentRef.current;
    if (!container || !content) return;
    const A4_PX = 210 * (96 / 25.4); // ~793.7 px

    const obs = new ResizeObserver(() => {
      const w = container.getBoundingClientRect().width;
      const s = Math.min(1, w / A4_PX);
      setPreviewScale(s);

      // PDF ile aynı sayfa kesim mantığı: kompakt header + thead + üst/alt kenar
      const A4_H     = 297 * (96 / 25.4);
      const kenarPx  = SAYFA_KENAR_MM * (96 / 25.4);
      const kompaktH = kompaktHeaderRef.current?.offsetHeight ?? 0;
      const theadEl2 = content.querySelector<HTMLElement>('#pdf-thead');
      const theadH   = theadEl2?.offsetHeight ?? 0;
      // theadTop: kompaktHeaderRef değil, previewContentRef içindeki thead konumu
      let theadTop = 0;
      if (theadEl2) {
        let el: HTMLElement | null = theadEl2;
        while (el && el !== content) { theadTop += el.offsetTop; el = el.offsetParent as HTMLElement | null; }
      }
      const postTheadPx = 7; // spacer tr (5px) + alt borderSpacing (2px) = toplam sayfa 1 boşluğuyla eşit
      const page1H   = A4_H - kenarPx;
      const page2H   = A4_H - kompaktH - theadH - postTheadPx - kenarPx;
      setPageBreaks(sayfaKesimleriniHesapla(content, page1H, Math.max(page2H, page1H * 0.4)));
      setKompaktHeaderHeight(kompaktH);
      setTheadTopCssPx(theadTop);
      setTheadHCssPx(theadH);

      // Alt blok (sipariş veren + footer şeridi) DOM pozisyonu — son sayfa kartında
      // sayfanın mutlak altına sabitlenir (PDF pipeline ile aynı davranış)
      const bbEl = content.querySelector<HTMLElement>('#pdf-bottom-block');
      if (bbEl) {
        let bbTop = 0;
        let elBb: HTMLElement | null = bbEl;
        while (elBb && elBb !== content) { bbTop += elBb.offsetTop; elBb = elBb.offsetParent as HTMLElement | null; }
        setPreviewBbTopPx(bbTop);
        setPreviewBbHeightPx(bbEl.offsetHeight);
      }
    });
    obs.observe(container);
    obs.observe(content);
    return () => obs.disconnect();
  }, [teklif]);

  async function pdfIndir() {
    if (!pdfBlob || !teklif) return;

    // İlk iki kelime Türkçe büyük harf + teklif no
    const kelimeler = teklif.cari.firmaAdi.trim().split(/\s+/);
    const onEk = kelimeler.slice(0, 2).join(' ').toLocaleUpperCase('tr-TR').replace(/[\\/:*?"<>|]/g, '');
    const dosyaAdi = `${onEk} ${teklif.teklifNo}.pdf`;

    // ── Electron modu: IPC üzerinden MEBA TEKLİFLER klasörüne otomatik kaydet ──
    if (isElectron && window.electronAPI) {
      try {
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const result = await window.electronAPI.savePdf(
          arrayBuffer,
          teklif.cari.firmaAdi,
          teklif.teklifNo,
        );
        if (result.ok && result.filePath && result.folderPath) {
          setSaveResult({ filePath: result.filePath, folderPath: result.folderPath });
        } else {
          message.error(result.error ?? 'PDF kaydedilemedi.');
        }
      } catch (err) {
        console.error('[pdfIndir Electron]', err);
        message.error('PDF kaydedilirken hata oluştu.');
      }
      return;
    }

    // ── Tarayıcı modu: showSaveFilePicker veya <a download> fallback ──────────
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as Window & { showSaveFilePicker: (opts: object) => Promise<FileSystemFileHandle> })
          .showSaveFilePicker({
            suggestedName: dosyaAdi,
            startIn: 'desktop',
            types: [{ description: 'PDF Dosyası', accept: { 'application/pdf': ['.pdf'] } }],
          });
        const writable = await handle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();
        message.success('PDF masaüstüne kaydedildi.');
        return;
      } catch (err) {
        // Kullanıcı iptal ettiyse sessizce geç; diğer hatalarda fallback
        if ((err as { name?: string }).name === 'AbortError') return;
      }
    }

    // Fallback: klasik <a download> yöntemi
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = dosyaAdi;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('PDF başarıyla indirildi.');
  }

  function yazdir() {
    if (uretiliyor) {
      message.warning('PDF henüz hazırlanıyor, lütfen bekleyin.');
      return;
    }

    const blobUrl = pdfBlobUrlRef.current;
    if (!blobUrl) {
      message.warning('PDF henüz hazırlanıyor, lütfen bekleyin.');
      return;
    }

    // PDF blob'unu gizli iframe içinde yazdır (Electron dahil tüm ortamlar).
    // window.print() yerine PDF print → html2canvas renkleri, kalitesi korunur.
    // Browser "Arka planları yazdır" / Electron arka plan renk ayarından bağımsız.
    // Not: PDF iframe'lerde onload her zaman tetiklenmez → 1.5s timeout fallback.
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);

    let baskiTetiklendi = false;
    const doCleanup = () => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    };
    const tryPrint = () => {
      if (baskiTetiklendi) return;
      baskiTetiklendi = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        doCleanup();
        window.print(); // son çare: HTML print
      }
      setTimeout(doCleanup, 5 * 60 * 1000);
    };

    iframe.onload  = tryPrint;
    iframe.onerror = () => { doCleanup(); window.print(); };
    setTimeout(tryPrint, 1500); // onload gelmezse 1.5sn sonra tetikle

    iframe.src = blobUrl;
  }

  if (hata) {
    return (
      <div style={{ padding: 40, maxWidth: 480, margin: '0 auto' }}>
        <Alert type="error" message={hata} style={{ marginBottom: 16 }} />
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teklifler')} className={buttonClassNames.secondary}>
          Listeye Dön
        </Button>
      </div>
    );
  }

  if (!teklif) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const totals = hesaplamaMotoru.teklifToplamlariniHesapla({
    araToplam: teklif.araToplam,
    kdvOrani: teklif.kdvOrani,
    iskontoOrani: teklif.iskontoOrani ?? 0,
  });

  return (
    <>
      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 200,
          background: isDark ? 'rgba(17,21,31,0.94)' : 'rgba(248,250,252,0.94)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${C.border}`,
          padding: isMobile ? '10px 12px' : '12px 28px',
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 10 : 14,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.28)' : '0 8px 24px rgba(15,23,42,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            size="small"
            className={buttonClassNames.secondarySmall}
            onClick={() => navigate(`/teklif/${id}`)}
          >
            Düzenle
          </Button>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              borderLeft: `1px solid ${C.border}`,
              paddingLeft: 12,
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: 11, color: C.textSecondary, letterSpacing: 0.5, fontVariantNumeric: 'tabular-nums' }}>
              {teklif.teklifNo}
            </span>
            <span style={{ color: C.textPrimary, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatCariAdi(teklif.cari.firmaAdi)}
            </span>
          </div>
        </div>

        <Space size={6} wrap style={{ justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
          <Button
            size="small"
            icon={<SaveOutlined />}
            className={buttonClassNames.secondarySmall}
            onClick={() => {
              teklifService.teklifKaydet(teklif);
              message.success('Teklif kaydedildi.');
            }}
          >
            Kaydet
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            className={buttonClassNames.ghostSmall}
            loading={uretiliyor}
            onClick={() => {
              void pdfOlustur();
            }}
          >
            Yenile
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={yazdir}
            loading={uretiliyor}
            className={buttonClassNames.ghostSmall}
          >
            Yazdır
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<FilePdfOutlined />}
            className={buttonClassNames.primarySmall}
            loading={uretiliyor && !pdfBlob}
            disabled={!pdfBlob}
            onClick={() => void pdfIndir()}
            style={{ background: '#0f1f45', borderColor: '#0f1f45' }}
          >
            {isElectron ? 'PDF Kaydet' : 'PDF İndir'}
          </Button>
        </Space>
      </div>

      {/* ── Gizli render alanı: sablonRef (tam) + kompaktHeaderRef ── */}
      {/* colorScheme: 'light' — html2canvas dark-mode renk sızmasını önler */}
      <div
        aria-hidden
        className="no-print"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '210mm',
          opacity: 1,
          pointerEvents: 'none',
          overflow: 'hidden',
          colorScheme: 'light',
          background: '#ffffff',
        }}
      >
        <div ref={sablonRef}>
          <TeklifSablonu teklif={teklif} totals={totals} />
        </div>
        {/* Kompakt antet: html2canvas ile ayrıca capture edilir */}
        <div ref={kompaktHeaderRef}>
          <KompaktAntet teklif={teklif} />
        </div>
      </div>

      <div
        className="print-bg"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #10141d 0%, #151c28 100%)'
            : 'linear-gradient(180deg, #d9e0e8 0%, #eef2f6 100%)',
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          justifyContent: 'center',
          padding: isMobile ? '18px 12px 32px' : '28px 16px 40px',
        }}
      >
        {/* previewContainerRef: ResizeObserver ölçüm noktası */}
        <div ref={previewContainerRef} className="print-inner" style={{ width: '100%', maxWidth: '210mm' }}>

          {/* Üst etiket */}
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              color: isDark ? 'rgba(221,228,240,0.78)' : 'rgba(30,41,59,0.72)',
              fontSize: 12,
              letterSpacing: 0.2,
            }}
          >
            <span>A4 Önizleme</span>
            <span style={{ color: isDark ? 'rgba(136,153,181,0.86)' : 'rgba(71,85,105,0.88)' }}>
              {uretiliyor ? 'PDF hazırlanıyor…' : pdfHazir ? 'PDF hazır' : 'Hazırlanıyor…'}
            </span>
          </div>

          {/* ── Önizleme alanı ── */}
          {(() => {
            const A4_W_PX  = 210 * (96 / 25.4);   // ~793.7 px
            const A4_H_PX  = 297 * (96 / 25.4);   // ~1122.5 px
            const PAGE_GAP = 14;                    // sayfalar arası boşluk (px)
            const pageStarts = [0, ...pageBreaks];
            const shadow   = isDark
              ? '0 6px 32px rgba(0,0,0,0.45)'
              : '0 4px 24px rgba(15,23,42,0.16)';

            return (
              <div style={{ position: 'relative' }}>

                {/* Ölçüm + window.print() kaynağı
                    • visibility:hidden → layout'ta yer kaplar (ResizeObserver çalışır)
                    • position:absolute → sayfa kartlarının altına geçmez
                    • @media print → visibility:visible, position:relative (print CSS'te override) */}
                <div
                  ref={previewContentRef}
                  className="print-target"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '210mm',
                    minHeight: '297mm',
                    background: '#ffffff',
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    zIndex: -1,
                    colorScheme: 'light',
                  }}
                >
                  <TeklifSablonu teklif={teklif} totals={totals} />
                </div>

                {/* A4 sayfa kartları — sadece ekranda görünür, baskıda gizlenir
                    Sayfa 2+'de kompakt antet gösterilir; içerik PDF kesim noktasından başlar */}
                <div
                  className="no-print"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: `${PAGE_GAP}px`,
                    alignItems: 'flex-start',
                  }}
                >
                  {pageStarts.map((startY, i) => {
                    const isPage2Plus = i > 0;
                    const isLastPage  = i === pageStarts.length - 1;
                    // hh: içeriğin kart içindeki Y başlangıcı
                    //   Sayfa 1   → 0 (üstten başlar)
                    //   Sayfa 2+  → kompakt antet + thead yüksekliği + 5px spacer eşdeğeri
                    const POST_THEAD = 7; // spacer tr (5px) + alt borderSpacing (2px) — sayfa 1 ile aynı toplam boşluk
                    const hh = isPage2Plus
                      ? kompaktHeaderHeight + theadHCssPx + POST_THEAD
                      : 0;
                    const nextStartY  = isLastPage ? null : pageStarts[i + 1];
                    // clipH: içerik alanının kesin yüksekliği
                    //   Overflow:hidden ile clip edilir → hiçbir satır iki sayfada görünmez
                    //   Alt kalan boşluk (A4_H_PX - hh - clipH) = alt kenar nefes alanı
                    // -2px buffer: borderSpacing (2px) + borderTop (0.75px) sınır pikselinde
                    //   görünmesini önler — sonraki sayfanın ilk satır çizgisi page 1'de kalmaz
                    // Son sayfa: alt blok (sipariş veren + footer) ayrıca sayfanın mutlak
                    //   altına sabitlenir — bu yüzden clip, bbTopPx'te biter
                    const hasPinnedBb   = isLastPage && previewBbTopPx > startY && previewBbHeightPx > 0;
                    const clipH = nextStartY !== null
                      ? (nextStartY - startY) - 2
                      : hasPinnedBb
                        ? (previewBbTopPx - startY)   // alt blok hariç → ayrıca sabitleniyor
                        : A4_H_PX - hh;

                    return (
                      <div
                        key={i}
                        style={{
                          width:      `${A4_W_PX * previewScale}px`,
                          height:     `${A4_H_PX * previewScale}px`,
                          overflow:   'hidden',
                          flexShrink: 0,
                          background: '#ffffff',
                          boxShadow:  shadow,
                          position:   'relative',
                        }}
                      >
                        {/* Ölçeksiz iç kap: scale sonra uygulanır */}
                        <div style={{
                          width:           `${A4_W_PX}px`,
                          height:          `${A4_H_PX}px`,
                          transformOrigin: 'top left',
                          transform:       `scale(${previewScale})`,
                          position:        'relative',
                          overflow:        'hidden',
                          background:      '#ffffff',
                          colorScheme:     'light',
                        }}>

                          {/* Sayfa 2+: kompakt antet */}
                          {isPage2Plus && (
                            <div style={{
                              position:   'absolute',
                              top: 0, left: 0,
                              width:      '100%',
                              zIndex:     2,
                              background: '#ffffff',
                            }}>
                              <KompaktAntet teklif={teklif} />
                            </div>
                          )}

                          {/* Sayfa 2+: sütun başlıkları (thead) — kompakt antet hemen altında */}
                          {/* Sayfa 1'deki thead→ilk satır aralığıyla birebir eşleşmesi için */}
                          {/* overflow:hidden + translateY(-theadTopCssPx) → sadece thead band'ı keser */}
                          {isPage2Plus && theadHCssPx > 0 && (
                            <div style={{
                              position: 'absolute',
                              top:      `${kompaktHeaderHeight}px`,
                              left:     0,
                              width:    '100%',
                              height:   `${theadHCssPx}px`,
                              overflow: 'hidden',
                              zIndex:   1,
                              background: '#ffffff',
                            }}>
                              <div style={{
                                transform:   `translateY(${-theadTopCssPx}px)`,
                                colorScheme: 'light',
                              }}>
                                <TeklifSablonu teklif={teklif} totals={totals} />
                              </div>
                            </div>
                          )}

                          {/* İçerik clip kutusu:
                              top = hh (kompakt antet + thead + 5px spacer sonrası)
                              height = clipH (satır sınırına hizalı içerik alanı)
                              overflow:hidden → satırlar kesilmez, çift gösterilmez
                              Altında kalan A4 alanı = alt kenar boşluğu (beyaz) */}
                          <div style={{
                            position: 'absolute',
                            top:      `${hh}px`,
                            left:     0,
                            width:    '100%',
                            height:   `${clipH}px`,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              // Sayfa 2+: startY yerine (startY-2) — borderSpacing üst çizgisi görünür
                              // 25. satırın 0.75px borderTop'u clip Y=0'a değil Y=2'ye düşer (sub-pixel kaybolması önlenir)
                              transform:   `translateY(${isPage2Plus ? -(startY - 2) : -startY}px)`,
                              colorScheme: 'light',
                            }}>
                              <TeklifSablonu teklif={teklif} totals={totals} />
                            </div>
                          </div>

                          {/* Alt blok sabitleyici (son sayfa):
                              Sipariş veren + lacivert footer şeridi sayfanın mutlak
                              altına yapıştırılır — PDF pipeline ile birebir aynı davranış.
                              TeklifSablonu translateY ile alt blok Y'sine kaydırılır,
                              sadece o dilim overflow:hidden ile kesilir. */}
                          {hasPinnedBb && (
                            <div style={{
                              position:   'absolute',
                              bottom:     0,
                              left:       0,
                              width:      '100%',
                              height:     `${previewBbHeightPx}px`,
                              overflow:   'hidden',
                              background: '#ffffff',
                              zIndex:     3,
                            }}>
                              <div style={{
                                transform:   `translateY(${-previewBbTopPx}px)`,
                                colorScheme: 'light',
                              }}>
                                <TeklifSablonu teklif={teklif} totals={totals} />
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })()}

          {(uretiliyor || !pdfHazir) && (
            <div className="no-print" style={{ textAlign: 'center', padding: '18px 0 0' }}>
              <Spin size="small" />
              <div style={{ marginTop: 10, color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(30,41,59,0.55)', fontSize: 12.5 }}>
                Yüksek kaliteli PDF hazırlanıyor…
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* ═══════════════════════════════════════════════════════════════
           BASKI OPTİMİZASYONU
           window.print() tarayıcının yerel PDF motorunu kullanır:
           vektör metin, printer DPI'da render, html2canvas'tan üstün.
           ═══════════════════════════════════════════════════════════════ */
        @media print {
          /* ── Sayfa boyutu — A4 kenar boşluksuz ──────────────────── */
          @page {
            size: 210mm 297mm;
            margin: 0mm;
          }

          /* ── Renk baskısı: tüm arka plan/gradient'ler zorla ─────── */
          /* color-scheme: light → tarayıcı dark-mode varsayılanlarını  */
          /* (scrollbar, form arkaplanı) light'a çekiyor; gradient ve   */
          /* arka planlar inline style ile korunuyor (exact).           */
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-scheme: light !important;
          }

          /* ── HTML / Body ─────────────────────────────────────────── */
          /* text-size-adjust: 100% → tarayıcı baskı için fontu        */
          /* otomatik büyütmesin; ekranda ne görünüyorsa aynı kalsın.  */
          html {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            background: #ffffff !important;
            color-scheme: light !important;
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            background: #ffffff !important;
            color-scheme: light !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: geometricPrecision !important;
          }

          /* ── Dark-mode data-theme sıfırlama ──────────────────────── */
          /* Baskıda data-theme="dark" CSS değişkenlerini etkisizleştir */
          [data-theme="dark"] {
            color-scheme: light !important;
          }

          /* ── AppLayout: header ve layout chrome'u gizle ─────────── */
          .ant-layout-header {
            display: none !important;
          }
          .ant-layout {
            background: #ffffff !important;
            min-height: 0 !important;
          }
          .ant-layout-content {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
          }

          /* ── Toolbar, spinner, önizleme etiketi gizle ────────────── */
          .no-print {
            display: none !important;
          }

          /* ── Animasyon / blur / compositing: baskıda gereksiz ──── */
          * {
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            transition: none !important;
            animation: none !important;
            will-change: auto !important;
          }

          /* ── Font render kalitesi ────────────────────────────────── */
          /* geometricPrecision: karakter kenarlarını keskin tutar.    */
          /* font-optical-sizing:none → tarayıcı küçük puntoda otomatik */
          /* font kalınlığı artırımını engeller; ekranla birebir aynı. */
          *, *::before, *::after {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: geometricPrecision !important;
            font-feature-settings: "kern" 1, "liga" 1 !important;
            font-optical-sizing: none !important;
          }

          /* ── Görseller: tam çözünürlük, baskı kalitesi ───────────── */
          img {
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: crisp-edges !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            max-width: none !important;
          }

          /* ── Gri arka plan → beyaz ───────────────────────────────── */
          .print-bg {
            display: block !important;
            background: #ffffff !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* ── İç wrapper ──────────────────────────────────────────── */
          .print-inner {
            display: block !important;
            width: 210mm !important;
            max-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* ── A4 şablon: gölge/overflow kaldır, sayfa doldur ─────── */
          /* visibility:visible + position:relative: ekranda hidden/absolute  */
          /* olan ölçüm div'ini baskıda görünür ve normal akışa alır.         */
          .print-target {
            visibility: visible !important;
            position: relative !important;
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            overflow: visible !important;
            page-break-inside: auto;
            break-inside: auto;
            transform: none !important;
            z-index: auto !important;
          }

          /* ── Tablo: border-collapse DOKUNMA — kapsül tasarımı koruma ─
             TeklifSablonu: border-collapse:separate + border-spacing:0 2px
             kullanır. collapse!important bunu bozar, kapsül satır tasarımı
             kaybolur ve renkler düzgün render edilmez. Her tablo kendi
             border-collapse stilini inline olarak tanımlar.              */
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* ── Tablo hücreleri: renkler + arkaplanlar korunur ─────── */
          table, thead, tbody, tr, td, th {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ── Kenarlıklar: inline border renkleri korunur ────────── */
          /* UYARI: border-color: inherit !important kullanma — bu kural  */
          /* td inline style'larındaki renkleri (0.75px solid #d4d8dd)    */
          /* override eder ve tüm kenarlıkları koyu text rengine çevirir. */
          /* print-color-adjust: exact (üstte * kuralında set edildi)    */
          /* border renklerini zaten korur, ek kural gerekmez.            */

          /* ── Şablon ana container: boyut ve font sabitleme ───────── */
          /* Ekranla piksel-mükemmel uyum: tarayıcının baskı modunda    */
          /* otomatik font-boyutu veya satır yüksekliği düzeltmesi engellenir. */
          #teklif-sablon {
            width: 210mm !important;
            min-height: 297mm !important;
            font-size: 11.7px !important;
            line-height: 1.52 !important;
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
          }
        }
      `}</style>

      {/* ── Electron PDF kayıt başarı modalı ── */}
      <Modal
        open={!!saveResult}
        onCancel={() => setSaveResult(null)}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d' }}>
            <CheckCircleOutlined style={{ fontSize: 18 }} />
            PDF Kaydedildi
          </span>
        }
        footer={
          <Space wrap>
            <Button onClick={() => setSaveResult(null)}>Kapat</Button>
            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => {
                if (saveResult) void window.electronAPI?.openFolder(saveResult.folderPath);
              }}
            >
              Klasörü Aç
            </Button>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              style={{ background: '#0f1f45', borderColor: '#0f1f45' }}
              onClick={() => {
                if (saveResult) void window.electronAPI?.openFile(saveResult.filePath);
              }}
            >
              PDF&apos;yi Aç
            </Button>
          </Space>
        }
      >
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Dosya şuraya kaydedildi:
        </Typography.Text>
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            fontFamily: 'monospace',
            fontSize: 12,
            wordBreak: 'break-all',
            color: '#0f1f45',
          }}
        >
          {saveResult?.filePath}
        </div>
      </Modal>
    </>
  );
}
