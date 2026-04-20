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
import { referansVeriService, VARSAYILAN_MARKA } from '../services/referansVeriService';
import { sanitizeMultilineText } from '../utils/formatters';
import type { Teklif, Cari, TeklifSatiri, TeklifDurum } from '../types';
import dayjs from 'dayjs';

export type PanelModu = 'musteri' | 'ayarlar' | 'satir' | 'notlar' | null;

export interface BelgeState {
  // ── Teklif verisi ──
  teklifId: string;
  teklifNo: string;
  teklifNoDurumu: 'hazir' | 'yukleniyor' | 'hata';
  tarih: string;
  cari: Cari | null;
  satirlar: TeklifSatiri[];
  paraBirimi: string;
  satirBazliParaBirimi: boolean;
  durum: TeklifDurum;
  notlar: string;
  kdvOrani: number;
  iskontoOrani: number;
  odemeVadesi: string;
  contactName: string;
  contactTitle: 'BEY' | 'HANIM';
  olusturmaTarihi: string;
  hazirlayanKullaniciId?: string;
  hazirlayanAdSoyad?: string;
  hazirlayanRol?: string;

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
  setContactName: (name: string) => void;
  setContactTitle: (title: 'BEY' | 'HANIM') => void;

  // Satırlar
  setSatirlar: (satirlar: TeklifSatiri[]) => void;
  satirEkle: () => void;
  satirArayaEkle: (afterIndex: number) => void;
  satirSil: (id: string) => void;
  satirGuncelle: (id: string, alan: keyof TeklifSatiri, deger: unknown) => void;

  // Parametreler
  setParaBirimi: (pb: string) => void;
  setSatirBazliParaBirimi: (aktif: boolean) => void;
  setKdvOrani: (oran: number) => void;
  setIskontoOrani: (oran: number) => void;
  setOdemeVadesi: (vade: string) => void;
  setDurum: (durum: TeklifDurum) => void;
  setTarih: (tarih: string) => void;
  setNotlar: (notlar: string) => void;

  // Panel
  setPanelModu: (mod: PanelModu) => void;
  setSeciliSatirId: (id: string | null) => void;
  setHoverSatirId: (id: string | null) => void;
  satirSec: (id: string) => void;

  // PDF
  setPdfBlob: (blob: Blob | null) => void;
  setPdfHazir: (hazir: boolean) => void;
  setUretiliyor: (uretiliyor: boolean) => void;

  // Kayıt
  teklifOlustur: () => Teklif;
  kaydet: () => Promise<boolean>;
}

interface KullaniciBilgisi {
  id: string;
  adSoyad: string;
  rol: string;
}

export function useBelgeState(
  mevcutId: string | undefined,
  kullanici: KullaniciBilgisi | null,
): BelgeState & BelgeActions {
  const mevcut = mevcutId ? teklifService.teklifGetir(mevcutId) : null;
  const birimler = referansVeriService.birimler.tumunuGetir();

  const [teklifId] = useState(() => mevcut ? mevcutId! : teklifService.teklifIdUret());
  const [teklifNo, setTeklifNo] = useState(mevcut?.teklifNo ?? '...');
  const [teklifNoDurumu, setTeklifNoDurumu] = useState<'hazir' | 'yukleniyor' | 'hata'>(
    mevcut ? 'hazir' : 'yukleniyor',
  );
  const [tarih, setTarih] = useState(mevcut?.tarih ?? dayjs().format('YYYY-MM-DD'));
  const [cari, setCariState] = useState<Cari | null>(mevcut?.cari ?? null);
  const [satirlar, setSatirlarState] = useState<TeklifSatiri[]>(mevcut?.satirlar ?? []);
  const [paraBirimi, setParaBirimiState] = useState(mevcut?.paraBirimi ?? 'EUR');
  const [satirBazliParaBirimi, setSatirBazliParaBirimiState] = useState(mevcut?.satirBazliParaBirimi ?? false);
  const [durum, setDurumState] = useState<TeklifDurum>(mevcut?.durum ?? 'taslak');
  const [notlar, setNotlarState] = useState(mevcut?.notlar ?? '');
  const [kdvOrani, setKdvOraniState] = useState(mevcut?.kdvOrani ?? 0);
  const [iskontoOrani, setIskontoOraniState] = useState(mevcut?.iskontoOrani ?? 0);
  const [odemeVadesi, setOdemeVadesiState] = useState(mevcut?.odemeVadesi ?? '45 Gün');
  const [contactName, setContactNameState] = useState(mevcut?.contactName ?? '');
  const [contactTitle, setContactTitleState] = useState<'BEY' | 'HANIM'>(mevcut?.contactTitle ?? 'BEY');
  const [olusturmaTarihi] = useState(mevcut?.olusturmaTarihi ?? dayjs().toISOString());

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
    setCariState(secilen);
    if (secilen.lastContactName) {
      setContactNameState(secilen.lastContactName);
      setContactTitleState(secilen.lastContactTitle ?? 'BEY');
    } else {
      setContactNameState(secilen.yetkiliKisi ?? '');
      setContactTitleState('BEY');
    }
  }, []);

  const setContactName = useCallback((name: string) => {
    setContactNameState(name);
    if (cari) cariService.cariMuhatapGuncelle(cari.id, name.trim(), contactTitle);
  }, [cari, contactTitle]);

  const setContactTitle = useCallback((title: 'BEY' | 'HANIM') => {
    setContactTitleState(title);
    if (cari) cariService.cariMuhatapGuncelle(cari.id, contactName.trim(), title);
  }, [cari, contactName]);

  const setSatirlar = useCallback((yeniSatirlar: TeklifSatiri[]) => {
    setSatirlarState(yeniSatirlar);
  }, []);

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
    setSatirlarState(prev => [...prev, yeni]);
    setSeciliSatirId(yeni.id);
  }, [paraBirimi, birimler]);

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
      return next;
    });
    setSeciliSatirId(yeni.id);
  }, [paraBirimi, birimler]);

  const satirSil = useCallback((id: string) => {
    setSatirlarState(prev => prev.filter(s => s.id !== id));
    if (seciliSatirId === id) {
      setSeciliSatirId(null);
      setPanelModu(null);
    }
  }, [seciliSatirId]);

  const satirGuncelle = useCallback((id: string, alan: keyof TeklifSatiri, deger: unknown) => {
    setSatirlarState(prev => prev.map(s => {
      if (s.id !== id) return s;
      const g = { ...s, [alan]: deger };
      return { ...g, satirToplami: hesaplamaMotoru.satirToplamHesapla(g) };
    }));
  }, []);

  const setParaBirimi = useCallback((pb: string) => {
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

  const teklifOlustur = useCallback((): Teklif => {
    return {
      id: teklifId,
      teklifNo,
      tarih,
      satirBazliParaBirimi,
      paraBirimi,
      durum,
      cari: cari!,
      satirlar,
      araToplam: hesaplanan.araToplam,
      toplamIndirim: hesaplanan.toplamIndirim,
      toplamVergi: hesaplanan.kdvTutar,
      genelToplam: hesaplanan.genelToplam,
      kdvOrani,
      iskontoOrani,
      odemeVadesi,
      notlar: sanitizeMultilineText(notlar),
      olusturmaTarihi,
      guncellemeTarihi: dayjs().toISOString(),
      hazirlayanKullaniciId: kullanici?.id,
      hazirlayanAdSoyad: kullanici?.adSoyad,
      hazirlayanRol: kullanici?.rol,
      gecerlilikSuresi: '1 Hafta',
      contactName: contactName.trim() || undefined,
      contactTitle: contactName.trim() ? contactTitle : undefined,
    };
  }, [teklifId, teklifNo, tarih, satirBazliParaBirimi, paraBirimi, durum, cari, satirlar, hesaplanan, kdvOrani, iskontoOrani, odemeVadesi, notlar, olusturmaTarihi, kullanici, contactName, contactTitle]);

  const kaydet = useCallback(async (): Promise<boolean> => {
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
    };
    teklifService.teklifKaydet(teklif);
    return true;
  }, [cari, satirlar, teklifNo, teklifNoDurumu, teklifOlustur]);

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
    durum,
    notlar,
    kdvOrani,
    iskontoOrani,
    odemeVadesi,
    contactName,
    contactTitle,
    olusturmaTarihi,
    hazirlayanKullaniciId: kullanici?.id,
    hazirlayanAdSoyad: kullanici?.adSoyad,
    hazirlayanRol: kullanici?.rol,
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
    setContactName,
    setContactTitle,
    setSatirlar,
    satirEkle,
    satirArayaEkle,
    satirSil,
    satirGuncelle,
    setParaBirimi,
    setSatirBazliParaBirimi,
    setKdvOrani: setKdvOraniState,
    setIskontoOrani: setIskontoOraniState,
    setOdemeVadesi: setOdemeVadesiState,
    setDurum: setDurumState,
    setTarih,
    setNotlar: setNotlarState,
    setPanelModu,
    setSeciliSatirId,
    setHoverSatirId,
    satirSec,
    setPdfBlob,
    setPdfHazir,
    setUretiliyor,
    teklifOlustur,
    kaydet,
  };
}
