import { createContext } from 'react';
import type { Kullanici } from '../types/kullanici';

export interface KullaniciContextType {
  aktifKullanici: Kullanici | null;
  girisYap: (kullanici: Kullanici) => void;
  cikisYap: () => void;
}

export const KullaniciContext = createContext<KullaniciContextType | null>(null);
