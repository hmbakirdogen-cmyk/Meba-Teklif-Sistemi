import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Space, message, Spin, Alert } from 'antd';
import {
  ArrowLeftOutlined, SaveOutlined,
  FilePdfOutlined, PrinterOutlined
} from '@ant-design/icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import TeklifSablonu from '../templates/TeklifSablonu';
import { teklifService } from '../services/teklifService';
import type { Teklif } from '../types';

export default function TeklifOnizleme() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const sablonRef = useRef<HTMLDivElement>(null);

  const [teklif, setTeklif] = useState<Teklif | null>(null);
  const [pdfYukleniyor, setPdfYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setHata('Teklif ID bulunamadı.'); return; }
    const bulunan = teklifService.teklifGetir(id);
    if (!bulunan) { setHata('Teklif bulunamadı.'); return; }
    setTeklif(bulunan);
  }, [id]);

  function yazdir() {
    window.print();
  }

  async function pdfIndir() {
    if (!sablonRef.current || !teklif) return;
    setPdfYukleniyor(true);
    try {
      const canvas = await html2canvas(sablonRef.current, {
        scale: 4,          // 4× → 4× daha fazla piksel, logo ve metin ultra keskin
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: false,
        imageTimeout: 0,   // logo yüklenmesini bekleme timeout'u kaldır
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfPageW = pdf.internal.pageSize.getWidth();   // 210 mm
      const pdfPageH = pdf.internal.pageSize.getHeight();  // 297 mm

      // Canvas piksel → mm dönüşüm oranı
      const pxToMm = pdfPageW / canvas.width;
      const totalH = canvas.height * pxToMm; // Toplam belge yüksekliği (mm)

      if (totalH <= pdfPageH) {
        // Tek sayfaya sığıyor
        pdf.addImage(imgData, 'PNG', 0, 0, pdfPageW, totalH);
      } else {
        // Birden fazla sayfa — her sayfada canvas'tan dilim keseriz
        const sayfaSayisi = Math.ceil(totalH / pdfPageH);
        for (let i = 0; i < sayfaSayisi; i++) {
          if (i > 0) pdf.addPage();
          // Bu sayfanın canvas üzerindeki y-başlangıcı (px cinsinden)
          const srcY = (i * pdfPageH) / pxToMm;
          // Bu sayfada görünecek yükseklik (mm)
          const sliceH = Math.min(pdfPageH, totalH - i * pdfPageH);
          // Canvas'ta kesen yükseklik (px)
          const srcH = sliceH / pxToMm;

          // Geçici canvas oluştur ve dilimi çiz
          const dilimCanvas = document.createElement('canvas');
          dilimCanvas.width = canvas.width;
          dilimCanvas.height = srcH;
          const ctx = dilimCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
          }
          const dilimData = dilimCanvas.toDataURL('image/png');
          pdf.addImage(dilimData, 'PNG', 0, 0, pdfPageW, sliceH);
        }
      }

      pdf.save(`Teklif_${teklif.teklifNo}.pdf`);
      message.success('PDF başarıyla indirildi.');
    } catch {
      message.error('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setPdfYukleniyor(false);
    }
  }

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
      {/* ── ARAÇ ÇUBUĞU — baskıda gizlenir ───────────────────── */}
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
        {/* Sol: Geri + Teklif No */}
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

        {/* Sağ: Eylemler */}
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
            icon={<PrinterOutlined />}
            onClick={yazdir}
          >
            Yazdır
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<FilePdfOutlined />}
            loading={pdfYukleniyor}
            onClick={pdfIndir}
            style={{ background: '#0f1f45', borderColor: '#0f1f45' }}
          >
            PDF İndir
          </Button>
        </Space>
      </div>

      {/* ── BELGE ALANI — baskıda gizlenir ───────────────────── */}
      <div
        className="no-print preview-stage"
        style={{
          background: '#2d2d2d',
          minHeight: 'calc(100vh - 54px)',
          padding: '36px 24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        {/* Sayfa çerçevesi */}
        <div
          style={{
            background: '#ffffff',
            boxShadow: '0 4px 32px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.3)',
            borderRadius: 2,
            width: '210mm',
            maxWidth: '100%',
          }}
        >
          <div ref={sablonRef}>
            <TeklifSablonu teklif={teklif} />
          </div>
        </div>
      </div>

      {/* ── BASKIYA ÖZEL STİLLER ─────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          *,
          *::before,
          *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .preview-stage {
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
          }
          #teklif-sablon {
            width: 210mm !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 10mm 10mm 8mm 10mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
