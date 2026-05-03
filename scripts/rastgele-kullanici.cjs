'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword } = require('../server/auth-helper.cjs');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');

const ADLAR = [
  'Burak', 'Selin', 'Emre', 'Zeynep', 'Cem', 'Ayşe', 'Murat', 'Defne', 'Onur', 'Ela',
  'Tolga', 'Nazlı', 'Kerem', 'İrem', 'Serkan', 'Pınar', 'Hakan', 'Sevgi', 'Can', 'Berk',
  'Damla', 'Eren', 'Gizem', 'Halil', 'Kaan', 'Lale', 'Mert', 'Nehir', 'Okan', 'Rüzgar',
  'Sinan', 'Tuğçe', 'Umut', 'Volkan', 'Yiğit', 'Aslı', 'Barış', 'Ceren',
];
const SOYADLAR = [
  'Yıldız', 'Kara', 'Demir', 'Aslan', 'Şahin', 'Kaya', 'Çelik', 'Doğan', 'Aydın', 'Polat',
  'Korkmaz', 'Erdem', 'Tekin', 'Bayrak', 'Akın', 'Öztürk', 'Aksoy', 'Yılmaz', 'Güneş',
  'Arslan', 'Çetin', 'Tunç', 'Kurt', 'Karaca', 'Bilgin',
];
const UNVANLAR = ['Satış Mühendisi', 'Proje Mühendisi', 'Saha Mühendisi', 'Satış Uzmanı', 'Teklif Uzmanı'];
const ROLLER = ['engineer', 'sales'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function uretInitials(adSoyad) {
  return String(adSoyad).trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((s) => s.charAt(0).toLocaleUpperCase('tr-TR')).join('');
}

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
if (!Array.isArray(db.kullanicilar)) db.kullanicilar = [];
if (!Array.isArray(db.firmalar) || db.firmalar.length === 0) {
  console.error('Firma listesi boş, çıkılıyor.');
  process.exit(1);
}

// CLI: node scripts/rastgele-kullanici.cjs [adet]
const ADET = Math.max(1, parseInt(process.argv[2] || '1', 10));

if (!Array.isArray(db.auditLog)) db.auditLog = [];

const eklenenler = [];
for (let i = 0; i < ADET; i += 1) {
  const ad      = pick(ADLAR);
  const soyad   = pick(SOYADLAR);
  const adSoyad = `${ad} ${soyad}`;
  // Round-robin firma dağılımı (eşit dağıt)
  const firma   = db.firmalar[i % db.firmalar.length];
  const rol     = pick(ROLLER);
  const unvan   = pick(UNVANLAR);

  // Kullanici adi cakismayacak sekilde uret: ilk-ad + 3 hane
  let kullaniciAdi;
  const lower = ad.toLocaleLowerCase('tr-TR');
  do {
    const ek = String(Math.floor(Math.random() * 900) + 100);
    kullaniciAdi = `${lower}${ek}`;
  } while (db.kullanicilar.some((u) => String(u.kullaniciAdi).toLocaleLowerCase('tr-TR') === kullaniciAdi));

  const yeni = {
    id: 'u-' + crypto.randomBytes(4).toString('hex'),
    kullaniciAdi,
    sifreHash: hashPassword('123456'),
    adSoyad,
    unvan,
    initials: uretInitials(adSoyad),
    rol,
    firmaId: firma.id,
    aktifMi: true,
    mustChangePassword: true,
    olusturmaTarihi: new Date().toISOString(),
    olusturanKullaniciId: 'script:rastgele-kullanici',
  };

  db.kullanicilar.push(yeni);
  db.auditLog.push({
    zaman: new Date().toISOString(),
    eylem: 'kullanici_olusturuldu',
    kullaniciId: null,
    kullaniciAdi: 'script:rastgele-kullanici',
    firmaId: null,
    detay: { yeniKullaniciId: yeni.id, firmaId: firma.id, rol },
  });
  eklenenler.push({ yeni, firma });
}

if (db.auditLog.length > 5000) db.auditLog = db.auditLog.slice(-5000);

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

console.log(`${eklenenler.length} kullanıcı eklendi (varsayılan şifre: 123456):\n`);
const sayim = {};
for (const { yeni, firma } of eklenenler) {
  sayim[firma.id] = (sayim[firma.id] || 0) + 1;
  console.log(`  ${yeni.kullaniciAdi.padEnd(14)} ${yeni.adSoyad.padEnd(22)} ${yeni.rol.padEnd(9)} ${firma.ad}`);
}
console.log('\nFirma dağılımı:');
for (const f of db.firmalar) {
  console.log(`  ${f.ad}: ${sayim[f.id] || 0}`);
}
