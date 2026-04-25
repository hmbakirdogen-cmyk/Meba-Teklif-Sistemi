import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
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
 * Ürün açıklamasını render eder. Depodaki açıklama ne ise tamamı basılır;
 * kısaltma / kesme / ellipsis uygulanmaz. Sadece ham <svg> etiketleri React
 * SVG ikonuna dönüştürülür.
 *
 * Hücre genişliğine göre fit-level hesaplanır:
 *   1 → 12px   (varsayılan, tek satır)
 *   2 → 11px   (tek satır)
 *   3 → 10.5px (tek satır)
 *   4 → 10.5px, 2 satıra kontrollü wrap
 *
 * Ölçüm offscreen bir <span> üzerinde tek seferde yapılır; yalnızca içerik
 * değişiminde yeniden çalışır. useLayoutEffect paint öncesi çalıştığı için
 * html2canvas yakalamasından önce doğru seviye uygulanmış olur.
 */
export function DescText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fitLevel, setFitLevel] = useState<1 | 2 | 3 | 4>(1);

  const hasMag = text ? hasMagnetSvg(text) : false;
  const clean  = text ? (hasMag ? stripMagnetSvg(text) : text) : '';

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !clean) return;
    const parent = el.parentElement;
    if (!parent) return;

    const available = parent.clientWidth - 4; // hücre kenarında nefes payı
    if (available <= 0) return;

    const cs = window.getComputedStyle(el);
    const measurer = document.createElement('span');
    measurer.style.position     = 'absolute';
    measurer.style.left         = '-9999px';
    measurer.style.top          = '0';
    measurer.style.visibility   = 'hidden';
    measurer.style.whiteSpace   = 'nowrap';
    measurer.style.fontFamily   = cs.fontFamily;
    measurer.style.fontWeight   = cs.fontWeight;
    measurer.style.letterSpacing = cs.letterSpacing;
    measurer.textContent        = clean;
    document.body.appendChild(measurer);

    try {
      measurer.style.fontSize = '12px';
      if (measurer.offsetWidth <= available) { setFitLevel(1); return; }
      measurer.style.fontSize = '11px';
      if (measurer.offsetWidth <= available) { setFitLevel(2); return; }
      measurer.style.fontSize = '10.5px';
      if (measurer.offsetWidth <= available) { setFitLevel(3); return; }
      setFitLevel(4);
    } finally {
      document.body.removeChild(measurer);
    }
  }, [clean]);

  if (!clean) return null;
  const cls = ['description-text', `df-${fitLevel}`, className].filter(Boolean).join(' ');
  return (
    <span ref={ref} className={cls}>
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


// Merkezi kolon genişlikleri — yalnızca totals bloğu referans alır. Kalem
// tablosunun gerçek genişlikleri TableColgroup içinde her teklif için tekrar
// hesaplanır (içerik-tabanlı optimizasyon).
export { OFFER_TABLE_COLS } from '../constants/offerTableColumns';
export const OFFER_TABLE_COLUMN_COUNT = 9;

/**
 * Kalem tablosu colgroup üreticisi.
 *
 * Aktif teklifteki SATIRLARI tarar, her data kolonu için en uzun içeriğin
 * genişliğini hesaplar ve clamp ile sınır içinde tutar. Açıklama kolonu
 * kalan tüm boşluğu alır — en esnek ve en geniş kolon o olur. Böylece
 * gereksiz boş duran sağ kolonlar varsa, bu alan açıklamaya aktarılır.
 */
const DOCUMENT_FONT_FAMILY =
  '"Inter", "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/** Off-DOM metin ölçüm yardımcısı — bir kerede sadece bir <span> kullanır. */
function measureTextWidth(
  text: string,
  fontSizePx: number,
  fontWeight: number | string = 400,
  letterSpacing = '0',
): number {
  if (!text) return 0;
  const el = document.createElement('span');
  el.style.position      = 'absolute';
  el.style.left          = '-9999px';
  el.style.top           = '0';
  el.style.visibility    = 'hidden';
  el.style.whiteSpace    = 'nowrap';
  el.style.fontFamily    = DOCUMENT_FONT_FAMILY;
  el.style.fontSize      = `${fontSizePx}px`;
  el.style.fontWeight    = String(fontWeight);
  el.style.letterSpacing = letterSpacing;
  el.textContent         = text;
  document.body.appendChild(el);
  const w = el.offsetWidth;
  document.body.removeChild(el);
  return w;
}

export interface OfferTableRow {
  marka?: string;
  urunKod?: string;
  miktar?: number;
  birim?: string;
  birimFiyat?: number;
  indirimOrani?: number;
  satirToplami?: number;
  teslimTarihi?: string;
}

export interface OfferColumnWidths {
  no: number;
  marka: number;
  code: number;
  qty: number;
  paraBirimi: number;
  unitPrice: number;
  total: number;
  delivery: number;
}

/**
 * Kalem tablosunun her data kolonunun piksel genişliğini gerçek metin
 * ölçümüyle hesaplar. Hem TableColgroup hem totals card hizalama hesabı
 * aynı kaynaktan beslenir.
 */
export function computeOfferColumnWidths(
  rows: ReadonlyArray<OfferTableRow>,
  satirBazliParaBirimi: boolean,
): OfferColumnWidths {
  const canMeasure = typeof document !== 'undefined';

  const fmtPrice = (n?: number) => (n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtQty   = (n?: number) => (n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });

  const abbrev = (b?: string): string => {
    const k = (b ?? '').trim().toLowerCase();
    const map: Record<string, string> = {
      adet: 'Ad.', takım: 'Tk.', takim: 'Tk.', metre: 'Mt.',
      kg: 'kg', gram: 'g', litre: 'L', paket: 'Pk.',
      kutu: 'Kt.', çift: 'Çft.', cift: 'Çft.', set: 'Set', rulo: 'R.',
    };
    return map[k] ?? (b || 'Ad.');
  };

  const widestOf = (
    texts: Array<string>,
    fontSizePx: number,
    fontWeight: number | string = 400,
    letterSpacing = '0',
    charEstimate = 6.0,
  ): number => {
    const cleaned = texts.filter(Boolean);
    if (cleaned.length === 0) return 0;
    if (canMeasure) {
      let w = 0;
      for (const t of cleaned) {
        const m = measureTextWidth(t, fontSizePx, fontWeight, letterSpacing);
        if (m > w) w = m;
      }
      return w;
    }
    const longest = cleaned.reduce((m, t) => Math.max(m, t.length), 0);
    return Math.round(longest * charEstimate);
  };

  const PAD = LINE_ITEM_METRICS.cellPaddingXpx * 2;
  const BUFFER = 2;
  const wrap = (min: number, contentW: number, headerW: number = 0): number =>
    Math.max(min, Math.ceil(Math.max(contentW, headerW) + PAD + BUFFER));

  const H_SIZE = 9.7, H_WEIGHT = 700, H_LS = '0.06em', H_SUB_SIZE = 7.5;
  const headerW = (main: string, sub: string): number => {
    if (!canMeasure) return Math.max(main.length * 5.8, sub.length * 4.5);
    return Math.max(
      measureTextWidth(main, H_SIZE, H_WEIGHT, H_LS),
      measureTextWidth(sub, H_SUB_SIZE, 400, H_LS),
    );
  };

  const noHeaderW    = headerW('#', '');
  const markaHeaderW = headerW('Marka', 'Brand');
  const codeHeaderW  = headerW('Ürün Kodu', 'Item No');
  const qtyHeaderW   = headerW('Miktar', 'Qty');
  const pbHeaderW    = headerW('Para Birimi', 'Currency');
  const upHeaderW    = headerW('Birim Fiyat', 'Unit Price');
  const totHeaderW   = headerW('Toplam', 'Total');
  const delHeaderW   = headerW('Teslimat', 'Delivery');

  const markaContentW    = widestOf(rows.map((r) => r.marka ?? ''), LINE_ITEM_METRICS.baseFontSizePx, 400, '0', 6.0);
  const codeContentW     = widestOf(rows.map((r) => r.urunKod ?? ''), LINE_ITEM_METRICS.codeFontSizePx, 600, '-0.1px', 6.4);
  const qtyContentW      = widestOf(
    rows.map((r) => `${fmtQty(r.miktar)} ${abbrev(r.birim)}`),
    LINE_ITEM_METRICS.baseFontSizePx, 600, '0', 5.8,
  );
  const unitPriceContentW = widestOf(
    rows.map((r) => {
      const nihai = (r.birimFiyat ?? 0) * (1 - (r.indirimOrani ?? 0) / 100);
      return fmtPrice(nihai);
    }),
    LINE_ITEM_METRICS.baseFontSizePx, 400, '0', 6.3,
  );
  const totalContentW    = widestOf(rows.map((r) => fmtPrice(r.satirToplami)), LINE_ITEM_METRICS.baseFontSizePx, 700, '0', 6.5);
  const deliveryContentW = widestOf(rows.map((r) => r.teslimTarihi ?? ''), LINE_ITEM_METRICS.deliveryFontSizePx, 400, '-0.01em', 5.4);
  const paraBirimiContentW = satirBazliParaBirimi
    ? widestOf(['TL', 'USD', 'EUR'], LINE_ITEM_METRICS.baseFontSizePx, 700, '0.03em', 6.5)
    : 0;

  return {
    no:         wrap(22, 0,                 noHeaderW),
    marka:      wrap(32, markaContentW,     markaHeaderW),
    code:       wrap(56, codeContentW,      codeHeaderW),
    qty:        wrap(44, qtyContentW,       qtyHeaderW),
    paraBirimi: satirBazliParaBirimi ? wrap(38, paraBirimiContentW, pbHeaderW) : 0,
    unitPrice:  wrap(60, unitPriceContentW, upHeaderW),
    total:      wrap(60, totalContentW,     totHeaderW),
    delivery:   wrap(46, deliveryContentW,  delHeaderW),
  };
}

/**
 * Totals card içindeki rakamların sağ padding'i — kart çerçevesi sayfa
 * sağına kadar uzasa bile, rakamların sağ X'i tablonun "Toplam" kolonu
 * değer X'iyle birebir hizalanır.
 *
 * Kart sağ kenarı = sayfa sağı.  Toplam değer X'i = sayfa sağı − teslimat
 * kolon genişliği − CELL_PAD. Yani rakam padding-right = teslimat + 4px.
 */
export function computeTotalsAmountRightOffset(
  rows: ReadonlyArray<OfferTableRow>,
  satirBazliParaBirimi: boolean = false,
): number {
  const widths = computeOfferColumnWidths(rows, satirBazliParaBirimi);
  return widths.delivery + LINE_ITEM_METRICS.cellPaddingXpx;
}

export function TableColgroup(props: {
  satirBazliParaBirimi?: boolean;
  teklifSatirlari?: ReadonlyArray<OfferTableRow>;
}) {
  const rows = props.teklifSatirlari ?? [];
  const satirBazli = props.satirBazliParaBirimi ?? false;
  const w = computeOfferColumnWidths(rows, satirBazli);
  const noWidth = w.no, markaWidth = w.marka, codeWidth = w.code,
        qtyWidth = w.qty, paraBirimiWidth = w.paraBirimi,
        unitPriceWidth = w.unitPrice, totalWidth = w.total,
        deliveryWidth = w.delivery;

  return (
    <colgroup>
      <col style={{ width: `${noWidth}px` }} />
      <col style={{ width: `${markaWidth}px` }} />
      <col style={{ width: `${codeWidth}px` }} />
      {/* Açıklama: width verilmez → table-layout:fixed altında kalan boşluğu alır */}
      <col style={{ minWidth: '60px' }} />
      <col style={{ width: `${qtyWidth}px` }} />
      <col style={{ width: `${paraBirimiWidth}px` }} />
      <col style={{ width: `${unitPriceWidth}px` }} />
      <col style={{ width: `${totalWidth}px` }} />
      <col style={{ width: `${deliveryWidth}px` }} />
    </colgroup>
  );
}

export const LINE_ITEM_METRICS = {
  // Satır: 11px × 1.15 line-height ≈ 12.65px metin + 2×3px padding = ~18.65px.
  // Min height 20px bu içeriği rahatça kapsar, gereksiz baş/ayak boşluğu yok.
  rowHeightPx: 20,
  cellPaddingYpx: 3,
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

// Ürün kodu hücresi: ASLA kesilmez. Kolon genişliği TableColgroup içinde
// en uzun koda göre hesaplanır; hücre yalnızca tek satıra zorlanır.
export const URUN_KOD_OVERFLOW: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'visible',
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

export function rcCell(pos: CellPos, idx = 0, rowHeight?: number): CSSProperties {
  const border = `0.75px solid ${ROW_CARD.borderClr}`;
  const radius = ROW_CARD.radius;

  // Personelin elle çektiği rowHeight varsa td'nin "height"i olur.
  // CSS table cell semantiğinde td height ZEMIN gibi davranır → içerik
  // daha çok yer isterse satır yine büyür, ama altına da düşmez.
  const heightStyle: CSSProperties = rowHeight && rowHeight > 0
    ? { height: `${rowHeight}px` }
    : {};

  return {
    // Sabit yükseklik yok; kısa açıklamalar min-height'te kalır,
    // 2. satıra düşen açıklama varsa sadece o satır büyür.
    minHeight:              LINE_ITEM_ROW_HEIGHT,
    ...heightStyle,
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
  // Görsel overlay'i bu container'a bağlı absolute olarak konumlanır.
  position: 'relative',
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
  // Satırlar arasında görünür hava — 3px × 0.75 ≈ 2px (sıkı kompakt)
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


