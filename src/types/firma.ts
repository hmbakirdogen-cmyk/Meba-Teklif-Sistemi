export interface Firma {
  id: string;
  ad: string;
  kisaAd: string;
  slogan: string;
  logoPath: string;
  /** Logo görsel ölçeklendirme faktörü (kart/splash içinde). Default 1.0.
   *  Logo aspect ratio'su kareye yakınsa daha küçük görünür — bu değeri
   *  artırarak MEBA gibi yatay logolarla aynı görsel ağırlık sağlanır. */
  logoScale?: number;
  renkBirincil: string;
  renkVurgu: string;
  adres: string;
  vergiDairesi: string;
  vergiNo: string;
  telefon: string;
  eposta: string;
  web?: string;
  iban: string;
  pdfKlasorAdi: string;
  teklifPrefix: string;
  /** Firma bazlı yeni teklif varsayılanları. Yeni teklif oluşturulurken
   *  hücreler bu değerlerle doldurulur; mevcut tekliflerde değer kaydın
   *  kendisinden gelir, varsayılan ezilmez. */
  varsayilanlar?: {
    paraBirimi?: string;
    kdvOrani?: number;
    iskontoOrani?: number;
    odemeVadesi?: string;
    gecerlilikSuresi?: string;
    marka?: string;
    birim?: string;
    teslimTarihi?: string;
  };
}
