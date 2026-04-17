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
  bgBody:          'linear-gradient(180deg, #f8fafc 0%, #eef3f8 100%)',
  bgSurface:       '#ffffff',
  bgElevated:      '#f3f7fb',   // kart alt gradient hedefi — biraz daha mavi-gri
  bgInput:         '#ffffff',
  bgHeader:        '#0f1f45',
  bgHeaderBorder:  '#1e3060',

  textPrimary:     '#1e293b',   // softer than #0f1f45 — daha modern slate
  textSecondary:   '#475569',   // #64748b'den biraz daha koyu — daha iyi kontrast
  textFaint:       '#94a3b8',

  border:          '#dbe3ec',   // daha yumuşak mavi-gri
  borderSubtle:    '#edf2f7',
  borderInput:     '#cdd6e3',
  inputFocus:      '#2563eb',

  shadow:          '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.03)',
  shadowCard:      '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.03), inset 0 1px 0 rgba(255,255,255,0.7)',

  rowAlt:          '#f4f8fc',
  tableHead:       '#0f1f45',
  tableHeadText:   '#ffffff',
  tableRow:        '#ffffff',
  tableRowAlt:     '#f4f8fc',
  tableBorder:     '#e8eef5',

  totalsPanel:     '#f6f9fd',
  totalsBorder:    '#c6d4e2',   // Genel Toplam kartıyla aynı
  totalsRowBorder: '#dce8f5',

  cardBorder:      '1px solid #dbe3ec',
  inputBorder:     '#cdd6e3',
};

// ── Dark tema — Apple / Linear inspired ──────────────────────────────────────
export const darkTheme: ThemeColors = {
  bgBody:          'linear-gradient(180deg, #0f1117 0%, #090d16 100%)',
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
