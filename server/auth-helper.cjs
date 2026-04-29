'use strict';

const crypto = require('crypto');

// LAN-içi basit şifre hash'i. scrypt (Node yerli) — bcrypt'e bağımlılık yok.
// Format: "scrypt$<saltHex>$<hashHex>"
const SCRYPT_KEYLEN = 32;
const SCRYPT_COST = 16384; // N — yeterli, hızlı
const SALT_BYTES = 16;

function hashPassword(plain) {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('hashPassword: bos sifre');
  }
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = crypto.scryptSync(plain, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const got = crypto.scryptSync(plain, salt, expected.length, { N: SCRYPT_COST });
  if (got.length !== expected.length) return false;
  return crypto.timingSafeEqual(got, expected);
}

// Basit session token: 32 byte rastgele hex
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { hashPassword, verifyPassword, generateSessionToken };
