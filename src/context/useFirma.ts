import { useContext } from 'react';
import { FirmaContext } from './firmaContextStore';

export function useFirma() {
  const ctx = useContext(FirmaContext);
  if (!ctx) throw new Error('useFirma FirmaProvider içinde kullanılmalıdır.');
  return ctx;
}
