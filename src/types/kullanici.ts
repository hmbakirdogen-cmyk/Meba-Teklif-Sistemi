/**
 * Kullanıcı rolleri ve yetki kapsamları:
 *
 * - **super_admin** : Tüm firmalara erişir + sistem ayarlarını yönetebilir.
 *                     `firmaId` null olabilir (firma kapsamı dışı).
 * - **firma_admin** : Sadece kendi firmasının yöneticisi. `firmaId` zorunlu.
 *                     Firma kullanıcılarını yönetir, raporlara erişir.
 * - **admin**       : Tüm firmalara veri erişimi var (raporlama amaçlı yönetici)
 *                     ama sistem ayarlarına dokunmaz. `firmaId` null olabilir.
 *                     Genel "Yönetici" yetkili — super_admin'den daha kısıtlı.
 * - **engineer**    : Teklif hazırlar, kendi tekliflerini görür (private),
 *                     ekip teklifleri (team) için okuma yetkisi var.
 * - **sales**       : engineer ile aynı kapsam — satış sorumlusu.
 *
 * Yetki kontrol noktaları: `auth-routes.cjs` requireAdmin/requireSuperAdmin,
 * `syncEngine.ts` applyVisibilityFilter, `teklifService.ts` görünürlük filtresi.
 */
export type KullaniciRol = 'super_admin' | 'firma_admin' | 'engineer' | 'sales' | 'admin';

export interface Kullanici {
  id: string;
  kullaniciAdi?: string;
  adSoyad: string;
  rol: KullaniciRol;
  unvan: string;
  initials: string;
  aktifMi: boolean;
  firmaId?: string | null;
  profilFotoUrl?: string;
  mustChangePassword?: boolean;
  olusturmaTarihi?: string;
  olusturanKullaniciId?: string;
  silmeTarihi?: string;
  sifreDegisikligi?: string;
  profilFotoYuklemeTarihi?: string;
}

export const ROL_ETIKET: Record<KullaniciRol, string> = {
  super_admin: 'Süper Yönetici',
  firma_admin: 'Firma Yöneticisi',
  admin: 'Yönetici',
  engineer: 'Mühendis',
  sales: 'Satış Sorumlusu',
};

// Eski kod referansı: KULLANICILAR sabit dizisi artık kullanılmıyor; backend'den
// /api/kullanicilar uzerinden gelir. Geriye uyum icin bos array export ediyoruz.
export const KULLANICILAR: Kullanici[] = [];
