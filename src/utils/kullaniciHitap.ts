/**
 * kullaniciHitap.ts
 * ─────────────────────────────────────────────────────────────────
 * Kullanici "adSoyad" + opsiyonel cinsiyet alanindan kibar hitap uretir.
 *
 * Davranis:
 *  • "Mehmet Bakirdogen" + 'Bey'   → "Mehmet Bey"
 *  • "Ayşe Yılmaz"       + 'Hanım' → "Ayşe Hanım"
 *  • "Furkan Bey Sezer"  + undef.  → "Furkan Bey" (ilk isim alinir, default Bey)
 *  • undefined / boş               → "değerli kullanıcı" (fallback)
 *
 * Mehmet Bey 2026-05-26 direktifi: "Herkese Bey veya Hanım hitabeti her
 * yerde kullanılmalı". Kullanici tipinde unvanCinsiyet alanı opsiyonel;
 * tanımsızsa "Bey" default (geri uyumlu — eski kayıtlar bozulmaz).
 *
 * Saf fonksiyon — hook degil, side-effect yok. Memoization caller'in sorumlulugu.
 */
export function kullaniciHitap(
  adSoyad: string | null | undefined,
  cinsiyet?: 'Bey' | 'Hanım',
): string {
  const ad = adSoyad?.trim();
  if (!ad) return 'değerli kullanıcı';
  const ilkIsim = ad.split(/\s+/)[0];
  return `${ilkIsim} ${cinsiyet ?? 'Bey'}`;
}
