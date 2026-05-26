import { createContext } from 'react';
import type { Kullanici } from '../types/kullanici';

export interface KullaniciContextType {
  aktifKullanici: Kullanici | null;
  yukleniyor: boolean;
  /**
   * Login. `secilenFirmaId` → super_admin/admin gibi tum-firmalara-erisen
   * roller giris ekraninda manuel firma sectiklerinde gecirilir; oncelikli
   * olarak active firma olarak set edilir. Diger rollerde null gecilir.
   */
  loginYap: (
    kullaniciAdi: string,
    sifre: string,
    secilenFirmaId?: string | null,
    beniHatirla?: boolean,
  ) => Promise<{ ok: true; kullanici: Kullanici } | { ok: false; error: string }>;
  cikisYap: () => Promise<void>;
  /** Eski API geriye uyum — manuel kullanici set eder (login flow icinde kullanilmamali). */
  girisYap: (kullanici: Kullanici) => void;
  /** Server'dan en taze kullanici bilgisini cek (foto/unvan vs degisikliklerini yansit). */
  refreshKullanici: () => Promise<void>;
  /**
   * Sifre degistir. Basariliysa mustChangePassword=false olur.
   *
   * `opts.autoLogout` (default: true) — basarili sonrasinda kullanicinin
   * obfuscate kayitli sifresi temizlenir ve mevcut oturum kapatilir.
   * Boylece "degistirdim ama eski sifremle hala giriyorum" senaryosu olusmaz
   * (Faz 27 fix — Mehmet Bey 2026-05-26). Ilk Giris akisinda (IlkGirisModal)
   * kullanici zaten yeni sifresini belirliyor → logout false gecilir.
   */
  sifreDegistir: (
    mevcut: string,
    yeni: string,
    opts?: { autoLogout?: boolean },
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Profil foto base64 ile yukle. */
  profilFotoYukle: (base64: string) => Promise<{ ok: true; url: string } | { ok: false; error: string }>;
}

export const KullaniciContext = createContext<KullaniciContextType | null>(null);
