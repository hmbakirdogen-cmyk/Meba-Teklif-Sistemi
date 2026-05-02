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
  ) => Promise<{ ok: true; kullanici: Kullanici } | { ok: false; error: string }>;
  cikisYap: () => Promise<void>;
  /** Eski API geriye uyum — manuel kullanici set eder (login flow icinde kullanilmamali). */
  girisYap: (kullanici: Kullanici) => void;
  /** Server'dan en taze kullanici bilgisini cek (foto/unvan vs degisikliklerini yansit). */
  refreshKullanici: () => Promise<void>;
  /** Sifre degistir. Basariliysa mustChangePassword=false olur. */
  sifreDegistir: (mevcut: string, yeni: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Profil foto base64 ile yukle. */
  profilFotoYukle: (base64: string) => Promise<{ ok: true; url: string } | { ok: false; error: string }>;
}

export const KullaniciContext = createContext<KullaniciContextType | null>(null);
