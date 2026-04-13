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
import TeklifSablonu from '../templates/TeklifSablonu';
import { teklifService } from '../services/teklifService';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import type { Teklif } from '../types';
import { buttonClassNames } from '../styles/buttonStyles';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../context/useTheme';

// scale:5 → ~480 DPI eşdeğeri (210mm A4 @ 96dpi × 5 ≈ 3969px)
// 300 DPI lazer yazıcı: 2480px gerekli → yeterli kalite marjı
const HTML2CANVAS_OPTIONS = {
  scale: 5,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  allowTaint: false,
  imageTimeout: 15000,
};

async function buildPdf(sablonEl: HTMLElement): Promise<jsPDF> {
  const mainCanvas = await html2canvas(sablonEl, HTML2CANVAS_OPTIONS);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false,
    precision: 20,
  });

  const pdfPageW = pdf.internal.pageSize.getWidth();
  const pdfPageH = pdf.internal.pageSize.getHeight();
  const mainPxToMm = pdfPageW / mainCanvas.width;
  const mainTotalH = mainCanvas.height * mainPxToMm;

  // 1mm tolerans: pixel→mm dönüşümündeki floating-point kaymasını maskeler.
  // minHeight:297mm olan template canvas'ı ~297.02mm çıkabilir → 2. sayfa tetiklenip
  // srcH≈0px olan degenerate canvas oluşur ve exception fırlatır.
  const TEK_SAYFA_TOLERANS_MM = 1;

  if (mainTotalH <= pdfPageH + TEK_SAYFA_TOLERANS_MM) {
    pdf.addImage(mainCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfPageW, Math.min(mainTotalH, pdfPageH), undefined, 'NONE');
    return pdf;
  }

  const sayfaSayisi = Math.ceil(mainTotalH / pdfPageH);
  for (let i = 0; i < sayfaSayisi; i += 1) {
    if (i > 0) pdf.addPage();
    const srcY = (i * pdfPageH) / mainPxToMm;
    const sliceH = Math.min(pdfPageH, mainTotalH - i * pdfPageH);
    const srcH = Math.max(1, Math.round(sliceH / mainPxToMm));
    const dilimCanvas = document.createElement('canvas');
    dilimCanvas.width = mainCanvas.width;
    dilimCanvas.height = srcH;
    const ctx = dilimCanvas.getContext('2d');

    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(mainCanvas, 0, Math.round(srcY), mainCanvas.width, srcH, 0, 0, mainCanvas.width, srcH);
    }

    pdf.addImage(dilimCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfPageW, sliceH, undefined, 'NONE');
  }

  return pdf;
}

export default function TeklifOnizleme() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const sablonRef = useRef<HTMLDivElement>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);
  const uretiliyorRef = useRef(false);
  const sonOtomatikUretimRef = useRef<string | null>(null);

  const isMobile = useIsMobile(768);
  const C = useColors();
  const { isDark } = useTheme();
  const [teklif, setTeklif] = useState<Teklif | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfHazir, setPdfHazir] = useState(false);
  const [uretiliyor, setUretiliyor] = useState(false);

  useEffect(() => {
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
    if (!sablonRef.current || !teklif || uretiliyorRef.current) return;

    uretiliyorRef.current = true;
    setUretiliyor(true);
    setPdfHazir(false);

    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
    }

    try {
      const pdf = await buildPdf(sablonRef.current);
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

  function pdfIndir() {
    if (!pdfBlob || !teklif) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = `Teklif_${teklif.teklifNo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    message.success('PDF basariyla indirildi.');
  }

  function yazdir() {
    window.print();
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
              {teklif.cari.firmaAdi}
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
        <div className="print-inner" style={{ width: '100%', maxWidth: '210mm' }}>
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

          <div
            className="print-target"
            style={{
              width: '210mm',
              minHeight: '297mm',
              maxWidth: '100%',
              margin: '0 auto',
              background: '#ffffff',
              boxShadow: '0 20px 48px rgba(15, 23, 42, 0.24)',
              overflow: 'hidden',
            }}
          >
            <TeklifSablonu teklif={teklif} totals={totals} />
          </div>

          {(uretiliyor || !pdfHazir) && (
            <div className="no-print" style={{ textAlign: 'center', padding: '18px 0 0' }}>
              <Spin size="small" />
              <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.72)', fontSize: 12.5 }}>
                İndirme için yüksek kaliteli PDF arka planda hazırlanıyor.
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
