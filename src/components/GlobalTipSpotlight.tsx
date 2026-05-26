// ── GlobalTipSpotlight ───────────────────────────────────────────────
// NE: AppLayout seviyesinde sabit komponent — RehberContext'teki aktif
//     rehberin renderTipSpotlight() callback'ini çağırıp TipSpotlight
//     overlay'ini portal ile render eder.
//
// NEDEN: Her sayfanın return JSX'ine `{rehber.render()}` koymak yerine
//        tek noktadan render → 8 sayfaya ayrı ayrı render entegrasyonu
//        gerekmez. Faz 6'da 7 sayfa için sadece hook çağrısı yeterli olur.
//
// NASIL: useRehberCtx ile context okur. Aktif rehber yoksa null;
//        renderTipSpotlight() useSayfaRehberi'nin TipSpotlight JSX'ini
//        döner — visible=false ise zaten null, performans etkisi nötr.

import { useRehberCtx } from '../context/useRehber';

export default function GlobalTipSpotlight() {
  const ctx = useRehberCtx();
  const aktif = ctx?.aktif;
  if (!aktif?.renderTipSpotlight) return null;
  return <>{aktif.renderTipSpotlight()}</>;
}
