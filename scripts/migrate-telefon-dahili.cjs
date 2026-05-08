/**
 * Tek seferlik DB migrasyonu: tum kullanicilara telefon/dahili alanlarini
 * varsayilan deger ('') ile ekler ve belirli kullanicilarin telefonunu
 * "0XXX XXX XX XX" formatinda set eder.
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_PATH = `${DB_PATH}.bak.${stamp}`;
fs.copyFileSync(DB_PATH, BACKUP_PATH);
console.log(`Yedek: ${BACKUP_PATH}`);

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// AdSoyad bazlı set (case-insensitive, trimmed). firmaId opsiyonel disambiguation.
// Telefonlar "0XXX XXX XX XX" — başında 0, boşluk, sonra 3-3-2-2 grupları.
const TELEFON_GUNCELLE = [
  { adSoyad: 'Yusuf BOSTANCI',     telefon: '0542 622 34 27' },
  { adSoyad: 'Furkan ÖZTÜRK',      telefon: '0551 630 59 02' },
  { adSoyad: 'Adem KILINÇ',        telefon: '0538 509 37 19' },
  { adSoyad: 'Ahmet YÜCE',         telefon: '0531 706 51 11', firmaId: 'elmos' },
  { adSoyad: 'Serhat TUZCU',       telefon: '0549 321 30 52', firmaId: 'elmos' },
  { adSoyad: 'Murat ŞAHBAZ',       telefon: '0549 321 30 51', firmaId: 'elmos' },
  { adSoyad: 'Mustafa KOLUKISA',   telefon: '0553 430 99 95', firmaId: 'elmos' },
];

function norm(s) {
  return String(s || '').trim().toLocaleUpperCase('tr-TR');
}

let varsayilanEklendi = 0;
let telefonGuncellendi = 0;
const eslesmeyen = TELEFON_GUNCELLE.map((t) => t.adSoyad);

for (const k of (db.kullanicilar || [])) {
  if (k.telefon === undefined) { k.telefon = ''; varsayilanEklendi++; }
  if (k.dahili === undefined)  { k.dahili  = ''; }

  const hedef = TELEFON_GUNCELLE.find((t) =>
    norm(t.adSoyad) === norm(k.adSoyad) &&
    (t.firmaId ? t.firmaId === k.firmaId : true)
  );
  if (hedef) {
    k.telefon = hedef.telefon;
    telefonGuncellendi++;
    const idx = eslesmeyen.indexOf(hedef.adSoyad);
    if (idx >= 0) eslesmeyen.splice(idx, 1);
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

console.log('\n=== Migrasyon tamamlandi ===');
console.log(`Toplam kullanici          : ${(db.kullanicilar || []).length}`);
console.log(`telefon='' eklendi        : ${varsayilanEklendi}`);
console.log(`Telefon set edildi        : ${telefonGuncellendi}`);
if (eslesmeyen.length) {
  console.log(`UYARI: Eslesmeyen kayitlar: ${eslesmeyen.join(', ')}`);
} else {
  console.log('Tum hedef kullanicilar bulundu.');
}
