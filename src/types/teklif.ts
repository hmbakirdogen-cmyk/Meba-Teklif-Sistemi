import type { Cari } from './musteri';
import type { TeklifSatiri } from './teklifSatiri';
import type { ImageItem } from './imageItem';

export type ParaBirimi = 'TRY' | 'EUR' | 'USD';
export type TeklifDurum = 'taslak' | 'hazir' | 'gonderildi' | 'onaylandi' | 'iptal';

export interface Teklif {
  id: string;
  teklifNo: string;
  tarih: string;
  satirBazliParaBirimi?: boolean;
  satirBazliIskonto?: boolean;
  paraBirimi: ParaBirimi;
  durum: TeklifDurum;
  cari: Cari;
  satirlar: TeklifSatiri[];
  araToplam: number;
  toplamIndirim: number;
  toplamVergi: number;
  genelToplam: number;
  kdvOrani: number;
  iskontoOrani: number;
  odemeVadesi: string;
  teslimSuresi?: string;
  gecerlilikSuresi?: string;
  notlar: string;
  olusturmaTarihi: string;
  guncellemeTarihi: string;
  pdfYolu?: string;
  pdfDosyaAdi?: string;
  pdfOlusturmaTarihi?: string;
  hazirlayanKullaniciId?: string;
  hazirlayanAdSoyad?: string;
  hazirlayanRol?: string;
  contactName?: string;
  contactTitle?: 'BEY' | 'HANIM';
  gorseller?: ImageItem[];
}
