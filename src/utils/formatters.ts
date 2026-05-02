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

export function formatCariAdi(adi: string): string {
  const trimmed = adi.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  return trimmed.split(' ').map((word, idx) => {
    if (!word) return word;
    if (idx === 0) return word.toLocaleUpperCase('tr-TR');
    const lower = word.toLocaleLowerCase('tr-TR');
    const first = lower[0] === 'i' ? 'İ' : lower[0].toLocaleUpperCase('tr-TR');
    return first + lower.slice(1);
  }).join(' ');
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

export function parseNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(String(val).replace(',', '.'));
  return isNaN(n) ? 0 : n;
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
