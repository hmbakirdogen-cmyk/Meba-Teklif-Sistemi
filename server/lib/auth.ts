import crypto from 'node:crypto';

// LAN-içi basit şifre hash'i — mevcut local sistemden migrate edilen hash'lerle
// uyumlu kalmak için scrypt parametreleri korunur.
// Format: "scrypt$<saltHex>$<hashHex>"
const SCRYPT_KEYLEN = 32;
const SCRYPT_COST = 16384; // N
const SALT_BYTES = 16;

export function hashPassword(plain: string): string {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('hashPassword: bos sifre');
  }
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = crypto.scryptSync(plain, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const got = crypto.scryptSync(plain, salt, expected.length, { N: SCRYPT_COST });
  if (got.length !== expected.length) return false;
  return crypto.timingSafeEqual(got, expected);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ── Varsayılan ilk-giriş şifreleri (rol bazlı) ───────────────────
// Personel: "0000", Yönetici (super_admin / firma_admin): "1234".
// Hem ilk hesap oluşturulurken hem de admin tarafından şifre sıfırlanırken
// rol bilgisinden uygun değer seçilir. `mustChangePassword=true` ile
// kullanıcı ilk girişte zorunlu olarak kendi şifresini belirler.
export const VARSAYILAN_SIFRE_PERSONEL = '0000';
export const VARSAYILAN_SIFRE_YONETICI = '1234';
export const VARSAYILAN_SIFRELER = [VARSAYILAN_SIFRE_PERSONEL, VARSAYILAN_SIFRE_YONETICI] as const;

/** Backward-compat alias — yeni kod `getVarsayilanSifre(rol)` kullansın. */
export const VARSAYILAN_SIFRE = VARSAYILAN_SIFRE_PERSONEL;

/** Verilen role uygun varsayılan ilk-giriş şifresini döndürür. */
export function getVarsayilanSifre(rol: string | null | undefined): string {
  const r = String(rol || '');
  return r === 'super_admin' || r === 'firma_admin'
    ? VARSAYILAN_SIFRE_YONETICI
    : VARSAYILAN_SIFRE_PERSONEL;
}

/** Yeni şifre olarak varsayılan şifrelerden biri seçilmiş mi? */
export function isVarsayilanSifre(sifre: string): boolean {
  return VARSAYILAN_SIFRELER.includes(sifre as typeof VARSAYILAN_SIFRELER[number]);
}

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const SESSION_TTL_REMEMBERED_MS = 30 * 24 * 60 * 60 * 1000;
