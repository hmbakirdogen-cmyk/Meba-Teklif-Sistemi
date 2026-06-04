// ── RehberContext ───────────────────────────────────────────────────
// NE: Programın her sayfasından erişilebilen global rehber yöneticisi.
//     useSayfaRehberi hook'u mount'ta sayfanın TİP HAVUZUNU register eder;
//     AppLayout'taki global 🎓 Rehberler butonu (GlobalRehberFab) baslat()
//     çağırır, GlobalTipSpotlight aktif tip/hedefi DOĞRUDAN buradan okuyup
//     spotlight overlay'ini çizer.
//
// NEDEN (Faz 28 — KALICI ÇÖZÜM):
//     Eski tasarımda rehber PLAYBACK STATE'i (aktif tip/index/hedef)
//     useSayfaRehberi hook'unun içinde, yani SAYFA component'inde yaşıyordu.
//     FAB ve TipSpotlight ise AppLayout'ta (sayfanın DIŞINDA). İkisini
//     bağlamak için context'e her state değişiminde yeni bir "handle"
//     kaydedilip render bir `renderRef` closure'ı ile aktarılıyordu.
//     Bu köprü iki sorun üretti:
//       1) Faz 17–26 boyunca tekrarlayan React #185 döngüleri (re-register
//          churn) — defalarca yamandı, kök çözülmedi.
//       2) Race: baslat() aktifTip'i set edince context handle güncelleniyor
//          ama DOM hedefi (aktifHedef) 120ms polling ile SONRADAN bulunuyor;
//          GlobalTipSpotlight o ana kadar hedefi null olan stale render'ı
//          okuyor → TipSpotlight `if(!rect) return null` → ekranda HİÇBİR
//          ŞEY görünmüyor. Hedef sonradan bulunsa da GlobalTipSpotlight'ı
//          yeniden çizecek tetik yoktu.
//
//     ÇÖZÜM: Playback state'i bu Provider'ın TEK SAHİBİ yapıldı. Sayfa
//     yalnızca statik veri (havuz + sayfaAdi + hitap) ve yan-etki
//     callback'lerini register eder. aktifHedef değişince context value
//     değişir → GlobalTipSpotlight otomatik re-render → spotlight görünür.
//     renderRef köprüsü, re-register churn ve #185 riski tamamen kalktı.
//
// NASIL: 1) RehberProvider main.tsx'te en üstte sarmalar.
//        2) useSayfaRehberi mount'ta register({ pool, sayfaAdi, hitap, ... })
//           çağırır, unmount'ta unregister() ile temizler.
//        3) FAB baslat()/sonraki()/kapat() çağırır; bunlar Provider state'ini
//           günceller.
//        4) GlobalTipSpotlight aktifTip/aktifHedef/... değerlerini doğrudan
//           okuyup TipSpotlight'ı render eder.

/* eslint-disable react-refresh/only-export-components */
// Dosya hem RehberProvider component'ini hem context value tiplerini export
// ediyor. Fast Refresh için ayrı dosyaya bölmek karmaşıklığı artırır —
// KullaniciContext pattern'i ile uyumlu file-level disable. Hook
// (useRehberCtx) zaten ayrı dosyada (./useRehber.ts).
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { TipDef } from '../components/tipler/tipTipleri';

/**
 * Bir sayfanın rehber kaydı. useSayfaRehberi hook'u mount'ta register eder.
 * SADECE statik veri + yan-etki callback'leri — playback state'i DEĞİL
 * (o artık Provider'ın içinde tutulur).
 */
export interface RehberKayit {
  /** Rol filtresinden geçmiş tip havuzu. */
  pool: TipDef[];
  /** Diyalog/mesajlarda gösterilen sayfa adı (örn. "Teklif Editörü"). */
  sayfaAdi: string;
  /** Kibar hitap ("Mehmet Bey") — tip baslik/aciklama fonksiyonlarına geçer. */
  hitap: string;
  /** Tip aktifleşince yan etki tetiği (panel/modal açma vb.). */
  onYanEtki?: (tip: TipDef) => void;
  /** Tip değişince/bittiğinde yan etkiyi kapatma. */
  onYanEtkiKapat?: (oncekiTip: TipDef) => void;
}

export interface RehberCtxValue {
  // ── Kayıt (useSayfaRehberi tarafından çağrılır) ──
  register: (k: RehberKayit) => void;
  unregister: () => void;
  // ── FAB'ın okuduğu özet bilgi ──
  /** Bir sayfa register etmiş mi (rehber sistemi bu sayfada bağlı mı). */
  hazir: boolean;
  /** Havuz boş mu → FAB "yakında" mesajı gösterir, baslat() çağırmaz. */
  bos: boolean;
  sayfaAdi: string;
  // ── Playback API'si ──
  /** Rehber sequence'ini başlat — ilk uygun tip görünür. Hiç yoksa false. */
  baslat: () => boolean;
  /** Sıradaki uygun tipe geç; kalmadıysa sequence'i bitir. */
  sonraki: () => void;
  /** Sequence'i kapat (X / ESC / atla). */
  kapat: () => void;
  // ── GlobalTipSpotlight'ın okuduğu playback state ──
  aktifTip: TipDef | null;
  aktifIndex: number;
  aktifHedef: HTMLElement | null;
  aktifEkHedefler: HTMLElement[];
  /** Sequence toplam tip sayısı (step göstergesi için). */
  toplam: number;
  hitap: string;
}

// Context export'u burada — useRehberCtx hook'u ayrı dosyada (useRehber.ts)
// çünkü react-refresh/only-export-components kuralı dosyada yalnız komponent
// export'una izin veriyor. KullaniciContext pattern'i ile aynı yapı.
export const RehberContext = createContext<RehberCtxValue | null>(null);

/** İki HTMLElement dizisi eleman-bazlı eşit mi (gereksiz setState'i önler). */
function ayniHedefler(a: HTMLElement[], b: HTMLElement[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function RehberProvider({ children }: { children: ReactNode }) {
  // Kayıt — render'ı etkileyen kısmı (pool/sayfaAdi/hitap) state'te tutulur ki
  // FAB navigasyonda doğru "bos/sayfaAdi" görsün. En güncel callback'lere
  // senkron erişim için ayrıca ref'te de saklanır (aşağıda kayitRef).
  const [kayit, setKayit] = useState<RehberKayit | null>(null);
  const kayitRef = useRef<RehberKayit | null>(null);

  // ── Playback state — TEK SAHİP burası. Eski tasarımda hook içindeydi ──
  const [aktifTip, setAktifTip] = useState<TipDef | null>(null);
  const [aktifIndex, setAktifIndex] = useState<number>(-1);
  const [aktifHedef, setAktifHedef] = useState<HTMLElement | null>(null);
  const [aktifEkHedefler, setAktifEkHedefler] = useState<HTMLElement[]>([]);

  const oyunuSifirla = useCallback(() => {
    setAktifTip(null);
    setAktifIndex(-1);
    setAktifHedef(null);
    setAktifEkHedefler([]);
  }, []);

  const register = useCallback((k: RehberKayit) => {
    kayitRef.current = k;
    setKayit(k);
    // Yeni sayfa register etti → önceki sayfanın aktif rehberini kapat
    // (sayfa değişiminde stale tip kalmasın). register yalnız mount'ta /
    // stabil değerler değişince fire eder (bkz. useSayfaRehberi deps).
    setAktifTip(null);
    setAktifIndex(-1);
    setAktifHedef(null);
    setAktifEkHedefler([]);
  }, []);

  const unregister = useCallback(() => {
    kayitRef.current = null;
    setKayit(null);
    setAktifTip(null);
    setAktifIndex(-1);
    setAktifHedef(null);
    setAktifEkHedefler([]);
  }, []);

  // İlk uygun tip — onKosul + DOM hedefi sağlananlar. kayitRef'ten okur →
  // stale closure yok (baslat/sonraki event handler'lardan çağrılır).
  const uygunTipBul = useCallback(
    (baslangic: number): { tip: TipDef; index: number } | null => {
      const pool = kayitRef.current?.pool ?? [];
      for (let i = baslangic; i < pool.length; i++) {
        const t = pool[i];
        if (t.onKosul && !t.onKosul()) continue;
        if (t.targetSelector() == null) continue;
        return { tip: t, index: i };
      }
      return null;
    },
    [],
  );

  const baslat = useCallback((): boolean => {
    const sec = uygunTipBul(0);
    if (!sec) return false;
    setAktifTip(sec.tip);
    setAktifIndex(sec.index);
    return true;
  }, [uygunTipBul]);

  const kapat = useCallback(() => {
    oyunuSifirla();
  }, [oyunuSifirla]);

  // aktifIndex'i ref'te tut — sonraki() event handler'dan güncel index okusun
  // (kendisini deps'e koyup her adımda yeni referans üretmemek için).
  const aktifIndexRef = useRef(aktifIndex);
  useEffect(() => {
    aktifIndexRef.current = aktifIndex;
  }, [aktifIndex]);

  const sonraki = useCallback(() => {
    const sec = uygunTipBul(aktifIndexRef.current + 1);
    if (sec) {
      setAktifTip(sec.tip);
      setAktifIndex(sec.index);
    } else {
      oyunuSifirla();
    }
  }, [uygunTipBul, oyunuSifirla]);

  // ── Yan etki (panel/modal açma) — tip değişince kayıttaki callback çağrılır.
  // Önceki tip için onYanEtkiKapat, yeni tip yanEtki'liyse onYanEtki.
  const oncekiTipRef = useRef<TipDef | null>(null);
  useEffect(() => {
    const onceki = oncekiTipRef.current;
    if (onceki && onceki !== aktifTip) {
      kayitRef.current?.onYanEtkiKapat?.(onceki);
    }
    if (aktifTip?.yanEtki) {
      kayitRef.current?.onYanEtki?.(aktifTip);
    }
    oncekiTipRef.current = aktifTip;
  }, [aktifTip]);

  // ── Aktif tipin DOM hedefini 120ms polling ile takip et ──
  // yanEtki sonrası açılan panel/popover hedefini de yakalar. Eski hook'taki
  // polling buraya taşındı; artık state doğrudan Provider'da olduğu için
  // hedef değişince GlobalTipSpotlight OTOMATİK yeniden çizilir (race bitti).
  useEffect(() => {
    if (!aktifTip) return;
    const olc = () => {
      const yeni = aktifTip.targetSelector();
      setAktifHedef((eski) => (eski === yeni ? eski : yeni));
      const yeniEk = aktifTip.ekHedeflerSelector?.() ?? [];
      setAktifEkHedefler((eski) => (ayniHedefler(eski, yeniEk) ? eski : yeniEk));
    };
    olc();
    const id = window.setInterval(olc, 120);
    return () => window.clearInterval(id);
  }, [aktifTip]);

  // Value useMemo'lu (Faz 17 dersi). Deps: stabil callback'ler + değişebilen
  // state (kayit + playback). aktifHedef değişince value değişir →
  // GlobalTipSpotlight re-render → spotlight görünür. Bu BEKLENEN tek tetik;
  // re-register churn yok (register/baslat/sonraki/kapat hepsi stable ref).
  const value = useMemo<RehberCtxValue>(
    () => ({
      register,
      unregister,
      hazir: !!kayit,
      bos: !kayit || kayit.pool.length === 0,
      sayfaAdi: kayit?.sayfaAdi ?? 'Bu sayfa',
      baslat,
      sonraki,
      kapat,
      aktifTip,
      aktifIndex,
      aktifHedef,
      aktifEkHedefler,
      toplam: kayit?.pool.length ?? 0,
      hitap: kayit?.hitap ?? '',
    }),
    [
      register,
      unregister,
      kayit,
      baslat,
      sonraki,
      kapat,
      aktifTip,
      aktifIndex,
      aktifHedef,
      aktifEkHedefler,
    ],
  );

  return <RehberContext.Provider value={value}>{children}</RehberContext.Provider>;
}
