'use strict';

/**
 * import-mesa-cariler-ve-urunler.cjs — MESA için cari + ürün toplu import.
 *
 * Strateji: Sil-ve-yeniden-ekle (MEBA cari migration'ı ile aynı pattern).
 *   1. Mevcut firmaId='mesa' olan cariler ve urunler silinir
 *   2. mesa_cariler.xls (Sayfa1) → cari kayıtları
 *   3. mesa_ürünler.xls (Sayfa1) → urun kayıtları
 *   4. Kullanıcı eşleşen cariler atlanır (Ahmet Esmeray, Fatih Lazoğlu vb.)
 *
 * Kapsam (kullanıcı tercihi):
 *   - Cariler: SADECE firmaAdi, telefon, adres, yetkiliKisi
 *     (XLS'te sadece firma adı + şehir var → adres = şehir, telefon/yetkili boş)
 *   - Ürünler: SADECE urunKod + urunAdi (+ birim 'Adet' default)
 *     (Fiyat, stok, üretici kod, barkod vb. atlanır)
 *
 * Çalıştırma şartları:
 *   - Server kapalı olmalı (db.json.lock çakışmasını önlemek için)
 *   - mesa_cariler.xls ve mesa_ürünler.xls dosyaları data/mesa/ altında olmalı
 *
 * Backup: server/backups/db-pre-mesa-import-{ISO}.json
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '..', '..', '..');
const DB_PATH = path.join(ROOT, 'server', 'db.json');
const CARILER_XLS = path.join(ROOT, 'data', 'mesa', 'mesa_cariler.xls');
const URUNLER_XLS = path.join(ROOT, 'data', 'mesa', 'mesa_ürünler.xls');
const BACKUP_DIR = path.join(ROOT, 'server', 'backups');

const FIRMA_ID = 'mesa';

// ── Helpers ─────────────────────────────────────────────────────────────────
function norm(s) {
  return String(s || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

// ── Validation ──────────────────────────────────────────────────────────────
if (!fs.existsSync(CARILER_XLS)) {
  console.error('[mesa-import] HATA: mesa_cariler.xls bulunamadı:', CARILER_XLS);
  process.exit(1);
}
if (!fs.existsSync(URUNLER_XLS)) {
  console.error('[mesa-import] HATA: mesa_ürünler.xls bulunamadı:', URUNLER_XLS);
  process.exit(1);
}
if (!fs.existsSync(DB_PATH)) {
  console.error('[mesa-import] HATA: server/db.json bulunamadı:', DB_PATH);
  process.exit(1);
}

// ── 1. Backup ───────────────────────────────────────────────────────────────
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `db-pre-mesa-import-${ts}.json`);
fs.copyFileSync(DB_PATH, backupPath);
console.log(`[mesa-import] Backup: ${path.basename(backupPath)} (${(fs.statSync(backupPath).size / 1024).toFixed(0)} KB)`);

// ── 2. DB oku ───────────────────────────────────────────────────────────────
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
if (!Array.isArray(db.cariler)) db.cariler = [];
if (!Array.isArray(db.urunler)) db.urunler = [];

// ── 3. Kullanıcı normalize key set (cariler için filtre) ────────────────────
const kullaniciKeys = new Set();
for (const u of (db.kullanicilar || [])) {
  if (u.adSoyad) kullaniciKeys.add(norm(u.adSoyad));
  if (u.kullaniciAdi) kullaniciKeys.add(norm(u.kullaniciAdi));
}

// ── 4. CARİLER: Excel oku ───────────────────────────────────────────────────
const cariWb = xlsx.readFile(CARILER_XLS);
const cariRows = xlsx.utils.sheet_to_json(cariWb.Sheets['Sayfa1'], { header: 1, defval: '', blankrows: false });
// Header satırı kontrolü
const cariHeader = cariRows[0];
const expectedCariHeader = ['', 'Hiyerarşi Kodu', 'Açıklama', 'Şehir', 'Vergi Kimlik Numarası', 'T.C. Kimlik Numarası'];
for (let i = 0; i < expectedCariHeader.length; i++) {
  if (String(cariHeader[i] || '').trim() !== expectedCariHeader[i]) {
    console.error(`[mesa-import] HATA: Cari sütun ${i + 1} beklenmeyen: "${cariHeader[i]}" (beklenen: "${expectedCariHeader[i]}")`);
    process.exit(1);
  }
}
console.log(`[mesa-import] Cariler XLS: ${cariRows.length - 1} veri satırı`);

// Cari satırlarını dönüştür
const yeniCariler = [];
let cariBosUnvan = 0;
let cariKullaniciAtlandi = 0;
const atlananKullanicilar = [];
let cariSira = 1;

for (let i = 1; i < cariRows.length; i++) {
  const row = cariRows[i];
  const unvan = cleanText(row[2]); // Açıklama
  const sehir = cleanText(row[3]); // Şehir
  if (!unvan) { cariBosUnvan++; continue; }

  const k = norm(unvan);
  if (kullaniciKeys.has(k)) {
    cariKullaniciAtlandi++;
    if (atlananKullanicilar.length < 10) atlananKullanicilar.push(unvan);
    continue;
  }

  yeniCariler.push({
    id: 'c-mesa-' + String(cariSira).padStart(4, '0'),
    cariKod: 'MESA-' + String(cariSira).padStart(4, '0'),
    firmaAdi: unvan,
    yetkiliKisi: '',         // XLS'te yok
    telefon: '',             // XLS'te yok
    ePosta: '',
    adres: sehir,            // XLS'te sadece şehir var
    vergiDairesi: '',
    vergiNo: '',             // (kullanıcı kapsamı: sadece firmaAdi/telefon/adres/yetkiliKisi)
    firmaId: FIRMA_ID,
    guncellemeTarihi: new Date().toISOString(),
  });
  cariSira++;
}

// ── 5. ÜRÜNLER: Excel oku ───────────────────────────────────────────────────
const urunWb = xlsx.readFile(URUNLER_XLS);
const urunRows = xlsx.utils.sheet_to_json(urunWb.Sheets['Sayfa1'], { header: 1, defval: '', blankrows: false });
const urunHeader = urunRows[0];
// Sadece kritik 4 sütunu doğrula (Türü, Kodu, Açıklaması, Ana Birim)
const colIdx = {
  kod: urunHeader.findIndex((h) => String(h || '').trim() === 'Kodu'),
  aciklama: urunHeader.findIndex((h) => String(h || '').trim() === 'Açıklaması'),
  birim: urunHeader.findIndex((h) => String(h || '').trim() === 'Ana Birim'),
};
if (colIdx.kod < 0 || colIdx.aciklama < 0) {
  console.error('[mesa-import] HATA: Ürünler XLS\'inde Kodu veya Açıklaması sütunu bulunamadı.');
  console.error('Header:', JSON.stringify(urunHeader));
  process.exit(1);
}
console.log(`[mesa-import] Ürünler XLS: ${urunRows.length - 1} veri satırı (kod col=${colIdx.kod}, aciklama col=${colIdx.aciklama}, birim col=${colIdx.birim})`);

const yeniUrunler = [];
let urunBosKayit = 0;
let urunSira = 1;
const gorulenKodlar = new Set(); // duplicate kod filter

for (let i = 1; i < urunRows.length; i++) {
  const row = urunRows[i];
  const kod = cleanText(row[colIdx.kod]);
  const aciklama = cleanText(row[colIdx.aciklama]);
  const birim = colIdx.birim >= 0 ? cleanText(row[colIdx.birim]) : '';

  // Hem kod hem açıklama boşsa atla
  if (!kod && !aciklama) { urunBosKayit++; continue; }

  // Aynı kod birden fazla satırda gelirse ilkini al (duplicate filter)
  if (kod && gorulenKodlar.has(kod)) { urunBosKayit++; continue; }
  if (kod) gorulenKodlar.add(kod);

  yeniUrunler.push({
    id: 'u-mesa-' + String(urunSira).padStart(5, '0'),
    urunKod: kod || '',
    urunAdi: aciklama || kod || '',
    aciklama: '',
    kategori: '',
    birim: birim ? capitalize(birim) : 'Adet',
    varsayilanFiyat: 0,                              // KAPSAM: fiyat YOK
    firmaId: FIRMA_ID,
    guncellemeTarihi: new Date().toISOString(),
  });
  urunSira++;
}

function capitalize(s) {
  const v = s.toLocaleLowerCase('tr-TR').trim();
  if (!v) return 'Adet';
  return v[0].toLocaleUpperCase('tr-TR') + v.slice(1);
}

// ── 6. Mevcut MESA kayıtlarını çıkar ────────────────────────────────────────
const oncekiCariSayisi = db.cariler.filter((c) => c.firmaId === FIRMA_ID).length;
const oncekiUrunSayisi = db.urunler.filter((u) => u.firmaId === FIRMA_ID).length;

db.cariler = db.cariler.filter((c) => c.firmaId !== FIRMA_ID);
db.urunler = db.urunler.filter((u) => u.firmaId !== FIRMA_ID);

console.log(`[mesa-import] Silinen MESA cari: ${oncekiCariSayisi}, MESA ürün: ${oncekiUrunSayisi}`);

// ── 7. Yeni kayıtları append et ─────────────────────────────────────────────
db.cariler.push(...yeniCariler);
db.urunler.push(...yeniUrunler);

// ── 8. Yaz ──────────────────────────────────────────────────────────────────
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
const newSize = fs.statSync(DB_PATH).size;

// ── 9. Özet ─────────────────────────────────────────────────────────────────
const yeniCariSayisi = db.cariler.filter((c) => c.firmaId === FIRMA_ID).length;
const yeniUrunSayisi = db.urunler.filter((u) => u.firmaId === FIRMA_ID).length;

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  MESA IMPORT ÖZETİ');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Cariler XLS satır     : ${cariRows.length - 1}`);
console.log(`    - Boş ünvan         : ${cariBosUnvan}`);
console.log(`    - Kullanıcı atlandı : ${cariKullaniciAtlandi}`);
console.log(`    - Import edilen     : ${yeniCariler.length}`);
if (atlananKullanicilar.length > 0) {
  console.log('    - Atlanan kullanıcılar:');
  atlananKullanicilar.forEach((n) => console.log(`        • ${n}`));
}
console.log('');
console.log(`  Ürünler XLS satır     : ${urunRows.length - 1}`);
console.log(`    - Boş/duplicate     : ${urunBosKayit}`);
console.log(`    - Import edilen     : ${yeniUrunler.length}`);
console.log('');
console.log(`  Önceki MESA cari      : ${oncekiCariSayisi}    → Yeni: ${yeniCariSayisi}`);
console.log(`  Önceki MESA ürün      : ${oncekiUrunSayisi}    → Yeni: ${yeniUrunSayisi}`);
console.log('');
console.log(`  db.json toplam cari   : ${db.cariler.length}`);
console.log(`  db.json toplam ürün   : ${db.urunler.length}`);
console.log(`  db.json yeni boyut    : ${(newSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Backup                : ${path.basename(backupPath)}`);
console.log('═══════════════════════════════════════════════════════');
