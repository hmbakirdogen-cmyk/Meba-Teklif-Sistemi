/**
 * dataStore.ts
 * In-memory cache of all shared data.
 *
 * Strategy:
 *  - App start: fetch everything from server → populate cache. Server
 *    erişilemiyorsa localStorage snapshot'tan restore (offline-first).
 *  - Reads: synchronous, from cache (no await needed in services).
 *  - Writes: update cache immediately + try server (PUT/DELETE). Network
 *    fail olursa syncEngine.enqueue() ile offline queue'ya yazılır.
 *
 * This keeps all existing service method signatures synchronous so React
 * components need zero changes.
 */

import type { Teklif, Cari, Urun, UrunSeti } from '../types';
import { api, getActiveFirmaId } from './apiClient';
import type { Referans, Sayac } from './apiClient';
import { syncEngine } from './syncEngine';

/** Yeni eklenen kayda (firmaId yoksa) aktif firmaId'yi inject eder.
 *  Mevcut firmaId varsa dokunulmaz — eski kayitlari koruyalim. */
function withFirmaId<T extends { firmaId?: string }>(rec: T): T {
  if (rec.firmaId) return rec;
  const firmaId = getActiveFirmaId();
  return firmaId ? { ...rec, firmaId } : rec;
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface Store {
  teklifler: Teklif[];
  cariler: Cari[];
  urunler: Urun[];
  urunSetleri: UrunSeti[];
  referans: Referans;
  sayac: Sayac;
}

const VARSAYILAN_REFERANS: Referans = {
  markalar: ['SMC', 'Maxtor', 'SICK', 'Danfoss', 'WINMAN'],
  birimler: ['Adet', 'Takım', 'Metre', 'Cm', 'Mm', 'Kg', 'Litre', 'Paket', 'Kutu', 'Set', 'Rulo'],
  teslimSecenekleri: ['2-3 Gün', '5-7 Gün', '10 Gün', '1-2 Hafta', '2-3 Hafta', '4-6 Hafta', 'Stok', 'Sipariş Üzerine'],
};

let store: Store = {
  teklifler: [],
  cariler: [],
  urunler: [],
  urunSetleri: [],
  referans: VARSAYILAN_REFERANS,
  sayac: { yil: new Date().getFullYear(), ay: new Date().getMonth() + 1, deger: 0 },
};

// ── One-time localStorage migration ──────────────────────────────────────────

const MIGRATION_FLAG = 'meba_ls_migrated';

async function migrasyonDene(): Promise<void> {
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  try {
    const teklifler: Teklif[] = JSON.parse(localStorage.getItem('teklif_teklifler') ?? '[]');
    const cariler: Cari[]     = JSON.parse(localStorage.getItem('teklif_cariler')   ?? 'null') ?? [];
    const urunler: Urun[]     = JSON.parse(localStorage.getItem('teklif_urunler')   ?? 'null') ?? [];
    const sayacDeger           = parseInt(localStorage.getItem('teklif_sayac') ?? '0', 10);
    const markalar: string[]  = JSON.parse(localStorage.getItem('teklif_markalar')          ?? 'null') ?? [];
    const birimler: string[]  = JSON.parse(localStorage.getItem('teklif_birimler')           ?? 'null') ?? [];
    const teslim: string[]    = JSON.parse(localStorage.getItem('teklif_teslim_secenekleri') ?? 'null') ?? [];

    const hasData = teklifler.length > 0 || cariler.length > 1 || urunler.length > 15;
    if (!hasData) {
      localStorage.setItem(MIGRATION_FLAG, '1');
      return;
    }

    await api.migrate({
      teklifler,
      cariler,
      urunler,
      referans: {
        markalar:           markalar.length   ? markalar  : undefined,
        birimler:           birimler.length   ? birimler  : undefined,
        teslimSecenekleri:  teslim.length     ? teslim    : undefined,
      },
      sayacDeger,
    });

  } catch {
    // migration failure is non-critical
  } finally {
    localStorage.setItem(MIGRATION_FLAG, '1');
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initDataStore(
  kullanici?: { id: string; rol: string },
): Promise<void> {
  // Server erişilebiliyorsa migration + init dene
  try {
    await migrasyonDene();
    const data = await api.init(kullanici);
    store = {
      teklifler: data.teklifler,
      cariler:   data.cariler,
      urunler:   data.urunler,
      urunSetleri: data.urunSetleri ?? [],
      referans:  data.referans,
      sayac:     data.sayac ?? { yil: new Date().getFullYear(), ay: new Date().getMonth() + 1, deger: 0 },
    };
    // Başarılı init sonrası snapshot kaydet (offline restore için)
    syncEngine.saveSnapshot({
      teklifler: store.teklifler,
      cariler: store.cariler,
      urunler: store.urunler,
      urunSetleri: store.urunSetleri,
      referans: store.referans,
      sayac: store.sayac,
    });
  } catch (err) {
    // Server'a ulaşılamadı → localStorage snapshot'tan restore et (offline mode)
    const snapshot = syncEngine.loadSnapshot();
    if (!snapshot) {
      // Hiç snapshot yok → hata fırlat (App.tsx ServerErrorScreen gösterir)
      throw err;
    }
    store = {
      teklifler: snapshot.teklifler ?? [],
      cariler:   snapshot.cariler ?? [],
      urunler:   snapshot.urunler ?? [],
      urunSetleri: snapshot.urunSetleri ?? [],
      referans:  snapshot.referans ?? VARSAYILAN_REFERANS,
      sayac:     snapshot.sayac ?? { yil: new Date().getFullYear(), ay: new Date().getMonth() + 1, deger: 0 },
    };
    syncEngine.setOnlineState(false);
    console.warn('[initDataStore] Offline mod: localStorage snapshot kullanildi.');
  }
}

// ── Fire-and-forget write helper with offline fallback ────────────────────────

/**
 * Server'a yazma denemesi; network hata olursa syncEngine queue'sine ekler.
 * `op`/`collection`/`id`/`payload` queue item'i için gerekli.
 */
function syncWithFallback<T>(
  promise: Promise<T>,
  fallback: { collection: 'teklifler' | 'cariler' | 'urunler' | 'urunSetleri'; op: 'upsert' | 'delete'; id: string; payload: unknown },
): void {
  promise.catch(() => {
    syncEngine.enqueue(fallback);
  });
}

// Backwards-compat: eski `sync()` helper'i hala kullanan yerler için.
// Yeni kod syncWithFallback kullanmalı.
function sync(promise: Promise<unknown>): void {
  promise.catch(() => {});
}

// ── Public cache accessors ────────────────────────────────────────────────────

export const dataStore = {
  // ── Teklifler ──────────────────────────────────────────────────────────────

  getTeklifler:   ()            => store.teklifler,
  setTeklifler:   (v: Teklif[]) => { store.teklifler = v; },

  /** Re-fetch teklifler from server with current user's visibility filter.
   *  Kullanıcı değişince veya TeklifListesi açılınca taze veri için. */
  async refreshTeklifler(kullanici?: { id: string; rol: string }): Promise<void> {
    const liste = await api.teklifler.list(kullanici);
    store.teklifler = liste;
  },
  cacheUpsertTeklif(t: Teklif): void {
    const idx = store.teklifler.findIndex((x) => x.id === t.id);
    if (idx >= 0) { store.teklifler[idx] = t; }
    else { store.teklifler.unshift(t); }
  },

  upsertTeklif(t: Teklif): void {
    const enriched = withFirmaId(t);
    const idx = store.teklifler.findIndex((x) => x.id === enriched.id);
    if (idx >= 0) { store.teklifler[idx] = enriched; }
    else { store.teklifler.unshift(enriched); }
    syncWithFallback(api.teklifler.upsert(enriched), { collection: 'teklifler', op: 'upsert', id: enriched.id, payload: enriched });
  },

  deleteTeklif(id: string): void {
    store.teklifler = store.teklifler.filter((x) => x.id !== id);
    syncWithFallback(api.teklifler.sil(id), { collection: 'teklifler', op: 'delete', id, payload: { id } });
  },

  // ── Cariler ───────────────────────────────────────────────────────────────

  getCariler: ()                => store.cariler,
  setCariler: (v: Cari[])       => { store.cariler = v; },

  upsertCari(c: Cari): void {
    const enriched = withFirmaId(c);
    const idx = store.cariler.findIndex((x) => x.id === enriched.id);
    if (idx >= 0) { store.cariler[idx] = enriched; }
    else { store.cariler.push(enriched); }
    syncWithFallback(api.cariler.upsert(enriched), { collection: 'cariler', op: 'upsert', id: enriched.id, payload: enriched });
  },

  deleteCari(id: string): void {
    store.cariler = store.cariler.filter((x) => x.id !== id);
    syncWithFallback(api.cariler.sil(id), { collection: 'cariler', op: 'delete', id, payload: { id } });
  },

  bulkReplaceCariler(liste: Cari[]): void {
    const enriched = liste.map(withFirmaId);
    store.cariler = enriched;
    sync(api.cariler.bulkReplace(enriched));
  },

  // ── Urunler ───────────────────────────────────────────────────────────────

  getUrunler: ()                => store.urunler,
  setUrunler: (v: Urun[])       => { store.urunler = v; },

  upsertUrun(u: Urun): void {
    const enriched = withFirmaId(u);
    const idx = store.urunler.findIndex((x) => x.id === enriched.id);
    if (idx >= 0) { store.urunler[idx] = enriched; }
    else { store.urunler.push(enriched); }
    syncWithFallback(api.urunler.upsert(enriched), { collection: 'urunler', op: 'upsert', id: enriched.id, payload: enriched });
  },

  deleteUrun(id: string): void {
    store.urunler = store.urunler.filter((x) => x.id !== id);
    syncWithFallback(api.urunler.sil(id), { collection: 'urunler', op: 'delete', id, payload: { id } });
  },

  bulkReplaceUrunler(liste: Urun[]): void {
    const enriched = liste.map(withFirmaId);
    store.urunler = enriched;
    sync(api.urunler.bulkReplace(enriched));
  },

  // ── Ürün Setleri ─────────────────────────────────────────────────────────

  getUrunSetleri: ()                => store.urunSetleri,
  setUrunSetleri: (v: UrunSeti[])   => { store.urunSetleri = v; },

  upsertUrunSeti(s: UrunSeti): void {
    const enriched = withFirmaId(s);
    const idx = store.urunSetleri.findIndex((x) => x.id === enriched.id);
    if (idx >= 0) { store.urunSetleri[idx] = enriched; }
    else { store.urunSetleri.push(enriched); }
    syncWithFallback(api.urunSetleri.upsert(enriched), { collection: 'urunSetleri', op: 'upsert', id: enriched.id, payload: enriched });
  },

  deleteUrunSeti(id: string): void {
    store.urunSetleri = store.urunSetleri.filter((x) => x.id !== id);
    syncWithFallback(api.urunSetleri.sil(id), { collection: 'urunSetleri', op: 'delete', id, payload: { id } });
  },

  bulkReplaceUrunSetleri(liste: UrunSeti[]): void {
    const enriched = liste.map(withFirmaId);
    store.urunSetleri = enriched;
    sync(api.urunSetleri.bulkReplace(enriched));
  },

  // ── Referans ──────────────────────────────────────────────────────────────

  getReferans:    ()             => store.referans,

  setReferans(r: Referans): void {
    store.referans = r;
    sync(api.referans.kaydet(r));
  },

  // ── Sayac ─────────────────────────────────────────────────────────────────

  getSayac: () => store.sayac,

  /** Increments counter on server (atomic) and updates local cache. Returns new teklifNo. */
  async incrementSayac(): Promise<string> {
    const result = await api.sayac.increment();
    store.sayac = result;
    const yy = String(result.yil).slice(-2);
    const mm = String(result.ay ?? new Date().getMonth() + 1).padStart(2, '0');
    return `${yy}${mm}-${String(result.deger).padStart(3, '0')}`;
  },
};
