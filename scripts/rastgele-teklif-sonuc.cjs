'use strict';

/**
 * Mevcut gönderildi/onaylandı tekliflerin bir kısmına rastgele iş sonucu seed eder.
 * Yönetici dashboard'unun ve sonuç rozetlerinin görsel doğrulanması için.
 *
 * Dağılım:
 *   - %35 kazanildi
 *   - %30 kaybedildi (sebep + rakip seç)
 *   - %10 iptal
 *   - %25 beklemede (boş bırak)
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');

const SEBEPLER = ['fiyat', 'rakip', 'zaman', 'ihtiyac_yok', 'diger'];
const RAKIP_FIRMALAR = [
  'Ar Otomasyon', 'Pnomatik A.Ş.', 'Endüstri Sistemleri', 'Mertaş Mekanik',
  'Doğa Hidrolik', 'Bilgi Teknik', 'Cesur Sanayi', 'Atak Pnömatik',
];

function pickWeighted(arr, weights) {
  const t = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * t;
  for (let i = 0; i < arr.length; i += 1) { r -= weights[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const sayim = { kazanildi: 0, kaybedildi: 0, iptal: 0, beklemede: 0, atlandi: 0 };

// Sadece gönderildi veya onaylandı durumdaki tekliflere sonuç ata
for (const t of db.teklifler) {
  if (t.sonuc) { sayim.atlandi += 1; continue; }
  if (t.durum !== 'gonderildi' && t.durum !== 'onaylandi') {
    sayim.atlandi += 1;
    continue;
  }
  const sonuc = pickWeighted(['kazanildi', 'kaybedildi', 'iptal', 'beklemede'], [35, 30, 10, 25]);
  if (sonuc === 'beklemede') {
    sayim.beklemede += 1;
    continue;
  }
  t.sonuc = sonuc;
  t.sonucTarihi = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 3600 * 1000)).toISOString();
  t.sonucGirenKullaniciId = t.hazirlayanKullaniciId;
  if (sonuc === 'kaybedildi') {
    t.kayipSebebi = pick(SEBEPLER);
    if (t.kayipSebebi === 'rakip') {
      t.rakipFirma = pick(RAKIP_FIRMALAR);
    }
  }
  t.guncellemeTarihi = new Date().toISOString();
  t.lastSyncedAt = new Date().toISOString();
  sayim[sonuc] += 1;
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

console.log('Sonuç seed dağılımı:');
console.log(`  Kazanıldı   : ${sayim.kazanildi}`);
console.log(`  Kaybedildi  : ${sayim.kaybedildi}`);
console.log(`  İptal       : ${sayim.iptal}`);
console.log(`  Beklemede   : ${sayim.beklemede} (sonuç boş bırakıldı, "Sonuç gir" rozeti çıkar)`);
console.log(`  Atlandı     : ${sayim.atlandi} (taslak/hazır veya zaten sonuçlu)`);
