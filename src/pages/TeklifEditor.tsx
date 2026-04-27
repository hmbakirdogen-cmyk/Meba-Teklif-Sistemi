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
import { buildPdf, buildEmailPdf, buildPrintImages } from '../services/pdfService';
import { teklifService } from '../services/teklifService';
import {
  teklifDisaAktar,
  type TeklifDisaAktarimHedefi,
  type TeklifDisaAktarimSonucu,
  TeklifDisaAktarimHatasi,
} from '../services/pdfKayitService';
import { formatCariAdi } from '../utils/formatters';
import { DOCUMENT_PAGE, mmToPx } from '../templates/teklifDocumentShared';
import CanliA4Belge from '../components/CanliA4Belge';
import SagPanel from '../components/SagPanel';
import BelgeToolbar from '../components/BelgeToolbar';
import KumandaPaneli from '../components/KumandaPaneli';
import CariSecimi from '../components/CariSecimi';
import type { Teklif, SatirGrupRenk } from '../types';
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
  const [grupModuAktif, setGrupModuAktif] = useState(false);
  const [seciliGrupRenk, setSeciliGrupRenk] = useState<SatirGrupRenk>('amber');

  // Kilitli / Düzenleme modu — global tek state, URL'ye göre başlangıç:
  //   • Yeni teklif (id yok)   → editMode = true  (kilitli=false) → direkt yazmaya başla
  //   • Mevcut teklif (id var) → editMode = false (kilitli=true)  → güvenli görüntüleme
  const [modeKilitli, setModeKilitli] = useState<boolean>(() => Boolean(id));

  const state = useBelgeState(
    id,
    aktifKullanici ? { id: aktifKullanici.id, adSoyad: aktifKullanici.adSoyad, rol: aktifKullanici.rol, unvan: aktifKullanici.unvan } : null,
  );

  const stateCari = state.cari;
  const stateSatirSayisi = state.satirlar.length;
  const kaydetWithStatus = state.kaydetWithStatus;

  const persistStatusByMode = useCallback(async (kilitli: boolean) => {
    if (!stateCari || stateSatirSayisi === 0) return;
    await kaydetWithStatus(kilitli ? 'kaydedildi' : 'taslak');
  }, [kaydetWithStatus, stateCari, stateSatirSayisi]);

  const handleModeKilitliDegistir = useCallback((v: boolean) => {
    setModeKilitli(v);
    if (v) {
      setGrupModuAktif(false);
      setEditingAlan(null);
      void persistStatusByMode(true);
    }
  }, [persistStatusByMode]);

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
      hazirlayanUnvan: state.hazirlayanUnvan,
      gecerlilikSuresi: '1 Hafta',
      contactName: state.contactName.trim() || undefined,
      contactTitle: state.contactName.trim() ? state.contactTitle : undefined,
      gorseller: state.gorseller.length > 0 ? state.gorseller : undefined,
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
    state.hazirlayanUnvan,
    state.contactName,
    state.contactTitle,
    state.gorseller,
  ]);

  // ── Aksiyonlar ──
  // Manuel "Kaydet" yok; useBelgeState içindeki auto-save effect tüm değişimleri
  // 600ms debounce ile sessizce taslak olarak persist eder.

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

    if (sonuc.epostaHazirlandi && sonuc.epostaTaslakYontemi === 'mailto') {
      message.warning('Teklif arşive işlendi ve mailto taslağı açıldı. PDF ekini manuel ekleyiniz.');
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

    // 1) Önce state'i ZORLA "kaydedildi" olarak persist et — PDF en son halden üretilir
    const kaydedildi = await state.kaydetWithStatus('kaydedildi');
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
      // 2) PDF oluştur
      const { pdf, pageImages } = hedef === 'email'
        ? await buildEmailPdf(sablonRef.current)
        : await buildPdf(sablonRef.current);
      printImagesRef.current = pageImages;
      const blob = pdf.output('blob');
      state.setPdfBlob(blob);
      state.setPdfHazir(true);

      const kayitliTeklif = teklifService.teklifGetir(state.teklifId) ?? teklifObj;
      const sonuc = await teklifDisaAktar(blob, kayitliTeklif, hedef);
      teklifService.teklifCacheGuncelle(sonuc.teklif);
      showExportMessage(sonuc);

      // 3) E-posta başarıyla gönderildiyse → status "gonderildi"
      if (hedef === 'email' && sonuc.epostaHazirlandi) {
        await state.kaydetWithStatus('gonderildi');
      }
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
      await waitForNextPaint();
      const images = await buildPrintImages(sablonRef.current);
      printImagesRef.current = images;

      if (images.length === 0) { message.error('Yazdırma verisi oluşturulamadı.'); return; }

      const htmlContent = images.map(
        (src) => `<div style="page-break-after:always;margin:0;padding:0;line-height:0;font-size:0;"><img src="${src}" style="width:210mm;height:297mm;display:block;image-rendering:auto;" /></div>`,
      ).join('');

      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;border:none;';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Print</title><style>
        @page { size: A4 portrait; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
        img { display: block; width: 210mm; height: 297mm; max-width: none; max-height: none; image-rendering: auto; }
        div { page-break-inside: avoid; }
      </style></head><body>${htmlContent}</body></html>`);
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

  const handleGeriDon = useCallback(async () => {
    await persistStatusByMode(modeKilitli);
    navigate('/teklifler');
  }, [modeKilitli, navigate, persistStatusByMode]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Edit modunda sayfadan çıkış: taslak, kilitli modda çıkış: kaydedildi.
      void persistStatusByMode(modeKilitli);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      void persistStatusByMode(modeKilitli);
    };
  }, [modeKilitli, persistStatusByMode]);

  // ── Resim ekleme ──
  // Default fallback: x %60, y %60 (sağ-alt). Doğal boyut yüklenince
  // max 220px sınırına ölçeklenir; aspect korunur.
  const handleResimEkle = useCallback((dataUrl: string) => {
    const pageW = Math.round(mmToPx(DOCUMENT_PAGE.widthMm));
    const pageH = Math.round(mmToPx(DOCUMENT_PAGE.heightMm));
    const img = new Image();
    img.onload = () => {
      const MAX = 220;
      const nw = img.naturalWidth || 200;
      const nh = img.naturalHeight || 200;
      const ratio = Math.min(MAX / nw, MAX / nh, 1);
      const width  = Math.max(60, Math.round(nw * ratio));
      const height = Math.max(60, Math.round(nh * ratio));
      const xRaw = Math.round(pageW * 0.60 - width / 2);
      const yRaw = Math.round(pageH * 0.60 - height / 2);
      const x = Math.max(0, Math.min(pageW - width,  xRaw));
      const y = Math.max(0, Math.min(pageH - height, yRaw));
      // Son sayfa default
      const lastPageIndex = Math.max(0, (state.gorseller[0]?.pageIndex ?? 0));
      const id = state.gorselEkle(dataUrl, { width, height, pageIndex: lastPageIndex });
      // Pozisyonu commit et (gorselEkle x/y=0 koyar, doğru konuma çek)
      state.gorselGuncelle(id, { x, y });
    };
    img.src = dataUrl;
  }, [state]);

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
        status={state.status}
        uretiliyor={state.uretiliyor}
        onGeriDon={handleGeriDon}
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
              onCariEPostaDegistir={state.setCariEPosta}
              contactName={state.contactName}
              contactTitle={state.contactTitle}
              onContactNameDegistir={state.setContactName}
              onContactTitleDegistir={state.setContactTitle}
              onTarihDegistir={state.setTarih}
              onParaBirimiDegistir={state.setParaBirimi}
              satirBazliParaBirimi={state.satirBazliParaBirimi}
              satirBazliIskonto={state.satirBazliIskonto}
              grupModuAktif={grupModuAktif}
              seciliGrupRenk={seciliGrupRenk}
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
              gorseller={state.gorseller}
              onGorselGuncelle={state.gorselGuncelle}
              onGorselSil={state.gorselSil}
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
          kdvOrani={state.kdvOrani}
          onKdvOraniDegistir={state.setKdvOrani}
          iskontoOrani={state.iskontoOrani}
          onIskontoOraniDegistir={state.setIskontoOrani}
          satirBazliParaBirimi={state.satirBazliParaBirimi}
          onSatirBazliParaBirimiDegistir={state.setSatirBazliParaBirimi}
          satirBazliIskonto={state.satirBazliIskonto}
          onSatirBazliIskontoDegistir={state.setSatirBazliIskonto}
          grupModuAktif={grupModuAktif}
          onGrupModuDegistir={setGrupModuAktif}
          grupRenk={seciliGrupRenk}
          onGrupRenkDegistir={setSeciliGrupRenk}
          sagPanelOpen={state.panelModu !== null}
          onResimEkle={handleResimEkle}
          visibility={state.visibility}
          onVisibilityDegistir={state.setVisibility}
        />
      )}
    </div>
  );
}
