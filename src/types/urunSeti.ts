export interface UrunSetKalemi {
  id: string;
  urunKod: string;
  aciklama: string;
  miktar: number;
  birim?: string;
}

export interface UrunSeti {
  id: string;
  setKod: string;
  aciklama: string;
  kalemler: UrunSetKalemi[];
  olusturmaTarihi: string;
  guncellemeTarihi: string;
  // ── Sync alanları (LAN senkronizasyonu için, geriye uyumlu) ─────────
  version?: number;
  deletedAt?: string;
  deviceId?: string;
  updatedBy?: string;
  lastSyncedAt?: string;
  /** Multi-tenant: bu set'in hangi grup şirketine ait olduğu. */
  firmaId?: string;
}
