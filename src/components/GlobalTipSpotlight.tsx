// ── GlobalTipSpotlight ───────────────────────────────────────────────
// NE: AppLayout seviyesinde sabit komponent — RehberContext'teki aktif
//     playback state'ini (aktif tip + DOM hedefi) DOĞRUDAN okuyup
//     TipSpotlight overlay'ini render eder.
//
// NEDEN: Her sayfanın return JSX'ine `{rehber.render()}` koymak yerine tek
//        noktadan render. Faz 28: Eski tasarımda render, useSayfaRehberi
//        hook'unun `renderRef` closure'ı üzerinden geliyordu — bu, hedef
//        sonradan bulununca güncellenmeyen STALE bir render'a yol açıyordu
//        (spotlight hiç görünmüyordu). Artık state Provider'da; aktifHedef
//        değişince context value değişir → bu komponent otomatik re-render
//        olur → spotlight doğru hedefle çizilir.
//
// NASIL: useRehberCtx ile state okur. Aktif tip yoksa null. TipSpotlight
//        kendi içinde hedef rect'ini hesaplar (visible + target yeterli).

import { useRehberCtx } from '../context/useRehber';
import TipSpotlight from './TipSpotlight';

export default function GlobalTipSpotlight() {
  const ctx = useRehberCtx();
  const tip = ctx?.aktifTip;
  if (!ctx || !tip) return null;

  return (
    <TipSpotlight
      visible
      target={ctx.aktifHedef}
      ekHedefler={ctx.aktifEkHedefler}
      step={
        ctx.aktifIndex >= 0
          ? { current: ctx.aktifIndex + 1, total: ctx.toplam }
          : undefined
      }
      baslik={tip.baslik(ctx.hitap)}
      aciklama={tip.aciklama(ctx.hitap)}
      miniEtiket={tip.miniEtiket}
      gostericiOk={tip.gostericiOk ?? false}
      animasyon={tip.animasyon}
      animAltKaplama={tip.animAltKaplama}
      kartGenislik={tip.kartGenislik}
      onAnladim={ctx.sonraki}
      onAtla={ctx.kapat}
      sonAdim={ctx.aktifIndex === ctx.toplam - 1}
    />
  );
}
