'use strict';

const fs = require('fs');
const path = require('path');
const { zipSync } = require('./node_modules/fflate');

// ============================================================
// POST-PROCESSING RULES (based on red cell reference examples)
// ============================================================
function postProcess(s) {
  if (!s || !s.trim()) return s || '';
  s = s.trim();

  // 1. Double apostrophe → double quote  (1'' → 1")
  s = s.replace(/'{2}/g, '"');

  // 2. Valve config + inch port size: X/Y-N/M → X/Y · N/M"
  //    e.g.  "3/2-1/4 24VDC" → "3/2 · 1/4" 24VDC"
  s = s.replace(/(\d+\/\d+)-(1\/8|1\/4|3\/8|1\/2|3\/4)(?!")/g, '$1 · $2"');

  // 3. Valve config + voltage: X/Y-NNVxx → X/Y · NNVxx
  //    e.g.  "2/2-24VDC" → "2/2 · 24VDC"
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

  // 6. Xmm-Ymm → ØXmm · ØYmm  (fittings where both sides already have mm)
  s = s.replace(/(?<!Ø)(?<!Strok )\b(\d+)mm-(\d+)mm\b/g, 'Ø$1mm · Ø$2mm');

  // 7. X-Ymm → ØXmm · ØYmm  (fittings where only second side has mm)
  s = s.replace(/(?<!Ø)(?<!Strok )(?<!Dış )(?<!İç )\b(\d+)-(\d+)mm\b/g, 'Ø$1mm · Ø$2mm');

  // 8. After XxYmm conversion: " / Color" → " · Color" in hortum context
  s = s.replace(/(\d+mm)\s+\/\s+(?=[A-ZÇĞİÖŞÜa-zçğışöşü])/g, '$1 · ');

  // 9. False inch in middle of dot-list: · N" · → · ØNmm · (for small N)
  s = s.replace(/·\s*(\d{1,2})"\s*·/g, (m, n) => {
    return parseInt(n) <= 20 ? `· Ø${n}mm ·` : m;
  });

  // 10. Bare Nmm → ØNmm  (except after Ø, "Strok ", "Dış ", "İç ")
  s = s.replace(/(?<!Ø)(?<!Strok )(?<!Dış )(?<!İç )\b(\d+)mm\b/g, 'Ø$1mm');

  // 10b. fraction-fraction" → fraction"-fraction" (reducer pipe fittings)
  //    e.g. "Düz Rakor 1/4-3/8"" → "Düz Rakor 1/4"-3/8""
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-(1\/8|1\/4|3\/8|1\/2|3\/4)(?=")/g, '$1"-$2');

  // 10c. fraction-Dış → fraction" · Dış  (stainless somunlu fittings with tube OD/ID)
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-Dış/g, '$1" · Dış');

  // 10d. fraction-\d+$ → fraction" · Ø\d+mm  (thread-to-tube-size at end of string)
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-(\d+)\s*$/g, '$1" · Ø$2mm');

  // 10e. fraction-COLOR_WORD → fraction" · TitleColor  (signal indicators with color suffix)
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-KIRMIZI\b/g, '$1" · Kırmızı');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-SARI\b/g,    '$1" · Sarı');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-YEŞİL\b/g,   '$1" · Yeşil');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-MAVİ\b/g,    '$1" · Mavi');
  s = s.replace(/\b(1\/8|1\/4|3\/8|1\/2|3\/4)-SİYAH\b/g,   '$1" · Siyah');

  // 11. Turkish character / word fixes
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
// XML HELPERS
// ============================================================
function xmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlUnescape(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Parse SST entries — returns array of { raw, text, start, end }
function parseSST(xml) {
  const entries = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml)) !== null) {
    const inner = m[1];
    // Extract all <t> text segments (handles rich text runs too)
    const tRe = /<t(?:\s[^>]*)?>([^<]*)<\/t>/g;
    let tm, rawText = '';
    while ((tm = tRe.exec(inner)) !== null) rawText += tm[1];
    entries.push({
      raw: m[0],
      text: xmlUnescape(rawText),
      index: entries.length,
    });
  }
  return entries;
}

// Build new <si> XML for a plain text value
function buildSI(text) {
  const escaped = xmlEscape(text);
  // Use xml:space="preserve" if value has leading/trailing space
  const needsSpace = /^\s|\s$/.test(text);
  if (needsSpace) {
    return `<si><t xml:space="preserve">${escaped}</t></si>`;
  }
  return `<si><t>${escaped}</t></si>`;
}

// ============================================================
// MAIN
// ============================================================
const BASE_DIR = path.join(__dirname, 'smc_xml_tmp');
const ORIG_FILE = path.join(__dirname, 'SMC_Urun_Kodlari_ve_Aciklamalari');

// Read all files from extracted dir
function readDir(dir) {
  const files = {};
  function walk(d, prefix) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel);
      } else {
        files[rel] = fs.readFileSync(full);
      }
    }
  }
  walk(dir, '');
  return files;
}

const files = readDir(BASE_DIR);

// Parse SST
let sstXml = files['xl/sharedStrings.xml'].toString('utf8');
const sstEntries = parseSST(sstXml);
console.log(`SST entries: ${sstEntries.length}`);

// Build text → index lookup
const textToIdx = new Map();
sstEntries.forEach((e, i) => {
  if (!textToIdx.has(e.text)) textToIdx.set(e.text, i);
});

// Parse G column cells from sheet1.xml
let sheetXml = files['xl/worksheets/sheet1.xml'].toString('utf8');

// Find all G-column shared-string cells: <c r="G\d+" [attr]* t="s" [attr]*><v>N</v></c>
// Also handles <c r="G\d+" t="s" s="N"><v>N</v></c>
const gCellRe = /<c r="G(\d+)"[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/g;
const gCells = [];
let gm;
while ((gm = gCellRe.exec(sheetXml)) !== null) {
  gCells.push({
    rowNum: parseInt(gm[1]),
    sstIdx: parseInt(gm[2]),
    cellXml: gm[0],
  });
}
console.log(`G column cells found: ${gCells.length}`);

// Compute transformations
const newSSTEntries = []; // new entries to append
const sstIdxRemap = new Map(); // oldIdx → newIdx (for G cells)

let changedCount = 0;
const changeSamples = [];

// Group G cells by SST index to avoid redundant work
const bySST = new Map();
for (const gc of gCells) {
  if (!bySST.has(gc.sstIdx)) bySST.set(gc.sstIdx, []);
  bySST.get(gc.sstIdx).push(gc);
}

for (const [sstIdx, cells] of bySST) {
  const entry = sstEntries[sstIdx];
  if (!entry) continue;
  const orig = entry.text;
  const fixed = postProcess(orig);

  if (fixed === orig) continue; // no change needed

  // Find or create SST entry for new text
  let targetIdx;
  if (textToIdx.has(fixed)) {
    targetIdx = textToIdx.get(fixed);
  } else {
    targetIdx = sstEntries.length + newSSTEntries.length;
    newSSTEntries.push(fixed);
    textToIdx.set(fixed, targetIdx);
  }

  sstIdxRemap.set(sstIdx, targetIdx);
  changedCount += cells.length;

  if (changeSamples.length < 30) {
    changeSamples.push({
      rows: cells.map(c => c.rowNum).join(','),
      orig,
      fixed,
    });
  }
}

console.log(`\nRows to update: ${changedCount}`);
console.log(`New SST entries: ${newSSTEntries.length}`);
console.log(`Unique transformations: ${sstIdxRemap.size}`);

// Apply cell index changes to sheet1.xml
for (const [oldIdx, newIdx] of sstIdxRemap) {
  const cells = bySST.get(oldIdx);
  for (const gc of cells) {
    const newCellXml = gc.cellXml.replace(/<v>\d+<\/v>/, `<v>${newIdx}</v>`);
    sheetXml = sheetXml.replace(gc.cellXml, newCellXml);
  }
}

// Append new SST entries to sharedStrings.xml
if (newSSTEntries.length > 0) {
  const newSIs = newSSTEntries.map(t => buildSI(t)).join('');
  sstXml = sstXml.replace('</sst>', newSIs + '</sst>');

  // Update count attributes
  const totalUnique = sstEntries.length + newSSTEntries.length;
  sstXml = sstXml.replace(/uniqueCount="\d+"/, `uniqueCount="${totalUnique}"`);
  // Also update count (rough estimate: increment by new entries * avg refs)
  const countMatch = sstXml.match(/count="(\d+)"/);
  if (countMatch) {
    const newCount = parseInt(countMatch[1]) + newSSTEntries.length;
    sstXml = sstXml.replace(/count="\d+"/, `count="${newCount}"`);
  }
}

// Write updated XML back to file buffer map
files['xl/sharedStrings.xml'] = Buffer.from(sstXml, 'utf8');
files['xl/worksheets/sheet1.xml'] = Buffer.from(sheetXml, 'utf8');

// Repackage as ZIP using fflate
const zipData = {};
for (const [relPath, buf] of Object.entries(files)) {
  zipData[relPath] = [buf, { level: 0 }]; // store without compression (Excel can handle)
}

const zipped = zipSync(zipData);
fs.writeFileSync(ORIG_FILE, Buffer.from(zipped));
console.log(`\nFile written: ${ORIG_FILE}`);

// Print sample changes
console.log('\n=== Sample changes ===');
for (const c of changeSamples) {
  console.log(`Row(s) ${c.rows}:`);
  console.log(`  BEFORE: ${c.orig}`);
  console.log(`  AFTER:  ${c.fixed}`);
}
