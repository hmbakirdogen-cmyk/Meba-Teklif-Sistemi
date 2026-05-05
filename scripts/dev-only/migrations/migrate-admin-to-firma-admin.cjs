'use strict';

/**
 * migrate-admin-to-firma-admin.cjs
 *
 * One-time migration: 'admin' rolündeki 3 kullanıcıyı 'firma_admin'e dönüştürür.
 *
 * Yönetim Kurulu (3 ortak):
 *   - Ahmet Esmeray  → firmaId: 'elmos'
 *   - Fatih Lazoğlu  → firmaId: 'mesa'
 *   - Mehmet Maraş   → firmaId: 'mesa'
 *
 * Hepsine gosterilenFirmalar=["meba","mesa","elmos"] atanır
 * (3 firmaya da erişebilirler — yönetim kurulu kapsamı).
 *
 * Idempotent: rol==='admin' kullanıcı yoksa no-op.
 * Validation: bilinmeyen kullaniciAdi'sı admin varsa abort.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');

const TARGETS = {
  'Ahmet Esmeray': { firmaId: 'elmos' },
  'Fatih Lazoğlu': { firmaId: 'mesa'  },
  'Mehmet Maraş':  { firmaId: 'mesa'  },
};
const GOSTERILEN = ['meba', 'mesa', 'elmos'];

const raw = fs.readFileSync(DB_PATH, 'utf8');
const db = JSON.parse(raw);

const adminler = (db.kullanicilar || []).filter((u) => u.rol === 'admin');

if (adminler.length === 0) {
  console.log('[migration] zaten tamamlanmış (admin rolünde kullanıcı yok). No-op, exit.');
  process.exit(0);
}

// Validation: tüm admin kullanıcılar bilinmeli
const bilinmeyenler = adminler
  .filter((u) => !TARGETS[u.kullaniciAdi])
  .map((u) => u.kullaniciAdi);

if (bilinmeyenler.length > 0) {
  console.error('[migration] BEKLENMEYEN admin kullanıcı(lar):', bilinmeyenler);
  console.error('[migration] Migration ABORT — beklenen 3 kullanıcı: Ahmet Esmeray, Fatih Lazoğlu, Mehmet Maraş.');
  process.exit(1);
}

const eksikler = Object.keys(TARGETS).filter(
  (ad) => !adminler.some((u) => u.kullaniciAdi === ad),
);
if (eksikler.length > 0) {
  console.error('[migration] BEKLENEN ama BULUNAMAYAN admin kullanıcı(lar):', eksikler);
  console.error('[migration] DB durumu beklendiği gibi değil. ABORT.');
  process.exit(1);
}

// Apply
const ts = new Date().toISOString();
let migrateEdilen = 0;
for (const u of db.kullanicilar) {
  if (u.rol !== 'admin') continue;
  const t = TARGETS[u.kullaniciAdi];
  if (!t) continue;
  u.rol = 'firma_admin';
  u.firmaId = t.firmaId;
  u.gosterilenFirmalar = [...GOSTERILEN];
  u.guncellemeTarihi = ts;
  migrateEdilen++;
  console.log(`[migration] ${u.kullaniciAdi} → firma_admin (firmaId=${t.firmaId})`);
}

if (migrateEdilen === 0) {
  console.error('[migration] Hiçbir kullanıcı migrate edilmedi — beklenmeyen durum.');
  process.exit(1);
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
console.log(`[migration] OK — ${migrateEdilen} kullanıcı migrate edildi. db.json güncellendi.`);
