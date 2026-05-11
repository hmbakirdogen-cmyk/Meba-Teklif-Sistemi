import type { Kullanici, Rol } from '@prisma/client';

export type AuthKullanici = Pick<
  Kullanici,
  'id' | 'firmaId' | 'rol' | 'gosterilenFirmalar' | 'kullaniciAdi' | 'adSoyad' | 'aktifMi'
>;

/**
 * Çok-firma erişim kontrolü:
 *   - super_admin: tüm firmalar
 *   - firma_admin: gosterilenFirmalar tanımlıysa o liste; değilse primary firmaId
 *   - engineer/sales: sadece kendi firmaId'si
 */
export function canAccessFirma(kullanici: AuthKullanici | null | undefined, firmaId: string): boolean {
  if (!kullanici) return false;
  if (kullanici.rol === 'super_admin') return true;
  if (kullanici.rol === 'firma_admin') {
    if (Array.isArray(kullanici.gosterilenFirmalar) && kullanici.gosterilenFirmalar.length > 0) {
      return kullanici.gosterilenFirmalar.includes(firmaId);
    }
    return kullanici.firmaId === firmaId;
  }
  return kullanici.firmaId === firmaId;
}

/** Kullanıcının görebileceği firma id listesi (super_admin null döner → tümü). */
export function gorulebilecekFirmalar(kullanici: AuthKullanici): string[] | null {
  if (kullanici.rol === 'super_admin') return null;
  if (kullanici.rol === 'firma_admin') {
    if (Array.isArray(kullanici.gosterilenFirmalar) && kullanici.gosterilenFirmalar.length > 0) {
      return kullanici.gosterilenFirmalar;
    }
    return kullanici.firmaId ? [kullanici.firmaId] : [];
  }
  return kullanici.firmaId ? [kullanici.firmaId] : [];
}

export function isAdminRol(rol: Rol | string | null | undefined): boolean {
  return rol === 'super_admin' || rol === 'firma_admin';
}

export function isYonetici(rol: Rol | string | null | undefined): boolean {
  return rol === 'super_admin' || rol === 'firma_admin';
}
