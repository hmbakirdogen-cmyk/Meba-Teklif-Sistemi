import type { CSSProperties } from 'react';
import type { Teklif } from '../types';

export const PARA_BIRIMI_ETIKETI: Record<string, string> = {
  TRY: 'TL',
  EUR: 'EUR',
  USD: 'USD',
};

export const SEMBOL: Record<string, string> = {
  TRY: '₺',
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: '₣',
};

export const DOCUMENT_BRAND = {
  gradient: 'linear-gradient(180deg, #1E3350 0%, #152740 55%, #0F1D30 100%)',
  border: '#0E1A2E',
  shadow: '0 6px 20px rgba(15, 25, 40, 0.10)',
  shadowSm: '0 3px 10px rgba(15, 25, 40, 0.08)',
  text: '#FFFFFF',
  textSub: 'rgba(255,255,255,0.80)',
  textLabel: 'rgba(255,255,255,0.58)',
  separator: 'rgba(255,255,255,0.15)',
} as const;

export const DOCUMENT_COLORS = {
  navy: '#1A2B42',
  navySoft: '#2E4460',
  navyBorder: '#D5D3CF',
  accent: '#1A2B42',
  border: '#E2E0DC',
  borderSoft: '#EDEBE8',
  rowAlt: '#F7F6F4',
  text: '#2C2C2E',
  textMid: '#4A4A4E',
  textSoft: '#717176',
  textMuted: '#9B9BA0',
  white: '#FAFAF8',
  panel: '#F8F7F5',
  panelStrong: '#F0EFEC',
  notesBg: '#F7F6F4',
} as const;

export const DOCUMENT_COLS = {
  no: '4%',
  marka: '9%',
  urunKod: '15%',
  aciklama: '27%',
  miktar: '9%',
  birimFiyat: '13%',
  toplam: '14%',
  teslimat: '9%',
} as const;

export const DOCUMENT_COLS_ROW_CURRENCY = {
  no: '4%',
  marka: '8%',
  urunKod: '14%',
  aciklama: '21%',
  miktar: '9%',
  paraBirimi: '10%',
  birimFiyat: '12%',
  toplam: '13%',
  teslimat: '9%',
} as const;

export const CELL_PAD = '8px 8px';

export const noBreak: CSSProperties = {
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
};

const ROW_CARD = {
  bg: '#FFFFFF',
  borderClr: '#E8E6E3',
  radius: '6px',
  shadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
} as const;

type CellPos = 'first' | 'mid' | 'last';

export function rcCell(pos: CellPos, idx = 0): CSSProperties {
  const border = `1px solid ${ROW_CARD.borderClr}`;
  const radius = ROW_CARD.radius;

  return {
    background: idx % 2 === 0 ? ROW_CARD.bg : DOCUMENT_COLORS.rowAlt,
    printColorAdjust: 'exact',
    WebkitPrintColorAdjust: 'exact',
    borderTop: border,
    borderBottom: border,
    borderLeft: pos === 'first' ? border : 'none',
    borderRight: pos === 'last' ? border : 'none',
    borderTopLeftRadius: pos === 'first' ? radius : 0,
    borderBottomLeftRadius: pos === 'first' ? radius : 0,
    borderTopRightRadius: pos === 'last' ? radius : 0,
    borderBottomRightRadius: pos === 'last' ? radius : 0,
    boxShadow: pos === 'first' ? ROW_CARD.shadow : 'none',
  };
}

export const LOGO = {
  PNG_AR: 1858 / 846,
  OPT_TOP_FRAC: 87 / 846,
  OPT_BOT_FRAC: 646 / 846,
  OPT_LEFT_FRAC: 82 / 1858,
  OPT_RIGHT_FRAC: 1738 / 1858,
  FILE_HEIGHT: 128,
} as const;

export const LOGO_FILE_W = LOGO.FILE_HEIGHT * LOGO.PNG_AR;
export const LOGO_OPT_H = LOGO.FILE_HEIGHT * (LOGO.OPT_BOT_FRAC - LOGO.OPT_TOP_FRAC);
export const LOGO_OPT_W = LOGO_FILE_W * (LOGO.OPT_RIGHT_FRAC - LOGO.OPT_LEFT_FRAC);
export const LOGO_OPT_TOP = -(LOGO.FILE_HEIGHT * LOGO.OPT_TOP_FRAC);
export const LOGO_OPT_LEFT = -(LOGO_FILE_W * LOGO.OPT_LEFT_FRAC);

export const DOCUMENT_ROOT_STYLE: CSSProperties = {
  width: '210mm',
  minHeight: '297mm',
  display: 'flex',
  flexDirection: 'column',
  margin: '0 auto',
  backgroundColor: '#FAFAF8',
  colorScheme: 'light',
  fontFamily: '"Inter", "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: '11.7px',
  lineHeight: 1.52,
  letterSpacing: '0.01em',
  color: DOCUMENT_COLORS.text,
  boxSizing: 'border-box',
  padding: '9mm 10mm 8mm',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'geometricPrecision',
  fontKerning: 'normal',
  fontOpticalSizing: 'auto',
  printColorAdjust: 'exact',
  WebkitPrintColorAdjust: 'exact',
};

export const PARTY_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: '18px',
  width: '100%',
  marginBottom: '14px',
  ...noBreak,
};

export const PARTY_CARD_STYLE: CSSProperties = {
  minHeight: 118,
  padding: '12px 14px 14px',
  borderRadius: '10px',
  border: `1px solid ${DOCUMENT_COLORS.border}`,
  background: '#FFFFFF',
  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
  boxSizing: 'border-box',
};

export const PARTY_LABEL_STYLE: CSSProperties = {
  fontSize: '9px',
  fontWeight: 700,
  color: DOCUMENT_COLORS.textMuted,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: '10px',
  paddingBottom: '7px',
  borderBottom: `1px solid ${DOCUMENT_COLORS.borderSoft}`,
  lineHeight: 1.2,
};

export const PARTY_NAME_STYLE: CSSProperties = {
  fontWeight: 800,
  fontSize: '13.2px',
  color: DOCUMENT_COLORS.navy,
  marginBottom: '5px',
  lineHeight: 1.3,
  letterSpacing: '-0.012em',
};

export const PARTY_BODY_STYLE: CSSProperties = {
  fontSize: '11.2px',
  lineHeight: 1.52,
  color: DOCUMENT_COLORS.textMid,
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
};

export const SETTINGS_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: '8px',
  width: '100%',
  marginBottom: '12px',
  ...noBreak,
};

export const SETTINGS_CARD_STYLE: CSSProperties = {
  minHeight: 62,
  padding: '10px 10px 11px',
  borderRadius: '8px',
  border: `1px solid ${DOCUMENT_COLORS.border}`,
  background: 'linear-gradient(180deg, #F8F7F5 0%, #F0EFEC 100%)',
  boxShadow: 'none',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  boxSizing: 'border-box',
  printColorAdjust: 'exact',
  WebkitPrintColorAdjust: 'exact',
};

export const SETTINGS_LABEL_STYLE: CSSProperties = {
  fontSize: '8.8px',
  fontWeight: 700,
  color: DOCUMENT_COLORS.textMuted,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  lineHeight: 1.25,
  marginBottom: '5px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const SETTINGS_VALUE_STYLE: CSSProperties = {
  fontWeight: 700,
  fontSize: '12.1px',
  color: DOCUMENT_COLORS.navy,
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const TABLE_TITLE_STYLE: CSSProperties = {
  fontSize: '9.4px',
  fontWeight: 700,
  color: DOCUMENT_COLORS.textSoft,
  letterSpacing: '0.13em',
  textTransform: 'uppercase',
  marginBottom: '7px',
};

export const TABLE_STYLE: CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: '0 4px',
  borderLeft: 'none',
  borderRight: 'none',
  marginBottom: 0,
  tableLayout: 'fixed',
  printColorAdjust: 'exact',
  WebkitPrintColorAdjust: 'exact',
};

export function getTableHeadCellStyle(align: CSSProperties['textAlign']): CSSProperties {
  return {
    padding: CELL_PAD,
    textAlign: align,
    verticalAlign: 'bottom',
    fontSize: '9.7px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: DOCUMENT_COLORS.navy,
    background: '#FAFAF8',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: `0.75px solid ${DOCUMENT_COLORS.navyBorder}`,
    borderRadius: 0,
    lineHeight: 1.28,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
  };
}

export const TABLE_HEAD_SUBLABEL_STYLE: CSSProperties = {
  display: 'block',
  fontWeight: 500,
  fontSize: '7.9px',
  color: DOCUMENT_COLORS.textMuted,
  marginTop: '2px',
  letterSpacing: '0.03em',
  lineHeight: 1.2,
  opacity: 0.82,
};

export const NOTES_BOX_STYLE: CSSProperties = {
  fontSize: '12.1px',
  marginBottom: '16px',
  padding: '12px 14px',
  border: `0.75px solid ${DOCUMENT_COLORS.border}`,
  borderRadius: '8px',
  lineHeight: 1.68,
  backgroundColor: DOCUMENT_COLORS.notesBg,
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  printColorAdjust: 'exact',
  WebkitPrintColorAdjust: 'exact',
};

export const SIGNATURE_SECTION_STYLE: CSSProperties = {
  marginTop: '18px',
  padding: '9px 0 24px',
  ...noBreak,
};

export const FOOTER_BAR_STYLE: CSSProperties = {
  border: `0.75px solid ${DOCUMENT_BRAND.border}`,
  borderRadius: '8px',
  background: DOCUMENT_BRAND.gradient,
  boxShadow: 'none',
  color: DOCUMENT_BRAND.textSub,
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '9.3px',
  fontWeight: 500,
  padding: '8px 11px',
  lineHeight: 1.55,
  letterSpacing: '0.02em',
  printColorAdjust: 'exact',
  WebkitPrintColorAdjust: 'exact',
};

export function buildSettingsItems(teklif: Teklif, satirBazliParaBirimi: boolean) {
  const sembol = SEMBOL[teklif.paraBirimi] ?? teklif.paraBirimi;

  return [
    {
      tr: 'Para Birimi',
      en: 'Currency',
      value: satirBazliParaBirimi
        ? 'Satır Bazlı'
        : (sembol !== teklif.paraBirimi ? `${teklif.paraBirimi} (${sembol})` : teklif.paraBirimi),
    },
    { tr: 'Ödeme', en: 'Payment', value: teklif.odemeVadesi || '45 Gün' },
    {
      tr: 'KDV',
      en: 'VAT',
      value: satirBazliParaBirimi ? 'Satır Bazlı' : (teklif.kdvOrani > 0 ? `%${teklif.kdvOrani}` : 'Hariç'),
    },
    { tr: 'Kur', en: 'Rate', value: 'TCMB Fatura' },
    { tr: 'Geçerlilik', en: 'Validity', value: teklif.gecerlilikSuresi ?? '1 Hafta' },
  ];
}

export function splitMoneyParts(value: number) {
  const formatted = value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const commaIndex = formatted.lastIndexOf(',');
  return {
    full: formatted,
    integer: commaIndex >= 0 ? formatted.slice(0, commaIndex) : formatted,
    decimal: commaIndex >= 0 ? formatted.slice(commaIndex) : '',
  };
}

export function TableColgroup({ satirBazliParaBirimi }: { satirBazliParaBirimi: boolean }) {
  const cols = satirBazliParaBirimi ? DOCUMENT_COLS_ROW_CURRENCY : DOCUMENT_COLS;

  return (
    <colgroup>
      <col style={{ width: cols.no }} />
      <col style={{ width: cols.marka }} />
      <col style={{ width: cols.urunKod }} />
      <col style={{ width: cols.aciklama }} />
      <col style={{ width: cols.miktar }} />
      {satirBazliParaBirimi && <col style={{ width: DOCUMENT_COLS_ROW_CURRENCY.paraBirimi }} />}
      <col style={{ width: cols.birimFiyat }} />
      <col style={{ width: cols.toplam }} />
      <col style={{ width: cols.teslimat }} />
    </colgroup>
  );
}
