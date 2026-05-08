/**
 * Tek seferlik import scripti: data/elmos/ELMOS_cariler.XLSX dosyasından
 * cari / urun / personel verilerini server/db.json'a ekler.
 *   - ELMOS cari/urun yoksa yazar (duplicate guard).
 *   - Mevcut Ahmet ESMERAY kullanıcısına dokunmaz; 4 yeni kullanıcıyı ekler.
 *   - Çalıştırmadan önce timestamp'li yedek alır.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');

const DB_PATH = path.join(__dirname, '..', 'server', 'db.json');
const XLSX_PATH = path.join(__dirname, '..', 'data', 'elmos', 'ELMOS_cariler.XLSX');

const FIRMA_ID = 'elmos';
const NOW = new Date().toISOString();

// ── Yardımcılar ─────────────────────────────────────────────────────────────
function trimStr(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function newId(prefix, hexBytes, existingSet) {
  for (let i = 0; i < 10; i++) {
    const id = prefix + crypto.randomBytes(hexBytes).toString('hex');
    if (!existingSet.has(id)) {
      existingSet.add(id);
      return id;
    }
  }
  throw new Error('ID collision retry exhausted (extremely unlikely).');
}

const TR_MAP = { 'ö': 'o', 'ş': 's', 'ü': 'u', 'ç': 'c', 'ğ': 'g', 'ı': 'i',
                 'Ö': 'O', 'Ş': 'S', 'Ü': 'U', 'Ç': 'C', 'Ğ': 'G', 'İ': 'I' };
function trToAscii(s) {
  return s.split('').map((c) => TR_MAP[c] ?? c).join('');
}

// ── Yedek ───────────────────────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_PATH = `${DB_PATH}.bak.${stamp}`;
fs.copyFileSync(DB_PATH, BACKUP_PATH);
console.log(`Yedek alındı: ${BACKUP_PATH}`);

// ── DB yükle ───────────────────────────────────────────────────────────────
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
db.cariler = db.cariler || [];
db.urunler = db.urunler || [];
db.kullanicilar = db.kullanicilar || [];

// Duplicate guard: ELMOS cari/urun zaten varsa abort.
const existingElmosCari = db.cariler.filter((c) => c.firmaId === FIRMA_ID).length;
const existingElmosUrun = db.urunler.filter((u) => u.firmaId === FIRMA_ID).length;
if (existingElmosCari > 0 || existingElmosUrun > 0) {
  console.error(`HATA: ELMOS verisi mevcut (cari=${existingElmosCari}, urun=${existingElmosUrun}). Import iptal.`);
  process.exit(1);
}

// Yeni eklenecek kullanıcı adlarının çakışmadığını kontrol et.
const newKullaniciAdlari = ['ayuce', 'stuzcu', 'msahbaz', 'mkolukisa'];
const existingKullaniciAdSet = new Set(
  db.kullanicilar.map((k) => trimStr(k.kullaniciAdi).toLowerCase())
);
for (const ka of newKullaniciAdlari) {
  if (existingKullaniciAdSet.has(ka)) {
    console.error(`HATA: kullaniciAdi="${ka}" zaten mevcut. Import iptal.`);
    process.exit(1);
  }
}

// ── ID havuzları ───────────────────────────────────────────────────────────
const cariIdSet = new Set(db.cariler.map((c) => c.id));
const urunIdSet = new Set(db.urunler.map((u) => u.id));
const kullaniciIdSet = new Set(db.kullanicilar.map((k) => k.id));

// ── Excel oku ──────────────────────────────────────────────────────────────
const wb = XLSX.readFile(XLSX_PATH);

// ── 1) CARİLER ─────────────────────────────────────────────────────────────
const cariSheet = wb.Sheets['CARİLER'];
const cariRows = XLSX.utils.sheet_to_json(cariSheet, { header: 1, defval: null });
// Header: NO(0), CARİ UNVAN(1), ŞEHİR(2), İLGİLİ(3), TELEFON(4), [adres](5)

let cariSeq = 1;
let cariEklenen = 0;
let cariAtlanan = 0;
for (let i = 1; i < cariRows.length; i++) {
  const row = cariRows[i];
  if (!row) { cariAtlanan++; continue; }
  const firmaAdi = trimStr(row[1]);
  if (!firmaAdi) { cariAtlanan++; continue; }

  const cariKod = `ELMOS-${String(cariSeq).padStart(4, '0')}`;
  cariSeq++;

  db.cariler.push({
    id: newId('c-', 5, cariIdSet),
    cariKod,
    firmaAdi,
    yetkiliKisi: trimStr(row[3]),
    telefon: trimStr(row[4]),
    ePosta: '',
    adres: trimStr(row[5]),
    sehir: trimStr(row[2]),
    vergiDairesi: '',
    vergiNo: '',
    firmaId: FIRMA_ID,
    logoUrl: '',
    logoYuklemeTarihi: '',
    guncellemeTarihi: NOW,
  });
  cariEklenen++;
}

// ── 2) ÜRÜNLER ─────────────────────────────────────────────────────────────
const urunSheet = wb.Sheets['ÜRÜNLER'];
const urunRows = XLSX.utils.sheet_to_json(urunSheet, { header: 1, defval: null });
// Header: SIRA NO(0), MARKA(1), ÜRÜN KODU(2), ÜRÜN AÇIKLAMASI(3)

let urunEklenen = 0;
let urunAtlanan = 0;
for (let i = 1; i < urunRows.length; i++) {
  const row = urunRows[i];
  if (!row) { urunAtlanan++; continue; }
  const urunKod = trimStr(row[2]);
  if (!urunKod) { urunAtlanan++; continue; }
  const aciklama = trimStr(row[3]);

  db.urunler.push({
    id: newId('u-', 6, urunIdSet),
    urunKod,
    urunAdi: aciklama,
    aciklama,
    kategori: '',
    marka: trimStr(row[1]),
    birim: 'Adet',
    varsayilanFiyat: 0,
    firmaId: FIRMA_ID,
  });
  urunEklenen++;
}

// ── 3) PERSONEL ────────────────────────────────────────────────────────────
// Mevcut kullanıcı sifreHash'ini referans olarak kullan (varsayılan şifre).
const referansKullanici = db.kullanicilar.find((k) => k.sifreHash);
if (!referansKullanici) {
  console.error('HATA: Referans için kullanılacak sifreHash bulunamadı. Import iptal.');
  process.exit(1);
}
const VARSAYILAN_SIFRE_HASH = referansKullanici.sifreHash;

const yeniKullanicilar = [
  { adSoyad: 'Ahmet YÜCE',       kullaniciAdi: 'ayuce',     initials: 'AY', rol: 'sales',
    unvan: 'Muhasebe / Finans' },
  { adSoyad: 'Serhat TUZCU',     kullaniciAdi: 'stuzcu',    initials: 'ST', rol: 'engineer',
    unvan: 'Elektrik Elektronik Mühendisi' },
  { adSoyad: 'Murat ŞAHBAZ',     kullaniciAdi: 'msahbaz',   initials: 'MŞ', rol: 'engineer',
    unvan: 'Elk. Tesisat ve Pano Montörü / Teknisyen' },
  { adSoyad: 'Mustafa KOLUKISA', kullaniciAdi: 'mkolukisa', initials: 'MK', rol: 'engineer',
    unvan: 'Elk. Tesisat ve Pano Montörü' },
];

let personelEklenen = 0;
for (const k of yeniKullanicilar) {
  // ASCII normalize edilen kullaniciAdi'nın user spec ile eşleştiğini doğrula
  // (savunmacı — yazım hatası varsa erkenden yakalansın).
  const expected = trToAscii(k.kullaniciAdi).toLowerCase();
  if (expected !== k.kullaniciAdi) {
    console.warn(`Uyarı: ${k.adSoyad} kullaniciAdi normalize farkı (${k.kullaniciAdi} vs ${expected})`);
  }
  db.kullanicilar.push({
    id: newId('u-', 4, kullaniciIdSet),
    kullaniciAdi: k.kullaniciAdi,
    sifreHash: VARSAYILAN_SIFRE_HASH,
    adSoyad: k.adSoyad,
    unvan: k.unvan,
    initials: k.initials,
    rol: k.rol,
    firmaId: FIRMA_ID,
    gosterilenFirmalar: [FIRMA_ID],
    aktifMi: true,
    mustChangePassword: true,
    olusturmaTarihi: NOW,
    profilFotoUrl: '',
  });
  personelEklenen++;
}

// ── Yaz ────────────────────────────────────────────────────────────────────
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

// ── Rapor ──────────────────────────────────────────────────────────────────
console.log('\n=== Import tamamlandı ===');
console.log(`Cariler  : eklenen=${cariEklenen}, atlanan=${cariAtlanan}, toplam (cariler) = ${db.cariler.length}`);
console.log(`Ürünler  : eklenen=${urunEklenen}, atlanan=${urunAtlanan}, toplam (urunler)  = ${db.urunler.length}`);
console.log(`Personel : eklenen=${personelEklenen}, toplam (kullanicilar) = ${db.kullanicilar.length}`);
console.log(`Yedek    : ${BACKUP_PATH}`);
