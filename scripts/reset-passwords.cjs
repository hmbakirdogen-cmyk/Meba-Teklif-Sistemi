/**
 * reset-passwords.cjs
 * ────────────────────────────────────────────────────────────────────
 * Tum kullanicilarin sifresini "0000" olarak resetler ve aktif tum
 * oturumlari (session token'larini) gecersiz kilar. Kullanici verileri
 * (id, ad, rol, firmaId, profilFotoUrl, history vs.) korunur — yalniz
 * sifreHash + mustChangePassword + db.oturumlar guncellenir.
 *
 * Calistirma:
 *   node scripts/reset-passwords.cjs
 *
 * Hash mekanizmasi: server/auth-helper.cjs'in `hashPassword` fonksiyonu
 * kullanilir (scrypt$<salt>$<hash>). Plaintext DB'ye yazilmaz.
 */
const fs = require('fs');
const path = require('path');
const { hashPassword } = require('../server/auth-helper.cjs');

const DEFAULT_PASSWORD = '0000';
const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('[reset-passwords] db.json bulunamadi:', DB_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(DB_PATH, 'utf8');
  // BOM koruma — readDB ile uyumlu
  const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const db = JSON.parse(clean);

  const users = Array.isArray(db.kullanicilar) ? db.kullanicilar : [];
  if (users.length === 0) {
    console.warn('[reset-passwords] kullanicilar listesi bos.');
  }

  let resetCount = 0;
  for (const u of users) {
    u.sifreHash = hashPassword(DEFAULT_PASSWORD);
    u.mustChangePassword = true;
    resetCount += 1;
  }

  // Tum aktif oturumlari gecersiz kil — herkes yeniden login olsun.
  const eskiOturum = Array.isArray(db.oturumlar) ? db.oturumlar.length : 0;
  db.oturumlar = [];

  // BOM'suz UTF-8 yaz (debugging.md'deki uyariya uygun)
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), { encoding: 'utf8' });

  console.log('[reset-passwords] tamamlandi.');
  console.log('  - resetlenen kullanici sayisi  :', resetCount);
  console.log('  - varsayilan sifre             :', DEFAULT_PASSWORD);
  console.log('  - mustChangePassword=true      : herkes icin set');
  console.log('  - gecersiz kilinan oturum sayisi:', eskiOturum);
}

main();
