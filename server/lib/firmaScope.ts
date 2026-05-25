import type { Kullanici, Rol } from '@prisma/client';

export type AuthKullanici = Pick<
  Kullanici,
  'id' | 'firmaId' | 'rol' | 'gosterilenFirmalar' | 'kullaniciAdi' | 'adSoyad' | 'aktifMi'
>;

/**
 * Çok-firma erişim kontrolü:
 *   - super_admin: tüm firmalar
 *   - firma_admin: gosterilenFirmalar TANIMLIYSA (explicit kisitlama) o liste;
 *                  bos/null ise TUM firmalara erisir (yonetim kurulu varsayilani)
 *   - engineer/sales: sadece kendi firmaId'si
 *
 * NOT: firma_admin fallback'i daha onceki versiyonda primary firmaId'ye
 * kisitliydi. Bu yuzden yeni atanan yoneticiler logoya basinca firma
 * degistiremiyor (UI izin veriyor ama backend reddediyor) → eski firmaya
 * geri donuyordu. Yeni davranis: firma_admin = tum firmalar (kisitlama
 * istenirse gosterilenFirmalar'a explicit liste yazilir).
 */
export function canAccessFirma(kullanici: AuthKullanici | null | undefined, firmaId: string): boolean {
  if (!kullanici) return false;
  if (kullanici.rol === 'super_admin') return true;
  if (kullanici.rol === 'firma_admin') {
    if (Array.isArray(kullanici.gosterilenFirmalar) && kullanici.gosterilenFirmalar.length > 0) {
      return kullanici.gosterilenFirmalar.includes(firmaId);
    }
    return true; // explicit kisitlama yoksa tum firmalara erisim
  }
  return kullanici.firmaId === firmaId;
}

/** Kullanıcının görebileceği firma id listesi (super_admin / firma_admin null = tümü). */
export function gorulebilecekFirmalar(kullanici: AuthKullanici): string[] | null {
  if (kullanici.rol === 'super_admin') return null;
  if (kullanici.rol === 'firma_admin') {
    if (Array.isArray(kullanici.gosterilenFirmalar) && kullanici.gosterilenFirmalar.length > 0) {
      return kullanici.gosterilenFirmalar;
    }
    return null; // explicit kisitlama yoksa tum firmalar
  }
  return kullanici.firmaId ? [kullanici.firmaId] : [];
}

export function isAdminRol(rol: Rol | string | null | undefined): boolean {
  return rol === 'super_admin' || rol === 'firma_admin';
}

export function isYonetici(rol: Rol | string | null | undefined): boolean {
  return rol === 'super_admin' || rol === 'firma_admin';
}
