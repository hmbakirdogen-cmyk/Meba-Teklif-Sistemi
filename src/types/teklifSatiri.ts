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
}
