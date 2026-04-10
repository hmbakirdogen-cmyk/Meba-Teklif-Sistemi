/**
 * Türk telefon numarasını standart görüntü formatına çevirir.
 * Desteklenen girişler: 05xxxxxxxxx, +905xxxxxxxxx, 05xx xxx xx xx vb.
 * Çıktı: (05xx) xxx xx xx
 * Sadece rakamlardan oluşmayan ya da 10/11 haneli olmayan girişler olduğu gibi döner.
 */
export function formatPhone(val: string): string {
  if (!val) return '';
  // Tüm rakam-dışı karakterleri çıkar
  const digits = val.replace(/\D/g, '');

  // +90 ile başlıyorsa veya 12 haneliyse başını at
  const normalized = digits.startsWith('90') && digits.length === 12
    ? digits.slice(2)
    : digits;

  // 11 haneli ve 0 ile başlıyorsa: 0(5xx) xxx xx xx
  if (normalized.length === 11 && normalized.startsWith('0')) {
    const d = normalized;
    return `(${d.slice(0, 4)}) ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
  }

  // 10 haneli (başında 0 yok): 5xxxxxxxxx → başına 0 ekle
  if (normalized.length === 10 && normalized.startsWith('5')) {
    const d = '0' + normalized;
    return `(${d.slice(0, 4)}) ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
  }

  // Tanınamayan format — olduğu gibi döndür
  return val.trim();
}
