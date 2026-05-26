/**
 * kullaniciHitap.ts
 * ─────────────────────────────────────────────────────────────────
 * Kullanici "adSoyad" alanindan kibar hitap uretir.
 *
 * Davranis:
 *  • "Mehmet Bakirdogen" → "Mehmet Bey"
 *  • "Furkan Bey Sezer"  → "Furkan Bey" (ilk isim alinir)
 *  • undefined / boş     → "değerli kullanıcı" (fallback, hitabesiz görünmez)
 *
 * Cinsiyet field'i yoksa "Bey" varsayilan (MEBA personeli buyuk cogunlukla erkek).
 * Ileride `cinsiyet` eklenirse: `cinsiyet === 'kadin' ? 'Hanim' : 'Bey'`.
 *
 * Saf fonksiyon — hook degil, side-effect yok. Memoization caller'in sorumlulugu.
 */
export function kullaniciHitap(adSoyad: string | null | undefined): string {
  const ad = adSoyad?.trim();
  if (!ad) return 'değerli kullanıcı';
  const ilkIsim = ad.split(/\s+/)[0];
  return `${ilkIsim} Bey`;
}
