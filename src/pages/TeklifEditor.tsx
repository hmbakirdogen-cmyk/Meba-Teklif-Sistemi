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
import type React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App } from 'antd';
import { useKullanici } from '../context/useKullanici';
import { useFirma } from '../context/useFirma';
import { useColors } from '../hooks/useColors';
import { useBelgeState, type PanelModu } from '../hooks/useBelgeState';
import { buildPdf, buildEmailPdf, buildPrintImages } from '../services/pdfService';
import { teklifService } from '../services/teklifService';
import {
  teklifDisaAktar,
  teklifDisaAktarVeGerekirseYerelTaslakAc,
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
  const { firmalar } = useFirma();
  const C = useColors();

  const sablonRef = useRef<HTMLDivElement>(null);
  const kompaktHeaderRef = useRef<HTMLDivElement>(null);
  const uretiliyorRef = useRef(false);
  const printImagesRef = useRef<string[]>([]);

  // Inline düzenleme state — popover yerine
  const [editingAlan, setEditingAlan] = useState<EditingAlan>(null);

  // Kilitli / Düzenleme modu — global tek state, URL'ye göre başlangıç:
  //   • Yeni teklif (id yok)   → editMode = true  (kilitli=false) → direkt yazmaya başla
  //   • Mevcut teklif (id var) → editMode = false (kilitli=true)  → güvenli görüntüleme
  const [modeKilitli, setModeKilitli] = useState<boolean>(() => Boolean(id));

  // Serbest çizim modu
  const [cizimModu, setCizimModu] = useState(false);
  const cizimCanvasRef = useRef<HTMLCanvasElement>(null);
  const cizimRenk = useRef('#E53935');
  const cizimKalinlik = useRef(3);
  const cizimCiziyor = useRef(false);
  const cizimSonKonum = useRef<{ x: number; y: number } | null>(null);

  const state = useBelgeState(
    id,
    aktifKullanici ? { id: aktifKullanici.id, adSoyad: aktifKullanici.adSoyad, rol: aktifKullanici.rol, unvan: aktifKullanici.unvan } : null,
  );

  // Başkasina ait teklif: personel (non-admin) başkasinin teklifini düzeleyemez
  const sahipDegil = useMemo(() => {
    if (!id) return false; // yeni teklif — her zaman kendi
    const rol = aktifKullanici?.rol;
    if (rol === 'admin' || rol === 'super_admin' || rol === 'firma_admin') return false;
    const sahipId = state.teklifSahibiId; // mevcut teklifin orijinal sahibi
    if (!sahipId) return false; // sahip belirsiz (çok eski kayıt) — izin ver
    return sahipId !== aktifKullanici?.id;
  }, [id, aktifKullanici, state.teklifSahibiId]);

  const stateCari = state.cari;
  const stateSatirSayisi = state.satirlar.length;
  const kaydetWithStatus = state.kaydetWithStatus;

  const persistStatusByMode = useCallback(async (kilitli: boolean) => {
    if (!stateCari || stateSatirSayisi === 0) return;
    await kaydetWithStatus(kilitli ? 'kaydedildi' : 'taslak');
  }, [kaydetWithStatus, stateCari, stateSatirSayisi]);

  const handleModeKilitliDegistir = useCallback((v: boolean) => {
    // Sahip olmayan personel kilidi açamaz
    if (!v && sahipDegil) {
      message.warning('Bu teklif başka bir personele ait, düzenleyemezsiniz.');
      return;
    }
    setModeKilitli(v);
    if (v) {
      setEditingAlan(null);
      void persistStatusByMode(true);
    }
  }, [persistStatusByMode, sahipDegil, message]);

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
      notlarGosterilsin: state.notlarGosterilsin,
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
    state.notlarGosterilsin,
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
        message.success(
          sonuc.yerelKayitYolu
            ? `PDF yerel klasore kaydedildi: ${sonuc.yerelKayitYolu}`
            : 'PDF indirildi. Bu ortamda otomatik masaustu kaydi kullanilamadigi icin tarayici indirmesi kullanildi.',
        );
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
          sonuc.yerelKayitYolu
            ? `PDF yerel klasore kaydedildi: ${sonuc.yerelKayitYolu}. E-posta taslağı açıldı; PDF ekini manuel ekleyiniz.`
            : 'PDF indirildi ve e-posta taslağı açıldı. Tarayıcı ortamında PDF eki otomatik eklenemediğinden eki lütfen kendiniz ekleyiniz.',
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
      // Eski tekliflerde firmaId bos kalmis olabilir — fallback "GRUP SIRKETLERI"
      // klasorune dusulmemesi icin aktif kullanicinin firmasi ile doldurulur.
      // Super-admin (firmaId: null) icin backend ctx fallback'i devreye girer.
      const teklifIcinExport = kayitliTeklif.firmaId
        ? kayitliTeklif
        : { ...kayitliTeklif, firmaId: aktifKullanici?.firmaId ?? kayitliTeklif.firmaId };
      // Offline/yedek yol için firmanın PDF klasör adı (server-side ile birebir aynı).
      // Teklifin firmaId'si üzerinden firmalar listesinden alınır → her kullanıcının
      // firmasına özel klasör (MEBA / ELMOS / MESA) açılır, hardcoded değil.
      const teklifFirmasi = firmalar.find((f) => f.id === teklifIcinExport.firmaId);
      const firmaPdfKlasorAdi = teklifFirmasi?.pdfKlasorAdi || undefined;
      const sonuc = hedef === 'email'
        ? await teklifDisaAktarVeGerekirseYerelTaslakAc(blob, teklifIcinExport, hedef, firmaPdfKlasorAdi)
        : await teklifDisaAktar(blob, teklifIcinExport, hedef, firmaPdfKlasorAdi);
      teklifService.teklifCacheGuncelle(sonuc.teklif);
      showExportMessage(sonuc);

      // 3) Durum auto-progression — kullanıcının manuel kararına saygı:
      //    'onaylandı' / 'reddedildi' / 'iptal' (sonuçlanmış) ise otomatik
      //    geçiş tetiklenmez — kapanmış teklifin durumu yanlışlıkla 'hazir' ya
      //    da 'gonderildi'ye dönmesin. Aksi takdirde:
      //      hedef='pdf'   → durum 'taslak' ise 'hazır' yap
      //      hedef='email' → durum 'taslak'/'hazır' ise 'gönderildi' yap (e-posta hazırlandıysa)
      const yumusakDurumlar: Array<typeof state.durum> = ['taslak', 'hazir'];
      const sonuclanmis = state.durum === 'onaylandi' || state.durum === 'reddedildi' || state.durum === 'iptal';
      if (!sonuclanmis) {
        if (hedef === 'pdf' && state.durum === 'taslak') {
          state.setDurum('hazir');
        }
        if (hedef === 'email' && sonuc.epostaHazirlandi && yumusakDurumlar.includes(state.durum)) {
          state.setDurum('gonderildi');
          await state.kaydetWithStatus('gonderildi');
        } else if (hedef === 'email' && sonuc.epostaHazirlandi) {
          await state.kaydetWithStatus('gonderildi');
        }
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
  }, [teklifObj, state, message, showExportMessage, aktifKullanici?.firmaId, firmalar]);

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

  // ── REVIZE GUARD ─────────────────────────────────────────────────────────
  // Sonuçlanmış / gönderilmiş teklif düzenlenmek istendiğinde orijinal kayıt
  // korunur, yeni bir revize teklif oluşturulup oraya yönlendirilir.
  const { modal } = App.useApp();
  const KAPALI_DURUMLAR = ['gonderildi', 'onaylandi', 'reddedildi', 'iptal'] as const;
  const kilitli = (KAPALI_DURUMLAR as readonly string[]).includes(state.durum);
  const durumEtiket: Record<string, string> = {
    gonderildi: 'gönderildi', onaylandi: 'onaylandı',
    reddedildi: 'reddedildi', iptal: 'iptal edildi',
  };

  const revizeOlusturVeGec = useCallback(() => {
    if (!id) return;
    const k = aktifKullanici;
    const yeni = teklifService.revizeOlustur(
      id,
      k ? { id: k.id, adSoyad: k.adSoyad, rol: k.rol, unvan: k.unvan } : undefined,
    );
    if (!yeni) {
      message.error('Revize oluşturulamadı.');
      return;
    }
    teklifService.teklifKaydet(yeni);
    message.success(`Revize oluşturuldu: ${yeni.teklifNo}`);
    navigate(`/teklif/${yeni.id}`, { replace: true });
  }, [id, aktifKullanici, message, navigate]);

  const revizeOnayAc = useCallback(() => {
    modal.confirm({
      title: 'Yeni revize oluşturulsun mu?',
      content: `Bu teklif ${durumEtiket[state.durum] || state.durum}. Düzenleme için orijinal kayıt korunarak yeni bir revize teklif oluşturulacak. Yeni revize üzerinde editleyip ayrı bir PDF üretebileceksiniz.`,
      okText: 'Evet, revize oluştur',
      cancelText: 'Vazgeç',
      onOk: () => revizeOlusturVeGec(),
    });
  }, [modal, state.durum, revizeOlusturVeGec]);

  // Düzenleme alanına tıklama yakalandığında: kilitli ise onay modalı aç ve
  // tıklamanın iç bileşenlere ulaşmasını engelle.
  const handleKilitliClickCapture = useCallback((e: React.MouseEvent) => {
    if (!kilitli) return;
    e.stopPropagation();
    e.preventDefault();
    revizeOnayAc();
  }, [kilitli, revizeOnayAc]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: C.bgBody,
    }}>
      {/* Toolbar */}
      <BelgeToolbar
        teklifNo={state.teklifNo}
        teklifNoDurumu={state.teklifNoDurumu}
        cariAdi={state.cari ? formatCariAdi(state.cari.firmaAdi) : undefined}
        hasCari={Boolean(state.cari)}
        durum={state.durum}
        status={state.status}
        uretiliyor={state.uretiliyor}
        onGeriDon={handleGeriDon}
        onPdfIndir={handlePdfIndir}
        onEMailGonder={handleEMailGonder}
        onYazdir={handleYazdir}
        onSatirEkle={state.satirEkle}
        onPanelAc={handlePanelAc}
        onDurumDegistir={state.setDurum}
      />

      {/* Revize banner — kapalı durumda (gönderildi/sonuçlanmış) düzenleme
          için kullanıcı yönlendirilir. Belgeye tıklamak da aynı modalı açar. */}
      {kilitli && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 18px',
          background: 'rgba(124,58,237,0.08)',
          borderBottom: '1px solid rgba(124,58,237,0.28)',
          color: '#5b21b6',
          fontSize: 13,
        }}>
          <span style={{ fontSize: 16 }}>⟳</span>
          <span style={{ flex: 1 }}>
            Bu teklif <b>{durumEtiket[state.durum] || state.durum}</b>. Düzenlemek için orijinal kayıt korunur, yeni bir revize teklif oluşturulur.
          </span>
          <button
            type="button"
            onClick={revizeOnayAc}
            style={{
              padding: '6px 14px',
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#ffffff',
              background: '#7c3aed',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#6d28d9'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#7c3aed'; }}
          >
            Yeni Revize Oluştur
          </button>
        </div>
      )}

      {/* Ana alan: Belge + Panel */}
      <div
        onClickCapture={handleKilitliClickCapture}
        style={{
          flex: 1,
          display: 'flex',
          background: '#E0DDD9',
          alignItems: 'flex-start',
        }}
      >
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
              onKdvOraniDegistir={state.setKdvOrani}
              onOdemeVadesiDegistir={state.setOdemeVadesi}
              onSatirGuncelle={state.satirGuncelle}
              onSatiraSetUygula={state.satiraSetUygula}
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

          {/* Serbest Çizim Canvas Overlay */}
          {cizimModu && (
            <SerberstCizimOverlay
              canvasRef={cizimCanvasRef}
              renkRef={cizimRenk}
              kalinlikRef={cizimKalinlik}
              ciziyorRef={cizimCiziyor}
              sonKonumRef={cizimSonKonum}
              onKapat={() => setCizimModu(false)}
            />
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
          notlarGosterilsin={state.notlarGosterilsin}
          onNotlarGosterilsinDegistir={state.setNotlarGosterilsin}
          sagPanelOpen={state.panelModu !== null}
          onResimEkle={handleResimEkle}
          visibility={state.visibility}
          onVisibilityDegistir={state.setVisibility}
          serberstCizimAktif={cizimModu}
          onSerberstCizimToggle={() => setCizimModu((v) => !v)}
        />
      )}
    </div>
  );
}

// ─── Serbest Çizim Overlay ───────────────────────────────────────────────────

interface SerberstCizimOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  renkRef: React.MutableRefObject<string>;
  kalinlikRef: React.MutableRefObject<number>;
  ciziyorRef: React.MutableRefObject<boolean>;
  sonKonumRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onKapat: () => void;
}

const RENKLER = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#000000', '#FFFFFF'];
const KALINLIKLAR = [2, 4, 8, 14];

function SerberstCizimOverlay({
  canvasRef, renkRef, kalinlikRef, ciziyorRef, sonKonumRef, onKapat,
}: SerberstCizimOverlayProps) {
  const [aktifRenk, setAktifRenk] = useState(renkRef.current);
  const [aktifKalinlik, setAktifKalinlik] = useState(kalinlikRef.current);
  const [silgiModu, setSilgiModu] = useState(false);

  // Canvas boyutunu container'a uydur
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = parent.getBoundingClientRect();
      // Mevcut içeriği koru
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      tmp.getContext('2d')?.drawImage(canvas, 0, 0);
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(tmp, 0, 0);
    });
    ro.observe(parent);
    // ilk boyut
    const { width, height } = parent.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    return () => ro.disconnect();
  }, [canvasRef]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const basla = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    ciziyorRef.current = true;
    sonKonumRef.current = getPos(e);
  };

  const ciz = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!ciziyorRef.current || !sonKonumRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(sonKonumRef.current.x, sonKonumRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    if (silgiModu) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = kalinlikRef.current * 4;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = kalinlikRef.current;
      ctx.strokeStyle = renkRef.current;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    sonKonumRef.current = pos;
  };

  const bitir = () => {
    ciziyorRef.current = false;
    sonKonumRef.current = null;
  };

  const temizle = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const renkSec = (r: string) => {
    renkRef.current = r;
    setAktifRenk(r);
    setSilgiModu(false);
  };

  const kalinlikSec = (k: number) => {
    kalinlikRef.current = k;
    setAktifKalinlik(k);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      {/* Çizim canvas — sadece çizim olaylarını yakalar */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'all',
          cursor: silgiModu ? 'cell' : 'crosshair',
          touchAction: 'none',
        }}
        onMouseDown={basla}
        onMouseMove={ciz}
        onMouseUp={bitir}
        onMouseLeave={bitir}
        onTouchStart={basla}
        onTouchMove={ciz}
        onTouchEnd={bitir}
      />

      {/* Araç çubuğu */}
      <div
        style={{
          position: 'fixed',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(20,20,30,0.88)',
          backdropFilter: 'blur(12px)',
          borderRadius: 14,
          padding: '8px 14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.12)',
          pointerEvents: 'all',
          userSelect: 'none',
          zIndex: 51,
        }}
      >
        {/* Renkler */}
        {RENKLER.map((r) => (
          <button
            key={r}
            type="button"
            title={r}
            onClick={() => renkSec(r)}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: r,
              border: aktifRenk === r && !silgiModu ? '2.5px solid #fff' : '2px solid rgba(255,255,255,0.25)',
              cursor: 'pointer',
              padding: 0,
              outline: aktifRenk === r && !silgiModu ? '2px solid rgba(255,255,255,0.5)' : 'none',
              outlineOffset: 1,
              flexShrink: 0,
              boxShadow: r === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.3)' : undefined,
            }}
          />
        ))}

        {/* Ayırıcı */}
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />

        {/* Kalınlıklar */}
        {KALINLIKLAR.map((k) => (
          <button
            key={k}
            type="button"
            title={`${k}px`}
            onClick={() => kalinlikSec(k)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: aktifKalinlik === k && !silgiModu ? 'rgba(255,255,255,0.18)' : 'transparent',
              border: aktifKalinlik === k && !silgiModu ? '1px solid rgba(255,255,255,0.40)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <div style={{
              width: Math.min(k * 2.5, 20),
              height: Math.min(k * 2.5, 20),
              borderRadius: '50%',
              background: aktifRenk,
              opacity: silgiModu ? 0.3 : 1,
            }} />
          </button>
        ))}

        {/* Ayırıcı */}
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />

        {/* Silgi */}
        <button
          type="button"
          title="Silgi"
          onClick={() => setSilgiModu((v) => !v)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: silgiModu ? 'rgba(255,255,255,0.20)' : 'transparent',
            border: silgiModu ? '1px solid rgba(255,255,255,0.45)' : '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 15,
          }}
        >
          ✏️
        </button>

        {/* Temizle */}
        <button
          type="button"
          title="Tümünü Temizle"
          onClick={temizle}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid rgba(255,80,80,0.40)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff6666',
            fontSize: 15,
          }}
        >
          🗑
        </button>

        {/* Ayırıcı */}
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />

        {/* Kapat */}
        <button
          type="button"
          title="Çizimi Kapat"
          onClick={onKapat}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.70)',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
