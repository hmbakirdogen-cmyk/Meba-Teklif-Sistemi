export interface Cari {
  id: string;
  cariKod: string;
  firmaAdi: string;
  yetkiliKisi: string;
  telefon: string;
  ePosta: string;
  adres: string;
  vergiDairesi: string;
  vergiNo: string;
  /** Teklif bazlı — bu cari için en son kullanılan muhatap */
  lastContactName?: string;
  lastContactTitle?: 'BEY' | 'HANIM';
}

/** Geriye dönük uyumluluk için alias */
export type Musteri = Cari;
