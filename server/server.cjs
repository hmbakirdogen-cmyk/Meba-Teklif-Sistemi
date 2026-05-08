'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { spawn } = require('child_process');
const { createAuthRoutes, getAuthContext, requireAuth, pruneExpiredSessions } = require('./auth-routes.cjs');
const { startBackupScheduler } = require('./backupScheduler.cjs');

// Puppeteer-core lazy-load: kullanici PDF render etmediyse modul yuklenmez,
// startup hizini yavaslatmaz. Chrome yolu sistem default'u; yoksa fallback.
let _puppeteerCache = null;
function getPuppeteer() {
  if (_puppeteerCache !== null) return _puppeteerCache;
  try { _puppeteerCache = require('puppeteer-core'); }
  catch { _puppeteerCache = false; }
  return _puppeteerCache;
}
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
function findChrome() {
  for (const p of CHROME_PATHS) { if (fs.existsSync(p)) return p; }
  return null;
}

const DB_PATH = path.join(__dirname, 'db.json');
const DB_LOCK_PATH = DB_PATH + '.lock';
// (SYNC_TELEMETRY_LOG_PATH kaldırıldı — sync mimarisi temizliği.)
const EMAIL_TELEMETRY_LOG_PATH = path.join(__dirname, 'email_dispatch.log');
const SERVER_CONFIG_PATH = path.join(__dirname, '..', 'config', 'server-config.json');

// ── Server Config (config/server-config.json) ────────────────────────────────
let cachedServerConfig = null;
function loadServerConfig() {
  if (cachedServerConfig) return cachedServerConfig;
  const defaults = {
    mode: 'server',
    deviceId: 'OFIS-MERKEZ-PC',
    deviceLabel: 'Ofis Ana Bilgisayar',
    listenPort: 3001,
    frontendPort: 5173,
    logLevel: 'info',
  };
  try {
    if (fs.existsSync(SERVER_CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(SERVER_CONFIG_PATH, 'utf-8'));
      cachedServerConfig = { ...defaults, ...raw };
    } else {
      console.warn('[loadServerConfig] config/server-config.json yok, defaultlar kullanilir.');
      cachedServerConfig = defaults;
    }
  } catch (err) {
    console.warn('[loadServerConfig] okuma hatasi:', err.message);
    cachedServerConfig = defaults;
  }
  return cachedServerConfig;
}

const SERVER_CONFIG = loadServerConfig();
const PORT = SERVER_CONFIG.listenPort || 3001;
const PDF_ROOT_FOLDER_NAME_FALLBACK = 'GRUP \u015eIRKETLER\u0130 TEKL\u0130FLER';

// Aktif teklif icin PDF kok klasor adi: firma profilinde pdfKlasorAdi varsa onu
// kullan, yoksa fallback. teklif.firmaId'den firma cozulur.
function pdfKokKlasorAdiUret(firmaProfili) {
  const ad = (firmaProfili && firmaProfili.pdfKlasorAdi) || '';
  return ad ? sanitizeWindowsSegment(ad, PDF_ROOT_FOLDER_NAME_FALLBACK) : PDF_ROOT_FOLDER_NAME_FALLBACK;
}
const INVALID_WINDOWS_SEGMENT_REGEX = /[<>:"/\\|?*\u0000-\u001F]/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;

// ── DB helpers ────────────────────────────────────────────────────────────────

const DB_DEFAULTS = {
  teklifler: [],
  cariler: [],
  urunler: [],
  urunSetleri: [],
  referans: { markalar: [], birimler: [], teslimSecenekleri: [] },
  sayac: { yil: new Date().getFullYear(), ay: new Date().getMonth() + 1, deger: 0 },
};

function readDB() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    return data;
  } catch (err) {
    console.warn('[readDB] db.json okunamadi, varsayilan yapi kullaniliyor:', err.message);
    return { ...DB_DEFAULTS };
  }
}

// Senkron sleep — Atomics.wait kernel-level wait yapar (CPU yakmaz).
// Eski busy-wait while(Date.now() < ...) %100 CPU tüketiyordu.
const _SLEEP_AB = new Int32Array(new SharedArrayBuffer(4));
function sleepSync(ms) {
  Atomics.wait(_SLEEP_AB, 0, 0, ms);
}

// Stale lock ne zaman temizlenir: lock dosyasının mtime'ı bu süreden eskiyse
// önceki yazıcı crash etmiş demektir, biz alıp devam ederiz.
const STALE_LOCK_MS = 5000;

// File lock ile yazma — multi-process write race condition'larina karsi
// ikinci hat savunma. Launcher PID lock primary.
function writeDBLocked(data) {
  let fd = null;
  let retries = 10;
  while (retries-- > 0) {
    try {
      fd = fs.openSync(DB_LOCK_PATH, 'wx'); // exclusive create
      break;
    } catch (err) {
      if (err.code === 'EEXIST') {
        // Stale lock kontrolü: önceki yazıcı crash etmişse mtime eskidir.
        try {
          const st = fs.statSync(DB_LOCK_PATH);
          if (Date.now() - st.mtimeMs > STALE_LOCK_MS) {
            console.warn('[writeDBLocked] stale lock cleared (mtime > ' + STALE_LOCK_MS + 'ms)');
            try { fs.unlinkSync(DB_LOCK_PATH); } catch { /* ignore */ }
            continue; // hemen yeniden dene
          }
        } catch { /* stat fail ise normal retry'a düş */ }
        if (retries > 0) {
          // Kernel-level wait (50ms) — CPU yakmaz.
          sleepSync(50);
          continue;
        }
      }
      throw err;
    }
  }
  if (fd === null) {
    throw new Error('writeDBLocked: lock alinamadi (10 deneme, ~500ms)');
  }
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } finally {
    try { fs.closeSync(fd); } catch { /* ignore */ }
    try { fs.unlinkSync(DB_LOCK_PATH); } catch { /* ignore */ }
  }
}

// Process crash/exit'te lock temizliği — bir sonraki yazıcı stale lock
// beklemek zorunda kalmasın diye.
function _cleanupLockOnExit() {
  try {
    if (fs.existsSync(DB_LOCK_PATH)) {
      fs.unlinkSync(DB_LOCK_PATH);
    }
  } catch { /* ignore */ }
}
process.on('exit',     _cleanupLockOnExit);
process.on('SIGINT',  () => { _cleanupLockOnExit(); process.exit(130); });
process.on('SIGTERM', () => { _cleanupLockOnExit(); process.exit(143); });
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  _cleanupLockOnExit();
  process.exit(1);
});

// Geri uyumluluk: eski writeDB cagrilarini lock'lu surume yonlendir.
function writeDB(data) {
  writeDBLocked(data);
}

// ── Sync alan helper'lari ────────────────────────────────────────────────────

/**
 * Bir record'a sync alanlarini set eder/gunceller. PUT/POST handler'lari bunu
 * cagirmali. createdBy'i bos kayit ise hazirlayanKullaniciId'den alir, mevcutsa
 * korur. updatedBy ve deviceId her cagrida gunceller.
 */
function bumpRecord(prev, incoming, ctx) {
  const { deviceId, userId } = ctx || {};
  const prevVersion = (prev && typeof prev.version === 'number') ? prev.version : 0;
  // Server-authoritative now() — clock drift veya eski/manipule client
  // tarihinin DB'ye sizmasina izin verme. Hem lastSyncedAt hem
  // guncellemeTarihi server otoritesinde.
  const now = new Date().toISOString();
  return {
    ...prev,
    ...incoming,
    version: prevVersion + 1,
    deviceId: deviceId || incoming.deviceId || (prev && prev.deviceId) || SERVER_CONFIG.deviceId,
    updatedBy: userId || incoming.updatedBy || (prev && prev.updatedBy) || (incoming.hazirlayanKullaniciId || (prev && prev.hazirlayanKullaniciId)) || null,
    lastSyncedAt: now,
    // incoming.guncellemeTarihi YOK SAYILIR — eski client tarihini geri yazsa
    // bile mergeById tiebreak'inda kayba yol acmasin diye.
    guncellemeTarihi: now,
  };
}

/**
 * Soft-delete: mevcut record'u silmek yerine deletedAt ile isaretler ve
 * version'ini bumpleyerek diger client'lar da pull'da tombstone alir.
 */
function softDeleteRecord(prev, ctx) {
  if (!prev) return null;
  return bumpRecord(prev, { deletedAt: new Date().toISOString() }, ctx);
}

function isLiveRecord(record) {
  return record && !record.deletedAt;
}

// ── Network helper ────────────────────────────────────────────────────────────

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const info of list || []) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return 'localhost';
}

function getLocalIPv4Addresses() {
  const ifaces = os.networkInterfaces();
  const addresses = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

  for (const list of Object.values(ifaces)) {
    for (const info of list || []) {
      if (info.family === 'IPv4') {
        addresses.add(info.address);
        addresses.add(`::ffff:${info.address}`);
      }
    }
  }

  return addresses;
}

function normalizeRemoteAddress(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

function isSameMachineClient(req) {
  const localAddresses = getLocalIPv4Addresses();
  const remoteAddress = normalizeRemoteAddress(req.socket?.remoteAddress);
  return localAddresses.has(remoteAddress) || localAddresses.has(req.socket?.remoteAddress);
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(MULTIPLE_SPACES_REGEX, ' ').trim();
}

function sanitizeWindowsSegment(value, fallback) {
  const cleaned = normalizeWhitespace(
    String(value ?? '')
      .replace(INVALID_WINDOWS_SEGMENT_REGEX, ' ')
      .replace(/[. ]+$/g, ' '),
  );

  return cleaned || fallback;
}

function cariKlasorAdiUret(firmaAdi) {
  const kelimeler = normalizeWhitespace(firmaAdi).split(' ').filter(Boolean);
  const kaynak = kelimeler.slice(0, 2).join(' ') || kelimeler.join(' ') || 'TEKLIF';
  return sanitizeWindowsSegment(kaynak.toLocaleUpperCase('tr-TR'), 'TEKLIF');
}

function pdfDosyaGovdesiUret(teklif) {
  const cariKlasorAdi = cariKlasorAdiUret(teklif?.cari?.firmaAdi ?? '');
  const teklifNo = sanitizeWindowsSegment(String(teklif?.teklifNo ?? '').trim(), '');
  return teklifNo ? `${cariKlasorAdi} - ${teklifNo}` : cariKlasorAdi;
}

function masaustuYolunuBul() {
  const adaylar = [
    path.join(os.homedir(), 'Desktop'),
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'Desktop') : '',
    process.env.OneDrive ? path.join(process.env.OneDrive, 'Desktop') : '',
    path.join(os.homedir(), 'OneDrive', 'Desktop'),
  ].filter(Boolean);

  for (const aday of [...new Set(adaylar)]) {
    try {
      if (fs.existsSync(aday) && fs.statSync(aday).isDirectory()) {
        return aday;
      }
    } catch {
      // Bir sonraki adayi dene
    }
  }

  throw new Error('Windows masaüstü klasörü bulunamadı.');
}

function klasoruHazirla(klasorYolu, hataMesaji) {
  try {
    fs.mkdirSync(klasorYolu, { recursive: true });
  } catch {
    throw new Error(hataMesaji);
  }
}

function benzersizDosyaYoluUret(klasorYolu, dosyaGovdesi, uzanti) {
  let sayac = 1;
  let dosyaAdi = `${dosyaGovdesi}.${uzanti}`;
  let tamYol = path.join(klasorYolu, dosyaAdi);

  while (fs.existsSync(tamYol)) {
    sayac += 1;
    dosyaAdi = `${dosyaGovdesi} (${sayac}).${uzanti}`;
    tamYol = path.join(klasorYolu, dosyaAdi);
  }

  return { dosyaAdi, tamYol };
}

function dosyaAc(filePath) {
  try {
    if (process.platform === 'win32') {
      const child = spawn('cmd.exe', ['/c', 'start', '', filePath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return { acildi: true };
    }

    if (process.platform === 'darwin') {
      const child = spawn('open', [filePath], { detached: true, stdio: 'ignore' });
      child.unref();
      return { acildi: true };
    }

    const child = spawn('xdg-open', [filePath], { detached: true, stdio: 'ignore' });
    child.unref();
    return { acildi: true };
  } catch (error) {
    return {
      acildi: false,
      acmaHatasi: error instanceof Error ? error.message : 'PDF dosyası açılamadı.',
    };
  }
}

function escapePowerShellLiteral(value) {
  return String(value ?? '').replace(/'/g, "''");
}

const DEFAULT_MAIL_FIRMALAR = {
  meba: {
    id: 'meba',
    kisaAd: 'MEBA',
    ad: 'MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik San. Tic. Ltd. Şti.',
    adres: 'Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv. No:252/D Melikgazi / KAYSERİ',
    telefon: '0352 5020780',
    eposta: 'info@mebamekanik.com',
    web: 'www.mebamekanik.com',
  },
  mesa: {
    id: 'mesa',
    kisaAd: 'MESA',
    ad: 'Mesa Enerji Taahhüt Elektrik Elektronik Mühendislik Danışmanlık Makine San. ve Tic. Ltd. Şti.',
    adres: 'Organize Sanayi Bölgesi 12. Cad. OSB Ticaret Merkezi No: 5/9 Melikgazi / KAYSERİ',
    telefon: '0352 321 30 00',
    eposta: 'info@mesaenerji.com',
    web: 'www.mesaenerji.com.tr',
  },
  elmos: {
    id: 'elmos',
    kisaAd: 'ELMOS',
    ad: 'ELMOS Otomasyon San. Tic. Ltd. Şti.',
    adres: 'Organize Sanayi Bölgesi 12. Cad. No:30 Melikgazi / KAYSERİ',
    telefon: '0352 321 30 50',
    eposta: '',
    web: 'www.elmos.com.tr',
  },
};

function mailFirmaDegeriSec(firmaProfili, alan) {
  const id = normalizeWhitespace(firmaProfili?.id || 'meba');
  const fallback = DEFAULT_MAIL_FIRMALAR[id] || DEFAULT_MAIL_FIRMALAR.meba;
  const value = normalizeWhitespace(firmaProfili?.[alan] || '');
  if (id === 'mesa' && alan === 'ad' && /Taahhut|Muhendislik|Danismanlik| Sti\.?/i.test(value)) {
    return fallback.ad;
  }
  return value || fallback[alan] || '';
}

function mailFirmaProfiliUret(firmaProfili) {
  return {
    id: mailFirmaDegeriSec(firmaProfili, 'id'),
    kisaAd: normalizeWhitespace(firmaProfili?.kisaAd || firmaProfili?.teklifPrefix || mailFirmaDegeriSec(firmaProfili, 'kisaAd')),
    ad: mailFirmaDegeriSec(firmaProfili, 'ad'),
    adres: mailFirmaDegeriSec(firmaProfili, 'adres'),
    telefon: mailFirmaDegeriSec(firmaProfili, 'telefon'),
    eposta: mailFirmaDegeriSec(firmaProfili, 'eposta'),
    web: mailFirmaDegeriSec(firmaProfili, 'web'),
    logoPath: normalizeWhitespace(firmaProfili?.logoPath || '/logo-meba.png'),
  };
}

function firmaLogoYoluUret(firmaMailProfili) {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const temizLogo = firmaMailProfili.logoPath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  const aday = path.resolve(publicDir, temizLogo);
  return aday.startsWith(publicDir + path.sep) ? aday : path.join(publicDir, 'logo-meba.png');
}

function mailKonuUret(teklif, firmaProfili) {
  const firma = mailFirmaProfiliUret(firmaProfili);
  return teklif.teklifNo
    ? `${firma.kisaAd} Teklif Belgesi - ${teklif.teklifNo}`
    : `${firma.kisaAd} Teklif Belgesi`;
}

function mailGovdesiUret(teklif, firmaProfili) {
  const firma = mailFirmaProfiliUret(firmaProfili);
  const kisi = normalizeWhitespace(teklif?.contactName ?? '');
  const title = teklif?.contactTitle === 'HANIM' ? 'Hanım' : 'Bey';
  const hitap = kisi ? `Sayın ${kisi} ${title},` : 'Sayın İlgili,';
  const cariAdi = normalizeWhitespace(teklif?.cari?.firmaAdi ?? '');
  const teklifNo = teklif?.teklifNo ?? '';
  const hazirlayanAdi = normalizeWhitespace(teklif?.hazirlayanAdSoyad ?? '');
  const sep = '--------------------------------------------------';

  const satirlar = [
    hitap,
    '',
    `${cariAdi ? cariAdi + ' için hazırladığımız teklif belgemiz' : 'Teklif belgemiz'}${teklifNo ? ' (No: ' + teklifNo + ')' : ''} ekte yer almaktadır.`,
    'Herhangi bir sorunuz olması durumunda lütfen bizimle iletişime geçiniz.',
    '',
    'Saygılarımızla,',
    '',
    sep,
  ];

  if (hazirlayanAdi) satirlar.push(hazirlayanAdi);

  satirlar.push(firma.ad, '');
  if (firma.telefon) satirlar.push(`T: ${firma.telefon}`);
  if (firma.eposta) satirlar.push(`E: ${firma.eposta}`);
  if (firma.web) satirlar.push(`W: ${firma.web}`);
  if (firma.adres) satirlar.push('', firma.adres);
  satirlar.push(sep);

  return satirlar.join('\r\n');
}

function mailtoTaslagiAc({ aliciEposta, konu, govde }) {
  const toSegment = encodeURIComponent(aliciEposta || '');
  const url = `mailto:${toSegment}?subject=${encodeURIComponent(konu || '')}&body=${encodeURIComponent(govde || '')}`;

  try {
    if (process.platform === 'win32') {
      const child = spawn('cmd.exe', ['/c', 'start', '', url], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return true;
    }

    if (process.platform === 'darwin') {
      const child = spawn('open', [url], { detached: true, stdio: 'ignore' });
      child.unref();
      return true;
    }

    const child = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mailHtmlGovdesiUret(teklif, logoBase64, firmaProfili) {
  const firma = mailFirmaProfiliUret(firmaProfili);
  const kisi = normalizeWhitespace(teklif?.contactName ?? '');
  const title = teklif?.contactTitle === 'HANIM' ? 'Hanım' : 'Bey';
  const hitap = kisi ? `Sayın ${kisi} ${title},` : 'Sayın İlgili,';
  const cariAdi = normalizeWhitespace(teklif?.cari?.firmaAdi ?? '');
  const teklifNo = teklif?.teklifNo ?? '';
  const hazirlayanAdi = normalizeWhitespace(teklif?.hazirlayanAdSoyad ?? '');

  const govdeMetni = `${cariAdi ? cariAdi + ' için hazırladığımız teklif belgemiz' : 'Teklif belgemiz'}${teklifNo ? ' (No: ' + teklifNo + ')' : ''} ekte yer almaktadır. Herhangi bir sorunuz olması durumunda lütfen bizimle iletişime geçiniz.`;

  const logoHtml = logoBase64
    ? `<td style="padding-right:16px;vertical-align:top;width:195px;line-height:0;font-size:0;"><img src="data:image/png;base64,${logoBase64}" width="195" height="89" alt="${htmlEscape(firma.kisaAd)}" style="display:block;width:195px;height:89px;"></td>`
    : '';
  const separatorHtml = logoBase64
    ? `<td style="width:1px;background:#1A2B42;padding:0;"></td>`
    : '';
  const hazirlayanUnvan = normalizeWhitespace(teklif?.hazirlayanUnvan ?? '');
  const iletisimHtml = [
    firma.telefon ? `<span style="color:#94a3b8;">T</span>&nbsp; ${htmlEscape(firma.telefon)}` : '',
    firma.eposta ? `<span style="color:#94a3b8;">E</span>&nbsp; ${htmlEscape(firma.eposta)}` : '',
    firma.web ? `<span style="color:#94a3b8;">W</span>&nbsp; ${htmlEscape(firma.web)}` : '',
  ].filter(Boolean).join(' &nbsp;&nbsp;');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:600px;padding:28px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#1e293b;line-height:1.7;">
  <p style="margin:0 0 14px;">${htmlEscape(hitap)}</p>
  <p style="margin:0 0 14px;">${htmlEscape(govdeMetni)}</p>
  <p style="margin:0 0 24px;">Saygılarımızla,</p>
  <div style="border-top:1px solid #dde3ec;padding-top:16px;">
    <table style="border-collapse:collapse;" cellpadding="0" cellspacing="0">
      <tr>
        ${logoHtml}
        ${separatorHtml}
        <td style="vertical-align:top;padding-left:16px;">
          ${hazirlayanAdi ? `<div style="font-size:13px;font-weight:700;color:#1A2B42;line-height:1.3;margin-bottom:1px;">${htmlEscape(hazirlayanAdi)}${hazirlayanUnvan ? `<span style="font-weight:400;color:#64748b;font-size:12px;"> &nbsp;·&nbsp; ${htmlEscape(hazirlayanUnvan)}</span>` : ''}</div>` : ''}
          <div style="font-size:11px;color:#64748b;line-height:1.3;margin-bottom:7px;">${htmlEscape(firma.ad)}</div>
          ${iletisimHtml ? `<div style="font-size:12px;color:#334155;line-height:1.9;">${iletisimHtml}</div>` : ''}
          ${firma.adres ? `<div style="font-size:11px;color:#94a3b8;line-height:1.4;margin-top:3px;">${htmlEscape(firma.adres)}</div>` : ''}
        </td>
      </tr>
    </table>
  </div>
</div>
</body></html>`;
}

async function outlookTaslagiAc({ aliciEposta, konu, govde, htmlGovde, ekDosyaYolu }) {
  if (process.platform !== 'win32') {
    return {
      epostaHazirlandi: false,
      epostaHatasi: 'Outlook taslağı yalnızca Windows ortamında hazırlanabilir.',
      epostaTaslakYontemi: null,
    };
  }

  // HTML gövdeyi geçici dosyaya yaz — komut satırı uzunluk sınırını aşmamak için
  const tempFile = path.join(os.tmpdir(), `meba-mail-${Date.now()}.html`);
  try {
    fs.writeFileSync(tempFile, htmlGovde, 'utf-8');
  } catch {
    return {
      epostaHazirlandi: false,
      epostaHatasi: 'Geçici mail dosyası oluşturulamadı.',
      epostaTaslakYontemi: null,
    };
  }

  const runPowerShellScript = (scriptLines) => {
    const scriptFile = path.join(os.tmpdir(), `meba-outlook-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);

    try {
      fs.writeFileSync(scriptFile, '\uFEFF' + scriptLines.join('\r\n'), 'utf-8');
    } catch {
      return Promise.resolve({ ok: false, detail: 'Geçici PowerShell dosyası oluşturulamadı.' });
    }

    return new Promise((resolve) => {
      const result = spawn('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', scriptFile], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdoutOutput = '';
      let stderrOutput = '';

      if (result.stdout) result.stdout.on('data', (chunk) => { stdoutOutput += chunk.toString(); });
      if (result.stderr) result.stderr.on('data', (chunk) => { stderrOutput += chunk.toString(); });

      result.on('error', (err) => {
        try { fs.unlinkSync(scriptFile); } catch { /* ignore */ }
        resolve({ ok: false, detail: `PowerShell spawn hatası: ${err.message}` });
      });

      result.on('exit', (code) => {
        try { fs.unlinkSync(scriptFile); } catch { /* ignore */ }
        if (code === 0) {
          resolve({ ok: true, detail: '' });
          return;
        }
        const detail = `${stderrOutput}\n${stdoutOutput}`.trim().split('\n').slice(0, 3).join(' ').trim();
        resolve({ ok: false, detail: detail || 'PowerShell komutu başarısız oldu.' });
      });
    });
  };

  const baseScriptLines = [
    "$ErrorActionPreference = 'Stop'",
    '$outlook = New-Object -ComObject Outlook.Application',
    '$mail = $outlook.CreateItem(0)',
    `$mail.To = '${escapePowerShellLiteral(aliciEposta)}'`,
    `$mail.Subject = '${escapePowerShellLiteral(konu)}'`,
  ];

  const focusScriptLines = [
    '$inspector = $mail.GetInspector',
    'if ($null -eq $inspector) { throw "Outlook inspector açılamadı." }',
    '$inspector.Activate()',
    'try {',
    "  Add-Type -AssemblyName Microsoft.VisualBasic -ErrorAction SilentlyContinue | Out-Null",
    // P/Invoke: foreground stealing protection'ı bypass etmek için 5 metod birden:
    //   - SetForegroundWindow / ShowWindowAsync(9=RESTORE)
    //   - BringWindowToTop  → Z-order'da en üste alır
    //   - SwitchToThisWindow(hwnd,true) → ALT+TAB benzeri direkt swap (anti-stealing kuralını atlar)
    //   - keybd_event(ALT,...) → bir tuş "kullanıcı aktivitesi" simüle eder, OS foreground hakkını verir
    "  Add-Type -Namespace Win32 -Name User32 -MemberDefinition '[System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(System.IntPtr hWnd); [System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(System.IntPtr hWnd, int nCmdShow); [System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern bool BringWindowToTop(System.IntPtr hWnd); [System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern void SwitchToThisWindow(System.IntPtr hWnd, bool fAltTab); [System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, System.UIntPtr dwExtraInfo); [System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern bool IsIconic(System.IntPtr hWnd);' -ErrorAction SilentlyContinue | Out-Null",
    '  $hwndValue = 0',
    '  try { $hwndValue = [int64]$inspector.Hwnd } catch { $hwndValue = 0 }',
    '  if ($hwndValue -gt 0) {',
    '    $hwnd = [System.IntPtr]$hwndValue',
    // 1) Minimize ise restore (9 = SW_RESTORE)
    '    if ([Win32.User32]::IsIconic($hwnd)) { [Win32.User32]::ShowWindowAsync($hwnd, 9) | Out-Null }',
    '    else { [Win32.User32]::ShowWindowAsync($hwnd, 5) | Out-Null }',  // 5 = SW_SHOW
    // 2) Klavye sahte vuruşu — anti-stealing'i bypass için kritik
    '    [Win32.User32]::keybd_event(0xA4, 0, 0, [System.UIntPtr]::Zero)',
    '    [Win32.User32]::keybd_event(0xA4, 0, 2, [System.UIntPtr]::Zero)',
    // 3) Z-order'da öne
    '    [Win32.User32]::BringWindowToTop($hwnd) | Out-Null',
    // 4) Foreground'a al
    '    [Win32.User32]::SetForegroundWindow($hwnd) | Out-Null',
    // 5) Garantili: SwitchToThisWindow (fAltTab=true → ALT+TAB benzeri davranır)
    '    [Win32.User32]::SwitchToThisWindow($hwnd, $true)',
    '  } else {',
    "    [Microsoft.VisualBasic.Interaction]::AppActivate('Outlook') | Out-Null",
    '  }',
    '} catch {',
    '  # Odak zorlamasi platform/surum kisitlarinda sessizce gecilir.',
    '}',
    'Start-Sleep -Milliseconds 220',
    '$inspector.Activate()',
  ];

  const htmlAttempt = await runPowerShellScript([
    ...baseScriptLines,
    `$mail.HTMLBody = [System.IO.File]::ReadAllText('${escapePowerShellLiteral(tempFile)}', [System.Text.Encoding]::UTF8)`,
    `$mail.Attachments.Add('${escapePowerShellLiteral(ekDosyaYolu)}') | Out-Null`,
    '$mail.Display()',
    'Start-Sleep -Milliseconds 350',
    ...focusScriptLines,
  ]);

  if (htmlAttempt.ok) {
    try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
    return {
      epostaHazirlandi: true,
      epostaTaslakYontemi: 'outlook',
    };
  }

  const plainAttempt = await runPowerShellScript([
    ...baseScriptLines,
    `$mail.Body = '${escapePowerShellLiteral(govde)}'`,
    `$mail.Attachments.Add('${escapePowerShellLiteral(ekDosyaYolu)}') | Out-Null`,
    '$mail.Display()',
    'Start-Sleep -Milliseconds 350',
    ...focusScriptLines,
  ]);

  try { fs.unlinkSync(tempFile); } catch { /* ignore */ }

  if (plainAttempt.ok) {
    return {
      epostaHazirlandi: true,
      epostaTaslakYontemi: 'outlook',
      epostaHatasi: 'HTML gövde açılamadı; düz metin gövde ile Outlook taslağı hazırlandı.',
    };
  }

  const rootDetail = [htmlAttempt.detail, plainAttempt.detail].filter(Boolean).join(' | ');
  const fallbackOpened = mailtoTaslagiAc({ aliciEposta, konu, govde });
  if (fallbackOpened) {
    return {
      epostaHazirlandi: true,
      epostaHatasi: rootDetail
        ? `Outlook açılamadı (${rootDetail}). Mailto taslağı açıldı; PDF ekini manuel ekleyin.`
        : 'Outlook açılamadı. Mailto taslağı açıldı; PDF ekini manuel ekleyin.',
      epostaTaslakYontemi: 'mailto',
    };
  }

  return {
    epostaHazirlandi: false,
    epostaHatasi: rootDetail
      ? `Outlook gönder penceresi açılamadı: ${rootDetail}`
      : 'Outlook gönder penceresi açılamadı.',
    epostaTaslakYontemi: null,
  };
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

// Body size limit: 10 MB. Buyuk PDF/imaj uploadlari icin yeterli; DoS'tan korur.
const MAX_BODY_BYTES = 60 * 1024 * 1024;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let receivedBytes = 0;
    req.on('data', (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('İstek gövdesi çok büyük (maks 60 MB).'));
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  const json = JSON.stringify(data);
  // CORS header'lari handler basinda monkey-patch ile otomatik eklenir.
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json, 'utf-8'),
  });
  res.end(json);
}

// ── CORS — sadece local/private network'ten izin ────────────────────────────
// Origin yoksa (curl, server-to-server) geriye uyumlu '*' donulur.
// Origin varsa hostname'in ozel ag (RFC1918) veya localhost olmasi sart.
function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return '*';
  let host;
  try { host = new URL(origin).hostname; } catch { return ''; }
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return origin;
  // 10.x.x.x
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return origin;
  // 172.16.x.x – 172.31.x.x
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)) return origin;
  // 192.168.x.x
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return origin;
  return '';
}
function corsHeaders(req) {
  const origin = getAllowedOrigin(req);
  const h = {
    'Access-Control-Allow-Methods': 'GET,PUT,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id, X-User-Id, X-User-Role, X-Session-Token, X-Firma-Id',
    'Vary': 'Origin',
  };
  if (origin) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function emailTelemetryYaz(telemetry) {
  const record = {
    timestamp: new Date().toISOString(),
    ...telemetry,
  };

  try {
    fs.appendFileSync(EMAIL_TELEMETRY_LOG_PATH, JSON.stringify(record) + '\n', 'utf-8');
  } catch {
    // Telemetry yazimi işlevsel akışı bozmamalı.
  }

  try {
    console.info('[EmailTelemetry]', JSON.stringify(record));
  } catch {
    // no-op
  }
}

// ── Request router ────────────────────────────────────────────────────────────

// ── Generic CRUD factory — DRY handler for teklifler/cariler/urunler ──────────
// Sync alanları (version, deletedAt, deviceId, updatedBy, lastSyncedAt) burada
// yönetilir. Liste handler'ları soft-deleted (deletedAt) kayıtları gizler;
// sync/pull endpoint'leri ham veriyi (tombstone'lar dahil) doğrudan döner.
function crudRoutes(collectionKey, { insertMethod = 'push', firmaIdScoped = false } = {}) {
  const basePath = `/api/${collectionKey}`;
  const itemRegex = new RegExp(`^/api/${collectionKey}/[^/]+$`);

  // firmaId scope: query string ?firmaId=meba veya header X-Firma-Id'den oku.
  // super_admin tum firmalari gorebilir (firmaId verilmezse tumu doner);
  // diger roller iste seviyesinde DOGRULANIR (kullanici.firmaId zorlanir).
  function resolveFirmaScope(req) {
    if (!firmaIdScoped) return { tumu: true, firmaId: null };
    const ctx = parseRequestCtx(req);
    const headerFirma = req.headers['x-firma-id'] || '';
    let qFirma = '';
    try {
      qFirma = new URL(req.url || '', 'http://localhost').searchParams.get('firmaId') || '';
    } catch { /* ignore */ }
    const requested = headerFirma || qFirma || '';
    // Eski client (firmaId yollamaz): super_admin ise tumu, digerleri user.firmaId
    if (!requested) {
      if (ctx.rol === 'super_admin') {
        return { tumu: true, firmaId: null };
      }
      return { tumu: false, firmaId: null };
    }
    // firma_admin/engineer/sales sadece kendi firmasini sorabilir; super_admin her firmayi
    return { tumu: false, firmaId: requested };
  }

  return {
    /** GET /api/<collection> */
    list(url, method) {
      return (url === basePath || url.startsWith(basePath + '?')) && method === 'GET';
    },
    handleList(req, res) {
      const all = readDB()[collectionKey] || [];
      const live = all.filter(isLiveRecord);
      const scope = resolveFirmaScope(req);
      if (scope.tumu) return send(res, 200, live);
      if (!scope.firmaId) return send(res, 200, []);
      return send(res, 200, live.filter((r) => r.firmaId === scope.firmaId));
    },

    /** PUT /api/<collection> — bulk replace */
    bulkReplace(url, method) {
      return url === basePath && method === 'PUT';
    },
    async handleBulkReplace(req, res) {
      const body = await parseBody(req);
      const ctx = parseRequestCtx(req);
      const db = readDB();
      const existing = db[collectionKey] || [];
      const existingMap = new Map(existing.map((r) => [r.id, r]));

      // Her item için mevcut kaydı bumpla (version artar, eski deletedAt korunur).
      // Yeni item'lar version=1 ile gelir. bulkReplace, içerikteki kayıtların
      // versiyonlarını sıfırlamaz — sync'i kırmaz.
      const incomingIds = new Set(body.map((r) => r.id));
      const merged = body.map((item) => bumpRecord(existingMap.get(item.id) || null, item, ctx));

      // body'de olmayan eski kayıtları soft-delete et (eğer aktifse)
      for (const old of existing) {
        if (!incomingIds.has(old.id) && isLiveRecord(old)) {
          merged.push(softDeleteRecord(old, ctx));
        } else if (!incomingIds.has(old.id)) {
          // Zaten silinmişse koru (tombstone)
          merged.push(old);
        }
      }

      db[collectionKey] = merged;
      writeDB(db);
      return send(res, 200, merged.filter(isLiveRecord));
    },

    /** PUT /api/<collection>/:id — upsert single */
    upsert(url, method) {
      return itemRegex.test(url) && method === 'PUT';
    },
    async handleUpsert(req, res, url) {
      const id = url.split('/')[3];
      const body = await parseBody(req);
      const ctx = parseRequestCtx(req);
      const db = readDB();
      const arr = db[collectionKey] || (db[collectionKey] = []);
      const idx = arr.findIndex((item) => item.id === id);

      // Teklif sahiplik kontrolü — personel başkasının teklifini düzenleyemez
      if (collectionKey === 'teklifler') {
        const isAdminLike = ctx.rol === 'super_admin' || ctx.rol === 'firma_admin';
        if (!isAdminLike && idx >= 0) {
          const existing = arr[idx];
          if (existing.hazirlayanKullaniciId && existing.hazirlayanKullaniciId !== ctx.userId) {
            return send(res, 403, { error: 'Bu teklifi düzenleme yetkiniz yok.' });
          }
        }
        // Yeni kayıt: hazirlayanKullaniciId boşsa context'ten set et
        if (!isAdminLike && idx < 0 && ctx.userId && !body.hazirlayanKullaniciId) {
          body.hazirlayanKullaniciId = ctx.userId;
        }
      }

      const oncekiIlgiliKisiId = idx >= 0 ? (arr[idx].ilgiliKisiId || null) : null;

      if (idx >= 0) {
        arr[idx] = bumpRecord(arr[idx], body, ctx);
      } else {
        const fresh = bumpRecord(null, body, ctx);
        if (insertMethod === 'unshift') arr.unshift(fresh);
        else arr.push(fresh);
      }
      const final = arr[idx >= 0 ? idx : (insertMethod === 'unshift' ? 0 : arr.length - 1)];

      // Teklif upsert sonrasi atama bildirimi: ilgiliKisiId yeni atandiysa
      // veya degistiyse ve hazirlayandan farkli ise kayit ac.
      if (collectionKey === 'teklifler') {
        const yeniIlgili = final.ilgiliKisiId || null;
        const hazirlayan = final.hazirlayanKullaniciId || null;
        if (yeniIlgili && yeniIlgili !== oncekiIlgiliKisiId && yeniIlgili !== hazirlayan) {
          if (!Array.isArray(db.bildirimler)) db.bildirimler = [];
          const kaynakAdSoyad = (() => {
            const me = (db.kullanicilar || []).find((u) => u.id === ctx.userId);
            return me?.adSoyad || '';
          })();
          db.bildirimler.unshift({
            id: 'b-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            hedefKullaniciId: yeniIlgili,
            kaynakKullaniciId: ctx.userId || hazirlayan || '',
            kaynakKullaniciAdSoyad: kaynakAdSoyad,
            teklifId: final.id,
            teklifNo: final.teklifNo || '',
            cariAdi: (final.cari && final.cari.firmaAdi) || '',
            tur: 'ilgili_atandi',
            okundu: false,
            tarih: new Date().toISOString(),
          });
        }
      }

      writeDB(db);
      return send(res, 200, final);
    },

    /** DELETE /api/<collection>/:id — soft delete (tombstone) */
    remove(url, method) {
      return itemRegex.test(url) && method === 'DELETE';
    },
    handleRemove(req, res, url) {
      const id = url.split('/')[3];
      const ctx = parseRequestCtx(req);
      const db = readDB();
      const arr = db[collectionKey] || [];
      const idx = arr.findIndex((item) => item.id === id);

      // Teklif sahiplik kontrolü — personel başkasının teklifini silemez
      if (collectionKey === 'teklifler' && idx >= 0) {
        const isAdminLike = ctx.rol === 'super_admin' || ctx.rol === 'firma_admin';
        const existing = arr[idx];
        if (!isAdminLike && existing.hazirlayanKullaniciId && existing.hazirlayanKullaniciId !== ctx.userId) {
          return send(res, 403, { error: 'Bu teklifi silme yetkiniz yok.' });
        }
      }

      if (idx >= 0) {
        arr[idx] = softDeleteRecord(arr[idx], ctx);
        writeDB(db);
      }
      return send(res, 200, { ok: true });
    },
  };
}

/**
 * Request'ten deviceId / userId / rol bilgisi çekme. Header (X-Device-Id,
 * X-User-Id, X-User-Role) öncelikli; yoksa query string'e düş.
 */
function parseRequestCtx(req) {
  const headers = req.headers || {};
  const url = req.url || '';
  let qUserId = '';
  let qRol = '';
  let qDeviceId = '';
  let qFirmaId = '';
  try {
    const parsed = new URL(url, 'http://localhost');
    qUserId = parsed.searchParams.get('userId') || '';
    qRol = parsed.searchParams.get('rol') || '';
    qDeviceId = parsed.searchParams.get('deviceId') || '';
    qFirmaId = parsed.searchParams.get('firmaId') || '';
  } catch { /* ignore */ }
  return {
    deviceId: headers['x-device-id']    || qDeviceId || null,
    userId:   headers['x-user-id']      || qUserId   || null,
    rol:      headers['x-user-role']    || qRol      || null,
    firmaId:  headers['x-firma-id']     || qFirmaId  || null,
    sessionToken: headers['x-session-token'] || null,
  };
}

const teklifCrud  = crudRoutes('teklifler',   { insertMethod: 'unshift', firmaIdScoped: true });
const cariCrud    = crudRoutes('cariler',     { firmaIdScoped: true });
const urunCrud    = crudRoutes('urunler',     { firmaIdScoped: true });
const urunSetCrud = crudRoutes('urunSetleri', { firmaIdScoped: true });

// Auth route'larini olustur (auth-routes.cjs uzerinden)
const authRoutes = createAuthRoutes({ readDB, writeDB, parseBody, send });

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const url = req.url || '';

  // CORS header'larini her yanita otomatik ekle (writeHead monkey-patch).
  // Boylece send(), authRoutes.* ve diger handler'lar CORS'u manuel set etmek
  // zorunda kalmaz; izin verilen origin tek noktadan kontrol edilir.
  const _cors = corsHeaders(req);
  const _origWriteHead = res.writeHead.bind(res);
  res.writeHead = function(status, headers) {
    return _origWriteHead(status, { ..._cors, ...headers });
  };

  // CORS preflight — monkey-patch zaten gerekli header'lari ekler.
  if (method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  try {

    // ── GET /api/health — lightweight health check ─────────────────────────
    if (method === 'GET' && (url === '/api/health' || url.startsWith('/api/health?'))) {
      return send(res, 200, {
        ok: true,
        service: 'group-companies-teklif-api',
        timestamp: new Date().toISOString(),
        uptimeSec: Math.floor(process.uptime()),
      });
    }

    // ── AUTH MIDDLEWARE: tum CRUD endpoint'leri oturum tokeni ister ─────────
    // Public endpoint'ler:
    //   GET  /api/health           — health check
    //   POST /api/auth/login       — login akisi
    //   GET  /api/firmalar         — login oncesi firma seciminde gosterilir
    //   GET  /api/firma/{id}/personel — login oncesi personel listesi
    // Bunlarin disinda tum istekler X-Session-Token ister; aksi halde 401.
    // req._authCtx.kullanici set edilir → handler'lar guvenli kullanici bilgisi.
    const isPublicEndpoint =
      (method === 'GET' && (url === '/api/health' || url.startsWith('/api/health?'))) ||
      (method === 'POST' && url === '/api/auth/login') ||
      (method === 'GET' && (url === '/api/firmalar' || url.startsWith('/api/firmalar?'))) ||
      (method === 'GET' && /^\/api\/firma\/[^/]+\/personel$/.test(url));

    if (!isPublicEndpoint) {
      const _authDb = readDB();
      const authCheck = requireAuth(_authDb, req);
      if (!authCheck.ok) {
        return send(res, authCheck.status, { error: authCheck.error });
      }
      req._authCtx = authCheck.ctx;
    }

    // ══ AUTH + MULTI-TENANT ROUTES ═══════════════════════════════════════════
    if (method === 'POST' && url === '/api/auth/login')           return await authRoutes.login(req, res);
    if (method === 'POST' && url === '/api/auth/logout')          return await authRoutes.logout(req, res);
    if (method === 'GET'  && url === '/api/auth/me')              return await authRoutes.me(req, res);
    if (method === 'POST' && url === '/api/auth/change-password') return await authRoutes.changePassword(req, res);
    if (method === 'POST' && url === '/api/auth/upload-photo')    return await authRoutes.uploadPhoto(req, res);

    // Firmalar — listeleme login oncesi splash icin public, detay/update auth gerekir
    if (method === 'GET'   && (url === '/api/firmalar' || url.startsWith('/api/firmalar?'))) return await authRoutes.listFirmalar(req, res);
    if (method === 'GET'   && /^\/api\/firma\/[^/]+$/.test(url))   return await authRoutes.getFirma(req, res, url);
    if (method === 'PATCH' && /^\/api\/firma\/[^/]+$/.test(url))   return await authRoutes.updateFirma(req, res, url);

    // PUBLIC: login ekraninda firma kartlarinda gostermek icin minimal personel listesi
    if (method === 'GET'    && /^\/api\/firma\/[^/]+\/personel$/.test(url))       return await authRoutes.listFirmaPersonel(req, res, url);

    // Kullanicilar
    if (method === 'GET'    && url === '/api/kullanicilar')                       return await authRoutes.listKullanicilar(req, res);
    if (method === 'POST'   && url === '/api/kullanicilar')                       return await authRoutes.createKullanici(req, res);
    if (method === 'PATCH'  && /^\/api\/kullanicilar\/[^/]+$/.test(url))          return await authRoutes.updateKullanici(req, res, url);
    if (method === 'POST'   && /^\/api\/kullanicilar\/[^/]+\/sifre-sifirla$/.test(url)) return await authRoutes.resetKullaniciSifre(req, res, url);
    if (method === 'DELETE' && /^\/api\/kullanicilar\/[^/]+$/.test(url))          return await authRoutes.deleteKullanici(req, res, url);

    // Per-firma sayac (yeni)
    if (method === 'POST' && /^\/api\/sayac\/[^/]+\/increment$/.test(url))        return await authRoutes.incrementSayac(req, res, url);

    // ── Geri Bildirim ──
    if (method === 'GET'    && url === '/api/geribildirim')                        return await authRoutes.listGeriBildirim(req, res);
    if (method === 'POST'   && url === '/api/geribildirim')                        return await authRoutes.createGeriBildirim(req, res);
    if (method === 'PATCH'  && /^\/api\/geribildirim\/[^/]+$/.test(url))           return await authRoutes.updateGeriBildirim(req, res, url);
    if (method === 'DELETE' && /^\/api\/geribildirim\/[^/]+$/.test(url))           return await authRoutes.deleteGeriBildirim(req, res, url);

    // Bildirimler (atama/teklif olayları — her kullanıcı kendi listesini gorur)
    if (method === 'GET'    && url === '/api/bildirimler')                          return await authRoutes.listBildirimler(req, res);
    if (method === 'POST'   && url === '/api/bildirimler/toplu-okundu')             return await authRoutes.bildirimleriToplukundu(req, res);
    if (method === 'PATCH'  && /^\/api\/bildirimler\/[^/]+$/.test(url))             return await authRoutes.updateBildirim(req, res, url);

    // ── GET /api/init — fetch everything at once (used by frontend on startup) ──
    // Yeni: firmaId scope (header X-Firma-Id veya ?firmaId=) — kullanicinin aktif
    // firmasinin verilerini doner. super_admin firmaId vermezse tum kayitlar doner.
    // Soft-deleted (deletedAt'lı) kayıtlar UI'dan gizlenir.
    if (method === 'GET' && (url === '/api/init' || url.startsWith('/api/init?'))) {
      // Userid/rol artik auth context'ten — query string'e guven YOK (tampered olabilir)
      const qUserId = req._authCtx?.kullanici?.id || '';
      const qRol    = req._authCtx?.kullanici?.rol || '';
      const qFirmaId = String(req.headers['x-firma-id'] || '');
      const db = readDB();
      const filterLive = (arr) => (arr || []).filter(isLiveRecord);
      const filterByFirma = (arr) => {
        if (!qFirmaId) return arr;
        return arr.filter((r) => r && r.firmaId === qFirmaId);
      };
      const apply = (arr) => filterByFirma(filterLive(arr));
      // Referans per-firma → init'te aktif firma'nın referansını gönder.
      // Eski flat yapı gelirse migrate edip yaz; sonra istenen firma referansını seç.
      const refs = (() => {
        const r = db.referans;
        const isFlat = r && typeof r === 'object' && (Array.isArray(r.markalar) || Array.isArray(r.birimler) || Array.isArray(r.teslimSecenekleri));
        if (isFlat) {
          const flat = { markalar: r.markalar || [], birimler: r.birimler || [], teslimSecenekleri: r.teslimSecenekleri || [] };
          db.referans = { meba: { ...flat }, mesa: { ...flat }, elmos: { ...flat } };
          writeDB(db);
        } else if (!r || typeof r !== 'object') {
          db.referans = { meba: { markalar: [], birimler: [], teslimSecenekleri: [] }, mesa: { markalar: [], birimler: [], teslimSecenekleri: [] }, elmos: { markalar: [], birimler: [], teslimSecenekleri: [] } };
        }
        const fid = qFirmaId || 'meba';
        return db.referans[fid] || { markalar: [], birimler: [], teslimSecenekleri: [] };
      })();
      const cleanDb = {
        ...db,
        teklifler:   apply(db.teklifler),
        cariler:     apply(db.cariler),
        urunler:     apply(db.urunler),
        urunSetleri: apply(db.urunSetleri),
        referans:    refs,
        sayac:       (db.sayaclar && qFirmaId && db.sayaclar[qFirmaId]) || db.sayac || null,
      };
      // Hassas verileri (kullanici sifre hash'leri, oturumlar) gonderme
      delete cleanDb.kullanicilar;
      delete cleanDb.oturumlar;
      delete cleanDb.auditLog;
      const isAdminLike = qRol === 'super_admin' || qRol === 'firma_admin';
      if (isAdminLike || !qRol) {
        return send(res, 200, cleanDb);
      }
      const filteredTeklifler = cleanDb.teklifler.filter((t) => {
        const vis = t.visibility || 'team';
        return vis === 'team' || t.hazirlayanKullaniciId === qUserId;
      });
      return send(res, 200, { ...cleanDb, teklifler: filteredTeklifler });
    }

    // ── TEKLIFLER ─────────────────────────────────────────────────────────────
    // Custom GET /api/teklifler — visibility filter (userId+rol query params).
    // Admin tüm teklifleri görür; engineer/sales sadece kendi tekliflerini ve
    // visibility='team' (veya undefined → backward compat 'team') olanları.
    // Query yoksa (legacy caller) → tüm liste döner. Soft-deleted gizli.
    if (method === 'GET' && (url === '/api/teklifler' || url.startsWith('/api/teklifler?'))) {
      // Userid/rol artik auth context'ten — query string'e guven YOK
      const qUserId = req._authCtx?.kullanici?.id || '';
      const qRol = req._authCtx?.kullanici?.rol || '';
      const qFirmaId = String(req.headers['x-firma-id'] || '');
      let all = readDB().teklifler.filter(isLiveRecord);
      if (qFirmaId) all = all.filter((t) => t.firmaId === qFirmaId);
      const isAdminLike = qRol === 'super_admin' || qRol === 'firma_admin';
      if (!qRol || isAdminLike) {
        return send(res, 200, all);
      }
      const filtered = all.filter((t) => {
        const vis = t.visibility || 'team';
        return vis === 'team' || t.hazirlayanKullaniciId === qUserId;
      });
      return send(res, 200, filtered);
    }
    if (teklifCrud.upsert(url, method))       return await teklifCrud.handleUpsert(req, res, url);
    if (teklifCrud.remove(url, method))       return teklifCrud.handleRemove(req, res, url);

    // ── CARILER ──────────────────────────────────────────────────────────────
    // Logo upload/delete: generic CRUD'dan once eslessin diye burada
    if (method === 'POST'   && /^\/api\/cariler\/[^/]+\/logo$/.test(url)) return await authRoutes.uploadCariLogo(req, res, url);
    if (method === 'DELETE' && /^\/api\/cariler\/[^/]+\/logo$/.test(url)) return await authRoutes.deleteCariLogo(req, res, url);
    if (cariCrud.list(url, method))           return cariCrud.handleList(req, res);
    if (cariCrud.bulkReplace(url, method))    return await cariCrud.handleBulkReplace(req, res);
    if (cariCrud.upsert(url, method))         return await cariCrud.handleUpsert(req, res, url);
    if (cariCrud.remove(url, method))         return cariCrud.handleRemove(req, res, url);

    // ── URUNLER ──────────────────────────────────────────────────────────────
    if (urunCrud.list(url, method))           return urunCrud.handleList(req, res);
    if (urunCrud.bulkReplace(url, method))    return await urunCrud.handleBulkReplace(req, res);
    if (urunCrud.upsert(url, method))         return await urunCrud.handleUpsert(req, res, url);
    if (urunCrud.remove(url, method))         return urunCrud.handleRemove(req, res, url);

    // ── URUN SETLERI ─────────────────────────────────────────────────────────
    if (urunSetCrud.list(url, method))        return urunSetCrud.handleList(req, res);
    if (urunSetCrud.bulkReplace(url, method)) return await urunSetCrud.handleBulkReplace(req, res);
    if (urunSetCrud.upsert(url, method))      return await urunSetCrud.handleUpsert(req, res, url);
    if (urunSetCrud.remove(url, method))      return urunSetCrud.handleRemove(req, res, url);

    // ── REFERANS ─────────────────────────────────────────────────────────────

    // Referans per-firma yapı: db.referans = { meba:{markalar,...}, mesa:{...}, ... }
    // X-Firma-Id header'ına göre ilgili firmanın referansı döner. Eski (flat) yapı
    // gelirse bir kez migrate olur.
    function ensureReferansPerFirma(db) {
      const r = db.referans;
      const isFlat = r && typeof r === 'object' && (Array.isArray(r.markalar) || Array.isArray(r.birimler) || Array.isArray(r.teslimSecenekleri));
      if (isFlat) {
        const flat = { markalar: r.markalar || [], birimler: r.birimler || [], teslimSecenekleri: r.teslimSecenekleri || [] };
        db.referans = { meba: { ...flat }, mesa: { ...flat }, elmos: { ...flat } };
      } else if (!r || typeof r !== 'object') {
        db.referans = { meba: { markalar: [], birimler: [], teslimSecenekleri: [] }, mesa: { markalar: [], birimler: [], teslimSecenekleri: [] }, elmos: { markalar: [], birimler: [], teslimSecenekleri: [] } };
      }
      return db.referans;
    }
    function getReferansForFirma(db, firmaId) {
      const refs = ensureReferansPerFirma(db);
      const fid = firmaId || 'meba';
      if (!refs[fid]) refs[fid] = { markalar: [], birimler: [], teslimSecenekleri: [] };
      return refs[fid];
    }

    if (url === '/api/referans' && method === 'GET') {
      const db = readDB();
      const ctx = parseRequestCtx(req);
      return send(res, 200, getReferansForFirma(db, ctx.firmaId));
    }

    if (url === '/api/referans' && method === 'PUT') {
      const body = await parseBody(req);
      const db   = readDB();
      const ctx  = parseRequestCtx(req);
      const fid  = ctx.firmaId || 'meba';
      ensureReferansPerFirma(db);
      db.referans[fid] = body;
      writeDB(db);
      return send(res, 200, body);
    }

    // ── SAYAC ─────────────────────────────────────────────────────────────────

    // Eski endpoint — backward compat. Yeni: POST /api/sayac/:firmaId/increment
    // Eski client header/query'den firmaId verirse o firma sayacini arttir;
    // yoksa "meba" varsayilani kullan (eski tek-tenant davranis).
    if (url === '/api/sayac/increment' && method === 'POST') {
      const db = readDB();
      const ctx = parseRequestCtx(req);
      const firmaId = ctx.firmaId || 'meba';
      if (!db.sayaclar || typeof db.sayaclar !== 'object') db.sayaclar = {};
      const buYil = new Date().getFullYear();
      const buAy  = new Date().getMonth() + 1;
      // Eski formatı (flat number, null, vs) defansif olarak objeye normalize et.
      const mevcut = db.sayaclar[firmaId];
      if (!mevcut || typeof mevcut !== 'object' || typeof mevcut.deger !== 'number') {
        db.sayaclar[firmaId] = { yil: buYil, ay: buAy, deger: 0 };
      }
      const s = db.sayaclar[firmaId];
      if (s.yil !== buYil || s.ay !== buAy) {
        s.yil = buYil; s.ay = buAy; s.deger = 0;
      }
      s.deger += 1;
      writeDB(db);
      return send(res, 200, { firmaId, yil: s.yil, ay: s.ay, deger: s.deger });
    }

    // ── Puppeteer ile server-side PDF render ────────────────────────────────
    // Body: { teklifId } (token cookie/header session ile gelir; print sayfası
    // public render olduğu için Puppeteer'a session token inject ederiz)
    if (url === '/api/teklif/render-pdf' && method === 'POST') {
      const body = await parseBody(req);
      const teklifId = typeof body?.teklifId === 'string' ? body.teklifId.trim() : '';
      if (!teklifId) {
        return send(res, 400, { ok: false, error: 'teklif_id_required' });
      }

      const puppeteer = getPuppeteer();
      if (!puppeteer) {
        return send(res, 503, { ok: false, error: 'puppeteer_not_installed' });
      }
      const chromePath = findChrome();
      if (!chromePath) {
        return send(res, 503, { ok: false, error: 'chrome_not_found' });
      }

      // Caller'ın session token'i — Puppeteer'a localStorage'a inject ederiz ki
      // print sayfasi /api/teklifler fetch'inde 401 almasın. Frontend artık
      // X-Session-Token header'ı gönderiyor (CORS preflight uyumlu); eski
      // Authorization: Bearer formatı geriye uyumluluk için fallback olarak
      // korunur.
      const xSessionToken = req.headers['x-session-token'];
      const authHeader = req.headers['authorization'] || '';
      const sessionToken = (typeof xSessionToken === 'string' && xSessionToken)
        ? xSessionToken.trim()
        : (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
            ? authHeader.slice(7).trim()
            : '');

      // Kendi launcher portumuz (frontend dist serve eden static server)
      const printPort = SERVER_CONFIG.frontendPort || 5173;
      const printUrl = `http://localhost:${printPort}/teklif/${encodeURIComponent(teklifId)}/print`;

      let browser = null;
      try {
        browser = await puppeteer.launch({
          executablePath: chromePath,
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

        // Session token + active firmaId inject — apiClient bunları okur
        if (sessionToken) {
          await page.evaluateOnNewDocument((tok) => {
            try { localStorage.setItem('gc_session_token', tok); } catch (_) { /* ignore */ }
          }, sessionToken);
        }
        const firmaIdHeader = req.headers['x-firma-id'];
        if (typeof firmaIdHeader === 'string' && firmaIdHeader) {
          await page.evaluateOnNewDocument((fid) => {
            try { localStorage.setItem('gc_active_firma_id', fid); } catch (_) { /* ignore */ }
          }, firmaIdHeader);
        }

        await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForSelector('[data-print-ready="true"]', { timeout: 15000 });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          preferCSSPageSize: false,
        });

        const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
        return send(res, 200, { ok: true, pdfBase64, sayfa: pdfBuffer.length });
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        const code = msg.includes('Timeout') || msg.includes('timeout') ? 'timeout' : 'render_failed';
        return send(res, 500, { ok: false, error: code, detay: msg });
      } finally {
        if (browser) {
          try { await browser.close(); } catch (_) { /* ignore */ }
        }
      }
    }

    if ((url === '/api/teklif/disa-aktar' || url === '/api/pdf/kaydet-ve-ac') && method === 'POST') {
      const body = await parseBody(req);
      const teklif = body?.teklif;
      const pdfBase64 = typeof body?.pdfBase64 === 'string' ? body.pdfBase64.trim() : '';
      const hedef = body?.hedef === 'email' ? 'email' : 'pdf';
      const ayniMakineIstemci = isSameMachineClient(req);
      let kaydedilenDosyaYolu = '';
      let kaydedilenDosyaAdi = '';
      let teklifKaydiTamamlandi = false;

      if (!teklif || typeof teklif !== 'object' || typeof teklif.id !== 'string') {
        return send(res, 400, { error: 'Teklif kaydı bulunamadı.' });
      }

      if (!pdfBase64) {
        return send(res, 400, { error: 'PDF verisi alınamadı.' });
      }

      try {
        const masaustuYolu = masaustuYolunuBul();
        // Firma profilinden klasor adi cek. Onceligi sirayla:
        //   1) teklif.firmaId (kayittaki firma)
        //   2) request ctx'den firmaId (giris yapmis kullanicinin firmasi — header/query)
        //   3) fallback ("GRUP SIRKETLERI TEKLIFLER")
        // Eger teklifte firmaId yok ama ctx'ten geldiyse, teklif kaydina kalici
        // sekilde yazilir → sonraki PDF'lerde dogru klasor secilir.
        const dbForFirma = readDB();
        const ctxFirmaIdForExport = parseRequestCtx(req).firmaId;
        const teklifFirmaId = teklif?.firmaId || ctxFirmaIdForExport || null;
        if (!teklif.firmaId && ctxFirmaIdForExport) {
          teklif.firmaId = ctxFirmaIdForExport;
        }
        const teklifFirmaProfili = teklifFirmaId
          ? (dbForFirma.firmalar || []).find((f) => f.id === teklifFirmaId)
          : null;
        const kokKlasorAdi = pdfKokKlasorAdiUret(teklifFirmaProfili);
        const anaKlasorYolu = path.join(masaustuYolu, kokKlasorAdi);
        const altKlasorYolu = path.join(anaKlasorYolu, cariKlasorAdiUret(teklif?.cari?.firmaAdi ?? ''));
        const dosyaGovdesi = pdfDosyaGovdesiUret(teklif);
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        if (pdfBuffer.length === 0) {
          return send(res, 400, { error: 'PDF verisi geçersiz.' });
        }

        klasoruHazirla(anaKlasorYolu, 'Ana PDF klasörü oluşturulamadı.');
        klasoruHazirla(altKlasorYolu, 'Cari klasörü oluşturulamadı.');

        const { dosyaAdi, tamYol } = benzersizDosyaYoluUret(altKlasorYolu, dosyaGovdesi, 'pdf');
        kaydedilenDosyaYolu = tamYol;
        kaydedilenDosyaAdi = dosyaAdi;

        try {
          fs.writeFileSync(tamYol, pdfBuffer);
        } catch {
          throw new Error('PDF dosyası diske kaydedilemedi.');
        }

        const pdfOlusturmaTarihi = new Date().toISOString();
        const db = readDB();
        const ctx = parseRequestCtx(req);
        const teklifIndex = db.teklifler.findIndex((item) => item.id === teklif.id);
        const teklifKaydi = bumpRecord(
          teklifIndex >= 0 ? db.teklifler[teklifIndex] : null,
          {
            ...teklif,
            pdfYolu: tamYol,
            pdfDosyaAdi: dosyaAdi,
            pdfOlusturmaTarihi,
            guncellemeTarihi: pdfOlusturmaTarihi,
          },
          ctx,
        );

        if (teklifIndex >= 0) {
          db.teklifler[teklifIndex] = teklifKaydi;
        } else {
          db.teklifler.unshift(teklifKaydi);
        }

        try {
          writeDB(db);
          teklifKaydiTamamlandi = true;
        } catch {
          throw new Error('Teklif kaydı program altyapısına yazılamadı.');
        }

        const aliciEposta = normalizeWhitespace(teklif?.cari?.ePosta ?? '');
        const mailKonu = mailKonuUret(teklif, teklifFirmaProfili);
        const mailGovdesi = mailGovdesiUret(teklif, teklifFirmaProfili);

        // Logo: base64 olarak oku, yoksa null geç
        let logoBase64 = null;
        try {
          const logoYolu = firmaLogoYoluUret(mailFirmaProfiliUret(teklifFirmaProfili));
          logoBase64 = fs.readFileSync(logoYolu).toString('base64');
        } catch { /* logo okunamazsa imza logosuz olur */ }

        const mailHtmlGovdesi = mailHtmlGovdesiUret(teklif, logoBase64, teklifFirmaProfili);

        const acmaSonucu = hedef === 'pdf'
          ? dosyaAc(tamYol)
          : { acildi: false };
        const epostaSonucu = hedef === 'email' && ayniMakineIstemci
          ? await outlookTaslagiAc({
            aliciEposta,
            konu: mailKonu,
            govde: mailGovdesi,
            htmlGovde: mailHtmlGovdesi,
            ekDosyaYolu: tamYol,
          })
          : hedef === 'email'
          ? {
            epostaHazirlandi: false,
            epostaTaslakYontemi: null,
            epostaHatasi: 'İstemci uzak bilgisayarda olduğu için Outlook taslağı tarayıcı tarafında açılacak.',
          }
          : {
            epostaHazirlandi: false,
            epostaTaslakYontemi: null,
          };

        if (hedef === 'email') {
          emailTelemetryYaz({
            hedef,
            teklifId: teklif.id,
            teklifNo: teklif.teklifNo || null,
            aliciEposta: aliciEposta || null,
            epostaHazirlandi: Boolean(epostaSonucu.epostaHazirlandi),
            epostaTaslakYontemi: epostaSonucu.epostaTaslakYontemi || null,
            epostaHatasi: epostaSonucu.epostaHatasi || null,
            pdfYolu: tamYol,
          });
        }

        return send(res, 200, {
          teklif: teklifKaydi,
          masaustuYolu,
          klasorYolu: altKlasorYolu,
          pdfYolu: tamYol,
          pdfDosyaAdi: dosyaAdi,
          dosyaAcildi: acmaSonucu.acildi,
          dosyaAcmaHatasi: acmaSonucu.acmaHatasi,
          epostaHazirlandi: epostaSonucu.epostaHazirlandi,
          epostaHatasi: epostaSonucu.epostaHatasi,
          epostaTaslakYontemi: epostaSonucu.epostaTaslakYontemi,
          istemciTarafindaMailtoGerekli: hedef === 'email' && !ayniMakineIstemci,
          aliciEposta: aliciEposta || undefined,
          mailKonu: hedef === 'email' ? mailKonu : undefined,
          mailGovdesi: hedef === 'email' ? mailGovdesi : undefined,
        });
      } catch (error) {
        const hataMesaji = error instanceof Error ? error.message : 'PDF kayıt işlemi tamamlanamadı.';

        if (hedef === 'email') {
          emailTelemetryYaz({
            hedef,
            teklifId: teklif?.id || null,
            teklifNo: teklif?.teklifNo || null,
            aliciEposta: normalizeWhitespace(teklif?.cari?.ePosta ?? '') || null,
            epostaHazirlandi: false,
            epostaTaslakYontemi: null,
            epostaHatasi: hataMesaji,
            pdfYolu: kaydedilenDosyaYolu || null,
          });
        }

        if (kaydedilenDosyaYolu && !teklifKaydiTamamlandi) {
          return send(res, 500, {
            error: `PDF kaydedildi ancak program kaydına işlenemedi. ${hataMesaji}`,
            pdfYolu: kaydedilenDosyaYolu,
            pdfDosyaAdi: kaydedilenDosyaAdi,
          });
        }

        return send(res, 500, {
          error: hataMesaji,
          pdfYolu: kaydedilenDosyaYolu || undefined,
          pdfDosyaAdi: kaydedilenDosyaAdi || undefined,
        });
      }
    }

    // (Sync endpoint'leri kaldırıldı — online-only mimari. PUT/DELETE
    //  optimistic concurrency için bumpRecord/softDeleteRecord/isLiveRecord
    //  helper'ları korunuyor.)

    // ── MIGRATION endpoint — frontend pushes its localStorage data once ───────
    if (url === '/api/migrate' && method === 'POST') {
      const body = await parseBody(req);
      const db   = readDB();

      const serverEmpty =
        db.teklifler.length === 0 &&
        db.cariler.length <= 1 &&
        db.urunler.length <= 15;

      if (serverEmpty) {
        if (Array.isArray(body.teklifler) && body.teklifler.length > 0) db.teklifler = body.teklifler;
        if (Array.isArray(body.cariler) && body.cariler.length > 0)     db.cariler = body.cariler;
        if (Array.isArray(body.urunler) && body.urunler.length > 0)     db.urunler = body.urunler;
        if (body.referans) db.referans = { ...db.referans, ...body.referans };
        if (typeof body.sayacDeger === 'number' && body.sayacDeger > db.sayac.deger) db.sayac.deger = body.sayacDeger;
        writeDB(db);
        return send(res, 200, { migrated: true });
      }

      return send(res, 200, { migrated: false, reason: 'Server already has data' });
    }

    send(res, 404, { error: 'Not found' });

  } catch (err) {
    console.error('[API Error]', err);
    send(res, 500, { error: String(err) });
  }
});

server.on('error', (err) => {
  console.error('[Server Error]', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`  Port ${PORT} zaten kullanımda. Başka bir sunucu çalışıyor olabilir.`);
    process.exit(1);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('');
  console.log('  Grup Sirketleri Teklif — API Sunucusu');
  console.log('  Yerel:  http://localhost:' + PORT);
  console.log('  Ag:     http://' + ip + ':' + PORT);
  console.log('');
  startBackupScheduler();

  // Session cleanup — boot'ta 1 kez + her 1 saatte bir background olarak.
  // Hicbir kullanici online degilken DB'de zombi session birikmesin diye.
  pruneExpiredSessions(readDB, writeDB);
  setInterval(() => { pruneExpiredSessions(readDB, writeDB); }, 60 * 60 * 1000);
});
