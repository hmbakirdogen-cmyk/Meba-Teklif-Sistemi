import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { Alert, Button, Space, Spin, message } from 'antd';
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
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
const HTML2CANVAS_OPTIONS = {
  scale: 5,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  allowTaint: false,
  imageTimeout: 15000,
  letterRendering: true,
};

// Sayfa altında bırakılan nefes alanı (mm) — ilk ve sonraki sayfalar için
const SAYFA_ALT_BOSLUK_MM = 10;

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
 * Kompakt antet + (isteğe bağlı) thead + içerik dilimini tek canvas'ta birleştirir.
 * Sayfa 2+ için: üstte antet, ardından thead satırı, altında içerik.
 */
function sayfaCanvasBirlestir(
  headerCanvas: HTMLCanvasElement,
  theadCanvas: HTMLCanvasElement | null,
  mainCanvas: HTMLCanvasElement,
  contentStartY: number,
  contentHeight: number,
): HTMLCanvasElement {
  const theadH = theadCanvas ? theadCanvas.height : 0;
  const c = document.createElement('canvas');
  c.width = mainCanvas.width;
  c.height = headerCanvas.height + theadH + contentHeight;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(headerCanvas, 0, 0);
    if (theadCanvas) {
      ctx.drawImage(theadCanvas, 0, headerCanvas.height);
    }
    ctx.drawImage(
      mainCanvas,
      0, contentStartY, mainCanvas.width, contentHeight,
      0, headerCanvas.height + theadH, mainCanvas.width, contentHeight,
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
    pdf.addImage(mainCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfW, Math.min(toplamHMm, pdfH), undefined, 'NONE');
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

  const page1HCssPx = (pdfH - SAYFA_ALT_BOSLUK_MM)                        / (SCALE * pxToMm);
  const page2HCssPx = (pdfH - headerHMm - theadHMm - SAYFA_ALT_BOSLUK_MM) / (SCALE * pxToMm);

  // Kesimler yalnızca içerik alanı için hesaplanır; alt blok kapsam dışı.
  const contentEndCssPx = bbTopCssPx > 0 ? bbTopCssPx : undefined;
  const kesimlerCssPx   = sayfaKesimleriniHesapla(sablonEl, page1HCssPx, page2HCssPx, contentEndCssPx);
  const baslangiclар    = [0, ...kesimlerCssPx];

  // Tam sayfa yüksekliği canvas piksel cinsinden
  const fullPagePx = Math.round(pdfH / pxToMm);

  for (let i = 0; i < baslangiclар.length; i++) {
    if (i > 0) pdf.addPage();

    const isLastPage  = i === baslangiclар.length - 1;
    const startCssPx  = baslangiclар[i];
    const startPx     = Math.round(startCssPx * SCALE);
    const isPage2Plus = i > 0;

    if (isLastPage && bbHeightPx > 0) {
      // ── Son sayfa: alt blok sayfanın mutlak altına sabitlenir ──────
      const headerHPx = isPage2Plus ? headerCanvas.height : 0;
      const theadHPx  = (isPage2Plus && theadCanvas) ? theadCanvas.height : 0;

      const pageCanvas  = document.createElement('canvas');
      pageCanvas.width  = mainCanvas.width;
      pageCanvas.height = fullPagePx;
      const ctx = pageCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      // Kompakt antet + thead (sayfa 2+)
      if (isPage2Plus) {
        ctx.drawImage(headerCanvas, 0, 0);
        if (theadCanvas) ctx.drawImage(theadCanvas, 0, headerHPx);
      }

      // İçerik: sayfa başından alt bloğun hemen üstüne kadar
      const contentStartY = headerHPx + theadHPx;
      const contentEndPx  = Math.min(bbStartPx, mainCanvas.height);
      const contentLen    = Math.max(0, contentEndPx - startPx);
      if (contentLen > 0) {
        ctx.drawImage(mainCanvas, 0, startPx, mainCanvas.width, contentLen, 0, contentStartY, mainCanvas.width, contentLen);
      }

      // Alt blok: sayfanın en altına yapıştır
      ctx.drawImage(mainCanvas, 0, bbStartPx, mainCanvas.width, bbHeightPx, 0, fullPagePx - bbHeightPx, mainCanvas.width, bbHeightPx);

      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfW, pdfH, undefined, 'NONE');

    } else {
      // ── Ara sayfalar ────────────────────────────────────────────────
      const endCssPx = baslangiclар[i + 1];
      const endPx    = Math.min(Math.round(endCssPx * SCALE), mainCanvas.height);
      const slicePx  = Math.max(1, endPx - startPx);

      let sayfaCanvas: HTMLCanvasElement;
      if (!isPage2Plus) {
        // Sayfa 1: sadece içerik
        sayfaCanvas = dilimCanvas(mainCanvas, startPx, slicePx);
      } else {
        // Sayfa 2+: kompakt antet + thead + içerik
        sayfaCanvas = sayfaCanvasBirlestir(headerCanvas, theadCanvas, mainCanvas, startPx, slicePx);
      }
      pdf.addImage(sayfaCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfW, sayfaCanvas.height * pxToMm, undefined, 'NONE');
    }
  }

  return pdf;
}

export default function TeklifOnizleme() {
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
  const [contentHeight, setContentHeight] = useState(0);

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
      message.error('PDF olusturulurken bir hata olustu.');
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
  useEffect(() => {
    const container = previewContainerRef.current;
    const content   = previewContentRef.current;
    if (!container || !content) return;
    const A4_PX = 210 * (96 / 25.4); // ~793.7 px

    const obs = new ResizeObserver(() => {
      const w = container.getBoundingClientRect().width;
      const h = content.scrollHeight;
      const s = Math.min(1, w / A4_PX);
      setPreviewScale(s);
      setContentHeight(h);
    });
    obs.observe(container);
    obs.observe(content);
    return () => obs.disconnect();
  }, []);

  async function pdfIndir() {
    if (!pdfBlob || !teklif) return;

    // İlk iki kelime Türkçe büyük harf + teklif no
    const kelimeler = teklif.cari.firmaAdi.trim().split(/\s+/);
    const onEk = kelimeler.slice(0, 2).join(' ').toLocaleUpperCase('tr-TR').replace(/[\\/:*?"<>|]/g, '');
    const dosyaAdi = `${onEk} ${teklif.teklifNo}.pdf`;

    // File System Access API: masaüstünden başlayan Kaydet iletişim kutusu
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
    message.success('PDF basariyla indirildi.');
  }

  function yazdir() {
    // PDF blob varsa: PDF üzerinden baskı → ekran önizlemesi ile birebir aynı çıktı.
    // Blob yoksa: klasik window.print() fallback.
    if (!pdfBlob) {
      window.print();
      return;
    }
    const url = URL.createObjectURL(pdfBlob);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);
    iframe.src = url;
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Baskı diyaloğu kapandıktan sonra temizle
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 3000);
    };
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
          background: isDark ? 'rgba(24,27,37,0.96)' : 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${C.border}`,
          padding: isMobile ? '0 10px' : '0 28px',
          minHeight: 54,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            size="small"
            className={buttonClassNames.secondarySmall}
            onClick={() => navigate(`/teklif/${id}`)}
          >
            Düzenle
          </Button>
          <span
            style={{
              fontSize: 12,
              color: C.textSecondary,
              letterSpacing: 0.3,
              borderLeft: `1px solid ${C.border}`,
              paddingLeft: 12,
              minWidth: 0,
            }}
          >
            {teklif.teklifNo}
            <span style={{ marginLeft: 8, color: C.textFaint }}>·</span>
            <span style={{ marginLeft: 8, color: C.textPrimary, fontWeight: 500 }}>
              {formatCariAdi(teklif.cari.firmaAdi)}
            </span>
          </span>
        </div>

        <Space size={6} wrap>
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
          <Button size="small" icon={<PrinterOutlined />} onClick={yazdir} className={buttonClassNames.ghostSmall}>
            Yazdır
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<FilePdfOutlined />}
            className={buttonClassNames.primarySmall}
            loading={uretiliyor && !pdfBlob}
            disabled={!pdfBlob}
            onClick={pdfIndir}
            style={{ background: '#0f1f45', borderColor: '#0f1f45' }}
          >
            PDF İndir
          </Button>
        </Space>
      </div>

      {/* ── Gizli render alanı: sablonRef (tam) + kompaktHeaderRef ── */}
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
          background: '#525659',
          minHeight: 'calc(100vh - 54px)',
          display: 'flex',
          justifyContent: 'center',
          padding: '28px 16px 40px',
        }}
      >
        {/* previewContainerRef: ResizeObserver ölçüm noktası */}
        <div ref={previewContainerRef} className="print-inner" style={{ width: '100%', maxWidth: '210mm' }}>
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              color: 'rgba(255,255,255,0.78)',
              fontSize: 12,
              letterSpacing: 0.2,
            }}
          >
            <span>A4 Önizleme</span>
            <span style={{ color: 'rgba(255,255,255,0.62)' }}>
              {uretiliyor || !pdfHazir ? 'PDF hazırlanıyor...' : 'PDF hazır'}
            </span>
          </div>

          {/* Ölçek wrapper: transform:scale ile kesin kontrol.
              - Dış div: görsel yüksekliği tutar (contentHeight * scale)
              - İç div: her zaman 210mm, transformOrigin top-left ile ölçeklenir
              - overflow:hidden sağ taşmayı keser */}
          <div style={{
            overflow: 'hidden',
            height: contentHeight > 0 ? contentHeight * previewScale : undefined,
          }}>
            <div
              ref={previewContentRef}
              className="print-target"
              style={{
                width: '210mm',
                minHeight: '297mm',
                background: '#ffffff',
                boxShadow: '0 20px 48px rgba(15, 23, 42, 0.24)',
                transformOrigin: 'top left',
                transform: previewScale < 1 ? `scale(${previewScale})` : 'none',
              }}
            >
              <TeklifSablonu teklif={teklif} totals={totals} />
            </div>
          </div>

          {(uretiliyor || !pdfHazir) && (
            <div className="no-print" style={{ textAlign: 'center', padding: '18px 0 0' }}>
              <Spin size="small" />
              <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.72)', fontSize: 12.5 }}>
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
          /* ── Sayfa boyutu ─────────────────────────────────────────── */
          @page {
            size: A4 portrait;
            margin: 0;
          }

          /* ── Renk baskısı: tüm arka plan/gradient'ler zorla ─────── */
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-scheme: light only !important;
          }

          /* ── HTML / Body ─────────────────────────────────────────── */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            background: #ffffff !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: geometricPrecision !important;
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

          /* ── Transform / scale / blur: print'te anlamsız, kaldır ── */
          * {
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            transition: none !important;
            animation: none !important;
            will-change: auto !important;
          }
          /* NOT: logo img üzerindeki translateZ(0) GPU hint'ini
             kaldırmak görsel pozisyonu bozmaz; top/left intact kalır */
          img {
            transform: none !important;
          }

          /* ── Font render kalitesi ────────────────────────────────── */
          * {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: geometricPrecision !important;
            font-feature-settings: "kern" 1, "liga" 1 !important;
          }

          /* ── Görseller: tam çözünürlük, baskı kalitesi ───────────── */
          img {
            image-rendering: -webkit-optimize-contrast !important;
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
          .print-target {
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            /* overflow:hidden inline stilini override et:
               multi-page içerik kırpılmasın */
            overflow: visible !important;
            page-break-inside: auto;
            break-inside: auto;
          }

          /* ── Tablo: başlık tekrarla, satır kırılmasın ────────────── */
          table {
            border-collapse: collapse !important;
          }
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

          /* ── Kenarlıklar: baskıda görünür ────────────────────────── */
          td, th {
            border-color: inherit !important;
          }
        }
      `}</style>
    </>
  );
}
