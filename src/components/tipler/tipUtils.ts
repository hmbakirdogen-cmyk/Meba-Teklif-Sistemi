/**
 * tipUtils.ts
 * ─────────────────────────────────────────────────────────────────
 * Tip rehber sisteminin yardimci fonksiyonlari.
 *
 * `ilkGorunurEslesme` — DOM'da ilk GORUNUR eslesmeyi bulur:
 *  • aria-hidden ata'sini atlayarak (CanliA4Belge offscreen PDF source DOM'larini eler)
 *  • 0-yukseklik phantom elementleri eler (insertAbove gibi 0-height spacer'lar)
 *
 * Bu utility tipPool dosyalarinda yaygin kullanilir; type-only `tipTipleri.ts`'den ayri.
 */
export const ilkGorunurEslesme = (selector: string): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  const tum = document.querySelectorAll<HTMLElement>(selector);
  for (const el of tum) {
    if (el.closest('[aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 4 || r.width < 4) continue;
    return el;
  }
  return null;
};
