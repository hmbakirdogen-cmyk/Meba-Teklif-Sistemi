'use strict';

const XLSX = require('./node_modules/xlsx');
const path = require('path');

// ============================================================
// TEXT FORMATTING RULES
// ============================================================
function postProcess(s) {
  if (!s || !s.trim()) return s || '';
  s = s.trim();
  s = s.replace(/'{2}/g, '"');
  s = s.replace(/(\d+\/\d+)-(1\/8|1\/4|3\/8|1\/2|3\/4)(?!")/g, '$1 · $2"');
  s = s.replace(/(\d+\/\d+)-(\d+(?:\s+\d+\/\d+)?")/g, '$1 · $2');
  s = s.replace(/(\d+\/\d+)-(\d+\s*V(?:DC|AC))/g, '$1 · $2');
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
  s = s.replace(/\b(\d+)[Xx](\d+)mm\b/g, 'Dış Ø$1mm · İç Ø$2mm');
  s = s.replace(/(?<!Ø)(?<!Strok )\b(\d+)mm-(\d+)mm\b/g, 'Ø$1mm · Ø$2mm');
  s = s.replace(/(?<!Ø)(?<!Strok )(?<!Dış )(?<!İç )\b(\d+)-(\d+)mm\b/g, 'Ø$1mm · Ø$2mm');
  s = s.replace(/(\d+mm)\s+\/\s+(?=[A-ZÇĞİÖŞÜa-zçğışöşü])/g, '$1 · ');
  s = s.replace(/·\s*(\d{1,2})"\s*·/g, (m, n) => parseInt(n) <= 20 ? `· Ø${n}mm ·` : m);
  s = s.replace(/(?<!Ø)(?<!Strok )(?<!Dış )(?<!İç )\b(\d+)mm\b/g, 'Ø$1mm');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-(1\/8|1\/4|3\/8|1\/2|3\/4)(?=")/g, '$1"-$2');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-Dış/g, '$1" · Dış');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-(\d+)\s*$/g, '$1" · Ø$2mm');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-KIRMIZI\b/g, '$1" · Kırmızı');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-SARI\b/g,    '$1" · Sarı');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-YEŞİL\b/g,   '$1" · Yeşil');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-MAVİ\b/g,    '$1" · Mavi');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-SİYAH\b/g,   '$1" · Siyah');
  s = s.replace(/\bYuksek\b/g,      'Yüksek');
  s = s.replace(/\bReduksiyon\b/g,  'Redüksiyon');
  s = s.replace(/\bUnitesi\b/g,     'Ünitesi');
  s = s.replace(/\bUreteci\b/g,     'Üreteci');
  s = s.replace(/\bRegülatöru\b/g,  'Regülatörü');
  s = s.replace(/\bAdaptöru\b/g,    'Adaptörü');
  s = s.replace(/4'lu\b/g,          "4'lü");
  s = s.replace(/3'lu\b/g,          "3'lü");
  s = s.replace(/([^\s])\(/g, '$1 (');
  s = s.replace(/\bMETAL KEÇELİ\b/g, 'Metal Keçeli');
  s = s.replace(/\bHAVA YASTIKLI\b/g, 'Hava Yastıklı');
  s = s.replace(/  +/g, ' ').trim();
  return s;
}

// ============================================================
// BORE/STROKE EXTRACTION FROM SMC PRODUCT CODE
// Standard SMC code structure: SERIES+BORE+OPTIONS-STROKE+OPTIONS
// ============================================================
const COMMON_BORES = [4,5,6,8,10,12,16,20,25,32,40,50,63,80,100,125,160,200,250,320,400,500,630];

function findCommonBore(rawNum) {
  if (rawNum <= 630) return rawNum;
  const s = rawNum.toString();
  // Try extracting last 3, then 2 digits
  for (const len of [3, 2]) {
    if (s.length > len) {
      const cand = parseInt(s.slice(-len));
      if (COMMON_BORES.includes(cand)) return cand;
    }
  }
  return null;
}

function extractBoreStroke(code) {
  const parts = code.split('-');
  if (parts.length < 2) return null;

  // Bore = last numeric sequence in first part
  const boreMatch = parts[0].match(/(\d+)[^0-9]*$/);
  if (!boreMatch) return null;
  let bore = parseInt(boreMatch[1]);
  if (bore <= 0) return null;
  // Handle series codes where digits run into bore: CP9680→80, C8520→20
  bore = findCommonBore(bore);
  if (!bore) return null;

  // Stroke = first numeric sequence in subsequent parts (skip non-digit starts)
  let stroke = null;
  for (let k = 1; k < parts.length; k++) {
    const m = parts[k].match(/^(\d+)/);
    if (m) {
      stroke = parseInt(m[1]);
      break;
    }
  }
  if (!stroke || stroke <= 0 || stroke > 10000) return null;

  return { bore, stroke };
}

// Insert bore and stroke into description at the correct position
// Order: TYPE [· ISO/VDMA] · Ø_bore · Strok_stroke [· options] [· Manyetik]
function insertBoreStroke(desc, bore, stroke) {
  if (/Ø\d+mm/.test(desc) && /Strok \d+mm/.test(desc)) return desc; // already has both
  const parts = desc.split(' · ');
  const boreStr = `Ø${bore}mm`;
  const strokeStr = `Strok ${stroke}mm`;

  // Find insertion point: after type name and ISO/VDMA indicator, before other options
  let insertPos = 1;
  for (let k = 1; k < parts.length; k++) {
    if (/^ISO(\/VDMA)?$/.test(parts[k]) || parts[k] === 'VDMA') {
      insertPos = k + 1;
    } else {
      break;
    }
  }

  const result = [
    ...parts.slice(0, insertPos),
    boreStr,
    strokeStr,
    ...parts.slice(insertPos),
  ];
  return result.join(' · ');
}

// ============================================================
// MAGNETIC PISTON RULES
//
// CONFIRMED MAGNETIC SERIES (prefix-based):
//   D-prefix pattern (CD vs C — D variant = with magnetic piston):
//     CD85  vs C85   → CD85 = magnetic
//     CDQ2  vs CQ2   → CDQ2 = magnetic
//     CDQMB vs CQMB  → CDQMB = magnetic
//     CD55  vs C55   → CD55 = magnetic
//     CDJ2          → CDJ2 = magnetic (mini cylinder, D = magnetic built-in)
//     CDG1, CDG3    → CDG = magnetic (round body with magnetic piston)
//     CDM2          → CDM2 = magnetic (non-rotating round body, D = magnetic)
//     CDNSB         → has D prefix = magnetic
//     JCDQ, JCDQA  → Japan-standard CDQ2 equivalent = magnetic
//     NCQ2D         → NCQ2D = like CDQ2 = magnetic (D suffix)
//
//   Standard magnetic series (magnetic is built-in for all units):
//     CP96, C96, C95 — ISO 15552, standard magnetic piston
//     MGPM, MGPL     — compact guided, standard magnetic
//     MXS            — precision slide table, standard magnetic
//     CM2            — stainless body round cylinder, standard magnetic
//     MKB            — compact rotary clamp, standard magnetic
//     MDUB           — guided elliptical, standard magnetic
//     MDBB           — similar guided series, standard magnetic
//     MDWBB          — similar guided series, standard magnetic
//
//   Option-code D detection (D in option codes after stroke = with magnetic piston):
//     Series: MUB, MUWB, MQMLB, MDBBL, CVQB, CVM (check if code has D in options)
//     Also: any series where [code matches X\d+-\d+...D...] indicates D option
//
// NOT MAGNETIC:
//   CQ2, C85, C55, CQMB — non-D variants
//   MY1, MY2, MY3       — mechanically jointed rodless (dust-seal magnet only, not for auto-switch)
//   CJP2, CJ2           — pin/mini cylinder variants without magnetic
//   CHDKDB, CHDKGB, CHDQB — hydraulic cylinders (different detection method)
// ============================================================

// Prefixes where ALL rows are magnetic
const MAGNETIC_PREFIXES = [
  'CDQMB',  // must be before CDQ2
  'CDQ2', 'CD85', 'CD55', 'CDJ2',
  'CDG',    // CDG1, CDG3, CDG series
  'CDM2',   // non-rotating with guide, D = magnetic
  'CDNSB',  // lock cylinder with D
  'JCDQ',   // Japanese standard = CDQ2 equivalent, magnetic
  'CP96', 'C96', 'C95',
  'MGPM', 'MGPL',
  'MXS', 'CM2', 'MKB',
  'MDUB', 'MDBB', 'MDWBB',
];
MAGNETIC_PREFIXES.sort((a, b) => b.length - a.length);

// Series where magnetic depends on option code D being present after stroke
const MAGNETIC_BY_OPTION = [
  'MUB', 'MUWB', 'MQMLB', 'MDBBL', 'CVQB', 'CVM', 'CKZT', 'RDQB', 'RDLQA',
  'NCQ', 'JCQ', 'JCDMM', 'CKZ', 'MGJ',
];

// Series explicitly NOT magnetic
const NON_MAGNETIC_PREFIXES = [
  'CQ2', 'CQMB', 'C85', 'C55',
  'MY1', 'MY2', 'MY3', 'MYB',
  'CJP2', 'CJ2', 'CJP',
  'CHDKDB', 'CHDKGB', 'CHDQB', // hydraulic
  'RS2H', 'RS',                  // shock absorbers
];
NON_MAGNETIC_PREFIXES.sort((a, b) => b.length - a.length);

// Check if a code's option field (after stroke) contains standalone D = magnetic piston
function hasOptionD(code) {
  // Pattern: find the first hyphen, skip the stroke number, check remaining for D
  const hyphenIdx = code.indexOf('-');
  if (hyphenIdx < 0) return false;
  const afterFirst = code.substring(hyphenIdx + 1);
  // Get the part after the stroke number
  const afterStroke = afterFirst.replace(/^\d+/, '');
  // Check for D as a standalone option letter (not part of DC, DCV, DKU etc.)
  // D followed by Z, M, or at end = magnetic option
  return /^D[MZB]?(-|$)/.test(afterStroke) || /D[MZ]/.test(afterStroke.split('-')[0]);
}

function isMagnetic(code) {
  const c = code.trim().toUpperCase();

  // Explicit non-magnetic first
  if (NON_MAGNETIC_PREFIXES.some(p => c.startsWith(p))) return false;

  // Prefix-based magnetic
  if (MAGNETIC_PREFIXES.some(p => c.startsWith(p))) return true;

  // NCQ2D: NCQ series with D in series name
  if (c.startsWith('NCQ2D')) return true;

  // Option-code based
  if (MAGNETIC_BY_OPTION.some(p => c.startsWith(p))) {
    return hasOptionD(c);
  }

  return false;
}

// ============================================================
// MAGNET ICON — minimal inline SVG horseshoe magnet
// Appended at end of magnetic cylinder descriptions (no text label)
// ============================================================
const MAGNET_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 14 12"' +
  ' style="display:inline-block;vertical-align:middle;margin-left:4px">' +
  '<path d="M2 0v6a5 5 0 0 0 10 0V0" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="miter"/>' +
  '<path d="M0.5 0h3" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>' +
  '<path d="M10.5 0h3" stroke="#1d4ed8" stroke-width="3" stroke-linecap="round"/>' +
  '</svg>';

const MAGNET_TEXT  = ' · Manyetik'; // legacy text marker to detect/replace
const MAGNET_TEXT2 = '· Manyetik';  // without leading space

function stripMagnetText(s) {
  // Remove any previously written text marker so we can replace with SVG
  return s
    .replace(/ · Manyetik\s*$/, '')
    .replace(/· Manyetik\s*$/, '')
    .trim();
}

function hasMagnetMarker(s) {
  return s.includes(MAGNET_SVG) || s.includes(MAGNET_TEXT) || s.includes(MAGNET_TEXT2);
}

// ============================================================
// CYLINDER DETECTION
// ============================================================
const CYL_KEYWORDS = ['Silindir', 'SILINDIR'];

function isCylinderRow(desc) {
  return CYL_KEYWORDS.some(k => desc.includes(k));
}

// ============================================================
// MAIN
// ============================================================
const SRC = path.join(__dirname, 'SMC_Urun_Kodlari_ve_Aciklamalari.xlsx');
const DST = path.join(__dirname, 'SMC_Urun_Kodlari_ve_Aciklamalari_DUZELTILMIS.xlsx');

console.log('Reading:', SRC);
const wb = XLSX.readFile(SRC, { type: 'file' });
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
console.log(`Sheet: "${sheetName}"  Rows: ${data.length}`);

// Detect column layout (3-col or 7-col)
const headers = data[0];
let CODE_COL, DESC_COL;
if (headers.length <= 3) {
  // 3-column layout: [ItemName, Code, Description]
  CODE_COL = 1;
  DESC_COL = 2;
} else {
  // 7-column layout
  CODE_COL = 5;
  DESC_COL = 6;
}
console.log(`Layout: ${headers.length}-col  CODE_COL=${CODE_COL}  DESC_COL=${DESC_COL}`);

let fmtFixed = 0;
let boreStrokeAdded = 0;
let magAdded = 0;
let magRemoved = 0; // corrections if wrongly added
let totalChanged = 0;

const magBySeries = {};
const boreStrokeSamples = [];
const magSamples = [];
const fmtSamples = [];

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  while (row.length <= DESC_COL) row.push('');

  const code = String(row[CODE_COL] || '').trim();
  const origDesc = String(row[DESC_COL] || '').trim();
  if (!origDesc || !code) continue;

  let desc = postProcess(origDesc);
  const wasFmt = desc !== origDesc;

  const cylRow = isCylinderRow(desc);

  // Bore/stroke extraction for cylinder rows
  let wasBoreStroke = false;
  if (cylRow && (!(/Ø\d+mm/.test(desc)) || !(/Strok \d+mm/.test(desc)))) {
    const bs = extractBoreStroke(code);
    if (bs) {
      const updated = insertBoreStroke(desc, bs.bore, bs.stroke);
      if (updated !== desc) {
        desc = updated;
        wasBoreStroke = true;
        if (boreStrokeSamples.length < 20) {
          boreStrokeSamples.push({ row: i + 1, code, before: origDesc, after: desc });
        }
      }
    }
  }

  // Magnetic detection — replace text marker with SVG icon
  // First: strip any existing text marker so we can normalise
  let hadTextMarker = false;
  if (hasMagnetMarker(desc) && !desc.includes(MAGNET_SVG)) {
    desc = stripMagnetText(desc);
    hadTextMarker = true;
  }

  const magnetic = cylRow ? isMagnetic(code) : false;
  const alreadyHasIcon = desc.includes(MAGNET_SVG);
  let wasMag = false;

  if (magnetic && !alreadyHasIcon) {
    desc = desc + MAGNET_SVG;
    magAdded++;
    wasMag = true;
    const prefix = MAGNETIC_PREFIXES.find(p => code.toUpperCase().startsWith(p))
      || (MAGNETIC_BY_OPTION.find(p => code.toUpperCase().startsWith(p)) ? 'OPT-D' : 'OTHER');
    magBySeries[prefix] = (magBySeries[prefix] || 0) + 1;
    if (magSamples.length < 10) magSamples.push({ row: i + 1, code, after: desc });
  } else if (hadTextMarker && !magnetic) {
    // was wrongly marked before — keep stripped version (no icon)
  }

  // Apply changes
  if (desc !== origDesc) {
    row[DESC_COL] = desc;
    totalChanged++;
    if (wasFmt && fmtSamples.length < 5) fmtSamples.push({ row: i + 1, code, before: origDesc, after: desc });
    if (wasFmt) fmtFixed++;
    if (wasBoreStroke) boreStrokeAdded++;
  }
}

// Write both output files
const writeWb = (dest) => {
  const newWb = XLSX.utils.book_new();
  const newWs = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(newWb, newWs, sheetName);
  XLSX.writeFile(newWb, dest, { bookType: 'xlsx' });
  console.log('Saved:', dest);
};

writeWb(SRC);  // overwrite original
writeWb(DST);  // also save as DUZELTILMIS

// ============================================================
// REPORT
// ============================================================
console.log('\n====== RAPOR ======');
console.log(`Toplam değişen satır          : ${totalChanged}`);
console.log(`  Format düzeltmesi           : ${fmtFixed}`);
console.log(`  Çap/Strok eklenen silindir  : ${boreStrokeAdded}`);
console.log(`  · Manyetik eklenen          : ${magAdded}`);

console.log('\nManyetik eklenen seriler:');
const sortedSeries = Object.keys(magBySeries).sort((a, b) => magBySeries[b] - magBySeries[a]);
for (const s of sortedSeries) {
  console.log(`  ${s.padEnd(10)}: ${magBySeries[s]} satır`);
}

if (boreStrokeSamples.length > 0) {
  console.log('\n--- Çap/Strok eklenen örnekler ---');
  for (const s of boreStrokeSamples.slice(0, 15)) {
    console.log(`R${s.row} [${s.code}]`);
    console.log(`  ÖNCE : ${s.before}`);
    console.log(`  SONRA: ${s.after}`);
  }
}

if (fmtSamples.length > 0) {
  console.log('\n--- Format düzeltme örnekleri ---');
  for (const s of fmtSamples) {
    console.log(`R${s.row} [${s.code}]: ${s.before} → ${s.after}`);
  }
}
