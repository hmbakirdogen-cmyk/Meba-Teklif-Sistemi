export type SatirGrupRenk =
  | 'amber'    // soft warm yellow
  | 'mint'     // soft green
  | 'sky'      // soft blue
  | 'lavender' // soft purple
  | 'blush'    // soft pink-rose
  | 'peach'    // soft orange
  | 'sage'     // muted olive-green
  | 'slate';   // cool gray-blue

export interface TeklifSatiri {
  id: string;
  marka: string;
  urunKod: string;
  urunAdi: string;
  aciklama: string;
  paraBirimi?: 'TRY' | 'EUR' | 'USD';
  miktar: number;
  birim: string;
  birimFiyat: number;
  indirimOrani: number;
  teslimTarihi?: string;
  satirToplami: number;
  manuelAltAciklama?: string;
  manuelAciklamaGuncelleyen?: string;
  manuelAciklamaGuncellemeTarihi?: string;
  /** Satır bir ürün setinin ana kalemi ise set kaydı id'si tutulur. */
  setId?: string;
  /** Alt set kalemlerinde, bağlı olduğu ana satır id'si. */
  setAnaSatirId?: string;
  /** Alt kalem satırı işareti (fiyat girilmez). */
  setAltKalem?: boolean;
  /** Satırın ait olduğu görsel grup rengi (opsiyonel). */
  grupRenk?: SatirGrupRenk;
  /** Personel tarafından elle ayarlanmış satır yüksekliği (document-px).
   *  Tanımsızsa otomatik / standart yükseklik geçerli. */
  rowHeight?: number;
}
