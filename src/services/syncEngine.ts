/**
 * syncEngine.ts — Online-only mimari için minimal bağlantı durumu yöneticisi.
 *
 * Eski offline-first mimari (queue, conflict, snapshot, push/pull) tamamen
 * kaldırıldı — proje artık tek server + tarayıcı modelinde çalışıyor.
 * Bu dosya sadece "Bağlı / Bağlı Değil" durumunu izleyen ince bir wrapper.
 *
 * Sorumluluklar:
 *   - subscribe(): UI bar dinlesin (state changes)
 *   - getState(): mevcut SyncState döner
 *   - setOnlineState(online): periyodik health check sonucu
 *   - reconnect(): kullanıcı manuel "Yeniden Bağlan" butonuna basar
 *
 * Sync mimarisinden tamamen ayrı çalışan dataStore'un kendi network akışı
 * vardır (PUT/DELETE fire-and-forget). Bu dosya sadece UI göstergesi için.
 */

import { api } from './apiClient';

export type SyncPhase = 'connecting' | 'online' | 'offline';

export interface SyncState {
  phase: SyncPhase;
  lastError: string | null;
  lastHealthCheckAt: string | null;
}

type Listener = (state: SyncState) => void;

let currentState: SyncState = {
  phase: 'connecting',
  lastError: null,
  lastHealthCheckAt: null,
};

const listeners = new Set<Listener>();

function notify(): void {
  for (const fn of listeners) {
    try { fn(currentState); } catch { /* listener hatası izole */ }
  }
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(currentState); // mount anında mevcut state'i ver
  return () => { listeners.delete(fn); };
}

export function getState(): SyncState {
  return currentState;
}

export function setOnlineState(online: boolean, error: string | null = null): void {
  const newPhase: SyncPhase = online ? 'online' : 'offline';
  const changed =
    currentState.phase !== newPhase ||
    (error !== null && currentState.lastError !== error);
  if (!changed) {
    // Sadece lastHealthCheckAt'i güncelle (notify yapma — sık tetiklenir)
    currentState = { ...currentState, lastHealthCheckAt: new Date().toISOString() };
    return;
  }
  currentState = {
    phase: newPhase,
    lastError: online ? null : error,
    lastHealthCheckAt: new Date().toISOString(),
  };
  notify();
}

/**
 * Manuel yeniden bağlanma denemesi. Kullanıcı UI'da "Yeniden Bağlan" butonuna
 * basınca tetiklenir. Health check sonucunu döner ve state'i günceller.
 */
export async function reconnect(): Promise<boolean> {
  const ok = await api.health();
  setOnlineState(ok, ok ? null : 'Server\'a ulaşılamıyor');
  return ok;
}

export const syncEngine = {
  subscribe,
  getState,
  setOnlineState,
  reconnect,
};
