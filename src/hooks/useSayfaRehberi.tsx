/**
 * useSayfaRehberi.tsx
 * ─────────────────────────────────────────────────────────────────
 * Reusable rehber sistemi — her sayfa kendi tip pool'unu register eder,
 * sequence playback'i + 🎓 Rehberler butonunu otomatik alir.
 *
 * Kullanim:
 *   const rehber = useSayfaRehberi(SAYFA_TIPLERI, {
 *     onYanEtki: (tip) => { ... },          // opsiyonel: panel/modal acma
 *     onYanEtkiKapat: () => { ... },        // opsiyonel: tip degisince kapama
 *     otomatikAcKey: 'meba_pdf_rehber',     // opsiyonel: one-shot otomatik tetik
 *   });
 *   ...JSX...
 *   {rehber.render()}
 *
 * Davranis:
 *  • State + effect + callback'ler hook icinde kapsullenir.
 *  • 120ms polling ile DOM hedef takibi (yanEtki sonrasi acilan panel/popover icin).
 *  • Sequence mode: tipPreviewBaslat → ilk uygun tip'ten basla → SONRAKİ → BITIR.
 *  • Tip kapaninca yanEtkiyle aciklanan panel/modal otomatik kapatilir
 *    (tipAcanPanelRef ile takip — kullanicinin manuel acigi paneli dokunmaz).
 *  • Onkosul filtresi: tip.onKosul() === false ise sequence'de atlanir.
 *  • Otomatik bir-kez-ac: otomatikAcKey verilirse localStorage kontrol,
 *    daha once acilmadiysa mount'tan 1500ms sonra otomatik tetik.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useKullanici } from '../context/useKullanici';
import { kullaniciHitap } from '../utils/kullaniciHitap';
import TipSpotlight from '../components/TipSpotlight';
import type { TipDef } from '../components/tipler/tipTipleri';

interface SayfaRehberiSecenekler {
  /** Tip aktiflestiginde yan etki tetigi (panel acma vb.). */
  onYanEtki?: (tip: TipDef) => void;
  /** Yan etkiyi kapatma (tip bittiginde "biz acmissak" kapatmak icin). */
  onYanEtkiKapat?: (oncekiTip: TipDef) => void;
  /**
   * One-shot otomatik tetik — bu localStorage anahtari hic aktifelmediyse
   * mount'tan 1500ms sonra rehberi otomatik baslat. Ornek: 'meba_pdf_rehber'.
   * Anahtara `_${userId}` eklenir.
   */
  otomatikAcKey?: string;
  /** Tetik trigger'i otomatikAcKey gerektirmiyorsa: belirli koşul aktifleşince. */
  otomatikAcTetik?: boolean;
}

interface SayfaRehberi {
  render: () => React.ReactNode;
  baslat: () => void;
  aktifTip: TipDef | null;
  aktifIndex: number;
}

export function useSayfaRehberi(
  pool: TipDef[],
  secenekler: SayfaRehberiSecenekler = {},
): SayfaRehberi {
  const { aktifKullanici } = useKullanici();
  const [aktifTip, setAktifTip] = useState<TipDef | null>(null);
  const [aktifIndex, setAktifIndex] = useState<number>(-1);
  const [aktifHedef, setAktifHedef] = useState<HTMLElement | null>(null);
  const [aktifEkHedefler, setAktifEkHedefler] = useState<HTMLElement[]>([]);

  // Kibar hitap — "Mehmet Bey" gibi
  const hitap = useMemo(
    () => kullaniciHitap(aktifKullanici?.adSoyad),
    [aktifKullanici?.adSoyad],
  );

  // İlk uygun tipi bul (onKosul + DOM hedefi sağlananlar)
  const ilkUygunTip = useCallback((): { tip: TipDef; index: number } | null => {
    for (let i = 0; i < pool.length; i++) {
      const t = pool[i];
      if (t.onKosul && !t.onKosul()) continue;
      if (t.targetSelector() == null) continue;
      return { tip: t, index: i };
    }
    return null;
  }, [pool]);

  /** Rehberleri sirayla goster (🎓 butonu basildiginda). */
  const baslat = useCallback(() => {
    const sec = ilkUygunTip();
    if (sec) {
      setAktifTip(sec.tip);
      setAktifIndex(sec.index);
    }
  }, [ilkUygunTip]);

  // One-shot otomatik tetik — otomatikAcKey verilmis ve daha once acilmamissa
  useEffect(() => {
    if (!secenekler.otomatikAcKey) return;
    if (!aktifKullanici?.id) return;
    if (!secenekler.otomatikAcTetik) return;
    try {
      const key = `${secenekler.otomatikAcKey}_${aktifKullanici.id}`;
      if (window.localStorage.getItem(key) === '1') return;
      window.localStorage.setItem(key, '1');
      const id = window.setTimeout(() => {
        baslat();
      }, 800);
      return () => window.clearTimeout(id);
    } catch {
      // localStorage erisilemez — sessizce gec
    }
  }, [secenekler.otomatikAcKey, secenekler.otomatikAcTetik, aktifKullanici?.id, baslat]);

  // Tip yan etkisi — onYanEtki callback'i (panel/modal acma)
  const oncekiTipRef = useRef<TipDef | null>(null);
  useEffect(() => {
    const onceki = oncekiTipRef.current;
    if (onceki && onceki !== aktifTip) {
      secenekler.onYanEtkiKapat?.(onceki);
    }
    if (aktifTip?.yanEtki) {
      secenekler.onYanEtki?.(aktifTip);
    }
    oncekiTipRef.current = aktifTip;
  }, [aktifTip, secenekler]);

  // Aktif tipin DOM hedefini polling ile takip et (yanEtki sonrasi DOM degisir).
  // NOT: setState çağrıları effect'ten ÇIKARILIP tipKapat/tipSonraki callback'lerine
  // taşındı (React 19 react-hooks/set-state-in-effect kuralı). Effect artık sadece
  // polling başlatır + cleanup ile durdurur — null'lama callback'lerde yapılır,
  // tek sorumluluk her yer için.
  useEffect(() => {
    if (!aktifTip) return;
    const olc = () => {
      const yeni = aktifTip.targetSelector();
      setAktifHedef((eski) => (eski === yeni ? eski : yeni));
      const yeniEk = aktifTip.ekHedeflerSelector?.() ?? [];
      setAktifEkHedefler((eski) => {
        if (eski.length !== yeniEk.length) return yeniEk;
        for (let i = 0; i < eski.length; i++) {
          if (eski[i] !== yeniEk[i]) return yeniEk;
        }
        return eski;
      });
    };
    olc();
    const id = window.setInterval(olc, 120);
    return () => window.clearInterval(id);
  }, [aktifTip]);

  const tipKapat = useCallback(() => {
    setAktifTip(null);
    setAktifIndex(-1);
    setAktifHedef(null);
    setAktifEkHedefler([]);
  }, []);

  const tipSonraki = useCallback(() => {
    if (!aktifTip) return;
    // Bir sonraki uygun tip'i bul (onKosul + DOM hedefi)
    for (let i = aktifIndex + 1; i < pool.length; i++) {
      const t = pool[i];
      if (t.onKosul && !t.onKosul()) continue;
      if (t.targetSelector() == null) continue;
      setAktifTip(t);
      setAktifIndex(i);
      return;
    }
    // Sequence bitti — hedef state'leri de temizle (effect içinde değil)
    setAktifTip(null);
    setAktifIndex(-1);
    setAktifHedef(null);
    setAktifEkHedefler([]);
  }, [aktifTip, aktifIndex, pool]);

  const render = useCallback((): React.ReactNode => {
    return (
      <>
        <TipSpotlight
          visible={!!aktifTip}
          target={aktifHedef}
          ekHedefler={aktifEkHedefler}
          step={
            aktifIndex >= 0
              ? { current: aktifIndex + 1, total: pool.length }
              : undefined
          }
          baslik={aktifTip?.baslik(hitap) ?? ''}
          aciklama={aktifTip?.aciklama(hitap) ?? ''}
          miniEtiket={aktifTip?.miniEtiket}
          gostericiOk={aktifTip?.gostericiOk ?? false}
          animasyon={aktifTip?.animasyon}
          onAnladim={tipSonraki}
          onAtla={tipKapat}
          sonAdim={aktifIndex === pool.length - 1}
        />
        {!aktifTip && (
          <button
            type="button"
            onClick={baslat}
            aria-label="Tum klavuzlari sirayla onizle"
            title="Tüm klavuzları sırayla göster"
            className="no-print"
            style={{
              position: 'fixed', bottom: 24, right: 80, zIndex: 50,
              background: 'rgba(15, 23, 42, 0.85)', color: '#fff',
              padding: '8px 14px', borderRadius: 999,
              border: '1px solid rgba(91, 141, 239, 0.4)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(15, 23, 42, 0.25)',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: 0.7,
              transition: 'opacity 200ms ease, transform 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.7';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🎓 Rehberler
          </button>
        )}
      </>
    );
  }, [aktifTip, aktifHedef, aktifEkHedefler, aktifIndex, hitap, pool.length, tipSonraki, tipKapat, baslat]);

  return { render, baslat, aktifTip, aktifIndex };
}
