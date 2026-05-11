export type BildirimTur = 'ilgili_atandi' | 'teklif_guncellendi' | 'geri_bildirim_cevap';

export interface Bildirim {
  id: string;
  /** Bildirimin gönderildiği kullanıcı */
  hedefKullaniciId: string;
  /** Bildirimi oluşturan kullanıcı */
  kaynakKullaniciId: string;
  kaynakKullaniciAdSoyad: string;
  /** İlgili teklif (yalnız 'ilgili_atandi' / 'teklif_guncellendi' için) */
  teklifId?: string;
  teklifNo?: string;
  /** Müşteri adı (yalnız teklif tabanlı türler için) */
  cariAdi?: string;
  /** Bildirim türü */
  tur: BildirimTur;
  /** Geri bildirim cevap türü için kaynak feedback id'si */
  geriBildirimId?: string;
  /** Geri bildirim cevap türü için cevap özeti (max ~140 karakter) */
  ozet?: string;
  /** Okundu mu */
  okundu: boolean;
  /** Oluşturma tarihi */
  tarih: string;
}
