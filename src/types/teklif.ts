import type { Cari } from './musteri';
import type { TeklifSatiri } from './teklifSatiri';

export type ParaBirimi = 'TRY' | 'EUR' | 'USD';
export type TeklifDurum = 'taslak' | 'hazir' | 'gonderildi' | 'onaylandi' | 'iptal';
export type OdemeVadesi = 'Peşin' | '30 Gün' | '45 Gün' | '60 Gün' | '90 Gün' | '120 Gün';

export interface Teklif {
  id: string;
  teklifNo: string;
  tarih: string;
  paraBirimi: string;      // standart: ParaBirimi; kullanıcı özel değer girebilir
  durum: TeklifDurum;
  cari: Cari;
  satirlar: TeklifSatiri[];
  araToplam: number;
  toplamIndirim: number;
  toplamVergi: number;
  genelToplam: number;
  kdvOrani: number;
  iskontoOrani: number;
  odemeVadesi: string;     // standart: OdemeVadesi; kullanıcı özel değer girebilir
  teslimSuresi?: string;   // kullanıcı tanımlı, opsiyonel
  gecerlilikSuresi?: string; // kullanıcı tanımlı, opsiyonel
  notlar: string;
  olusturmaTarihi: string;
  guncellemeTarihi: string;
  pdfYolu?: string;
  // Hazırlayan kullanıcı bilgisi
  hazirlayanKullaniciId?: string;
  hazirlayanAdSoyad?: string;
  hazirlayanRol?: string;
  // Teklif bazlı muhatap (cari kaydını değiştirmez)
  contactName?: string;
  contactTitle?: 'BEY' | 'HANIM';
}
