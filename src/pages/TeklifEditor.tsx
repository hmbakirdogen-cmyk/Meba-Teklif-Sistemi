/**
 * TeklifEditor.tsx
 * ─────────────────────────────────────────────────────────────────
 * Tek belge merkezli teklif editörü — inline düzenleme modeli.
 *
 * Birincil etkileşim: Belge üzerindeki tıklamalar → ilgili alan yerinde (inline) açılır
 * İkincil etkileşim: Araç çubuğundan açılan sağ panel (gelişmiş düzenleme)
 *
 * Layout: Toolbar (üst) + Canlı A4 Belge (merkez) + Sağ Panel (isteğe bağlı)
 */
import { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App } from 'antd';
import { useKullanici } from '../context/useKullanici';
import { useColors } from '../hooks/useColors';
import { useBelgeState, type PanelModu } from '../hooks/useBelgeState';
import { buildPdf } from '../services/pdfService';
import { formatCariAdi } from '../utils/formatters';
import CanliA4Belge from '../components/CanliA4Belge';
import SagPanel from '../components/SagPanel';
import BelgeToolbar from '../components/BelgeToolbar';
import CariSecimi from '../components/CariSecimi';
import type { Teklif } from '../types';
import type { EditingAlan } from '../components/BelgeInlineEditor';

export default function TeklifEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { aktifKullanici } = useKullanici();
  const C = useColors();

  const sablonRef = useRef<HTMLDivElement>(null);
  const kompaktHeaderRef = useRef<HTMLDivElement>(null);
  const uretiliyorRef = useRef(false);
  const printImagesRef = useRef<string[]>([]);

  // Inline düzenleme state — popover yerine
  const [editingAlan, setEditingAlan] = useState<EditingAlan>(null);

  const state = useBelgeState(
    id,
    aktifKullanici ? { id: aktifKullanici.id, adSoyad: aktifKullanici.adSoyad, rol: aktifKullanici.rol } : null,
  );

  // Yeni teklif: cari seçildikten sonra ilk satır yoksa ekle ve düzenleme moduna al
  const yeniTeklif = !id;
  useEffect(() => {
    if (yeniTeklif && state.cari && state.satirlar.length === 0) {
      state.satirEkle();
    }
  }, [yeniTeklif, state.cari]);

  // Yeni eklenen satırı otomatik düzenleme moduna al
  useEffect(() => {
    if (yeniTeklif && state.satirlar.length === 1 && editingAlan === null && state.cari) {
      setEditingAlan(`satir-${state.satirlar[0].id}`);
    }
  }, [yeniTeklif, state.satirlar.length, state.cari]);

  // ── Teklif nesnesi oluştur (canlı belge için) ──
  const teklifObj: Teklif | null = state.cari ? {
    id: state.teklifId,
    teklifNo: state.teklifNo,
    tarih: state.tarih,
    satirBazliParaBirimi: state.satirBazliParaBirimi,
    paraBirimi: state.paraBirimi,
    durum: state.durum,
    cari: state.cari,
    satirlar: state.satirlar,
    araToplam: state.araToplam,
    toplamIndirim: state.toplamIndirim,
    toplamVergi: state.toplamVergi,
    genelToplam: state.genelToplam,
    kdvOrani: state.kdvOrani,
    iskontoOrani: state.iskontoOrani,
    odemeVadesi: state.odemeVadesi,
    notlar: state.notlar,
    olusturmaTarihi: state.olusturmaTarihi,
    guncellemeTarihi: new Date().toISOString(),
    hazirlayanKullaniciId: state.hazirlayanKullaniciId,
    hazirlayanAdSoyad: state.hazirlayanAdSoyad,
    hazirlayanRol: state.hazirlayanRol,
    gecerlilikSuresi: '1 Hafta',
    contactName: state.contactName.trim() || undefined,
    contactTitle: state.contactName.trim() ? state.contactTitle : undefined,
  } : null;

  // ── Aksiyonlar ──

  const handleKaydet = useCallback(async () => {
    if (!state.cari) {
      message.warning('Lütfen bir müşteri seçin.');
      return;
    }
    if (state.satirlar.length === 0) {
      message.warning('En az bir ürün satırı eklemeniz gerekiyor.');
      return;
    }
    const ok = await state.kaydet();
    if (ok) {
      message.success('Teklif kaydedildi.');
    } else {
      message.error('Kaydetme başarısız oldu.');
    }
  }, [state, message]);

  const handlePdfIndir = useCallback(async () => {
    if (!teklifObj || !sablonRef.current || !kompaktHeaderRef.current || uretiliyorRef.current) return;

    if (state.cari && state.satirlar.length > 0) {
      await state.kaydet();
    }

    uretiliyorRef.current = true;
    state.setUretiliyor(true);
    state.setPdfHazir(false);
    state.setPdfBlob(null);
    printImagesRef.current = [];

    try {
      const { pdf, pageImages } = await buildPdf(sablonRef.current, kompaktHeaderRef.current);
      printImagesRef.current = pageImages;
      const blob = pdf.output('blob');
      state.setPdfBlob(blob);
      state.setPdfHazir(true);

      const dosyaAdi = `${teklifObj.teklifNo} - ${formatCariAdi(teklifObj.cari.firmaAdi)}.pdf`;
      if ('showSaveFilePicker' in window) {
        try {
          const fh = await (window as any).showSaveFilePicker({
            suggestedName: dosyaAdi,
            types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
          });
          const ws = await fh.createWritable();
          await ws.write(blob);
          await ws.close();
          message.success('PDF kaydedildi.');
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') { return; }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = dosyaAdi;
      a.click();
      URL.revokeObjectURL(url);
      message.success('PDF indirildi.');
    } catch (err) {
      message.error('PDF oluşturulurken hata oluştu.');
    } finally {
      uretiliyorRef.current = false;
      state.setUretiliyor(false);
    }
  }, [teklifObj, state, message]);

  const handleYazdir = useCallback(async () => {
    if (!teklifObj || !sablonRef.current || !kompaktHeaderRef.current || uretiliyorRef.current) return;

    uretiliyorRef.current = true;
    state.setUretiliyor(true);

    try {
      let images = printImagesRef.current;
      if (images.length === 0) {
        const { pageImages } = await buildPdf(sablonRef.current, kompaktHeaderRef.current);
        images = pageImages;
        printImagesRef.current = images;
      }

      if (images.length === 0) { message.error('Yazdırma verisi oluşturulamadı.'); return; }

      const htmlContent = images.map(
        (src) => `<div style="page-break-after:always;margin:0;padding:0;"><img src="${src}" style="width:210mm;height:297mm;display:block;" /></div>`,
      ).join('');

      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;border:none;';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Print</title><style>@page{size:A4 portrait;margin:0}body{margin:0}</style></head><body>${htmlContent}</body></html>`);
      doc.close();

      const imagesInIframe = doc.querySelectorAll('img');
      await Promise.all(
        Array.from(imagesInIframe).map(
          (img) => new Promise<void>((res) => { if (img.complete) res(); else img.onload = () => res(); }),
        ),
      );

      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 3000);
    } catch {
      message.error('Yazdırma sırasında hata oluştu.');
    } finally {
      uretiliyorRef.current = false;
      state.setUretiliyor(false);
    }
  }, [teklifObj, state, message]);

  const handleGeriDon = useCallback(() => {
    navigate('/teklifler');
  }, [navigate]);

  // ── Araç çubuğundan panel açma (ikincil etkileşim) ──
  const handlePanelAc = useCallback((mod: PanelModu) => {
    setEditingAlan(null);
    state.setPanelModu(state.panelModu === mod ? null : mod);
  }, [state]);

  const handlePanelKapat = useCallback(() => {
    state.setPanelModu(null);
    state.setSeciliSatirId(null);
  }, [state]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: C.bgBody,
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <BelgeToolbar
        teklifNo={state.teklifNo}
        teklifNoDurumu={state.teklifNoDurumu}
        cariAdi={state.cari ? formatCariAdi(state.cari.firmaAdi) : undefined}
        durum={state.durum}
        uretiliyor={state.uretiliyor}
        pdfHazir={state.pdfHazir}
        onGeriDon={handleGeriDon}
        onKaydet={handleKaydet}
        onPdfIndir={handlePdfIndir}
        onYazdir={handleYazdir}
        onSatirEkle={state.satirEkle}
        onPanelAc={handlePanelAc}
      />

      {/* Ana alan: Belge + Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Belge alanı (scroll container) */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px 16px',
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {teklifObj ? (
            <CanliA4Belge
              teklif={teklifObj}
              panelModu={state.panelModu}
              editingAlan={editingAlan}
              onEditingAlanDegistir={setEditingAlan}
              onCariDegistir={state.setCari}
              contactName={state.contactName}
              contactTitle={state.contactTitle}
              onContactNameDegistir={state.setContactName}
              onContactTitleDegistir={state.setContactTitle}
              onTarihDegistir={state.setTarih}
              onParaBirimiDegistir={state.setParaBirimi}
              satirBazliParaBirimi={state.satirBazliParaBirimi}
              onSatirBazliDegistir={state.setSatirBazliParaBirimi}
              onDurumDegistir={state.setDurum}
              onKdvOraniDegistir={state.setKdvOrani}
              onIskontoOraniDegistir={state.setIskontoOrani}
              onOdemeVadesiDegistir={state.setOdemeVadesi}
              onSatirGuncelle={state.satirGuncelle}
              onSatirSil={state.satirSil}
              onSatirEkle={state.satirEkle}
              onNotlarDegistir={state.setNotlar}
              yeniTeklif={yeniTeklif}
              sablonRef={sablonRef}
              kompaktHeaderRef={kompaktHeaderRef}
            />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 16,
              color: C.textFaint,
            }}>
              <div style={{ fontSize: 48, opacity: 0.3 }}>📄</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Müşteri seçerek başlayın</div>
              <div style={{ fontSize: 13 }}>Bir müşteri seçtiğinizde belge otomatik oluşacak.</div>
              <div style={{ marginTop: 8, width: 300 }}>
                <CariSecimi value={null} onChange={state.setCari} />
              </div>
            </div>
          )}
        </div>

        {/* Sağ Panel (ikincil — gelişmiş düzenleme) */}
        <SagPanel
          panelModu={state.panelModu}
          onKapat={handlePanelKapat}
          cari={state.cari}
          onCariDegistir={state.setCari}
          contactName={state.contactName}
          contactTitle={state.contactTitle}
          onContactNameDegistir={state.setContactName}
          onContactTitleDegistir={state.setContactTitle}
          satirlar={state.satirlar}
          seciliSatirId={state.seciliSatirId}
          onSatirGuncelle={state.satirGuncelle}
          onSatirSil={state.satirSil}
          onSatirEkle={state.satirEkle}
          tarih={state.tarih}
          onTarihDegistir={state.setTarih}
          paraBirimi={state.paraBirimi}
          onParaBirimiDegistir={state.setParaBirimi}
          satirBazliParaBirimi={state.satirBazliParaBirimi}
          onSatirBazliDegistir={state.setSatirBazliParaBirimi}
          durum={state.durum}
          onDurumDegistir={state.setDurum}
          kdvOrani={state.kdvOrani}
          onKdvOraniDegistir={state.setKdvOrani}
          iskontoOrani={state.iskontoOrani}
          onIskontoOraniDegistir={state.setIskontoOrani}
          odemeVadesi={state.odemeVadesi}
          onOdemeVadesiDegistir={state.setOdemeVadesi}
          notlar={state.notlar}
          onNotlarDegistir={state.setNotlar}
          araToplam={state.araToplam}
          toplamIndirim={state.toplamIndirim}
        />
      </div>
    </div>
  );
}
