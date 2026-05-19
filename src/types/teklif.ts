import type { Cari } from './musteri';
import type { TeklifSatiri } from './teklifSatiri';
import type { ImageItem } from './imageItem';

export type ParaBirimi = 'TRY' | 'EUR' | 'USD';
/**
 * Teklif durumu — tek-model yaklaşımı: durum hem aşamayı hem iş sonucunu gösterir.
 *  - taslak           : üzerinde çalışılıyor (Hazırlanıyor)
 *  - hazir            : PDF üretildi, gönderim için hazır
 *  - gonderildi       : müşteriye gönderildi, yanıt bekleniyor
 *  - onaylandi        : müşteri tüm kalemleri onayladı
 *  - kismi_onaylandi  : müşteri bazı kalemleri onayladı, bazılarını reddetti
 *  - siparis_alindi   : onaylandı sonrası sipariş açıldı (PO geldi)
 *  - reddedildi       : müşteri teklifi reddetti
 *  - iptal            : süreç iptal edildi (proje iptal, müşteri vazgeçti vb.)
 * Revize edildi durumu ayrı bir değer değil — `revizyonNo > 0` ile UI'da etiketlenir.
 */
export type TeklifDurum =
  | 'taslak'
  | 'hazir'
  | 'gonderildi'
  | 'onaylandi'
  | 'kismi_onaylandi'
  | 'siparis_alindi'
  | 'reddedildi'
  | 'iptal';

/** Reddedildi/iptal durumunda — kök neden segmentasyonu (sebep raporları için). */
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
  /** Backend Prisma'da `cariSnapshot` Json alanı — teklif anındaki cari verisinin
   *  donmuş kopyası. Frontend genelde `cari` alanını kullanır; cariSnapshot
   *  analiz/legacy okuma için. */
  cariSnapshot?: unknown;
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
  dovizKuru?: string;
  notlar: string;
  /** Not alanının A4 görünümünde ve PDF'te görünür olup olmadığı. Varsayılan
   *  davranış: kayıtta tanımlı değilse, mevcut bir not metni varsa true,
   *  yoksa false. (Geriye uyumluluk: eski teklifler not içeriyorsa görünür
   *  kalır.) */
  notlarGosterilsin?: boolean;
  /** Toplamlar altındaki "Kargo bedeli alıcıya aittir." mikro-notu.
   *  Boş/undefined → varsayılan metin gösterilir.
   *  Özel metin yazılırsa onun yerine o görünür. */
  kargoNotuMetni?: string;
  /** Kargo notu tamamen gizli mi? Varsayılan false (görünür). */
  kargoNotuGizli?: boolean;
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
  contactTitle?: 'BEY' | 'HANIM' | 'YETKILI';
  /** Teklif ile ilgilenen/takip eden kişi — kendi firmasından seçilir. */
  ilgiliKisiId?: string;
  ilgiliKisiAdSoyad?: string;
  gorseller?: ImageItem[];
  /** Otomatik kayıt durumu — taslak / kaydedildi / gonderildi */
  status?: TeklifStatus;
  /** Görünürlük yetkisi — private (gizli) / team (ekibe açık).
   *  undefined → 'team' kabul (geriye uyumluluk için mevcut kayıtlar). */
  visibility?: TeklifVisibility;

  // ── Revizyon alanları ─────────────────────────────────────────────────
  /** Revizyon numarası — undefined veya 0: orijinal kayıt. 1, 2, ...: kaynak
   *  teklifin N'inci revizyonu. teklifNo'ya '-RevN' suffix'i de eklenir. */
  revizyonNo?: number;
  /** Bu kayıt hangi tekliften revize edildi — direkt kaynak teklifin id'si.
   *  Revizyonun parent'ı. Undefined ise orijinal kayıt. */
  kaynakTeklifId?: string;
  /** Tüm revizyonların ortak kök kayıt id'si — orijinal teklifin id'si.
   *  Aynı kokTeklifId'ye sahip kayıtlar aynı revizyon ailesindendir.
   *  Orijinal kayıtta undefined olabilir (kendi id'si zaten kök). */
  kokTeklifId?: string;

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

  // ── Sonuç meta verisi (durum=onaylandi/reddedildi/iptal olduğunda doldurulur) ─
  /** durum='reddedildi' veya 'iptal' ise kök neden — opsiyonel ama analiz için değerli. */
  kayipSebebi?: KayipSebebi;
  /** durum='reddedildi' ise işi alan rakip firma — serbest metin. */
  rakipFirma?: string;
  /** Durum sonuçlanmış değere geçtiğinde (onaylandi/reddedildi/iptal) zaman damgası (ISO). */
  sonucTarihi?: string;
  /** Sonuçlanma kararını giren kullanıcı. */
  sonucGirenKullaniciId?: string;
  /** Yöneticinin sonuca ilişkin notu (gizli, müşteriye gitmez). */
  sonucNotu?: string;
}
