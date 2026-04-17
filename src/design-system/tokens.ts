/**
 * design-system/tokens.ts
 * ─────────────────────────────────────────────────────────────────
 * Ham tasarım tokenleri — sayılar ve dizeler, hesaplama yok.
 * Bu dosya iş mantığına bağımlı değildir; başka projelere kopyalanabilir.
 *
 * Kullanım:
 *   import { FONT_SIZE, SPACING, RADIUS, BRAND } from '../design-system/tokens';
 */

// ── Tipografi: Font boyutları ─────────────────────────────────────────────────
// 8 katman — xs (en küçük) → 3xl (hero rakam)
export const FONT_SIZE = {
  xs:   '10px',   // avatar harfi, zaman damgası, mini rozet
  sm:   '11px',   // yardımcı metin, rozet etiketi, alt açıklama
  base: '13px',   // varsayılan gövde, tablo hücresi, form değeri, buton
  md:   '14px',   // hafif vurgu, liste birincil öğesi, finansal değer
  lg:   '16px',   // kart tutarı, özet sayı
  xl:   '20px',   // sayfa bölüm başlığı, panel başlığı
  '2xl': '22px',  // ana sayfa başlığı
  '3xl': '26px',  // hero rakam (en büyük toplam)
} as const;

// ── Tipografi: Font kalınlıkları ──────────────────────────────────────────────
// 5 seviye — kontrollü hiyerarşi. 800 yalnızca "en önemli" öğe için.
export const FONT_WEIGHT = {
  regular:   400,  // gövde metin, açıklama, ikincil içerik
  medium:    500,  // etiket, hafif vurgu, başlık hücresi
  semibold:  600,  // buton, rozet, sütun başlığı, değer, caps etiket
  bold:      700,  // bölüm başlığı, birincil veri, toplam rakamı
  extrabold: 800,  // YALNIZCA: hero toplam, ana sayfa başlığı
} as const;

// ── Tipografi: Satır yükseklikleri ───────────────────────────────────────────
export const LINE_HEIGHT = {
  tight:   1.2,    // başlık, tek satır etiket
  snug:    1.35,   // rozet, kompakt alt bilgi
  normal:  1.45,   // varsayılan gövde metin
  relaxed: 1.6,    // açıklama, çok satır metin
} as const;

// ── Tipografi: Harf aralığı ───────────────────────────────────────────────────
export const LETTER_SPACING = {
  tight:  '-0.025em',  // büyük rakam, hero başlık
  snug:   '-0.01em',   // bölüm başlığı, kart başlığı
  normal:  '0',        // varsayılan gövde metin
  wide:   '0.05em',    // uppercase etiket
  wider:  '0.08em',    // küçük uppercase rozet
} as const;

// ── Tipografi: Font ailesi ────────────────────────────────────────────────────
export const FONT_FAMILY = {
  sans: '"Inter", "Arial", sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
} as const;

// ── Köşe yarıçapı ─────────────────────────────────────────────────────────────
// Antd borderRadius=8 ile uyumlu; tabloda md, kartta xl/2xl, büyük panelde 3xl
export const RADIUS = {
  none:  '0px',
  xs:    '4px',    // küçük rozet, chip
  sm:    '6px',    // input, kompakt kart
  md:    '8px',    // buton, input, tablo köşe — antd default
  lg:    '10px',   // iç kart, kompakt panel
  xl:    '12px',   // standart kart
  '2xl': '14px',   // bölüm kartı — birincil kart radius
  '3xl': '16px',   // büyük bölüm, modal
  '4xl': '20px',   // hero kart, ana panel
  full:  '9999px', // hap rozet, avatar, toggle
} as const;

// ── Gölgeler — 3 seviye, inset olmadan (inset ayrıca eklenebilir) ─────────────
export const SHADOW = {
  light: {
    sm:      '0 1px 2px rgba(15,23,42,0.05)',
    card:    '0 1px 3px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.04)',
    panel:   '0 2px 8px rgba(15,23,42,0.07), 0 8px 24px rgba(15,23,42,0.05)',
    button:  '0 1px 3px rgba(15,31,69,0.10)',
  },
  dark: {
    sm:      '0 1px 2px rgba(0,0,0,0.3)',
    card:    '0 2px 8px rgba(0,0,0,0.35)',
    panel:   '0 4px 16px rgba(0,0,0,0.45)',
    button:  '0 1px 6px rgba(0,0,0,0.35)',
  },

  // İç parlaklık — kart üst kenara eklenen highlight (sadece açık yüzeylerde)
  inset: 'inset 0 1px 0 rgba(255,255,255,0.8)',
} as const;

// ── Boşluk sistemi ────────────────────────────────────────────────────────────
// 4px tabanlı grid — temel birim 4px
export const SPACING = {
  // Temel birimler
  '0':  '0px',
  '1':  '4px',
  '2':  '8px',
  '3':  '12px',
  '4':  '16px',
  '5':  '20px',
  '6':  '24px',
  '8':  '32px',
  '10': '40px',
  '12': '48px',

  // Bileşen-özgü isimli aralıklar
  pagePadding:      '24px',   // sayfa yatay iç boşluğu
  pageGap:          '20px',   // sayfa dikey boşluk
  cardBody:         '20px',   // kart iç boşluğu
  cardBodyLg:       '24px',   // büyük kart iç boşluğu
  sectionGap:       '12px',   // bölüm arası
  componentPad:     '12px 16px', // genel bileşen padding
  inputPad:         '8px 12px',  // input iç boşluğu
  tableCellPad:     '10px 14px', // tablo hücresi
  tableCellPadSm:   '7px 10px',  // kompakt tablo hücresi
  rowGap:           '8px',    // satır içi gap
  columnGap:        '16px',   // sütun arası gap
} as const;

// ── Breakpoint'ler ────────────────────────────────────────────────────────────
export const BREAKPOINT = {
  xs:   480,   // mobil küçük
  sm:   640,   // mobil büyük / tablet küçük
  md:   768,   // tablet
  lg:   900,   // tablet büyük / masaüstü küçük
  xl:   1280,  // masaüstü
} as const;

// ── Boyutlar ──────────────────────────────────────────────────────────────────
export const SIZE = {
  headerHeight:  56,   // px — AppLayout üst çubuk yüksekliği
  sidebarWidth:  220,  // px — kenar çubuğu genişliği (kullanılırsa)
  btnHeight:     36,   // px — standart buton yüksekliği
  btnHeightSm:   30,   // px — küçük buton yüksekliği
  inputHeight:   36,   // px — standart input yüksekliği
  avatarSm:      24,   // px — küçük avatar
  avatarMd:      32,   // px — orta avatar
  avatarLg:      40,   // px — büyük avatar
} as const;

// ── Marka renkleri ────────────────────────────────────────────────────────────
export const BRAND = {
  // Ana renk — MEBA kurumsal mavi
  primary:      '#1a3a7c',
  primaryLight: '#2563eb',
  primaryDark:  '#0f2458',

  // Başarı
  success:      '#16a34a',
  successLight: '#22c55e',
  successBg:    '#f0fdf4',
  successBgDark:'#052e16',

  // Uyarı
  warning:      '#d97706',
  warningLight: '#f59e0b',
  warningBg:    '#fffbeb',
  warningBgDark:'#1c1400',

  // Hata
  danger:       '#dc2626',
  dangerLight:  '#ef4444',
  dangerBg:     '#fef2f2',
  dangerBgDark: '#1a0000',

  // Bilgi
  info:         '#0284c7',
  infoLight:    '#38bdf8',
  infoBg:       '#f0f9ff',
  infoBgDark:   '#001828',
} as const;

// ── Durum rozet renkleri (teklif statüsü) ────────────────────────────────────
// Her durum için text + bg çifti, light ve dark tema
export const STATUS_COLORS = {
  taslak: {
    light: { text: '#475569', bg: '#f1f5f9' },
    dark:  { text: '#94a3b8', bg: '#1e293b' },
  },
  gonderildi: {
    light: { text: '#0369a1', bg: '#e0f2fe' },
    dark:  { text: '#38bdf8', bg: '#0c1a2e' },
  },
  onaylandi: {
    light: { text: '#15803d', bg: '#dcfce7' },
    dark:  { text: '#4ade80', bg: '#052e16' },
  },
  reddedildi: {
    light: { text: '#b91c1c', bg: '#fee2e2' },
    dark:  { text: '#f87171', bg: '#2a0a0a' },
  },
  revize: {
    light: { text: '#92400e', bg: '#fef3c7' },
    dark:  { text: '#fbbf24', bg: '#1c1000' },
  },
} as const;

// ── Avatar renk paleti (rastgele atama için) ──────────────────────────────────
export const AVATAR_PALETTE = [
  '#1a3a7c', '#0369a1', '#0891b2', '#047857',
  '#4f46e5', '#7c3aed', '#be185d', '#b45309',
] as const;

// ── Geçiş / animasyon ─────────────────────────────────────────────────────────
export const TRANSITION = {
  fast:    '0.12s ease',
  normal:  '0.18s ease',
  slow:    '0.25s ease',
  layout:  '0.2s ease',

  // Hazır kısayollar
  color:   'color 0.18s ease, background-color 0.18s ease, border-color 0.18s ease',
  shadow:  'box-shadow 0.18s ease',
  all:     'color 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
} as const;

// ── Z-index katmanları ────────────────────────────────────────────────────────
export const Z_INDEX = {
  base:    0,
  raised:  1,
  dropdown:100,
  sticky:  200,
  overlay: 300,
  modal:   400,
  toast:   500,
  tooltip: 600,
  devBadge:9999,
} as const;
