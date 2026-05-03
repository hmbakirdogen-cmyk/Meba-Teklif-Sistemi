/**
 * apiClient.ts
 * Thin fetch wrapper for the Grup Şirketleri backend (server/server.cjs on port 3001).
 * Uses window.location.hostname so it works for both localhost dev and LAN IPs.
 *
 * Tüm istekler X-Device-Id, X-Session-Token ve X-Firma-Id header'ları ile gider
 * (multi-tenant + auth için). 8 saniyelik timeout ile network hata durumlarında
 * UI'nın takılmasını engeller.
 */

import type { Teklif, Cari, Urun, UrunSeti, Kullanici, Firma } from '../types';
import { APP_CONFIG } from '../config';

const BASE = APP_CONFIG.API_BASE;
const TIMEOUT_MS = 8000;

const SESSION_TOKEN_KEY = 'gc_session_token';
const ACTIVE_FIRMA_KEY = 'gc_active_firma_id';
const ACTIVE_USER_KEY = 'gc_aktif_kullanici';

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}
export function setSessionToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
  else localStorage.removeItem(SESSION_TOKEN_KEY);
}

export function getActiveFirmaId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_FIRMA_KEY);
}
/** FirmaContext senkronizasyonu icin custom event adi (ayni tab icinde polling yerine). */
export const ACTIVE_FIRMA_CHANGE_EVENT = 'gc-active-firma-change';

export function setActiveFirmaId(firmaId: string | null): void {
  if (typeof window === 'undefined') return;
  if (firmaId) localStorage.setItem(ACTIVE_FIRMA_KEY, firmaId);
  else localStorage.removeItem(ACTIVE_FIRMA_KEY);
  // Ayni tab icinde FirmaContext'i hemen senkronize et (storage event diger
  // tab'lere gider, ayni tab'a gelmez). Polling 1 sn'lik gecikmeyi siler.
  window.dispatchEvent(new CustomEvent(ACTIVE_FIRMA_CHANGE_EVENT, {
    detail: { firmaId },
  }));
}

// ── Sifre hatirlama (kullanici bazinda) ─────────────────────────────────────
// localStorage'da kullanici-id basina obfuscate edilmis sifre. Bu GERCEK
// SIFRELEME DEGIL — XSS'e karsi koruma yok; sadece casual goz incelemesini
// engeller. Internal LAN ortaminda "remember me" UX'i icin yeterli; gercek
// guvenlik backend session token + Windows hesap izolasyonu ile saglanir.
const REMEMBERED_SIFRE_PREFIX = 'gc_pw_';

function _obf(s: string): string {
  if (typeof btoa === 'undefined') return s;
  try { return btoa(unescape(encodeURIComponent(s))); } catch { return s; }
}
function _deobf(s: string): string {
  if (typeof atob === 'undefined') return s;
  try { return decodeURIComponent(escape(atob(s))); } catch { return ''; }
}

export function getRememberedSifre(userId: string): string | null {
  if (typeof window === 'undefined' || !userId) return null;
  const raw = localStorage.getItem(REMEMBERED_SIFRE_PREFIX + userId);
  return raw ? _deobf(raw) : null;
}
export function setRememberedSifre(userId: string, sifre: string): void {
  if (typeof window === 'undefined' || !userId) return;
  if (sifre) localStorage.setItem(REMEMBERED_SIFRE_PREFIX + userId, _obf(sifre));
  else localStorage.removeItem(REMEMBERED_SIFRE_PREFIX + userId);
}
export function clearRememberedSifre(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.removeItem(REMEMBERED_SIFRE_PREFIX + userId);
}

export function getStoredKullanici(): Kullanici | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    return raw ? (JSON.parse(raw) as Kullanici) : null;
  } catch {
    return null;
  }
}
export function setStoredKullanici(kullanici: Kullanici | null): void {
  if (typeof window === 'undefined') return;
  if (kullanici) localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(kullanici));
  else localStorage.removeItem(ACTIVE_USER_KEY);
}

/** Device id — localStorage'tan oku, yoksa üret. */
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  // Eski anahtardan migrate (geriye uyum)
  const eski = localStorage.getItem('meba_device_id');
  let id = localStorage.getItem('gc_device_id') || eski;
  if (!id) {
    id = 'web-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
  }
  localStorage.setItem('gc_device_id', id);
  return id;
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { 'X-Device-Id': getDeviceId(), ...extra };
  const k = getStoredKullanici();
  if (k) {
    h['X-User-Id'] = k.id;
    h['X-User-Role'] = k.rol;
  }
  const token = getSessionToken();
  if (token) h['X-Session-Token'] = token;
  const firmaId = getActiveFirmaId();
  if (firmaId) h['X-Firma-Id'] = firmaId;
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

/** Yardimci: response'u json'a cevirir; hata durumunda body'deki error mesajini
 *  ekleyerek throw eder. */
async function parseOrThrow<T>(res: Response, label: string): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  let body: unknown = null;
  if (ct.includes('application/json')) {
    try { body = await res.json(); } catch { /* ignore */ }
  }
  if (!res.ok) {
    const errMsg = (body && typeof body === 'object' && 'error' in (body as Record<string, unknown>))
      ? String((body as Record<string, unknown>).error)
      : `${label} → ${res.status}`;
    const err = new Error(errMsg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (body as T);
}

async function get<T>(path: string): Promise<T> {
  const { signal, clear } = withTimeout();
  try {
    const res = await fetch(`${BASE}${path}`, { headers: buildHeaders(), signal });
    return parseOrThrow<T>(res, `GET ${path}`);
  } finally {
    clear();
  }
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const { signal, clear } = withTimeout();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal,
    });
    return parseOrThrow<T>(res, `PATCH ${path}`);
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
    return parseOrThrow<T>(res, `PUT ${path}`);
  } finally {
    clear();
  }
}

async function del(path: string): Promise<void> {
  const { signal, clear } = withTimeout();
  try {
    const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: buildHeaders(), signal });
    if (!res.ok) {
      await parseOrThrow<void>(res, `DELETE ${path}`);
    }
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
    return parseOrThrow<T>(res, `POST ${path}`);
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
  sayac: Sayac | null;
  firmalar?: Firma[];
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
    uploadLogo:  (id: string, fotoBase64: string) =>
      post<{ logoUrl: string; cari: Cari }>(`/cariler/${id}/logo`, { fotoBase64 }),
    silLogo:     (id: string)           => del(`/cariler/${id}/logo`),
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
    /** Backward compat: header'daki X-Firma-Id'ye gore artirir. */
    increment: ()                       => post<Sayac>('/sayac/increment', {}),
    /** Yeni: explicit firmaId ile. */
    incrementFor: (firmaId: string)     => post<Sayac & { firmaId: string }>(`/sayac/${firmaId}/increment`, {}),
  },

  // ── Auth ────────────────────────────────────────────────────────────────────
  auth: {
    login: (kullaniciAdi: string, sifre: string, secilenFirmaId?: string | null) =>
      post<{ token: string; expiresAt: string; kullanici: Kullanici; firma: Firma | null }>(
        '/auth/login',
        { kullaniciAdi, sifre, secilenFirmaId: secilenFirmaId ?? null },
      ),
    logout: ()                                   => post<{ ok: boolean }>('/auth/logout', {}),
    me:     ()                                   => get<{ kullanici: Kullanici; firma: Firma | null }>('/auth/me'),
    changePassword: (mevcutSifre: string, yeniSifre: string) =>
      post<{ ok: boolean; mustChangePassword: boolean }>('/auth/change-password', { mevcutSifre, yeniSifre }),
    uploadPhoto: (fotoBase64: string) =>
      post<{ profilFotoUrl: string; kullanici: Kullanici }>('/auth/upload-photo', { fotoBase64 }),
  },

  // ── Firmalar ────────────────────────────────────────────────────────────────
  firmalar: {
    /** Public — login ekranindaki splash icin token gerektirmez. */
    list:   ()                          => get<Firma[]>('/firmalar'),
    detay:  (id: string)                => get<Firma>(`/firma/${id}`),
    update: (id: string, patchBody: Partial<Firma>) => patch<Firma>(`/firma/${id}`, patchBody),
    /**
     * Public — login ekraninda firma secildikten sonra o firmanin
     * personelini kart olarak gostermek icin. Sadece minimal alanlar:
     * { id, kullaniciAdi, adSoyad, unvan, rol, firmaId, profilFotoUrl, initials }
     */
    personel: (firmaId: string) =>
      get<Array<{
        id: string;
        kullaniciAdi: string;
        adSoyad: string;
        unvan: string;
        rol: string;
        firmaId: string | null;
        profilFotoUrl: string | null;
        initials: string;
      }>>(`/firma/${firmaId}/personel`),
  },

  // ── Kullanicilar ────────────────────────────────────────────────────────────
  kullanicilar: {
    list:    ()                                                   => get<Kullanici[]>('/kullanicilar'),
    create:  (payload: { kullaniciAdi: string; adSoyad: string; unvan?: string; rol?: string; firmaId?: string }) =>
      post<{ kullanici: Kullanici; varsayilanSifre: string }>('/kullanicilar', payload),
    update:  (id: string, patchBody: Partial<Kullanici>)          => patch<Kullanici>(`/kullanicilar/${id}`, patchBody),
    sifirla: (id: string)                                         => post<{ ok: boolean; varsayilanSifre: string }>(`/kullanicilar/${id}/sifre-sifirla`, {}),
    sil:     (id: string)                                         => del(`/kullanicilar/${id}`),
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
