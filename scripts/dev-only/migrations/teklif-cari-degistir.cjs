'use strict';

/**
 * Mevcut tekliflerin cari snapshot'larını gerçek MEBA listesinden rastgele
 * seçilen carilerle değiştirir. Teklif'in firmaId, hazırlayan, satırlar gibi
 * diğer alanları aynen korunur — sadece t.cari swap edilir.
 *
 * Kullanım:  node scripts/teklif-cari-degistir.cjs
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// Tercih: --logolu modunda sadece logosu bulunmuş MEBA carileri kullan
const SADECE_LOGOLU = process.argv.includes('--logolu');

let havuz = db.cariler.filter((c) => c.firmaId === 'meba');
if (SADECE_LOGOLU) {
  havuz = havuz.filter((c) => c.logoSourceDomain || c.logoUrl);
  console.log(`Mod: --logolu (sadece logosu bulunmuş MEBA cariler)`);
}
if (havuz.length === 0) {
  console.error('Havuz boş, çıkılıyor.');
  process.exit(1);
}
console.log(`Havuz: ${havuz.length} cari`);
console.log(`Toplam teklif: ${db.teklifler.length}`);

let degistirilen = 0;
const kullanilanCariIdler = new Set();

for (const t of db.teklifler) {
  const yeniCari = pick(havuz);
  t.cari = {
    id: yeniCari.id,
    cariKod: yeniCari.cariKod || '',
    firmaAdi: yeniCari.firmaAdi || '',
    yetkiliKisi: yeniCari.yetkiliKisi || '',
    telefon: yeniCari.telefon || '',
    ePosta: yeniCari.ePosta || '',
    adres: yeniCari.adres || '',
    vergiDairesi: yeniCari.vergiDairesi || '',
    vergiNo: yeniCari.vergiNo || '',
  };
  // contactName de cari değişti, eski ad cariye uymuyor olabilir → yetkili adından üret
  if (yeniCari.yetkiliKisi) {
    const ilkAd = String(yeniCari.yetkiliKisi).split(/\s+/)[0] || '';
    t.contactName = ilkAd.toLocaleUpperCase('tr-TR');
  }
  t.guncellemeTarihi = new Date().toISOString();
  t.lastSyncedAt = new Date().toISOString();
  kullanilanCariIdler.add(yeniCari.id);
  degistirilen += 1;
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

console.log(`\n${degistirilen} teklif güncellendi.`);
console.log(`Kullanılan unik cari sayısı: ${kullanilanCariIdler.size}`);
