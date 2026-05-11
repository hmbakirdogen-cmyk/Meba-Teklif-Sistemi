import { useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { message } from 'antd';
import type { Kullanici } from '../types/kullanici';
import { KullaniciContext } from './kullaniciContextStore';
import {
  api,
  setActiveFirmaId,
  SESSION_EXPIRED_EVENT,
} from '../services/apiClient';
import { authStorage, AUTH_STORAGE_KEYS, type SessionRestoreResult } from '../services/authStorage';
import { tumFirmalaraErisir } from '../utils/yetkiUtils';

/**
 * Senkron auth hydration. App root mount edilirken çağrılır; storage'dan
 * (önce localStorage, yoksa sessionStorage) auth verisini okur, expiry
 * geçmişse / bozuksa null döner. Login ekranı flash etmesin diye lazy
 * useState init içinde çalışır — bg validation /auth/me ile paralel olur.
 */
function hydrateAuth(): SessionRestoreResult {
  return authStorage.load();
}

export function KullaniciProvider({ children }: { children: ReactNode }) {
  // Senkron hydrate — flash yok. expired/invalid durumunda authStorage zaten
  // temizledi; aktifKullanici null kalır → GirisEkrani render olur.
  const [initialHydration] = useState<SessionRestoreResult>(() => hydrateAuth());
  const [aktifKullanici, setAktifKullanici] = useState<Kullanici | null>(() =>
    initialHydration.status === 'ok' ? initialHydration.data.user : null,
  );
  const [yukleniyor, setYukleniyor] = useState<boolean>(
    () => initialHydration.status === 'ok',
  );

  // Boot validation: hydrate başarılı ise /api/auth/me ile backend doğrula.
  // 401 → token sunucu tarafında prune edilmiş → temizle ve login'e döndür.
  // Diğer hatalar (network) sessizce yutulur; mevcut state korunur.
  useEffect(() => {
    if (initialHydration.status !== 'ok') return;
    let aktif = true;
    api.auth.me()
      .then((r) => {
        if (!aktif) return;
        setAktifKullanici(r.kullanici);
        authStorage.updateUser(r.kullanici);
        if (r.firma) {
          setActiveFirmaId(r.firma.id);
        }
      })
      .catch(() => {
        if (!aktif) return;
        console.warn('[Auth] Boot validation failed — clearing session');
        authStorage.clearAuth();
        setActiveFirmaId(null);
        setAktifKullanici(null);
      })
      .finally(() => {
        if (!aktif) return;
        setYukleniyor(false);
      });
    return () => { aktif = false; };
  }, [initialHydration]);

  const loginYap = useCallback(async (
    kullaniciAdi: string,
    sifre: string,
    secilenFirmaId?: string | null,
    beniHatirla = false,
  ) => {
    try {
      // Backend: secilenFirmaId ile login. Personel kendi firmasi disinda
      // bir firma sectiyse server 403 doner — defense in depth.
      // beniHatirla=true → backend session TTL'i 30 gun olarak ayarlar.
      const r = await api.auth.login(kullaniciAdi, sifre, secilenFirmaId ?? null, beniHatirla);
      // Frontend'de ek savunma katmani (eski client'larda backend cevabi
      // gelse bile yanlis firma'ya gecisi engelle). Kontrol mantığı backend
      // (auth-routes.cjs login) ile aynı tutuluyor.
      const k = r.kullanici;
      const erisilebilir = (() => {
        if (!secilenFirmaId) return true;
        if (k.rol === 'super_admin') return true;
        if (k.rol === 'firma_admin') {
          if (Array.isArray(k.gosterilenFirmalar) && k.gosterilenFirmalar.length > 0) {
            return k.gosterilenFirmalar.includes(secilenFirmaId);
          }
          return k.firmaId === secilenFirmaId;
        }
        return k.firmaId === secilenFirmaId;
      })();
      if (!erisilebilir) {
        try { await api.auth.logout(); } catch { /* network onemsiz */ }
        return {
          ok: false as const,
          error: 'Bu firmaya kayitli degilsiniz. Lutfen kendi firmanizi seciniz.',
        };
      }

      // Firma oncelik sirasi (yetki dogrulamasi yukarida tamamlandi):
      //   1) tum-firmalara erisen rollerde elle secilen firma
      //   2) Backend'in dondurdugu firma (kullanici.firmaId varsa)
      //   3) kullanici.firmaId fallback
      //   4) null (super_admin firma secmediyse)
      const cokFirma = tumFirmalaraErisir(k.rol);
      const firmaIdToActivate =
        (cokFirma ? secilenFirmaId : null) ??
        (r.firma ? r.firma.id : null) ??
        r.kullanici.firmaId ??
        null;

      // "Beni Hatırla" → remember=true ise localStorage, false ise sessionStorage.
      // Tek storage abstraction (authStorage) tek noktada karar verir.
      authStorage.save(
        {
          token: r.token,
          user: r.kullanici,
          firmaId: firmaIdToActivate,
          expiresAt: r.expiresAt,
        },
        beniHatirla,
      );
      // Remember tercihi & username (UX) — daima localStorage'da, ŞİFRE YOK.
      authStorage.setRememberFlag(beniHatirla);
      authStorage.setRememberUsername(beniHatirla ? kullaniciAdi : null);

      // FirmaContext'i custom event ile uyandırmak için apiClient wrapper'ını
      // çağırıyoruz (storage zaten yazıldı; bu sadece ACTIVE_FIRMA_CHANGE_EVENT
      // dispatch eder).
      setActiveFirmaId(firmaIdToActivate);
      setAktifKullanici(r.kullanici);
      return { ok: true as const, kullanici: r.kullanici };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : 'Giriş başarısız.' };
    }
  }, []);

  const cikisYap = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* network hatasi onemsiz */ }
    authStorage.clearAuth();
    setActiveFirmaId(null);
    setAktifKullanici(null);
    console.info('[Auth] Redirecting to login');
  }, []);

  // Runtime sırasında herhangi bir API çağrısı 401 dönerse (token süresi
  // dolmuş, server'da session prune edilmiş, vb.) merkezi olarak logout
  // yap ve kullanıcıyı bilgilendir. Boot doğrulaması (/auth/me) ve login
  // (/auth/login) hariç tutulur — apiClient.maybeDispatchSessionExpired()
  // bu filtrelemeyi yapar. Dedupe penceresi de orada (5sn).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onSessionExpired() {
      // Zaten logout olmuşsa veya hiç login olmamışsa sessizce yok say.
      if (!authStorage.getToken()) return;
      try {
        message.warning({
          content: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
          duration: 4,
        });
      } catch { /* message provider yoksa sessiz geç */ }
      void cikisYap();
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [cikisYap]);

  // Multi-tab logout senkronizasyonu: başka bir sekmede logout yapılırsa
  // (auth token storage'tan silinir → 'storage' event tetiklenir) bizde de
  // state'i sıfırla. 'storage' event yalnızca DİĞER sekmelere gider,
  // aynı sekmeye gelmez — same-tab logout zaten cikisYap içinde handle
  // ediliyor.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onStorage(e: StorageEvent) {
      if (e.key !== AUTH_STORAGE_KEYS.TOKEN) return;
      if (e.newValue === null) {
        // Token başka tab'da silindi → logout
        setActiveFirmaId(null);
        setAktifKullanici(null);
        console.info('[Auth] Logged out by another tab');
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Eski API geriye uyum — bazı flow'larda backend dolaşmadan direkt
  // kullanıcı set etmek gerekiyordu. Yeni mimaride loginYap kullanılması
  // önerilir; bu fonksiyon yalnız mevcut state'i günceller, token yazmaz.
  const girisYap = useCallback((kullanici: Kullanici) => {
    setAktifKullanici(kullanici);
    authStorage.updateUser(kullanici);
    if (kullanici.firmaId) setActiveFirmaId(kullanici.firmaId);
  }, []);

  const refreshKullanici = useCallback(async () => {
    try {
      const r = await api.auth.me();
      setAktifKullanici(r.kullanici);
      authStorage.updateUser(r.kullanici);
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
      authStorage.updateUser(r.kullanici);
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
