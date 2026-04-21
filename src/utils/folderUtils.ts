/**
 * folderUtils.ts
 * Klasör adı üretme mantığı — server/server.cjs'deki cariKlasorAdiUret ile birebir aynı.
 * Sunucu ile istemci tarafı her zaman aynı klasör adını üretir.
 */
const INVALID_WIN = /[<>:"/\\|?*]/g;

function normalize(v: string): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}

function sanitize(v: string, fallback: string): string {
  const withoutControls = Array.from(v).filter((ch) => ch.charCodeAt(0) >= 32).join('');
  const cleaned = normalize(withoutControls.replace(INVALID_WIN, ' ').replace(/[. ]+$/g, ''));
  return cleaned || fallback;
}

/** Cari firma adından klasör adı üretir. İlk iki kelime, tamamı büyük harf. */
export function klasorAdiUret(firmaAdi: string): string {
  const words = normalize(firmaAdi).split(' ').filter(Boolean);
  const source = words.slice(0, 2).join(' ') || words.join(' ') || 'TEKLIF';
  return sanitize(source.toLocaleUpperCase('tr-TR'), 'TEKLIF');
}
