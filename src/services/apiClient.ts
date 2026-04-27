/**
 * apiClient.ts
 * Thin fetch wrapper for the MEBA backend (server/server.cjs on port 3001).
 * Uses window.location.hostname so it works for both localhost dev and LAN IPs.
 */

import type { Teklif, Cari, Urun } from '../types';
import { APP_CONFIG } from '../config';

const BASE = APP_CONFIG.API_BASE;

// ── Generic helpers ───────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Referans type ─────────────────────────────────────────────────────────────

export interface Referans {
  markalar: string[];
  birimler: string[];
  teslimSecenekleri: string[];
}

export interface Sayac {
  yil: number;
  ay: number;
  deger: number;
}

export interface InitData {
  teklifler: Teklif[];
  cariler: Cari[];
  urunler: Urun[];
  referans: Referans;
  sayac: Sayac;
}

// ── User-aware query string helper ────────────────────────────────────────────

/** Yetki query string'i (?userId=X&rol=Y) — backend visibility filter için. */
function userQuery(kullanici?: { id: string; rol: string }): string {
  if (!kullanici) return '';
  const params = new URLSearchParams({ userId: kullanici.id, rol: kullanici.rol });
  return `?${params.toString()}`;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export const api = {
  /** Fetch all data at once (used on app startup) — visibility filter applied */
  init: (kullanici?: { id: string; rol: string }) =>
    get<InitData>(`/init${userQuery(kullanici)}`),

  teklifler: {
    /** Re-fetch teklifler list with visibility filter (used when user changes
     *  or list page wants fresh data). */
    list:   (kullanici?: { id: string; rol: string }) =>
      get<Teklif[]>(`/teklifler${userQuery(kullanici)}`),
    upsert: (t: Teklif)                 => put<Teklif>(`/teklifler/${t.id}`, t),
    sil:    (id: string)                => del(`/teklifler/${id}`),
  },

  cariler: {
    upsert:      (c: Cari)              => put<Cari>(`/cariler/${c.id}`, c),
    sil:         (id: string)           => del(`/cariler/${id}`),
    bulkReplace: (liste: Cari[])        => put<Cari[]>('/cariler', liste),
  },

  urunler: {
    upsert:      (u: Urun)              => put<Urun>(`/urunler/${u.id}`, u),
    sil:         (id: string)           => del(`/urunler/${id}`),
    bulkReplace: (liste: Urun[])        => put<Urun[]>('/urunler', liste),
  },

  referans: {
    getir:  ()                          => get<Referans>('/referans'),
    kaydet: (r: Referans)               => put<Referans>('/referans', r),
  },

  sayac: {
    increment: ()                       => post<Sayac>('/sayac/increment', {}),
  },

  /** One-time localStorage → server migration */
  migrate: (payload: {
    teklifler?: Teklif[];
    cariler?: Cari[];
    urunler?: Urun[];
    referans?: Partial<Referans>;
    sayacDeger?: number;
  }) => post<{ migrated: boolean; reason?: string }>('/migrate', payload),
};
