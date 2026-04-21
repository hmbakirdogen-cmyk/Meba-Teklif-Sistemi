/**
 * dataStore.ts
 * In-memory cache of all shared data.
 *
 * Strategy:
 *  - App start: fetch everything from server → populate cache
 *  - Reads: synchronous, from cache (no await needed in services)
 *  - Writes: update cache immediately + fire-and-forget PUT/DELETE to server
 *
 * This keeps all existing service method signatures synchronous so React
 * components need zero changes.
 */

import type { Teklif, Cari, Urun } from '../types';
import { api } from './apiClient';
import type { Referans, Sayac } from './apiClient';

// ── Store shape ───────────────────────────────────────────────────────────────

interface Store {
  teklifler: Teklif[];
  cariler: Cari[];
  urunler: Urun[];
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
  referans: VARSAYILAN_REFERANS,
  sayac: { yil: new Date().getFullYear(), deger: 0 },
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

export async function initDataStore(): Promise<void> {
  // Try migrating old localStorage data to server first
  await migrasyonDene();

  // Then fetch current server state into memory
  const data = await api.init();
  store = {
    teklifler: data.teklifler,
    cariler:   data.cariler,
    urunler:   data.urunler,
    referans:  data.referans,
    sayac:     data.sayac,
  };
}

// ── Fire-and-forget write helper ──────────────────────────────────────────────

function sync(promise: Promise<unknown>): void {
  promise.catch(() => {});
}

// ── Public cache accessors ────────────────────────────────────────────────────

export const dataStore = {
  // ── Teklifler ──────────────────────────────────────────────────────────────

  getTeklifler:   ()            => store.teklifler,
  setTeklifler:   (v: Teklif[]) => { store.teklifler = v; },
  cacheUpsertTeklif(t: Teklif): void {
    const idx = store.teklifler.findIndex((x) => x.id === t.id);
    if (idx >= 0) { store.teklifler[idx] = t; }
    else { store.teklifler.unshift(t); }
  },

  upsertTeklif(t: Teklif): void {
    const idx = store.teklifler.findIndex((x) => x.id === t.id);
    if (idx >= 0) { store.teklifler[idx] = t; }
    else { store.teklifler.unshift(t); }
    sync(api.teklifler.upsert(t));
  },

  deleteTeklif(id: string): void {
    store.teklifler = store.teklifler.filter((x) => x.id !== id);
    sync(api.teklifler.sil(id));
  },

  // ── Cariler ───────────────────────────────────────────────────────────────

  getCariler: ()           => store.cariler,

  upsertCari(c: Cari): void {
    const idx = store.cariler.findIndex((x) => x.id === c.id);
    if (idx >= 0) { store.cariler[idx] = c; }
    else { store.cariler.push(c); }
    sync(api.cariler.upsert(c));
  },

  deleteCari(id: string): void {
    store.cariler = store.cariler.filter((x) => x.id !== id);
    sync(api.cariler.sil(id));
  },

  bulkReplaceCariler(liste: Cari[]): void {
    store.cariler = liste;
    sync(api.cariler.bulkReplace(liste));
  },

  // ── Urunler ───────────────────────────────────────────────────────────────

  getUrunler: ()           => store.urunler,

  upsertUrun(u: Urun): void {
    const idx = store.urunler.findIndex((x) => x.id === u.id);
    if (idx >= 0) { store.urunler[idx] = u; }
    else { store.urunler.push(u); }
    sync(api.urunler.upsert(u));
  },

  deleteUrun(id: string): void {
    store.urunler = store.urunler.filter((x) => x.id !== id);
    sync(api.urunler.sil(id));
  },

  bulkReplaceUrunler(liste: Urun[]): void {
    store.urunler = liste;
    sync(api.urunler.bulkReplace(liste));
  },

  // ── Referans ──────────────────────────────────────────────────────────────

  getReferans:    ()             => store.referans,

  setReferans(r: Referans): void {
    store.referans = r;
    sync(api.referans.kaydet(r));
  },

  // ── Sayac ─────────────────────────────────────────────────────────────────

  /** Increments counter on server (atomic) and updates local cache. Returns new teklifNo. */
  async incrementSayac(): Promise<string> {
    const result = await api.sayac.increment();
    store.sayac = result;
    return `${result.yil}-${String(result.deger).padStart(3, '0')}`;
  },
};
