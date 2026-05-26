// Context tüketici hook — Fast Refresh / react-refresh kuralı için
// RehberContext.tsx'den ayrı dosyada. Provider altında çağrılmazsa null
// döner; çağıran komponentlerin null kontrolü yapması beklenir
// (GlobalRehberFab fallback ile çalışır, useSayfaRehberi ise register'ı
// sessizce atlar).
import { useContext } from 'react';
import { RehberContext, type RehberCtxValue } from './RehberContext';

export function useRehberCtx(): RehberCtxValue | null {
  return useContext(RehberContext);
}
