export const OPTICAL_SEPARATOR_ALPHA = {
  head: 0.13,
  body: 0.10,
} as const;

export const OPTICAL_SEPARATOR_FADE = {
  head: { topInset: '12%', bottomInset: '88%' },
  body: { topInset: '6%', bottomInset: '94%' },
} as const;

export function asOfferSeparatorRgba(alpha: number): string {
  return `rgba(26,43,66,${alpha.toFixed(2)})`;
}

export const OPTICAL_SEPARATOR_COLOR = {
  head: asOfferSeparatorRgba(OPTICAL_SEPARATOR_ALPHA.head),
  body: asOfferSeparatorRgba(OPTICAL_SEPARATOR_ALPHA.body),
} as const;
