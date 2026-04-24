import type { CSSProperties } from 'react';
import { OFFER_TABLE_COLS } from '../constants/offerTableColumns';
import type { Teklif } from '../types';

// ── Manyetik sembol yardımcıları ─────────────────────────────────────────────

export function hasMagnetSvg(s: string): boolean {
  return s.includes('<svg');
}

export function stripMagnetSvg(s: string): string {
  return s.replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/\s+$/, '').trim();
}

/** Mıknatıs ikonunu React SVG olarak render eder (font/emoji bağımsız) */
export function MagnetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="11" height="9"
      viewBox="0 0 14 12"
      style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 4, marginBottom: 1, flexShrink: 0 }}
      aria-label="Manyetik Pistonlu"
    >
      <path d="M2 0v6a5 5 0 0 0 10 0V0" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="miter"/>
      <path d="M0.5 0h3" stroke="#dc2626" strokeWidth="3" strokeLinecap="round"/>
      <path d="M10.5 0h3" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

/**
 * Ürün açıklamasını render eder.
 * Metin içindeki ham SVG taglarını kaldırır, yerine React SVG ikonu çizer.
 * firstLine / stripParantez öncesi ham metne uygulanır.
 */
export function DescText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const hasMag = hasMagnetSvg(text);
  const clean  = hasMag ? stripMagnetSvg(text) : text;
  const cls    = ['description-text', className].filter(Boolean).join(' ');
  return (
    <span className={cls}>
      {clean}
      {hasMag ? <MagnetIcon /> : null}
    </span>
  );
}

export const DOCUMENT_PAGE = {
  widthMm: 210,
  heightMm: 297,
  paddingTopMm: 9,
  paddingXmm: 10,
  paddingBottomMm: 8,
} as const;

export function mmToPx(mm: number): number {
  return mm * (96 / 25.4);
}

export const HIGH_QUALITY_IMAGE_RENDERING = 'high-quality' as unknown as CSSProperties['imageRendering'];

export function firstLine(text: string): string {
  return text.split(/\r?\n/)[0]?.trim() ?? '';
}

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

// ── Marka renk sistemi — derin sıcak lacivert, kurumsal ──────────────────────
export const DOCUMENT_BRAND = {
  gradient:  '#1A2B42',
  border:    '#2E4460',
  shadow:    '0 2px 8px rgba(26,43,66,0.10)',
  shadowSm:  '0 1px 4px rgba(26,43,66,0.07)',
  text:      '#FFFFFF',
  textSub:   'rgba(255,255,255,0.80)',
  textLabel: 'rgba(255,255,255,0.58)',
  separator: 'rgba(255,255,255,0.15)',
} as const;

// ── Header yüzeyi (üst kartlar + genel toplam — tablo başlığı ile aynı) ────
// Tablo thead satırı ile birebir aynı görsel dil. Tüm bu yüzeyler tek kaynak.
export const HEADER_SURFACE = {
  bg:         '#FAFAF8',                      // tablo başlık arka planı
  border:     '#D5D3CF',                      // navyBorder — başlık alt çizgisi
  borderSoft: 'rgba(26,43,66,0.08)',
  shadow:     'none',
  text:       '#1A2B42',                      // navy — başlık metni
  textSub:    '#2E4460',                      // navySoft
  textLabel:  '#717176',                      // textSoft
  separator:  'rgba(26,43,66,0.12)',
  // Vurgu renkleri (açık zeminde okunur)
  negRed:     '#92400E',                      // iskonto (koyu amber)
  posGreen:   '#065F46',                      // KDV (koyu yeşil)
} as const;

// ── Döküman renk paleti — sıcak nötr, tablo renk diliyle eşleşik ─────────────
export const DOCUMENT_COLORS = {
  navy:        '#1A2B42',   // derin lacivert — başlık, vurgu metin
  navySoft:    '#2E4460',   // orta lacivert — ikincil vurgu
  navyBorder:  '#D5D3CF',   // sıcak gri — tablo başlık altı çizgisi
  accent:      '#1E3A5F',   // etkileşim vurgu tonu
  border:      '#E2E0DC',   // standart sıcak kenarlık
  borderSoft:  '#EDEBE8',   // hafif sıcak kenarlık
  rowAlt:      '#F7F6F4',   // zebra satır arka planı
  text:        '#2C2C2E',   // birincil metin — sıcak antrasit
  textMid:     '#4A4A4E',   // ikincil metin
  textSoft:    '#717176',   // yardımcı metin
  textMuted:   '#9B9BA0',   // soluk etiket, alt açıklama
  white:       '#FFFFFF',   // saf beyaz (içerik yüzeyi)
  panel:       '#F8F7F5',   // panel arka planı
  panelStrong: '#F0EFEC',   // güçlü panel yüzeyi
  notesBg:     '#F7F6F4',   // notlar kutusu arka planı
  // ── İmza bölümü kahve paleti ──────────────────────────────────────────────
  sigPrimary:   '#4E3B2B',   // koyu kahve — imza bölümü Türkçe metinler
  sigSecondary: '#8A7462',   // orta kahve — imza bölümü İngilizce metinler
  sigBorder:    '#C8B8A6',   // açık kahve — imza çizgileri
} as const;


// Merkezi kolon genişlikleri yeni dosyadan alınır
export { OFFER_TABLE_COLS } from '../constants/offerTableColumns';
export const OFFER_TABLE_COLUMN_COUNT = 9;

// Tablo colgroup'u merkezi sistemden üretir
// Her durumda 9 kolon emit edilir. Para birimi kolonu açık/kapalı fark etmez;
// görsel içerik satır seviyesinde kontrol edilir, kolon ölçüsü sabittir.
// Dinamik ürün kodu genişliği: teklif satırları içindeki en uzun kodu bulur
export function TableColgroup(props: { satirBazliParaBirimi?: boolean, teklifSatirlari?: { urunKod?: string }[] }) {
  // Ortalama karakter genişliği (px) ve padding
  const CHAR_W = 7.2;
  const PAD = 18;
  const MIN = 90;
  const MAX = 180;
  let codeColWidth = MIN;
  if (props?.teklifSatirlari && props.teklifSatirlari.length > 0) {
    const maxLen = props.teklifSatirlari.reduce((max, row) => Math.max(max, (row.urunKod || '').length), 0);
    codeColWidth = Math.max(MIN, Math.min(MAX, Math.round(maxLen * CHAR_W + PAD)));
  }
  return (
    <colgroup>
      <col style={{ width: OFFER_TABLE_COLS.no }} />
      <col style={{ width: OFFER_TABLE_COLS.marka }} />
      <col style={{ width: codeColWidth + 'px' }} />
      <col style={{ width: OFFER_TABLE_COLS.aciklama, minWidth: '60px' }} />
      <col style={{ width: OFFER_TABLE_COLS.miktar }} />
      <col style={{ width: OFFER_TABLE_COLS.paraBirimi }} />
      <col style={{ width: OFFER_TABLE_COLS.birimFiyat }} />
      <col style={{ width: OFFER_TABLE_COLS.toplam }} />
      <col style={{ width: OFFER_TABLE_COLS.teslimat }} />
    </colgroup>
  );
}

export const LINE_ITEM_METRICS = {
  rowHeightPx: 24,
  cellPaddingYpx: 2,
  cellPaddingXpx: 4,
  editorHeightPx: 17,
  baseFontSizePx: 11,
  codeFontSizePx: 10.5,
  deliveryFontSizePx: 10,
  lineHeight: 1.15,
  deliveryLineHeight: 1.15,
  quantityUnitScale: 0.88,
} as const;

export const CELL_PAD = `${LINE_ITEM_METRICS.cellPaddingYpx}px ${LINE_ITEM_METRICS.cellPaddingXpx}px`;
export const LINE_ITEM_ROW_HEIGHT = `${LINE_ITEM_METRICS.rowHeightPx}px`;
export const LINE_ITEM_EDITOR_HEIGHT = `${LINE_ITEM_METRICS.editorHeightPx}px`;
export const LINE_ITEM_CSS_VARS = `
  --line-row-height: ${LINE_ITEM_ROW_HEIGHT};
  --line-cell-font-size: ${LINE_ITEM_METRICS.baseFontSizePx}px;
  --line-cell-line-height: ${LINE_ITEM_METRICS.lineHeight};
  --line-cell-padding-y: ${LINE_ITEM_METRICS.cellPaddingYpx}px;
  --line-cell-padding-x: ${LINE_ITEM_METRICS.cellPaddingXpx}px;
  --line-editor-height: ${LINE_ITEM_EDITOR_HEIGHT};
`;

export const URUN_KOD_OVERFLOW: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'clip',          // "..." yerine temiz kesim
};

// Açıklama hücresi: kesme / ellipsis / line-clamp YOK.
// Tek satıra sığan metin doğal olarak tek satırda kalır; sığmayan metin
// kelime sınırında 2. satıra düşer. Satır yüksekliği sadece ihtiyaç halinde
// büyüyebilsin diye rcCell() max-height uygulamaz.
export const ACIKLAMA_OVERFLOW: CSSProperties = {
  whiteSpace: 'normal',
  overflow: 'visible',
  overflowWrap: 'normal',
  wordBreak: 'normal',
  lineHeight: LINE_ITEM_METRICS.lineHeight,
};

export const noBreak: CSSProperties = {
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
};

// Satır hücresi — düz, çizgi tabanlı (card/yuvarlatma yok)
export const ROW_CARD = {
  bg:        '#FFFFFF',
  borderClr: '#E8E6E3',
  radius:    '6px',
  shadow:    '0 1px 2px rgba(0, 0, 0, 0.03)',
} as const;

export type CellPos = 'first' | 'mid' | 'last';

export function rcCell(pos: CellPos, idx = 0): CSSProperties {
  const border = `0.75px solid ${ROW_CARD.borderClr}`;
  const radius = ROW_CARD.radius;

  return {
    // Sabit yükseklik yok; kısa açıklamalar min-height'te kalır,
    // 2. satıra düşen açıklama varsa sadece o satır büyür.
    minHeight:              LINE_ITEM_ROW_HEIGHT,
    boxSizing:              'border-box',
    background:             idx % 2 === 0 ? ROW_CARD.bg : DOCUMENT_COLORS.rowAlt,
    printColorAdjust:       'exact',
    WebkitPrintColorAdjust: 'exact',
    borderTop:              border,
    borderBottom:           border,
    borderLeft:             pos === 'first' ? border : 'none',
    borderRight:            pos === 'last' ? border : 'none',
    borderTopLeftRadius:    pos === 'first' ? radius : 0,
    borderBottomLeftRadius: pos === 'first' ? radius : 0,
    borderTopRightRadius:   pos === 'last' ? radius : 0,
    borderBottomRightRadius: pos === 'last' ? radius : 0,
    boxShadow:              pos === 'first' ? ROW_CARD.shadow : 'none',
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
  width: `${DOCUMENT_PAGE.widthMm}mm`,
  minHeight: `${DOCUMENT_PAGE.heightMm}mm`,
  display: 'flex',
  flexDirection: 'column',
  margin: '0 auto',
  backgroundColor: '#FFFFFF',
  colorScheme: 'light',
  fontFamily: '"Inter", "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: '11.7px',
  lineHeight: 1.52,
  letterSpacing: '0.01em',
  color: DOCUMENT_COLORS.text,
  boxSizing: 'border-box',
  padding: `${DOCUMENT_PAGE.paddingTopMm}mm ${DOCUMENT_PAGE.paddingXmm}mm ${DOCUMENT_PAGE.paddingBottomMm}mm`,
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
  marginTop: '18px',
  marginBottom: '14px',
  ...noBreak,
};

export const PARTY_CARD_STYLE: CSSProperties = {
  padding: '0',
  boxSizing: 'border-box',
};

export const PARTY_LABEL_STYLE: CSSProperties = {
  fontSize: '9px',
  fontWeight: 700,
  color: DOCUMENT_COLORS.textMuted,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: '6px',
  paddingBottom: '5px',
  borderBottom: `0.75px solid ${DOCUMENT_COLORS.border}`,
  lineHeight: 1.2,
};

export const PARTY_NAME_STYLE: CSSProperties = {
  fontWeight: 700,
  fontSize: '12.5px',
  color: DOCUMENT_COLORS.navy,
  marginBottom: '3px',
  lineHeight: 1.35,
  letterSpacing: '-0.01em',
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
  padding: '9px 10px',
  textAlign: 'center',
  minHeight: 52,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1,
  boxSizing: 'border-box',
  overflow: 'hidden',
  background: HEADER_SURFACE.bg,
  border: `1px solid ${HEADER_SURFACE.border}`,
  borderRadius: '8px',
  boxShadow: 'none',
  color: HEADER_SURFACE.text,
  printColorAdjust: 'exact',
  WebkitPrintColorAdjust: 'exact',
};

export const SETTINGS_LABEL_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'baseline',
  justifyContent: 'center',
  gap: '3px',
  width: '100%',
  overflow: 'hidden',
  flexWrap: 'nowrap',
  marginBottom: '3px',
};

export const SETTINGS_TR_LABEL_STYLE: CSSProperties = {
  fontSize: '8px',
  fontWeight: 600,
  color: HEADER_SURFACE.textSub,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

export const SETTINGS_SEP_STYLE: CSSProperties = {
  fontSize: '6px',
  color: HEADER_SURFACE.textLabel,
  lineHeight: 1.2,
  flexShrink: 0,
  opacity: 0.7,
  alignSelf: 'center',
};

export const SETTINGS_EN_LABEL_STYLE: CSSProperties = {
  fontSize: '6.5px',
  fontWeight: 400,
  color: HEADER_SURFACE.textLabel,
  letterSpacing: '0.03em',
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

export const SETTINGS_VALUE_STYLE: CSSProperties = {
  fontWeight: 700,
  fontSize: '12.5px',
  color: HEADER_SURFACE.text,
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const TABLE_TITLE_STYLE: CSSProperties = {
  fontSize: '9px',
  fontWeight: 600,
  color: DOCUMENT_COLORS.textSoft,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  marginBottom: '6px',
};

export const TABLE_STYLE: CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: '0 2px',
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
    whiteSpace: 'nowrap',
  };
}

export const TABLE_HEAD_SUBLABEL_STYLE: CSSProperties = {
  display: 'block',
  fontWeight: 400,
  fontSize: '7.5px',
  color: DOCUMENT_COLORS.textMuted,
  marginTop: '1px',
  letterSpacing: '0.02em',
  lineHeight: 1.2,
};

export const NOTES_BOX_STYLE: CSSProperties = {
  fontSize: '12.1px',
  marginBottom: '16px',
  padding: '11px 14px',
  border: `0.75px solid ${DOCUMENT_COLORS.border}`,
  borderRadius: '6px',
  lineHeight: 1.68,
  backgroundColor: DOCUMENT_COLORS.notesBg,
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  printColorAdjust: 'exact',
  WebkitPrintColorAdjust: 'exact',
};

export const SIGNATURE_SECTION_STYLE: CSSProperties = {
  marginTop: '6px',
  padding: '4px 0 8px',
  ...noBreak,
};

// Footer — düz koyu (#0F172A), gradyan yok
export const FOOTER_BAR_STYLE: CSSProperties = {
  border: `0.75px solid ${DOCUMENT_BRAND.border}`,
  borderRadius: '6px',
  background: DOCUMENT_BRAND.gradient,
  boxShadow: 'none',
  color: DOCUMENT_BRAND.textSub,
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '9px',
  fontWeight: 500,
  padding: '7px 11px',
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
    { tr: 'Ödeme Vadesi', en: 'Payment Terms', value: teklif.odemeVadesi || '45 Gün' },
    {
      tr: 'KDV Oranı',
      en: 'VAT Rate',
      value: satirBazliParaBirimi ? 'Satır Bazlı' : (teklif.kdvOrani > 0 ? `%${teklif.kdvOrani}` : 'Hariç'),
    },
    { tr: 'Döviz Kuru', en: 'Exchange Rate', value: 'TCMB Fatura' },
    { tr: 'Geçerlilik', en: 'Validity', value: teklif.gecerlilikSuresi ?? '1 Hafta' },
  ];
}


