// Teklif tablosu kolon genişliklerinin merkezi tanımı
// Tüm tablo ve PDF çıktısı sadece buradan okur

// Ürün kodu sütunu: Dinamik genişlik — en uzun kodu sığdıracak şekilde hesaplanır
// Açıklama sütunu: Kalan tüm alanı alır
// Diğer kolonlar: Kompakt
// Not: PDF ve edit modunda da aynı mantık
export const OFFER_TABLE_COLS = {
  no:         '3.5%',
  marka:      '6%',
  urunKod:    'max-content', // Dinamik: kodu asla kesmez, gereksiz boşluk bırakmaz
  aciklama:   'auto',        // Kalan tüm alan
  miktar:     '6%',
  paraBirimi: '6%',
  birimFiyat: '8.5%',
  toplam:     '9%',
  teslimat:   '7.5%',
} as const;

export const OFFER_TABLE_COLUMN_ORDER = [
  'no',
  'marka',
  'urunKod',
  'aciklama',
  'miktar',
  'paraBirimi',
  'birimFiyat',
  'toplam',
  'teslimat',
] as const;
