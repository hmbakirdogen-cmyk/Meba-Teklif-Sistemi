/**
 * Türk telefon numarasını standart görüntü formatına çevirir.
 * Desteklenen girişler: 0xxxxxxxxxx, +90xxxxxxxxxx, 0xxx xxx xx xx, vb.
 * Çıktı: (0xxx) xxx xx xx — hem mobil (5xx) hem sabit hat (3xx, 2xx, 4xx, vb.)
 *
 * Alan kodu varsayılanı: 7 haneli numaralar (alan kodu yok) için otomatik
 * "0352" prefix'i eklenir (Kayseri merkezli grup şirketleri için).
 */
const VARSAYILAN_ALAN_KODU = '0352';

export function formatPhone(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '');

  // 12 haneli ve "90" ile başlıyorsa → ülke kodunu at, başına 0 ekle
  let normalized: string;
  if (digits.length === 12 && digits.startsWith('90')) {
    normalized = '0' + digits.slice(2);
  } else if (digits.length === 10) {
    // 10 haneli (başında 0 ya da 90 yok) → başına 0 ekle
    normalized = '0' + digits;
  } else if (digits.length === 7) {
    // 7 haneli (alan kodu yok) → varsayılan alan kodu ekle (Kayseri = 0352)
    normalized = VARSAYILAN_ALAN_KODU + digits;
  } else {
    normalized = digits;
  }

  // 11 haneli ve 0 ile başlıyorsa → (0xxx) xxx xx xx
  if (normalized.length === 11 && normalized.startsWith('0')) {
    const d = normalized;
    return `(${d.slice(0, 4)}) ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
  }

  return val.trim();
}
