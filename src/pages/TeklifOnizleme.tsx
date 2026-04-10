import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Space, message, Spin, Alert } from 'antd';
import {
  ArrowLeftOutlined, SaveOutlined,
  FilePdfOutlined, PrinterOutlined, ReloadOutlined
} from '@ant-design/icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import TeklifSablonu from '../templates/TeklifSablonu';
import { teklifService } from '../services/teklifService';
import type { Teklif } from '../types';

// ── PDF sabitleri ────────────────────────────────────────────────────────────
const PAGE_PAD_LEFT   = 10;
const PAGE_PAD_RIGHT  = 10;
const PAGE_PAD_BOTTOM = 8;
const FOOTER_GAP      = 6;

const HTML2CANVAS_OPTIONS = {
  scale: 4,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  allowTaint: false,
  imageTimeout: 0,
};

// ── PDF üretim fonksiyonu ────────────────────────────────────────────────────
async function buildPdf(sablonEl: HTMLElement): Promise<jsPDF> {
  const footerEl = sablonEl.querySelector('#kase-imza-block') as HTMLElement | null;

  let footerCanvas: HTMLCanvasElement | null = null;
  if (footerEl) {
    footerCanvas = await html2canvas(footerEl, HTML2CANVAS_OPTIONS);
  }

  const origDisplay = footerEl?.style.display ?? '';
  if (footerEl) footerEl.style.display = 'none';
  const mainCanvas = await html2canvas(sablonEl, HTML2CANVAS_OPTIONS);
  if (footerEl) footerEl.style.display = origDisplay;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false,
    precision: 16,
  });
  const pdfPageW = pdf.internal.pageSize.getWidth();
  const pdfPageH = pdf.internal.pageSize.getHeight();

  const mainPxToMm = pdfPageW / mainCanvas.width;
  const mainTotalH = mainCanvas.height * mainPxToMm;
  const footerContentW = pdfPageW - PAGE_PAD_LEFT - PAGE_PAD_RIGHT;
  const footerH = footerCanvas
    ? (footerCanvas.height / footerCanvas.width) * footerContentW
    : 0;
  const footerArea = footerH + FOOTER_GAP + PAGE_PAD_BOTTOM;
  const contentH = pdfPageH - footerArea;

  const footerImgData = footerCanvas?.toDataURL('image/png');
  const stampFooter = () => {
    if (!footerImgData) return;
    const footerY = pdfPageH - PAGE_PAD_BOTTOM - footerH;
    pdf.addImage(footerImgData, 'PNG', PAGE_PAD_LEFT, footerY, footerContentW, footerH, undefined, 'NONE');
  };

  if (mainTotalH <= contentH) {
    pdf.addImage(mainCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfPageW, mainTotalH, undefined, 'NONE');
    stampFooter();
  } else {
    const sayfaSayisi = Math.ceil(mainTotalH / contentH);
    for (let i = 0; i < sayfaSayisi; i++) {
      if (i > 0) pdf.addPage();
      const srcY = (i * contentH) / mainPxToMm;
      const sliceH = Math.min(contentH, mainTotalH - i * contentH);
      const srcH = sliceH / mainPxToMm;
      const dilimCanvas = document.createElement('canvas');
      dilimCanvas.width = mainCanvas.width;
      dilimCanvas.height = srcH;
      const ctx = dilimCanvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(mainCanvas, 0, srcY, mainCanvas.width, srcH, 0, 0, mainCanvas.width, srcH);
      }
      pdf.addImage(dilimCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfPageW, sliceH, undefined, 'NONE');
      stampFooter();
    }
  }
  return pdf;
}

// ── Bileşen ──────────────────────────────────────────────────────────────────
export default function TeklifOnizleme() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Off-screen şablon ref'i (PDF canvas kaynağı)
  const sablonRef = useRef<HTMLDivElement>(null);

  const [teklif, setTeklif]         = useState<Teklif | null>(null);
  const [hata, setHata]             = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob]       = useState<Blob | null>(null);
  const [pdfHazir, setPdfHazir]     = useState(false);
  const [uretiliyor, setUretiliyor] = useState(false);

  // ── Teklif verisi yükle (senkron, localStorage'dan) ──
  useEffect(() => {
    if (!id) { setHata('Teklif ID bulunamadı.'); return; }
    const bulunan = teklifService.teklifGetir(id);
    if (!bulunan) { setHata('Teklif bulunamadı.'); return; }
    setTeklif(bulunan);
  }, [id]);

  // ── PDF üret (arka plan) ──
  const pdfOlustur = useCallback(async () => {
    if (!sablonRef.current || !teklif || uretiliyor) return;
    setUretiliyor(true);
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    try {
      const pdf = await buildPdf(sablonRef.current);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPdfBlobUrl(url);
      setPdfHazir(true);
    } catch {
      message.error('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setUretiliyor(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teklif]);

  // ── Teklif yüklenince → arka planda PDF üret ──
  // Kullanıcı ANINDA HTML preview görür, PDF hazır olunca iframe ile değişir.
  useEffect(() => {
    if (teklif && sablonRef.current) {
      const t = setTimeout(() => pdfOlustur(), 80);
      return () => clearTimeout(t);
    }
  }, [teklif, pdfOlustur]);

  // ── Cleanup ──
  useEffect(() => {
    return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── PDF İndir (cache'ten — anında) ──
  function pdfIndir() {
    if (!pdfBlob || !teklif) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = `Teklif_${teklif.teklifNo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    message.success('PDF başarıyla indirildi.');
  }

  // ── Yazdır ──
  function yazdir() {
    if (pdfBlobUrl) {
      const w = window.open(pdfBlobUrl);
      if (w) w.addEventListener('load', () => w.print(), { once: true });
    } else {
      window.print();
    }
  }

  // ── Error / loading ──
  if (hata) {
    return (
      <div style={{ padding: 40, maxWidth: 480, margin: '0 auto' }}>
        <Alert type="error" message={hata} style={{ marginBottom: 16 }} />
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teklifler')}>
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

  return (
    <>
      {/* ── ARAÇ ÇUBUĞU ─────────────────────────────────────── */}
      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 200,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid #e9ecef',
          padding: '0 28px',
          height: 54,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            size="small"
            onClick={() => navigate(`/teklif/${id}`)}
            style={{ fontWeight: 500 }}
          >
            Düzenle
          </Button>
          <span
            style={{
              fontSize: 12,
              color: '#6b7280',
              letterSpacing: 0.3,
              borderLeft: '1px solid #e5e7eb',
              paddingLeft: 12,
            }}
          >
            {teklif.teklifNo}
            <span style={{ marginLeft: 8, color: '#94a3b8' }}>·</span>
            <span style={{ marginLeft: 8, color: '#374151', fontWeight: 500 }}>
              {teklif.cari.firmaAdi}
            </span>
          </span>
        </div>

        <Space size={6}>
          <Button
            size="small"
            icon={<SaveOutlined />}
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
            loading={uretiliyor}
            onClick={() => { setPdfHazir(false); pdfOlustur(); }}
          >
            Yenile
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={yazdir}
          >
            Yazdır
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<FilePdfOutlined />}
            loading={uretiliyor && !pdfBlob}
            disabled={!pdfBlob}
            onClick={pdfIndir}
            style={{ background: '#0f1f45', borderColor: '#0f1f45' }}
          >
            PDF İndir
          </Button>
        </Space>
      </div>

      {/* ── OFF-SCREEN ŞABLON (html2canvas kaynağı) ──────────── */}
      <div
        aria-hidden
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
          <TeklifSablonu teklif={teklif} />
        </div>
      </div>

      {/* ── PREVIEW ALANI — tek katman, tek açılma ──────────── */}
      {/* PDF hazır → iframe göster. Hazır değil → loading state.  */}
      {/* Çift açılma yok: HTML template preview kaldırıldı.       */}
      <div
        className="no-print"
        style={{
          background: '#525659',
          minHeight: 'calc(100vh - 54px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {pdfHazir && pdfBlobUrl ? (
          <iframe
            key={pdfBlobUrl}
            src={pdfBlobUrl}
            title="Teklif PDF Önizleme"
            style={{
              width: '100%',
              height: 'calc(100vh - 54px)',
              border: 'none',
              background: '#525659',
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              PDF hazırlanıyor…
            </div>
          </div>
        )}
      </div>

      {/* ── BASKIYA ÖZEL STİLLER ─────────────────────────────── */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
}
