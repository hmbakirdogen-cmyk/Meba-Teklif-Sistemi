/**
 * useOnlineStatus.ts — Server bağlantısı ve sync engine state'i için hook.
 *
 * navigator.onLine yetersiz (sadece kablo/WiFi durumunu söyler — LAN'daki
 * server kapalı olabilir ama internet açık). Bu hook her 30 saniyede /api/health
 * probe yapar; ek olarak syncEngine state değişikliklerini de dinler.
 */

import { useEffect, useState } from 'react';
import { api } from '../services/apiClient';
import { syncEngine } from '../services/syncEngine';
import type { SyncState } from '../services/syncEngine';

const HEALTH_INTERVAL_MS = 30_000;

export function useOnlineStatus(): SyncState & { isOnline: boolean } {
  const [state, setState] = useState<SyncState>(syncEngine.getState());

  useEffect(() => {
    const unsub = syncEngine.subscribe(setState);
    return () => unsub();
  }, []);

  // Periyodik health probe — server LAN'da var/yok kontrolü.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const ok = await api.health();
      if (cancelled) return;
      syncEngine.setOnlineState(ok);
    };
    tick(); // ilk anda dene
    const id = window.setInterval(tick, HEALTH_INTERVAL_MS);

    // Browser online/offline event'leri
    const onOnline = () => tick();
    const onOffline = () => syncEngine.setOnlineState(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return {
    ...state,
    isOnline: state.phase === 'online',
  };
}
