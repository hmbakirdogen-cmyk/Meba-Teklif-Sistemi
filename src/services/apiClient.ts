/**
 * apiClient.ts
 * Thin fetch wrapper for the MEBA backend (server/server.cjs on port 3001).
 * Uses window.location.hostname so it works for both localhost dev and LAN IPs.
 *
 * Tüm istekler X-Device-Id header'ı ile gider (sync için server tarafında
 * deviceId tracking). 8 saniyelik timeout ile network hata durumlarında
 * UI'nın takılmasını engeller.
 */

import type { Teklif, Cari, Urun, UrunSeti } from '../types';
import { APP_CONFIG } from '../config';

const BASE = APP_CONFIG.API_BASE;
const TIMEOUT_MS = 8000;

/** Device id — localStorage'tan oku, yoksa üret. */
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('meba_device_id');
  if (!id) {
    id = 'web-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
    localStorage.setItem('meba_device_id', id);
  }
  return id;
}

/** Aktif kullanıcı bilgisi (header'lara enjekte). */
function getActiveUser(): { id: string; rol: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('meba_aktif_kullanici');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id && parsed?.rol ? { id: parsed.id, rol: parsed.rol } : null;
  } catch {
    return null;
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { 'X-Device-Id': getDeviceId(), ...extra };
  const user = getActiveUser();
  if (user) {
    h['X-User-Id'] = user.id;
    h['X-User-Role'] = user.rol;
  }
  return h;
}

function withTimeout(signal?: AbortSignal): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort());
  }
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

// ── Generic helpers ───────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const { signal, clear } = withTimeout();
  try {
    const res = await fetch(`${BASE}${path}`, { headers: buildHeaders(), signal });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clear();
  }
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const { signal, clear } = withTimeout();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clear();
  }
}

async function del(path: string): Promise<void> {
  const { signal, clear } = withTimeout();
  try {
    const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: buildHeaders(), signal });
    if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
  } finally {
    clear();
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const { signal, clear } = withTimeout();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clear();
  }
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
  urunSetleri?: UrunSeti[];
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

  urunSetleri: {
    list:        ()                      => get<UrunSeti[]>('/urunSetleri'),
    upsert:      (s: UrunSeti)           => put<UrunSeti>(`/urunSetleri/${s.id}`, s),
    sil:         (id: string)            => del(`/urunSetleri/${id}`),
    bulkReplace: (liste: UrunSeti[])     => put<UrunSeti[]>('/urunSetleri', liste),
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

  // ── SYNC ─────────────────────────────────────────────────────────────────
  /** Network/server health probe (LAN-spesifik). Timeout: 4 saniye. */
  async health(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`${BASE}/health`, { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  },

  sync: {
    status: () => get<SyncStatus>('/sync/status'),
    pull: (since: string, kullanici?: { id: string; rol: string }) => {
      const params = new URLSearchParams();
      if (since) params.set('since', since);
      if (kullanici) {
        params.set('userId', kullanici.id);
        params.set('rol', kullanici.rol);
      }
      const qs = params.toString();
      return get<SyncPullResult>(`/sync/pull${qs ? '?' + qs : ''}`);
    },
    push: (payload: SyncPushPayload) => post<SyncPushResult>('/sync/push', payload),
    full: (payload: Partial<InitData>) => post<{ ok: boolean; replaced: boolean; serverTime: string }>('/sync/full', payload),
    devices: () => get<DeviceRecord[]>('/sync/devices'),
    registerDevice: (payload: { deviceId: string; deviceLabel: string }) =>
      post<DeviceRecord>('/sync/register-device', payload),
  },
};

// ── Sync types ────────────────────────────────────────────────────────────────

export interface SyncStatus {
  ok: boolean;
  serverTime: string;
  deviceId: string;
  deviceLabel: string;
  recordCounts: { teklifler: number; cariler: number; urunler: number; urunSetleri: number };
  liveCounts: { teklifler: number; cariler: number; urunler: number; urunSetleri: number };
  registeredDevices: number;
}

export interface SyncPullResult {
  serverTime: string;
  teklifler: Teklif[];
  cariler: Cari[];
  urunler: Urun[];
  urunSetleri: UrunSeti[];
}

export interface SyncPushPayload {
  teklifler?: Teklif[];
  cariler?: Cari[];
  urunler?: Urun[];
  urunSetleri?: UrunSeti[];
}

export interface SyncConflict {
  collection: 'teklifler' | 'cariler' | 'urunler' | 'urunSetleri';
  id: string;
  reason: 'version_conflict' | 'forbidden';
  existing: Teklif | Cari | Urun | UrunSeti;
}

export interface SyncPushResult {
  serverTime: string;
  accepted: Array<{ collection: string; id: string; version: number }>;
  conflicts: SyncConflict[];
}

export interface DeviceRecord {
  deviceId: string;
  deviceLabel: string;
  firstSeenAt: string;
  lastSeenAt: string;
  userAgent: string;
}
