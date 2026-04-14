/**
 * Meba Teklif Sistemi — Merkezi Tipografi Sistemi
 * ─────────────────────────────────────────────────
 * Tüm sayfa ve bileşenler bu sabitleri kullanır.
 * Aynı sabit → aynı görünüm. Sistemin dışında boyut verilmez.
 */

// ── Font Boyutları ─────────────────────────────────────────────────────────────
// 8 katman: xs → 3xl. Her katmanın tek bir görevi var.
export const FS = {
  xs:   '10px',   // avatar harfi, zaman damgası, mini rozet
  sm:   '11px',   // yardımcı metin, rozet etiketi, alt açıklama
  base: '13px',   // varsayılan gövde, tablo hücresi, form değeri, buton
  md:   '14px',   // hafif vurgu, liste birincil öğesi, finansal değer
  lg:   '16px',   // kart tutarı, özet sayı
  xl:   '20px',   // sayfa bölüm başlığı, panel başlığı
  '2xl': '22px',  // ana sayfa başlığı
  '3xl': '26px',  // hero rakam (en büyük toplam)
} as const;

// ── Font Kalınlıkları ──────────────────────────────────────────────────────────
// 5 seviye — kontrollü hiyerarşi. 800 yalnızca "en önemli" öğe için.
export const FW = {
  regular:   400,  // gövde metin, açıklama, ikincil içerik
  medium:    500,  // etiket, hafif vurgu, başlık hücresi
  semibold:  600,  // buton, rozet, sütun başlığı, değer, caps etiket
  bold:      700,  // bölüm başlığı, birincil veri, toplam rakamı
  extrabold: 800,  // YALNIZCA: hero toplam, ana sayfa başlığı
} as const;

// ── Satır Yükseklikleri ────────────────────────────────────────────────────────
export const LH = {
  tight:   1.2,    // başlık, tek satır etiket
  snug:    1.35,   // rozet, kompakt alt bilgi
  normal:  1.45,   // varsayılan gövde metin
  relaxed: 1.6,    // açıklama, çok satır metin
} as const;

// ── Harf Aralığı ──────────────────────────────────────────────────────────────
export const LS = {
  tight:  '-0.025em',  // büyük rakam, hero başlık
  snug:   '-0.01em',   // bölüm başlığı, kart başlığı
  normal:  '0',        // varsayılan gövde metin
  wide:   '0.05em',   // uppercase etiket
  wider:  '0.08em',   // küçük uppercase rozet
} as const;
