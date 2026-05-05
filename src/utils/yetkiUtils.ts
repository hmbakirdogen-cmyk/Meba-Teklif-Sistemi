/**
 * yetkiUtils.ts — Frontend rol kontrolü için merkezi yardımcı fonksiyonlar.
 *
 * Tüm `rol === 'X'` inline karşılaştırmaları bu fonksiyonlardan birine
 * çekilmelidir. Yeni rol eklenirse veya kapsamı değişirse tek noktadan
 * güncellenir. Backend muadili: `server/auth-routes.cjs`.
 */

import type { KullaniciRol } from '../types/kullanici';

/** Katman 1 — İş yetkileri: teklif/cari/personel yönetimi yapan roller. */
export const isYonetici = (rol?: KullaniciRol | null): boolean =>
  rol === 'super_admin' || rol === 'firma_admin';

/** Katman 2 — Sistem yetkileri: yalnızca sistem sahibi (Mehmet Bakırdöğen). */
export const isSuperAdmin = (rol?: KullaniciRol | null): boolean =>
  rol === 'super_admin';

/**
 * 3 firmanın tümüne erişim. Şu an isYonetici ile aynı; ileride
 * "tek-firma firma_admin" gibi bir kullanım çıkarsa burada ayrılacak.
 */
export const tumFirmalaraErisir = (rol?: KullaniciRol | null): boolean =>
  rol === 'super_admin' || rol === 'firma_admin';

/** Çalışan rolleri (yönetici olmayan). */
export const isCalisan = (rol?: KullaniciRol | null): boolean =>
  rol === 'engineer' || rol === 'sales';
