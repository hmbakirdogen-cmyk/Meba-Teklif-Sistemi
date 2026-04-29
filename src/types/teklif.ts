import type { Cari } from './musteri';
import type { TeklifSatiri } from './teklifSatiri';
import type { ImageItem } from './imageItem';

export type ParaBirimi = 'TRY' | 'EUR' | 'USD';
export type TeklifDurum = 'taslak' | 'hazir' | 'gonderildi' | 'onaylandi' | 'iptal';

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
}
