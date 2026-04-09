import type { Cari } from './musteri';
import type { TeklifSatiri } from './teklifSatiri';

export type ParaBirimi = 'TRY' | 'EUR' | 'USD';
export type TeklifDurum = 'taslak' | 'hazir' | 'gonderildi' | 'onaylandi' | 'iptal';

export interface Teklif {
  id: string;
  teklifNo: string;
  tarih: string;
paraBirimi: ParaBirimi;
  durum: TeklifDurum;
  cari: Cari;
  satirlar: TeklifSatiri[];
  araToplam: number;
  toplamIndirim: number;
  toplamVergi: number;
  genelToplam: number;
  kdvOrani: number;
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
