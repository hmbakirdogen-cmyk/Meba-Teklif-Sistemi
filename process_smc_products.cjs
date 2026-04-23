'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMC Ürün Kodları – Profesyonel Türkçe Açıklama Dönüştürücü  v3
// ─────────────────────────────────────────────────────────────────────────────
const XLSX = require('xlsx');
const path = require('path');

const SRC  = 'C:/Users/Admin/Desktop/SMC Ürün Kodları ve Açıklamaları.xls';
const DEST = path.join(__dirname, 'SMC_Urun_Kodlari_Profesyonel_Duzenlenmis.xlsx');

// ═══════════════════════════════════════════════════════════════════════════ //
//  TÜRKÇE BAŞLIK FORMATI
// ═══════════════════════════════════════════════════════════════════════════ //

const KEEP_UPPER = new Set([
  'ISO','IEC','VDC','VAC','AC','DC','IP','LED','ATEX','VDMA','NPN','PNP',
  'NC','NO','CE','DIN','BSP','NPT','NAMUR','IP40','IP67','IP65',
  'EMC','VDE','CSA','UL','ROHS','CW','CCW','CR','CB',
]);

// Türkçe kelimeler: 2-3 BÜYÜK HARFLİ olsalar da kısaltma değil
const NOT_ABBR = new Set(['RAY','BOŞ','BUJ','KAP','TAŞ','HAT','BOY','GÖZ','TEK','SOL','SAĞ','ÜST','ALT','ORT','AĞ']);

function titleWordTR(w) {
  if (!w) return w;

  // Rakam içeriyorsa (24VDC, 1/4, M5, 0-10 bar, 1,5kW…)
  if (/\d/.test(w)) {
    // "2'Lİ" → "2'li"  özel ulama durumu
    const apoM = w.match(/^(\d+)'([A-ZÜĞİŞÇÖIİ]+)$/);
    if (apoM) return apoM[1] + "'" + apoM[2].toLocaleLowerCase('tr');
    return w;
  }

  // Bilinen teknik kısaltma
  if (KEEP_UPPER.has(w.toUpperCase())) return w.toUpperCase();

  // 2-3 saf ASCII büyük harf → kısaltma (Türkçe sözcükler hariç)
  if (/^[A-Z]{2,3}$/.test(w) && !NOT_ABBR.has(w)) return w;

  // Baştaki ve sondaki noktalama işaretlerini koru
  const m = w.match(/^([^A-Za-zÀ-ɏ]*)(.+?)([^A-Za-zÀ-ɏ]*)$/);
  if (m && m[2]) {
    const lower  = m[2].toLocaleLowerCase('tr');
    const titled = lower.charAt(0).toLocaleUpperCase('tr') + lower.slice(1);
    return m[1] + titled + m[3];
  }

  const lower = w.toLocaleLowerCase('tr');
  if (!lower) return w;
  return lower.charAt(0).toLocaleUpperCase('tr') + lower.slice(1);
}

function titleTR(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ')
    .split(' ')
    .map(w => titleWordTR(w))
    .join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════════════ //

function clean(v) {
  return v == null ? '' : String(v).trim().replace(/\s+/g, ' ');
}

function cleanBase(tr) {
  return titleTR(clean(tr).replace(/^\*+/, '').trim());
}

function joinDots(...parts) {
  return parts.filter(p => p && String(p).trim()).join(' · ');
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  BOYUT ÇIKARICI
// ═══════════════════════════════════════════════════════════════════════════ //

function extractDims(eng) {
  if (!eng) return {};
  const s = String(eng);
  const dM = s.match(/[ØøØø]\s*(\d+(?:[.,]\d+)?)/);
  const sM = s.match(/STR\s*=\s*(\d+)/i);
  return {
    diam:   dM ? dM[1].replace(',', '.') : null,
    stroke: sM ? sM[1] : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  SİLİNDİR TİPİ – İNGİLİZCEDEN (TR boşsa)
// ═══════════════════════════════════════════════════════════════════════════ //

function cylTypeFromEng(eng) {
  if (!eng) return 'Pnömatik Silindir';
  const u = String(eng).toUpperCase();
  if (/ISO\s+15552/.test(u))                    return 'Profil Silindir · ISO 15552';
  if (/ISO\s+6432/.test(u))                     return 'ISO Silindir · ISO 6432';
  if (/ISO\s+21287/.test(u))                    return 'Kompakt Silindir · ISO 21287';
  if (/COMPACT\s+GUIDE\s+CYLINDER/.test(u))     return 'Yataklamalı Kompakt Silindir';
  if (/COMPACT\s+SLIDE/.test(u))                return 'Kompakt Kızaklı Silindir';
  if (/COMPACT\s+CYLINDER/.test(u))             return 'Kompakt Silindir';
  if (/DUAL\s+ROD\s+CYLINDER/.test(u))          return 'Çift Milli Silindir';
  if (/FREE\s+MOUNT\s+CYLINDER/.test(u))        return 'Serbest Montaj Silindiri';
  if (/SMOOTH\s+CYLINDER/.test(u))              return 'Düzgün Yüzey Silindiri';
  if (/AIR\s+SLIDE\s+TABLE/.test(u))            return 'Tablalı Kızaklı Silindir';
  if (/MECHANICALLY\s+COUPLED\s+RODLESS/.test(u)) return 'Mekanik Kuplajlı Milsiz Silindir';
  if (/MECHANICALLY\s+JOINTED\s+RODLESS/.test(u)) return 'Mekanik Eklemli Milsiz Silindir';
  if (/GUIDE\s+ROD/.test(u))                    return 'Kılavuz Milli Silindir';
  if (/AIR\s+CYLINDER/.test(u))                 return 'Pnömatik Silindir';
  if (/CYLINDER/.test(u))                       return 'Pnömatik Silindir';
  return 'Pnömatik Silindir';
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  SİLİNDİR İŞLEYİCİ
// ═══════════════════════════════════════════════════════════════════════════ //

function processCylinder(code, eng, tr) {
  const dims = extractDims(eng);
  const engU = (eng || '').toUpperCase();
  const base = clean(tr).replace(/^\*+/, '').trim();

  let mainType, qualifier;
  if (base) {
    const parenM = base.match(/^(.*?)\s*\((.+?)\)\s*(.*)$/);
    if (parenM) {
      mainType  = titleTR((parenM[1] + (parenM[3] ? ' ' + parenM[3] : '')).trim());
      qualifier = parenM[2].trim();
    } else {
      mainType  = titleTR(base);
      qualifier = '';
    }
  } else {
    // TR boşsa İngilizce açıklamadan tip çıkar
    mainType  = cylTypeFromEng(eng);
    qualifier = '';
  }

  // Boyut yoksa sadece mevcut TR döndür
  if (!dims.diam && !dims.stroke) {
    return qualifier ? joinDots(mainType, qualifier) : mainType;
  }

  const dimParts = [];
  if (dims.diam)   dimParts.push('Ø' + dims.diam + 'mm');
  if (dims.stroke) dimParts.push('Strok ' + dims.stroke + 'mm');

  const mainL = (mainType || '').toLowerCase();
  const magnetStr = (/\bWITH\s+MAGNET\b|MAGNETIC/.test(engU) && !mainL.includes('manyetik'))
    ? 'Manyetik' : null;

  // joinDots filters empty/null parts – prevents leading " · " when mainType is empty
  return joinDots(mainType, qualifier, ...dimParts, magnetStr);
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  RAKOR / BAĞLANTI İŞLEYİCİ
// ═══════════════════════════════════════════════════════════════════════════ //

function processFitting(code, eng, tr) {
  const base = cleanBase(tr);

  if (base.includes('·')) return base;

  const m1 = base.match(/^(.+?)\s+((?:M\d+|[\d\/]+)[""]?)\s*[-–]\s*Ø?(\d+(?:[.,]\d+)?)mm\s*$/i);
  if (m1) {
    let thread = m1[2].trim();
    if (/^[\d\/]+$/.test(thread) && !thread.includes('"')) thread += '"';
    return joinDots(m1[1].trim(), thread, 'Ø' + m1[3] + 'mm');
  }

  const m2 = base.match(/^(.+?)\s+((?:M\d+|[\d\/]+)[""]?)[-–](\d+)mm\s*$/i);
  if (m2) {
    let thread = m2[2].trim();
    if (/^[\d\/]+$/.test(thread)) thread += '"';
    return joinDots(m2[1].trim(), thread, 'Ø' + m2[3] + 'mm');
  }

  const m3 = base.match(/^(.+?)\s+[Øø]?(\d+(?:[.,]\d+)?)mm\s*$/i);
  if (m3) return joinDots(m3[1].trim(), 'Ø' + m3[2] + 'mm');

  if (eng) {
    const threadM = eng.match(/([\d\/]+)\s+MALE\s+THREAD/i);
    const tubeM   = eng.match(/[Øø]\s*(\d+(?:[.,]\d+)?)\s*(?:TUBE)?/i);
    if (tubeM) {
      const parts = [base];
      if (threadM) parts.push(threadM[1] + '"');
      parts.push('Ø' + tubeM[1] + 'mm');
      return joinDots(...parts);
    }
  }

  return base;
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  VALF İŞLEYİCİ
// ═══════════════════════════════════════════════════════════════════════════ //

function processValve(code, eng, tr) {
  if (!tr || !tr.trim()) return buildFromEng(code, eng);

  const base = cleanBase(tr);
  const engU = (eng || '').toUpperCase();

  if (base.length > 30 || base.includes('·')) return base;

  let prefix = '';
  if (/DIRECT\s+OPERATED/i.test(engU))     prefix = 'Direkt Kumandalı ';
  else if (/PILOT\s+OPERATED/i.test(engU)) prefix = 'Pilot Kumandalı ';

  return prefix.length ? prefix + base : base;
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  İNGİLİZCE → TÜRKÇE (TR yoksa)
// ═══════════════════════════════════════════════════════════════════════════ //

const ENG_TO_TR = [
  // Silindirler
  [/^ISO\s+15552\s+CYLINDER/i,                  'Profil Silindir · ISO 15552'],
  [/^ISO\s+6432\s+CYLINDER/i,                   'ISO Silindir · ISO 6432'],
  [/^ISO\s+21287\s+COMPACT\s+CYLINDER/i,        'Kompakt Silindir · ISO 21287'],
  [/^COMPACT\s+GUIDE\s+CYLINDER/i,              'Yataklamalı Kompakt Silindir'],
  [/^COMPACT\s+SLIDE/i,                         'Kompakt Kızaklı Silindir'],
  [/^COMPACT\s+CYLINDER/i,                      'Kompakt Silindir'],
  [/^FREE\s+MOUNT\s+CYLINDER/i,                 'Serbest Montaj Silindiri'],
  [/^SMOOTH\s+CYLINDER/i,                       'Düzgün Yüzey Silindiri'],
  [/^AIR\s+CYLINDER/i,                          'Pnömatik Silindir'],
  [/^MECHANICALLY\s+COUPLED\s+RODLESS/i,        'Mekanik Kuplajlı Milsiz Silindir'],
  [/^DUAL\s+ROD\s+CYLINDER/i,                   'Çift Milli Silindir'],
  [/^GUIDE\s+ROD\s+TYPE/i,                      'Kılavuz Milli Silindir'],
  [/^ROTARY\s+CLAMP\s+CYLINDER/i,               'Döner Kenetleme Silindiri'],
  [/^AIR\s+SLIDE\s+TABLE/i,                     'Tablalı Kızaklı Silindir'],
  [/^MECHANICALLY\s+JOINTED\s+RODLESS/i,        'Mekanik Eklemli Milsiz Silindir'],
  // Sensörler / Şalterler
  [/^BLANKING\s+PLATE/i,                        'Körleme Plakası'],
  [/^DIGITAL\s+FLOW\s+SWITCH/i,                 'Dijital Akış Şalteri'],
  [/^FLOW\s+SWITCH/i,                           'Akış Şalteri'],
  [/^DIGITAL\s+PRESSURE\s+SWITCH/i,             'Dijital Basınç Şalteri'],
  [/^PRESSURE\s+SWITCH/i,                       'Basınç Şalteri'],
  [/^PRESSURE\s+SENSOR/i,                       'Basınç Sensörü'],
  [/^PRESSURE\s+GAUGE/i,                        'Manometre'],
  // Regülatörler / Filtreler
  [/^PRECISION\s+REGULATOR/i,                   'Hassas Regülatör'],
  [/^MODULAR\s+STYLE\s+REGULATOR/i,             'Modüler Regülatör'],
  [/^ELECTRO.PNEUMATIC\s+REGULATOR/i,           'Elektro-Pnömatik Regülatör'],
  [/^INTERFACE\s+REGULATOR/i,                   'Ara Regülatör'],
  [/^FILTER\s+REGULATOR/i,                      'Filtre Regülatörü'],
  [/^MAIN\s+LINE\s+FILTER/i,                    'Ana Hat Filtresi'],
  [/^AIR\s+FILTER/i,                            'Hava Filtresi'],
  [/^MIST\s+SEPARATOR/i,                        'Sis Ayırıcı'],
  [/^LUBRICATOR/i,                              'Yağlayıcı'],
  [/^REGULATOR/i,                               'Regülatör'],
  // Vakum
  [/^VACUUM\s+PAD/i,                            'Vantuz'],
  [/^VACUUM\s+EJECTOR/i,                        'Vakum Ejektörü'],
  [/^VACUUM\s+GENERATOR/i,                      'Vakum Üreteci'],
  [/^VACUUM\s+FILTER/i,                         'Vakum Filtresi'],
  // Otomatik şalterler / Sensörler
  [/^AUTO[\s\-]?SWITCH/i,                       'Manyetik Sensör'],
  [/^SPEED\s+CONTROLLER/i,                      'Hız Kontrolörü'],
  // Valf
  [/^BRASS\s+BODY\s+CHECK\s+VALVE/i,            'Çek Valf · Pirinç Gövde'],
  [/^CHECK\s+VALVE/i,                           'Çek Valf'],
  [/^VALVE\s+SEAL/i,                            'Valf Contası'],
  [/^5\s+PORT\s+SOLEN/i,                        'Selenoid Valf · 5/2'],
  [/^3\s+PORT\s+SOLEN/i,                        'Selenoid Valf · 3/2'],
  [/^2\s+PORT\s+SOLEN/i,                        'Selenoid Valf · 2/2'],
  [/^SOLENOID\s+VALVE/i,                        'Selenoid Valf'],
  [/^MANIFOLD\s+BASE/i,                         'Valf Altlığı'],
  [/^MANIFOLD\s+BLOCK/i,                        'Manifold Bloğu'],
  // Tutucular / Diğer aktüatörler
  [/^AIR\s+GRIPPER/i,                           'Pnömatik Tutucu'],
  [/^GRIPPER/i,                                 'Tutucu'],
  [/^ROTARY\s+ACTUATOR/i,                       'Döner Aktüatör'],
  [/^ELECTRIC\s+ACTUATOR/i,                     'Elektrikli Aktüatör'],
  [/^LINEAR\s+ACTUATOR/i,                       'Lineer Aktüatör'],
  // Takım / Bakım / Yedek parça
  [/^SEAL\s+KIT/i,                              'Conta Takımı'],
  [/^MAINTENANCE\s+KIT/i,                       'Bakım Seti'],
  [/^REPAIR\s+KIT/i,                            'Tamir Seti'],
  [/^PACKING\s+SET/i,                           'Salmastra Seti'],
  [/^SPARE\s+PART/i,                            'Yedek Parça'],
  // Özel filtreler
  [/^ACTIVATED\s+CARBON\s+FILTER/i,             'Aktif Karbon Filtresi'],
  [/^MICRO[\s\-]MIST\s+SEPARATOR/i,             'Mikro Sis Ayırıcı'],
  [/^IN[\s\-]LINE\s+AIR\s+FILTER/i,             'Hat İçi Hava Filtresi'],
  [/^FILTER\s+ELEMENT/i,                        'Filtre Elemanı'],
  // Tahliye / Yumuşak start
  [/^AUTO[\s\-]DRAIN/i,                         'Otomatik Tahliye'],
  [/^DRAIN\s+(COCK|VALVE)/i,                    'Tahliye Musluğu'],
  [/^SOFT[\s\-]START[\s\-]UP\s+VALVE/i,         'Yavaş Başlatma Valfi'],
  [/^SOFT[\s\-]START\s+(VALVE|UP)/i,            'Yavaş Başlatma Valfi'],
  // Spesifik valf/regülatör
  [/^ISO\s+5599.+SOLENOID/i,                    'Selenoid Valf · ISO 5599'],
  [/^DIRECT\s+OPERATED\s+PRECISION\s+REGULATOR/i, 'Direkt Kumandalı Hassas Regülatör'],
  [/^DIRECT\s+OPERATED.+REGULATOR/i,            'Direkt Kumandalı Regülatör'],
  [/^NEEDLE\s+VALVE/i,                          'İğne Valfi'],
  [/^BALL\s+VALVE/i,                            'Küresel Valf'],
  [/^SHUTOFF\s+VALVE/i,                         'Kapatma Valfi'],
  [/^BACK\s+PRESSURE\s+VALVE/i,                 'Geri Basınç Valfi'],
  [/^VALVE\s+GUIDE\s+ASSEMBLY/i,                'Valf Kılavuz Tertibatı'],
  [/^VALVE\s+GUIDE/i,                           'Valf Kılavuzu'],
  // Elektrik aktüatörleri
  [/^ELECTRIC\s+ACTUATOR\s+WITH\s+SCREW/i,      'Vidalı Tahrikli Elektrik Aktüatörü'],
  [/^ELECTRIC\s+ACTUATOR\s+ROD/i,               'Milli Elektrik Aktüatörü'],
  [/^ELECTRIC\s+ACTUATOR\s+TABLE/i,             'Tablalı Elektrik Aktüatörü'],
  // Mekanik parçalar
  [/^SINGLE\s+REAR\s+CLEVIS/i,                  'Tek Arka Eklem Bağlantısı'],
  [/^DOUBLE\s+(REAR\s+)?CLEVIS/i,               'Çift Arka Eklem Bağlantısı'],
  [/^CLEVIS/i,                                  'Eklem Bağlantısı'],
  [/^SWINGING\s+NOZZLE/i,                       'Döner Meme'],
  [/^LOCK\s+UNIT/i,                             'Kilit Ünitesi'],
  // Elektronik
  [/^STEP\s+MOTOR\s+DRIVER/i,                   'Adım Motor Sürücüsü'],
  [/^FAN\s+TYPE\s+IONIZER/i,                    'Fan Tipi İyonizatör'],
  [/^IONIZER/i,                                 'İyonizatör'],
  [/^SERIAL\s+INTERFACE/i,                      'Seri Haberleşme Arayüzü'],
  [/^DIGITAL\s+INPUT/i,                         'Dijital Giriş Ünitesi'],
  [/^DIGITAL\s+OUTPUT/i,                        'Dijital Çıkış Ünitesi'],
  [/^POWER\s+CABLE/i,                           'Güç Kablosu'],
  [/^COMMUNICATION\s+CABLE/i,                   'Haberleşme Kablosu'],
  // Genel bağlantı elemanları
  [/^ONE.TOUCH\s+FITTING/i,                     'Sıkıştırmalı Rakor'],
  [/^BRASS\s+FITTING/i,                         'Pirinç Rakor'],
  [/^INSERT\s+FITTING/i,                        'Geçmeli Rakor'],
  [/^METRIC\s+SIZE\s+BRASS\s+ONE.TOUCH/i,       'Metrik Pirinç Rakor'],
  [/^FITTING/i,                                 'Rakor'],
  [/^FILTER\s+(REGULATOR\s+\+\s+LUBRICATOR|REG)/i, 'Filtre Regülatörü'],
  [/^ELEMENT/i,                                 'Filtre Elemanı'],
  [/^BRACKET/i,                                 'Braket'],
  [/^CONTROLLER/i,                              'Kontrolör'],
  [/^SENSOR/i,                                  'Sensör'],
  [/^SWITCH/i,                                  'Şalter'],
  [/^CONNECTOR/i,                               'Konnektör'],
  [/^CABLE/i,                                   'Kablo'],
  [/^TUBE/i,                                    'Hortum'],
  [/^HOSE/i,                                    'Hortum'],
  [/^DECELERATION\s+CONTROLLER/i,               'Hız Ayar Valfi'],
  // Özel valf tipleri
  [/^HIGH\s+SPEED\s+PILOT\s+OPERATED\s+SOLENOID/i, 'Yüksek Hızlı Pilot Kumandalı Selenoid Valf'],
  [/^PILOT\s+OPERATED\s+2\s+PORT\s+SOLENOID/i,  'Pilot Kumandalı 2/2 Selenoid Valf'],
  [/^DIRECT\s+OPERATED\s+2\s+PORT\s+SOLENOID/i, 'Direkt Kumandalı 2/2 Selenoid Valf'],
  [/^DOUBLE\s+SOLENOID\s+ISO\s+VALVE/i,         '5/2 Çift Bobinli ISO Selenoid Valf'],
  [/^ISO\s+SOLENOID\s+VALVE/i,                  'ISO Selenoid Valf'],
  [/^DIRECTIONAL\s+CONTROL\s+VALVE/i,           'Yön Kontrol Valfi'],
  [/^AIR\s+OPERATED\s+VALVE/i,                  'Hava Kumandalı Valf'],
  [/^PRESSURE\s+RELIEF\s+3\s+PORT\s+VALVE/i,    '3/2 Güvenlik Valfi'],
  [/^3\s+PORT\s+RESIDUAL\s+PRESSURE\s+RELEASE/i,'3/2 Artık Basınç Tahliye Valfi'],
  [/^2\s+PORT\s+PROCESS\s+VALVE/i,              '2/2 Proses Valfi'],
  [/^HIGH\s+VACUUM\s+ANGLE\s+VALVE/i,           'Yüksek Vakum Açılı Valf'],
  [/^FINGER\s+VALVE/i,                          'Parmak Valfi'],
  [/^PULSE\s+VALVE/i,                           'Darbe Valfi'],
  [/^IMPACT\s+BLOW\s+VALVE/i,                   'Darbe Üflemeli Valf'],
  [/^SOLENOID\s+COIL/i,                         'Solenoid Bobin'],
  [/^PLASTIC\s+FITTING/i,                       'Plastik Rakor'],
  [/^PRESSURE\s+REGULATOR/i,                    'Basınç Regülatörü'],
  [/^COPPER\s+TUBE\s+LONG\s+NOZZLE/i,           'Bakır Boru Uzun Meme'],
  [/^FILTER\s+CASE/i,                           'Filtre Gövdesi'],
  [/^PART\s+OF\s+VACUUM\s+SWITCH/i,             'Vakum Şalteri Parçası'],
  // Montaj grupları ve aksesuarlar
  [/^SUP\/EXH\s+END\s+BLOCK\s+ASSEMBLY/i,       'Besleme/Egzost Uç Blok Grubu'],
  [/^SUP\/EXH\s+BLOCK\s+ASSEMBLY/i,             'Besleme/Egzost Blok Grubu'],
  [/^SUP\/EXH/i,                                'Besleme/Egzost Bloğu'],
  [/^DIAPHRAGM\s+ASSEMBLY/i,                    'Diyafram Grubu'],
  [/^MAIN\s+VALVE\s+ASSEMBLY/i,                 'Ana Valf Grubu'],
  [/^VALVE\s+ASSEMBLY/i,                        'Valf Grubu'],
  [/^MAIN\s+PLATE\s+ASSEMBLY/i,                 'Ana Plaka Grubu'],
  [/^MULTI\s+HAND\s+ADAPTER/i,                  'Çok El Adaptör Plakası'],
  [/^PLATE\s+ASSEMBLY/i,                        'Plaka Seti'],
  [/^ASSEMBLY/i,                                'Montaj Grubu'],
  // Adaptörler ve ara parçalar
  [/^PIPING\s+ADAPTER/i,                        'Boru Adaptörü'],
  [/^REDUCING\s+ADAPTER/i,                      'Redüksiyon Adaptörü'],
  [/^PLUG[\s\-]IN\s+MANIFOLD/i,                 'Paralel Bağlantılı Manifold'],
  [/^END\s+BRACKET/i,                           'Uç Braket'],
  [/^CENTRE\s+BRACKET/i,                        'Merkez Braket'],
  // Sensörler ve contalar
  [/^ELECTROMAGNETIC\s+FLOW\s+SENSOR/i,         'Elektromanyetik Akış Sensörü'],
  [/^CUSHION\s+SEAL/i,                          'Amortisör Contası'],
  [/^ROD\s+SEAL/i,                              'Mil Contası'],
  // Genel
  [/^SPACER/i,                                  'Ara Parça'],
  [/^ADAPTER/i,                                 'Adaptör'],
  [/^GASKET/i,                                  'Conta Plakası'],
  [/^HANDLE/i,                                  'El Tutamağı'],
  [/^NUT/i,                                     'Somun'],
  [/^CLAMP/i,                                   'Kelepçe'],
  [/^TUBING/i,                                  'Hortum'],
];

function buildFromEng(code, eng) {
  if (!eng || !eng.trim()) return code || '';
  const s = eng.trim();

  for (const [re, tr] of ENG_TO_TR) {
    if (re.test(s)) {
      const dims  = extractDims(s);
      const parts = [tr];
      if (dims.diam)   parts.push('Ø' + dims.diam + 'mm');
      if (dims.stroke) parts.push('Strok ' + dims.stroke + 'mm');
      if (/\bDOUBLE\s+ROD\b/i.test(s))           parts.push('Çift Milli');
      if (/\bNON.ROTATING\b/i.test(s))            parts.push('Dönmez Milli');
      if (/\bWITH\s+MAGNET\b|MAGNETIC/i.test(s)) parts.push('Manyetik');
      if (/\bATEX\b/i.test(s))                    parts.push('ATEX Sertifikalı');
      return joinDots(...parts);
    }
  }

  return s;
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  KATEGORİ DEDEKTÖRü
// ═══════════════════════════════════════════════════════════════════════════ //

function detectCat(code, eng, tr) {
  const trU  = (tr  || '').toUpperCase();
  const engU = (eng || '').toUpperCase();
  const cU   = (code|| '').toUpperCase();

  if (
    /SİLİNDİR/.test(trU) ||
    /CYLINDER|ROTARY\s+CLAMP|AIR\s+SLIDE|RODLESS|COMPACT\s+SLIDE|FREE\s+MOUNT/.test(engU) ||
    /^(25A-|CD[^G]|CJ|CM\d|CP[^S]|CQ|CX|C[0-9]|MGPM|MGPL|MGJ|MGZ|MY|MXQ|MXS|MXY|MXZ|MXW|MXH|MXP|MB[^A]|CK|MQ|CLM|CLQ|CLD|CVQ|RSQ|RS2|55\-|CDM\d|NCQ|NCM|CLK|CNA|CNG|CSL)/.test(cU)
  ) return 'cylinder';

  if (
    /RAKOR|DAĞITI|KÖRTAPA|SUSTURUCU|PERDE\s+GEÇİŞ|REKOR/.test(trU) ||
    /FITTING|SILENCER/.test(engU) ||
    /^(KQ|KJ|KK|KF|KSH|KSL|KXL|AN\d|DT\d|ASV)/.test(cU)
  ) return 'fitting';

  if (
    /VALF/.test(trU) ||
    /VALVE|SOLENOID/.test(engU) ||
    /^(SY[3579]|VQ|VX|VH|VP|VT|VF|VNA|VHK|VKB|VVQ|EVM|EVG|EVT|EVZ|VM|EAV|ASQ|ASR|ASP|ASN|SYJA|SYJ|AKH|AS[1-9])/.test(cU)
  ) return 'valve';

  return 'general';
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  ANA DÖNÜŞTÜRÜCÜ
// ═══════════════════════════════════════════════════════════════════════════ //

// Detect if a string is likely English (no Turkish-specific letters)
// and contains recognizable English technical keywords
const ENG_KEYWORDS = /\b(valve|seal|filter|regulator|separator|drain|actuator|fitting|connector|element|assembly|bracket|manifold|solenoid|cylinder|gripper|sensor|switch|cable|tubing|spacer|adapter|gasket|handle|plug|nut|clamp|ionizer|driver|nozzle|guide|clevis|start|controller|positioner)\b/i;

function isEnglishTR(s) {
  if (!s || s.length < 4) return false;
  if (/[ÜüĞğİışŞÇçÖö]/.test(s)) return false; // has Turkish special chars → Turkish
  return ENG_KEYWORDS.test(s);
}

function transform(code, eng, tr) {
  const c = clean(code);
  const e = clean(eng);
  const t = clean(tr);

  if (!c && !e && !t) return '';

  const cat = detectCat(c, e, t);

  // Empty TR or TR that looks like English → derive from English description
  const useEng = !t || isEnglishTR(t);
  if (useEng) {
    if (cat === 'cylinder') return processCylinder(c, e, '');
    const fromEng = buildFromEng(c, e);
    // If buildFromEng found a translation (non-English), use it; else fall back to TR
    if (fromEng && !isEnglishTR(fromEng) && fromEng !== e) return fromEng;
    return t ? cleanBase(t) : fromEng || '';
  }

  switch (cat) {
    case 'cylinder': return processCylinder(c, e, t);
    case 'fitting':  return processFitting(c, e, t);
    case 'valve':    return processValve(c, e, t);
    default:         return cleanBase(t);
  }
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  İSTATİSTİK
// ═══════════════════════════════════════════════════════════════════════════ //

const stats = { total:0, withDims:0, trEmpty:0, trGenerated:0, suspicious:0 };
const suspicious = [];

function checkRow(origTR, result, code, idx) {
  stats.total++;
  const hadTR = !!(origTR && origTR.trim());
  if (!hadTR) {
    stats.trEmpty++;
    if (result && result.trim()) stats.trGenerated++;
  }
  if (result && result.includes('Strok') && result.includes('Ø')) stats.withDims++;
  if (!result || result.trim().length < 3) {
    stats.suspicious++;
    suspicious.push({ idx, code, origTR, result });
  }
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  EXCEL OKUMA & YAZMA
// ═══════════════════════════════════════════════════════════════════════════ //

console.log('Kaynak dosya okunuyor:', SRC);
const wb = XLSX.readFile(SRC);
const ws = wb.Sheets['TR AÇIKLAMALAR'];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

const header   = raw[0];
const dataRows = raw.slice(1);
console.log('Toplam veri satırı:', dataRows.length);

const outRows = [];
outRows.push([...header, 'DÜZENLENMİŞ ÜRÜN KODU', 'PROFESYONEL TÜRKÇE AÇIKLAMA']);

for (let i = 0; i < dataRows.length; i++) {
  const row = dataRows[i] || [];
  const productCode = clean(row[2] || '');
  const engDesc     = clean(row[3] || '');
  const trDesc      = clean(row[4] || '');

  const proDesc = transform(productCode, engDesc, trDesc);
  checkRow(trDesc, proDesc, productCode, i + 2);
  // Pad row to header length so new columns land in the correct columns
  const outRow = [];
  for (let k = 0; k < header.length; k++) outRow.push(row[k] != null ? row[k] : '');
  outRow.push(productCode, proDesc);
  outRows.push(outRow);
}

// ─── YENİ EXCEL ──────────────────────────────────────────────────────────── //
console.log('\nExcel dosyası oluşturuluyor...');
const newWB = XLSX.utils.book_new();
const newWS = XLSX.utils.aoa_to_sheet(outRows);

newWS['!cols'] = [
  { wch: 38 },
  { wch: 12 },
  { wch: 30 },
  { wch: 55 },
  { wch: 45 },
  { wch: 30 },
  { wch: 60 },
];
newWS['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(header.length + 1)}1` };
XLSX.utils.book_append_sheet(newWB, newWS, 'TR AÇIKLAMALAR');
XLSX.writeFile(newWB, DEST, { bookType: 'xlsx' });

console.log('\n✓ Dosya kaydedildi:', DEST);

// ─── ÖZET ────────────────────────────────────────────────────────────────── //
console.log('\n══════════════════════════════════════');
console.log('            ÖZET RAPOR  (v3)');
console.log('══════════════════════════════════════');
console.log('Toplam işlenen satır          :', stats.total);
console.log('Boyut eklenen silindir satırı :', stats.withDims);
console.log('TR boş → tamamlanan           :', stats.trGenerated, '/', stats.trEmpty);
console.log('Şüpheli / kısa çıktı          :', stats.suspicious);

if (suspicious.length > 0) {
  console.log('\nŞüpheli satırlar (ilk 20):');
  suspicious.slice(0, 20).forEach(r =>
    console.log(`  Satır ${r.idx}: [${r.code}] "${r.origTR}" → "${r.result}"`)
  );
}
console.log('\n✓ İşlem tamamlandı.');
