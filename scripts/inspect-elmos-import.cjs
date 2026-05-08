const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');
const XLSX_PATH = path.join(__dirname, '..', 'data', 'elmos', 'ELMOS_cariler.XLSX');

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
console.log('=== DB top-level keys ===');
console.log(Object.keys(db));

console.log('\n=== Existing counts ===');
console.log('cariler total:', (db.cariler || []).length);
console.log('cariler ELMOS:', (db.cariler || []).filter(c => c.firmaId === 'elmos').length);
console.log('urunler total:', (db.urunler || []).length);
console.log('urunler ELMOS:', (db.urunler || []).filter(u => u.firmaId === 'elmos').length);
console.log('kullanicilar total:', (db.kullanicilar || []).length);
console.log('kullanicilar ELMOS:', (db.kullanicilar || []).filter(k => k.firmaId === 'elmos').length);

console.log('\n=== Sample cari shape ===');
const sampleCari = (db.cariler || [])[0];
if (sampleCari) console.log(JSON.stringify(sampleCari, null, 2));

console.log('\n=== Sample urun shape ===');
const sampleUrun = (db.urunler || [])[0];
if (sampleUrun) console.log(JSON.stringify(sampleUrun, null, 2));

console.log('\n=== ELMOS kullanicilar (existing) ===');
(db.kullanicilar || []).filter(k => k.firmaId === 'elmos').forEach(k => {
  console.log(JSON.stringify({
    id: k.id, kullaniciAdi: k.kullaniciAdi, adSoyad: k.adSoyad,
    rol: k.rol, unvan: k.unvan, initials: k.initials,
    sifreHashLen: (k.sifreHash || '').length,
    keys: Object.keys(k),
  }, null, 2));
});

console.log('\n=== Sample kullanici keys (any firma) ===');
const anyUser = (db.kullanicilar || [])[0];
if (anyUser) console.log('keys:', Object.keys(anyUser));

console.log('\n=== Excel file inspection ===');
const wb = XLSX.readFile(XLSX_PATH);
console.log('Sheet names:', wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  console.log(`\n--- Sheet: ${sheetName} ---`);
  console.log(`  Total rows: ${rows.length}`);
  console.log(`  Header row (row 0):`, rows[0]);
  if (rows.length > 1) console.log(`  Sample row 1:`, rows[1]);
  if (rows.length > 2) console.log(`  Sample row 2:`, rows[2]);
  if (rows.length > 3) console.log(`  Sample row 3:`, rows[3]);
}
