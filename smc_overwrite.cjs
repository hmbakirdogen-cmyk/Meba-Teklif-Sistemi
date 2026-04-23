'use strict';

const XLSX = require('./node_modules/xlsx');
const path = require('path');

// ============================================================
// TEXT FORMATTING RULES — derived from user's red-cell reference edits
// ============================================================
function postProcess(s) {
  if (!s || !s.trim()) return s || '';
  s = s.trim();

  // 1. '' → "
  s = s.replace(/'{2}/g, '"');

  // 2. X/Y-fraction (no ") → X/Y · fraction"   e.g. "3/2-1/4" → "3/2 · 1/4""
  s = s.replace(/(\d+\/\d+)-(1\/8|1\/4|3\/8|1\/2|3\/4)(?!")/g, '$1 · $2"');

  // 2b. X/Y-N" (already has ") → X/Y · N"   e.g. "2/2-1"" → "2/2 · 1""
  s = s.replace(/(\d+\/\d+)-(\d+(?:\s+\d+\/\d+)?")/g, '$1 · $2');

  // 3. X/Y-NNVDx → X/Y · NNVDx
  s = s.replace(/(\d+\/\d+)-(\d+\s*V(?:DC|AC))/g, '$1 · $2');

  // 4. Standalone inch fractions without " → add "
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

  // 5. XxYmm → Dış ØXmm · İç ØYmm
  s = s.replace(/\b(\d+)[Xx](\d+)mm\b/g, 'Dış Ø$1mm · İç Ø$2mm');

  // 6. Xmm-Ymm → ØXmm · ØYmm
  s = s.replace(/(?<!Ø)(?<!Strok )\b(\d+)mm-(\d+)mm\b/g, 'Ø$1mm · Ø$2mm');

  // 7. X-Ymm → ØXmm · ØYmm
  s = s.replace(/(?<!Ø)(?<!Strok )(?<!Dış )(?<!İç )\b(\d+)-(\d+)mm\b/g, 'Ø$1mm · Ø$2mm');

  // 8. Nmm / Color → Nmm · Color
  s = s.replace(/(\d+mm)\s+\/\s+(?=[A-ZÇĞİÖŞÜa-zçğışöşü])/g, '$1 · ');

  // 9. False inch in dot-list: · N" · → · ØNmm · (N ≤ 20)
  s = s.replace(/·\s*(\d{1,2})"\s*·/g, (m, n) => parseInt(n) <= 20 ? `· Ø${n}mm ·` : m);

  // 10. Bare Nmm → ØNmm (except after Ø / Strok / Dış / İç )
  s = s.replace(/(?<!Ø)(?<!Strok )(?<!Dış )(?<!İç )\b(\d+)mm\b/g, 'Ø$1mm');

  // 10b. fraction-fraction" → fraction"-fraction"
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-(1\/8|1\/4|3\/8|1\/2|3\/4)(?=")/g, '$1"-$2');

  // 10c. fraction-Dış → fraction" · Dış
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-Dış/g, '$1" · Dış');

  // 10d. fraction-digits$ → fraction" · Ødigitsmm
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-(\d+)\s*$/g, '$1" · Ø$2mm');

  // 10e. fraction-COLOR → fraction" · TitleColor
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

  // 12. Space before (
  s = s.replace(/([^\s])\(/g, '$1 (');

  // 13. Multiple spaces
  s = s.replace(/  +/g, ' ').trim();

  return s;
}

// ============================================================
// MAGNETIC PISTON RULES — based on SMC catalog research
//
// D-prefix series (CD vs C — only CD variant has magnetic piston):
//   CD85  vs C85   → CD85  = Manyetik
//   CDQ2  vs CQ2   → CDQ2  = Manyetik
//   CDQMB vs CQMB  → CDQMB = Manyetik
//   CD55  vs C55   → CD55  = Manyetik
//   CDJ2           → CDJ2  = Manyetik (mini cylinder, standard with magnet)
//   CDG1           → CDG1  = Manyetik (water-resistant, standard with magnet)
//
// ISO 15552 / guided / slide cylinders (magnetic piston is standard):
//   CP96, C96, C95 — ISO 15552 cylinders
//   MGPM, MGPL     — compact guided cylinders
//   MXS            — precision slide table
//   CM2            — stainless steel round body cylinder
//   MKB            — compact cylinder with guide
//   MDUB           — guided cylinder
// ============================================================
const MAGNETIC_PREFIXES = [
  'CDQMB', // must be before CDQ2
  'CD85', 'CDQ2', 'CD55', 'CDJ2', 'CDG1',
  'CP96', 'C96', 'C95',
  'MGPM', 'MGPL',
  'MXS', 'CM2', 'MKB', 'MDUB',
];

function isMagnetic(code) {
  const c = code.trim().toUpperCase();
  return MAGNETIC_PREFIXES.some(p => c.startsWith(p));
}

// ============================================================
// MAIN
// ============================================================
const FILE = path.join(__dirname, 'SMC_Urun_Kodlari_ve_Aciklamalari');

console.log('Reading:', FILE);
const wb = XLSX.readFile(FILE, { type: 'file' });
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
console.log(`Sheet: "${sheetName}"  Rows: ${data.length}`);

const G = 6; // PROFESYONEL TÜRKÇE AÇIKLAMA
const CODE_COL = 5; // DÜZENLENMİŞ ÜRÜN KODU (fallback: col 2 = Item name)

let fmtFixed = 0;
let magAdded = 0;
let totalChanged = 0;

// Track magnetic by series prefix
const magBySeries = {};
// Track groups generalised
const groupsGeneralised = new Set();

const samples = [];

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  while (row.length <= G) row.push('');

  const code = String(row[CODE_COL] || row[2] || '').trim();
  const origG = String(row[G] || '').trim();
  if (!origG) continue;

  let newG = postProcess(origG);
  const wasFmtChanged = newG !== origG;

  const magnetic = isMagnetic(code);
  const alreadyHasMag = newG.includes('Manyetik');

  if (magnetic && !alreadyHasMag) {
    newG = newG + ' · Manyetik';
    magAdded++;

    // Track which series
    const prefix = MAGNETIC_PREFIXES.find(p => code.toUpperCase().startsWith(p));
    if (prefix) {
      magBySeries[prefix] = (magBySeries[prefix] || 0) + 1;
      groupsGeneralised.add(prefix);
    }
  }

  if (newG !== origG) {
    row[G] = newG;
    totalChanged++;
    if (wasFmtChanged) fmtFixed++;
    if (samples.length < 20) samples.push({ row: i + 1, code, before: origG, after: newG });
  }
}

// Build new workbook and overwrite the same file
const newWb = XLSX.utils.book_new();
const newWs = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(newWb, newWs, sheetName);
XLSX.writeFile(newWb, FILE, { bookType: 'xlsx' });
console.log(`\nFile overwritten: ${FILE}`);

// Report
console.log('\n====== RAPOR ======');
console.log(`Toplam değişen satır   : ${totalChanged}`);
console.log(`  Format düzeltmesi    : ${fmtFixed}`);
console.log(`  Manyetik eklenen     : ${magAdded}`);
console.log(`\nManyetik eklenen seriler:`);
const sortedSeries = Object.keys(magBySeries).sort((a, b) => magBySeries[b] - magBySeries[a]);
for (const s of sortedSeries) {
  console.log(`  ${s.padEnd(8)}: ${magBySeries[s]} satır`);
}
console.log(`\nGenellenen grup sayısı : ${groupsGeneralised.size}`);

console.log('\n====== ÖRNEK DEĞİŞİKLİKLER ======');
for (const c of samples) {
  console.log(`R${c.row} [${c.code}]`);
  console.log(`  ÖNCE : ${c.before}`);
  console.log(`  SONRA: ${c.after}`);
}
