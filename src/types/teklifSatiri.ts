export type SatirGrupRenk = 'amber' | 'mint' | 'sky' | 'lavender';

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
  /** Satırın ait olduğu görsel grup rengi (opsiyonel). */
  grupRenk?: SatirGrupRenk;
  /** Personel tarafından elle ayarlanmış satır yüksekliği (document-px).
   *  Tanımsızsa otomatik / standart yükseklik geçerli. */
  rowHeight?: number;
}
