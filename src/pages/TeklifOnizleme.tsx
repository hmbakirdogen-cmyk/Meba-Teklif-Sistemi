import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const HTML2CANVAS_OPTIONS = {
  scale: 5,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  allowTaint: false,
  imageTimeout: 0,
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teklifler')}>
          Listeye Don
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
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid #e9ecef',
          padding: '0 28px',
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
            onClick={() => navigate(`/teklif/${id}`)}
            style={{ fontWeight: 500 }}
          >
            Duzenle
          </Button>
          <span
            style={{
              fontSize: 12,
              color: '#6b7280',
              letterSpacing: 0.3,
              borderLeft: '1px solid #e5e7eb',
              paddingLeft: 12,
              minWidth: 0,
            }}
          >
            {teklif.teklifNo}
            <span style={{ marginLeft: 8, color: '#94a3b8' }}>·</span>
            <span style={{ marginLeft: 8, color: '#374151', fontWeight: 500 }}>
              {teklif.cari.firmaAdi}
            </span>
          </span>
        </div>

        <Space size={6} wrap>
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
            onClick={() => {
              void pdfOlustur();
            }}
          >
            Yenile
          </Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={yazdir}>
            Yazdir
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
            PDF Indir
          </Button>
        </Space>
      </div>

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
          <TeklifSablonu teklif={teklif} totals={totals} />
        </div>
      </div>

      <div
        style={{
          background: '#525659',
          minHeight: 'calc(100vh - 54px)',
          display: 'flex',
          justifyContent: 'center',
          padding: '28px 16px 40px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '210mm' }}>
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
            <span>A4 Onizleme</span>
            <span style={{ color: 'rgba(255,255,255,0.62)' }}>
              {uretiliyor || !pdfHazir ? 'PDF hazirlaniyor...' : 'PDF hazir'}
            </span>
          </div>

          <div
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
                Indirme icin yuksek kaliteli PDF arka planda hazirlaniyor.
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .no-print { display: none !important; }
          body { background: #ffffff !important; }
        }
      `}</style>
    </>
  );
}
