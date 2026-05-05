'use strict';

/**
 * import-meba-cariler.cjs — MEBA cariler XLSX'ten yeniden import.
 *
 * Strateji: Sil-ve-yeniden-ekle.
 *   1. Mevcut firmaId="meba" carileri TÜMÜYLE sil
 *   2. meba_cariler.XLSX'teki 1834 kayıttan kullanıcı eşleşenleri (6 ad) ATLAR
 *   3. Kalan ~1828 kaydı c-0001..c-NNNN id'leri ile ekle
 *   4. Logo, vergi, ePosta alanları boş kalır (XLSX bu raporda yok)
 *   5. MESA/ELMOS cariler dokunulmaz
 *
 * Çalıştırma şartları:
 *   - Server kapalı olmalı (db.json.lock çakışmasını önlemek için)
 *   - meba_cariler.XLSX projenin kökünde olmalı
 *
 * Kullanım:
 *   node scripts/dev-only/migrations/import-meba-cariler.cjs
 *
 * Backup:
 *   server/backups/db-pre-cari-import-{ISO timestamp}.json
 */

const fs = require('fs');
const path = require('path');

// xlsx package — proje root'unda dependency olarak var
const xlsx = require('xlsx');

const ROOT = path.join(__dirname, '..', '..', '..');
const DB_PATH = path.join(ROOT, 'server', 'db.json');
const XLSX_PATH = path.join(ROOT, 'meba_cariler.XLSX');
const BACKUP_DIR = path.join(ROOT, 'server', 'backups');

// ── Helpers ─────────────────────────────────────────────────────────────────
function norm(s) {
  return String(s || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function birlestir(alanKodu, telefon) {
  const a = String(alanKodu || '').trim();
  const t = String(telefon || '').trim();
  if (!t) return '';
  return a ? `${a} ${t}` : t;
}

function adresOlustur(adres1, adres2, sehir) {
  let adres = String(adres1 || '').trim();
  const a2 = String(adres2 || '').trim();
  if (a2) adres = adres ? `${adres} ${a2}` : a2;
  const s = String(sehir || '').trim();
  if (s) adres = adres ? `${adres}, ${s}` : s;
  return adres;
}

// ── Validation ──────────────────────────────────────────────────────────────
if (!fs.existsSync(XLSX_PATH)) {
  console.error('[migration] HATA: meba_cariler.XLSX projenin kökünde bulunamadı:', XLSX_PATH);
  process.exit(1);
}
if (!fs.existsSync(DB_PATH)) {
  console.error('[migration] HATA: server/db.json bulunamadı:', DB_PATH);
  process.exit(1);
}

// ── 1. Backup ───────────────────────────────────────────────────────────────
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `db-pre-cari-import-${ts}.json`);
fs.copyFileSync(DB_PATH, backupPath);
const backupSize = fs.statSync(backupPath).size;
console.log(`[migration] Backup: ${backupPath} (${(backupSize / 1024).toFixed(0)} KB)`);

// ── 2. DB oku ───────────────────────────────────────────────────────────────
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
if (!Array.isArray(db.cariler)) {
  console.error('[migration] HATA: db.cariler array değil');
  process.exit(1);
}

// ── 3. XLSX oku ─────────────────────────────────────────────────────────────
const wb = xlsx.readFile(XLSX_PATH);
const ws = wb.Sheets['Sayfa1'];
if (!ws) {
  console.error('[migration] HATA: Sayfa1 sheet bulunamadı');
  process.exit(1);
}
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
const headers = rows[1];
const xlsxData = rows.slice(2);

// Beklenen header'lar (sırasıyla 14 sütun)
const beklenenSutunlar = [
  'Cari Hesap Kodu', 'Unvanı', 'Adres[1]', 'Adres[2]', 'Şehir', 'Ülke', 'Posta Kodu',
  'İlgili', 'Alan Kodu (1)', 'Telefon[1]', 'Alan Kodu (2)', 'Telefon[2]',
  'Alan Kodu (Fax)', 'Faks No.',
];
for (let i = 0; i < beklenenSutunlar.length; i++) {
  if (headers[i] !== beklenenSutunlar[i]) {
    console.error(`[migration] HATA: Sütun ${i + 1} beklenmeyen: "${headers[i]}" (beklenen: "${beklenenSutunlar[i]}")`);
    process.exit(1);
  }
}
console.log(`[migration] XLSX okundu: ${xlsxData.length} satır`);

// ── 4. Kullanıcı normalize key set ──────────────────────────────────────────
const kullaniciKeys = new Set();
for (const u of (db.kullanicilar || [])) {
  if (u.adSoyad) kullaniciKeys.add(norm(u.adSoyad));
  if (u.kullaniciAdi) kullaniciKeys.add(norm(u.kullaniciAdi));
}
console.log(`[migration] Kullanıcı normalize key sayısı: ${kullaniciKeys.size}`);

// ── 5. XLSX satırlarını filtrele ve dönüştür ────────────────────────────────
const eklenecekKayitlar = [];
let bosUnvanSayisi = 0;
let kullaniciAtlandiSayisi = 0;
const atlananKullanicilar = [];

for (const row of xlsxData) {
  const unvan = String(row[1] || '').trim();
  if (!unvan) {
    bosUnvanSayisi++;
    continue;
  }
  const k = norm(unvan);
  if (kullaniciKeys.has(k)) {
    kullaniciAtlandiSayisi++;
    atlananKullanicilar.push(unvan);
    continue;
  }
  eklenecekKayitlar.push({
    cariHesapKodu: String(row[0] || '').trim(),
    unvani: unvan,
    adres1: row[2],
    adres2: row[3],
    sehir: row[4],
    ilgili: row[7],
    alanKodu1: row[8],
    telefon1: row[9],
    alanKodu2: row[10],
    telefon2: row[11],
  });
}

// ── 6. Mevcut MEBA carileri çıkar ───────────────────────────────────────────
const mebaOnceki = db.cariler.filter((c) => c.firmaId === 'meba').length;
db.cariler = db.cariler.filter((c) => c.firmaId !== 'meba');
console.log(`[migration] Silinen MEBA cari: ${mebaOnceki}`);

// ── 7. Yeni cari objelerini oluştur ve ekle ─────────────────────────────────
const guncellemeTarihi = new Date().toISOString();
let siraNo = 1;
for (const x of eklenecekKayitlar) {
  const id = 'c-' + String(siraNo).padStart(4, '0');
  const cari = {
    id,
    cariKod: x.cariHesapKodu,
    firmaAdi: x.unvani,
    yetkiliKisi: String(x.ilgili || '').trim(),
    telefon: birlestir(x.alanKodu1, x.telefon1) || birlestir(x.alanKodu2, x.telefon2),
    ePosta: '',
    adres: adresOlustur(x.adres1, x.adres2, x.sehir),
    vergiDairesi: '',
    vergiNo: '',
    firmaId: 'meba',
    guncellemeTarihi,
  };
  db.cariler.push(cari);
  siraNo++;
}

// ── 8. Yaz ──────────────────────────────────────────────────────────────────
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
const newSize = fs.statSync(DB_PATH).size;

// ── 9. Özet ─────────────────────────────────────────────────────────────────
const yeniMeba = db.cariler.filter((c) => c.firmaId === 'meba').length;
const yeniMesa = db.cariler.filter((c) => c.firmaId === 'mesa').length;
const yeniElmos = db.cariler.filter((c) => c.firmaId === 'elmos').length;

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  MIGRATION ÖZETİ');
console.log('═══════════════════════════════════════════════════════');
console.log(`  XLSX toplam satır     : ${xlsxData.length}`);
console.log(`    - Boş Unvan         : ${bosUnvanSayisi}`);
console.log(`    - Kullanıcı atlandı : ${kullaniciAtlandiSayisi}`);
console.log(`    - Import edilen     : ${eklenecekKayitlar.length}`);
console.log('');
console.log(`  Önceki MEBA cari      : ${mebaOnceki}`);
console.log(`  Yeni MEBA cari        : ${yeniMeba}`);
console.log(`  MESA cari (dokunulmadı): ${yeniMesa}`);
console.log(`  ELMOS cari (dokunulmadı): ${yeniElmos}`);
console.log(`  Toplam cari           : ${db.cariler.length}`);
console.log('');
console.log(`  Atlanan kullanıcılar  :`);
atlananKullanicilar.forEach((n) => console.log(`    • ${n}`));
console.log('');
console.log(`  Backup                : ${path.basename(backupPath)}`);
console.log(`  db.json yeni boyut    : ${(newSize / 1024 / 1024).toFixed(2)} MB`);
console.log('═══════════════════════════════════════════════════════');
