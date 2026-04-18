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

export function formatCariAdi(adi: string): string {
  const trimmed = adi.trim();
  if (!trimmed) return trimmed;
  const spaceIdx = trimmed.search(/\s/);
  if (spaceIdx === -1) {
    return trimmed.toLocaleUpperCase('tr-TR');
  }
  return trimmed.slice(0, spaceIdx).toLocaleUpperCase('tr-TR') + trimmed.slice(spaceIdx);
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

export function stripParantez(text: string): string {
  if (!text) return '';
  return text.split('(')[0].trim();
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
