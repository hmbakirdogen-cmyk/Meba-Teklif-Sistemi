/**
 * Kullanıcı rolleri ve yetki kapsamları:
 *
 * - **super_admin** : Sistem sahibi (Mehmet Bakırdöğen). Tüm firmalara erişir,
 *                     firma profili düzenler, kullanıcı oluşturur.
 *                     `firmaId` null olabilir (firma kapsamı dışı).
 * - **firma_admin** : Yönetim kurulu üyesi (3 ortak: MEBA + MESA + ELMOS).
 *                     `gosterilenFirmalar` listesindeki firmalara erişir
 *                     (yoksa primary `firmaId` fallback). Personel yönetir.
 * - **engineer**    : Teklif hazırlar, kendi tekliflerini görür (private),
 *                     ekip teklifleri (team) için okuma yetkisi var.
 * - **sales**       : engineer ile aynı kapsam — satış sorumlusu.
 *
 * `admin` rolü kaldırıldı (2026-05-05) — yönetim kurulu üyeleri firma_admin'e
 * migrate edildi, gosterilenFirmalar=["meba","mesa","elmos"] ile 3 firmaya
 * erişimleri sürdürüldü.
 *
 * Yetki kontrol noktaları: backend `auth-routes.cjs` requireAdmin /
 * requireSuperAdmin / canAccessFirma; frontend `src/utils/yetkiUtils.ts`.
 */
export type KullaniciRol = 'super_admin' | 'firma_admin' | 'engineer' | 'sales';

export interface Kullanici {
  id: string;
  kullaniciAdi?: string;
  adSoyad: string;
  rol: KullaniciRol;
  unvan: string;
  initials: string;
  aktifMi: boolean;
  firmaId?: string | null;
  gosterilenFirmalar?: string[];
  profilFotoUrl?: string;
  telefon?: string;
  dahili?: string;
  /**
   * Hitabet cinsiyeti — Mehmet Bey 2026-05-26 direktifi: "Herkese Bey
   * veya Hanım hitabeti her yerde kullanılmalı". kullaniciHitap util
   * bu alana göre "Bey" veya "Hanım" suffix'i koyar. Default 'Bey'
   * (MEBA personeli büyük çoğunlukla erkek; kadın personel profil
   * düzenleme modalından 'Hanım' seçer). Geri uyumlu opsiyonel.
   */
  unvanCinsiyet?: 'Bey' | 'Hanım';
  mustChangePassword?: boolean;
  olusturmaTarihi?: string;
  olusturanKullaniciId?: string;
  silmeTarihi?: string;
  sifreDegisikligi?: string;
  profilFotoYuklemeTarihi?: string;
  // ── SMTP gönderim alanları (server sanitizeUser ile dönülür) ──────
  // Şifre HİÇ frontend'e gelmez; sadece "tanımlı mı?" flag'i (smtpPasswordSet).
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean | null;
  smtpUser?: string | null;
  smtpFromName?: string | null;
  smtpFromAddress?: string | null;
  smtpPasswordSet?: boolean;
}

export const ROL_ETIKET: Record<KullaniciRol, string> = {
  super_admin: 'Süper Yönetici',
  firma_admin: 'Firma Yöneticisi',
  engineer: 'Mühendis',
  sales: 'Satış Sorumlusu',
};

// Eski kod referansı: KULLANICILAR sabit dizisi artık kullanılmıyor; backend'den
// /api/kullanicilar uzerinden gelir. Geriye uyum icin bos array export ediyoruz.
export const KULLANICILAR: Kullanici[] = [];
