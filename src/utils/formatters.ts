import { formatPhone } from './phone';

const PARA_BIRIMI_SEMBOL: Record<string, string> = {
  TRY: '₺',
  EUR: '€',
  USD: '$',
};

export function formatCurrency(tutar: number, pb: string): string {
  const formatted = tutar.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sembol = PARA_BIRIMI_SEMBOL[pb] ?? pb;
  return pb === 'TRY' ? `${formatted} ${sembol}` : `${sembol} ${formatted}`;
}

export function formatPercentage(val: number): string {
  return `%${val.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * formatAdSoyad — kullanici ad-soyad gorsel format standardi.
 *
 * Kural: ilk kelime "Title Case" (ilk harf buyuk, kalan kucuk),
 *        kalan kelimeler "TUM BUYUK".
 *
 * Ornekler:
 *   "ahmet yılmaz"        -> "Ahmet YILMAZ"
 *   "MEHMET BAKIRDÖĞEN"   -> "Mehmet BAKIRDÖĞEN"
 *   "fatih lazoğlu osman" -> "Fatih LAZOĞLU OSMAN"
 *   "ahmet"               -> "Ahmet"
 *
 * Live mode (true): kullanici yaziyor durumda — sondaki bosluk korunur ki
 * yeni kelime baslarken ekstradan space silinmesin. Save/display modunda
 * (default false) trim yapar.
 */
export function formatAdSoyad(input: string, live = false): string {
  if (!input) return '';
  const sondaBosluk = live && input.endsWith(' ') ? ' ' : '';
  const cleaned = input.replace(/\s+/g, ' ').trim();
  if (!cleaned) return sondaBosluk;
  const kelimeler = cleaned.split(' ');
  const formatted = kelimeler.map((w, i) => {
    if (!w) return w;
    if (i === 0) {
      // Ilk kelime: title-case (tr locale: i -> İ)
      const firstLower = w.slice(1).toLocaleLowerCase('tr-TR');
      const firstChar = w.charAt(0).toLocaleUpperCase('tr-TR');
      return firstChar + firstLower;
    }
    // Sonraki kelimeler: tum buyuk (tr locale: i -> İ, ı -> I)
    return w.toLocaleUpperCase('tr-TR');
  }).join(' ');
  return formatted + sondaBosluk;
}

/**
 * formatUnvan — kullanici unvan/title case standardi.
 *
 * Kural: her kelimenin ilk harfi BUYUK, kalani kucuk (tr-TR locale).
 * Parantez/noktalama kelime sinirini bozmaz; "(master" -> "(Master".
 *
 * Ornekler:
 *   "MAKİNE YÜKSEK MÜHENDİSİ" -> "Makine Yüksek Mühendisi"
 *   "satış sorumlusu"         -> "Satış Sorumlusu"
 *   "(master of science)"     -> "(Master Of Science)"
 *
 * Live mode (true): kullanici yaziyor — sondaki bosluk korunur.
 */
export function formatUnvan(input: string, live = false): string {
  if (!input) return '';
  const sondaBosluk = live && input.endsWith(' ') ? ' ' : '';
  const cleaned = input.replace(/\s+/g, ' ').trim();
  if (!cleaned) return sondaBosluk;
  const isAlpha = (ch: string) => /[a-zA-ZçğıöşüÇĞİÖŞÜâîûÂÎÛ]/.test(ch);
  // Her kelimeyi (boşlukla ayrılan) ayri ele al
  const formatted = cleaned.split(' ').map((word) => {
    let out = '';
    let firstAlphaSeen = false;
    for (const ch of word) {
      if (!firstAlphaSeen && isAlpha(ch)) {
        out += ch.toLocaleUpperCase('tr-TR');
        firstAlphaSeen = true;
      } else {
        out += ch.toLocaleLowerCase('tr-TR');
      }
    }
    return out;
  }).join(' ');
  return formatted + sondaBosluk;
}

/**
 * splitUnvanWithParen — Render'da ünvanı iki parçaya ayırır:
 *   ana metin + parantez içeriği
 * Parantez varsa (Master of Science gibi) ayri parcaya bolunur ki UI'da
 * <br/> ile yeni satira alinabilsin. Parantez yoksa ikinci parca null.
 */
export function splitUnvanWithParen(text: string): { ana: string; paren: string | null } {
  if (!text) return { ana: '', paren: null };
  const idx = text.indexOf(' (');
  if (idx === -1) return { ana: text, paren: null };
  return {
    ana: text.slice(0, idx).trim(),
    paren: text.slice(idx + 1).trim(),
  };
}

/**
 * formatCariAdi — firma adını tutarlı görsel formata çevirir.
 *
 * Kurallar (sırasıyla uygulanır):
 *   1) Bağlaçlar (ve, da, de, ya, ki, mı/mi/mu/mü) → küçük
 *   2) Nokta içeren kelimeler (A.Ş., LTD., SAN., TİC.) → tamamı BÜYÜK
 *   3) Sayı içeren kelimeler (ISO9001, 3M, 12V) → olduğu gibi korunur
 *   4) Tamamı BÜYÜK harf + ≥2 karakter (MEBA, ÖZLER, ELMOS) → korunur
 *      (Kullanıcı kasıtlı büyük yazmış marka/akronim sayılır)
 *   5) ≤3 harfli alfabetik kelimeler → BÜYÜK (kısaltma sayılır)
 *   6) Diğer → Title Case (ilk harf BÜYÜK, kalan küçük, tr-TR locale)
 *
 * Örnekler:
 *   "ÖZLER nalburiye san. tic. a.ş." → "ÖZLER Nalburiye SAN. TİC. A.Ş."
 *   "MEBA mekanik"                   → "MEBA Mekanik"
 *   "abc firması"                    → "ABC Firması"
 *   "bilgi ve iletişim"              → "Bilgi ve İletişim"
 */
const CARI_ADI_LOWER_KELIMELER = new Set(['ve', 'da', 'de', 'ya', 'ki', 'mı', 'mi', 'mu', 'mü']);

function titleCaseWord(w: string): string {
  if (!w) return w;
  const lower = w.toLocaleLowerCase('tr-TR');
  const first = lower.charAt(0) === 'i' ? 'İ' : lower.charAt(0).toLocaleUpperCase('tr-TR');
  return first + lower.slice(1);
}

export function formatCariAdi(adi: string): string {
  const trimmed = adi.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  return trimmed.split(' ').map((word) => {
    if (!word) return word;
    const lower = word.toLocaleLowerCase('tr-TR');
    // 1) Bağlaçlar küçük
    if (CARI_ADI_LOWER_KELIMELER.has(lower)) return lower;
    // 2) Nokta içerenler tamamen BÜYÜK
    if (word.includes('.')) return word.toLocaleUpperCase('tr-TR');
    // 3) Sayı içerenler olduğu gibi (ISO9001, 3M, 100mm)
    if (/\d/.test(word)) return word;
    // 4) Tamamı BÜYÜK + ≥2 karakter → kasıtlı marka/akronim, koru
    if (word.length >= 2 && /^[A-ZÇĞİÖŞÜÂÎÛ]+$/.test(word)) return word;
    // 5) ≤3 harfli alfabetik kelimeler → BÜYÜK (kısaltma sayılır)
    if (word.length <= 3 && /^[a-zçğıöşüâîûA-ZÇĞİÖŞÜÂÎÛ]+$/.test(word)) {
      return word.toLocaleUpperCase('tr-TR');
    }
    // 6) Varsayılan: Title Case
    return titleCaseWord(word);
  }).join(' ');
}

/** formatSehir — şehir adını title case'e çevirir. */
export function formatSehir(val: string): string {
  if (!val) return '';
  const trimmed = val.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed.split(' ').map(titleCaseWord).join(' ');
}

/** formatVKN — VKN/TCKN için boşluklu görüntü formatı. */
export function formatVKN(vkn: string): string {
  if (!vkn) return '';
  const digits = vkn.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 11)}`;
  }
  return vkn.trim();
}

/** formatMarka — marka adı her zaman BÜYÜK HARF. */
export function formatMarka(val: string): string {
  if (!val) return '';
  return val.trim().toLocaleUpperCase('tr-TR');
}

/**
 * formatFirmaUnvan — firma yasal ünvanında nokta içeren kısaltmaları
 * BÜYÜK HARF'e çevirir (Türk ticari standardı):
 *   "MEBA Pnömatik Hidrolik ... San. Tic. Ltd. Şti." →
 *   "MEBA Pnömatik Hidrolik ... SAN. TİC. LTD. ŞTİ."
 *
 * Düzgün isimler (MEBA, MESA, ELMOS, "Pnömatik" vb.) korunur.
 */
export function formatFirmaUnvan(ad: string): string {
  if (!ad) return '';
  return ad.replace(/\b(\w{2,4})\./g, (match) => match.toLocaleUpperCase('tr-TR'));
}

/**
 * formatAdres — adres metnini görsel formata çevirir.
 *   - Title Case ana kural
 *   - Bilinen kısaltmalar (OSB, MAH., BLV., CAD., SOK., NO:, KAT:, D:) → BÜYÜK
 *   - Sayı içeren kelimeler olduğu gibi (12., No:30 vb. — kısaltma prefix'i varsa
 *     o BÜYÜK yapılır: "no:30" → "NO:30")
 *   - " / " sonrası → tamamen BÜYÜK HARF (genellikle şehir)
 */
const ADRES_KISALTMALAR = new Set([
  'osb', 'mh', 'mah', 'blv', 'bulv', 'cd', 'cad', 'sk', 'sok',
  'mh.', 'mah.', 'blv.', 'bulv.', 'cd.', 'cad.', 'sk.', 'sok.',
  'no:', 'kat:', 'd:',
]);

function formatAdresWord(w: string): string {
  if (!w) return w;
  const lower = w.toLocaleLowerCase('tr-TR');
  if (ADRES_KISALTMALAR.has(lower)) return w.toLocaleUpperCase('tr-TR');
  for (const abbr of ADRES_KISALTMALAR) {
    if (lower.startsWith(abbr)) {
      return w.slice(0, abbr.length).toLocaleUpperCase('tr-TR') + w.slice(abbr.length);
    }
  }
  if (/\d/.test(w)) return w;
  return titleCaseWord(w);
}

export function formatAdres(val: string): string {
  if (!val) return '';
  const trimmed = val.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const sep = ' / ';
  const lastSep = trimmed.lastIndexOf(sep);
  if (lastSep !== -1) {
    const before = trimmed.slice(0, lastSep);
    const after  = trimmed.slice(lastSep + sep.length);
    const beforeFmt = before.split(' ').map(formatAdresWord).join(' ');
    const afterFmt  = after.toLocaleUpperCase('tr-TR');
    return `${beforeFmt} / ${afterFmt}`;
  }
  return trimmed.split(' ').map(formatAdresWord).join(' ');
}

export function formatTitleCaseTr(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_, space, char) => {
      if (char === 'i') return `${space}İ`;
      return `${space}${char.toUpperCase()}`;
    });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeProductCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
}

export function cleanTextInput(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function sanitizeMultilineText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * formatAciklama — ürün/satır açıklamasını Title Case'e normalize eder.
 *
 * Kurallar:
 *   - Her kelimenin baş harfi BÜYÜK (Türkçe locale: i → İ)
 *   - Bağlaçlar (ve, ile, için, gibi, kadar, mı/mi/mu/mü) küçük kalır
 *   - Birim kısaltmaları (mm, cm, m, kg, bar, psi, nm, kw, hp vs.) küçük kalır
 *   - Sayı içeren kelimeler (50mm, 3/4, M16) olduğu gibi korunur
 *   - Tamamı BÜYÜK harf yazılmış ≥2 harfli kelimeler (MEBA, ÖZLER, ISO)
 *     kasıtlı kabul edilir, dokunulmaz
 *   - Satır araları (\n) korunur — manuel alt satırlar saygılanır
 *
 * Örnekler:
 *   "hidrolik pistonlu silindir 100mm strok"
 *     → "Hidrolik Pistonlu Silindir 100mm Strok"
 *   "meba marka piston ile valf"
 *     → "Meba Marka Piston ile Valf"
 *   "MEBA marka piston" (zaten büyük)
 *     → "MEBA Marka Piston"
 */
const ACIKLAMA_LOWER_KELIMELER = new Set([
  // Bağlaçlar
  've', 'ile', 'için', 'gibi', 'kadar', 'üzeri', 'üzere',
  'mı', 'mi', 'mu', 'mü', 'da', 'de', 'ya', 'ki',
  // Uzunluk birimleri
  'mm', 'cm', 'm', 'km',
  // Ağırlık/hacim
  'kg', 'g', 'ml', 'l', 'lt', 'mg',
  // Basınç/tork
  'bar', 'psi', 'pa', 'kpa', 'mpa', 'nm',
  // Elektrik
  'a', 'v', 'w', 'kw', 'hp', 'va', 'kva',
  // Sıralı / sınır
  'min', 'max',
]);

function formatAciklamaWord(w: string): string {
  if (!w) return w;

  // 1) Tamamı BÜYÜK harf + en az 2 karakter + sadece harfler → kasıtlı kısaltma/marka, koru
  if (w.length >= 2 && /^[A-ZÇĞİÖŞÜÂÎÛ]+$/.test(w)) return w;

  // 2) Sayı içeren kelimeler olduğu gibi (100mm, 3/4, M16, Ø50)
  if (/\d/.test(w)) return w;

  // 3) Bağlaç / birim listesi → küçük
  const lower = w.toLocaleLowerCase('tr-TR');
  if (ACIKLAMA_LOWER_KELIMELER.has(lower)) return lower;

  // 4) Varsayılan: title case (Türkçe locale)
  return titleCaseWord(w);
}

export function formatAciklama(text: string): string {
  if (!text) return '';
  // Satır araları korunsun — her satırı ayrı ayrı formatla.
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim().replace(/\s+/g, ' ');
      if (!trimmed) return '';
      return trimmed.split(' ').map(formatAciklamaWord).join(' ');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n'); // 3+ ardışık boş satırı 2'ye indir
}

export function parseNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  return parseLocaleNumber(val);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatSayi(val: number): string {
  return val.toLocaleString('tr-TR');
}

export function parseLocaleNumber(raw: string): number {
  if (!raw) return 0;
  const s = raw.trim().replace(/\s/g, '');
  if (!s || s === '-' || s === ',' || s === '.') return 0;

  const commaIdx = s.lastIndexOf(',');
  const dotIdx = s.lastIndexOf('.');

  let normalized: string;
  if (commaIdx !== -1 && dotIdx !== -1) {
    if (commaIdx > dotIdx) {
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = s.replace(/,/g, '');
    }
  } else if (commaIdx !== -1) {
    normalized = s.replace(',', '.');
  } else {
    normalized = s;
  }

  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

export function formatDisplayNumber(val: number, minDec = 0, maxDec = 2): string {
  return val.toLocaleString('tr-TR', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  });
}

export function formatEditableNumber(val: number, maxDec = 2): string {
  if (val === 0) return '';
  return val.toLocaleString('tr-TR', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDec,
  });
}

/**
 * formatDisplayText — popup/modal/form inputlarında metin formatı standardı.
 * Kullanıcı yazarken (live=true) ve kaydederken (live=false) tutarlı format sağlar.
 *
 * Türler:
 * - 'cari_adi': Firma adı (ilk kelime BÜYÜK, sonraki title case)
 * - 'person_name': Kişi adı (her kelime title case)
 * - 'product_code': Ürün kodu (BÜYÜK + normalize)
 * - 'email': E-posta (küçük harf)
 * - 'category': Kategori (title case)
 * - 'unit': Birim (title case)
 * - 'description': Açıklama (title case)
 * - 'address': Adres (formatAdres kuralı)
 * - 'text': Genel metin (title case)
 * - 'currency': Para birimi (BÜYÜK)
 * - 'vergi_no': Vergi no (olduğu gibi trim)
 * - 'phone': Telefon (formatPhone)
 *
 * @param value Input değeri
 * @param type Format tipi
 * @param live Kullanıcı yazıyor (true) vs. kaydediliyor (false)
 */
export function formatDisplayText(value: string, type: string, live = true): string {
  if (!value) return '';

  switch (type) {
    case 'cari_adi':
      return formatCariAdi(value);
    case 'person_name':
      return formatUnvan(value, live);
    case 'product_code':
      return normalizeProductCode(value);
    case 'email':
      return normalizeEmail(value);
    case 'category':
    case 'unit':
    case 'description':
    case 'text':
      return formatTitleCaseTr(value);
    case 'address':
      return formatAdres(value);
    case 'currency':
      return value.trim().toLocaleUpperCase('tr-TR');
    case 'vergi_no':
      return value.trim();
    case 'phone':
      return formatPhone(value);
    default:
      return value;
  }
}
