import type { Cari } from './musteri';
import type { TeklifSatiri } from './teklifSatiri';
import type { ImageItem } from './imageItem';

export type ParaBirimi = 'TRY' | 'EUR' | 'USD';
/**
 * Teklif durumu — tek-model yaklaşımı: durum hem aşamayı hem iş sonucunu gösterir.
 *  - taslak     : üzerinde çalışılıyor
 *  - hazir      : PDF üretildi, gönderim için hazır
 *  - gonderildi : müşteriye gönderildi, yanıt bekleniyor
 *  - onaylandi  : müşteri onayladı / sipariş alındı
 *  - reddedildi : müşteri teklifi reddetti (rakipte kaldı, fiyat tutmadı vb.)
 *  - iptal      : süreç iptal edildi (proje iptal, müşteri vazgeçti vb.)
 */
export type TeklifDurum = 'taslak' | 'hazir' | 'gonderildi' | 'onaylandi' | 'reddedildi' | 'iptal';

/**
 * İş sonucu — yöneticinin win/loss analizi yapabilmesi için. `durum`'dan
 * bağımsız: `durum=gonderildi` ile `sonuc=beklemede` paralel devam edebilir.
 *  - kazanildi   → Sipariş alındı, anlaşma kapandı
 *  - kaybedildi  → Müşteri başka rakipten / fiyat / zaman vs. nedenle aldı
 *  - iptal       → Müşteri vazgeçti veya bizim tarafımızdan iptal
 *  - beklemede   → Hâlâ açık, takipte (varsayılan, undefined eşdeğer)
 */
export type TeklifSonuc = 'kazanildi' | 'kaybedildi' | 'iptal' | 'beklemede';

/** Kaybedildi durumunda — kök neden segmentasyonu (sebep raporları için). */
export type KayipSebebi = 'fiyat' | 'rakip' | 'zaman' | 'ihtiyac_yok' | 'diger';

/**
 * Otomatik kayıt sistemi için yeni durum modeli.
 *  - taslak       → Auto-save ile sürekli güncellenen çalışma kopyası
 *  - kaydedildi   → PDF üretildi (en son hal kalıcı snapshot)
 *  - gonderildi   → E-posta başarıyla gönderildi
 * Kullanıcı değişiklik yaparsa kaydedildi/gonderildi durumu otomatik
 * olarak "taslak"a döner.
 */
export type TeklifStatus = 'taslak' | 'kaydedildi' | 'gonderildi';

/**
 * Teklif görünürlük yetkisi.
 *  - private → Sadece hazırlayan + admin (yönetici) görür
 *  - team    → Admin + tüm ekip (tüm personeller) görür
 * undefined → 'team' kabul edilir (geriye uyumluluk: mevcut kayıtlar paylaşımlı)
 */
export type TeklifVisibility = 'private' | 'team';

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
  /** Not alanının A4 görünümünde ve PDF'te görünür olup olmadığı. Varsayılan
   *  davranış: kayıtta tanımlı değilse, mevcut bir not metni varsa true,
   *  yoksa false. (Geriye uyumluluk: eski teklifler not içeriyorsa görünür
   *  kalır.) */
  notlarGosterilsin?: boolean;
  olusturmaTarihi: string;
  guncellemeTarihi: string;
  pdfYolu?: string;
  pdfDosyaAdi?: string;
  pdfOlusturmaTarihi?: string;
  hazirlayanKullaniciId?: string;
  hazirlayanAdSoyad?: string;
  hazirlayanRol?: string;
  hazirlayanUnvan?: string;
  contactName?: string;
  contactTitle?: 'BEY' | 'HANIM';
  gorseller?: ImageItem[];
  /** Otomatik kayıt durumu — taslak / kaydedildi / gonderildi */
  status?: TeklifStatus;
  /** Görünürlük yetkisi — private (gizli) / team (ekibe açık).
   *  undefined → 'team' kabul (geriye uyumluluk için mevcut kayıtlar). */
  visibility?: TeklifVisibility;

  // ── Sync alanları (LAN senkronizasyonu için, geriye uyumlu) ─────────
  /** Optimistic concurrency için sürüm numarası. PUT'ta backend +1 yapar. */
  version?: number;
  /** Soft delete — bu alan dolu ise kayıt UI'dan gizlenir, sync'te tombstone. */
  deletedAt?: string;
  /** Son yazan cihazın deviceId'si (config/*-config.json'dan). */
  deviceId?: string;
  /** Son güncelleyen kullanıcının id'si (createdBy = hazirlayanKullaniciId). */
  updatedBy?: string;
  /** Pull/push başarıyla tamamlandığında set edilir (ISO). */
  lastSyncedAt?: string;
  /** Multi-tenant: bu kaydın hangi grup şirketine ait olduğu (meba/elmos/mesa). */
  firmaId?: string;

  // ── İş sonucu (yönetici analiz için) ─────────────────────────────────────
  /** Bu teklif iş olarak ne sonuç verdi? undefined → 'beklemede' kabul. */
  sonuc?: TeklifSonuc;
  /** sonuc='kaybedildi' ise kök neden — opsiyonel ama analiz için değerli. */
  kayipSebebi?: KayipSebebi;
  /** sonuc='kaybedildi' ise işi alan rakip firma — serbest metin. */
  rakipFirma?: string;
  /** Sonuç ne zaman girildi (ISO). */
  sonucTarihi?: string;
  /** Kim sonucu girdi. */
  sonucGirenKullaniciId?: string;
  /** Yöneticinin sonuca ilişkin notu (gizli, müşteriye gitmez). */
  sonucNotu?: string;
}
