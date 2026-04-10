export interface TeklifSatiri {
  id: string;
  marka: string;
  urunKod: string;
  urunAdi: string;
  aciklama: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  indirimOrani: number;
  teslimTarihi?: string;
  satirToplami: number;
  /** Kullanıcının elle düzenlediği ikinci satır açıklama (yoksa otomatik üretilir) */
  manuelAltAciklama?: string;
  /** Bu alanı son güncelleyen kullanıcının adı */
  manuelAciklamaGuncelleyen?: string;
  /** Son güncelleme zaman damgası (ISO 8601) */
  manuelAciklamaGuncellemeTarihi?: string;
}
