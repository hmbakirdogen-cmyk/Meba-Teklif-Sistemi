export interface Cari {
  id: string;
  cariKod: string;
  firmaAdi: string;
  yetkiliKisi: string;
  telefon: string;
  ePosta: string;
  sehir?: string;
  adres: string;
  vergiDairesi: string;
  vergiNo: string;
  /** Teklif bazlı — bu cari için en son kullanılan muhatap */
  lastContactName?: string;
  lastContactTitle?: 'BEY' | 'HANIM';
  /** Cariye yüklenmiş logo görseli (kapak kartında öncelikli kullanılır).
   *  Yoksa otomatik gradient + monogram fallback'e düşer. */
  logoUrl?: string;
  /** Logo yükleme/değiştirme zamanı (ISO). */
  logoYuklemeTarihi?: string;
  guncellemeTarihi?: string;
  // ── Sync alanları (LAN senkronizasyonu için, geriye uyumlu) ─────────
  version?: number;
  deletedAt?: string;
  deviceId?: string;
  updatedBy?: string;
  lastSyncedAt?: string;
  /** Multi-tenant: bu cari'nin hangi grup şirketine ait olduğu. */
  firmaId?: string;
}
