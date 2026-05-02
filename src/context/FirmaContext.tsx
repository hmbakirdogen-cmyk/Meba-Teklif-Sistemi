import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Firma } from '../types/firma';
import { FirmaContext } from './firmaContextStore';
import {
  api, getActiveFirmaId, setActiveFirmaId, ACTIVE_FIRMA_CHANGE_EVENT,
} from '../services/apiClient';

export function FirmaProvider({ children }: { children: ReactNode }) {
  const [firmalar, setFirmalar] = useState<Firma[]>([]);
  const [aktifFirmaId, setAktifFirmaIdState] = useState<string | null>(() => getActiveFirmaId());
  const [yukleniyor, setYukleniyor] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    try {
      const list = await api.firmalar.list();
      setFirmalar(list);
    } catch {
      // Public endpoint, hata varsa sessiz fallback
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // localStorage degisiminde state senkronize et:
  //   - Custom event: ayni tab icinde, login/cikis sonrasi anlik
  //   - storage event: diger tab'lerden gelen degisikliklere reaktif
  //   - Polling: backup (event mekanizmasi atlanan kenar durumlar icin)
  useEffect(() => {
    function syncFromStorage() {
      const stored = getActiveFirmaId();
      setAktifFirmaIdState((prev) => (prev !== stored ? stored : prev));
    }
    window.addEventListener(ACTIVE_FIRMA_CHANGE_EVENT, syncFromStorage);
    window.addEventListener('storage', syncFromStorage);
    const id = window.setInterval(syncFromStorage, 5000);
    return () => {
      window.removeEventListener(ACTIVE_FIRMA_CHANGE_EVENT, syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
      window.clearInterval(id);
    };
  }, []);

  const setAktifFirma = useCallback((firmaId: string | null) => {
    setActiveFirmaId(firmaId);
    setAktifFirmaIdState(firmaId);
  }, []);

  const firmaGuncelle = useCallback(async (id: string, patch: Partial<Firma>) => {
    try {
      const updated = await api.firmalar.update(id, patch);
      setFirmalar((prev) => prev.map((f) => (f.id === id ? updated : f)));
      return { ok: true as const, firma: updated };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : 'Firma guncellenemedi.' };
    }
  }, []);

  const aktifFirma = useMemo<Firma | null>(
    () => (aktifFirmaId ? firmalar.find((f) => f.id === aktifFirmaId) ?? null : null),
    [aktifFirmaId, firmalar]
  );

  return (
    <FirmaContext.Provider
      value={{ firmalar, aktifFirma, yukleniyor, refresh, setAktifFirma, firmaGuncelle }}
    >
      {children}
    </FirmaContext.Provider>
  );
}
