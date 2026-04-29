import { createContext } from 'react';
import type { Firma } from '../types/firma';

export interface FirmaContextType {
  firmalar: Firma[];
  aktifFirma: Firma | null;
  yukleniyor: boolean;
  refresh: () => Promise<void>;
  setAktifFirma: (firmaId: string | null) => void;
  /** Aktif firma profilini gunceller (sadece firma_admin/super_admin). */
  firmaGuncelle: (id: string, patch: Partial<Firma>) => Promise<{ ok: true; firma: Firma } | { ok: false; error: string }>;
}

export const FirmaContext = createContext<FirmaContextType | null>(null);
