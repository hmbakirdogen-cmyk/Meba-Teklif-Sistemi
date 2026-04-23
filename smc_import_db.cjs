'use strict';

const XLSX = require('./node_modules/xlsx');
const fs   = require('fs');
const path = require('path');

const ROOT   = __dirname;
const SMC    = path.join(ROOT, 'SMC_Urun_Kodlari_ve_Aciklamalari_DUZELTILMIS.xlsx');
const CARI   = path.join(ROOT, 'meba_cari_basliklar.xlsx');
const DB     = path.join(ROOT, 'server', 'db.json');

// ── Strip SVG tags from text ──────────────────────────────────────────────────
function stripSVG(s) {
  return (s || '').replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/\s+$/, '').trim();
}

// ── Detect category from description ─────────────────────────────────────────
function detectCategory(desc) {
  const d = desc.toLowerCase();
  if (d.includes('silindir'))                                      return 'Silindir';
  if (d.includes('valf') || d.includes('selenoid') || d.includes('manüel')) return 'Valf';
  if (d.includes('hortum') || d.includes('tüp'))                  return 'Hortum';
  if (d.includes('rakor') || d.includes('bağlantı') || d.includes('nipel')) return 'Rakor & Bağlantı';
  if (d.includes('sensör') || d.includes('sensor'))               return 'Sensör';
  if (d.includes('filtre') || d.includes('regülatör') || d.includes('yağlayıcı') || d.includes('frl')) return 'FRL';
  if (d.includes('piston') || d.includes('gövde') || d.includes('kovan'))   return 'Aksesuar';
  return 'Diğer';
}

// ── Load products from SMC xlsx ───────────────────────────────────────────────
console.log('Okunuyor:', SMC);
const wb  = XLSX.readFile(SMC);
const ws  = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
// header row: [Item name, DÜZENLENMİŞ ÜRÜN KODU, PROFESYONEL TÜRKÇE AÇIKLAMA]

const urunler = [];
for (let i = 1; i < raw.length; i++) {
  const row  = raw[i];
  const kod  = String(row[1] || '').trim();
  const desc = String(row[2] || '').trim();
  if (!kod || !desc) continue;

  const descClean = stripSVG(desc);

  urunler.push({
    id:             `u${i}`,
    urunKod:        kod,
    urunAdi:        '',
    aciklama:       descClean,
    kategori:       detectCategory(descClean),
    birim:          'Adet',
    varsayilanFiyat: 0,
  });
}
console.log(`Ürün sayısı: ${urunler.length}`);

// ── Load customers from cari xlsx ─────────────────────────────────────────────
console.log('\nOkunuyor:', CARI);
const wb2   = XLSX.readFile(CARI);
const ws2   = wb2.Sheets[wb2.SheetNames[0]];
const raw2  = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: '' });
// header row: ['', 'Telefon']  — col 0 = firma adı, col 1 = telefon

const cariler = [];
for (let i = 1; i < raw2.length; i++) {
  const row   = raw2[i];
  const firma = String(row[0] || '').trim();
  const tel   = String(row[1] || '').trim();
  if (!firma) continue;

  const idx = String(i).padStart(4, '0');
  cariler.push({
    id:           `c-${idx}`,
    cariKod:      `C-${idx}`,
    firmaAdi:     firma,
    yetkiliKisi:  '',
    telefon:      tel,
    ePosta:       '',
    adres:        '',
    vergiDairesi: '',
    vergiNo:      '',
  });
}
console.log(`Cari sayısı: ${cariler.length}`);

// ── Update db.json ─────────────────────────────────────────────────────────────
const db = JSON.parse(fs.readFileSync(DB, 'utf-8'));

// Keep teklifler, referans, sayac — replace urunler + cariler
db.urunler = urunler;
db.cariler  = cariler;

fs.writeFileSync(DB, JSON.stringify(db, null, 2), 'utf-8');
console.log('\ndb.json güncellendi:', DB);
console.log(`  urunler: ${db.urunler.length}`);
console.log(`  cariler: ${db.cariler.length}`);
console.log(`  teklifler: ${db.teklifler.length} (dokunulmadı)`);
