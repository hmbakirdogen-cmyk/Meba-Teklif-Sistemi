import { useContext } from 'react';
import { KullaniciContext } from './kullaniciContextStore';

export function useKullanici() {
  const ctx = useContext(KullaniciContext);
  if (!ctx) throw new Error('useKullanici KullaniciProvider içinde kullanılmalıdır.');
  return ctx;
}
