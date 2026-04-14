/**
 * design-system/theme.ts
 * ─────────────────────────────────────────────────────────────────
 * Semantik renk nesneleri — lightTheme ve darkTheme.
 * Bileşenler bu değerleri doğrudan kullanır; ham hex kodları değil.
 *
 * useColors hook'u bu objeleri döndürür.
 * Başka bir projede sadece bu dosyayı değiştirerek tema değişir.
 */

// ── Tema türü ─────────────────────────────────────────────────────────────────
export interface ThemeColors {
  // Arkaplan katmanları
  bgBody:         string;   // sayfa zemini
  bgSurface:      string;   // kart, panel yüzeyi
  bgElevated:     string;   // yükseltilmiş yüzey (hover, zebra, inset)
  bgInput:        string;   // input, textarea arka planı
  bgHeader:       string;   // üst çubuk arka planı
  bgHeaderBorder: string;   // üst çubuk alt kenarlığı

  // Metin
  textPrimary:   string;    // başlık, birincil içerik
  textSecondary: string;    // ikincil metin, açıklama
  textFaint:     string;    // devre dışı, ipucu, etiket

  // Kenarlık
  border:        string;    // standart kenarlık
  borderSubtle:  string;    // çok hafif kenarlık (zebra satır)
  borderInput:   string;    // input kenarlığı
  inputFocus:    string;    // odaklanma halkası rengi

  // Gölge
  shadow:        string;    // genel gölge
  shadowCard:    string;    // kart gölgesi

  // Tablo
  rowAlt:        string;    // zebra satır arka planı
  tableHead:     string;    // tablo başlık hücresi arka planı
  tableHeadText: string;    // tablo başlık metin rengi
  tableRow:      string;    // tablo satır arka planı
  tableRowAlt:   string;    // tablo zebra satır arka planı
  tableBorder:   string;    // tablo iç kenarlık

  // Toplamlar paneli
  totalsPanel:     string;  // toplamlar paneli arka planı
  totalsBorder:    string;  // toplamlar paneli kenarlığı
  totalsRowBorder: string;  // toplamlar satır ayırıcı

  // Kart & Input kenarlık kısayolları (CSS değeri olarak)
  cardBorder:  string;      // "1px solid #..." formatında
  inputBorder: string;      // "#..." hex renk
}

// ── Light tema ────────────────────────────────────────────────────────────────
export const lightTheme: ThemeColors = {
  bgBody:          '#f5f6fa',
  bgSurface:       '#ffffff',
  bgElevated:      '#f8fafc',
  bgInput:         '#ffffff',
  bgHeader:        '#0f1f45',
  bgHeaderBorder:  '#1e3060',

  textPrimary:     '#0f1f45',
  textSecondary:   '#64748b',
  textFaint:       '#94a3b8',

  border:          '#e2e8f0',
  borderSubtle:    '#f0f4f8',
  borderInput:     '#d1d9e6',
  inputFocus:      '#2563eb',

  shadow:          '0 1px 3px rgba(15,31,69,0.07), 0 1px 2px rgba(15,31,69,0.04)',
  shadowCard:      '0 1px 3px rgba(15,31,69,0.07), 0 1px 2px rgba(15,31,69,0.04)',

  rowAlt:          '#fafbff',
  tableHead:       '#0f1f45',
  tableHeadText:   '#ffffff',
  tableRow:        '#ffffff',
  tableRowAlt:     '#fafbff',
  tableBorder:     '#f0f4f8',

  totalsPanel:     '#fafbfd',
  totalsBorder:    '#e2e8f0',
  totalsRowBorder: '#f0f4f8',

  cardBorder:      '1px solid #e2e8f0',
  inputBorder:     '#d1d9e6',
};

// ── Dark tema — Apple / Linear inspired ──────────────────────────────────────
export const darkTheme: ThemeColors = {
  bgBody:          '#0f1117',
  bgSurface:       '#181b25',
  bgElevated:      '#1c2132',
  bgInput:         '#141822',
  bgHeader:        '#0b0d16',
  bgHeaderBorder:  '#1a2236',

  textPrimary:     '#dde4f0',
  textSecondary:   '#8899b5',
  textFaint:       '#6b80a0',

  border:          '#242d42',
  borderSubtle:    '#181f32',
  borderInput:     '#2a3650',
  inputFocus:      '#3b82f6',

  shadow:          '0 1px 4px rgba(0,0,0,0.5)',
  shadowCard:      '0 2px 8px rgba(0,0,0,0.4)',

  rowAlt:          '#141824',
  tableHead:       '#141a26',
  tableHeadText:   '#8899b5',
  tableRow:        '#181b25',
  tableRowAlt:     '#141824',
  tableBorder:     '#1e2638',

  totalsPanel:     '#141822',
  totalsBorder:    '#242d42',
  totalsRowBorder: '#1e2638',

  cardBorder:      '1px solid #242d42',
  inputBorder:     '#2a3650',
};

// ── Yardımcı: boolean'dan tema seç ───────────────────────────────────────────
export function getTheme(isDark: boolean): ThemeColors {
  return isDark ? darkTheme : lightTheme;
}
