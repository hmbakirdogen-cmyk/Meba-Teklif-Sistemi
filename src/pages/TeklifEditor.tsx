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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { App } from 'antd';
import { useKullanici } from '../context/useKullanici';
import { useFirma } from '../context/useFirma';
import { useColors } from '../hooks/useColors';
import { useBelgeState, type PanelModu } from '../hooks/useBelgeState';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { buildPdf, buildEmailPdf, buildPrintImages, PdfPageCountMismatchError } from '../services/pdfService';
import { teklifService } from '../services/teklifService';
import { api } from '../services/apiClient';
import {
  teklifDisaAktarVeGerekirseYerelTaslakAc,
  type TeklifDisaAktarimHedefi,
  type TeklifDisaAktarimSonucu,
  TeklifDisaAktarimHatasi,
} from '../services/pdfKayitService';
import { formatCariAdi, formatCurrency } from '../utils/formatters';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { isYonetici } from '../utils/yetkiUtils';
import { DOCUMENT_PAGE, mmToPx } from '../templates/teklifDocumentShared';
import CanliA4Belge from '../components/CanliA4Belge';
import SagPanel from '../components/SagPanel';
import BelgeToolbar from '../components/BelgeToolbar';
import { useSayfaRehberi } from '../hooks/useSayfaRehberi';
import { TEKLIF_EDITOR_TIPLERI } from './TeklifEditor.tips';
import type { TipDef } from '../components/tipler/tipTipleri';
import KumandaPaneli from '../components/KumandaPaneli';
import CariSecimi from '../components/CariSecimi';
import IlgiliKisiSecimModal from '../components/IlgiliKisiSecimModal';
import SonucModal from '../components/SonucModal';
import MailComposeModal, { type MailComposeContext } from '../components/MailComposeModal';
import SelfServeSmtpModal from '../components/SelfServeSmtpModal';
import type { Teklif, TeklifDurum } from '../types';
import type { EditingAlan } from '../components/PaginatedBelgeInlineEditor';
import { usePDFKayit } from '../hooks/usePDFKayit';

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

// Sonuçlanmış/gönderilmiş teklif düzenlemesi için revize zorunlu kapanan durumlar.
const KAPALI_DURUMLAR = ['gonderildi', 'onaylandi', 'kismi_onaylandi', 'reddedildi', 'iptal'] as const;

// Modal/uyarı metinlerinde kullanılan Türkçe etiketler — kararlı referans için
// module-level (her render'da yeni Record üretmemek için).
const DURUM_ETIKET: Record<string, string> = {
  gonderildi: 'gönderildi', onaylandi: 'onaylandı',
  reddedildi: 'reddedildi', iptal: 'iptal edildi',
};

export default function TeklifEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { aktifKullanici, refreshKullanici } = useKullanici();
  const { firmalar, aktifFirma } = useFirma();
  const pdfKayit = usePDFKayit();
  // PDF kayıt klasörü erişim durumu — rozet 3 durumu (ok/izinKayip/klasorYok)
  // göstersin diye state'te tut. Mount + pencere yeniden aktif olduğunda
  // (visibilitychange) güncellenir — kullanıcı başka pencerede izin değişimi
  // yaparsa veya tarayıcıyı yeniden açarsa rozet doğru duruma düşer.
  const [pdfKayitDurum, setPdfKayitDurum] = useState<'ok' | 'izinKayip' | 'klasorYok' | 'desteklenmiyor'>('klasorYok');

  // ── Yumusak ipucu sistemi (per-user, sayac + cooldown) ──────────────
  // Tavsiyeler ara ara farkli zamanlarda gorulur — kullaniciyi sikmamak icin:
  //  • Per-user counter (5 gosterim sonra otomatik gizlenir)
  //  • Cooldown (4 saat icinde ayni tip tekrar gosterilmez)
  //  • Mutex (ayni anda en fazla 1 tip gorulur — oncelik sirasi:
  //     baslangic > notlar popover > satir islemleri > akilli hucreler)
  //
  // DEBUG MODE: ?gostertavsiye=1 query param veya localStorage debug flag
  // ile counter + cooldown BYPASS olur → tavsiyeler mutlaka gorulur (test).
  const debugTavsiye = (() => {
    if (typeof window === 'undefined') return false;
    const fromUrl = new URLSearchParams(window.location.search).get('gostertavsiye') === '1';
    const fromLs = window.localStorage.getItem('meba_debug_tavsiye') === '1';
    return fromUrl || fromLs;
  })();
  const TAVSIYE_MAX = debugTavsiye ? 99999 : 5;
  const TIP_COOLDOWN_MS = debugTavsiye ? 0 : 4 * 60 * 60 * 1000; // debug=0, normal 4 saat
  const tipCooldownGecmis = (k: string): boolean => {
    if (debugTavsiye) return true;
    if (typeof window === 'undefined') return true;
    const last = Number.parseInt(window.localStorage.getItem(`${k}_lastShown`) || '0', 10) || 0;
    return Date.now() - last > TIP_COOLDOWN_MS;
  };
  const tipLastShownYaz = (k: string): void => {
    if (debugTavsiye) return; // debug mode'da yazma → her zaman gorulebilir
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`${k}_lastShown`, String(Date.now()));
  };
  const tavsiyeKey = `meba_teklif_baslangic_tavsiyesi_${aktifKullanici?.id || 'anon'}`;
  const notlarPopoverKey = `meba_notlar_popover_${aktifKullanici?.id || 'anon'}`;
  const satirIslemleriKey = `meba_satir_islemleri_tavsiyesi_${aktifKullanici?.id || 'anon'}`;
  const akilliHucrelerKey = `meba_akilli_hucreler_tavsiyesi_${aktifKullanici?.id || 'anon'}`;
  const [tavsiyeKapatildi, setTavsiyeKapatildi] = useState(false);
  const [tavsiyeBumped, setTavsiyeBumped] = useState(false);
  const [notlarPopoverKapatildi, setNotlarPopoverKapatildi] = useState(false);
  const [notlarPopoverBumped, setNotlarPopoverBumped] = useState(false);
  const [satirIslemleriKapatildi, setSatirIslemleriKapatildi] = useState(false);
  const [satirIslemleriBumped, setSatirIslemleriBumped] = useState(false);
  const [akilliHucrelerKapatildi, setAkilliHucrelerKapatildi] = useState(false);
  const [akilliHucrelerBumped, setAkilliHucrelerBumped] = useState(false);

  // ── Rehber sistemi (useSayfaRehberi hook'u) ──────────────────────
  // State + 3 useEffect + 3 callback + render hepsi hook icine kapsullenmistir.
  // Burada SADECE yanEtki (panel-notlar acma/kapama) handler'i veriyoruz; geri
  // kalan davranis hook tarafindan yonetilir. Sag-alttaki 🎓 Rehberler butonu da
  // hook tarafindan render edilir.
  // ileri kullanim icin TipDef referansi:
  void ({} as TipDef);
  useEffect(() => {
    let iptal = false;
    const sorgula = async () => {
      const d = await pdfKayit.erisimDurumu();
      if (!iptal) setPdfKayitDurum(d);
    };
    sorgula();
    const onVis = () => { if (document.visibilityState === 'visible') sorgula(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      iptal = true;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [pdfKayit]);

  // Rehber sistemi cagrisi state tanimlandiktan SONRA — bkz. useSayfaRehberi(...)
  const C = useColors();

  // Teklif degisince tavsiye flag'lerini sifirla — her yeni teklif acılışında
  // counter limitine kadar gosterilir.
  useEffect(() => {
    setTavsiyeKapatildi(false);
    setTavsiyeBumped(false);
    setNotlarPopoverKapatildi(false);
    setNotlarPopoverBumped(false);
    setSatirIslemleriKapatildi(false);
    setSatirIslemleriBumped(false);
    setAkilliHucrelerKapatildi(false);
    setAkilliHucrelerBumped(false);
  }, [id]);

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
  const [ilgiliKisiModalAcik, setIlgiliKisiModalAcik] = useState(false);
  // Sonuç (onaylandi/reddedildi/iptal) seçimi için modal —
  // dropdown'dan sonuçlanmış bir duruma geçilirse modal açılır; satır seçimi
  // (onay) veya sebep (red/iptal) toplanır, ardından meta'sı yazılır.
  // NOT: 'kismi_onaylandi' için modal YERINE A4 üzerinde inline seçim
  // (kismiSecimAktif state'i) kullanılır.
  const [sonucModalDurum, setSonucModalDurum] = useState<TeklifDurum | null>(null);
  // Kısmi onay seçim modu — A4 sayfasında inline iptal kalemi işaretleme:
  // user clicks rows on the live A4, banner üstte. iptalSet local preview state;
  // "Tamamla" tıklanınca satır.onayDurumu + durum + totals patch'lenir.
  const [kismiSecimAktif, setKismiSecimAktif] = useState(false);
  const [kismiIptalSet, setKismiIptalSet] = useState<Set<string>>(new Set());
  // In-app Outlook benzeri mail compose modal'ı. PDF üretildikten + yerel
  // kayıt yapıldıktan sonra açılır; modal kendi içinde backend'i çağırıp
  // SMTP send + IMAP APPEND yapar. Mailto akışı tamamen devre dışı.
  const [mailCtx, setMailCtx] = useState<MailComposeContext | null>(null);
  // Self-serve SMTP kurulum modal'ı. Kullanıcı ilk teklif gönderiminde SMTP
  // tanımlı değilse otomatik açılır. pendingMailCtx, kurulum bitince hangi
  // compose context'ine geçileceğini hatırlar.
  const [smtpSetupOpen, setSmtpSetupOpen] = useState(false);
  const [pendingMailCtx, setPendingMailCtx] = useState<MailComposeContext | null>(null);
  // ── PDF Rehberi One-Shot Auto-Trigger (Faz 2) ───────────────────────
  // NE: Kullanıcı toolbar'daki "PDF" / "PDF + Mail" butonuna ilk kez basınca,
  //     editör üstünde rehber sequence (TipSpotlight) otomatik olarak başlar.
  // NEDEN: Mehmet Bey direktifi — yeni kullanıcı PDF üretirken neyin nereden
  //        akacağını ilk seferinde görsün; sonraki PDF üretimlerinde rehber
  //        kendi başına açılmaz, sağ-alttaki 🎓 butonundan istediğinde
  //        tekrar tetikler. "Onboarding ipucu", "sürekli pop-up" değil.
  // NASIL: 1) handlePdfIndir / handleEMailGonder çağrılır çağrılmaz
  //           setPdfRehberTetik(true) çalışır (PDF üretim akışı engellenmez).
  //        2) useSayfaRehberi hook'una otomatikAcKey + otomatikAcTetik
  //           prop'ları geçilir. Hook bir useEffect ile bu trigger=true
  //           ANINDA localStorage[`meba_pdf_rehber_${userId}`] kontrol eder.
  //        3) Önceden '1' ise: hiçbir şey yapmaz (kullanıcı zaten gördü).
  //           Henüz '1' değilse: anahtarı '1' yazıp 800ms sonra baslat()
  //           çağırır → ilk tip görünür hale gelir, kullanıcı "İleri/Atla"
  //           ile sequence'i bitirir veya kapatır.
  // TEKRAR AKTİF ETME: localStorage'dan ilgili key silinirse next mount'ta
  //                    bir kez daha açılır. Manuel başlatma her zaman 🎓 ile.
  const [pdfRehberTetik, setPdfRehberTetik] = useState(false);
  const cizimCanvasRef = useRef<HTMLCanvasElement>(null);
  const cizimRenk = useRef('#E53935');
  const cizimKalinlik = useRef(3);
  const cizimCiziyor = useRef(false);
  const cizimSonKonum = useRef<{ x: number; y: number } | null>(null);

  const state = useBelgeState(
    id,
    aktifKullanici ? { id: aktifKullanici.id, adSoyad: aktifKullanici.adSoyad, rol: aktifKullanici.rol, unvan: aktifKullanici.unvan } : null,
  );

  // ── Undo/Redo ────────────────────────────────────────────────────────
  // Faz 2: state setter'ları sarmalayarak satır aksiyonlarını + popup
  // commit'lerini stack'e iter. CellEditPopup ve cari/ayar Popover'ları
  // pushUndo prop'unu PaginatedBelgeInlineEditor zincirinden alır.
  const undoRedo = useUndoRedo();
  const { push: pushUndo } = undoRedo;
  const getSnapshot = state.getSnapshot;
  const restoreSnapshot = state.restoreSnapshot;

  const wrappedSatirEkle = useCallback(() => {
    pushUndo(getSnapshot());
    state.satirEkle();
  }, [pushUndo, getSnapshot, state]);

  const wrappedSatirArayaEkle = useCallback((afterIndex: number) => {
    pushUndo(getSnapshot());
    state.satirArayaEkle(afterIndex);
  }, [pushUndo, getSnapshot, state]);

  const wrappedSatirSil = useCallback((satirId: string) => {
    pushUndo(getSnapshot());
    state.satirSil(satirId);
  }, [pushUndo, getSnapshot, state]);

  const wrappedSatiraSetUygula = useCallback((satirId: string, setId: string) => {
    pushUndo(getSnapshot());
    state.satiraSetUygula(satirId, setId);
  }, [pushUndo, getSnapshot, state]);

  const handleUndo = useCallback(() => {
    if (modeKilitli) return;
    const snap = undoRedo.undo(getSnapshot());
    if (snap) {
      restoreSnapshot(snap);
      setEditingAlan(null);
    }
  }, [modeKilitli, undoRedo, getSnapshot, restoreSnapshot]);

  const handleRedo = useCallback(() => {
    if (modeKilitli) return;
    const snap = undoRedo.redo(getSnapshot());
    if (snap) {
      restoreSnapshot(snap);
      setEditingAlan(null);
    }
  }, [modeKilitli, undoRedo, getSnapshot, restoreSnapshot]);

  // Global Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y dinleyicisi.
  // Input/textarea içindeyken native browser undo öncelikli (karakter bazlı).
  // Bu sayede edit sırasında native undo, edit commit sonrası bizim stack çalışır.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modeKilitli) return;
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        if (inField) return;
        e.preventDefault();
        handleUndo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        if (inField) return;
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modeKilitli, handleUndo, handleRedo]);

  // Başkasına ait teklif: personel (yönetici olmayan) başkasının teklifini düzenleyemez.
  const sahipDegil = useMemo(() => {
    if (!id) return false; // yeni teklif — her zaman kendi
    if (isYonetici(aktifKullanici?.rol)) return false;
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

  // handleModeKilitliDegistir aşağıda revizeOnayAc'tan sonra tanımlandı —
  // sonuçlanmış teklif düzenlenmek istendiğinde revize akışına yönlendirir.

  // Yeni teklif: cari seçildikten sonra ilk satır yoksa ekle ve müşteri alanını aç (muhatap odak)
  const yeniTeklif = !id;
  const cari = state.cari;
  const satirlar = state.satirlar;
  const satirEkle = state.satirEkle;
  const muhatapGosterildiRef = useRef(false);
  // Yeni teklif intro akışı yalnızca BİR KEZ ilk satırı otomatik açar.
  // Aksi halde editingAlan→null her olduğunda effect yeniden tetiklenir ve
  // kullanıcı boş alana tıkladığında popup en son hücrede tekrar açılır.
  const ilkSatirOtomatikAcildiRef = useRef(false);
  // Müşteri popover zinciri (muhatap→telefon→eposta) için bir önceki
  // editingAlan değerini izle — zincir bitiminde satıra geçişi tetikler,
  // zincir ortasında bekler.
  const prevEditingAlanRef = useRef<EditingAlan>(null);
  useEffect(() => {
    if (yeniTeklif && cari && satirlar.length === 0) {
      satirEkle();
      // Cari seçildikten sonra muhatap popup'ı açılsın
      muhatapGosterildiRef.current = true;
      setEditingAlan('musteri-muhatap');
    }
  }, [yeniTeklif, cari, satirlar.length, satirEkle]);

  // Yeni eklenen satırı otomatik düzenleme moduna al — sadece müşteri alanı kapatıldıktan sonra
  useEffect(() => {
    if (
      yeniTeklif &&
      satirlar.length === 1 &&
      editingAlan === null &&
      cari &&
      !muhatapGosterildiRef.current &&
      !ilkSatirOtomatikAcildiRef.current
    ) {
      ilkSatirOtomatikAcildiRef.current = true;
      setEditingAlan(`satir-${satirlar[0].id}`);
    }
  }, [yeniTeklif, satirlar, cari, editingAlan]);

  // Muhatap paneli kapatılınca (editingAlan null'a döndü) satıra geç
  // — AMA muhatap→tel→eposta zinciri ortasında değilsek. Sadece müşteri
  // alanlarından (musteri-*) doğrudan null'a düşüldüğünde tetikleniyor:
  //   muhatap → null   ✓
  //   muhatap → tel    × (effect tetiklenmez, çünkü null değil)
  //   tel → eposta     ×
  //   eposta → null    ✓ (zincir tamamlandı)
  useEffect(() => {
    const prev = prevEditingAlanRef.current;
    prevEditingAlanRef.current = editingAlan;

    if (
      muhatapGosterildiRef.current &&
      editingAlan === null &&
      satirlar.length >= 1
    ) {
      const musteriAlanlari: EditingAlan[] = [
        'musteri-muhatap', 'musteri-telefon', 'musteri-eposta', 'musteri-sehir',
      ];
      if (prev && musteriAlanlari.includes(prev)) {
        muhatapGosterildiRef.current = false;
        ilkSatirOtomatikAcildiRef.current = true;
        setEditingAlan(`satir-${satirlar[0].id}`);
      }
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
      kargoNotuMetni: state.kargoNotuMetni,
      kargoNotuGizli: state.kargoNotuGizli,
      olusturmaTarihi: state.olusturmaTarihi,
      guncellemeTarihi: new Date().toISOString(),
      hazirlayanKullaniciId: state.hazirlayanKullaniciId,
      hazirlayanAdSoyad: state.hazirlayanAdSoyad,
      hazirlayanRol: state.hazirlayanRol,
      hazirlayanUnvan: state.hazirlayanUnvan,
      gecerlilikSuresi: state.gecerlilikSuresi,
      contactName: state.contactName.trim() || undefined,
      contactTitle: (state.contactName.trim() || state.contactTitle === 'YETKILI') ? state.contactTitle : undefined,
      gorseller: state.gorseller.length > 0 ? state.gorseller : undefined,
      // Multi-tenant kritik: teklifin gerçek firmasını PDF/e-posta render'ına
      // aktar. Aksi halde useTeklifFirma silent fallback ile kullanıcının
      // aktif firmasını kullanır → yanlış logo (MEBA fallback bug'ı).
      firmaId: state.firmaId,
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
    state.firmaId,
    state.genelToplam,
    state.kdvOrani,
    state.iskontoOrani,
    state.odemeVadesi,
    state.notlar,
    state.notlarGosterilsin,
    state.kargoNotuMetni,
    state.kargoNotuGizli,
    state.olusturmaTarihi,
    state.hazirlayanKullaniciId,
    state.hazirlayanAdSoyad,
    state.hazirlayanRol,
    state.hazirlayanUnvan,
    state.contactName,
    state.contactTitle,
    state.gecerlilikSuresi,
    state.gorseller,
  ]);

  // Kismi onay secim modunda satir reddi/anlik onay secimi belgede hemen
  // toplamlara yansisin; "Tamamla" olmadan sadece preview olarak hesaplanir.
  const canliTeklifObj: Teklif | null = useMemo(() => {
    if (!teklifObj) return null;
    if (!kismiSecimAktif) return teklifObj;

    const previewSatirlar = teklifObj.satirlar.map((s) => ({
      ...s,
      onayDurumu: kismiIptalSet.has(s.id) ? ('reddedildi' as const) : ('onaylandi' as const),
    }));

    const toplamlar = hesaplamaMotoru.genelToplamHesapla(
      previewSatirlar,
      teklifObj.kdvOrani,
      teklifObj.iskontoOrani,
      teklifObj.paraBirimi,
    );

    return {
      ...teklifObj,
      satirlar: previewSatirlar,
      araToplam: toplamlar.araToplam,
      toplamIndirim: toplamlar.toplamIndirim,
      toplamVergi: toplamlar.kdvTutar,
      genelToplam: toplamlar.genelToplam,
    };
  }, [teklifObj, kismiSecimAktif, kismiIptalSet]);

  // Kumanda paneli sadece eyleme acik oldugunda gorunsun.
  // - Baska personel, baskasinin teklifini izlerken panel tamamen gizlenir.
  // - Kismi onay secim modunda panel dikkat dagitmasin.
  // - Sonuclanmis durumlar (onaylandi/kismi_onaylandi/reddedildi/iptal) kilitli → panel gerek yok.
  //   NOT: Burada `modeKilitli` (read-only toggle) DEGIL `kilitli` (durum bazli)
  //   kullanilir. Aksi halde kullanici kilit ikonuna basinca panel kaybolur ve
  //   geri acmanin yolu kalmaz — panel kendi icindeki kilit toggle ile acilir.
  const kilitliDurum = (KAPALI_DURUMLAR as readonly string[]).includes(state.durum);
  const kumandaPaneliGoster = !!teklifObj && !sahipDegil && !kismiSecimAktif && !kilitliDurum;

  // ── Aksiyonlar ──
  // Manuel "Kaydet" yok; useBelgeState içindeki auto-save effect tüm değişimleri
  // 600ms debounce ile sessizce taslak olarak persist eder.

  const showExportMessage = useCallback((sonuc: TeklifDisaAktarimSonucu, opts?: { yerelKayitYapildi?: boolean }) => {
    // Kullanıcı "Farklı Kaydet" penceresinde iptal etti → sakin info mesajı.
    if (sonuc.yerelKayitIptal) {
      message.info('Kaydetme iptal edildi. PDF oluşturuldu ancak diske kaydedilmedi.');
      return;
    }

    // Kullanıcı kalıcı PDF kayıt klasörü seçtiyse → seçili konum mesajı.
    const yerelKayitYapildi = !!opts?.yerelKayitYapildi;

    if (sonuc.hedef === 'pdf') {
      if (yerelKayitYapildi) {
        message.success(
          sonuc.yerelKayitYolu
            ? `PDF seçili kayıt konumuna kaydedildi: ${sonuc.yerelKayitYolu}`
            : 'PDF seçili kayıt konumuna kaydedildi.',
        );
        return;
      }
      message.success(
        sonuc.yerelKayitYolu
          ? `PDF İndirilenler klasörüne kaydedildi: ${sonuc.yerelKayitYolu}. İsterseniz profilinizden PDF kayıt konumu seçebilirsiniz.`
          : 'PDF indirildi. İsterseniz profilinizden PDF kayıt konumu seçebilirsiniz.',
      );
      return;
    }

    if (sonuc.epostaHazirlandi && sonuc.epostaTaslakYontemi === 'resend') {
      message.success(
        sonuc.aliciEposta
          ? `E-posta ${sonuc.aliciEposta} adresine PDF ekiyle başarıyla gönderildi.`
          : 'E-posta PDF ekiyle başarıyla gönderildi.',
      );
      return;
    }

    if (sonuc.epostaHazirlandi && sonuc.epostaTaslakYontemi === 'mailto') {
      if (yerelKayitYapildi) {
        message.success('PDF seçili kayıt konumuna kaydedildi. Mailto taslağı açıldı; PDF ekini manuel ekleyiniz.');
        return;
      }
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
    if (!teklifObj || uretiliyorRef.current) return;

    if (!state.cari) {
      message.warning('Lütfen önce bir müşteri seçin.');
      return;
    }

    if (state.satirlar.length === 0) {
      message.warning('PDF oluşturmak için en az bir ürün satırı ekleyin.');
      return;
    }

    if (!sablonRef.current) {
      message.error('Canlı belge görünümü hazır değil. Lütfen kısa süre sonra tekrar deneyin.');
      return;
    }

    // ── ERKEN KLASÖR ERİŞİM KONTROLÜ ──────────────────────────────────
    // Klasör seçili ama browser izni 'prompt'/'denied' durumuna düşmüşse,
    // sessizce indirme klasörüne düşmeyi önlüyoruz — kullanıcı buton
    // davranışının "neden değiştiğini" görür ve bilinçli karar verir.
    if (pdfKayit.supported && pdfKayit.hasKlasor) {
      const erisim = await pdfKayit.erisimDurumu();
      if (erisim === 'izinKayip') {
        const yenile = await new Promise<boolean>((resolve) => {
          modal.confirm({
            title: 'Klasör erişimi yenilenmeli',
            content: `Önceden seçtiğiniz "${pdfKayit.klasorAdi}" klasörü için tarayıcı izin yenilemenizi istiyor. Devam etmek için ne yapalım?`,
            okText: 'İzin Yenile',
            cancelText: 'İndirme klasörüne kaydet',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        if (yenile) {
          const r = await pdfKayit.klasorSec();
          if (!r.ok) {
            // İptal veya hata → kullanıcı zaten süreç dışı, çık.
            if (!r.iptal && r.error) message.warning(r.error);
            return;
          }
        }
        // 'İndirme klasörüne' seçilmişse: mevcut akış zaten erişim yoksa
        // sessiz olarak indirme klasörüne düşer; kullanıcı bilinçli onayladı.
      }
    }

    // 1) State'i önce "kaydedildi" olarak persist et. Canonical PDF kaynağı:
    //    editördeki CanliA4Belge'nin offscreen paged DOM'u (sablonRef).
    //    Bu DOM, /print route ile aynı TeklifPagedDocument'i kullanır;
    //    `data-pdf-render-ready` + `data-expected-page-count` + `data-pdf-page`
    //    marker'ları ile pdfService'in page-count guard'ı zaten korur.
    uretiliyorRef.current = true;
    state.setUretiliyor(true);
    state.setPdfHazir(false);
    state.setPdfBlob(null);
    printImagesRef.current = [];

    try {
      const kaydedildi = await state.kaydetWithStatus('kaydedildi');
      if (!kaydedildi) {
        message.error('Teklif kaydedilemedi. PDF oluşturma işlemi durduruldu.');
        return;
      }

      const kayitliTeklif = teklifService.teklifGetir(state.teklifId) ?? teklifObj;
      // Eski tekliflerde firmaId boş kalmış olabilir — fallback "GRUP ŞİRKETLERİ"
      // klasörüne düşülmemesi için aktif kullanıcının firması ile doldurulur.
      // Super-admin (firmaId: null) icin backend ctx fallback'i devreye girer.
      const teklifIcinExport = kayitliTeklif.firmaId
        ? kayitliTeklif
        : { ...kayitliTeklif, firmaId: aktifKullanici?.firmaId ?? kayitliTeklif.firmaId };
      await api.teklifler.upsert(teklifIcinExport);

      // Render kaynağı: editör içindeki canlı paged DOM. Aynı pages dizisi,
      // aynı template, aynı pagination → PRINT = PDF = ARCHIVE.
      await waitForNextPaint();
      const { pdf, pageImages } = hedef === 'email'
        ? await buildEmailPdf(sablonRef.current!)
        : await buildPdf(sablonRef.current!);
      const blob: Blob = pdf.output('blob');
      printImagesRef.current = pageImages;
      state.setPdfBlob(blob);
      state.setPdfHazir(true);

      // R2 arşiv — background, kullanıcıyı bloklamaz
      void (async () => {
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const r = reader.result as string;
              resolve(r.includes(',') ? r.split(',')[1] : r);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const cariStem = (state.cari?.firmaAdi || 'TEKLIF')
            .toLocaleUpperCase('tr-TR')
            .replace(/[<>:"/\\|?*]/g, ' ')
            .replace(/\s+/g, '_')
            .trim()
            .slice(0, 40);
          const dosyaAdi = `${cariStem}_${state.teklifNo || teklifIcinExport.id}.pdf`;
          const r = await api.teklifler.pdfYukle(teklifIcinExport.id, base64, dosyaAdi);
          if (r.ok) teklifService.teklifCacheGuncelle(r.teklif);
        } catch (e) {
          console.warn('[TeklifEditor] R2 PDF arşiv hatası:', e);
        }
      })();

      // PDF foreground açma — hedef='pdf' için. Klasöre yazım başarılı olsa
      // bile kullanıcı dosyayı anında görmek istiyor. window.open user gesture
      // chain içinde tetikleniyor; pop-up engellenirse console.warn ile geçer.
      if (hedef === 'pdf') {
        try {
          const url = URL.createObjectURL(blob);
          const win = window.open(url, '_blank');
          if (win) {
            try { win.focus(); } catch { /* ignore */ }
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
          } else {
            URL.revokeObjectURL(url);
            console.warn('[TeklifEditor] window.open null döndü — pop-up engellenmiş olabilir.');
          }
        } catch (e) {
          console.warn('[TeklifEditor] PDF foreground açma hatası:', e);
        }
      }

      // Offline/yedek yol için firmanın PDF klasör adı (server-side ile birebir aynı).
      // Teklifin firmaId'si üzerinden firmalar listesinden alınır → her kullanıcının
      // firmasına özel klasör (MEBA / ELMOS / MESA) açılır, hardcoded değil.
      const teklifFirmasi = firmalar.find((f) => f.id === teklifIcinExport.firmaId);
      const firmaPdfKlasorAdi = teklifFirmasi?.pdfKlasorAdi || undefined;

      // ── Kullanıcının seçtiği kalıcı PDF kayıt klasörüne sessiz yazım ───
      // Hook destekli + klasör seçili + kullanıcı bilgisi mevcut ise PDF
      // doğrudan oraya yazılır. picker AÇILMAZ. Başarı durumunda export'a
      // bilgi geçilir → showSaveFilePicker / browser download bypass edilir.
      let yerelKayitYapildi: { saved: boolean; path?: string } | undefined;
      if (pdfKayit.supported && pdfKayit.hasKlasor && state.cari) {
        console.info('[TeklifEditor] kaydetPDF çağrılıyor', {
          teklifNo: state.teklifNo,
          cariFirmaAdi: state.cari.firmaAdi,
          firmaPdfKlasorAdi,
        });
        const ksonuc = await pdfKayit.kaydetPDF(blob, state.teklifNo, state.cari.firmaAdi, firmaPdfKlasorAdi);
        console.info('[TeklifEditor] kaydetPDF sonuç:', ksonuc);
        if (ksonuc.ok && ksonuc.path) {
          yerelKayitYapildi = { saved: true, path: ksonuc.path };
          // Foreground açma artık yukarıda her senaryoda tetikleniyor.
        } else if (ksonuc.klasorYok) {
          // İzin/handle kaybı — UI'da klasor "seçilmedi"ye düşer; kullanıcı
          // profilden tekrar seçebilir. Bu PDF için download fallback'e geç.
          message.info('PDF kayıt klasörüne erişilemedi, indirme klasörüne kaydedildi. Profilinizden klasörü tekrar seçebilirsiniz.', 6);
        } else if (ksonuc.error) {
          message.warning(`PDF kayıt klasörüne yazılamadı: ${ksonuc.error}`, 6);
        }
      }

      // PDF için her zaman yerel kayıt + arşiv mesajı; email için modal açılır,
      // gönderim sonrası status auto-progression handleMailSent içinde olur.
      if (hedef === 'pdf') {
        const sonuc = await teklifDisaAktarVeGerekirseYerelTaslakAc(
          blob,
          teklifIcinExport,
          'pdf',
          firmaPdfKlasorAdi,
          teklifFirmasi,
          { yerelKayitYapildi },
        );
        teklifService.teklifCacheGuncelle(sonuc.teklif);
        showExportMessage(sonuc, { yerelKayitYapildi: !!yerelKayitYapildi });
        const sonuclanmis =
          state.durum === 'onaylandi' ||
          state.durum === 'kismi_onaylandi' ||
          state.durum === 'reddedildi' ||
          state.durum === 'iptal';
        if (!sonuclanmis && state.durum === 'taslak') {
          state.setDurum('hazir');
        }
      } else {
        // hedef === 'email' — uygulama içi compose modal'ı aç. Kullanıcı modal'da
        // alıcı/konu/gövdeyi gözden geçirip "Gönder"e basınca SMTP send + IMAP
        // APPEND backend'de çalışır. Mailto açılmaz; Outlook desktop tetiklenmez.
        const cariStem = (state.cari?.firmaAdi || 'TEKLIF')
          .toLocaleUpperCase('tr-TR')
          .replace(/[<>:"/\\|?*]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .slice(0, 2)
          .join(' ');
        const teklifNoSeg = (state.teklifNo || '').trim();
        const pdfFileName = (teklifNoSeg ? `${cariStem} - ${teklifNoSeg}` : cariStem) + '.pdf';
        const ctx: MailComposeContext = {
          teklif: teklifIcinExport,
          firma: teklifFirmasi || null,
          kullanici: aktifKullanici,
          pdfBlob: blob,
          pdfFileName,
          defaultTo: state.cari?.ePosta || undefined,
        };
        // SMTP tanımlı mı? Değilse önce self-serve kurulum modal'ı aç.
        // Kurulum bitince pending context ile compose modal'ı açılır.
        const smtpHazir = Boolean(aktifKullanici?.smtpPasswordSet && aktifKullanici?.smtpUser);
        if (!smtpHazir) {
          setPendingMailCtx(ctx);
          setSmtpSetupOpen(true);
        } else {
          setMailCtx(ctx);
        }
      }
    } catch (error) {
      console.error('[handleDisaAktar] hata:', error);
      if (error instanceof TeklifDisaAktarimHatasi) {
        message.error(error.message);
      } else if (error instanceof PdfPageCountMismatchError) {
        message.error('PDF sayfa sayısı doğrulanamadı. PDF kaydedilmedi; lütfen canlı print görünümünü kontrol edip tekrar deneyin.');
      } else {
        const detay = error instanceof Error ? error.message : String(error);
        message.error(
          hedef === 'email'
            ? `E-mail gönderim akışı hazırlanırken hata oluştu: ${detay}`
            : `PDF oluşturulurken hata oluştu: ${detay}`,
          8,
        );
      }
    } finally {
      uretiliyorRef.current = false;
      state.setUretiliyor(false);
    }
  }, [teklifObj, state, message, modal, showExportMessage, aktifKullanici, firmalar, pdfKayit]);

  // ── PDF / E-Mail butonları — rehber tetiği + dışa aktarım ───────────
  // NE: Kullanıcı butona her bastığında setPdfRehberTetik(true) çağrılır,
  //     ardından gerçek dışa aktarım akışı (handleDisaAktar) başlar.
  // NEDEN: Rehberin "one-shot" davranışı hook tarafında (localStorage guard)
  //        kararlı — burada her seferinde true'ya çekmek zararsız. Hook
  //        zaten daha önce gösterilmişse sessizce yutar.
  // NASIL: setState'ler senkron sıraya girer, await handleDisaAktar ise
  //        async PDF üretim akışını başlatır. İkisi paralel: rehber overlay
  //        açılırken PDF üretimi arka planda devam eder → kullanıcı hem
  //        rehberi okur hem dosya hazırlanır, UI beklemez.
  const handlePdfIndir = useCallback(async () => {
    setPdfRehberTetik(true);
    await handleDisaAktar('pdf');
  }, [handleDisaAktar]);

  const handleEMailGonder = useCallback(async () => {
    setPdfRehberTetik(true);
    await handleDisaAktar('email');
  }, [handleDisaAktar]);

  /** Compose modal'da "Gönder" başarılı olduğunda durumu 'gonderildi'ye çek. */
  const handleMailSent = useCallback(async () => {
    const sonuclanmis =
      state.durum === 'onaylandi' ||
      state.durum === 'kismi_onaylandi' ||
      state.durum === 'reddedildi' ||
      state.durum === 'iptal';
    if (sonuclanmis) return;
    const yumusakDurumlar: Array<typeof state.durum> = ['taslak', 'hazir'];
    if (yumusakDurumlar.includes(state.durum)) {
      state.setDurum('gonderildi');
    }
    await state.kaydetWithStatus('gonderildi');
  }, [state]);

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
        (src) => `<div style="page-break-after:always;margin:0;padding:0;line-height:0;font-size:0;"><img src="${src}" style="width:210mm;height:297mm;display:block;image-rendering:high-quality;" /></div>`,
      ).join('');

      const iframe = document.createElement('iframe');
      // Görünür ama ekran dışı: Chrome bazı durumlarda width=0/height=0 veya
      // display:none iframe'lerde print()'i sessizce yutuyor. Off-screen +
      // küçük boyut ile dialog güvenle açılır.
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:none;opacity:0;';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      // Print iframe CSS — en yüksek kalite için:
      //   • @page A4 portrait, margin 0 → yazıcı default margin'i devre dışı
      //   • print-color-adjust: exact → renkler birebir korunur (gradient,
      //     pill bg, başlık fonu vb. ekonomi modunda solmaz)
      //   • image-rendering: high-quality → modern Chrome/Edge tarayıcılarda
      //     bicubic downsampling (yazıcının native DPI'ına en kaliteli inme)
      //   • -webkit-optimize-contrast fallback eski tarayıcılarda
      //   • PNG kaynak scale=6 (576 DPI) ile birleştiğinde 600 DPI yazıcıda
      //     ~1:1 mapping, antialiasing artefaktı yok
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Print</title><style>
        @page { size: A4 portrait; margin: 0; }
        html, body {
          margin: 0; padding: 0; background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color-adjust: exact;
        }
        img {
          display: block; width: 210mm; height: 297mm;
          max-width: none; max-height: none;
          image-rendering: high-quality;
          image-rendering: -webkit-optimize-contrast;
        }
        div { page-break-inside: avoid; }
      </style></head><body>${htmlContent}</body></html>`);
      doc.close();

      const imagesInIframe = doc.querySelectorAll('img');
      await Promise.all(
        Array.from(imagesInIframe).map(
          (img) => new Promise<void>((res) => { if (img.complete) res(); else img.onload = () => res(); }),
        ),
      );

      // Iframe temizlik: print dialog kapanınca anında kaldır;
      // onafterprint tetiklenmezse 5sn'lik fallback ile yine kalkar.
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        try { document.body.removeChild(iframe); } catch { /* DOM'da yoksa yok say */ }
      };
      const win = iframe.contentWindow;
      if (win) {
        win.onafterprint = cleanup;
      }
      // Print dialog'unun açılması için iframe'in focus edilmesi şart.
      // Bazı tarayıcılar (Chrome 100+) focus olmayan iframe'de print() çağrısını
      // sessizce yutuyor. focus() + bir paint sonrası print() en güvenli akış.
      try { iframe.focus(); win?.focus(); } catch { /* focus engellendiyse devam et */ }
      // Bir microtask kadar bekle ki focus event loop'a işlensin
      await new Promise<void>((res) => requestAnimationFrame(() => res()));
      win?.print();
      setTimeout(cleanup, 5000);
    } catch (error) {
      console.error('[handleYazdir] hata:', error);
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

  // Rehber sistemi — useSayfaRehberi hook'u tum davranisi (state + polling +
  // sequence + sag-alt 🎓 buton) kapsuller. Burada YALNIZ yanEtki handler'lari
  // var: 'panel-notlar' tipinde sag panel notlar moduna gecer, tip bittiginde
  // (BIZ actiysak) tekrar kapanir. Kullanicinin manuel actigi paneli korur.
  const tipAcanPanelRef = useRef<PanelModu | null>(null);
  // ── useSayfaRehberi çağrısı (Faz 1 hook + Faz 2 otomatik tetik) ─────
  // NE: TEKLIF_EDITOR_TIPLERI pool'undaki 16 tipi sequence olarak çalıştıran
  //     hook. State + DOM polling + TipSpotlight render + sağ-alt 🎓 buton
  //     hepsi hook içinde kapsüllü.
  // NEDEN: TeklifEditor.tsx'ten 70+ satır boilerplate (3 useState + 3
  //        useEffect + 3 callback + JSX render) sökülüp tek satıra indi.
  //        Diğer sayfalar da aynı hook'u kullanarak rehber sistemine
  //        bağlanabilir (Faz 6'da 8 sayfa için kullanılacak).
  // YENİ (Faz 2): otomatikAcKey + otomatikAcTetik prop'ları geçildi.
  //        Bunlar pdfRehberTetik state'i true olduğunda hook'un içindeki
  //        useEffect'i tetikleyip rehberi bir kez (per-user localStorage)
  //        otomatik başlatır. Detay yukarıdaki pdfRehberTetik bloğunda.
  // YAN ETKİ HANDLER: 'panel-notlar' tipinde sağ panel notlar moduna
  //        geçer; tip değişince/sequence biterse BIZ açtıysak kapatırız
  //        (tipAcanPanelRef ile takip — kullanıcının manuel açtığı panel
  //        bozulmaz).
  const rehber = useSayfaRehberi(TEKLIF_EDITOR_TIPLERI, {
    sayfaAdi: 'Teklif Editörü',
    otomatikAcKey: 'meba_pdf_rehber',
    otomatikAcTetik: pdfRehberTetik,
    onYanEtki: (tip) => {
      if (tip.yanEtki === 'panel-notlar' && state.panelModu !== 'notlar') {
        state.setPanelModu('notlar');
        tipAcanPanelRef.current = 'notlar';
      }
    },
    onYanEtkiKapat: (onceki) => {
      if (onceki.yanEtki === 'panel-notlar'
          && tipAcanPanelRef.current === 'notlar'
          && state.panelModu === 'notlar') {
        state.setPanelModu(null);
      }
      tipAcanPanelRef.current = null;
    },
  });

  // ── REVIZE GUARD ─────────────────────────────────────────────────────────
  // Sonuçlanmış / gönderilmiş teklif düzenlenmek istendiğinde orijinal kayıt
  // korunur, yeni bir revize teklif oluşturulup oraya yönlendirilir.
  const kilitli = (KAPALI_DURUMLAR as readonly string[]).includes(state.durum);

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
      content: `Bu teklif ${DURUM_ETIKET[state.durum] || state.durum}. Düzenleme için orijinal kayıt korunarak yeni bir revize teklif oluşturulacak. Yeni revize üzerinde editleyip ayrı bir PDF üretebileceksiniz.`,
      okText: 'Evet, revize oluştur',
      cancelText: 'Vazgeç',
      onOk: () => revizeOlusturVeGec(),
    });
  }, [modal, state.durum, revizeOlusturVeGec]);

  // Eski davranış: kilitli teklifte interactive element'e tıklayınca revize
  // modal'ı otomatik açılırdı. Selector çok genişti (td/button/input/select
  // hepsi yakalıyordu) → kullanıcı belgeyi okurken bile modal patlıyordu.
  //
  // Yeni davranış: Kilitli teklifte tıklama tamamen sessiz. Kullanıcı revize
  // başlatmak isterse iki açık yol var:
  //   1) Mor banner'daki "Yeni Revize Oluştur" butonu
  //   2) KumandaPaneli'ndeki kilit ikonunu açmaya çalışmak — handleMode
  //      KilitliDegistir bunu yakalayıp revizeOnayAc'a yönlendirir.

  // Dropdown'dan durum değişimi: sonuçlanmış durumlara (onaylandi/reddedildi/iptal)
  // geçişte SonucModal devreye girer; modal satır seçimi (onay) veya sebep
  // (red/iptal) toplar ve meta veriyi (sonucTarihi, sonucGirenKullaniciId,
  // kayipSebebi, vb.) eksiksiz yazar. Diğer durumlar (taslak/hazir/gonderildi)
  // doğrudan state.setDurum'a düşer.
  // Kısmi onay seçim modunu başlat — A4 üzerinde inline tıkla-işaretle.
  // iptalSet, varsa mevcut s.onayDurumu='reddedildi' satırlardan başlatılır
  // (önceden işaretliyse korunur; kullanıcı eklemeden başlamamış olur).
  const handleKismiOnayBaslat = useCallback(() => {
    if (!teklifObj) return;
    const init = new Set<string>();
    for (const s of teklifObj.satirlar) {
      if (s.onayDurumu === 'reddedildi') init.add(s.id);
    }
    setKismiIptalSet(init);
    setKismiSecimAktif(true);
    setEditingAlan(null);
  }, [teklifObj]);

  const handleKismiSatirToggle = useCallback((satirId: string) => {
    setKismiIptalSet((prev) => {
      const next = new Set(prev);
      if (next.has(satirId)) next.delete(satirId);
      else next.add(satirId);
      return next;
    });
  }, []);

  const handleKismiVazgec = useCallback(() => {
    setKismiSecimAktif(false);
    setKismiIptalSet(new Set());
  }, []);

  const handleDurumDegistir = useCallback((yeniDurum: TeklifDurum) => {
    // Kismi onay: SonucModal yerine A4 sayfasinda inline secim modunu baslat
    // (kullanici reddedilen satirlari A4 uzerinde tikla-isaretle yapar).
    if (yeniDurum === 'kismi_onaylandi') {
      handleKismiOnayBaslat();
      return;
    }
    // Diger sonuclanmis durumlar (onay/red/iptal) hala SonucModal'i tetikler.
    if (
      yeniDurum === 'onaylandi' ||
      yeniDurum === 'reddedildi' ||
      yeniDurum === 'iptal'
    ) {
      setSonucModalDurum(yeniDurum);
      return;
    }
    // Kismi onaydan geri donulurken (taslak/hazir/gonderildi) satir-bazli
    // iptal isaretleri (onayDurumu='reddedildi') temizlenir. Aksi halde
    // toplamlar dusuk kalir ve teklif "gonderildi" gorunse de PDF/analitik
    // hala kismi gibi davranir.
    if (state.durum === 'kismi_onaylandi' && state.satirlar.some((s) => s.onayDurumu)) {
      const temizSatirlar = state.satirlar.map((s) => {
        if (!s.onayDurumu) return s;
        const r = { ...s };
        delete r.onayDurumu;
        return r;
      });
      state.setSatirlar(temizSatirlar);
    }
    state.setDurum(yeniDurum);
  }, [state, handleKismiOnayBaslat]);

  // SonucModal kaydedince — patch tüm gerekli alanları içerir (durum, satırlar,
  // meta). Önce store'a tam kayıt (auto-save'in meta'yı ezmemesi için bu son
  // adım: setSatirlar tetiklediği sync auto-save eski meta'yı yazar; sonra
  // bizim merge'imiz üzerine yazıp last-write-wins ile garantiler).
  const handleSonucKaydet = useCallback((patch: Partial<Teklif>) => {
    if (!teklifObj) return;
    if (patch.durum) state.setDurum(patch.durum);
    if (patch.satirlar) state.setSatirlar(patch.satirlar);
    // Store'daki mevcut kayıt — sonuç meta'sı için referans (önceden girilmişse korur)
    const mevcut = teklifService.teklifGetir(state.teklifId) ?? teklifObj;
    const guncel: Teklif = {
      ...mevcut,
      ...teklifObj,
      ...patch,
      sonucGirenKullaniciId: aktifKullanici?.id,
      guncellemeTarihi: new Date().toISOString(),
    };
    teklifService.teklifKaydet(guncel);
    setSonucModalDurum(null);
    message.success('Durum güncellendi.');
  }, [teklifObj, state, aktifKullanici?.id, message]);

  // Kısmi onay seçim modunu tamamla — A4'te işaretlenmiş iptal satırlarına
  // göre onayDurumu yazılır, durum (onayli/kismi/reddedildi) sayıma göre
  // belirlenir, totals yeniden hesaplanır ve patch handleSonucKaydet'e
  // verilir. Mod kapatılır.
  const handleKismiTamamla = useCallback(() => {
    if (!teklifObj) return;
    const yeniSatirlar = teklifObj.satirlar.map((s) => ({
      ...s,
      onayDurumu: kismiIptalSet.has(s.id) ? ('reddedildi' as const) : ('onaylandi' as const),
    }));
    const aktifSatirlar = yeniSatirlar.filter((s) => !s.setAltKalem);
    const iptal = aktifSatirlar.filter((s) => s.onayDurumu === 'reddedildi').length;
    const onayli = aktifSatirlar.length - iptal;
    let yeniDurum: TeklifDurum;
    if (iptal === 0) yeniDurum = 'onaylandi';
    else if (onayli === 0) yeniDurum = 'reddedildi';
    else yeniDurum = 'kismi_onaylandi';

    const toplamlar = hesaplamaMotoru.genelToplamHesapla(
      yeniSatirlar,
      teklifObj.kdvOrani,
      teklifObj.iskontoOrani,
      teklifObj.paraBirimi,
    );

    handleSonucKaydet({
      durum: yeniDurum,
      satirlar: yeniSatirlar,
      araToplam: toplamlar.araToplam,
      toplamIndirim: toplamlar.toplamIndirim,
      toplamVergi: toplamlar.kdvTutar,
      genelToplam: toplamlar.genelToplam,
      sonucTarihi: new Date().toISOString(),
    });
    setKismiSecimAktif(false);
    setKismiIptalSet(new Set());
  }, [teklifObj, kismiIptalSet, handleSonucKaydet]);

  // Banner'da gösterilecek canlı sayaç + her para biriminde net onaylanan
  // toplam (iskonto/KDV hariç ham ara toplam). useMemo: iptalSet değişimine
  // ve satırlara duyarlı.
  const kismiOzet = useMemo(() => {
    if (!kismiSecimAktif || !teklifObj) return null;
    const aktif = teklifObj.satirlar.filter((s) => !s.setAltKalem);
    const iptal = aktif.filter((s) => kismiIptalSet.has(s.id)).length;
    const onayli = aktif.length - iptal;
    const onayliSatirlar = teklifObj.satirlar.filter(
      (s) => !s.setAltKalem && !kismiIptalSet.has(s.id),
    );
    const toplamlar = hesaplamaMotoru.paraBirimineGoreToplamlar(
      onayliSatirlar,
      teklifObj.paraBirimi,
    );
    const aktifPb = (['TRY', 'EUR', 'USD'] as const).filter((pb) => toplamlar[pb] > 0);
    return { iptal, onayli, toplamSayi: aktif.length, toplamlar, aktifPb };
  }, [kismiSecimAktif, teklifObj, kismiIptalSet]);

  // SonucModal'a verilen Teklif snapshot'ı — hedef durum üzerine bindirilir ki
  // modal "onaylandi"yı görünce satır seçimi modunda, "reddedildi/iptal"i
  // görünce sebep modunda açılsın.
  const sonucModalTeklif: Teklif | null = useMemo(() => {
    if (!teklifObj || !sonucModalDurum) return null;
    return { ...teklifObj, durum: sonucModalDurum };
  }, [teklifObj, sonucModalDurum]);

  // Query param ?action=kismi-onay → teklif yuklendikten sonra otomatik
  // kismi onay secim moduna gir. searchParams temizlenir ki refresh
  // re-trigger etmesin.
  const [searchParams, setSearchParams] = useSearchParams();
  const kismiAutoTetiklendiRef = useRef(false);
  useEffect(() => {
    if (kismiAutoTetiklendiRef.current) return;
    if (searchParams.get('action') !== 'kismi-onay') return;
    if (!teklifObj) return;
    kismiAutoTetiklendiRef.current = true;
    handleKismiOnayBaslat();
    const next = new URLSearchParams(searchParams);
    next.delete('action');
    setSearchParams(next, { replace: true });
  }, [searchParams, teklifObj, handleKismiOnayBaslat, setSearchParams]);

  const handleModeKilitliDegistir = useCallback((v: boolean) => {
    // Sahip olmayan personel kilidi açamaz
    if (!v && sahipDegil) {
      message.warning('Bu teklif başka bir personele ait, düzenleyemezsiniz.');
      return;
    }
    // Sonuçlanmış/gönderilmiş teklifte kilidi açma denemesi → revize akışı.
    // Eski davranış: setModeKilitli(false) ile kullanıcı düzenleme moduna geçiyor
    // ama her aksiyon backend tarafında reddediliyordu (UX kafa karıştırıcı).
    if (!v && kilitli) {
      revizeOnayAc();
      return;
    }
    setModeKilitli(v);
    if (v) {
      setEditingAlan(null);
      // Kilit kapatılınca serbest çizim de kilitlenir (çizimler kalır,
      // sadece düzenleme/silme modu kapanır).
      setCizimModu(false);
      void persistStatusByMode(true);
    }
  }, [persistStatusByMode, sahipDegil, message, kilitli, revizeOnayAc]);

  // Tavsiye gosterilecek mi? Yeni teklif (satir yok) + counter dolmamis +
  // manuel kapatilmamis + cooldown gecmis. Render sirasinda hesaplanir.
  const tavsiyeSayisi = (() => {
    if (typeof window === 'undefined') return 0;
    const raw = window.localStorage.getItem(tavsiyeKey);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  })();
  // ESKI ust-bar tipler DEVRE DISI — yeni TipSpotlight sistemi A4 ustunde gosterir.
  // tavsiyeEligible hesabi referans icin tutuluyor (eski sistem yeniden acilirsa gerekli).
  const tavsiyeEligible =
    state.satirlar.length === 0 &&
    !tavsiyeKapatildi &&
    !kilitli &&
    tavsiyeSayisi < TAVSIYE_MAX &&
    tipCooldownGecmis(tavsiyeKey);
  void tavsiyeEligible;
  const tavsiyeGoster = false; // tavsiyeEligible — eski top-bar kapatildi

  // Tavsiye gosterildiyse counter + lastShown bump et (1 kere bu acilista)
  useEffect(() => {
    if (tavsiyeGoster && !tavsiyeBumped && typeof window !== 'undefined') {
      const yeni = (Number.parseInt(window.localStorage.getItem(tavsiyeKey) || '0', 10) || 0) + 1;
      window.localStorage.setItem(tavsiyeKey, String(yeni));
      tipLastShownYaz(tavsiyeKey);
      setTavsiyeBumped(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tavsiyeGoster, tavsiyeBumped, tavsiyeKey]);

  // Notlar Popover (Antd Popover coachmark): bardaki Notlar butonunu isaret
  // edip aciklayan. Notlar atanmamis (state.notlar bos) ve counter dolmamis
  // ise gorulur. Kullanici notlar yazinca veya X kapatinca gizlenir.
  const notlarPopoverSayisi = (() => {
    if (typeof window === 'undefined') return 0;
    const raw = window.localStorage.getItem(notlarPopoverKey);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  })();
  const notlarEligible =
    !(state.notlar && state.notlar.trim().length > 0) &&
    !notlarPopoverKapatildi &&
    !kilitli &&
    notlarPopoverSayisi < TAVSIYE_MAX &&
    tipCooldownGecmis(notlarPopoverKey);
  void notlarEligible;
  // Mutex: baslangic gosterildiyse notlar bekler
  const notlarPopoverGoster = false; // notlarEligible — eski top-bar kapatildi
  useEffect(() => {
    if (notlarPopoverGoster && !notlarPopoverBumped && typeof window !== 'undefined') {
      const yeni = (Number.parseInt(window.localStorage.getItem(notlarPopoverKey) || '0', 10) || 0) + 1;
      window.localStorage.setItem(notlarPopoverKey, String(yeni));
      tipLastShownYaz(notlarPopoverKey);
      setNotlarPopoverBumped(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notlarPopoverGoster, notlarPopoverBumped, notlarPopoverKey]);

  // Satir Islemleri Tavsiyesi (animasyonlu banner): satir arasina kalem ekleme
  // ve satir hucresinde mavi cizgi ile yukseklik ayarlama ozelliklerini SVG
  // animasyonlu demolarla anlatir. En az 1 satir varsa gorunur (eylem
  // anlamli olur), counter < MAX ve kapatilmamis.
  const satirIslemleriSayisi = (() => {
    if (typeof window === 'undefined') return 0;
    const raw = window.localStorage.getItem(satirIslemleriKey);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  })();
  const satirIslemleriEligible =
    state.satirlar.length >= 1 &&
    !satirIslemleriKapatildi &&
    !kilitli &&
    satirIslemleriSayisi < TAVSIYE_MAX &&
    tipCooldownGecmis(satirIslemleriKey);
  void satirIslemleriEligible;
  // Mutex: baslangic veya notlar gosterildiyse satir islemleri bekler
  const satirIslemleriGoster = false; // satirIslemleriEligible — eski top-bar kapatildi
  useEffect(() => {
    if (satirIslemleriGoster && !satirIslemleriBumped && typeof window !== 'undefined') {
      const yeni = (Number.parseInt(window.localStorage.getItem(satirIslemleriKey) || '0', 10) || 0) + 1;
      window.localStorage.setItem(satirIslemleriKey, String(yeni));
      tipLastShownYaz(satirIslemleriKey);
      setSatirIslemleriBumped(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satirIslemleriGoster, satirIslemleriBumped, satirIslemleriKey]);

  // Akilli Hucreler Tavsiyesi: Urun Kodu/Aciklama yazinca onerilen kalemlerin
  // dropdown ile cikmasi + Birim Fiyat tikla->son liste fiyati rozeti animasyon
  // demolari. En az 1 satir varsa tetiklenir, oncekiler bittikten sonra mutex
  // ile sirayla acilir.
  const akilliHucrelerSayisi = (() => {
    if (typeof window === 'undefined') return 0;
    const raw = window.localStorage.getItem(akilliHucrelerKey);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  })();
  const akilliHucrelerEligible =
    state.satirlar.length >= 1 &&
    !akilliHucrelerKapatildi &&
    !kilitli &&
    akilliHucrelerSayisi < TAVSIYE_MAX &&
    tipCooldownGecmis(akilliHucrelerKey);
  void akilliHucrelerEligible;
  const akilliHucrelerGoster = false; // eski top-bar kapatildi
  useEffect(() => {
    if (akilliHucrelerGoster && !akilliHucrelerBumped && typeof window !== 'undefined') {
      const yeni = (Number.parseInt(window.localStorage.getItem(akilliHucrelerKey) || '0', 10) || 0) + 1;
      window.localStorage.setItem(akilliHucrelerKey, String(yeni));
      tipLastShownYaz(akilliHucrelerKey);
      setAkilliHucrelerBumped(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [akilliHucrelerGoster, akilliHucrelerBumped, akilliHucrelerKey]);

  // Debug log — kullanici neden tavsiyelerin gorulmedigini console'dan goruyor.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tavsiyeDebug = {
      debugMode: debugTavsiye,
      kilitli,
      satirSayisi: state.satirlar.length,
      notlarBosMu: !(state.notlar && state.notlar.trim().length > 0),
      // Sayaclar
      baslangicSayim: tavsiyeSayisi,
      notlarSayim: notlarPopoverSayisi,
      satirIslemSayim: satirIslemleriSayisi,
      akilliSayim: akilliHucrelerSayisi,
      // Goster mi?
      baslangicGoster: tavsiyeGoster,
      notlarGoster: notlarPopoverGoster,
      satirIslemGoster: satirIslemleriGoster,
      akilliGoster: akilliHucrelerGoster,
    };
    console.log('[MEBA Tavsiye Debug]', tavsiyeDebug);
    if (debugTavsiye) {
      console.log('%c⚡ DEBUG MODE AKTIF — tavsiyeler kosul kontrolusuz gorulur', 'color: #5b8def; font-weight: bold;');
    }
  }, [
    debugTavsiye, kilitli, state.satirlar.length, state.notlar,
    tavsiyeSayisi, notlarPopoverSayisi, satirIslemleriSayisi, akilliHucrelerSayisi,
    tavsiyeGoster, notlarPopoverGoster, satirIslemleriGoster, akilliHucrelerGoster,
  ]);

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
        durum={state.durum}
        status={state.status}
        uretiliyor={state.uretiliyor}
        onGeriDon={handleGeriDon}
        onPdfIndir={handlePdfIndir}
        onEMailGonder={handleEMailGonder}
        onYazdir={handleYazdir}
        onPanelAc={handlePanelAc}
        onDurumDegistir={handleDurumDegistir}
        ilgiliKisiAdSoyad={state.ilgiliKisiAdSoyad}
        onIlgiliKisiAc={() => setIlgiliKisiModalAcik(true)}
        pdfKayitDestekli={pdfKayit.supported}
        pdfKayitKlasorAdi={pdfKayit.klasorAdi}
        pdfKayitDurum={pdfKayitDurum}
        notlarTavsiyeAcik={notlarPopoverGoster}
        onNotlarTavsiyeKapat={() => setNotlarPopoverKapatildi(true)}
      />

      {/* Animasyonli tavsiye banner'larini ortak kullanan CSS keyframe'leri.
          Inline tutuyoruz ki banner ile birlikte gelsin (separated CSS yok). */}
      <style>{`
        @keyframes meba-fade-slide-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes meba-row-insert-gap {
          0%, 20%   { transform: translateY(0); }
          40%, 60%  { transform: translateY(7px); }
          80%, 100% { transform: translateY(0); }
        }
        @keyframes meba-row-insert-plus {
          0%, 30%  { opacity: 0; transform: scale(0.6); }
          50%, 70% { opacity: 1; transform: scale(1); }
          90%, 100%{ opacity: 0; transform: scale(0.6); }
        }
        @keyframes meba-row-resize-handle {
          0%, 15%   { opacity: 0; transform: scaleX(0.4); }
          25%, 75%  { opacity: 1; transform: scaleX(1); }
          90%, 100% { opacity: 0; transform: scaleX(0.4); }
        }
        @keyframes meba-row-resize-grow {
          0%, 30%   { transform: scaleY(1); transform-origin: top; }
          50%, 70%  { transform: scaleY(1.55); transform-origin: top; }
          85%, 100% { transform: scaleY(1); transform-origin: top; }
        }
        @keyframes meba-resize-cursor-move {
          0%, 30%   { transform: translateY(0); }
          50%, 70%  { transform: translateY(11px); }
          85%, 100% { transform: translateY(0); }
        }
        /* Yeni gercekci animasyonlar — mini A4 satir uzerinde cursor */
        @keyframes meba-cursor-hover-between {
          0%, 15%   { opacity: 0; transform: translate(0, 0); }
          25%, 40%  { opacity: 1; transform: translate(-2px, -1px); }
          50%, 65%  { opacity: 1; transform: translate(0, 0); }
          75%, 100% { opacity: 0; transform: translate(2px, 1px); }
        }
        @keyframes meba-plus-pop {
          0%, 35%   { opacity: 0; transform: scale(0.3); }
          50%, 70%  { opacity: 1; transform: scale(1); }
          85%, 100% { opacity: 0; transform: scale(0.3); }
        }
        @keyframes meba-row-push-down {
          0%, 40%   { transform: translateY(0); }
          60%, 100% { transform: translateY(13px); }
        }
        @keyframes meba-new-row-appear {
          0%, 55%   { opacity: 0; transform: scale(0.95) translateX(-4px); }
          70%, 100% { opacity: 1; transform: scale(1) translateX(0); }
        }
        @keyframes meba-resize-cursor-grab {
          0%, 20%   { opacity: 0; transform: translate(0, 0); }
          30%, 45%  { opacity: 1; transform: translate(0, -2px); }
          55%, 75%  { opacity: 1; transform: translate(0, 14px); }
          85%, 100% { opacity: 0; transform: translate(0, 14px); }
        }
        @keyframes meba-row-tall {
          0%, 25%   { height: 14px; }
          40%, 75%  { height: 28px; }
          90%, 100% { height: 14px; }
        }
        @keyframes meba-handle-blue {
          0%, 20%   { opacity: 0; }
          30%, 80%  { opacity: 1; }
          90%, 100% { opacity: 0; }
        }
        /* Akilli Hucreler demolari */
        @keyframes meba-type-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes meba-typing-fill {
          0%, 5%   { width: 0; }
          30%, 60% { width: 28px; }
          80%, 100%{ width: 0; }
        }
        @keyframes meba-suggest-slide {
          0%, 25%   { opacity: 0; transform: translateY(-4px); }
          40%, 70%  { opacity: 1; transform: translateY(0); }
          85%, 100% { opacity: 0; transform: translateY(-4px); }
        }
        @keyframes meba-chip-slide-up {
          0%, 35%   { opacity: 0; transform: translateY(8px); }
          50%, 75%  { opacity: 1; transform: translateY(0); }
          88%, 100% { opacity: 0; transform: translateY(8px); }
        }
        @keyframes meba-price-fill {
          0%, 65%  { width: 0; }
          80%, 95% { width: 42px; }
          100%     { width: 0; }
        }
        /* Akilli Hucreler — gercek aksiyon sonuclari animasyonlari */
        @keyframes meba-cell-typing {
          0%, 8%    { width: 0; }
          18%, 38%  { width: 100%; }
          92%, 100% { width: 0; }
        }
        @keyframes meba-suggest-slide-real {
          0%, 38%   { opacity: 0; transform: translateY(-8px) scale(0.96); }
          46%, 56%  { opacity: 1; transform: translateY(0) scale(1); }
          62%, 100% { opacity: 0; transform: translateY(-8px) scale(0.96); }
        }
        @keyframes meba-cursor-pick-suggest {
          0%, 40%   { opacity: 0; transform: translate(0, 0) scale(1); }
          46%, 50%  { opacity: 1; transform: translate(0, 0) scale(1); }
          54%, 58%  { opacity: 1; transform: translate(-3px, -3px) scale(0.82); }
          62%, 100% { opacity: 0; transform: translate(0, 0) scale(1); }
        }
        @keyframes meba-autofill-glow {
          0%, 58%   { opacity: 0; transform: scale(0.6); transform-origin: left center; }
          64%, 68%  { opacity: 1; transform: scale(1.08); transform-origin: left center; }
          74%, 92%  { opacity: 1; transform: scale(1); transform-origin: left center; }
          98%, 100% { opacity: 0; transform: scale(0.6); transform-origin: left center; }
        }
        @keyframes meba-autofill-glow-2 {
          0%, 64%   { opacity: 0; transform: scale(0.6); transform-origin: left center; }
          70%, 74%  { opacity: 1; transform: scale(1.06); transform-origin: left center; }
          80%, 92%  { opacity: 1; transform: scale(1); transform-origin: left center; }
          98%, 100% { opacity: 0; transform: scale(0.6); transform-origin: left center; }
        }
        @keyframes meba-autofill-glow-3 {
          0%, 70%   { opacity: 0; transform: scale(0.6); transform-origin: left center; }
          76%, 80%  { opacity: 1; transform: scale(1.06); transform-origin: left center; }
          86%, 94%  { opacity: 1; transform: scale(1); transform-origin: left center; }
          100%      { opacity: 0; transform: scale(0.6); transform-origin: left center; }
        }
        @keyframes meba-success-check {
          0%, 80%   { opacity: 0; transform: scale(0); }
          86%, 90%  { opacity: 1; transform: scale(1.25); }
          94%, 100% { opacity: 1; transform: scale(1); }
        }
        @keyframes meba-text-fade-out {
          0%, 18%   { opacity: 1; }
          26%, 95%  { opacity: 0; }
          100%      { opacity: 1; }
        }
        @keyframes meba-text-fade-in {
          0%, 22%   { opacity: 0; }
          32%, 95%  { opacity: 1; }
          100%      { opacity: 0; }
        }
        @keyframes meba-modal-pop {
          0%, 35%   { opacity: 0; transform: translateY(6px) scale(0.85); transform-origin: center; }
          43%, 50%  { opacity: 1; transform: translateY(-2px) scale(1.04); transform-origin: center; }
          56%, 92%  { opacity: 1; transform: translateY(0) scale(1); transform-origin: center; }
          100%      { opacity: 0; transform: translateY(6px) scale(0.85); transform-origin: center; }
        }
        @keyframes meba-cursor-pick-modal {
          0%, 52%   { opacity: 0; transform: translate(0, 0) scale(1); }
          58%, 64%  { opacity: 1; transform: translate(0, 0) scale(1); }
          68%, 74%  { opacity: 1; transform: translate(-4px, -4px) scale(0.82); }
          80%, 92%  { opacity: 1; transform: translate(0, 0) scale(1); }
          100%      { opacity: 0; transform: translate(0, 0) scale(1); }
        }
      `}</style>

      {/* Yeni Teklif Tavsiyesi — yumusak ipucu, ilk N teklifte gosterilir,
          sonra otomatik kapanir (per-user counter localStorage). Tip:
          "Kalemlere baslamadan once ust kisimdaki bilgileri tamamla". */}
      {tavsiyeGoster && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '10px 18px',
            margin: '0 16px',
            marginTop: 8,
            background: 'linear-gradient(135deg, rgba(99,179,237,0.10) 0%, rgba(159,140,232,0.08) 100%)',
            border: '1px solid rgba(99,179,237,0.22)',
            borderLeft: '3px solid #5b8def',
            borderRadius: 8,
            fontSize: 12.5,
            lineHeight: 1.45,
            color: 'var(--text-primary)',
            boxShadow: '0 1px 2px rgba(91,141,239,0.06)',
            animation: 'meba-fade-slide-in 280ms ease-out',
          }}
        >
          {/* Animasyonlu demo: tepe alanindaki bilgi kutularinin sirayla
              "checkmark" alarak doldurulmasi — kullaniciya akis dramatik gosterir. */}
          <div style={{ flex: '0 0 92px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 92 52" width="92" height="52">
              <style>{`
                .meba-baslangic-cell { fill: #e0e7ff; stroke: #a5b4fc; stroke-width: 0.6; }
                .meba-baslangic-fill { transform-origin: left center; }
                .meba-baslangic-fill-1 { animation: meba-fill-cell 4s ease-in-out infinite; animation-delay: 0.2s; }
                .meba-baslangic-fill-2 { animation: meba-fill-cell 4s ease-in-out infinite; animation-delay: 0.7s; }
                .meba-baslangic-fill-3 { animation: meba-fill-cell 4s ease-in-out infinite; animation-delay: 1.2s; }
                .meba-baslangic-fill-4 { animation: meba-fill-cell 4s ease-in-out infinite; animation-delay: 1.7s; }
                .meba-baslangic-check-1 { animation: meba-check-show 4s ease-in-out infinite; animation-delay: 0.6s; }
                .meba-baslangic-check-2 { animation: meba-check-show 4s ease-in-out infinite; animation-delay: 1.1s; }
                .meba-baslangic-check-3 { animation: meba-check-show 4s ease-in-out infinite; animation-delay: 1.6s; }
                .meba-baslangic-check-4 { animation: meba-check-show 4s ease-in-out infinite; animation-delay: 2.1s; }
                @keyframes meba-fill-cell { 0%, 5% { transform: scaleX(0); } 12%, 75% { transform: scaleX(1); } 88%, 100% { transform: scaleX(0); } }
                @keyframes meba-check-show { 0%, 12% { opacity: 0; transform: scale(0.4); } 22%, 75% { opacity: 1; transform: scale(1); } 88%, 100% { opacity: 0; transform: scale(0.4); } }
              `}</style>
              {/* 4 satir, her biri 2 hucre — bir form goruntusu */}
              {[0, 1, 2, 3].map((row) => {
                const y = 4 + row * 11;
                return (
                  <g key={row}>
                    {/* Label hücresi */}
                    <rect x="4" y={y} width="20" height="9" rx="1.5" className="meba-baslangic-cell" />
                    <line x1="6" y1={y + 4.7} x2="20" y2={y + 4.7} stroke="#6366f1" strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
                    {/* Value hücresi — soluk arka plan, animasyonla dolar */}
                    <rect x="26" y={y} width="50" height="9" rx="1.5" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
                    <rect x="26" y={y} width="50" height="9" rx="1.5" fill="#c7d2fe" className={`meba-baslangic-fill meba-baslangic-fill-${row + 1}`} />
                    <line x1="28" y1={y + 4.7} x2="58" y2={y + 4.7} stroke="#4f46e5" strokeWidth="1" strokeLinecap="round" opacity="0.75" className={`meba-baslangic-fill meba-baslangic-fill-${row + 1}`} />
                    {/* Sag tarafta checkmark — degisiklik tamamlandi */}
                    <g transform={`translate(${82}, ${y + 4.5})`} className={`meba-baslangic-check meba-baslangic-check-${row + 1}`} style={{ transformOrigin: 'center' }}>
                      <circle cx="0" cy="0" r="3.2" fill="#10b981" />
                      <path d="M -1.6 0 L -0.4 1.2 L 1.6 -1" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, marginBottom: 2, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💡</span>
              <span>Tavsiye — Akış İçin Sıralama</span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Kalemleri eklemeye başlamadan önce A4'ün üst kısmındaki <b>cari</b>, <b>ilgili kişi</b>, <b>tarih</b>, <b>para birimi</b>, <b>KDV</b> ve <b>ödeme vadesi</b> gibi bilgileri tamamlamanız akışı çok daha rahat hale getirir.
            </div>
            {/* Para birimi bilgi notu — kullanici davranisi dogru anlasin */}
            <div style={{
              marginTop: 8,
              padding: '6px 10px 6px 12px',
              background: 'rgba(99, 179, 237, 0.08)',
              border: '1px solid rgba(99, 179, 237, 0.25)',
              borderLeft: '3px solid #5b8def',
              borderRadius: 6,
              fontSize: 11.5,
              color: '#1e3a8a',
              lineHeight: 1.45,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ fontSize: 13, lineHeight: 1, paddingTop: 1, flexShrink: 0 }}>ℹ️</span>
                <div>
                  <b>Para birimi:</b> Sonradan değiştirirseniz endişe etmeyin — <b>önceki satırların fiyatları girildiği para biriminde otomatik korunur</b>. Örn: 100 EUR girip USD'ye geçerseniz, o satır 100 EUR olarak kalır, sadece yeni satırlar USD olur. Genel toplam karma para birimi olarak gösterilir.
                </div>
              </div>
            </div>
            {tavsiyeSayisi < TAVSIYE_MAX - 1 && (
              <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 11 }}>
                ({TAVSIYE_MAX - tavsiyeSayisi} gösterim sonra otomatik gizlenir)
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setTavsiyeKapatildi(true)}
            aria-label="Tavsiyeyi kapat"
            title="Bu mesajı kapat"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
              fontSize: 14,
              lineHeight: 1,
              borderRadius: 4,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Satir Islemleri Tavsiyesi — iki animasyonlu SVG demo:
          1) Satir arasina kalem ekleme: rows separate, + appears between
          2) Satir yuksekligi: mavi handle belirir, cursor sürükler, satır büyür */}
      {satirIslemleriGoster && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 14,
            padding: '12px 16px',
            margin: '8px 16px 0 16px',
            background: 'linear-gradient(135deg, rgba(99,179,237,0.10) 0%, rgba(159,140,232,0.07) 100%)',
            border: '1px solid rgba(99,179,237,0.22)',
            borderLeft: '3px solid #5b8def',
            borderRadius: 8,
            fontSize: 12.5,
            lineHeight: 1.45,
            color: 'var(--text-primary)',
            boxShadow: '0 1px 2px rgba(91,141,239,0.06)',
            position: 'relative',
            animation: 'meba-fade-slide-in 280ms ease-out',
          }}
        >
          {/* Demo 1: Iki satir + ARAYA fareyle gelinir + butonu cikar + tiklayinca yeni satir araya akar — BUYUTULDU */}
          <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 200 64" width="320" height="102" style={{ flexShrink: 0 }}>
              {/* Header (kolonlar) */}
              <g opacity="0.5">
                <text x="9" y="6" fontSize="3.5" fill="#64748b" fontWeight="600">No</text>
                <text x="20" y="6" fontSize="3.5" fill="#64748b" fontWeight="600">Marka</text>
                <text x="42" y="6" fontSize="3.5" fill="#64748b" fontWeight="600">Ürün Kodu</text>
                <text x="80" y="6" fontSize="3.5" fill="#64748b" fontWeight="600">Açıklama</text>
                <text x="138" y="6" fontSize="3.5" fill="#64748b" fontWeight="600">Mik</text>
                <text x="156" y="6" fontSize="3.5" fill="#64748b" fontWeight="600">Fiyat</text>
                <text x="180" y="6" fontSize="3.5" fill="#64748b" fontWeight="600">Top</text>
              </g>
              {/* Satir 1 (üst) — sabit */}
              <g>
                <rect x="4" y="8" width="192" height="11" rx="1.5" fill="#fff" stroke="#cbd5e1" strokeWidth="0.4" />
                <text x="10" y="15.5" fontSize="4.5" fill="#1e293b" fontWeight="700">01</text>
                <text x="20" y="15.5" fontSize="4" fill="#475569">SMC</text>
                <text x="42" y="15.5" fontSize="4" fill="#1e293b" fontFamily="monospace" fontWeight="600">AS1201F-M5</text>
                <text x="80" y="15.5" fontSize="4" fill="#475569">Hava filtresi</text>
                <text x="138" y="15.5" fontSize="4" fill="#1e293b" fontWeight="600">2</text>
                <text x="156" y="15.5" fontSize="4" fill="#1e293b" fontWeight="600">125 €</text>
                <text x="180" y="15.5" fontSize="4" fill="#1e293b" fontWeight="700">250 €</text>
              </g>
              {/* Satir 2 — aşağı kayar */}
              <g style={{ animation: 'meba-row-push-down 3.4s ease-in-out infinite' }}>
                <rect x="4" y="20" width="192" height="11" rx="1.5" fill="#fff" stroke="#cbd5e1" strokeWidth="0.4" />
                <text x="10" y="27.5" fontSize="4.5" fill="#1e293b" fontWeight="700">02</text>
                <text x="20" y="27.5" fontSize="4" fill="#475569">SICK</text>
                <text x="42" y="27.5" fontSize="4" fill="#1e293b" fontFamily="monospace" fontWeight="600">WL12-3P2431</text>
                <text x="80" y="27.5" fontSize="4" fill="#475569">Optik sensör</text>
                <text x="138" y="27.5" fontSize="4" fill="#1e293b" fontWeight="600">1</text>
                <text x="156" y="27.5" fontSize="4" fill="#1e293b" fontWeight="600">340 €</text>
                <text x="180" y="27.5" fontSize="4" fill="#1e293b" fontWeight="700">340 €</text>
              </g>
              {/* + butonu — ARAYA cikar */}
              <g transform="translate(100, 20)" style={{ animation: 'meba-plus-pop 3.4s ease-in-out infinite', transformOrigin: 'center' }}>
                <circle cx="0" cy="0" r="4.2" fill="#5b8def" />
                <line x1="-2" y1="0" x2="2" y2="0" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
                <line x1="0" y1="-2" x2="0" y2="2" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
              </g>
              {/* Yeni eklenen satir (3. olarak gorulur) */}
              <g style={{ animation: 'meba-new-row-appear 3.4s ease-in-out infinite' }}>
                <rect x="4" y="20" width="192" height="11" rx="1.5" fill="#ecfdf5" stroke="#10b981" strokeWidth="0.7" strokeDasharray="2 1" />
                <text x="10" y="27.5" fontSize="4.5" fill="#047857" fontWeight="700" opacity="0.7">02</text>
                <text x="42" y="27.5" fontSize="4" fill="#10b981" fontWeight="600">yeni satır...</text>
              </g>
              {/* Mouse cursor — iki satir arasi hover, sonra + butonuna kayar */}
              <g style={{ animation: 'meba-cursor-hover-between 3.4s ease-in-out infinite' }}>
                <path
                  d="M 96 18 L 96 27 L 99 24.5 L 101 28 L 102.5 27.5 L 100.5 24 L 104 24 Z"
                  fill="#1e293b" stroke="#fff" strokeWidth="0.5"
                />
              </g>
            </svg>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5b8def', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Araya Kalem Ekle
            </div>
          </div>

          <div style={{ width: 1, background: 'rgba(99,179,237,0.18)' }} />

          {/* Demo 2: 1 satir + alt kenarda mavi handle belirir + cursor tutup asagi cekiyor + satir buyur — BUYUTULDU */}
          <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 200 64" width="320" height="102" style={{ flexShrink: 0 }}>
              <g opacity="0.5">
                <text x="9" y="6" fontSize="3.5" fill="#64748b" fontWeight="600">No</text>
                <text x="20" y="6" fontSize="3.5" fill="#64748b" fontWeight="600">Marka</text>
                <text x="42" y="6" fontSize="3.5" fill="#64748b" fontWeight="600">Ürün Kodu</text>
                <text x="80" y="6" fontSize="3.5" fill="#64748b" fontWeight="600">Açıklama</text>
              </g>
              {/* Buyuyen satir — foreignObject ile height animation */}
              <foreignObject x="4" y="8" width="192" height="56">
                <div
                  style={{
                    width: '100%',
                    height: 14,
                    background: '#fff',
                    border: '0.4px solid #cbd5e1',
                    borderRadius: 1.5,
                    position: 'relative',
                    animation: 'meba-row-tall 3.4s ease-in-out infinite',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'absolute', top: 3.5, left: 6, fontSize: 4.5, color: '#1e293b', fontWeight: 700 }}>03</div>
                  <div style={{ position: 'absolute', top: 4, left: 16, fontSize: 4, color: '#475569' }}>SMC</div>
                  <div style={{ position: 'absolute', top: 4, left: 38, fontSize: 4, color: '#1e293b', fontFamily: 'monospace', fontWeight: 600 }}>AS3001F-M5</div>
                  <div style={{ position: 'absolute', top: 4, left: 76, fontSize: 4, color: '#475569', maxWidth: 80, lineHeight: 1.4 }}>
                    Yüksek basınçlı hidrolik valf, paslanmaz çelik, korozyona dayanıklı
                  </div>
                </div>
              </foreignObject>
              {/* Mavi resize handle — satir alt kenarinda */}
              <line
                x1="76" y1="22" x2="124" y2="22"
                stroke="#5b8def" strokeWidth="1.6" strokeLinecap="round"
                style={{ animation: 'meba-handle-blue 3.4s ease-in-out infinite' }}
              />
              {/* Cursor (resize) — handle'i tutuyor asagi suruklenir */}
              <g style={{ animation: 'meba-resize-cursor-grab 3.4s ease-in-out infinite' }}>
                <path
                  d="M 96 22 L 96 31 L 99 28.5 L 101 32 L 102.5 31.5 L 100.5 28 L 104 28 Z"
                  fill="#1e293b" stroke="#fff" strokeWidth="0.5"
                />
              </g>
            </svg>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5b8def', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Yüksekliği Ayarla
            </div>
          </div>

          <div style={{ width: 1, background: 'rgba(99,179,237,0.18)' }} />

          <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💡</span>
              <span>Satır İşlemleri</span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <div style={{ marginBottom: 2 }}>
                <b>Araya kalem ekle:</b> İki satır arasına fareni getir, beliren <b>+</b> butonuna bas.
              </div>
              <div>
                <b>Yüksekliği ayarla:</b> Bir satırın alt kenarında beliren <b>mavi çizgiyi</b> tutup aşağı sürükle.
              </div>
              {satirIslemleriSayisi < TAVSIYE_MAX - 1 && (
                <div style={{ marginTop: 5, fontSize: 11, color: '#94a3b8' }}>
                  {TAVSIYE_MAX - satirIslemleriSayisi} kez daha
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSatirIslemleriKapatildi(true)}
            aria-label="Tavsiyeyi kapat"
            title="Bu mesajı kapat"
            style={{
              position: 'absolute',
              top: 6,
              right: 8,
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
              fontSize: 14,
              lineHeight: 1,
              borderRadius: 4,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Akilli Hucreler Tavsiyesi — gercek aksiyon sonuclari:
          1) Urun Kodu yaz -> oneri sec -> Marka/Aciklama/Fiyat otomatik dolar
          2) Aciklama degistir -> DB'yi guncelle modal'i */}
      {akilliHucrelerGoster && (
        <div
          role="status"
          style={{
            display: 'flex', alignItems: 'stretch', gap: 14,
            padding: '12px 16px', margin: '8px 16px 0 16px',
            background: 'linear-gradient(135deg, rgba(99,179,237,0.10) 0%, rgba(159,140,232,0.07) 100%)',
            border: '1px solid rgba(99,179,237,0.22)', borderLeft: '3px solid #5b8def',
            borderRadius: 8, fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-primary)',
            boxShadow: '0 1px 2px rgba(91,141,239,0.06)', position: 'relative',
            animation: 'meba-fade-slide-in 280ms ease-out',
          }}
        >
          {/* Demo 1: Urun Kodu yaz -> diger hucreler dolar — BUYUTULDU 320x110 */}
          <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 320 110" width="320" height="110" style={{ flexShrink: 0 }}>
              {/* Kolon basliklari */}
              <g opacity="0.55">
                <text x="14" y="9" fontSize="5" fill="#64748b" fontWeight="700">No</text>
                <text x="32" y="9" fontSize="5" fill="#64748b" fontWeight="700">Marka</text>
                <text x="70" y="9" fontSize="5" fill="#64748b" fontWeight="700">Ürün Kodu</text>
                <text x="135" y="9" fontSize="5" fill="#64748b" fontWeight="700">Açıklama</text>
                <text x="255" y="9" fontSize="5" fill="#64748b" fontWeight="700">Fiyat</text>
              </g>
              {/* Satir taban */}
              <rect x="6" y="13" width="308" height="22" rx="2" fill="#fff" stroke="#cbd5e1" strokeWidth="0.6" />
              <text x="14" y="27" fontSize="6.5" fill="#1e293b" fontWeight="700">01</text>
              {/* Urun Kodu cell — yaziliyor */}
              <foreignObject x="68" y="17" width="62" height="14">
                <div style={{
                  position: 'relative', height: '100%', display: 'flex', alignItems: 'center', gap: 1.5,
                  fontFamily: 'monospace', fontSize: 6.5, color: '#1e293b', fontWeight: 700,
                }}>
                  <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', display: 'inline-block', animation: 'meba-cell-typing 5s ease-in-out infinite' }}>AS1201F-M5</span>
                  <span style={{ width: 1.2, height: 8, background: '#1e293b', animation: 'meba-type-cursor 0.6s ease-in-out infinite' }} />
                </div>
              </foreignObject>
              {/* Marka otomatik */}
              <g style={{ animation: 'meba-autofill-glow 5s ease-in-out infinite' }}>
                <rect x="32" y="17" width="34" height="14" rx="1.6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.4" />
                <text x="36" y="27" fontSize="6" fill="#92400e" fontWeight="700">SMC</text>
              </g>
              {/* Aciklama otomatik */}
              <g style={{ animation: 'meba-autofill-glow-2 5s ease-in-out infinite' }}>
                <rect x="125" y="17" width="122" height="14" rx="1.6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.4" />
                <text x="129" y="27" fontSize="5.8" fill="#92400e" fontWeight="600">Hava filtresi 1/4 NPT G&apos;li</text>
              </g>
              {/* Fiyat otomatik */}
              <g style={{ animation: 'meba-autofill-glow-3 5s ease-in-out infinite' }}>
                <rect x="249" y="17" width="62" height="14" rx="1.6" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.4" />
                <text x="254" y="27" fontSize="6.2" fill="#92400e" fontWeight="700">125 €</text>
              </g>
              {/* Dropdown oneri kutusu */}
              <g style={{ animation: 'meba-suggest-slide-real 5s ease-in-out infinite' }}>
                <rect x="68" y="39" width="160" height="44" rx="2.5" fill="#fff" stroke="#5b8def" strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(91,141,239,0.25))" />
                <rect x="68" y="39" width="160" height="13" fill="#dbeafe" />
                <text x="74" y="48.5" fontSize="6.2" fill="#1e3a8a" fontFamily="monospace" fontWeight="800">SMC AS1201F-M5</text>
                <text x="74" y="62" fontSize="5.8" fontFamily="monospace" fill="#475569">SMC AS2001F-M5</text>
                <text x="74" y="74" fontSize="5.8" fontFamily="monospace" fill="#475569">SMC AS3001F-M5</text>
              </g>
              {/* Mouse cursor — drop down secimi */}
              <g style={{ animation: 'meba-cursor-pick-suggest 5s ease-in-out infinite' }}>
                <path
                  d="M 120 52 L 120 67 L 124 63 L 127 69 L 129.5 68 L 126.5 62 L 132 62 Z"
                  fill="#1e293b" stroke="#fff" strokeWidth="0.8"
                />
              </g>
              {/* Sag tarafta basari rozeti */}
              <g style={{ animation: 'meba-success-check 5s ease-in-out infinite', transformOrigin: 'center' }} transform="translate(296, 96)">
                <circle cx="0" cy="0" r="10" fill="#10b981" stroke="#fff" strokeWidth="1.2" />
                <path d="M -4.2 0 L -1 3.2 L 4.6 -3.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>
            </svg>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5b8def', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Ürün Kodu → 3 Hücre Otomatik
            </div>
          </div>

          <div style={{ width: 1, background: 'rgba(99,179,237,0.18)' }} />

          {/* Demo 2: Aciklama degistir -> DB guncelle modal — BUYUTULDU 320x110 */}
          <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 320 110" width="320" height="110" style={{ flexShrink: 0 }}>
              {/* Kolon basliklari */}
              <g opacity="0.55">
                <text x="14" y="9" fontSize="5" fill="#64748b" fontWeight="700">No</text>
                <text x="32" y="9" fontSize="5" fill="#64748b" fontWeight="700">Marka</text>
                <text x="70" y="9" fontSize="5" fill="#64748b" fontWeight="700">Ürün Kodu</text>
                <text x="135" y="9" fontSize="5" fill="#64748b" fontWeight="700">Açıklama</text>
                <text x="255" y="9" fontSize="5" fill="#64748b" fontWeight="700">Fiyat</text>
              </g>
              {/* Mevcut satir */}
              <rect x="6" y="13" width="308" height="22" rx="2" fill="#fff" stroke="#cbd5e1" strokeWidth="0.6" />
              <text x="14" y="27" fontSize="6.5" fill="#1e293b" fontWeight="700">01</text>
              <text x="36" y="27" fontSize="6" fill="#475569" fontWeight="600">SMC</text>
              <text x="70" y="27" fontSize="6" fill="#1e293b" fontFamily="monospace" fontWeight="700">AS1201F-M5</text>
              {/* Aciklama hucresi — eski->yeni gecisi */}
              <foreignObject x="125" y="15" width="122" height="18">
                <div style={{
                  height: '100%', display: 'flex', alignItems: 'center',
                  fontSize: 6.2, color: '#1e293b', position: 'relative', fontWeight: 500,
                }}>
                  <span style={{ animation: 'meba-text-fade-out 5s ease-in-out infinite', position: 'absolute' }}>Hava filtresi</span>
                  <span style={{ animation: 'meba-text-fade-in 5s ease-in-out infinite', position: 'absolute', color: '#92400e', fontWeight: 700 }}>Hava filtresi 1/4 NPT</span>
                </div>
              </foreignObject>
              <text x="254" y="27" fontSize="6.2" fill="#1e293b" fontWeight="700">125 €</text>
              {/* Modal — DB guncelle */}
              <g style={{ animation: 'meba-modal-pop 5s ease-in-out infinite' }}>
                <rect x="34" y="42" width="252" height="60" rx="3" fill="#fff" stroke="#cbd5e1" strokeWidth="0.7" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.18))" />
                <rect x="34" y="42" width="252" height="14" fill="#f8fafc" />
                <text x="44" y="52" fontSize="6.5" fill="#1e293b" fontWeight="800">Açıklama Güncellensin mi?</text>
                <text x="44" y="68" fontSize="5.6" fill="#475569">Veritabanındaki açıklama da yenilensin mi?</text>
                <text x="44" y="78" fontSize="5.2" fill="#94a3b8">Bir dahaki seferde otomatik gelecek.</text>
                <rect x="174" y="84" width="58" height="14" rx="2.5" fill="#5b8def" />
                <text x="181" y="93.5" fontSize="6" fill="#fff" fontWeight="800">Güncelle</text>
                <rect x="238" y="84" width="40" height="14" rx="2.5" fill="#fff" stroke="#cbd5e1" strokeWidth="0.6" />
                <text x="249" y="93.5" fontSize="5.6" fill="#475569" fontWeight="600">İptal</text>
              </g>
              {/* Cursor "Guncelle" butonuna gider */}
              <g style={{ animation: 'meba-cursor-pick-modal 5s ease-in-out infinite' }}>
                <path
                  d="M 197 88 L 197 103 L 201 99 L 204 105 L 206.5 104 L 203.5 98 L 209 98 Z"
                  fill="#1e293b" stroke="#fff" strokeWidth="0.8"
                />
              </g>
            </svg>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5b8def', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Açıklama Düzelt → DB Senkron
            </div>
          </div>

          <div style={{ width: 1, background: 'rgba(99,179,237,0.18)' }} />

          <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💡</span>
              <span>Ürün Kodu & Açıklama — Sonuçları</span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              <div style={{ marginBottom: 3 }}>
                <b>Ürün kodu</b> yazıp öneriden seçtiğinde: <b>Marka, Açıklama, Birim Fiyat</b> ve <b>Birim</b> alanları otomatik dolar — boş hücrelerin hepsi DB'deki son değerle gelir.
              </div>
              <div>
                <b>Açıklamayı düzelttiğinde</b> "Veritabanı da güncellensin mi?" diye sorar. <b>Güncelle</b> dersen bir dahaki sefer aynı ürün seçilince <b>yeni açıklama</b> otomatik gelir.
              </div>
              {akilliHucrelerSayisi < TAVSIYE_MAX - 1 && (
                <div style={{ marginTop: 5, fontSize: 11, color: '#94a3b8' }}>
                  {TAVSIYE_MAX - akilliHucrelerSayisi} kez daha
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAkilliHucrelerKapatildi(true)}
            aria-label="Tavsiyeyi kapat"
            title="Bu mesajı kapat"
            style={{
              position: 'absolute', top: 6, right: 8,
              background: 'transparent', border: 'none', color: '#94a3b8',
              cursor: 'pointer', padding: 4, fontSize: 14, lineHeight: 1, borderRadius: 4,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Kısmi Onay seçim modu banner'ı — A4 sayfasında satır işaretleme
          aktifken görünür. Sticky top: kullanıcı sayfayı scroll etse de
          görmeye devam eder. Tamamla/Vazgeç burada. */}
      {kismiSecimAktif && kismiOzet && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 18px',
            background: 'linear-gradient(180deg, #fef9c3 0%, #fef3c7 100%)',
            borderBottom: '1px solid #f59e0b',
            color: '#78350f',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.18)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em' }}>
              Kısmi Onay — Müşterinin reddettiği kalemleri A4 üzerinde tıklayıp <span style={{ color: '#dc2626' }}>✕</span> işaretleyin
            </div>
            <div style={{ fontSize: 11.5, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>
                <b style={{ color: '#059669' }}>{kismiOzet.onayli}</b> onaylanacak
                {' · '}
                <b style={{ color: '#dc2626' }}>{kismiOzet.iptal}</b> reddedilecek
                {' '}
                <span style={{ color: '#92400e', opacity: 0.7 }}>/ {kismiOzet.toplamSayi}</span>
              </span>
              {kismiOzet.aktifPb.length > 0 && (
                <span style={{ fontVariantNumeric: 'tabular-nums', color: '#065f46', fontWeight: 600 }}>
                  Onaylı ara toplam:{' '}
                  {kismiOzet.aktifPb.map((pb, i) => (
                    <span key={pb}>
                      {i > 0 && ' · '}
                      {formatCurrency(kismiOzet.toplamlar[pb], pb)}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleKismiVazgec}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#78350f',
              background: '#fef9c3',
              border: '1px solid #f59e0b',
              cursor: 'pointer',
              lineHeight: 1.3,
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fde68a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fef9c3'; }}
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleKismiTamamla}
            style={{
              padding: '7px 16px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              color: '#ffffff',
              background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
              border: '1px solid #166534',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(22, 101, 52, 0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
              lineHeight: 1.3,
              transition: 'filter 120ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.07)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            Tamamla
          </button>
        </div>
      )}

      {/* Revize bar — kapalı durumda (gönderildi/sonuçlanmış) düzenleme
          için kullanıcı yönlendirilir. İnce şerit: tek satır, kompakt. */}
      {kilitli && !kismiSecimAktif && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '3px 14px',
          background: 'rgba(124,58,237,0.08)',
          borderBottom: '1px solid rgba(124,58,237,0.28)',
          color: '#5b21b6',
          fontSize: 11.5,
          lineHeight: 1.4,
        }}>
          <span style={{ fontSize: 12 }}>⟳</span>
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <b>{DURUM_ETIKET[state.durum] || state.durum}</b> · Düzenlemek için yeni revize oluşturulur.
          </span>
          <button
            type="button"
            onClick={revizeOnayAc}
            style={{
              padding: '2px 10px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              color: '#ffffff',
              background: '#7c3aed',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              lineHeight: 1.5,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#6d28d9'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#7c3aed'; }}
          >
            Yeni Revize
          </button>
        </div>
      )}

      {/* Ana alan: Belge + Panel */}
      <div
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
          {canliTeklifObj ? (
            <CanliA4Belge
              teklif={canliTeklifObj}
              editingAlan={editingAlan}
              onEditingAlanDegistir={setEditingAlan}
              onCariDegistir={state.setCari}
              onCariEPostaDegistir={state.setCariEPosta}
              onCariTelefonDegistir={state.setCariTelefon}
              onCariSehirDegistir={state.setCariSehir}
              contactName={state.contactName}
              contactTitle={state.contactTitle}
              onContactNameDegistir={state.setContactName}
              onContactTitleDegistir={state.setContactTitle}
              onTarihDegistir={state.setTarih}
              onParaBirimiDegistir={state.setParaBirimi}
              satirBazliParaBirimi={state.satirBazliParaBirimi}
              onSatirBazliParaBirimiDegistir={state.setSatirBazliParaBirimi}
              satirBazliIskonto={state.satirBazliIskonto}
              onSatirBazliIskontoDegistir={state.setSatirBazliIskonto}
              onKdvOraniDegistir={state.setKdvOrani}
              onOdemeVadesiDegistir={state.setOdemeVadesi}
              onGecerlilikSuresiDegistir={state.setGecerlilikSuresi}
              onDovizKuruDegistir={state.setDovizKuru}
              onSatirGuncelle={state.satirGuncelle}
              onSatiraSetUygula={wrappedSatiraSetUygula}
              onSatirSil={wrappedSatirSil}
              onSatirEkle={wrappedSatirEkle}
              onSatirArayaEkle={wrappedSatirArayaEkle}
              pushUndo={pushUndo}
              getSnapshot={getSnapshot}
              onNotlarDegistir={state.setNotlar}
              onKargoNotuMetniDegistir={state.setKargoNotuMetni}
              onKargoNotuGizliDegistir={state.setKargoNotuGizli}
              sablonRef={sablonRef}
              kompaktHeaderRef={kompaktHeaderRef}
              readOnly={modeKilitli}
              gorseller={state.gorseller}
              onGorselGuncelle={state.gorselGuncelle}
              onGorselSil={state.gorselSil}
              kismiOnaySecim={
                kismiSecimAktif
                  ? { iptalSet: kismiIptalSet, onToggle: handleKismiSatirToggle }
                  : undefined
              }
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'calc(100vh - 160px)',
              padding: '24px 16px',
              boxSizing: 'border-box',
            }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 560,
                  padding: '40px 36px 32px',
                  borderRadius: 20,
                  // Glass / soft gradient: kurumsal ve sade
                  background: `linear-gradient(180deg, ${C.bgElevated || C.bgSurface} 0%, ${C.bgSurface} 100%)`,
                  border: `1px solid ${C.border}`,
                  boxShadow: '0 20px 60px -24px rgba(15, 23, 42, 0.35), 0 4px 16px -8px rgba(15, 23, 42, 0.18)',
                  // overflow:hidden glow taşmasını keserdi ama Antd Select dropdown'u da kesiyordu.
                  // Dropdown getPopupContainer ile body'ye taşındığı için artık gerekli değil.
                  overflow: 'visible',
                }}
              >
                {/* Hafif glow — üstte */}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: -120,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 360,
                    height: 240,
                    background: 'radial-gradient(closest-side, rgba(30,58,95,0.18), transparent 70%)',
                    filter: 'blur(8px)',
                    pointerEvents: 'none',
                  }}
                />

                {/* İkon — kurumsal, küçük ama etkili */}
                <div
                  style={{
                    position: 'relative',
                    width: 64,
                    height: 64,
                    margin: '0 auto 20px',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1E3A5F 0%, #2C5282 100%)',
                    boxShadow: '0 10px 24px -10px rgba(30, 58, 95, 0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <circle cx="12" cy="14" r="2.4" />
                    <path d="M8 19c0-2 1.8-3.4 4-3.4S16 17 16 19" />
                  </svg>
                </div>

                <h2
                  style={{
                    margin: 0,
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: -0.2,
                    color: C.textPrimary,
                  }}
                >
                  Müşteri Seçerek Başlayın
                </h2>
                <p
                  style={{
                    margin: '10px auto 24px',
                    textAlign: 'center',
                    maxWidth: 420,
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: C.textSecondary || C.textFaint,
                  }}
                >
                  Teklif hazırlamak için önce müşteri seçin. Müşteri bilgileri seçildiğinde
                  teklif formu otomatik olarak hazırlanacaktır.
                </p>

                {/* Ana aksiyon — mevcut CariSecimi (search + yeni cari ekle) */}
                <div style={{ position: 'relative' }}>
                  <CariSecimi value={null} onChange={state.setCari} />
                </div>

                {/* İkincil bilgi — zarif chip'ler */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    justifyContent: 'center',
                    marginTop: 24,
                  }}
                >
                  {[
                    'Müşteri bilgileri otomatik doldurulur',
                    'Teklif numarası korunur',
                    'Ürün satırları sonra eklenir',
                  ].map((metin) => (
                    <span
                      key={metin}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        fontSize: 11.5,
                        fontWeight: 500,
                        color: C.textSecondary || C.textFaint,
                        background: C.bgSurface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 999,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: '#2C5282',
                          flexShrink: 0,
                        }}
                      />
                      {metin}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Serbest Çizim Canvas Overlay — daima mount; aktif=false iken
              canvas pointer-events kapalı, toolbar gizli, ama çizimler DOM'da
              kaldığı için belgenin üzerinde görünür kalır. Aynı butona tekrar
              basıldığında editlenebilir hale geri döner. */}
          {teklifObj && (
            <SerberstCizimOverlay
              canvasRef={cizimCanvasRef}
              renkRef={cizimRenk}
              kalinlikRef={cizimKalinlik}
              ciziyorRef={cizimCiziyor}
              sonKonumRef={cizimSonKonum}
              aktif={cizimModu}
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
      {kumandaPaneliGoster && (
        <KumandaPaneli
          readOnly={modeKilitli}
          onReadOnlyDegistir={handleModeKilitliDegistir}
          kdvOrani={state.kdvOrani}
          onKdvOraniDegistir={state.setKdvOrani}
          iskontoOrani={state.iskontoOrani}
          onIskontoOraniDegistir={state.setIskontoOrani}
          notlarGosterilsin={state.notlarGosterilsin}
          onNotlarGosterilsinDegistir={state.setNotlarGosterilsin}
          sagPanelOpen={state.panelModu !== null}
          cellPopupOpen={
            typeof editingAlan === 'string' && editingAlan.startsWith('satir-')
          }
          onResimEkle={handleResimEkle}
          visibility={state.visibility}
          onVisibilityDegistir={state.setVisibility}
          serberstCizimAktif={cizimModu}
          onSerberstCizimToggle={() => setCizimModu((v) => !v)}
          canUndo={undoRedo.canUndo}
          canRedo={undoRedo.canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      )}

      <IlgiliKisiSecimModal
        key={ilgiliKisiModalAcik ? `open-${state.ilgiliKisiId ?? 'yeni'}` : 'closed-ilgili'}
        open={ilgiliKisiModalAcik}
        onClose={() => setIlgiliKisiModalAcik(false)}
        teklifFirmaId={teklifObj?.firmaId ?? aktifFirma?.id}
        mevcutId={state.ilgiliKisiId}
        mevcutAdSoyad={state.ilgiliKisiAdSoyad}
        onSec={(id, ad) => state.setIlgiliKisi(id, ad)}
      />

      <SonucModal
        key={sonucModalDurum ?? 'closed-sonuc'}
        open={sonucModalDurum !== null}
        teklif={sonucModalTeklif}
        onClose={() => setSonucModalDurum(null)}
        onSave={handleSonucKaydet}
      />

      <MailComposeModal
        open={mailCtx !== null}
        context={mailCtx}
        onClose={() => setMailCtx(null)}
        onSent={() => { void handleMailSent(); }}
      />

      <SelfServeSmtpModal
        open={smtpSetupOpen}
        onClose={() => { setSmtpSetupOpen(false); setPendingMailCtx(null); }}
        onCompleted={() => {
          setSmtpSetupOpen(false);
          // Kullanıcı bilgisini tazele ki smtpPasswordSet doğru gelsin
          void refreshKullanici();
          // Pending compose context'i varsa şimdi onunla compose modal'ı aç
          if (pendingMailCtx) {
            setMailCtx(pendingMailCtx);
            setPendingMailCtx(null);
          }
        }}
      />

      {/* Rehber sistemi — useSayfaRehberi hook'u TipSpotlight + 🎓 buton'u
          tek seferde render eder. Davranis hook icindedir; sayfa sadece pool ve
          yanEtki handler'larini verir. */}
      {rehber.render()}
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
  /** true: canvas etkileşimi açık + toolbar görünür. false: çizimler DOM'da kalır
   *  ama düzenlenemez/silinemez (toolbar gizli, canvas pointer-events kapalı). */
  aktif: boolean;
  onKapat: () => void;
}

const RENKLER = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#000000', '#FFFFFF'];
const KALINLIKLAR = [2, 4, 8, 14];

function SerberstCizimOverlay({
  canvasRef, renkRef, kalinlikRef, ciziyorRef, sonKonumRef, aktif, onKapat,
}: SerberstCizimOverlayProps) {
  // Initial değerler parent'tan paylaşılan ref'lerden gelir; ref.current
  // burada sadece mount anında lazy init function içinden bir kez okunur,
  // render scope'ta yan etki üretmez. Plugin yine de "render'da ref'a
  // erişim" diye flag'lemek istiyor; bu spesifik durum güvenli — overlay
  // mount edildiğinde çizim ref'leri zaten valid baş değerlere sahiptir.
  // eslint-disable-next-line react-hooks/refs
  const [aktifRenk, setAktifRenk] = useState<string>(() => renkRef.current);
  // eslint-disable-next-line react-hooks/refs
  const [aktifKalinlik, setAktifKalinlik] = useState<number>(() => kalinlikRef.current);
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
      {/* Çizim canvas — daima mount, çizimler korunur. aktif=false iken
          pointer-events kapalı (etkileşim yok) ama görünür kalır. */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: aktif ? 'all' : 'none',
          cursor: aktif ? (silgiModu ? 'cell' : 'crosshair') : 'default',
          touchAction: 'none',
        }}
        onMouseDown={aktif ? basla : undefined}
        onMouseMove={aktif ? ciz : undefined}
        onMouseUp={aktif ? bitir : undefined}
        onMouseLeave={aktif ? bitir : undefined}
        onTouchStart={aktif ? basla : undefined}
        onTouchMove={aktif ? ciz : undefined}
        onTouchEnd={aktif ? bitir : undefined}
      />

      {/* Araç çubuğu — sadece çizim aktifken görünür */}
      {aktif && (
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

        {/* Kilitle — çizim modunu kapatır ama çizimler belgede kalır */}
        <button
          type="button"
          title="Çizimi Kilitle (çizimler kalır, düzenlenemez)"
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
            color: 'rgba(255,255,255,0.85)',
            fontSize: 14,
          }}
        >
          🔒
        </button>
      </div>
      )}
    </div>
  );
}
