/**
 * useSayfaRehberi.tsx
 * ─────────────────────────────────────────────────────────────────
 * Her sayfa kendi tip havuzunu RehberContext'e register eder; global 🎓
 * Rehberler butonu (GlobalRehberFab) ve spotlight overlay (GlobalTipSpotlight)
 * bu havuzu kullanır.
 *
 * Kullanım:
 *   useSayfaRehberi(SAYFA_TIPLERI, {
 *     sayfaAdi: 'Teklif Editörü',
 *     onYanEtki: (tip) => { ... },          // opsiyonel: panel/modal açma
 *     onYanEtkiKapat: (onceki) => { ... },  // opsiyonel: tip değişince kapama
 *     otomatikAcKey: 'meba_pdf_rehber',     // opsiyonel: one-shot otomatik tetik
 *     otomatikAcTetik: pdfRehberTetik,      // opsiyonel: tetik koşulu
 *   });
 *
 * NOT (Faz 28): Playback state (aktif tip/index/hedef), DOM polling ve
 * TipSpotlight render'ı artık RehberProvider'ın içinde. Bu hook yalnız:
 *   • Rol bazlı havuz filtresi
 *   • Kibar hitap hesaplama
 *   • Havuzu + yan-etki callback'lerini Provider'a register/unregister
 *   • One-shot otomatik tetik
 * yapar. Dönüş değeri (baslat) genelde kullanılmaz — global FAB yeterlidir.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useKullanici } from '../context/useKullanici';
import { useRehberCtx } from '../context/useRehber';
import { kullaniciHitap } from '../utils/kullaniciHitap';
import { isYonetici as isYoneticiRol } from '../utils/yetkiUtils';
import type { TipDef } from '../components/tipler/tipTipleri';

interface SayfaRehberiSecenekler {
  /** Tip aktifleştiğinde yan etki tetiği (panel açma vb.). */
  onYanEtki?: (tip: TipDef) => void;
  /** Yan etkiyi kapatma (tip bittiğinde "biz açmışsak" kapatmak için). */
  onYanEtkiKapat?: (oncekiTip: TipDef) => void;
  /**
   * One-shot otomatik tetik — bu localStorage anahtarı hiç aktifleşmediyse
   * mount'tan 800ms sonra rehberi otomatik başlat. Anahtara `_${userId}`
   * eklenir. Örnek: 'meba_pdf_rehber'.
   */
  otomatikAcKey?: string;
  /** Otomatik tetik koşulu — true olunca otomatikAcKey kontrolü yapılır. */
  otomatikAcTetik?: boolean;
  /**
   * Sayfa adı — global FAB diyalog/mesajlarında gösterilir.
   * Default: 'Bu sayfa'. Örnek: 'Teklif Editörü', 'Teklif Listesi'.
   */
  sayfaAdi?: string;
}

interface SayfaRehberi {
  /** Rehberi elle başlat (genelde gerekmez — global 🎓 FAB kullanılır). */
  baslat: () => boolean;
}

export function useSayfaRehberi(
  pool: TipDef[],
  secenekler: SayfaRehberiSecenekler = {},
): SayfaRehberi {
  const { aktifKullanici } = useKullanici();
  const ctx = useRehberCtx();

  // Kibar hitap — "Mehmet Bey" veya "Ayşe Hanım" (Faz 14b).
  const hitap = useMemo(
    () => kullaniciHitap(aktifKullanici?.adSoyad, aktifKullanici?.unvanCinsiyet),
    [aktifKullanici?.adSoyad, aktifKullanici?.unvanCinsiyet],
  );

  // ── Rol bazlı havuz filtresi (Faz 9) ──
  // roller undefined/boş → herkes; 'yonetici' → super/firma_admin;
  // 'calisan' → yalnız çalışan. Filtre stabil (pool modül sabiti + rol).
  const yoneticiMi = isYoneticiRol(aktifKullanici?.rol);
  const filtreliPool = useMemo(() => {
    return pool.filter((t) => {
      if (!t.roller || t.roller.length === 0) return true; // herkes
      if (yoneticiMi && t.roller.includes('yonetici')) return true;
      if (!yoneticiMi && t.roller.includes('calisan')) return true;
      return false;
    });
  }, [pool, yoneticiMi]);

  // Yan-etki callback'lerini ref'te tut. Sayfalar bunları inline (her render'da
  // yeni referans) geçiyor; register effect'inin deps'ine koyarsak her render'da
  // re-register → #185 churn riski (Faz 25 dersi). Provider en güncel
  // callback'i bu ref üzerinden çağırır.
  const secRef = useRef(secenekler);
  useEffect(() => {
    secRef.current = secenekler;
  });

  const register = ctx?.register;
  const unregister = ctx?.unregister;
  const sayfaAdi = secenekler.sayfaAdi ?? 'Bu sayfa';

  // Havuzu Provider'a register et. Deps SADECE stabil değerler: filtreliPool
  // (modül sabiti + rol), hitap (memo), sayfaAdi (literal). Inline callback'ler
  // secRef üzerinden geçtiği için effect'i tetiklemez → loop yok.
  useEffect(() => {
    if (!register || !unregister) return;
    register({
      pool: filtreliPool,
      sayfaAdi,
      hitap,
      onYanEtki: (tip) => secRef.current.onYanEtki?.(tip),
      onYanEtkiKapat: (onceki) => secRef.current.onYanEtkiKapat?.(onceki),
    });
    return () => unregister();
  }, [register, unregister, filtreliPool, hitap, sayfaAdi]);

  // One-shot otomatik tetik — anahtar daha önce kullanılmamışsa mount'tan
  // 800ms sonra rehberi otomatik başlat.
  const baslat = ctx?.baslat;
  useEffect(() => {
    if (!secenekler.otomatikAcKey) return;
    if (!aktifKullanici?.id) return;
    if (!secenekler.otomatikAcTetik) return;
    if (!baslat) return;
    try {
      const key = `${secenekler.otomatikAcKey}_${aktifKullanici.id}`;
      if (window.localStorage.getItem(key) === '1') return;
      window.localStorage.setItem(key, '1');
      const id = window.setTimeout(() => {
        baslat();
      }, 800);
      return () => window.clearTimeout(id);
    } catch {
      // localStorage erişilemez — sessizce geç
    }
  }, [secenekler.otomatikAcKey, secenekler.otomatikAcTetik, aktifKullanici?.id, baslat]);

  return { baslat: baslat ?? (() => false) };
}
