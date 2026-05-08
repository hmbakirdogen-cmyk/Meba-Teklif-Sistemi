export interface Bildirim {
  id: string;
  /** Bildirimin gönderildiği kullanıcı */
  hedefKullaniciId: string;
  /** Bildirimi oluşturan kullanıcı */
  kaynakKullaniciId: string;
  kaynakKullaniciAdSoyad: string;
  /** İlgili teklif */
  teklifId: string;
  teklifNo: string;
  /** Müşteri adı */
  cariAdi: string;
  /** Bildirim türü */
  tur: 'ilgili_atandi' | 'teklif_guncellendi';
  /** Okundu mu */
  okundu: boolean;
  /** Oluşturma tarihi */
  tarih: string;
}
