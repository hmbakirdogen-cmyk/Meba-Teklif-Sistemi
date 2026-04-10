import type { ParaBirimi } from '../types';

/**
 * Türkiye telefon numaralarını standart formata getirir.
 * 05416223427  → 0 541 622 34 27
 * 5416223427   → 0 541 622 34 27
 * 03223456789  → 0 322 345 67 89
 */
export function formatPhone(val: string): string {
  const raw = (val || '').replace(/[^\d+]/g, '');
  if (!raw) return '';

  // Uluslararası +90 ön ekini kaldır
  const digits = raw.startsWith('+90') ? raw.slice(3) : raw.replace(/^\+/, '');

  if (digits.length === 11 && digits.startsWith('0')) {
    // 0AAABBBCCDD → 0 AAA BBB CC DD
    return `${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  }
  if (digits.length === 10) {
    // AAABBBCCDD → 0 AAA BBB CC DD
    return `0 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }
  // Kısa numara veya tanınmayan format → ham değeri döndür
  return val.trim();
}

// ParaBirimi tipi import — kullanılmadığında lint uyarısını bastır
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _PB = ParaBirimi;

const PARA_BIRIMI_SEMBOL: Record<string, string> = {
  TRY: '₺',
  EUR: '€',
  USD: '$',
};

/** Sayıyı para birimi sembolü ile biçimlendirir: 1.234,56 ₺
 *  Bilinmeyen para birimleri için kod direkt sembol olarak kullanılır. */
export function formatCurrency(tutar: number, pb: string): string {
  const formatted = tutar.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sembol = PARA_BIRIMI_SEMBOL[pb] ?? pb;
  return pb === 'TRY' ? `${formatted} ${sembol}` : `${sembol} ${formatted}`;
}

/** Yüzde değerini biçimlendirir: %18,00 */
export function formatPercentage(val: number): string {
  return `%${val.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Türkçe'ye özgü başlık büyük harfe dönüştürme (I/İ/ı/i farkları korunur) */
export function formatTitleCaseTr(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_, space, char) => {
      if (char === 'i') return `${space}İ`;
      return `${space}${char.toUpperCase()}`;
    });
}

/** E-posta adresini normalize eder (boşluk sil, küçük harf) */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Web URL'ini normalize eder (boşluk sil, küçük harf) */
export function normalizeWebUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/** Ürün/cari kodunu normalize eder (büyük harf, boşluk → tire) */
export function normalizeProductCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
}

/** Tek satırlık metin girişini temizler (baştaki/sondaki boşluklar, çoklu boşluk) */
export function cleanTextInput(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** Çok satırlı metin alanını temizler (fazla boş satırları kaldırır) */
export function sanitizeMultilineText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Sayısal girişi güvenli şekilde parse eder, geçersizse 0 döner */
export function parseNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(String(val).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/** Tarihi GG.AA.YYYY formatında gösterir */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Teknik ürün açıklamasını standart biçime çevirir.
 *   "32 lik silindir"  → "Ø32 silindir"
 *   "8mm boru"         → "8 mm boru"
 *   "3/8 "             → '3/8"'  (inç notasyonu)
 *   "0-10 bar"         → "0–10 bar"  (kısa tire → uzun tire)
 */
export function normalizeUrunAciklama(text: string): string {
  if (!text) return '';
  return text
    .trim()
    // "32lik" veya "32 lik" → "Ø32"
    .replace(/\b(\d+)\s*lik\b/gi, 'Ø$1')
    // "8mm" → "8 mm"
    .replace(/\b(\d+(?:[.,]\d+)?)\s*(mm|cm|m|bar|mpa|kpa|kg|lt|l)\b/gi, (_, n, unit) => `${n} ${unit.toLowerCase()}`)
    // Sayısal aralık "0-10" → "0–10"
    .replace(/(\d)\s*-\s*(\d)/g, '$1–$2')
    // Çoklu boşluk temizle
    .replace(/\s{2,}/g, ' ');
}

/**
 * Adres metnini normalize eder:
 * boş satırları temizler, Türkçe kısaltmaları düzeltir.
 */
export function normalizeAdres(text: string): string {
  if (!text) return '';
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * Sayı formatı: 125000 → "125.000"  (grup ayracı, ondalık yok)
 * Para için formatCurrency kullanın.
 */
export function formatSayi(val: number): string {
  return val.toLocaleString('tr-TR');
}

// ─── Teknik parantez içeriği listesi ──────────────────────────────────────────
// Bu pattern'ler eşleşirse parantez TEKNİK bilgi sayılır → silinmez
const TEKNIK_PAREN_PATTERNS: RegExp[] = [
  /^\d+\s*V(DC|AC)?$/i,           // 220V, 24VDC, 12 VAC
  /^\d+\s*kV$/i,                  // 6kV
  /^\d+\s*W$/i,                   // 250W
  /^\d+\s*A$/i,                   // 10A
  /^\d+\s*Hz$/i,                  // 50Hz
  /^\d+\s*bar$/i,                 // 10 bar
  /^\d+\s*°C$/i,                  // 80°C
  /faz/i,                         // 3 Fazlı, monofaz
  /^Ø\d/,                         // Ø32
  /^(NBR|EPDM|FKM|POM|PTFE|PA|PU|PE|PP|ABS|SS316|SS304|INOX)$/i, // Malzeme
  /^\d+\/\d+"/,                    // 1/4", 3/8"
  /^\d+(?:[.,]\d+)?\s*(mm|cm|m|l|lt|kg|kpa|mpa|rpm|nm)$/i, // Birimli ölçü
  /^\d+$/,                        // Sadece rakam
  /^IP\d{2}/i,                    // IP65, IP67
];

/**
 * Parantez içeriğinin ürün kodunu tekrar edip etmediğini kontrol eder.
 * Tire, alt çizgi, boşluk ve nokta farkını görmezden gelir, büyük/küçük harf duyarsız.
 *
 * isProductCodeRepetition("CP96-SDB80", "CP96SDB80")  → true
 * isProductCodeRepetition("VLV-12", "VLV-12")         → true
 * isProductCodeRepetition("220V", "VLV-12")           → false
 * isProductCodeRepetition("Paslanmaz", "VLV-12")      → false
 */
function isProductCodeRepetition(parenContent: string, code: string): boolean {
  const norm = (s: string) => s.replace(/[-_\s./]/g, '').toUpperCase();
  const pc = norm(parenContent);
  const c  = norm(code);
  if (!pc || !c) return false;
  return pc === c || c.includes(pc) || pc.includes(c);
}

/**
 * Ürün açıklamasındaki gereksiz parantez içeriklerini temizler.
 *
 * code parametresi verildiğinde — sadece kodu tekrar eden parantezleri sil:
 *   cleanProductDescription("Açıklama (ABC123)", "ABC123")    → "Açıklama"
 *   cleanProductDescription("Valf 1/2 (VLV-12)", "VLV-12")   → "Valf 1/2"
 *   cleanProductDescription("Motor (220V)", "VLV-12")         → "Motor (220V)"    ← korunur
 *   cleanProductDescription("Valf (Paslanmaz)", "VLV-12")     → "Valf (Paslanmaz)" ← korunur
 *
 * code verilmediğinde (geriye dönük uyumluluk):
 *   - Teknik olmayan sondaki parantez+marka takıları silinir
 */
export function cleanProductDescription(text: string, code?: string): string {
  if (!text) return text ?? '';

  let result = text.trim();

  if (code && code.trim()) {
    // Tüm parantez gruplarını tara — sadece kodu tekrar edenleri sil
    result = result.replace(/\s*\(([^)]+)\)/g, (match, content) =>
      isProductCodeRepetition(content.trim(), code.trim()) ? '' : match
    );
  } else {
    // Eski davranış: sondaki teknik-olmayan parantez+marka takısını sil
    const trailingMatch = result.match(/\s*\(([^)]+)\)(\s+[^\s(]+)*\s*$/);
    if (trailingMatch) {
      const parenContent = trailingMatch[1].trim();
      const isTeknik = TEKNIK_PAREN_PATTERNS.some((rx) => rx.test(parenContent));
      if (!isTeknik) {
        result = result.slice(0, result.length - trailingMatch[0].length).trim();
      }
    }
  }

  return result.replace(/\s{2,}/g, ' ').trim();
}

// ─── Parantez temizleme ────────────────────────────────────────────────────────

/**
 * Metindeki ilk "(" karakterinden itibaren her şeyi siler.
 * Hem urunAdi hem aciklama alanları için ortak display temizleyici.
 *   "KOMPAKT SİLİNDİR(MGPM63TF-100Z)SMC" → "KOMPAKT SİLİNDİR"
 *   "Parantez yok"                        → "Parantez yok"
 */
export function stripParantez(text: string): string {
  if (!text) return '';
  return text.split('(')[0].trim();
}

// ─── Açıklama formatlama ───────────────────────────────────────────────────────

/**
 * Ürün açıklamasını standart formata getirir (arayüz + PDF ortak).
 *
 * Kurallar:
 *   0) İlk "(" karakterinden itibaren her şey kaldırılır — parantez içeriği gösterilmez
 *   1) Tamamen küçük harf (toLowerCase)
 *   2) Ürün adında geçen kelimeler açıklamadan çıkarılır (tekrar engeli)
 *   3) Sonuç trim + çoklu boşluk temizliği
 *
 * Örnekler:
 *   formatAciklama("Ø80 mm · 200 mm strok (CP96SDB80-200)", "...")
 *     → "ø80 mm · 200 mm strok"
 *   formatAciklama("Çift etkili, manyetik sensörlü", "PNÖMATİK SİLİNDİR")
 *     → "çift etkili, manyetik sensörlü"
 *   formatAciklama("(tümü parantez içinde)")
 *     → ""
 */
export function formatAciklama(aciklama: string, urunAdi?: string): string {
  if (!aciklama) return '';

  // Kural 0: ilk "(" ve sonrasını kaldır, Türkçe locale lowercase uygula
  let result = aciklama.split('(')[0].trim().toLocaleLowerCase('tr-TR');
  if (!result) return '';

  // Ürün adındaki kelimeleri açıklamadan çıkar (case-insensitive, Türkçe)
  if (urunAdi) {
    const adKelimeler = urunAdi
      .split(/[\s,;.·\-/()]+/)
      .filter((w) => w.length >= 3)
      .map((w) => w.toLocaleLowerCase('tr-TR')); // Türkçe İ/I doğru dönüşüm

    if (adKelimeler.length > 0) {
      for (const kelime of adKelimeler) {
        const escaped = kelime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // result zaten lowercase olduğundan 'g' yeterli (locale-aware karşılaştırma sorununu önler)
        result = result.replace(new RegExp(escaped, 'g'), '');
      }
    }
  }

  // Temizlik: ardışık ayırıcılar, baştaki/sondaki ayırıcılar, çoklu boşluk
  result = result
    .replace(/[,;·]{2,}/g, '·')
    .replace(/^\s*[,;·\-\s]+/g, '')
    .replace(/[,;·\-\s]+\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return result;
}

// ─── Açıklama Title Case ─────────────────────────────────────────────────────

/**
 * Açıklama metinleri için Türkçe Title Case uygular.
 *
 * Kurallar:
 *   - Her kelimenin ilk harfi büyük, devamı küçük
 *   - Türkçe "i" → "İ" dönüşümü uygulanır
 *   - Rakam veya özel sembolle (Ø, /, ·, -) başlayan tokenlar değiştirilmez
 *   - Bilinen ölçü birimleri (mm, bar, vdc …) tamamen küçük kalır
 *
 * Örnekler:
 *   "ø80 mm · 200 mm strok · manyetik"  → "Ø80 mm · 200 mm Strok · Manyetik"
 *   "1/4\" bağlantı · 24 vdc"           → "1/4\" Bağlantı · 24 vdc"
 */
const BIRIM_KUCUK = new Set([
  'mm', 'cm', 'm', 'mpa', 'bar', 'hz', 'khz', 'mhz',
  'nm', 'rpm', 'psi', 'npt', 'bsp', 'pt', 'dn',
  'g', 'kg', 'lt', 'ml', 'l', 'n', 'kn', 'w', 'kw',
  'vdc', 'adc', 'ac', 'dc', 'v', 'a',
]);

export function titleCaseAciklama(text: string): string {
  if (!text) return '';
  return text
    .split(' ')
    .map((token) => {
      if (!token) return token;
      const lower = token.toLowerCase();
      // Bilinen ölçü birimi → tamamen küçük bırak
      if (BIRIM_KUCUK.has(lower)) return lower;
      // Rakam, ölçü sembolü veya özel karakter ile başlıyorsa dokunma
      if (/^[0-9Øø·/\-+"]/.test(token)) return token;
      // Türkçe i → İ, diğerleri standart büyük harf
      const first = lower[0] === 'i' ? 'İ' : lower[0].toUpperCase();
      return first + lower.slice(1);
    })
    .join(' ');
}

// ─── PDF açıklama — silindir boyut ayrıştırıcı ──────────────────────────────

/**
 * Pnömatik silindir ürün kodundan çap ve strok değerlerini ayrıştırır.
 * Desteklenen format örnekleri:
 *   CP96SDB80-200   → { cap: 80,  strok: 200 }
 *   MGPM63TF-100Z   → { cap: 63,  strok: 100 }
 *   MGJ10-20        → { cap: 10,  strok: 20  }
 *   CP96SDB40-100   → { cap: 40,  strok: 100 }
 *
 * Kural: son tire (-) öncesindeki sayı = çap, sonrasındaki sayı = strok.
 * Makul aralık dışındaki değerler (çap < 4, strok < 1) reddedilir.
 */
export function parseSilindir(urunKod: string): { cap: number; strok: number } | null {
  if (!urunKod) return null;
  // Son tire grubunu bul: {rakamlar}{isteğe bağlı harfler}-{rakamlar}
  const m = urunKod.match(/(\d+)[A-Z]*-(\d+)/);
  if (!m) return null;
  const cap   = parseInt(m[1], 10);
  const strok = parseInt(m[2], 10);
  if (cap < 4 || cap > 500 || strok < 1 || strok > 5000) return null;
  return { cap, strok };
}

/**
 * Tüm arayüz ve PDF açıklama alanları için ortak formatlama fonksiyonu.
 *
 * Silindir ürünler  → "Ø{çap} mm · {strok} mm Strok · Manyetik"
 *                     (ürün kodundan otomatik ayrıştırılır; "sensörlü" kullanılmaz)
 * Diğer ürünler     → formatAciklama çıktısı, Title Case uygulanmış, 72 kar. kırpılmış
 *
 * Her iki durumda da:
 *   - Türkçe Title Case uygulanır (her kelimenin ilk harfi büyük)
 *   - Ölçü birimleri (mm, bar, vdc …) küçük kalır
 *   - Rakam/sembolle başlayan tokenlar değiştirilmez
 *   - Sonuç tek satır (textOverflow: ellipsis ile kırpılır)
 */
export function formatPdfAciklama(
  urunAdi: string,
  aciklama: string,
  urunKod: string,
): string {
  const ad = stripParantez(urunAdi);
  // Türkçe İ/I dönüşümü için toLocaleLowerCase('tr-TR') — 'İ' → 'i' doğru çalışır
  const isSilindir = ad.toLocaleLowerCase('tr-TR').includes('silindir');

  if (isSilindir) {
    const dims = parseSilindir(urunKod);
    if (dims) {
      return titleCaseAciklama(`Ø${dims.cap} mm · ${dims.strok} mm strok · manyetik`);
    }
  }

  // Silindir değil veya boyut ayrıştırılamadı — mevcut açıklamayı formatla
  const formatted = formatAciklama(aciklama, urunAdi);
  if (!formatted) return '';
  // 72 karakteri geçen açıklamaları kırp, ardından Title Case uygula
  const kırpılmış = formatted.length > 72 ? formatted.slice(0, 70) + '…' : formatted;
  return titleCaseAciklama(kırpılmış);
}

// ─── Sayısal giriş yardımcıları ───────────────────────────────────────────────

/**
 * Virgül veya nokta ondalık ayırıcısıyla yazılmış sayı metnini JS number'ına çevirir.
 *   "1256,50"  → 1256.5
 *   "1.256,50" → 1256.5  (Türkçe: nokta=binlik, virgül=ondalık)
 *   "1256.50"  → 1256.5
 *   "1,256.50" → 1256.5  (İngilizce: virgül=binlik, nokta=ondalık)
 */
export function parseLocaleNumber(raw: string): number {
  if (!raw) return 0;
  const s = raw.trim().replace(/\s/g, '');
  if (!s || s === '-' || s === ',' || s === '.') return 0;

  const commaIdx = s.lastIndexOf(',');
  const dotIdx = s.lastIndexOf('.');

  let normalized: string;
  if (commaIdx !== -1 && dotIdx !== -1) {
    if (commaIdx > dotIdx) {
      // "1.256,50" — nokta binlik ayraç, virgül ondalık
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else {
      // "1,256.50" — virgül binlik ayraç, nokta ondalık
      normalized = s.replace(/,/g, '');
    }
  } else if (commaIdx !== -1) {
    // Sadece virgül → ondalık ayırıcı
    normalized = s.replace(',', '.');
  } else {
    // Sadece nokta veya saf rakam
    normalized = s;
  }

  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

/**
 * Sayıyı blur sonrası görünüm için Türkçe locale ile biçimler (binlik ayraçlı).
 *   formatDisplayNumber(1256.5, 2, 2) → "1.256,50"
 *   formatDisplayNumber(5, 0, 4)      → "5"
 */
export function formatDisplayNumber(val: number, minDec = 0, maxDec = 2): string {
  return val.toLocaleString('tr-TR', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  });
}

/**
 * Sayıyı düzenleme modu için biçimler: binlik ayraç yok, virgül ondalık.
 *   formatEditableNumber(1256.5, 2)  → "1256,5"
 *   formatEditableNumber(18, 2)      → "18"
 *   formatEditableNumber(0, 2)       → ""
 */
export function formatEditableNumber(val: number, maxDec = 2): string {
  if (val === 0) return '';
  return val.toLocaleString('tr-TR', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDec,
  });
}
