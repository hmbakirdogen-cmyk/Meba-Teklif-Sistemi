'use strict';

const XLSX = require('./node_modules/xlsx');
const path = require('path');

// ============================================================
// TEXT FORMATTING RULES
// ============================================================
function postProcess(s) {
  if (!s || !s.trim()) return s || '';
  s = s.trim();

  // 1. Double apostrophe → double quote
  s = s.replace(/'{2}/g, '"');

  // 2. Valve config + fractional inch port: X/Y-fraction → X/Y · fraction"
  s = s.replace(/(\d+\/\d+)-(1\/8|1\/4|3\/8|1\/2|3\/4)(?!")/g, '$1 · $2"');

  // 2b. Valve config + whole/mixed inch port that already has ": X/Y-N" → X/Y · N"
  //     e.g. "2/2-1"" → "2/2 · 1""  or  "3/2-1 1/2"" → "3/2 · 1 1/2""
  s = s.replace(/(\d+\/\d+)-(\d+(?:\s+\d+\/\d+)?")/g, '$1 · $2');

  // 3. Valve config + voltage: X/Y-NNVxx → X/Y · NNVxx
  s = s.replace(/(\d+\/\d+)-(\d+\s*V(?:DC|AC))/g, '$1 · $2');

  // 4. Standalone inch fractions at end or before ( — add missing "
  const INCH_PATS = [
    [/\b(1\s+1\/2)\b(?=\s*[\(\s]|$)(?!")/g, '1 1/2"'],
    [/\b(1\s+1\/4)\b(?=\s*[\(\s]|$)(?!")/g, '1 1/4"'],
    [/\b(2\s+1\/2)\b(?=\s*[\(\s]|$)(?!")/g, '2 1/2"'],
    [/\b(1\/8)\b(?=\s*[\(\s]|$)(?!")/g,     '1/8"'],
    [/\b(1\/4)\b(?=\s*[\(\s]|$)(?!")/g,     '1/4"'],
    [/\b(3\/8)\b(?=\s*[\(\s]|$)(?!")/g,     '3/8"'],
    [/\b(1\/2)\b(?=\s*[\(\s]|$)(?!")/g,     '1/2"'],
    [/\b(3\/4)\b(?=\s*[\(\s]|$)(?!")/g,     '3/4"'],
  ];
  for (const [re, rep] of INCH_PATS) s = s.replace(re, rep);

  // 5. XxYmm → Dış ØXmm · İç ØYmm (tubing outer/inner diameter)
  s = s.replace(/\b(\d+)[Xx](\d+)mm\b/g, 'Dış Ø$1mm · İç Ø$2mm');

  // 6. Xmm-Ymm → ØXmm · ØYmm
  s = s.replace(/(?<!Ø)(?<!Strok )\b(\d+)mm-(\d+)mm\b/g, 'Ø$1mm · Ø$2mm');

  // 7. X-Ymm → ØXmm · ØYmm
  s = s.replace(/(?<!Ø)(?<!Strok )(?<!Dış )(?<!İç )\b(\d+)-(\d+)mm\b/g, 'Ø$1mm · Ø$2mm');

  // 8. After XxYmm conversion: " / Color" → " · Color" in hortum context
  s = s.replace(/(\d+mm)\s+\/\s+(?=[A-ZÇĞİÖŞÜa-zçğışöşü])/g, '$1 · ');

  // 9. False inch in middle of dot-list: · N" · → · ØNmm · (for small N)
  s = s.replace(/·\s*(\d{1,2})"\s*·/g, (m, n) => {
    return parseInt(n) <= 20 ? `· Ø${n}mm ·` : m;
  });

  // 10. Bare Nmm → ØNmm (except after Ø, "Strok ", "Dış ", "İç ")
  s = s.replace(/(?<!Ø)(?<!Strok )(?<!Dış )(?<!İç )\b(\d+)mm\b/g, 'Ø$1mm');

  // 10b. fraction-fraction" → fraction"-fraction" (reducer pipe fittings)
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-(1\/8|1\/4|3\/8|1\/2|3\/4)(?=")/g, '$1"-$2');

  // 10c. fraction-Dış → fraction" · Dış
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-Dış/g, '$1" · Dış');

  // 10d. fraction-\d+$ → fraction" · Ø\d+mm
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-(\d+)\s*$/g, '$1" · Ø$2mm');

  // 10e. fraction-COLOR → fraction" · TitleCasedColor
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-KIRMIZI\b/g, '$1" · Kırmızı');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-SARI\b/g,    '$1" · Sarı');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-YEŞİL\b/g,   '$1" · Yeşil');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-MAVİ\b/g,    '$1" · Mavi');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-SİYAH\b/g,   '$1" · Siyah');

  // 11. Turkish typo fixes
  s = s.replace(/\bYuksek\b/g,      'Yüksek');
  s = s.replace(/\bReduksiyon\b/g,  'Redüksiyon');
  s = s.replace(/\bUnitesi\b/g,     'Ünitesi');
  s = s.replace(/\bUreteci\b/g,     'Üreteci');
  s = s.replace(/\bRegülatöru\b/g,  'Regülatörü');
  s = s.replace(/\bAdaptöru\b/g,    'Adaptörü');
  s = s.replace(/4'lu\b/g,          "4'lü");
  s = s.replace(/3'lu\b/g,          "3'lü");

  // 12. Space before ( if missing
  s = s.replace(/([^\s])\(/g, '$1 (');

  // 13. Clean up multiple spaces
  s = s.replace(/  +/g, ' ').trim();

  return s;
}

// ============================================================
// MAGNETIC PISTON DETECTION
// Based on SMC product catalog research:
//
// D-prefix series (CD vs C without D):
//   CD85 = with magnetic piston (vs C85 = without)
//   CDQ2 = with magnetic piston (vs CQ2 = without)
//   CDQMB = with magnetic piston (vs CQMB = without)
//   CD55 = with magnetic piston (vs C55 = without)
//   CDJ2 = mini cylinder with magnetic piston
//   CDG1 = round body water-resistant with magnetic piston
//
// Standard magnetic (all units in series):
//   CP96, C96, C95 = ISO 15552 cylinders, magnetic piston as standard
//   MGPM, MGPL = compact guide cylinders, magnetic piston as standard
//   MXS = precision slide table, magnetic piston as standard
//   CM2 = stainless body round cylinder, magnetic piston as standard
//   MKB = compact cylinder with guide, magnetic piston as standard
//   MDUB = guided cylinder, magnetic piston as standard
// ============================================================
const MAGNETIC_PREFIXES = [
  'CD85',
  'CDQ2',
  'CDQMB',
  'CD55',
  'CDJ2',
  'CDG1',
  'CP96',
  'C96',
  'C95',
  'MGPM',
  'MGPL',
  'MXS',
  'CM2',
  'MKB',
  'MDUB',
];

// Sort longer prefixes first so CDQMB is checked before CDQ2
MAGNETIC_PREFIXES.sort((a, b) => b.length - a.length);

function isMagnetic(code) {
  const c = code.trim().toUpperCase();
  return MAGNETIC_PREFIXES.some(p => c.startsWith(p));
}

// ============================================================
// MAIN
// ============================================================
const SRC = path.join(__dirname, 'SMC_Urun_Kodlari_ve_Aciklamalari');
const DST = path.join(__dirname, 'SMC_Urun_Kodlari_ve_Aciklamalari_DUZELTILMIS.xlsx');

console.log('Reading source file...');
const wb = XLSX.readFile(SRC, { type: 'file' });
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log(`Sheet: "${sheetName}", total rows: ${data.length}`);

const headers = data[0];
const G_IDX = 6; // PROFESYONEL TÜRKÇE AÇIKLAMA (column G, 0-indexed)
const CODE_IDX = 5; // DÜZENLENMİŞ ÜRÜN KODU (column F, 0-indexed)

let formatChanged = 0;
let magneticAdded = 0;
let totalChanged = 0;
const samples = [];

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  // Pad row if needed
  while (row.length <= G_IDX) row.push('');

  const code = String(row[CODE_IDX] || row[2] || '').trim();
  const origG = String(row[G_IDX] || '').trim();
  if (!origG) continue;

  let newG = postProcess(origG);
  const formatFix = newG !== origG;

  // Magnetic detection
  const magnetic = isMagnetic(code);
  const alreadyMag = newG.includes('Manyetik');

  if (magnetic && !alreadyMag) {
    newG = newG + ' · Manyetik';
    magneticAdded++;
  }

  if (newG !== origG) {
    row[G_IDX] = newG;
    totalChanged++;
    if (formatFix) formatChanged++;
    if (samples.length < 30) {
      samples.push({ row: i + 1, code, before: origG, after: newG });
    }
  }
}

console.log(`\nResults:`);
console.log(`  Format fixes applied: ${formatChanged}`);
console.log(`  · Manyetik added: ${magneticAdded}`);
console.log(`  Total rows updated: ${totalChanged}`);

// Write output
const newWb = XLSX.utils.book_new();
const newWs = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(newWb, newWs, sheetName);
XLSX.writeFile(newWb, DST);
console.log(`\nSaved: ${DST}`);

// Print samples
console.log('\n=== Sample changes ===');
for (const c of samples) {
  console.log(`R${c.row} [${c.code}]`);
  console.log(`  BEFORE: ${c.before}`);
  console.log(`  AFTER:  ${c.after}`);
}
