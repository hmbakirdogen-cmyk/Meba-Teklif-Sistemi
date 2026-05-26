// ── RehberContext ───────────────────────────────────────────────────
// NE: Programın her sayfasından erişilebilen global rehber yöneticisi.
//     useSayfaRehberi hook'u çağrıldığında kendisini bu context'e register
//     eder; AppLayout'taki global 🎓 Rehberler butonu context'ten aktif
//     rehberi okur ve tıklayınca baslat() çağırır.
//
// NEDEN: Mehmet Bey 2026-05-26 direktifi — "rehberler butonu her sayfada
//        mevcut olsun". Önceki tasarımda 🎓 buton useSayfaRehberi hook'u
//        içinde render ediliyordu → SADECE hook çağrılan sayfalarda
//        (TeklifEditor) görünüyordu. Diğer sayfalarda buton yoktu. Global
//        FAB'a taşıyarak her sayfada görünür hale getirildi; pool'u olan
//        sayfada gerçek rehber çalışır, olmayan sayfada "yakında" diyaloğu.
//
// NASIL: 1) RehberProvider main.tsx'te en üstte sarmalar.
//        2) useSayfaRehberi mount'ta register({ baslat, sayfaAdi }) çağırır,
//           unmount'ta unregister() ile temizler.
//        3) AppLayout'taki <GlobalRehberFab/> context.aktif'i okur,
//           tıklanınca ya baslat() çağırır ya "yakında" mesajı gösterir.
//        4) Sayfa değiştikçe useSayfaRehberi unmount→remount sırasında
//           context state'i güncellenir → buton davranışı sayfaya göre.

/* eslint-disable react-refresh/only-export-components */
// Dosya hem RehberProvider component'ini hem context value'sunu (Provider'a
// bağlı tip ve createContext sonucu) export ediyor. Fast Refresh için ayrı
// dosyaya bölmek karmaşıklığı artırır — KullaniciContext pattern'i ile
// uyumlu olarak file-level disable. Hook (useRehberCtx) zaten ayrı dosyada
// (./useRehber.ts) — sadece context sabitinin co-existence'ı için disable.
import { createContext, useCallback, useState, type ReactNode } from 'react';

export interface RehberHandle {
  /** Rehber sequence'ini başlatır (ilk tip görünür hale gelir). */
  baslat: () => void;
  /** Hangi sayfa için kayıtlı — diyalog/log mesajlarında gösterilir. */
  sayfaAdi: string;
  /** Pool boş ise true → buton "yakında" gösterir, baslat() çağırmaz. */
  bos?: boolean;
  /**
   * Aktif rehberin TipSpotlight JSX'ini render eder. AppLayout'taki
   * GlobalTipSpotlight bunu çağırır → spotlight overlay her sayfada
   * AppLayout seviyesinden render edilir, sayfaların kendi return JSX'ine
   * dokunmaya gerek kalmaz. Faz 6 sırasında eklendi (8 sayfa rehber
   * entegrasyonunu basitleştirir).
   */
  renderTipSpotlight?: () => ReactNode;
}

export interface RehberCtxValue {
  aktif: RehberHandle | null;
  register: (h: RehberHandle) => void;
  unregister: () => void;
}

// Context export'u burada — useRehberCtx hook'u ayrı dosyada (useRehber.ts)
// çünkü react-refresh/only-export-components kuralı dosyada yalnız
// komponent export'una izin veriyor (Fast Refresh için). KullaniciContext
// pattern'i ile aynı yapı.
export const RehberContext = createContext<RehberCtxValue | null>(null);

export function RehberProvider({ children }: { children: ReactNode }) {
  const [aktif, setAktif] = useState<RehberHandle | null>(null);
  const register = useCallback((h: RehberHandle) => setAktif(h), []);
  const unregister = useCallback(() => setAktif(null), []);
  return (
    <RehberContext.Provider value={{ aktif, register, unregister }}>
      {children}
    </RehberContext.Provider>
  );
}
