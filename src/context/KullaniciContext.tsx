import { useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Kullanici } from '../types/kullanici';
import { KullaniciContext } from './kullaniciContextStore';
import {
  api,
  setSessionToken,
  setActiveFirmaId,
  getStoredKullanici,
  setStoredKullanici,
  getSessionToken,
} from '../services/apiClient';

export function KullaniciProvider({ children }: { children: ReactNode }) {
  const [aktifKullanici, setAktifKullanici] = useState<Kullanici | null>(() => getStoredKullanici());
  const [yukleniyor, setYukleniyor] = useState<boolean>(() => {
    // Boot'ta token varsa /api/auth/me ile dogrula
    return !!getSessionToken();
  });

  // Boot'ta: token varsa server'dan me() cek, gecersizse temizle
  useEffect(() => {
    let aktif = true;
    const token = getSessionToken();
    if (!token) {
      return;
    }
    api.auth.me()
      .then((r) => {
        if (!aktif) return;
        setAktifKullanici(r.kullanici);
        setStoredKullanici(r.kullanici);
        if (r.firma) setActiveFirmaId(r.firma.id);
      })
      .catch(() => {
        if (!aktif) return;
        // Token gecersiz — local state'i temizle
        setSessionToken(null);
        setStoredKullanici(null);
        setActiveFirmaId(null);
        setAktifKullanici(null);
      })
      .finally(() => {
        if (!aktif) return;
        setYukleniyor(false);
      });
    return () => { aktif = false; };
  }, []);

  const loginYap = useCallback(async (
    kullaniciAdi: string,
    sifre: string,
    secilenFirmaId?: string | null,
  ) => {
    try {
      // Backend: secilenFirmaId ile login. Personel kendi firmasi disinda
      // bir firma sectiyse server 403 doner — defense in depth.
      const r = await api.auth.login(kullaniciAdi, sifre, secilenFirmaId ?? null);
      // Frontend'de ek savunma katmani (eski client'larda backend cevabi
      // gelse bile yanlis firma'ya gecisi engelle):
      const tumFirmalaraErisir =
        r.kullanici.rol === 'super_admin' || r.kullanici.rol === 'admin';
      if (!tumFirmalaraErisir && secilenFirmaId && secilenFirmaId !== r.kullanici.firmaId) {
        try { await api.auth.logout(); } catch { /* network onemsiz */ }
        return {
          ok: false as const,
          error: 'Bu firmaya kayitli degilsiniz. Lutfen kendi firmanizi seciniz.',
        };
      }

      setSessionToken(r.token);
      setStoredKullanici(r.kullanici);
      // Firma oncelik sirasi (yetki dogrulamasi yukarida tamamlandi):
      //   1) tum-firmalara erisen rollerde elle secilen firma
      //   2) Backend'in dondurdugu firma (kullanici.firmaId varsa)
      //   3) kullanici.firmaId fallback
      //   4) null (super_admin firma secmediyse)
      const firmaIdToActivate =
        (tumFirmalaraErisir ? secilenFirmaId : null) ??
        (r.firma ? r.firma.id : null) ??
        r.kullanici.firmaId ??
        null;
      setActiveFirmaId(firmaIdToActivate);
      setAktifKullanici(r.kullanici);
      return { ok: true as const, kullanici: r.kullanici };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : 'Giriş başarısız.' };
    }
  }, []);

  const cikisYap = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* network hatasi onemsiz */ }
    setSessionToken(null);
    setStoredKullanici(null);
    setActiveFirmaId(null);
    setAktifKullanici(null);
  }, []);

  // Eski API geriye uyum
  const girisYap = useCallback((kullanici: Kullanici) => {
    setAktifKullanici(kullanici);
    setStoredKullanici(kullanici);
    if (kullanici.firmaId) setActiveFirmaId(kullanici.firmaId);
  }, []);

  const refreshKullanici = useCallback(async () => {
    try {
      const r = await api.auth.me();
      setAktifKullanici(r.kullanici);
      setStoredKullanici(r.kullanici);
    } catch { /* sessizce ignore */ }
  }, []);

  const sifreDegistir = useCallback(async (mevcut: string, yeni: string) => {
    try {
      await api.auth.changePassword(mevcut, yeni);
      await refreshKullanici();
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : 'Şifre değiştirilemedi.' };
    }
  }, [refreshKullanici]);

  const profilFotoYukle = useCallback(async (base64: string) => {
    try {
      const r = await api.auth.uploadPhoto(base64);
      setAktifKullanici(r.kullanici);
      setStoredKullanici(r.kullanici);
      return { ok: true as const, url: r.profilFotoUrl };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : 'Foto yüklenemedi.' };
    }
  }, []);

  return (
    <KullaniciContext.Provider
      value={{
        aktifKullanici,
        yukleniyor,
        loginYap,
        cikisYap,
        girisYap,
        refreshKullanici,
        sifreDegistir,
        profilFotoYukle,
      }}
    >
      {children}
    </KullaniciContext.Provider>
  );
}
