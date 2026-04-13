import type { Cari } from './musteri';
import type { TeklifSatiri } from './teklifSatiri';

export type ParaBirimi = 'TRY' | 'EUR' | 'USD';
export type TeklifDurum = 'taslak' | 'hazir' | 'gonderildi' | 'onaylandi' | 'iptal';
export type OdemeVadesi = 'Pesin' | '30 Gun' | '45 Gun' | '60 Gun' | '90 Gun' | '120 Gun';

export interface Teklif {
  id: string;
  teklifNo: string;
  tarih: string;
  satirBazliParaBirimi?: boolean;
  paraBirimi: string;
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
  hazirlayanKullaniciId?: string;
  hazirlayanAdSoyad?: string;
  hazirlayanRol?: string;
  contactName?: string;
  contactTitle?: 'BEY' | 'HANIM';
}
