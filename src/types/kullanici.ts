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
