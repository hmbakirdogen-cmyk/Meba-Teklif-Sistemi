import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Kullanici } from '../types/kullanici';
import { KullaniciContext } from './kullaniciContextStore';

const STORAGE_KEY = 'meba_aktif_kullanici';

export function KullaniciProvider({ children }: { children: ReactNode }) {
  const [aktifKullanici, setAktifKullanici] = useState<Kullanici | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Kullanici) : null;
    } catch {
      return null;
    }
  });

  const girisYap = useCallback((kullanici: Kullanici) => {
    setAktifKullanici(kullanici);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kullanici));
  }, []);

  const cikisYap = useCallback(() => {
    setAktifKullanici(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <KullaniciContext.Provider value={{ aktifKullanici, girisYap, cikisYap }}>
      {children}
    </KullaniciContext.Provider>
  );
}
