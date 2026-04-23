import React from 'react';
import {
  ACIKLAMA_OVERFLOW,
  CELL_PAD,
  DOCUMENT_COLORS,
  PARA_BIRIMI_ETIKETI,
  URUN_KOD_OVERFLOW,
  rcCell,
  type CellPos,
} from '../templates/teklifDocumentShared';

export { DescText, MagnetIcon } from '../templates/teklifDocumentShared';

const C = DOCUMENT_COLORS;

export function RowCell({
  idx,
  pos,
  style,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  idx: number;
  pos: CellPos;
}) {
  return (
    <td
      {...props}
      style={{
        padding: CELL_PAD,
        verticalAlign: 'middle',
        ...rcCell(pos, idx),
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
  /** Edit-mode: AntD InputNumber ile uyumlu — display/width override yok */
  quantityInputStyle: {
    flex: '0 0 58%',
    minWidth: 0,
    textAlign: 'left',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
    color: C.textMid,
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
    fontSize: '11px',
    color: C.textMuted,
    whiteSpace: 'nowrap',
  } satisfies React.CSSProperties,
  brand: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    textAlign: 'center',
    fontSize: '11px',
    color: C.textMid,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } satisfies React.CSSProperties,
  code: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    fontSize: '11px',
    fontWeight: 600,
    color: C.accent,
    letterSpacing: '-0.1px',
    ...URUN_KOD_OVERFLOW,
  } satisfies React.CSSProperties,
  description: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    fontSize: '11px',
    fontWeight: 400,
    color: C.textMid,
    lineHeight: 1.4,
    ...ACIKLAMA_OVERFLOW,
  } satisfies React.CSSProperties,
  quantityValue: {
    display: 'block',
    width: '100%',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
    color: C.textMid,
    whiteSpace: 'nowrap',
    textAlign: 'left',
  } satisfies React.CSSProperties,
  quantityUnit: {
    display: 'block',
    width: 'auto',
    opacity: 0.6,
    fontSize: '0.88em',
    color: C.textMid,
    whiteSpace: 'nowrap',
    textAlign: 'right',
  } satisfies React.CSSProperties,
  currency: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: C.textMid,
    whiteSpace: 'nowrap',
    letterSpacing: '0.03em',
  } satisfies React.CSSProperties,
  price: {
    display: 'block',
    width: '100%',
    textAlign: 'right',
    fontSize: '11px',
    color: C.textMid,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  } satisfies React.CSSProperties,
  total: {
    display: 'block',
    width: '100%',
    textAlign: 'right',
    fontSize: '11px',
    fontWeight: 700,
    color: C.navy,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  } satisfies React.CSSProperties,
  delivery: {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    fontSize: '10.5px',
    color: C.textSoft,
    whiteSpace: 'nowrap',
  } satisfies React.CSSProperties,
} as const;

export function formatBirimLabel(value?: string) {
  return /^adet$/i.test(value?.trim() ?? '') || !value ? 'Adet' : value;
}

export function formatBirimAbbrev(value?: string) {
  return /^adet$/i.test(value?.trim() ?? '') || !value ? 'Ad.' : value;
}

export function formatParaBirimiLabel(pb: string) {
  return PARA_BIRIMI_ETIKETI[pb] ?? pb;
}
