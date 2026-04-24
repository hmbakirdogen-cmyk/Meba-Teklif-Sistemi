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
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App } from 'antd';
import { useKullanici } from '../context/useKullanici';
import { useColors } from '../hooks/useColors';
import { useBelgeState, type PanelModu } from '../hooks/useBelgeState';
import { buildPdf } from '../services/pdfService';
import { teklifService } from '../services/teklifService';
import {
  teklifDisaAktar,
  type TeklifDisaAktarimHedefi,
  type TeklifDisaAktarimSonucu,
  TeklifDisaAktarimHatasi,
} from '../services/pdfKayitService';
import { formatCariAdi } from '../utils/formatters';
import CanliA4Belge from '../components/CanliA4Belge';
import SagPanel from '../components/SagPanel';
import BelgeToolbar from '../components/BelgeToolbar';
import KumandaPaneli from '../components/KumandaPaneli';
import CariSecimi from '../components/CariSecimi';
import type { Teklif } from '../types';
import type { EditingAlan } from '../components/PaginatedBelgeInlineEditor';

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

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

  // Kilitli / Düzenleme modu
  const [modeKilitli, setModeKilitli] = useState(false);
  const handleModeKilitliDegistir = useCallback((v: boolean) => {
    setModeKilitli(v);
    if (v) setEditingAlan(null);
  }, []);

  const state = useBelgeState(
    id,
    aktifKullanici ? { id: aktifKullanici.id, adSoyad: aktifKullanici.adSoyad, rol: aktifKullanici.rol } : null,
  );

  // Yeni teklif: cari seçildikten sonra ilk satır yoksa ekle ve müşteri alanını aç (muhatap odak)
  const yeniTeklif = !id;
  const cari = state.cari;
  const satirlar = state.satirlar;
  const satirEkle = state.satirEkle;
  const muhatapGosterildiRef = useRef(false);
  useEffect(() => {
    if (yeniTeklif && cari && satirlar.length === 0) {
      satirEkle();
      // Cari seçildikten sonra müşteri panelini aç → muhatap alanına odak gider
      muhatapGosterildiRef.current = true;
      setEditingAlan('musteri');
    }
  }, [yeniTeklif, cari, satirlar.length, satirEkle]);

  // Yeni eklenen satırı otomatik düzenleme moduna al — sadece müşteri alanı kapatıldıktan sonra
  useEffect(() => {
    if (
      yeniTeklif &&
      satirlar.length === 1 &&
      editingAlan === null &&
      cari &&
      !muhatapGosterildiRef.current
    ) {
      setEditingAlan(`satir-${satirlar[0].id}`);
    }
    // Muhatap paneli kapatılınca (editingAlan null'a döndü) satıra geç
    if (muhatapGosterildiRef.current && editingAlan === null && satirlar.length >= 1) {
      muhatapGosterildiRef.current = false;
      setEditingAlan(`satir-${satirlar[0].id}`);
    }
  }, [yeniTeklif, satirlar, cari, editingAlan]);

  // ── Teklif nesnesi oluştur (canlı belge için) ──
  const teklifObj: Teklif | null = useMemo(() => {
    if (!state.cari) return null;

    return {
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
    };
  }, [
    state.teklifId,
    state.teklifNo,
    state.tarih,
    state.satirBazliParaBirimi,
    state.paraBirimi,
    state.durum,
    state.cari,
    state.satirlar,
    state.araToplam,
    state.toplamIndirim,
    state.toplamVergi,
    state.genelToplam,
    state.kdvOrani,
    state.iskontoOrani,
    state.odemeVadesi,
    state.notlar,
    state.olusturmaTarihi,
    state.hazirlayanKullaniciId,
    state.hazirlayanAdSoyad,
    state.hazirlayanRol,
    state.contactName,
    state.contactTitle,
  ]);

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

  const showExportMessage = useCallback((sonuc: TeklifDisaAktarimSonucu) => {
    if (sonuc.hedef === 'pdf') {
      if (sonuc.kayitYontemi === 'tarayici') {
        message.success('PDF indirildi. Bu ortamda otomatik masaustu kaydi kullanilamadigi icin tarayici indirmesi kullanildi.');
        return;
      }

      if (sonuc.dosyaAcildi) {
        message.success('PDF kaydedildi, kayit altina alindi ve otomatik olarak acildi.');
        return;
      }

      message.warning(
        sonuc.dosyaAcmaHatasi
          ? `PDF kaydedildi ve kayit altina alindi, ancak otomatik acilamadi. ${sonuc.dosyaAcmaHatasi}`
          : 'PDF kaydedildi ve kayit altina alindi, ancak otomatik acma tamamlanamadi.',
      );
      return;
    }

    if (sonuc.kayitYontemi === 'tarayici') {
      if (sonuc.epostaTaslakYontemi === 'mailto') {
        message.warning(
          'PDF indirildi ve e-posta taslağı açıldı. Tarayıcı ortamında PDF eki otomatik eklenemediğinden eki lütfen kendiniz ekleyiniz.',
        );
        return;
      }

      message.warning(
        sonuc.epostaHatasi
          ? `PDF indirildi, ancak e-posta taslağı açılamadı. ${sonuc.epostaHatasi}`
          : 'PDF indirildi, ancak e-posta taslağı açılamadı.',
      );
      return;
    }

    if (sonuc.epostaHazirlandi && sonuc.epostaTaslakYontemi === 'outlook') {
      message.success('Teklif arşive işlendi ve Outlook gönder penceresi açıldı.');
      return;
    }

    message.warning(
      sonuc.epostaHatasi
        ? `Teklif arşive işlendi, ancak e-posta göndericisi açılamadı. ${sonuc.epostaHatasi}`
        : 'Teklif arşive işlendi, ancak e-posta göndericisi açılamadı.',
    );
  }, [message]);

  const handleDisaAktar = useCallback(async (hedef: TeklifDisaAktarimHedefi) => {
    if (!teklifObj || !sablonRef.current || !kompaktHeaderRef.current || uretiliyorRef.current) return;

    if (!state.cari) {
      message.warning('Lütfen önce bir müşteri seçin.');
      return;
    }

    if (state.satirlar.length === 0) {
      message.warning('PDF oluşturmak için en az bir ürün satırı ekleyin.');
      return;
    }

    const kaydedildi = await state.kaydet();
    if (!kaydedildi) {
      message.error('Teklif kaydedilemedi. PDF olusturma islemi durduruldu.');
      return;
    }

    uretiliyorRef.current = true;
    state.setUretiliyor(true);
    state.setPdfHazir(false);
    state.setPdfBlob(null);
    printImagesRef.current = [];

    try {
      await waitForNextPaint();
      const { pdf, pageImages } = await buildPdf(sablonRef.current);
      printImagesRef.current = pageImages;
      const blob = pdf.output('blob');
      state.setPdfBlob(blob);
      state.setPdfHazir(true);

      const kayitliTeklif = teklifService.teklifGetir(state.teklifId) ?? teklifObj;
      const sonuc = await teklifDisaAktar(blob, kayitliTeklif, hedef);
      teklifService.teklifCacheGuncelle(sonuc.teklif);
      showExportMessage(sonuc);
    } catch (error) {
      if (error instanceof TeklifDisaAktarimHatasi) {
        message.error(error.message);
      } else {
        message.error(
          hedef === 'email'
            ? 'E-mail gonderim akisi hazirlanirken hata olustu.'
            : 'PDF olusturulurken hata olustu.',
        );
      }
    } finally {
      uretiliyorRef.current = false;
      state.setUretiliyor(false);
    }
  }, [teklifObj, state, message, showExportMessage]);

  const handlePdfIndir = useCallback(async () => {
    await handleDisaAktar('pdf');
  }, [handleDisaAktar]);

  const handleEMailGonder = useCallback(async () => {
    await handleDisaAktar('email');
  }, [handleDisaAktar]);

  const handleYazdir = useCallback(async () => {
    if (!teklifObj || !sablonRef.current || !kompaktHeaderRef.current || uretiliyorRef.current) return;

    uretiliyorRef.current = true;
    state.setUretiliyor(true);

    try {
      let images = printImagesRef.current;
      if (images.length === 0) {
        const { pageImages } = await buildPdf(sablonRef.current);
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
      minHeight: '100vh',
      background: C.bgBody,
      overflowX: 'hidden',
    }}>
      {/* Toolbar */}
      <BelgeToolbar
        teklifNo={state.teklifNo}
        teklifNoDurumu={state.teklifNoDurumu}
        cariAdi={state.cari ? formatCariAdi(state.cari.firmaAdi) : undefined}
        durum={state.durum}
        uretiliyor={state.uretiliyor}
        onGeriDon={handleGeriDon}
        onKaydet={handleKaydet}
        onPdfIndir={handlePdfIndir}
        onEMailGonder={handleEMailGonder}
        onYazdir={handleYazdir}
        onSatirEkle={state.satirEkle}
        onPanelAc={handlePanelAc}
      />

      {/* Ana alan: Belge + Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        background: '#E0DDD9',
        alignItems: 'flex-start',
      }}>
        {/* Belge alanı (natural flow — body scrolls) */}
        <div
          style={{
            flex: 1,
            padding: '40px 48px 64px',
            background: '#E0DDD9',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            position: 'relative',
          }}
        >
          {teklifObj ? (
            <CanliA4Belge
              teklif={teklifObj}
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
              satirBazliIskonto={state.satirBazliIskonto}
              onKdvOraniDegistir={state.setKdvOrani}
              onOdemeVadesiDegistir={state.setOdemeVadesi}
              onSatirGuncelle={state.satirGuncelle}
              onSatirSil={state.satirSil}
              onSatirEkle={state.satirEkle}
              onSatirArayaEkle={state.satirArayaEkle}
              onNotlarDegistir={state.setNotlar}
              sablonRef={sablonRef}
              kompaktHeaderRef={kompaktHeaderRef}
              readOnly={modeKilitli}
            />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'calc(100vh - 160px)',
              gap: 16,
              color: C.textFaint,
            }}>
              <div style={{ fontSize: 48, opacity: 0.3 }}>📄</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Müşteri seçerek başlayın</div>
              <div style={{ fontSize: 13 }}>Bir müşteri seçtiğinizde belge otomatik oluşacak.</div>
              <div style={{ marginTop: 8, width: '100%', maxWidth: 520 }}>
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
          paraBirimi={state.paraBirimi}
          satirBazliParaBirimi={state.satirBazliParaBirimi}
          satirBazliIskonto={state.satirBazliIskonto}
          notlar={state.notlar}
          onNotlarDegistir={state.setNotlar}
        />
      </div>

      {/* Kumanda Paneli (fixed overlay — viewport'a sabit) */}
      {teklifObj && (
        <KumandaPaneli
          readOnly={modeKilitli}
          onReadOnlyDegistir={handleModeKilitliDegistir}
          durum={state.durum}
          onDurumDegistir={state.setDurum}
          kdvOrani={state.kdvOrani}
          onKdvOraniDegistir={state.setKdvOrani}
          iskontoOrani={state.iskontoOrani}
          onIskontoOraniDegistir={state.setIskontoOrani}
          satirBazliParaBirimi={state.satirBazliParaBirimi}
          onSatirBazliParaBirimiDegistir={state.setSatirBazliParaBirimi}
          satirBazliIskonto={state.satirBazliIskonto}
          onSatirBazliIskontoDegistir={state.setSatirBazliIskonto}
          sagPanelOpen={state.panelModu !== null}
        />
      )}
    </div>
  );
}
