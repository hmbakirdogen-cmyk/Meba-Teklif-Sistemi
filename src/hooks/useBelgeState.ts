/**
 * useBelgeState.ts
 * ─────────────────────────────────────────────────────────────────
 * Tek belge merkezli durum yönetimi.
 * Tüm teklif verisi + düzenleme bağlamı tek yerde.
 *
 * Panel modu: belgedeki tıklanan alana göre sağ panelin içeriğini belirler.
 * - 'musteri'   → Cari/müşteri detay düzenleme
 * - 'ayarlar'   → Teklif parametreleri (para birimi, ödeme, KDV, iskonto, durum)
 * - 'satir'     → Seçili ürün satırı detay düzenleme
 * - 'notlar'    → Notlar düzenleme
 * - null        → Panel kapalı
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { hesaplamaMotoru } from '../services/hesaplamaMotoru';
import { teklifService } from '../services/teklifService';
import { cariService } from '../services/musteriService';
import { urunSetService } from '../services/urunSetService';
import { referansVeriService, VARSAYILAN_MARKA } from '../services/referansVeriService';
import { sanitizeMultilineText } from '../utils/formatters';
import type { Teklif, Cari, TeklifSatiri, TeklifDurum, ParaBirimi, ImageItem, TeklifStatus, TeklifVisibility } from '../types';
import dayjs from 'dayjs';

const DEFAULT_TEKLIF_EMAIL = 'info@mebamekanik.com';

function cariEpostaVarsayilanla(cari: Cari): Cari {
  const email = (cari.ePosta ?? '').trim();
  return { ...cari, ePosta: email || DEFAULT_TEKLIF_EMAIL };
}


export type PanelModu = 'musteri' | 'satir' | 'notlar' | null;

export interface BelgeState {
  // ── Teklif verisi ──
  teklifId: string;
  teklifNo: string;
  teklifNoDurumu: 'hazir' | 'yukleniyor' | 'hata';
  tarih: string;
  cari: Cari | null;
  satirlar: TeklifSatiri[];
  paraBirimi: ParaBirimi;
  satirBazliParaBirimi: boolean;
  satirBazliIskonto: boolean;
  durum: TeklifDurum;
  notlar: string;
  notlarGosterilsin: boolean;
  kdvOrani: number;
  iskontoOrani: number;
  odemeVadesi: string;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM';
  olusturmaTarihi: string;
  hazirlayanKullaniciId?: string;
  /** Mevcut teklifin orijinal sahibi — yeni teklifte undefined. Sahiplik kontrolü için kullanılır. */
  teklifSahibiId?: string;
  hazirlayanAdSoyad?: string;
  hazirlayanRol?: string;
  hazirlayanUnvan?: string;
  gorseller: ImageItem[];
  status: TeklifStatus;
  visibility: TeklifVisibility;

  // ── Düzenleme bağlamı ──
  panelModu: PanelModu;
  seciliSatirId: string | null;
  hoverSatirId: string | null;

  // ── PDF durumu ──
  pdfBlob: Blob | null;
  pdfHazir: boolean;
  uretiliyor: boolean;

  // ── Hesaplanan değerler ──
  araToplam: number;
  toplamIndirim: number;
  toplamVergi: number;
  genelToplam: number;
}

interface BelgeActions {
  // Cari
  setCari: (cari: Cari) => void;
  setCariEPosta: (email: string) => void;
  setContactName: (name: string) => void;
  setContactTitle: (title: 'BEY' | 'HANIM') => void;

  // Satırlar
  setSatirlar: (satirlar: TeklifSatiri[]) => void;
  satirEkle: () => void;
  satirArayaEkle: (afterIndex: number) => void;
  satirSil: (id: string) => void;
  satirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;
  satiraSetUygula: (satirId: string, setId: string) => void;

  // Parametreler
  setParaBirimi: (pb: ParaBirimi) => void;
  setSatirBazliParaBirimi: (aktif: boolean) => void;
  setSatirBazliIskonto: (aktif: boolean) => void;
  setKdvOrani: (oran: number) => void;
  setIskontoOrani: (oran: number) => void;
  setOdemeVadesi: (vade: string) => void;
  setDurum: (durum: TeklifDurum) => void;
  setTarih: (tarih: string) => void;
  setNotlar: (notlar: string) => void;
  setNotlarGosterilsin: (v: boolean) => void;

  // Panel
  setPanelModu: (mod: PanelModu) => void;
  setSeciliSatirId: (id: string | null) => void;
  setHoverSatirId: (id: string | null) => void;
  satirSec: (id: string) => void;

  // PDF
  setPdfBlob: (blob: Blob | null) => void;
  setPdfHazir: (hazir: boolean) => void;
  setUretiliyor: (uretiliyor: boolean) => void;

  // Görseller
  gorselEkle: (src: string, defaults?: Partial<Pick<ImageItem, 'width' | 'height' | 'pageIndex'>>) => string;
  gorselGuncelle: (id: string, partial: Partial<Omit<ImageItem, 'id'>>) => void;
  gorselSil: (id: string) => void;

  // Kayıt
  teklifOlustur: () => Teklif;
  kaydet: () => Promise<boolean>;
  /** Belirtilen status ile zorla kaydet (PDF/email akışında "kaydedildi"/"gonderildi" set eder). */
  kaydetWithStatus: (status: TeklifStatus) => Promise<boolean>;

  // Görünürlük yetkisi (private = gizli, team = ekibe açık)
  setVisibility: (v: TeklifVisibility) => void;
}

interface KullaniciBilgisi {
  id: string;
  adSoyad: string;
  rol: string;
  unvan?: string;
}

export function useBelgeState(
  mevcutId: string | undefined,
  kullanici: KullaniciBilgisi | null,
): BelgeState & BelgeActions {
  const mevcut = mevcutId ? teklifService.teklifGetir(mevcutId) : null;
  const birimler = referansVeriService.birimler.tumunuGetir();
  // Mevcut teklifin orijinal sahibi — useRef ile tek seferinde sabitlenir.
  // teklifGetir her render'da çağrılır; autoSave sonrası store'daki sahip değişirse
  // bu ref etkilenmez ve kontrol geçerliliğini korur.
  const teklifSahibiIdRef = useRef<string | undefined>(mevcut?.hazirlayanKullaniciId);

  const [teklifId] = useState(() => mevcut ? mevcutId! : teklifService.teklifIdUret());
  const [teklifNo, setTeklifNo] = useState(mevcut?.teklifNo ?? '...');
  const [teklifNoDurumu, setTeklifNoDurumu] = useState<'hazir' | 'yukleniyor' | 'hata'>(
    mevcut ? 'hazir' : 'yukleniyor',
  );
  const [tarih, setTarih] = useState(mevcut?.tarih ?? dayjs().format('YYYY-MM-DD'));
  const [cari, setCariState] = useState<Cari | null>(mevcut?.cari ? cariEpostaVarsayilanla(mevcut.cari) : null);
  const [satirlar, setSatirlarState] = useState<TeklifSatiri[]>(mevcut?.satirlar ?? []);
  const [paraBirimi, setParaBirimiState] = useState<ParaBirimi>(mevcut?.paraBirimi ?? 'EUR');
  const [satirBazliParaBirimi, setSatirBazliParaBirimiState] = useState(mevcut?.satirBazliParaBirimi ?? false);
  const [satirBazliIskonto, setSatirBazliIskontoState] = useState(mevcut?.satirBazliIskonto ?? false);
  const [durum, setDurumState] = useState<TeklifDurum>(mevcut?.durum ?? 'taslak');
  const [notlar, setNotlarState] = useState(mevcut?.notlar ?? '');
  // Geriye uyumluluk: alan tanımlı değilse, mevcut not metni varsa görünür kalır
  const [notlarGosterilsin, setNotlarGosterilsinState] = useState<boolean>(
    mevcut?.notlarGosterilsin ?? !!(mevcut?.notlar && mevcut.notlar.trim().length > 0)
  );
  const [kdvOrani, setKdvOraniState] = useState(mevcut?.kdvOrani ?? 0);
  const [iskontoOrani, setIskontoOraniState] = useState(mevcut?.iskontoOrani ?? 0);
  const [odemeVadesi, setOdemeVadesiState] = useState(mevcut?.odemeVadesi ?? '45 Gün');
  const [contactName, setContactNameState] = useState(mevcut?.contactName ?? '');
  const [contactTitle, setContactTitleState] = useState<'BEY' | 'HANIM'>(mevcut?.contactTitle ?? 'BEY');
  const [olusturmaTarihi] = useState(mevcut?.olusturmaTarihi ?? dayjs().toISOString());
  const [gorseller, setGorsellerState] = useState<ImageItem[]>(mevcut?.gorseller ?? []);
  const [status, setStatus] = useState<TeklifStatus>(mevcut?.status ?? 'taslak');
  // Görünürlük yetkisi: yeni teklifte rol-bazlı default
  //  - admin → 'private' (gizli) — yöneticinin teklifi varsayılan gizli
  //  - engineer/sales → 'team' (mevcut davranış: herkes görüyor)
  //  - mevcut teklifte: kayıttaki değer veya undefined → 'team' (geriye uyumluluk)
  const [visibility, setVisibilityState] = useState<TeklifVisibility>(() => {
    if (mevcut) return mevcut.visibility ?? 'team';
    return kullanici?.rol === 'admin' ? 'private' : 'team';
  });

  // Panel state — yalnızca araç çubuğundan erişilir (ikincil)
  const [panelModu, setPanelModu] = useState<PanelModu>(null);
  const [seciliSatirId, setSeciliSatirId] = useState<string | null>(null);
  const [hoverSatirId, setHoverSatirId] = useState<string | null>(null);

  // PDF state
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfHazir, setPdfHazir] = useState(false);
  const [uretiliyor, setUretiliyor] = useState(false);

  const teklifNoRef = useRef<Promise<string> | null>(null);

  // Teklif No üretimi
  useEffect(() => {
    if (!mevcut) {
      const promise = teklifService.teklifNoUretAsync();
      teklifNoRef.current = promise;
      promise
        .then((no) => { setTeklifNo(no); setTeklifNoDurumu('hazir'); })
        .catch(() => { setTeklifNo('ERR'); setTeklifNoDurumu('hata'); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hesaplanan değerler
  const hesaplanan = useMemo(() => {
    return hesaplamaMotoru.genelToplamHesapla(satirlar, kdvOrani, iskontoOrani);
  }, [satirlar, kdvOrani, iskontoOrani]);

  // ── Actions ──

  const setCari = useCallback((secilen: Cari) => {
    setCariState(cariEpostaVarsayilanla(secilen));
    if (secilen.lastContactName) {
      setContactNameState(secilen.lastContactName);
      setContactTitleState(secilen.lastContactTitle ?? 'BEY');
    } else {
      setContactNameState(secilen.yetkiliKisi ?? '');
      setContactTitleState('BEY');
    }
  }, []);

  const setCariEPosta = useCallback((email: string) => {
    if (!cari) return;
    const yeniCari: Cari = {
      ...cari,
      ePosta: email,
    };
    setCariState(yeniCari);
    cariService.cariKaydet(yeniCari);
  }, [cari]);

  const setContactName = useCallback((name: string) => {
    setContactNameState(name);
    if (cari) cariService.cariMuhatapGuncelle(cari.id, name.trim(), contactTitle);
  }, [cari, contactTitle]);

  const setContactTitle = useCallback((title: 'BEY' | 'HANIM') => {
    setContactTitleState(title);
    if (cari) cariService.cariMuhatapGuncelle(cari.id, contactName.trim(), title);
  }, [cari, contactName]);

  const satirDegisimiAnlikKaydet = useCallback((nextSatirlar: TeklifSatiri[]) => {
    if (!cari) return;
    if (nextSatirlar.length === 0) return;
    if (teklifNoDurumu !== 'hazir' || teklifNo === 'ERR') return;

    const normalizedCari = cariEpostaVarsayilanla(cari);
    const toplamlar = hesaplamaMotoru.genelToplamHesapla(nextSatirlar, kdvOrani, iskontoOrani);
    teklifService.teklifKaydet({
      id: teklifId,
      teklifNo,
      tarih,
      satirBazliParaBirimi,
      satirBazliIskonto,
      paraBirimi,
      durum,
      cari: normalizedCari,
      satirlar: nextSatirlar,
      araToplam: toplamlar.araToplam,
      toplamIndirim: toplamlar.toplamIndirim,
      toplamVergi: toplamlar.kdvTutar,
      genelToplam: toplamlar.genelToplam,
      kdvOrani,
      iskontoOrani,
      odemeVadesi,
      notlar: sanitizeMultilineText(notlar),
      notlarGosterilsin,
      olusturmaTarihi,
      guncellemeTarihi: dayjs().toISOString(),
      // Orijinal sahibi koru — mevcut teklifte hazirlayanKullaniciId değişmemeli
      hazirlayanKullaniciId: teklifSahibiIdRef.current ?? kullanici?.id,
      hazirlayanAdSoyad: kullanici?.adSoyad,
      hazirlayanRol: kullanici?.rol,
      hazirlayanUnvan: kullanici?.unvan,
      gecerlilikSuresi: '1 Hafta',
      contactName: contactName.trim() || undefined,
      contactTitle: contactName.trim() ? contactTitle : undefined,
      gorseller: gorseller.length > 0 ? gorseller : undefined,
      status: 'taslak',
      visibility,
    });
  }, [
    cari,
    teklifNoDurumu,
    teklifNo,
    teklifId,
    tarih,
    satirBazliParaBirimi,
    satirBazliIskonto,
    paraBirimi,
    durum,
    kdvOrani,
    iskontoOrani,
    odemeVadesi,
    notlar,
    notlarGosterilsin,
    olusturmaTarihi,
    kullanici,
    contactName,
    contactTitle,
    gorseller,
    visibility,
  ]);

  const setSatirlar = useCallback((yeniSatirlar: TeklifSatiri[]) => {
    setSatirlarState(yeniSatirlar);
    satirDegisimiAnlikKaydet(yeniSatirlar);
  }, [satirDegisimiAnlikKaydet]);

  const satirEkle = useCallback(() => {
    const yeni: TeklifSatiri = {
      id: hesaplamaMotoru.satirIdUret(),
      marka: VARSAYILAN_MARKA,
      urunKod: '',
      urunAdi: '',
      aciklama: '',
      paraBirimi: hesaplamaMotoru.varsayilanSatirParaBirimi(paraBirimi),
      miktar: 1,
      birim: birimler[0] ?? 'Adet',
      birimFiyat: 0,
      indirimOrani: 0,
      teslimTarihi: '2-3 Gün',
      satirToplami: 0,
    };
    setSatirlarState(prev => {
      const next = [...prev, yeni];
      satirDegisimiAnlikKaydet(next);
      return next;
    });
    setSeciliSatirId(yeni.id);
  }, [paraBirimi, birimler, satirDegisimiAnlikKaydet]);

  const satirArayaEkle = useCallback((afterIndex: number) => {
    const yeni: TeklifSatiri = {
      id: hesaplamaMotoru.satirIdUret(),
      marka: VARSAYILAN_MARKA,
      urunKod: '',
      urunAdi: '',
      aciklama: '',
      paraBirimi: hesaplamaMotoru.varsayilanSatirParaBirimi(paraBirimi),
      miktar: 1,
      birim: birimler[0] ?? 'Adet',
      birimFiyat: 0,
      indirimOrani: 0,
      teslimTarihi: '2-3 Gün',
      satirToplami: 0,
    };
    setSatirlarState(prev => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, yeni);
      satirDegisimiAnlikKaydet(next);
      return next;
    });
    setSeciliSatirId(yeni.id);
  }, [paraBirimi, birimler, satirDegisimiAnlikKaydet]);

  const satirSil = useCallback((id: string) => {
    setSatirlarState(prev => {
      const next = prev.filter((s) => s.id !== id && s.setAnaSatirId !== id);
      satirDegisimiAnlikKaydet(next);
      return next;
    });
    if (seciliSatirId === id) {
      setSeciliSatirId(null);
      setPanelModu(null);
    }
  }, [seciliSatirId, satirDegisimiAnlikKaydet]);

  const satirGuncelle = useCallback((id: string, alan: keyof TeklifSatiri, deger: unknown) => {
    setSatirlarState(prev => {
      const next = prev.map(s => {
        if (s.id !== id) return s;
        if (s.setAltKalem && (alan === 'birimFiyat' || alan === 'indirimOrani' || alan === 'teslimTarihi')) {
          return s;
        }
        const g = { ...s, [alan]: deger };
        if (g.setAltKalem) {
          return { ...g, birimFiyat: 0, indirimOrani: 0, satirToplami: 0 };
        }
        return { ...g, satirToplami: hesaplamaMotoru.satirToplamHesapla(g) };
      });
      satirDegisimiAnlikKaydet(next);
      return next;
    });
  }, [satirDegisimiAnlikKaydet]);

  const satiraSetUygula = useCallback((satirId: string, setId: string) => {
    const set = urunSetService.setGetir(setId);
    if (!set) return;

    setSatirlarState((prev) => {
      const parentIndex = prev.findIndex((s) => s.id === satirId);
      if (parentIndex < 0) return prev;

      const cleanList = prev.filter((s) => s.setAnaSatirId !== satirId);
      const nextParentIndex = cleanList.findIndex((s) => s.id === satirId);
      if (nextParentIndex < 0) return prev;

      const parent = cleanList[nextParentIndex];
      const updatedParent: TeklifSatiri = {
        ...parent,
        urunKod: set.setKod,
        aciklama: set.aciklama,
        setId: set.id,
        setAltKalem: false,
      };

      const altKalemler: TeklifSatiri[] = set.kalemler.map((kalem) => ({
        id: hesaplamaMotoru.satirIdUret(),
        marka: parent.marka || VARSAYILAN_MARKA,
        urunKod: kalem.urunKod,
        urunAdi: '',
        aciklama: kalem.aciklama,
        paraBirimi: parent.paraBirimi ?? hesaplamaMotoru.varsayilanSatirParaBirimi(paraBirimi),
        miktar: kalem.miktar,
        birim: kalem.birim || birimler[0] || 'Adet',
        birimFiyat: 0,
        indirimOrani: 0,
        teslimTarihi: parent.teslimTarihi || '2-3 Gün',
        satirToplami: 0,
        setId: set.id,
        setAnaSatirId: satirId,
        setAltKalem: true,
      }));

      const next = [...cleanList];
      next[nextParentIndex] = updatedParent;
      next.splice(nextParentIndex + 1, 0, ...altKalemler);
      satirDegisimiAnlikKaydet(next);
      return next;
    });
  }, [birimler, paraBirimi, satirDegisimiAnlikKaydet]);

  const setParaBirimi = useCallback((pb: ParaBirimi) => {
    setParaBirimiState(pb);
  }, []);

  const setSatirBazliParaBirimi = useCallback((aktif: boolean) => {
    setSatirBazliParaBirimiState(aktif);
    if (aktif) {
      setSatirlarState(prev => prev.map(satir => ({
        ...satir,
        paraBirimi: hesaplamaMotoru.satirParaBirimiGetir(satir, paraBirimi),
      })));
    }
  }, [paraBirimi]);

  const satirSec = useCallback((id: string) => {
    setSeciliSatirId(id);
  }, []);

  // ── Görseller ──────────────────────────────────────────────────────────
  const gorselEkle = useCallback((src: string, defaults?: Partial<Pick<ImageItem, 'width' | 'height' | 'pageIndex'>>): string => {
    const id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const yeni: ImageItem = {
      id,
      src,
      pageIndex: defaults?.pageIndex ?? 0,
      width: defaults?.width ?? 180,
      height: defaults?.height ?? 180,
      x: 0,
      y: 0,
      zIndex: 1,
    };
    setGorsellerState((prev) => [...prev, yeni]);
    return id;
  }, []);

  const gorselGuncelle = useCallback((id: string, partial: Partial<Omit<ImageItem, 'id'>>) => {
    setGorsellerState((prev) => prev.map((g) => (g.id === id ? { ...g, ...partial } : g)));
  }, []);

  const gorselSil = useCallback((id: string) => {
    setGorsellerState((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const teklifOlustur = useCallback((): Teklif => {
    const normalizedCari = cariEpostaVarsayilanla(cari!);

    return {
      id: teklifId,
      teklifNo,
      tarih,
      satirBazliParaBirimi,
      satirBazliIskonto,
      paraBirimi,
      durum,
      cari: normalizedCari,
      satirlar,
      araToplam: hesaplanan.araToplam,
      toplamIndirim: hesaplanan.toplamIndirim,
      toplamVergi: hesaplanan.kdvTutar,
      genelToplam: hesaplanan.genelToplam,
      kdvOrani,
      iskontoOrani,
      odemeVadesi,
      notlar: sanitizeMultilineText(notlar),
      notlarGosterilsin,
      olusturmaTarihi,
      guncellemeTarihi: dayjs().toISOString(),
      // Orijinal sahibi koru — mevcut teklifte hazirlayanKullaniciId değişmemeli
      hazirlayanKullaniciId: teklifSahibiIdRef.current ?? kullanici?.id,
      hazirlayanAdSoyad: kullanici?.adSoyad,
      hazirlayanRol: kullanici?.rol,
      hazirlayanUnvan: kullanici?.unvan,
      gecerlilikSuresi: '1 Hafta',
      contactName: contactName.trim() || undefined,
      contactTitle: contactName.trim() ? contactTitle : undefined,
      gorseller: gorseller.length > 0 ? gorseller : undefined,
      status,
      visibility,
    };
  }, [teklifId, teklifNo, tarih, satirBazliParaBirimi, satirBazliIskonto, paraBirimi, durum, cari, satirlar, hesaplanan, kdvOrani, iskontoOrani, odemeVadesi, notlar, notlarGosterilsin, olusturmaTarihi, kullanici, contactName, contactTitle, gorseller, status, visibility]);

  /**
   * Belirtilen status ile teklifi kaydet. PDF/email akışında çağrılır.
   * Eski kaydet() ile aynı validasyon (cari + en az 1 satır) — fakat
   * status alanını override eder.
   */
  const kaydetWithStatus = useCallback(async (newStatus: TeklifStatus): Promise<boolean> => {
    if (!cari) return false;
    if (satirlar.length === 0) return false;

    let no = teklifNo;
    if (teklifNoDurumu !== 'hazir' || teklifNo === 'ERR') {
      if (!teklifNoRef.current) return false;
      try {
        no = await teklifNoRef.current;
        setTeklifNo(no);
        setTeklifNoDurumu('hazir');
      } catch {
        return false;
      }
    }

    const teklif: Teklif = {
      ...teklifOlustur(),
      teklifNo: no,
      status: newStatus,
    };
    teklifService.teklifKaydet(teklif);
    setStatus(newStatus);
    return true;
  }, [cari, satirlar, teklifNo, teklifNoDurumu, teklifOlustur]);

  const kaydet = useCallback(async (): Promise<boolean> => {
    return kaydetWithStatus(status);
  }, [kaydetWithStatus, status]);

  // ── OTOMATİK TASLAK KAYDI ──────────────────────────────────────────────
  // Her ilgili state değişiminde:
  //   1) status "kaydedildi"/"gonderildi" ise "taslak"a döndür
  //   2) 600ms debounce ile sessizce arka planda persist et
  // Cari yoksa (yeni boş teklif) atla — teklifOlustur cari!'a bağlı.
  const autoSaveFirstRender = useRef(true);
  useEffect(() => {
    if (autoSaveFirstRender.current) {
      autoSaveFirstRender.current = false;
      return;
    }
    if (!cari) return;
    if (satirlar.length === 0) return;
    if (teklifNoDurumu !== 'hazir' || teklifNo === 'ERR') return;
    // Başkasının teklifine otomatik kayıt yapma
    if (teklifSahibiIdRef.current && kullanici?.id && teklifSahibiIdRef.current !== kullanici.id) return;

    // Status kaydedildi/gonderildi iken değişiklik → taslak
    if (status === 'kaydedildi' || status === 'gonderildi') {
      setStatus('taslak');
    }

    const t = setTimeout(() => {
      const teklif: Teklif = {
        ...teklifOlustur(),
        status: 'taslak',
      };
      teklifService.teklifKaydet(teklif);
    }, 600);
    return () => clearTimeout(t);
    // status'u DEPS'e EKLEME — kendi setStatus'umuz infinite loop'a yol açar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cari, satirlar, paraBirimi, satirBazliParaBirimi, satirBazliIskonto,
    kdvOrani, iskontoOrani, odemeVadesi, notlar, notlarGosterilsin,
    contactName, contactTitle,
    tarih, gorseller, durum, teklifNo, teklifNoDurumu, visibility,
  ]);

  return {
    // State
    teklifId,
    teklifNo,
    teklifNoDurumu,
    tarih,
    cari,
    satirlar,
    paraBirimi,
    satirBazliParaBirimi,
    satirBazliIskonto,
    durum,
    notlar,
    notlarGosterilsin,
    kdvOrani,
    iskontoOrani,
    odemeVadesi,
    contactName,
    contactTitle,
    olusturmaTarihi,
    hazirlayanKullaniciId: kullanici?.id,
    teklifSahibiId: teklifSahibiIdRef.current,
    hazirlayanAdSoyad: kullanici?.adSoyad,
    hazirlayanRol: kullanici?.rol,
    hazirlayanUnvan: kullanici?.unvan,
    gorseller,
    status,
    visibility,
    panelModu,
    seciliSatirId,
    hoverSatirId,
    pdfBlob,
    pdfHazir,
    uretiliyor,
    araToplam: hesaplanan.araToplam,
    toplamIndirim: hesaplanan.toplamIndirim,
    toplamVergi: hesaplanan.kdvTutar,
    genelToplam: hesaplanan.genelToplam,

    // Actions
    setCari,
    setCariEPosta,
    setContactName,
    setContactTitle,
    setSatirlar,
    satirEkle,
    satirArayaEkle,
    satirSil,
    satirGuncelle,
    satiraSetUygula,
    setParaBirimi,
    setSatirBazliParaBirimi,
    setSatirBazliIskonto: setSatirBazliIskontoState,
    setKdvOrani: setKdvOraniState,
    setIskontoOrani: setIskontoOraniState,
    setOdemeVadesi: setOdemeVadesiState,
    setDurum: setDurumState,
    setTarih,
    setNotlar: setNotlarState,
    setNotlarGosterilsin: setNotlarGosterilsinState,
    setPanelModu,
    setSeciliSatirId,
    setHoverSatirId,
    satirSec,
    setPdfBlob,
    setPdfHazir,
    setUretiliyor,
    gorselEkle,
    gorselGuncelle,
    gorselSil,
    teklifOlustur,
    kaydet,
    kaydetWithStatus,
    setVisibility: setVisibilityState,
  };
}
