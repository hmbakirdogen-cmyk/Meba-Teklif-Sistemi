import React from 'react';
import {
  ACIKLAMA_OVERFLOW,
  CELL_PAD,
  LINE_ITEM_METRICS,
  PARA_BIRIMI_ETIKETI,
  TABLE_TEXT,
  URUN_KOD_OVERFLOW,
  rcCell,
  type CellPos,
  type SetGroupPos,
} from '../templates/teklifDocumentShared';

export { DescText, MagnetIcon } from '../templates/teklifDocumentShared';

// Artık width/flex/min-width/max-width burada asla verilmez, sadece colgroup belirler
export function RowCell({
  idx,
  pos,
  rowHeight,
  setGroupPos,
  style,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  idx: number;
  pos: CellPos;
  rowHeight?: number;
  setGroupPos?: SetGroupPos;
}) {
  return (
    <td
      {...props}
      style={{
        padding: CELL_PAD,
        verticalAlign: 'middle',
        ...rcCell(pos, idx, rowHeight, setGroupPos ?? null),
        ...style,
      }}
    >
      {children}
    </td>
  );
}

export const ROW_SHELL = {
  fill: {
    width: '100%',
    minWidth: 0,
    font: 'inherit',
    color: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
  } satisfies React.CSSProperties,
  quantityWrap: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: 0,
  } satisfies React.CSSProperties,
  quantityValueWrap: {
    flex: '0 0 58%',
    minWidth: 0,
    textAlign: 'left',
  } satisfies React.CSSProperties,
  /** Edit-mode: AntD InputNumber ile uyumlu — display/width override yok.
   * Renk static görünümle birebir aynı (numeric tonu) tutulur ki edit
   * sırasında metin rengi değişmesin. */
  quantityInputStyle: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    textAlign: 'left',
    fontSize: `${LINE_ITEM_METRICS.baseFontSizePx}px`,
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
    color: TABLE_TEXT.numeric,
    lineHeight: LINE_ITEM_METRICS.lineHeight,
    whiteSpace: 'nowrap',
  } satisfies React.CSSProperties,
  quantityUnitWrap: {
    flex: '1 1 0',
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: '8px',
  } satisfies React.CSSProperties,
} as const;

export const ROW_TEXT = {
  no: {
    textAlign: 'center',
    fontSize: `${LINE_ITEM_METRICS.baseFontSizePx}px`,
    color: TABLE_TEXT.passive,
    whiteSpace: 'nowrap',
  } satisfies React.CSSProperties,
  brand: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    textAlign: 'center',
    fontSize: `${LINE_ITEM_METRICS.baseFontSizePx}px`,
    color: TABLE_TEXT.helper,
    whiteSpace: 'nowrap',
  } satisfies React.CSSProperties,
  code: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    fontSize: `${LINE_ITEM_METRICS.codeFontSizePx}px`,
    fontWeight: 600,
    color: TABLE_TEXT.code,
    letterSpacing: '-0.1px',
    ...URUN_KOD_OVERFLOW,
  } satisfies React.CSSProperties,
  description: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    fontSize: `${LINE_ITEM_METRICS.baseFontSizePx}px`,
    fontWeight: 400,
    color: TABLE_TEXT.description,
    lineHeight: LINE_ITEM_METRICS.lineHeight,
    ...ACIKLAMA_OVERFLOW,
  } satisfies React.CSSProperties,
  quantityValue: {
    display: 'block',
    width: '100%',
    fontSize: `${LINE_ITEM_METRICS.baseFontSizePx}px`,
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
    color: TABLE_TEXT.numeric,
    lineHeight: LINE_ITEM_METRICS.lineHeight,
    whiteSpace: 'nowrap',
    textAlign: 'left',
  } satisfies React.CSSProperties,
  // Birim kısaltması (Ad./kg/m): yardımcı ton — opacity yerine doğrudan #555555.
  quantityUnit: {
    display: 'block',
    width: 'auto',
    fontSize: `${LINE_ITEM_METRICS.baseFontSizePx * LINE_ITEM_METRICS.quantityUnitScale}px`,
    color: TABLE_TEXT.helper,
    lineHeight: LINE_ITEM_METRICS.lineHeight,
    whiteSpace: 'nowrap',
    textAlign: 'right',
  } satisfies React.CSSProperties,
  currency: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    fontSize: `${LINE_ITEM_METRICS.baseFontSizePx}px`,
    fontWeight: 700,
    color: TABLE_TEXT.helper,
    whiteSpace: 'nowrap',
    letterSpacing: '0.03em',
  } satisfies React.CSSProperties,
  price: {
    display: 'block',
    width: '100%',
    textAlign: 'right',
    fontSize: `${LINE_ITEM_METRICS.baseFontSizePx}px`,
    color: TABLE_TEXT.numeric,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  } satisfies React.CSSProperties,
  total: {
    display: 'block',
    width: '100%',
    textAlign: 'right',
    fontSize: `${LINE_ITEM_METRICS.baseFontSizePx}px`,
    fontWeight: 700,
    color: TABLE_TEXT.numeric,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  } satisfies React.CSSProperties,
  delivery: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    fontSize: `${LINE_ITEM_METRICS.deliveryFontSizePx}px`,
    letterSpacing: '-0.01em',
    color: TABLE_TEXT.passive,
    whiteSpace: 'nowrap',
    lineHeight: LINE_ITEM_METRICS.deliveryLineHeight,
  } satisfies React.CSSProperties,
} as const;

export function formatBirimLabel(value?: string) {
  return /^adet$/i.test(value?.trim() ?? '') || !value ? 'Adet' : value;
}

// ── Birim kısaltma eşleştirmesi ───────────────────────────────────────────────
// Depolanan tam ad ("Adet", "Metre"...) → kompakt gösterim ("Ad.", "m"...)
const BIRIM_ABBREV: Record<string, string> = {
  'adet':     'Ad.',
  'takım':    'Tk.',
  'takim':    'Tk.',
  'metre':    'Mt.',
  'cm':       'cm',
  'mm':       'mm',
  'kg':       'kg',
  'kilogram': 'kg',
  'gram':     'g',
  'litre':    'L',
  'paket':    'Pk.',
  'kutu':     'Kt.',
  'çift':     'Çft.',
  'cift':     'Çft.',
  'set':      'Set',
  'rulo':     'R.',
};

export function formatBirimAbbrev(value?: string): string {
  if (!value) return 'Ad.';
  const key = value.trim().toLowerCase();
  return BIRIM_ABBREV[key] ?? value;
}

// ── Select options (edit mode) ────────────────────────────────────────────────
// value: depolanan tam ad, label: kompakt gösterim
export const UNIT_OPTIONS: readonly { label: string; value: string }[] = [
  { label: 'Ad.',  value: 'Adet'  },
  { label: 'Tk.',  value: 'Takım' },
  { label: 'Mt.',  value: 'Metre' },
  { label: 'cm',   value: 'Cm'    },
  { label: 'mm',   value: 'Mm'    },
  { label: 'kg',   value: 'Kg'    },
  { label: 'g',    value: 'Gram'  },
  { label: 'L',    value: 'Litre' },
  { label: 'Pk.',  value: 'Paket' },
  { label: 'Kt.',  value: 'Kutu'  },
  { label: 'Çft.', value: 'Çift'  },
  { label: 'Set',  value: 'Set'   },
  { label: 'R.',   value: 'Rulo'  },
] as const;

export function formatParaBirimiLabel(pb: string) {
  return PARA_BIRIMI_ETIKETI[pb] ?? pb;
}
