import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Teklif } from '../types';
import { getOfferHeaderLayoutProfile } from '../styles/logoStyles';

// ── Manyetik sembol yardımcıları ─────────────────────────────────────────────

export function hasMagnetSvg(s: string): boolean {
  return s.includes('<svg');
}

export function stripMagnetSvg(s: string): string {
  return s.replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/\s+$/, '').trim();
}

/** Mıknatıs ikonunu React SVG olarak render eder (font/emoji bağımsız).
 *  shape-rendering="geometricPrecision" — html2canvas SVG rasterizasyonunda
 *  stroke anti-alias kalitesini iyileştirir; A4 ve PDF'te keskin ikon. */
export function MagnetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="11" height="9"
      viewBox="0 0 14 12"
      shapeRendering="geometricPrecision"
      style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 4, marginBottom: 1, flexShrink: 0 }}
      aria-label="Manyetik Pistonlu"
    >
      <path d="M2 0v6a5 5 0 0 0 10 0V0" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" />
      <path d="M0.5 0h3" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d="M10.5 0h3" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
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

    // Ölçüm kaynağı: DescText'in DIREKT parent'ı bazen inline bir
    // <span class="editable-field"> oluyor (canlı A4 düzenleyici tarafında).
    // İlk pozitif clientWidth'e sahip atayı bul (td hücresi); canlı A4 ile
    // PDF arasında birebir aynı fitLevel'i üretir.
    let measureHost: HTMLElement | null = el.parentElement;
    while (measureHost) {
      if (measureHost.clientWidth > 0) break;
      measureHost = measureHost.parentElement;
    }
    if (!measureHost) return;

    /** fitLevel'i mevcut measureHost genişliğine göre yeniden hesapla.
     *  ResizeObserver geldiğinde de çağrılır → kolon yeniden boyutlanırsa
     *  satır otomatik küçülür/büyür. */
    const recompute = () => {
      const host = measureHost;
      if (!host) return;

      // Manuel alt satır (\n) varsa: tek satıra sığdırmayı atla, doğrudan
      // wrap moduna (df-4) geç. CSS pre-wrap newline'ları saygılar.
      if (clean.includes('\n')) {
        setFitLevel(4);
        return;
      }

      const available = host.clientWidth - 4; // hücre kenarında nefes payı
      if (available <= 0) return;

      const cs = window.getComputedStyle(el);
      const measurer = document.createElement('span');
      measurer.style.position      = 'absolute';
      measurer.style.left          = '-9999px';
      measurer.style.top           = '0';
      measurer.style.visibility    = 'hidden';
      measurer.style.whiteSpace    = 'nowrap';
      measurer.style.fontFamily    = cs.fontFamily;
      measurer.style.fontWeight    = cs.fontWeight;
      measurer.style.letterSpacing = cs.letterSpacing;
      measurer.textContent         = clean;
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
    };

    recompute();
    // Kolon/hücre genişliği değişirse fitLevel yeniden hesaplansın
    // (pencere boyutu, kolon resize, satır araya ekleme vs.).
    const ro = new ResizeObserver(recompute);
    ro.observe(measureHost);
    return () => ro.disconnect();
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

export const DOCUMENT_LAYOUT_TOKENS = {
  pageWidthMm: DOCUMENT_PAGE.widthMm,
  pageHeightMm: DOCUMENT_PAGE.heightMm,
  pagePaddingTopMm: DOCUMENT_PAGE.paddingTopMm,
  pagePaddingXmm: DOCUMENT_PAGE.paddingXmm,
  pagePaddingBottomMm: DOCUMENT_PAGE.paddingBottomMm,
  compactHeaderMarginBottomPx: 10,
} as const;

export function mmToPx(mm: number): number {
  return mm * (96 / 25.4);
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

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function isHexColor(value: string | undefined): value is string {
  if (!value) return false;
  return /^#(?:[0-9a-fA-F]{6})$/.test(value.trim());
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: Number.parseInt(cleaned.slice(0, 2), 16),
    g: Number.parseInt(cleaned.slice(2, 4), 16),
    b: Number.parseInt(cleaned.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const rr = clampByte(r).toString(16).padStart(2, '0');
  const gg = clampByte(g).toString(16).padStart(2, '0');
  const bb = clampByte(b).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

function mixHex(base: string, target: string, ratio: number): string {
  const a = hexToRgb(base);
  const b = hexToRgb(target);
  const t = Math.max(0, Math.min(1, ratio));
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

/**
 * Firma birincil renginden güvenli, baskı dostu antet paleti üretir.
 * Geçersiz renk gelirse kurumsal varsayılan palette kalır.
 */
export function createDocumentBrand(primaryColor?: string) {
  if (!isHexColor(primaryColor)) return DOCUMENT_BRAND;
  const base = primaryColor.trim();
  return {
    ...DOCUMENT_BRAND,
    gradient: base,
    border: mixHex(base, '#000000', 0.14),
    shadow: `0 2px 8px rgba(${hexToRgb(base).r},${hexToRgb(base).g},${hexToRgb(base).b},0.18)`,
    shadowSm: `0 1px 4px rgba(${hexToRgb(base).r},${hexToRgb(base).g},${hexToRgb(base).b},0.14)`,
  };
}

export const HEADER_MARGIN_BOTTOM_PX = DOCUMENT_LAYOUT_TOKENS.compactHeaderMarginBottomPx;

// Tablo başlığı tipografi: weight 600 (semibold) — bold'dan daha rafine,
// premium markaların tipik kullanımı. Main (Türkçe) UPPERCASE + dar tracking
// (0.02em) → kompakt elit görünüm. Sub (İngilizce) Sentence case — yalnızca
// ilk harf büyük (Item no, Unit price, ...). LetterSpacing 0.02 her ikisinde.
export const TABLE_HEAD_METRICS = {
  mainFontSizePx: 9.7,
  mainFontWeight: 600,
  mainLetterSpacing: '0.02em',
  mainLineHeight: 1.3,
  subFontSizePx: 7.5,
  subFontWeight: 400,
  subLetterSpacing: '0.02em',
  subLineHeight: 1.2,
} as const;

export const OFFER_COLUMN_METRICS = {
  measurePadPx: () => LINE_ITEM_METRICS.cellPaddingXpx * 2,
  measureBufferPx: 2,
  minWidths: {
    no: 22,
    marka: 32,
    code: 56,
    qty: 44,
    paraBirimi: 38,
    unitPrice: 60,
    total: 60,
    delivery: 46,
  },
  // Tek bir uzun termin metni (örn. "50 adet stok, 50 adet 2-3 gün") TÜM
  // teslimat kolonunu şişirmesin → tavanı aşan içerik wrap ile alt satıra
  // geçer. Açıklama kolonunun esnek genişliği korunur.
  // Hedef: ~12 karakter tek satıra sığsın → 12 × 5.4px ≈ 65px content tavanı.
  // Final kolon = max(65, headerW "Teslimat/Delivery") + PAD + BUFFER.
  maxWidths: {
    delivery: 65,
  },
} as const;

export const SIGNATURE_METRICS = {
  sectionMarginTopPx: 18,
  sectionPaddingYpx: 16,
  blockRowGapPx: 14,
  contentRowGapPx: 18,
  fieldsGridNameWidthMm: 40,
  fieldsGridStampWidthMm: 48,
  fieldsGridColumnGapPx: 18,
  fieldFontSizePx: 11,
  fieldLineHeight: 1.45,
  labelMarginTopPx: 6,
  labelLineHeight: 1.25,
  lineHeightPx: 22,
  detailsFieldGapPx: 10,
} as const;

interface FullHeaderLayoutStyles {
  rootStyle: CSSProperties;
  logoColumnStyle: CSSProperties;
  companyColumnStyle: CSSProperties;
  separatorStyle: CSSProperties | null;
  quoteColumnStyle: CSSProperties;
  quotePanelStyle: CSSProperties;
}

export function getFullHeaderLayoutStyles(firmaId?: string): FullHeaderLayoutStyles {
  const layout = getOfferHeaderLayoutProfile(firmaId);

  return {
    rootStyle: {
      display: 'grid',
      gridTemplateColumns: `${layout.logoColumnWidthPx}px minmax(0, 1fr) ${layout.showSeparator ? `${layout.separatorWidthPx}px` : '0px'} ${layout.quotePanelWidthPx}px`,
      columnGap: `${layout.columnGapPx}px`,
      alignItems: 'stretch',
      width: '100%',
      minHeight: `${LOGO_OPT_H}px`,
      marginBottom: `${HEADER_MARGIN_BOTTOM_PX}px`,
      ...noBreak,
    },
    logoColumnStyle: {
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      boxSizing: 'border-box',
      lineHeight: 0,
    },
    companyColumnStyle: {
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: `${layout.companyContentGapPx}px`,
      boxSizing: 'border-box',
    },
    separatorStyle: layout.showSeparator ? {
      width: `${layout.separatorWidthPx}px`,
      alignSelf: 'stretch',
      marginTop: `${layout.separatorInsetPx}px`,
      marginBottom: `${layout.separatorInsetPx}px`,
      background: HEADER_SURFACE.separator,
      borderRadius: '999px',
    } : null,
    quoteColumnStyle: {
      minWidth: 0,
      display: 'flex',
      alignItems: 'stretch',
      boxSizing: 'border-box',
    },
    quotePanelStyle: {
      width: '100%',
      height: `${LOGO_OPT_H}px`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'visible',
      boxSizing: 'border-box',
    },
  };
}

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

// ── Teklif tablosu yazı renkleri — kurumsal premium siyah-gri hiyerarşi ─────
// Sadece bu palet kullanılır; mavi/kırmızı/yeşil/mor/altın yazı tonu kalmaz.
// A4 önizleme + PDF birebir aynı tonu paylaşır (rcCell hücreleri ROW_TEXT
// üzerinden, başlık/sublabel/title doğrudan TABLE_TEXT.* üzerinden boyanır).
export const TABLE_TEXT = {
  /** Tablo bölümünün üst başlığı ("Teklif Kalemleri / Line Items"). */
  title:       '#0A0A0A',
  /** Sütun başlıkları (#, Marka, Ürün Kodu, ...). */
  header:      '#1A1A1A',
  /** Ürün kodu sütunu metni. */
  code:        '#111111',
  /** Ürün açıklaması sütunu metni (DescText sınıfı dahil). */
  description: '#2A2A2A',
  /** Sayısal değerler — Miktar, Birim Fiyat, Tutar. */
  numeric:     '#000000',
  /** Yardımcı küçük metinler — Marka, Para birimi, Birim, sublabel. */
  helper:      '#555555',
  /** Pasif/ikincil bilgiler — satır no, teslim tarihi, set alt-kalem ›n. */
  passive:     '#777777',
} as const;

// ── Döküman renk paleti — sıcak nötr, tablo renk diliyle eşleşik ─────────────
export const DOCUMENT_COLORS = {
  navy:        '#1A2B42',   // derin lacivert — başlık, vurgu metin
  navySoft:    '#2E4460',   // orta lacivert — ikincil vurgu
  navyBorder:  '#D5D3CF',   // sıcak gri — tablo başlık altı çizgisi
  accent:      '#1E3A5F',   // etkileşim vurgu tonu
  border:      '#E2E0DC',   // standart sıcak kenarlık
  borderSoft:  '#EDEBE8',   // hafif sıcak kenarlık
  rowAlt:      '#F7F7F7',   // zebra satır arka planı — nötr soft gri
  text:        '#2C2C2E',   // birincil metin — sıcak antrasit
  textMid:     '#4A4A4E',   // ikincil metin
  textSoft:    '#717176',   // yardımcı metin
  textMuted:   '#9B9BA0',   // soluk etiket, alt açıklama
  white:       '#FFFFFF',   // saf beyaz (içerik yüzeyi)
  panel:       '#F8F7F5',   // panel arka planı
  panelStrong: '#F0EFEC',   // güçlü panel yüzeyi
  notesBg:     '#F7F6F4',   // notlar kutusu arka planı
  // ── İmza bölümü siyah-gri paleti ─────────────────────────────────────────
  sigPrimary:   '#1A1A1A',   // koyu nötr — imza bölümü Türkçe metinler
  sigSecondary: '#555555',   // orta nötr gri — imza bölümü İngilizce metinler
  sigBorder:    '#9E9E9E',   // açık nötr gri — imza çizgileri
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
// Tek kaynak: index.css :root --font-sans → Inter primary + system fallback.
const DOCUMENT_FONT_FAMILY = 'var(--font-sans)';

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

  const PAD = OFFER_COLUMN_METRICS.measurePadPx();
  const BUFFER = OFFER_COLUMN_METRICS.measureBufferPx;
  const wrap = (min: number, contentW: number, headerW: number = 0): number =>
    Math.max(min, Math.ceil(Math.max(contentW, headerW) + PAD + BUFFER));

  const headerW = (main: string, sub: string): number => {
    // Main (Türkçe) render'da textTransform: uppercase uygulanır → ölçüm
    // de büyük harf üzerinden ("Birim" → "BİRİM"). Sub (İngilizce) orijinal
    // Title Case'inde render edilir → ölçüm de orijinal stringle.
    const mainU = main.toLocaleUpperCase('tr-TR');
    if (!canMeasure) return Math.max(mainU.length * 6.5, sub.length * 4.5);
    return Math.max(
      measureTextWidth(mainU, TABLE_HEAD_METRICS.mainFontSizePx, TABLE_HEAD_METRICS.mainFontWeight, TABLE_HEAD_METRICS.mainLetterSpacing),
      measureTextWidth(sub, TABLE_HEAD_METRICS.subFontSizePx, TABLE_HEAD_METRICS.subFontWeight, TABLE_HEAD_METRICS.subLetterSpacing),
    );
  };

  const noHeaderW    = headerW('#', '');
  const markaHeaderW = headerW('Marka', 'Brand');
  const codeHeaderW  = headerW('Ürün Kodu', 'Item no');
  const qtyHeaderW   = headerW('Miktar', 'Qty');
  // paraBirimi: 'Döviz' / 'Currency' — kısa Türkçe ana etiket + tam İngilizce
  // sub. Kolon genişliği sub uzunluğu ('Currency' ~36px) tarafından
  // belirlenir; ana etiket ('Döviz') zaten ona sığar.
  const pbHeaderW    = headerW('Döviz', 'Currency');
  const upHeaderW    = headerW('Birim Fiyat', 'Unit price');
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
  // Tavan: uzun termin metnini kolon genişliğine yansıtmaz → maxWidths.delivery
  // ile sınırlı. Aşan kısım hücre içinde alt satıra geçer (ROW_TEXT.delivery
  // whiteSpace:normal + overflowWrap:anywhere ile).
  const deliveryContentW = Math.min(
    widestOf(rows.map((r) => r.teslimTarihi ?? ''), LINE_ITEM_METRICS.deliveryFontSizePx, 400, '-0.01em', 5.4),
    OFFER_COLUMN_METRICS.maxWidths.delivery,
  );
  const paraBirimiContentW = satirBazliParaBirimi
    ? widestOf(['TL', 'USD', 'EUR'], LINE_ITEM_METRICS.baseFontSizePx, 700, '0.03em', 6.5)
    : 0;

  return {
    no:         wrap(OFFER_COLUMN_METRICS.minWidths.no, 0, noHeaderW),
    marka:      wrap(OFFER_COLUMN_METRICS.minWidths.marka, markaContentW, markaHeaderW),
    code:       wrap(OFFER_COLUMN_METRICS.minWidths.code, codeContentW, codeHeaderW),
    qty:        wrap(OFFER_COLUMN_METRICS.minWidths.qty, qtyContentW, qtyHeaderW),
    paraBirimi: satirBazliParaBirimi ? wrap(OFFER_COLUMN_METRICS.minWidths.paraBirimi, paraBirimiContentW, pbHeaderW) : 0,
    unitPrice:  wrap(OFFER_COLUMN_METRICS.minWidths.unitPrice, unitPriceContentW, upHeaderW),
    total:      wrap(OFFER_COLUMN_METRICS.minWidths.total, totalContentW, totHeaderW),
    delivery:   wrap(OFFER_COLUMN_METRICS.minWidths.delivery, deliveryContentW, delHeaderW),
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
  cellPaddingYpx: 4,
  cellPaddingXpx: 6,
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

// Açıklama hücresi: satır geometrisi tutarli olsun diye tek satira sıkıştırıldı.
// .description-cell + .description-text.df-1..df-4 CSS kurallarinda metin
// nowrap + (df-4 icin) overflow:hidden + text-overflow:ellipsis ile kesilir.
// Bu inline style yalnizca line-height token'inin (rcCell pad'i ile birlikte)
// satir bazli set edilmesini sağlar; whiteSpace/overflow degerleri CSS
// tarafindan ezilir.
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

/**
 * Set bloğu için premium çerçeve renkleri ve ölçüleri.
 * Set ana kalemi + alt kalemleri tek bir görsel grup oluşturur:
 *  - Hafifçe sıcak bir arka plan tonu (kâğıt hissi)
 *  - Daha belirgin ama yumuşak dış border (kurumsal his)
 *  - Sol tarafta ince warm-gold vurgu çizgisi
 *  - Alt kenarda hafif drop-shadow (setin bittiği net hissedilsin)
 */
export const SET_FRAME = {
  bg:           '#F2F2F2',                       // nötr açık gri — set grubu zemini
  borderClr:    '#BFBFBF',                       // nötr orta gri — çerçeve
  borderWidth:  '0.9px',
  accentClr:    '#555555',                       // koyu nötr gri — sol vurgu çizgisi
  accentWidth:  '2.5px',
  radius:       '8px',
  shadow:       '0 3px 8px rgba(0, 0, 0, 0.08)', // shadow da nötr siyah
} as const;

export type CellPos = 'first' | 'mid' | 'last';

/**
 * Set grubu içindeki bir satırın grup çerçevesindeki konumu.
 * - 'top': grubun üst satırı (set ana kalemi); altta hiçbir iç çizgi yok
 * - 'middle': grubun ortasındaki alt kalem; üst+alt iç çizgi yok
 * - 'bottom': grubun en alt satırı; üstte iç çizgi yok
 * - null: gruba dahil değil veya tek başına bir kalem
 *
 * "Single-row group" (alt kalemi olmayan set ana kalemi) → null.
 */
export type SetGroupPos = 'top' | 'middle' | 'bottom' | null;

interface SetGroupRow {
  id: string;
  setId?: string;
  setAltKalem?: boolean;
  setAnaSatirId?: string;
}

/**
 * `rows[index]` için grup içi konumu hesaplar. Set ana kalemi + ardışık alt
 * kalemler tek bir grup oluşturur. Tüm grubun çerçevesi tek parça çizilir.
 */
export function computeSetGroupPos(
  rows: ReadonlyArray<SetGroupRow>,
  index: number,
): SetGroupPos {
  const row = rows[index];
  if (!row) return null;

  const isParent = !!row.setId && !row.setAltKalem;
  const isAlt    = row.setAltKalem === true;
  if (!isParent && !isAlt) return null;

  const groupParentId = isAlt ? row.setAnaSatirId : row.id;
  if (!groupParentId) return null;

  // Alt kalemi olmayan set ana kalemi tek başına bir grup sayılmaz —
  // çerçevesi normal satır gibi çizilir.
  const hasAlt = rows.some((r) => r.setAltKalem === true && r.setAnaSatirId === groupParentId);
  if (!hasAlt) return null;

  const inSameGroup = (r?: SetGroupRow): boolean => {
    if (!r) return false;
    if (r.setAltKalem && r.setAnaSatirId === groupParentId) return true;
    if (!r.setAltKalem && r.id === groupParentId) return true;
    return false;
  };

  const prevSame = inSameGroup(rows[index - 1]);
  const nextSame = inSameGroup(rows[index + 1]);

  if (!prevSame && nextSame) return 'top';
  if (prevSame && !nextSame) return 'bottom';
  if (prevSame && nextSame)  return 'middle';
  return null;
}

/**
 * Ana teklif satır numaralandırması. Set alt kalemleri ana sayım dışında
 * tutulur (ana satırlar 01, 02, 03... → "set ana" da bir ana satırdır,
 * alt kalemler ise ana sayımı atlar). 1-based indeks döner.
 *
 * Örnek:
 *   idx=0  normal           → 1
 *   idx=1  set ana           → 2
 *   idx=2  set alt kalem     → (parent ile aynı 2 — gösterilmez, sub idx kullanılır)
 *   idx=3  set alt kalem     → 2
 *   idx=4  normal next       → 3
 */
export function computeMainItemIndex(
  rows: ReadonlyArray<SetGroupRow>,
  index: number,
): number {
  let count = 0;
  for (let i = 0; i <= index; i++) {
    const r = rows[i];
    if (!r) continue;
    if (!r.setAltKalem) count++;
  }
  return count;
}

/**
 * Set alt kaleminin kendi setinin içinde 1'den başlayan numarası. Alt kalem
 * değilse null döner. Her set kendi içinde 1, 2, 3 ... şeklinde numaralandırılır,
 * ana teklif numaralandırmasını etkilemez.
 */
export function computeSetSubitemIndex(
  rows: ReadonlyArray<SetGroupRow>,
  index: number,
): number | null {
  const row = rows[index];
  if (!row || !row.setAltKalem || !row.setAnaSatirId) return null;
  let count = 0;
  for (let i = 0; i <= index; i++) {
    const r = rows[i];
    if (r && r.setAltKalem && r.setAnaSatirId === row.setAnaSatirId) count++;
  }
  return count;
}

/**
 * Set alt kalem numarasının görsel stili — küçük italik, ikincil bilgi tonu.
 * Renk paletindeki passive tonu (#777777) kullanılır; renkli vurgu kalmaz.
 */
export const SET_SUBITEM_NUMBER_STYLE: CSSProperties = {
  fontSize: '9.5px',
  fontStyle: 'italic',
  fontWeight: 700,
  color: TABLE_TEXT.passive,
  fontFamily: '"Georgia", "Times New Roman", serif',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: '2px',
};

/** Set alt kalem numarasını üreten yardımcı — örn. "›2" gösterir. */
export function renderSetSubitemNumber(n: number): string {
  return `›${n}`;
}

export function rcCell(
  pos: CellPos,
  idx = 0,
  rowHeight?: number,
  setGroupPos: SetGroupPos = null,
): CSSProperties {
  const isInSetGroup = setGroupPos !== null;

  // Set grubu için premium kurumsal stil; normal satırlar standart düzeni korur.
  const borderColor = isInSetGroup ? SET_FRAME.borderClr : ROW_CARD.borderClr;
  const borderWidth = isInSetGroup ? SET_FRAME.borderWidth : '0.75px';
  const radius      = isInSetGroup ? SET_FRAME.radius : ROW_CARD.radius;
  const border      = `${borderWidth} solid ${borderColor}`;

  // Satır geometri tutarlılığı: varsayılan satır yüksekliği her zaman sabit.
  // Kullanıcı row-resize ile büyüttüyse o değer kullanılır.
  // Böylece bazı satırlarda açıklama hücresinin farklı ölçü üretmesi engellenir.
  const effectiveRowHeight = rowHeight && rowHeight > 0
    ? rowHeight
    : LINE_ITEM_METRICS.rowHeightPx;
  const heightStyle: CSSProperties = { height: `${effectiveRowHeight}px` };

  // Grup içi: alt sınır 'top'+'middle' satırlarında, üst sınır 'middle'+
  // 'bottom' satırlarında çizilmez. Köşe radius'ları yalnızca dış kenarlarda.
  const hideTopEdge    = setGroupPos === 'middle' || setGroupPos === 'bottom';
  const hideBottomEdge = setGroupPos === 'top'    || setGroupPos === 'middle';
  const isFirst = pos === 'first';
  const isLast  = pos === 'last';

  // Set grubunun ilk kolonu sol tarafta ince warm-gold vurgu çizgisi taşır
  // (kalın left border setin başlangıç-bitiş arasında kesintisiz uzanır).
  const leftBorder = isFirst
    ? (isInSetGroup
        ? `${SET_FRAME.accentWidth} solid ${SET_FRAME.accentClr}`
        : border)
    : 'none';

  // Set grubu satırları hafif sıcak ton arka plan (kâğıt hissi).
  // Normal satırlar zebra (alt) deseni korur.
  const background = isInSetGroup
    ? SET_FRAME.bg
    : (idx % 2 === 0 ? ROW_CARD.bg : DOCUMENT_COLORS.rowAlt);

  // Drop shadow:
  //  - Set grubunun en alt satırının ilk hücresinde premium soft shadow
  //  - Normal satırların ilk hücresinde mevcut hafif shadow
  //  - Grup ortası/üstünde shadow yok (frame'i bölmez)
  const showShadow = isFirst && !hideBottomEdge;
  const boxShadow = showShadow
    ? (isInSetGroup ? SET_FRAME.shadow : ROW_CARD.shadow)
    : 'none';

  return {
    // Varsayılan satır yüksekliği sabit; manuel row-resize ile artırılabilir.
    minHeight:              LINE_ITEM_ROW_HEIGHT,
    ...heightStyle,
    boxSizing:              'border-box',
    background,
    printColorAdjust:       'exact',
    WebkitPrintColorAdjust: 'exact',
    borderTop:              hideTopEdge    ? 'none' : border,
    borderBottom:           hideBottomEdge ? 'none' : border,
    borderLeft:             leftBorder,
    borderRight:            isLast  ? border : 'none',
    borderTopLeftRadius:    isFirst && !hideTopEdge    ? radius : 0,
    borderBottomLeftRadius: isFirst && !hideBottomEdge ? radius : 0,
    borderTopRightRadius:   isLast  && !hideTopEdge    ? radius : 0,
    borderBottomRightRadius: isLast && !hideBottomEdge ? radius : 0,
    boxShadow,
  };
}

// A4 belge header'ındaki logo render boyutu. Logolar şeffaf PNG ve önceden
// kırpılmıştır; container içine objectFit: contain ile sığar.
//   ~18mm yükseklik × ~53mm max genişlik (profesyonel A4 antetbaşı standardı)
export const LOGO_OPT_H = 68;
export const LOGO_OPT_W = 200;

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
  fontFamily: 'var(--font-sans)',
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
  fontWeight: 600,
  fontSize: `${LINE_ITEM_METRICS.baseFontSizePx}px`,
  color: DOCUMENT_COLORS.navy,
  marginBottom: '1px',
  lineHeight: 1.3,
  letterSpacing: '-0.01em',
};

export const PARTY_BODY_STYLE: CSSProperties = {
  fontSize: '10.5px',
  // lineHeight 1.3 — kompakt satır arası (1.4 fazla boşluk yaratıyordu).
  // Tüm body satırları (Sayın, Adres, Tel|Şehir|Email, VKN) bu line-height
  // ile düzenli aralıkta dizilir.
  lineHeight: 1.3,
  color: DOCUMENT_COLORS.textMid,
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
};

/* "Sayın {muhatap}" hitap satırı — adresten tipografik ayrışsın diye
   semi-bold + navy ton + hafif tracking. Body 400/textMid'in üzerinde durur.
   marginBottom -5px — lineHeight 1.3'ün ürettiği half-leading boşluğunu
   geri çekerek muhatap & adres satırını çok daha kompakt göster. */
export const PARTY_GREETING_STYLE: CSSProperties = {
  fontWeight: 600,
  color: DOCUMENT_COLORS.navy,
  letterSpacing: '0.01em',
  marginBottom: '-5px',
};

/* VKN satırı — alıcı bloğunun son satırı. Tel|Şehir|Email satırı ile
   arasındaki boşluk lineHeight'tan biraz fazla geliyordu; -2px negatif
   marjinle satırı bir tık yukarı çek → blok altı daha sıkı görünür. */
export const PARTY_VKN_LINE_STYLE: CSSProperties = {
  marginTop: '-2px',
};

export const SETTINGS_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: '8px',
  width: '100%',
  marginBottom: '12px',
  ...noBreak,
};

/** Settings grid stilini sütun sayısına göre dinamik üretir.
 *  TRY tekliflerinde Döviz Kuru kartı atlandığında 4, eklenirse 6 sütun. */
export function getSettingsGridStyle(itemCount: number): CSSProperties {
  return {
    ...SETTINGS_GRID_STYLE,
    gridTemplateColumns: `repeat(${Math.max(1, itemCount)}, minmax(0, 1fr))`,
  };
}

export const SETTINGS_CARD_STYLE: CSSProperties = {
  padding: '7px 6px',
  textAlign: 'center',
  minHeight: 44,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1,
  boxSizing: 'border-box',
  // Etiket wrap olduğunda kart kendisi büyür; içeriği kırpmasın.
  overflow: 'visible',
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
  gap: '1.5px',
  width: '100%',
  flexWrap: 'nowrap',
  marginBottom: '3px',
};

export const SETTINGS_TR_LABEL_STYLE: CSSProperties = {
  fontSize: '9.5px',
  fontWeight: 600,
  color: HEADER_SURFACE.textSub,
  letterSpacing: '0.01em',
  // textTransform: uppercase KALDIRILDI — Türkçe `i` harfi `İ`ye dönüşmediği
  // için (lang="tr" yok) etiketler ham UPPERCASE olarak yazılır.
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

export const SETTINGS_SEP_STYLE: CSSProperties = {
  fontSize: '6.5px',
  color: HEADER_SURFACE.textLabel,
  lineHeight: 1.2,
  flexShrink: 0,
  opacity: 0.7,
  alignSelf: 'center',
};

export const SETTINGS_EN_LABEL_STYLE: CSSProperties = {
  fontSize: '7px',
  fontWeight: 400,
  color: HEADER_SURFACE.textLabel,
  letterSpacing: '0.01em',
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  flexShrink: 0,
  minWidth: 0,
};

export const SETTINGS_VALUE_STYLE: CSSProperties = {
  fontWeight: 700,
  fontSize: '12.5px',
  color: HEADER_SURFACE.text,
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
};

export const TABLE_TITLE_STYLE: CSSProperties = {
  fontSize: '9px',
  fontWeight: 600,
  color: TABLE_TEXT.title,
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  marginBottom: '6px',
};

export const TABLE_STYLE: CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  // Satırlar arası boşluk artık explicit spacer <tr>'larla yönetiliyor;
  // border-spacing 0 olunca set grubu içi satırlar pürüzsüz birleşiyor.
  borderSpacing: '0',
  borderLeft: 'none',
  borderRight: 'none',
  marginBottom: 0,
  tableLayout: 'fixed',
  printColorAdjust: 'exact',
  WebkitPrintColorAdjust: 'exact',
};

/** Bağımsız satırlar arasındaki dikey boşluk (px). Set grubu içinde uygulanmaz. */
export const OFFER_TABLE_ROW_GAP_PX = 3;

export type OfferTableColumnKey =
  | 'no'
  | 'marka'
  | 'urunKod'
  | 'aciklama'
  | 'miktar'
  | 'paraBirimi'
  | 'birimFiyat'
  | 'toplam'
  | 'teslimat';

const OPTICAL_SEPARATOR_COLUMNS = new Set<OfferTableColumnKey>([
  'marka',
  'urunKod',
  'aciklama',
  'miktar',
  'paraBirimi',
  'birimFiyat',
  'toplam',
  'teslimat',
]);

export function getOfferTableSeparatorClass(columnKey: OfferTableColumnKey): string | undefined {
  return OPTICAL_SEPARATOR_COLUMNS.has(columnKey) ? 'optical-separator-col' : undefined;
}

// Dikey ayraç stilleri tek kaynaktan (global CSS .optical-separator-col)
// yönetildiği için surface (head/body) ayrımı runtime'da gerekmiyor —
// parametre kaldırıldı, caller'lar tek argümanla çağırır. İleride farklı
// stil gerekirse (örn. head'de daha kalın border) imza burada genişler.
export function getOfferTableSeparatorStyle(columnKey: OfferTableColumnKey): CSSProperties {
  if (!OPTICAL_SEPARATOR_COLUMNS.has(columnKey)) return {};

  // Dikey ayraçların tüm görseli global CSS'te `.optical-separator-col`
  // üzerinden yönetilir. Stil nesnesi boş tutulur ki A4, print ve PDF aynı
  // tek kaynaktan beslensin.
  return {};
}

export const SET_ALT_KALEM_EMPTY_CELL_STYLE: CSSProperties = Object.freeze({
  background: 'none',
  border: 'none',
  boxShadow: 'none',
});

export const SET_ALT_KALEM_FRAME_CLOSE_STYLE: CSSProperties = Object.freeze({
  borderRight: '0.9px solid #BFBFBF',
});

export const SET_ALT_KALEM_FRAME_CLOSE_TOP_STYLE: CSSProperties = Object.freeze({
  borderRight: '0.9px solid #BFBFBF',
  borderTopRightRadius: '8px',
});

export const SET_ALT_KALEM_FRAME_CLOSE_BOTTOM_STYLE: CSSProperties = Object.freeze({
  borderRight: '0.9px solid #BFBFBF',
  borderBottomRightRadius: '8px',
});

export function getSetAltKalemEmptyCellStyle(isSetAltKalem?: boolean): CSSProperties {
  return isSetAltKalem ? SET_ALT_KALEM_EMPTY_CELL_STYLE : {};
}

export function getSetAltKalemFrameCloseStyle(
  isSetAltKalem: boolean | undefined,
  setGroupPos: 'top' | 'middle' | 'bottom' | null,
): CSSProperties {
  if (!isSetAltKalem) return {};
  if (setGroupPos === 'top') return SET_ALT_KALEM_FRAME_CLOSE_TOP_STYLE;
  if (setGroupPos === 'bottom') return SET_ALT_KALEM_FRAME_CLOSE_BOTTOM_STYLE;
  return SET_ALT_KALEM_FRAME_CLOSE_STYLE;
}

export function getSetStepClass(isSetAltKalem: boolean | undefined, setGroupPos: 'top' | 'middle' | 'bottom' | null): string {
  // Alt kalemler için artık rcCell(setGroupPos) ile çerçeve sağı teslimat kolonunda kapanıyor;
  // 'set-altkalem-empty' sınıfı gerekmiyor.
  if (isSetAltKalem) return '';
  return setGroupPos === 'top' ? 'set-parent-step' : '';
}

export function getTableHeadCellStyle(
  align: CSSProperties['textAlign'],
  columnKey?: OfferTableColumnKey,
): CSSProperties {
  return {
    padding: CELL_PAD,
    textAlign: align,
    verticalAlign: 'bottom',
    fontSize: `${TABLE_HEAD_METRICS.mainFontSizePx}px`,
    fontWeight: TABLE_HEAD_METRICS.mainFontWeight,
    letterSpacing: TABLE_HEAD_METRICS.mainLetterSpacing,
    color: TABLE_TEXT.header,
    background: '#F5F5F5',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: `0.75px solid ${DOCUMENT_COLORS.navyBorder}`,
    borderRadius: 0,
    lineHeight: TABLE_HEAD_METRICS.mainLineHeight,
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    fontFeatureSettings: '"tnum" 1, "calt" 1, "ss01" 1',
    ...(columnKey ? getOfferTableSeparatorStyle(columnKey) : null),
  };
}

export const TABLE_HEAD_SUBLABEL_STYLE: CSSProperties = {
  display: 'block',
  fontWeight: TABLE_HEAD_METRICS.subFontWeight,
  fontSize: `${TABLE_HEAD_METRICS.subFontSizePx}px`,
  color: TABLE_TEXT.helper,
  marginTop: '1px',
  letterSpacing: TABLE_HEAD_METRICS.subLetterSpacing,
  lineHeight: TABLE_HEAD_METRICS.subLineHeight,
  // İngilizce alt etiket (Brand / Item no / Currency / ...) Sentence case —
  // ilk harf büyük. Parent <th> üzerindeki textTransform: uppercase
  // INHERITED → sub burada explicit 'none' ile override etmek ZORUNDA;
  // aksi takdirde "ITEM NO" gibi tamamı büyük görünür.
  textTransform: 'none',
  fontFeatureSettings: '"tnum" 1',
};

// TotalsCard'ın hemen altında, sağa yaslı, soluk gri tek satır.
// "Kargo bedeli alıcıya aittir." gibi her teklifte sabit kalan hukuki
// mikro-not için ortak stil. Yalnızca son sayfada (includeTotals=true)
// görünür çünkü kullanım yeri TotalsBlock/renderTotals içinde.
export const KARGO_NOTU_STYLE: CSSProperties = {
  fontSize: '8.5px',
  color: DOCUMENT_COLORS.textMuted,
  textAlign: 'right',
  marginTop: '6px',
  paddingRight: '2px',
  letterSpacing: '0.02em',
  lineHeight: 1.3,
  ...noBreak,
};

/** Varsayılan kargo notu metni — kullanıcı özelleştirmezse görünür. */
export const KARGO_NOTU_VARSAYILAN = 'Kargo bedeli alıcıya aittir.';

interface KargoNotuSatiriProps {
  /** Özel metin — undefined/boş ise varsayılan ('Kargo bedeli alıcıya aittir.') gösterilir. */
  metin?: string;
  /** True ise hiç render edilmez. */
  gizli?: boolean;
  /** Editör modu — hover'da X butonu (gizle) + tıklayınca inline düzenleme. */
  editable?: boolean;
  /** Editör: metin değişti. */
  onMetinChange?: (yeniMetin: string) => void;
  /** Editör: X butonuyla gizle. */
  onGizle?: () => void;
}

export function KargoNotuSatiri({
  metin,
  gizli = false,
  editable = false,
  onMetinChange,
  onGizle,
}: KargoNotuSatiriProps = {}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  if (gizli) return null;

  const goster = (metin && metin.trim().length > 0 ? metin : KARGO_NOTU_VARSAYILAN);

  if (!editable) {
    return (
      <div style={KARGO_NOTU_STYLE}>
        * {goster}
      </div>
    );
  }

  const startEdit = () => {
    setEditing(true);
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        // Tüm metni seç
        const range = document.createRange();
        range.selectNodeContents(ref.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  };

  const commitEdit = () => {
    const yeni = (ref.current?.innerText ?? '').trim();
    setEditing(false);
    if (onMetinChange) {
      // Boş veya varsayılana eşitse — özel metin kaydetmeden temizle (varsayılana dön)
      if (!yeni || yeni === KARGO_NOTU_VARSAYILAN) {
        onMetinChange('');
      } else {
        onMetinChange(yeni);
      }
    }
  };

  return (
    <div
      style={KARGO_NOTU_STYLE}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
        {hover && !editing && onGizle && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onGizle(); }}
            title="Bu notu gizle"
            aria-label="Notu gizle"
            style={{
              cursor: 'pointer',
              width: '14px',
              height: '14px',
              padding: 0,
              border: '1px solid rgba(100, 116, 139, 0.35)',
              borderRadius: '50%',
              background: 'rgba(248, 250, 252, 0.95)',
              color: '#64748b',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.9,
              pointerEvents: 'auto',
              userSelect: 'none',
              transition: 'all 160ms ease',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
            }}
            onMouseEnter={(e) => {
              const t = e.currentTarget;
              t.style.background = '#fee2e2';
              t.style.borderColor = '#ef4444';
              t.style.color = '#b91c1c';
              t.style.opacity = '1';
              t.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              const t = e.currentTarget;
              t.style.background = 'rgba(248, 250, 252, 0.95)';
              t.style.borderColor = 'rgba(100, 116, 139, 0.35)';
              t.style.color = '#64748b';
              t.style.opacity = '0.9';
              t.style.transform = 'scale(1)';
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
              <path d="M 1.5 1.5 L 6.5 6.5 M 6.5 1.5 L 1.5 6.5"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        )}
        <span>*&nbsp;</span>
        <span
          ref={ref}
          contentEditable={editing}
          suppressContentEditableWarning
          onClick={() => { if (!editing) startEdit(); }}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              ref.current?.blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              if (ref.current) ref.current.innerText = goster;
              setEditing(false);
            }
          }}
          style={{
            outline: editing ? `1px dashed ${DOCUMENT_COLORS.border}` : 'none',
            padding: editing ? '1px 4px' : 0,
            borderRadius: '2px',
            cursor: editing ? 'text' : 'pointer',
            minWidth: '40px',
            display: 'inline-block',
          }}
          title={editing ? '' : 'Düzenlemek için tıklayın'}
        >
          {goster}
        </span>
      </span>
    </div>
  );
}

export const NOTES_BOX_STYLE: CSSProperties = {
  fontSize: `${LINE_ITEM_METRICS.baseFontSizePx - 0.5}px`,
  // marginTop: TotalsCard ile arasında nefes payı (tek/çoklu para birimi
  // her iki modda tutarlı görsel ayrım). Üstündeki Totals'ın kendi
  // marginBottom'u 0 (tek tip) veya 14px (çoklu) → toplam aralık 14-28px.
  marginTop: '14px',
  marginBottom: '6px',
  padding: '8px 12px',
  border: `0.75px solid ${DOCUMENT_COLORS.border}`,
  borderRadius: '4px',
  lineHeight: 1.45,
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

export const SIGNATURE_BLOCK_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: `${SIGNATURE_METRICS.blockRowGapPx}px`,
};

export const SIGNATURE_CONTENT_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: `${SIGNATURE_METRICS.contentRowGapPx}px`,
};

export const SIGNATURE_FIELDS_HOST_STYLE: CSSProperties = {
  flex: 1,
  display: 'flex',
  justifyContent: 'flex-start',
};

export const SIGNATURE_FIELDS_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `${SIGNATURE_METRICS.fieldsGridNameWidthMm}mm ${SIGNATURE_METRICS.fieldsGridStampWidthMm}mm`,
  columnGap: `${SIGNATURE_METRICS.fieldsGridColumnGapPx}px`,
  alignItems: 'start',
  justifyItems: 'start',
  width: 'fit-content',
  maxWidth: '100%',
};

export const SIGNATURE_FIELD_STYLE: CSSProperties = {
  width: `${SIGNATURE_METRICS.fieldsGridNameWidthMm}mm`,
  maxWidth: `${SIGNATURE_METRICS.fieldsGridNameWidthMm}mm`,
  fontSize: `${SIGNATURE_METRICS.fieldFontSizePx}px`,
  lineHeight: SIGNATURE_METRICS.fieldLineHeight,
};

export const SIGNATURE_LABEL_STYLE: CSSProperties = {
  marginTop: `${SIGNATURE_METRICS.labelMarginTopPx}px`,
  marginBottom: 0,
  lineHeight: SIGNATURE_METRICS.labelLineHeight,
};

export const SIGNATURE_LINE_STYLE: CSSProperties = {
  width: `${SIGNATURE_METRICS.fieldsGridNameWidthMm}mm`,
  maxWidth: `${SIGNATURE_METRICS.fieldsGridNameWidthMm}mm`,
  height: `${SIGNATURE_METRICS.lineHeightPx}px`,
  borderBottom: `1px solid ${DOCUMENT_COLORS.sigBorder}`,
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

export type SettingsItemId =
  | 'paraBirimi' | 'odemeVadesi' | 'kdvOrani' | 'kur' | 'gecerlilik';

export interface SettingsItem {
  id: SettingsItemId;
  tr: string;
  en: string;
  value: string;
}

/**
 * Smart fallback helper — kullanıcı "Satır Bazlı Para Birimi" toggle'ını
 * açık unuttuğunda PDF/canlı belgede yanlış/karışık görünüm olmasın diye:
 *
 *   • Toggle KAPALI → false (belge default'u kullanılır, mevcut davranış)
 *   • Toggle AÇIK + tüm satırlar TEK TİP → false (tek tip varmış gibi davran)
 *   • Toggle AÇIK + GERÇEKTEN KARIŞIK (≥2 farklı para birimi) → true
 *
 * Tek noktadan karar → tüm caller'lar (TotalsSection, FinansalOzet kart,
 * settings cards) aynı mantığı kullanır. Veriyi/toggle'ı değiştirmez,
 * sadece efektif render davranışını döndürür.
 */
export function efektifSatirBazliParaBirimi(teklif: Teklif): boolean {
  if (!teklif.satirBazliParaBirimi) return false;
  const satirler = teklif.satirlar ?? [];
  if (satirler.length === 0) return false;
  const setOfPB = new Set(satirler.map((s) => s.paraBirimi || teklif.paraBirimi));
  return setOfPB.size > 1; // sadece gerçekten karışıksa true
}

export function buildSettingsItems(teklif: Teklif, satirBazliParaBirimi: boolean): SettingsItem[] {
  // Smart fallback: efektif değer ile çalış (toggle açık + tek tip = false)
  const efektifSatirBazli = satirBazliParaBirimi && efektifSatirBazliParaBirimi(teklif);
  const efektifParaBirimi: string | null = (() => {
    if (!efektifSatirBazli) {
      // Tek tip → o para birimi (toggle kapalıysa belge default; toggle açıksa
      // satırların ortak para birimi). teklif.paraBirimi default fallback.
      const satirler = teklif.satirlar ?? [];
      const setOfPB = new Set(satirler.map((s) => s.paraBirimi || teklif.paraBirimi));
      if (setOfPB.size === 1) return Array.from(setOfPB)[0] ?? teklif.paraBirimi;
      return teklif.paraBirimi;
    }
    return null;
  })();

  const items: SettingsItem[] = [
    {
      id: 'paraBirimi',
      tr: 'PARA BİRİMİ',
      en: 'Currency',
      value: efektifParaBirimi
        ? (() => {
            const s = SEMBOL[efektifParaBirimi] ?? efektifParaBirimi;
            return s !== efektifParaBirimi ? `${efektifParaBirimi} (${s})` : efektifParaBirimi;
          })()
        : (() => {
            // Karışık para birimi → kullanılanları liste olarak göster
            // (örn. "TL · EUR · USD"). "Satır Bazlı" jargon'undan kaçın;
            // müşteri kart üzerinden direkt hangi para birimleri olduğunu
            // görür. Sıra: satırlarda ilk geçen para biriminden son geçene.
            const seen: string[] = [];
            for (const s of teklif.satirlar ?? []) {
              const pb = s.paraBirimi || teklif.paraBirimi;
              if (!seen.includes(pb)) seen.push(pb);
            }
            // TRY → TL kısa kodu (Türkçe iş dilinde yaygın)
            return seen.map((pb) => (pb === 'TRY' ? 'TL' : pb)).join(' · ');
          })(),
    },
    { id: 'odemeVadesi', tr: 'ÖDEME VADESİ', en: 'Payment Terms', value: teklif.odemeVadesi || '45 Gün' },
    {
      id: 'kdvOrani',
      tr: 'KDV ORANI',
      en: 'VAT Rate',
      // KDV oranı belge geneli — para birimi satır bazlı olsa bile (TL+EUR
      // karışık ürünler) KDV oranı TCK gereği tek bir değerdir. "Satır Bazlı"
      // ibaresi yalnızca para birimi için anlamlı.
      value: teklif.kdvOrani > 0 ? `%${teklif.kdvOrani}` : 'Hariç',
    },
  ];

  // TRY tekliflerinde Döviz Kuru kartı gösterilmez
  if (teklif.paraBirimi !== 'TRY') {
    items.push({ id: 'kur', tr: 'DÖVİZ KURU', en: 'Exchange Rate', value: teklif.dovizKuru || 'TCMB Fatura' });
  }

  items.push({
    id: 'gecerlilik',
    tr: 'GEÇERLİLİK',
    en: 'Validity',
    value: teklif.gecerlilikSuresi || '1 Hafta',
  });

  return items;
}
