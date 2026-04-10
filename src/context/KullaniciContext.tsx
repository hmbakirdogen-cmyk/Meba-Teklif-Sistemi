import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Kullanici } from '../types/kullanici';

const STORAGE_KEY = 'meba_aktif_kullanici';

interface KullaniciContextType {
  aktifKullanici: Kullanici | null;
  girisYap: (kullanici: Kullanici) => void;
  cikisYap: () => void;
}

const KullaniciContext = createContext<KullaniciContextType | null>(null);

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

export function useKullanici(): KullaniciContextType {
  const ctx = useContext(KullaniciContext);
  if (!ctx) throw new Error('useKullanici KullaniciProvider içinde kullanılmalıdır.');
  return ctx;
}
