export interface UrunSetKalemi {
  id: string;
  urunKod: string;
  aciklama: string;
  miktar: number;
  birim?: string;
}

export interface UrunSeti {
  id: string;
  setKod: string;
  aciklama: string;
  kalemler: UrunSetKalemi[];
  olusturmaTarihi: string;
  guncellemeTarihi: string;
}
