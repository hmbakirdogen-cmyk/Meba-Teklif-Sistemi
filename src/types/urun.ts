export interface Urun {
  id: string;
  urunKod: string;
  urunAdi: string;
  aciklama: string;
  kategori: string;
  marka?: string;
  birim: string;
  varsayilanFiyat: number;
  // ── Sync alanları (LAN senkronizasyonu için, geriye uyumlu) ─────────
  version?: number;
  deletedAt?: string;
  deviceId?: string;
  updatedBy?: string;
  lastSyncedAt?: string;
}
