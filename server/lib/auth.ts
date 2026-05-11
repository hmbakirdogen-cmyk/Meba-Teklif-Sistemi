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

export const VARSAYILAN_SIFRE = '0000';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const SESSION_TTL_REMEMBERED_MS = 30 * 24 * 60 * 60 * 1000;
