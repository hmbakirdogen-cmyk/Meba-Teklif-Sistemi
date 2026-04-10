export interface Urun {
  id: string;
  urunKod: string;
  urunAdi: string;
  aciklama: string;
  kategori: string;
  marka?: string;
  birim: string;
  varsayilanFiyat: number;
}
