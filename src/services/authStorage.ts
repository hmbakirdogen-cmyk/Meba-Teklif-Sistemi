/**
 * authStorage.ts
 * ─────────────────────────────────────────────────────────────────────
 * Auth state için TEK storage abstraction modülü. Tüm token/user/firma
 * okuma & yazma BURADAN geçer; başka dosyalarda doğrudan localStorage /
 * sessionStorage çağrısı YAPILMAZ.
 *
 * "Beni Hatırla" semantiği:
 *   - remember=true  → localStorage  (tarayıcı kapansa bile oturum kalır)
 *   - remember=false → sessionStorage (sekme/tarayıcı kapanınca biter)
 *
 * Şifre HİÇBİR koşulda saklanmaz — yalnızca kullanıcı adı (`username`)
 * `meba_remember_username` key'ine yazılabilir, opsiyoneldir.
 *
 * Migration: eski `gc_*` key'leri ilk load'da `meba_auth_*`'a kopyalanır
 * ve eskiler silinir. Mevcut açık oturumlar bozulmaz.
 */

import type { Kullanici } from '../types';

// ─── Storage keys (TEK doğruluk kaynağı) ────────────────────────────────
const K = {
  TOKEN: 'meba_auth_token',
  USER: 'meba_auth_user',
  FIRMA: 'meba_auth_firma',
  EXPIRY: 'meba_auth_expiry',
  REMEMBER_USERNAME: 'meba_remember_username',
  REMEMBER_FLAG: 'meba_remember_flag',
  DEVICE_ID: 'meba_device_id',
} as const;

// Storage event isimlendirmesi (multi-tab senkronizasyon için dışarı export)
export const AUTH_STORAGE_KEYS = K;

// Legacy keys — migration kaynağı. İlk load'da okunup K.* karşılığına
// taşınırlar, sonra silinirler.
const LEGACY = {
  TOKEN: 'gc_session_token',
  USER: 'gc_aktif_kullanici',
  FIRMA: 'gc_active_firma_id',
  DEVICE_ID: 'gc_device_id',
  DEVICE_ID_OLD: 'meba_device_id', // çift legacy
} as const;

const AUTH_KEYS_TO_CLEAR: ReadonlyArray<string> = [
  K.TOKEN, K.USER, K.FIRMA, K.EXPIRY,
  LEGACY.TOKEN, LEGACY.USER, LEGACY.FIRMA,
];

// ─── Types ──────────────────────────────────────────────────────────────
export interface StoredAuth {
  token: string;
  user: Kullanici;
  firmaId: string | null;
  /** ISO timestamp — backend response'taki expiresAt. Frontend-side TTL kontrolü için. */
  expiresAt: string;
}

export type SessionRestoreResult =
  | { status: 'ok'; data: StoredAuth }
  | { status: 'empty' }
  | { status: 'expired' }
  | { status: 'invalid' };

// ─── Helpers ────────────────────────────────────────────────────────────
function isBrowser(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function safeGet(storage: Storage, key: string): string | null {
  try { return storage.getItem(key); } catch { return null; }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try { storage.setItem(key, value); } catch {
    // Quota aşımı / private mode — sessizce yut. Auth state memory'de
    // çalışmaya devam eder, sayfa yenilemede kaybolur (bilinçli düşüş).
  }
}

function safeRemove(storage: Storage, key: string): void {
  try { storage.removeItem(key); } catch { /* ignore */ }
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

/** Verilen alan için aktif storage'ı tespit eder: önce local, yoksa session. */
function activeStorageFor(key: string): Storage | null {
  if (!isBrowser()) return null;
  if (window.localStorage.getItem(key) !== null) return window.localStorage;
  if (window.sessionStorage.getItem(key) !== null) return window.sessionStorage;
  return null;
}

function pickStorage(remember: boolean): Storage | null {
  if (!isBrowser()) return null;
  return remember ? window.localStorage : window.sessionStorage;
}

// ─── Migration ──────────────────────────────────────────────────────────
//
// Bir kez çalışır (token migration), `meba_auth_token` zaten varsa skip.
// Legacy oturumlar localStorage'da olduğu için yeni shape de localStorage'a
// taşınır (mevcut kullanıcılar logout yapmasın). Expiry bilinmiyor → 30 gün
// varsay (en güvenli tahmin, backend yine gerçek TTL'i kontrol eder).
let migratedThisLoad = false;

function migrateLegacyIfNeeded(): void {
  if (!isBrowser() || migratedThisLoad) return;
  migratedThisLoad = true;
  try {
    // Device id taşınması — token'dan bağımsız
    if (!window.localStorage.getItem(K.DEVICE_ID)) {
      const dev =
        window.localStorage.getItem(LEGACY.DEVICE_ID) ||
        window.localStorage.getItem(LEGACY.DEVICE_ID_OLD);
      if (dev) window.localStorage.setItem(K.DEVICE_ID, dev);
    }
    window.localStorage.removeItem(LEGACY.DEVICE_ID);
    window.localStorage.removeItem(LEGACY.DEVICE_ID_OLD);

    // Token yoksa ve legacy varsa taşı
    if (window.localStorage.getItem(K.TOKEN) === null) {
      const legacyToken = window.localStorage.getItem(LEGACY.TOKEN);
      if (legacyToken) {
        const legacyUser = window.localStorage.getItem(LEGACY.USER);
        const legacyFirma = window.localStorage.getItem(LEGACY.FIRMA);
        // Expiry bilinmiyor — backend doğrulayacak; 30 gün ileri varsay.
        const fallbackExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        window.localStorage.setItem(K.TOKEN, legacyToken);
        if (legacyUser) window.localStorage.setItem(K.USER, legacyUser);
        if (legacyFirma) window.localStorage.setItem(K.FIRMA, legacyFirma);
        window.localStorage.setItem(K.EXPIRY, fallbackExpiry);
      }
    }
    // Legacy temizle
    window.localStorage.removeItem(LEGACY.TOKEN);
    window.localStorage.removeItem(LEGACY.USER);
    window.localStorage.removeItem(LEGACY.FIRMA);
  } catch {
    // ignore migration errors — uygulama yine çalışsın
  }
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Auth state'i storage'a yazar. `remember=true` → localStorage,
 * `remember=false` → sessionStorage. Diğer storage'da kalan eski auth
 * key'leri temizlenir (drift önlemi).
 */
function save(data: StoredAuth, remember: boolean): void {
  if (!isBrowser()) return;
  migrateLegacyIfNeeded();
  const target = pickStorage(remember);
  const other = pickStorage(!remember);
  if (!target) return;
  // Önce karşı storage'dan auth alanlarını temizle — tek kaynak garanti.
  if (other) {
    safeRemove(other, K.TOKEN);
    safeRemove(other, K.USER);
    safeRemove(other, K.FIRMA);
    safeRemove(other, K.EXPIRY);
  }
  safeSet(target, K.TOKEN, data.token);
  safeSet(target, K.USER, JSON.stringify(data.user));
  if (data.firmaId) safeSet(target, K.FIRMA, data.firmaId);
  else safeRemove(target, K.FIRMA);
  safeSet(target, K.EXPIRY, data.expiresAt);
}

/**
 * Storage'dan auth state'i okur. Önce localStorage, yoksa sessionStorage.
 * Bozuk JSON → temizle ve `invalid`. Expiry geçmişse → temizle ve `expired`.
 * `ok` durumunda decoded StoredAuth dön.
 */
function load(): SessionRestoreResult {
  if (!isBrowser()) return { status: 'empty' };
  migrateLegacyIfNeeded();

  const tokenStorage = activeStorageFor(K.TOKEN);
  if (!tokenStorage) return { status: 'empty' };

  const token = safeGet(tokenStorage, K.TOKEN);
  if (!token) return { status: 'empty' };

  const userRaw = safeGet(tokenStorage, K.USER);
  const user = safeJsonParse<Kullanici>(userRaw);
  const firmaId = safeGet(tokenStorage, K.FIRMA);
  const expiresAt = safeGet(tokenStorage, K.EXPIRY);

  if (!user || !expiresAt) {
    console.warn('[Auth] Invalid session — clearing');
    clearAuth();
    return { status: 'invalid' };
  }

  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) {
    console.warn('[Auth] Token expired');
    clearAuth();
    return { status: 'expired' };
  }

  return {
    status: 'ok',
    data: { token, user, firmaId: firmaId || null, expiresAt },
  };
}

/**
 * Auth verisini her iki storage'dan temizler. `remember_*` ve `device_id`
 * korunur (logout sonrası kullanıcı adının login formunda dolu kalması için).
 */
function clearAuth(): void {
  if (!isBrowser()) return;
  for (const key of AUTH_KEYS_TO_CLEAR) {
    safeRemove(window.localStorage, key);
    safeRemove(window.sessionStorage, key);
  }
}

/** Hem auth hem remember verilerini temizler (örn. "remember username" reset). */
function clearAll(): void {
  if (!isBrowser()) return;
  clearAuth();
  safeRemove(window.localStorage, K.REMEMBER_USERNAME);
  safeRemove(window.localStorage, K.REMEMBER_FLAG);
}

/** Sadece token'ı oku (header inject için hızlı erişim). */
function getToken(): string | null {
  if (!isBrowser()) return null;
  migrateLegacyIfNeeded();
  const storage = activeStorageFor(K.TOKEN);
  return storage ? safeGet(storage, K.TOKEN) : null;
}

function getUser(): Kullanici | null {
  if (!isBrowser()) return null;
  migrateLegacyIfNeeded();
  const storage = activeStorageFor(K.USER);
  if (!storage) return null;
  return safeJsonParse<Kullanici>(safeGet(storage, K.USER));
}

/** User güncelleme (örn. profil foto, isim değişimi) — mevcut storage hangisi ise oraya yaz. */
function updateUser(user: Kullanici | null): void {
  if (!isBrowser()) return;
  const storage = activeStorageFor(K.TOKEN) || activeStorageFor(K.USER);
  if (!storage) return;
  if (user) safeSet(storage, K.USER, JSON.stringify(user));
  else safeRemove(storage, K.USER);
}

function getActiveFirmaId(): string | null {
  if (!isBrowser()) return null;
  migrateLegacyIfNeeded();
  const storage = activeStorageFor(K.FIRMA) || activeStorageFor(K.TOKEN);
  return storage ? safeGet(storage, K.FIRMA) : null;
}

/** Firma değişikliği auth ile aynı storage'a yazılır. */
function setActiveFirmaId(firmaId: string | null): void {
  if (!isBrowser()) return;
  const storage = activeStorageFor(K.TOKEN) || activeStorageFor(K.FIRMA) || window.localStorage;
  if (firmaId) safeSet(storage, K.FIRMA, firmaId);
  else safeRemove(storage, K.FIRMA);
  // Karşı storage'tan da temizle (drift önlemi)
  const other = storage === window.localStorage ? window.sessionStorage : window.localStorage;
  safeRemove(other, K.FIRMA);
}

// ─── Remember helpers (UX persistance — ŞİFRE DEĞİL) ───────────────────

function getRememberFlag(): boolean {
  if (!isBrowser()) return true; // varsayılan: işaretli (mevcut davranışla uyumlu)
  const raw = safeGet(window.localStorage, K.REMEMBER_FLAG);
  if (raw === null) return true;
  return raw === '1' || raw === 'true';
}

function setRememberFlag(v: boolean): void {
  if (!isBrowser()) return;
  safeSet(window.localStorage, K.REMEMBER_FLAG, v ? '1' : '0');
}

function getRememberUsername(): string | null {
  if (!isBrowser()) return null;
  return safeGet(window.localStorage, K.REMEMBER_USERNAME);
}

function setRememberUsername(username: string | null): void {
  if (!isBrowser()) return;
  if (username) safeSet(window.localStorage, K.REMEMBER_USERNAME, username);
  else safeRemove(window.localStorage, K.REMEMBER_USERNAME);
}

// ─── Device ID — auth'tan bağımsız, daima localStorage'da persistent ───
function getDeviceId(): string {
  if (!isBrowser()) return 'server';
  migrateLegacyIfNeeded();
  let id = safeGet(window.localStorage, K.DEVICE_ID);
  if (!id) {
    id = 'web-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
    safeSet(window.localStorage, K.DEVICE_ID, id);
  }
  return id;
}

export const authStorage = {
  save,
  load,
  clearAuth,
  clearAll,
  getToken,
  getUser,
  updateUser,
  getActiveFirmaId,
  setActiveFirmaId,
  getRememberFlag,
  setRememberFlag,
  getRememberUsername,
  setRememberUsername,
  getDeviceId,
};

export default authStorage;
