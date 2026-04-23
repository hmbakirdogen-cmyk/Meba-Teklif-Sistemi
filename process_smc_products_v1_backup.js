'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMC Ürün Kodları – Profesyonel Türkçe Açıklama Dönüştürücü
// ─────────────────────────────────────────────────────────────────────────────
const XLSX = require('xlsx');
const path = require('path');

const SRC  = 'C:/Users/Admin/Desktop/SMC Ürün Kodları ve Açıklamaları.xls';
const DEST = path.join(__dirname, 'SMC_Urun_Kodlari_Profesyonel_Duzenlenmis.xlsx');

// ═══════════════════════════════════════════════════════════════════════════ //
//  YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════════════ //

const TR_UP = {a:'A',b:'B',c:'C',ç:'Ç',d:'D',e:'E',f:'F',g:'G',ğ:'Ğ',h:'H',
  ı:'I',i:'İ',j:'J',k:'K',l:'L',m:'M',n:'N',o:'O',ö:'Ö',p:'P',r:'R',s:'S',
  ş:'Ş',t:'T',u:'U',ü:'Ü',v:'V',y:'Y',z:'Z',q:'Q',w:'W',x:'X'};

function trUp(c) { return TR_UP[c] || c.toUpperCase(); }

// Türkçe başlık formatı
function titleTR(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[·\s\-\/\(,])([a-züğışçöıa-z])/g, (m, sep, c) => sep + trUp(c));
}

// Değeri temizle
function clean(v) {
  return v == null ? '' : String(v).trim().replace(/\s+/g, ' ');
}

// Sayısal değer mi?
function isNum(v) { return v !== null && v !== undefined && v !== '' && !isNaN(Number(v)); }

// ═══════════════════════════════════════════════════════════════════════════ //
//  BOYUT ÇIKARICI – İngilizce açıklamadan Ø ve Strok
// ═══════════════════════════════════════════════════════════════════════════ //
function extractDims(eng) {
  if (!eng) return {};
  const s = eng.toUpperCase();
  const d  = s.match(/[Øø]\s*(\d+(?:[.,]\d+)?)/);
  const st = s.match(/STR\s*[=:]\s*(\d+)/);
  return { diam: d ? d[1].replace(',','.') : null, stroke: st ? st[1] : null };
}

// İngilizce rakor açıklamasından diş ve hortum ölçüsü
function extractFittingDims(eng) {
  if (!eng) return {};
  const s = eng.toUpperCase();
  const result = {};
  const tm = s.match(/([\d\/]+)\s+MALE THREAD/);
  if (tm) result.thread = tm[1] + '"';
  else {
    const tm2 = s.match(/R,\s*([\d\/]+)/);
    if (tm2) result.thread = tm2[1] + '"';
    else {
      const tm3 = s.match(/\bM(\d+)\b/);
      if (tm3 && parseInt(tm3[1]) <= 16) result.thread = 'M' + tm3[1];
    }
  }
  const tubeM = s.match(/[Øø]\s*(\d+(?:[.,]\d+)?)\s*(?:TUBE|MM|$)/);
  if (tubeM) result.tube = tubeM[1];
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  TR AÇIKLAMA TEMİZLEYİCİ – temel kurallar
// ═══════════════════════════════════════════════════════════════════════════ //
function cleanBase(tr) {
  if (!tr) return '';
  let s = clean(tr);
  // Baştaki * kaldır
  s = s.replace(/^\*+/, '').trim();
  // Türkçe başlık formatına çevir
  s = titleTR(s);
  return s;
}

// Hortum ölçüsünden önce Ø ekle (yoksa)
function ensureOhm(numStr) {
  return 'Ø' + numStr.replace(/^Ø/i, '');
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  SİLİNDİR İŞLEYİCİ
// ═══════════════════════════════════════════════════════════════════════════ //
function processCylinder(code, eng, tr) {
  const base = cleanBase(tr);
  const dims = extractDims(eng);
  const engU = (eng || '').toUpperCase();

  // Tip bilgisini TR'den al – parantez içini koru ama formatla
  // Ör: "PROFİL SİLİNDİR (ISO/VDMA)" → "Profil Silindir · ISO/VDMA"
  let type = base;

  // Parantez içindeki standart/nitelik bilgisini · ile ayır
  const parenM = type.match(/^(.*?)\s*\((.+?)\)\s*(.*)$/);
  let mainType = type;
  let qualifier = '';
  if (parenM) {
    mainType = parenM[1].trim() + (parenM[3] ? ' ' + parenM[3].trim() : '');
    qualifier = parenM[2].trim();
    mainType = mainType.trim();
  }

  // İngilizce'den boyut mevcut mu?
  const hasDim = dims.diam || dims.stroke;

  // Parts dizisi
  const parts = [mainType];
  if (qualifier) parts.push(qualifier);
  if (dims.diam)   parts.push(`Ø${dims.diam}mm`);
  if (dims.stroke) parts.push(`Strok ${dims.stroke}mm`);

  // Ekstra nitelikler (sadece etiket zaten yoksa)
  const baseL = base.toLowerCase();
  if (/magnet|magnetic|with magnet/i.test(engU) && !/manyetik/.test(baseL))
    parts.push('Manyetik');
  if (/double rod/i.test(engU) && !/çift milli/.test(baseL) && !/double rod/.test(baseL))
    parts.push('Çift Milli');

  return parts.filter(Boolean).join(' · ');
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  RAKOR / BAĞLANTI İŞLEYİCİ
// ═══════════════════════════════════════════════════════════════════════════ //

// TR'deki "TYPE THREAD-TUBEmm" → "Type · Thread · ØTubemm"
function formatFitting(tr, eng) {
  const base = cleanBase(tr);

  // Zaten · içeriyor → sadece temizle
  if (base.includes('·')) return base;

  // Ör: "Hız Ayar Valfi 1/4-8mm" veya "Düz Rakor 1/4-8mm"
  // veya "2'li Dirsek Rakor 3/8-8mm"
  // Sonunda "THREAD-TUBEmm" pattern
  const m1 = base.match(/^(.+?)\s+((?:M\d+|[\d\/]+)(?:[""]?))\s*[-–]\s*Ø?(\d+(?:[.,]\d+)?)mm\s*$/i);
  if (m1) {
    const type   = m1[1].trim();
    let thread = m1[2].trim();
    if (/^[\d\/]+$/.test(thread) && !thread.includes('"')) thread += '"';
    const tube = m1[3];
    return `${type} · ${thread} · Ø${tube}mm`;
  }

  // Ör: "Düz Rakor 1/4-8mm" (değişik ayraç)
  const m2 = base.match(/^(.+?)\s+((?:M\d+|[\d\/]+)(?:[""]?))[-–](\d+)mm\s*$/i);
  if (m2) {
    const type   = m2[1].trim();
    let thread = m2[2].trim();
    if (/^[\d\/]+$/.test(thread)) thread += '"';
    const tube = m2[3];
    return `${type} · ${thread} · Ø${tube}mm`;
  }

  // Sonda sadece "Nxmm" var → "Type · Ø Nmm"
  const m3 = base.match(/^(.+?)\s+Ø?(\d+(?:[.,]\d+)?)mm\s*$/i);
  if (m3) return `${m3[1].trim()} · Ø${m3[2]}mm`;

  // İngilizce'den ölçüleri al
  if (eng) {
    const fd = extractFittingDims(eng);
    if (fd.tube) {
      const parts = [base];
      if (fd.thread) parts.push(fd.thread);
      parts.push(`Ø${fd.tube}mm`);
      return parts.join(' · ');
    }
  }

  return base;
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  VALF İŞLEYİCİ
// ═══════════════════════════════════════════════════════════════════════════ //
function processValve(code, eng, tr) {
  const base = cleanBase(tr);

  // Zaten iyi formatlanmış (içinde · var ya da detaylı) → sadece döndür
  if (base.includes('·') || base.length > 25) return base;

  // Sadece "2/2 Bobinli Valf" gibi çıplak açıklama → İngilizce'den tamamla
  const engU = (eng || '').toUpperCase();

  // Direk kumandalı / Pilot kumandalı bilgisi
  let prefix = '';
  if (/DIRECT OPERATED/i.test(engU)) prefix = 'Direkt Kumandalı ';
  else if (/PILOT OPERATED/i.test(engU)) prefix = 'Pilot Kumandalı ';

  // Çok-portlu bilgi TR'de mevcut değilse İngilizce'den çıkar
  const portM = engU.match(/^(\d)\s*PORT/);
  if (portM && !base.match(/^\d\/\d/)) {
    const portCount = portM[1];
    // Standart türler: 2 port → 2/2, 3 port → 3/2 veya 3/3, 5 port → 5/2 veya 5/3
    const portMap = {'2':'2/2','3':'3/2','5':'5/2'};
    const portStr = portMap[portCount] || portCount + ' Port';
    const typeStr = prefix + portStr + ' Selenoid Valf';
    return typeStr;
  }

  return prefix + base;
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  GENEL İŞLEYİCİ – diğer ürün tipleri
// ═══════════════════════════════════════════════════════════════════════════ //
function processGeneral(code, eng, tr) {
  if (!tr || !tr.toString().trim()) {
    // TR yok → İngilizce'den çevir
    return buildFromEng(code, eng);
  }
  return cleanBase(tr);
}

// İngilizce açıklamadan Türkçe üret
const ENG_TR_MAP = [
  [/^BLANKING PLATE/i,         'Körleme Plakası'],
  [/^DIGITAL FLOW SWITCH/i,    'Dijital Akış Şalteri'],
  [/^FLOW SWITCH/i,            'Akış Şalteri'],
  [/^DIGITAL PRESSURE SWITCH/i,'Dijital Basınç Şalteri'],
  [/^PRESSURE SWITCH/i,        'Basınç Şalteri'],
  [/^PRESSURE SENSOR/i,        'Basınç Sensörü'],
  [/^PRESSURE GAUGE/i,         'Manometre'],
  [/^PRESSURE REGULATOR/i,     'Basınç Regülatörü'],
  [/^PRECISION REGULATOR/i,    'Hassas Regülatör'],
  [/^MODULAR STYLE REGULATOR/i,'Modüler Regülatör'],
  [/^ELECTRO.PNEUMATIC REGULATOR/i,'ElektroPnömatik Regülatör'],
  [/^FILTER REGULATOR/i,       'Filtre Regülatörü'],
  [/^MAIN LINE FILTER/i,       'Ana Hat Filtresi'],
  [/^AIR FILTER/i,             'Hava Filtresi'],
  [/^MIST SEPARATOR/i,         'Sis Ayırıcı'],
  [/^LUBRICATOR/i,             'Yağlayıcı'],
  [/^VACUUM PAD/i,             'Vantuz'],
  [/^VACUUM EJECTOR/i,         'Vakum Ejektörü'],
  [/^VACUUM GENERATOR/i,       'Vakum Üreteci'],
  [/^VACUUM FILTER/i,          'Vakum Filtresi'],
  [/^AUTO SWITCH/i,            'Manyetik Sensör'],
  [/^SPEED CONTROLLER/i,       'Hız Kontrolörü'],
  [/^CHECK VALVE/i,            'Çek Valf'],
  [/^SOLENOID VALVE/i,         'Selenoid Valf'],
  [/^MANIFOLD BASE/i,          'Manifold Altlığı'],
  [/^MANIFOLD BLOCK/i,         'Manifold Bloğu'],
  [/^AIR GRIPPER/i,            'Pnömatik Tutucu'],
  [/^GRIPPER/i,                'Tutucu'],
  [/^SEAL KIT/i,               'Conta Takımı'],
  [/^MAINTENANCE KIT/i,        'Bakım Seti'],
  [/^REPAIR KIT/i,             'Tamir Seti'],
  [/^PACKING SET/i,            'Salmastra Seti'],
  [/^SEAL/i,                   'Conta'],
  [/^ROTARY ACTUATOR/i,        'Döner Aktüatör'],
  [/^ELECTRIC ACTUATOR/i,      'Elektrikli Aktüatör'],
  [/^LINEAR ACTUATOR/i,        'Lineer Aktüatör'],
  [/^ROTARY CLAMP/i,           'Döner Kenetleme Silindiri'],
  [/^AIR SLIDE TABLE/i,        'Hava Kaymalı Tabla'],
  [/^COMPACT GUIDE/i,          'Yataklamalı Kompakt Silindir'],
  [/^GUIDE ROD TYPE/i,         'Kılavuz Milli Silindir'],
  [/^ONE.TOUCH FITTING/i,      'Sıkıştırmalı Rakor'],
  [/^BRASS FITTING/i,          'Pirinç Rakor'],
  [/^FITTING/i,                'Rakor'],
  [/^TUBE/i,                   'Hortum'],
  [/^ELEMENT/i,                'Filtre Elemanı'],
  [/^BRACKET/i,                'Braket'],
  [/^CONTROLLER/i,             'Kontrolör'],
  [/^SENSOR/i,                 'Sensör'],
  [/^SWITCH/i,                 'Şalter'],
  [/^CONNECTOR/i,              'Konnektör'],
  [/^CABLE/i,                  'Kablo'],
];

function buildFromEng(code, eng) {
  if (!eng || !eng.trim()) return code;
  const s = eng.trim();
  for (const [re, tr] of ENG_TR_MAP) {
    if (re.test(s)) {
      // İngilizce'den boyutları çıkar ve ekle
      const dims = extractDims(s);
      const parts = [tr];
      if (dims.diam)   parts.push(`Ø${dims.diam}mm`);
      if (dims.stroke) parts.push(`Strok ${dims.stroke}mm`);
      return parts.join(' · ');
    }
  }
  // Çeviri bulunamadı → İngilizce'yi temizleyip döndür
  return s
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)([A-Z])/g, (m, sep, c) => sep + c)
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  KATEGORI DEDEKTÖRÜ
// ═══════════════════════════════════════════════════════════════════════════ //
function detectCategory(code, eng, tr) {
  const trU = (tr || '').toUpperCase();
  const engU = (eng || '').toUpperCase();
  const codeU = (code || '').toUpperCase();

  if (/SİLİNDİR|CYLINDER|PISTON|ACTUATOR/.test(trU) ||
      /CYLINDER|ROTARY CLAMP|SLIDE TABLE|AIR GRIPPER/.test(engU) ||
      /^CD|^CJ|^CM|^CP|^CQ|^CX|^C[0-9]|^MGPM|^MGPL|^MGJ|^MGZ|^MY|^MX|^MB|^CK/.test(codeU))
    return 'cylinder';

  if (/RAKOR|REKOR|DİRSEK|DAĞITI|KÖRTAPA|SUSTURUCU|PERDE GEÇİŞ|SPEED CONTROLLER/.test(trU) ||
      /FITTING|SILENCER|SPEED CONTROLLER/.test(engU) ||
      /^KQ|^KJ|^KK|^KF|^KS|^KX|^AN\d|^DT|^ASV/.test(codeU))
    return 'fitting';

  if (/VALF|VALVE/.test(trU) || /VALVE|SOLENOID/.test(engU) ||
      /^SY|^VQ|^VX|^VH|^VP|^VT|^VF|^EV[GMT]|^VM|^V[0-9]|^EAV|^ASQ|^ASR|^ASP|^ASN/.test(codeU))
    return 'valve';

  return 'general';
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  ANA DÖNÜŞTÜRÜCÜ
// ═══════════════════════════════════════════════════════════════════════════ //
function transform(code, eng, tr) {
  const c = clean(code);
  const e = clean(eng);
  const t = clean(tr);

  if (!c && !e && !t) return '';

  const cat = detectCategory(c, e, t);

  if (!t) {
    // TR açıklama yok → İngilizce'den üret
    if (cat === 'cylinder') return processCylinder(c, e, '');
    return buildFromEng(c, e);
  }

  switch (cat) {
    case 'cylinder': return processCylinder(c, e, t);
    case 'fitting':  return formatFitting(t, e);
    case 'valve':    return processValve(c, e, t);
    default:         return processGeneral(c, e, t);
  }
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  KONTROL & İSTATİSTİK
// ═══════════════════════════════════════════════════════════════════════════ //
const stats = {
  total: 0,
  dimExtracted: 0,
  trEmpty: 0,
  trGenerated: 0,
  suspicious: 0,
};
const suspiciousRows = [];

function checkRow(origTR, result, code, rowIdx) {
  stats.total++;
  if (!origTR || !origTR.toString().trim()) {
    stats.trEmpty++;
    if (result) stats.trGenerated++;
  }
  // Boyut eklenip eklenmediğini kontrol et (sadece silindir için)
  if (/silindir|cylinder/i.test(origTR || '') && result.includes('Ø') && !origTR.includes('Ø')) {
    stats.dimExtracted++;
  }
  // Şüpheli: Sonuç çok kısa ya da boş
  if (!result || result.length < 3) {
    stats.suspicious++;
    suspiciousRows.push({ rowIdx, code, origTR, result });
  }
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  EXCEL OKUMA & YAZMA
// ═══════════════════════════════════════════════════════════════════════════ //
console.log('Kaynak dosya okunuyor:', SRC);
const wb = XLSX.readFile(SRC);
const sheetName = 'TR AÇIKLAMALAR';
const ws = wb.Sheets[sheetName];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

const header = raw[0];  // ['Cust no Name        ', 'Item number         ', 'Item number         ', 'Item Description    ', 'TR AÇIKLAMA']
const dataRows = raw.slice(1);

console.log(`Toplam satır: ${dataRows.length}`);
console.log('Sütunlar:', header);

// Çıkış satırları: orijinal sütunlar + 2 yeni sütun
const outRows = [];

// Başlık
const newHeader = [...header, 'DÜZENLENMİŞ ÜRÜN KODU', 'PROFESYONEL TÜRKÇE AÇIKLAMA'];
outRows.push(newHeader);

for (let i = 0; i < dataRows.length; i++) {
  const row = dataRows[i];
  if (!row || row.length === 0) {
    outRows.push([...row, '', '']);
    continue;
  }

  // Sütunlar: [0]=companyName, [1]=itemNumber, [2]=productCode, [3]=engDesc, [4]=trDesc
  const productCode = clean(row[2] || '');
  const engDesc     = clean(row[3] || '');
  const trDesc      = clean(row[4] || '');

  const cleanedCode = productCode;  // Olduğu gibi kopyala
  const proDesc     = transform(productCode, engDesc, trDesc);

  checkRow(trDesc, proDesc, productCode, i + 2);

  outRows.push([...row, cleanedCode, proDesc]);
}

// ─── YENİ EXCEL OLUŞTUR ─────────────────────────────────────────────────── //
console.log('\nYeni Excel dosyası oluşturuluyor...');
const newWB = XLSX.utils.book_new();
const newWS = XLSX.utils.aoa_to_sheet(outRows);

// Sütun genişlikleri
newWS['!cols'] = [
  { wch: 40 },  // Cust no Name
  { wch: 12 },  // Item number
  { wch: 30 },  // Product code
  { wch: 55 },  // Eng desc
  { wch: 45 },  // TR AÇIKLAMA
  { wch: 30 },  // DÜZENLENMİŞ ÜRÜN KODU
  { wch: 55 },  // PROFESYONEL TÜRKÇE AÇIKLAMA
];

// Başlık satırı hücre biçimleri
const headerStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1F4E79' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
};

// Yeni sütun başlıklarını renklendir (openpyxl yoksa XLSX ile sınırlı stilleme)
const lastColIdx = newHeader.length - 1;
const lastColIdx2 = newHeader.length - 2;

// Oto-filtre
newWS['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(newHeader.length - 1)}1` };

XLSX.utils.book_append_sheet(newWB, newWS, sheetName);
XLSX.writeFile(newWB, DEST, { bookType: 'xlsx', type: 'buffer' });

console.log('\n✓ Dosya kaydedildi:', DEST);

// ─── ÖZET RAPOR ─────────────────────────────────────────────────────────── //
console.log('\n══════════════════════════════');
console.log('            ÖZET');
console.log('══════════════════════════════');
console.log(`Toplam işlenen satır    : ${stats.total}`);
console.log(`Boyut çıkarılan satır   : ${stats.dimExtracted}`);
console.log(`Boş TR → tamamlanan     : ${stats.trGenerated} / ${stats.trEmpty}`);
console.log(`Şüpheli satır sayısı    : ${stats.suspicious}`);

if (suspiciousRows.length > 0) {
  console.log('\nŞüpheli satırlar (ilk 20):');
  suspiciousRows.slice(0, 20).forEach(r =>
    console.log(`  Satır ${r.rowIdx}: [${r.code}] "${r.origTR}" → "${r.result}"`)
  );
}
console.log('\nİşlem tamamlandı.');
