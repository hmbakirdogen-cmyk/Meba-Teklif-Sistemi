'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { spawn } = require('child_process');
const { createAuthRoutes, getAuthContext } = require('./auth-routes.cjs');
const { startBackupScheduler } = require('./backupScheduler.cjs');

const DB_PATH = path.join(__dirname, 'db.json');
const DB_LOCK_PATH = DB_PATH + '.lock';
const SYNC_TELEMETRY_LOG_PATH = path.join(__dirname, 'sync_telemetry.log');
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
  _devices: [],
};

function readDB() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    // Geriye uyumluluk: eski db.json'larda _devices yoksa init et
    if (!Array.isArray(data._devices)) data._devices = [];
    return data;
  } catch (err) {
    console.warn('[readDB] db.json okunamadi, varsayilan yapi kullaniliyor:', err.message);
    return { ...DB_DEFAULTS };
  }
}

// File lock ile yazma — multi-process write race condition'larina karsi
// ikinci hat savunma. Launcher PID lock primary.
function writeDBLocked(data) {
  let fd = null;
  let retries = 5;
  while (retries-- > 0) {
    try {
      fd = fs.openSync(DB_LOCK_PATH, 'wx'); // exclusive create
      break;
    } catch (err) {
      if (err.code === 'EEXIST' && retries > 0) {
        // 50ms backoff
        const wait = Date.now() + 50;
        while (Date.now() < wait) { /* busy wait — kisa surede biter */ }
        continue;
      }
      throw err;
    }
  }
  if (fd === null) {
    throw new Error('writeDBLocked: lock alinamadi (5 deneme)');
  }
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } finally {
    try { fs.closeSync(fd); } catch { /* ignore */ }
    try { fs.unlinkSync(DB_LOCK_PATH); } catch { /* ignore */ }
  }
}

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
  return {
    ...prev,
    ...incoming,
    version: prevVersion + 1,
    deviceId: deviceId || incoming.deviceId || (prev && prev.deviceId) || SERVER_CONFIG.deviceId,
    updatedBy: userId || incoming.updatedBy || (prev && prev.updatedBy) || (incoming.hazirlayanKullaniciId || (prev && prev.hazirlayanKullaniciId)) || null,
    lastSyncedAt: new Date().toISOString(),
    // Eski kayitlarda guncellemeTarihi varsa onu da yansit (Teklif tipi)
    guncellemeTarihi: incoming.guncellemeTarihi || new Date().toISOString(),
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

  throw new Error('Windows masaustu klasoru bulunamadi.');
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
      acmaHatasi: error instanceof Error ? error.message : 'PDF dosyasi acilamadi.',
    };
  }
}

function escapePowerShellLiteral(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function mailKonuUret(teklif) {
  return teklif.teklifNo ? `Teklif Belgesi - ${teklif.teklifNo}` : 'Teklif Belgesi';
}

function mailGovdesiUret(teklif) {
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

  satirlar.push(
    'MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik San. Tic. Ltd. Şti.',
    '',
    'T: +90 352 502 07 80',
    'E: info@mebamekanik.com',
    'W: www.mebamekanik.com',
    '',
    'Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv. No:252/D Melikgazi / KAYSERİ',
    sep,
  );

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

function mailHtmlGovdesiUret(teklif, logoBase64) {
  const kisi = normalizeWhitespace(teklif?.contactName ?? '');
  const title = teklif?.contactTitle === 'HANIM' ? 'Hanım' : 'Bey';
  const hitap = kisi ? `Sayın ${kisi} ${title},` : 'Sayın İlgili,';
  const cariAdi = normalizeWhitespace(teklif?.cari?.firmaAdi ?? '');
  const teklifNo = teklif?.teklifNo ?? '';
  const hazirlayanAdi = normalizeWhitespace(teklif?.hazirlayanAdSoyad ?? '');

  const govdeMetni = `${cariAdi ? cariAdi + ' için hazırladığımız teklif belgemiz' : 'Teklif belgemiz'}${teklifNo ? ' (No: ' + teklifNo + ')' : ''} ekte yer almaktadır. Herhangi bir sorunuz olması durumunda lütfen bizimle iletişime geçiniz.`;

  const logoHtml = logoBase64
    ? `<td style="padding-right:16px;vertical-align:top;width:195px;line-height:0;font-size:0;"><img src="data:image/png;base64,${logoBase64}" width="195" height="89" alt="MEBA" style="display:block;width:195px;height:89px;"></td>`
    : '';
  const separatorHtml = logoBase64
    ? `<td style="width:1px;background:#1A2B42;padding:0;"></td>`
    : '';
  const hazirlayanUnvan = normalizeWhitespace(teklif?.hazirlayanUnvan ?? '');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:600px;padding:28px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#1e293b;line-height:1.7;">
  <p style="margin:0 0 14px;">${hitap}</p>
  <p style="margin:0 0 14px;">${govdeMetni}</p>
  <p style="margin:0 0 24px;">Saygılarımızla,</p>
  <div style="border-top:1px solid #dde3ec;padding-top:16px;">
    <table style="border-collapse:collapse;" cellpadding="0" cellspacing="0">
      <tr>
        ${logoHtml}
        ${separatorHtml}
        <td style="vertical-align:top;padding-left:16px;">
          ${hazirlayanAdi ? `<div style="font-size:13px;font-weight:700;color:#1A2B42;line-height:1.3;margin-bottom:1px;">${hazirlayanAdi}${hazirlayanUnvan ? `<span style="font-weight:400;color:#64748b;font-size:12px;"> &nbsp;·&nbsp; ${hazirlayanUnvan}</span>` : ''}</div>` : ''}
          <div style="font-size:11px;color:#64748b;line-height:1.3;margin-bottom:7px;">MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Müh. San. Tic. Ltd. Şti.</div>
          <div style="font-size:12px;color:#334155;line-height:1.9;">
            <span style="color:#94a3b8;">T</span>&nbsp; +90 352 502 07 80 &nbsp;&nbsp;
            <span style="color:#94a3b8;">E</span>&nbsp; info@mebamekanik.com &nbsp;&nbsp;
            <span style="color:#94a3b8;">W</span>&nbsp; www.mebamekanik.com
          </div>
          <div style="font-size:11px;color:#94a3b8;line-height:1.4;margin-top:3px;">Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv. No:252/D Melikgazi / KAYSERİ</div>
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
    "  Add-Type -Namespace Win32 -Name User32 -MemberDefinition '[System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(System.IntPtr hWnd); [System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(System.IntPtr hWnd, int nCmdShow);' -ErrorAction SilentlyContinue | Out-Null",
    '  $hwndValue = 0',
    '  try { $hwndValue = [int64]$inspector.Hwnd } catch { $hwndValue = 0 }',
    '  if ($hwndValue -gt 0) {',
    '    [Win32.User32]::ShowWindowAsync([System.IntPtr]$hwndValue, 9) | Out-Null',
    '    [Win32.User32]::SetForegroundWindow([System.IntPtr]$hwndValue) | Out-Null',
    '  } else {',
    "    [Microsoft.VisualBasic.Interaction]::AppActivate('Outlook') | Out-Null",
    '  }',
    '} catch {',
    '  # Odak zorlamasi platform/surum kisitlarinda sessizce gecilir.',
    '}',
    'Start-Sleep -Milliseconds 120',
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

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  const json = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id, X-User-Id, X-User-Role, X-Session-Token, X-Firma-Id',
    'Content-Length': Buffer.byteLength(json, 'utf-8'),
  });
  res.end(json);
}

function syncTelemetryYaz(telemetry) {
  const record = { timestamp: new Date().toISOString(), ...telemetry };
  try {
    fs.appendFileSync(SYNC_TELEMETRY_LOG_PATH, JSON.stringify(record) + '\n', 'utf-8');
  } catch { /* ignore */ }
  if (SERVER_CONFIG.logLevel === 'debug') {
    try { console.info('[SyncTelemetry]', JSON.stringify(record)); } catch { /* ignore */ }
  }
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
    // Eski client (firmaId yollamaz): super_admin/admin ise tumu, degilse user.firmaId
    if (!requested) {
      if (ctx.rol === 'super_admin' || ctx.rol === 'admin') {
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
      if (idx >= 0) {
        arr[idx] = bumpRecord(arr[idx], body, ctx);
      } else {
        const fresh = bumpRecord(null, body, ctx);
        if (insertMethod === 'unshift') arr.unshift(fresh);
        else arr.push(fresh);
      }
      writeDB(db);
      const final = arr[idx >= 0 ? idx : (insertMethod === 'unshift' ? 0 : arr.length - 1)];
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

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id, X-User-Id, X-User-Role, X-Session-Token, X-Firma-Id',
    });
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

    // ── GET /api/init — fetch everything at once (used by frontend on startup) ──
    // Yeni: firmaId scope (header X-Firma-Id veya ?firmaId=) — kullanicinin aktif
    // firmasinin verilerini doner. super_admin firmaId vermezse tum kayitlar doner.
    // Soft-deleted (deletedAt'lı) kayıtlar UI'dan gizlenir.
    if (method === 'GET' && (url === '/api/init' || url.startsWith('/api/init?'))) {
      const parsed = new URL(url, 'http://localhost');
      const qUserId = parsed.searchParams.get('userId') || '';
      const qRol    = parsed.searchParams.get('rol') || '';
      const qFirmaId = parsed.searchParams.get('firmaId') || (req.headers['x-firma-id'] || '');
      const db = readDB();
      const filterLive = (arr) => (arr || []).filter(isLiveRecord);
      const filterByFirma = (arr) => {
        if (!qFirmaId) return arr;
        return arr.filter((r) => r && r.firmaId === qFirmaId);
      };
      const apply = (arr) => filterByFirma(filterLive(arr));
      const cleanDb = {
        ...db,
        teklifler:   apply(db.teklifler),
        cariler:     apply(db.cariler),
        urunler:     apply(db.urunler),
        urunSetleri: apply(db.urunSetleri),
        sayac:       (db.sayaclar && qFirmaId && db.sayaclar[qFirmaId]) || db.sayac || null,
      };
      // Hassas verileri (kullanici sifre hash'leri, oturumlar) gonderme
      delete cleanDb.kullanicilar;
      delete cleanDb.oturumlar;
      delete cleanDb.auditLog;
      const isAdminLike = qRol === 'admin' || qRol === 'super_admin' || qRol === 'firma_admin';
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
      const parsed = new URL(url, 'http://localhost');
      const qUserId = parsed.searchParams.get('userId') || '';
      const qRol = parsed.searchParams.get('rol') || '';
      const qFirmaId = parsed.searchParams.get('firmaId') || (req.headers['x-firma-id'] || '');
      let all = readDB().teklifler.filter(isLiveRecord);
      if (qFirmaId) all = all.filter((t) => t.firmaId === qFirmaId);
      const isAdminLike = qRol === 'admin' || qRol === 'super_admin' || qRol === 'firma_admin';
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

    if (url === '/api/referans' && method === 'GET') {
      return send(res, 200, readDB().referans);
    }

    if (url === '/api/referans' && method === 'PUT') {
      const body = await parseBody(req);
      const db   = readDB();
      db.referans = body;
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
      if (!db.sayaclar[firmaId]) {
        db.sayaclar[firmaId] = { yil: new Date().getFullYear(), ay: new Date().getMonth() + 1, deger: 0 };
      }
      const s = db.sayaclar[firmaId];
      const buYil = new Date().getFullYear();
      const buAy  = new Date().getMonth() + 1;
      if (s.yil !== buYil || s.ay !== buAy) {
        s.yil = buYil; s.ay = buAy; s.deger = 0;
      }
      s.deger += 1;
      writeDB(db);
      return send(res, 200, { firmaId, yil: s.yil, ay: s.ay, deger: s.deger });
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
        return send(res, 400, { error: 'Teklif kaydi bulunamadi.' });
      }

      if (!pdfBase64) {
        return send(res, 400, { error: 'PDF verisi alinamadi.' });
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
          return send(res, 400, { error: 'PDF verisi gecersiz.' });
        }

        klasoruHazirla(anaKlasorYolu, 'Ana PDF klasoru olusturulamadi.');
        klasoruHazirla(altKlasorYolu, 'Cari klasoru olusturulamadi.');

        const { dosyaAdi, tamYol } = benzersizDosyaYoluUret(altKlasorYolu, dosyaGovdesi, 'pdf');
        kaydedilenDosyaYolu = tamYol;
        kaydedilenDosyaAdi = dosyaAdi;

        try {
          fs.writeFileSync(tamYol, pdfBuffer);
        } catch {
          throw new Error('PDF dosyasi diske kaydedilemedi.');
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
          throw new Error('Teklif kaydi program altyapisina yazilamadi.');
        }

        const aliciEposta = normalizeWhitespace(teklif?.cari?.ePosta ?? '');
        const mailKonu = mailKonuUret(teklif);
        const mailGovdesi = mailGovdesiUret(teklif);

        // Logo: base64 olarak oku, yoksa null geç
        let logoBase64 = null;
        try {
          const logoYolu = path.join(__dirname, '..', 'public', 'logo-meba.png');
          logoBase64 = fs.readFileSync(logoYolu).toString('base64');
        } catch { /* logo okunamazsa imza logosuz olur */ }

        const mailHtmlGovdesi = mailHtmlGovdesiUret(teklif, logoBase64);

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
            epostaHatasi: 'Istemci uzak bilgisayarda oldugu icin Outlook taslagi tarayici tarafinda acilacak.',
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
        const hataMesaji = error instanceof Error ? error.message : 'PDF kayit islemi tamamlanamadi.';

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
            error: `PDF kaydedildi ancak program kaydina islenemedi. ${hataMesaji}`,
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

    // ══ SYNC ENDPOINTS ════════════════════════════════════════════════════════
    // Multi-PC LAN senkronizasyonu için. Tüm endpoint'ler defense-in-depth
    // visibility filter uygular (admin değilse private + ekibinin teklifleri).
    // Soft-deleted (deletedAt) kayıtlar pull'da tombstone olarak döner; UI
    // listelerinde gizli (handleList'te filter).

    if (method === 'GET' && (url === '/api/sync/status' || url.startsWith('/api/sync/status?'))) {
      const db = readDB();
      const stats = {
        ok: true,
        serverTime: new Date().toISOString(),
        deviceId: SERVER_CONFIG.deviceId,
        deviceLabel: SERVER_CONFIG.deviceLabel,
        recordCounts: {
          teklifler:   db.teklifler.length,
          cariler:     db.cariler.length,
          urunler:     db.urunler.length,
          urunSetleri: db.urunSetleri.length,
        },
        liveCounts: {
          teklifler:   db.teklifler.filter(isLiveRecord).length,
          cariler:     db.cariler.filter(isLiveRecord).length,
          urunler:     db.urunler.filter(isLiveRecord).length,
          urunSetleri: db.urunSetleri.filter(isLiveRecord).length,
        },
        registeredDevices: (db._devices || []).length,
      };
      return send(res, 200, stats);
    }

    // GET /api/sync/pull?since=<ISO>&userId=&rol=
    // since'den sonra updatedAt/lastSyncedAt'lı tüm kayıtları döner (tombstone'lar dahil).
    // Visibility filter ZORUNLU.
    if (method === 'GET' && url.startsWith('/api/sync/pull')) {
      const parsed = new URL(url, 'http://localhost');
      const since = parsed.searchParams.get('since') || '';
      const qUserId = parsed.searchParams.get('userId') || '';
      const qRol = parsed.searchParams.get('rol') || '';
      const db = readDB();

      // since filter: lastSyncedAt > since OR (since boşsa tümü)
      const sinceFilter = (rec) => {
        if (!since) return true;
        const ts = rec.lastSyncedAt || rec.guncellemeTarihi || rec.olusturmaTarihi || '';
        return ts > since;
      };

      // Visibility filter teklifler için
      const visibilityOk = (t) => {
        if (qRol === 'admin') return true;
        const vis = t.visibility || 'team';
        return vis === 'team' || t.hazirlayanKullaniciId === qUserId;
      };

      const teklifler   = db.teklifler.filter((r) => sinceFilter(r) && visibilityOk(r));
      const cariler     = db.cariler.filter(sinceFilter);
      const urunler     = db.urunler.filter(sinceFilter);
      const urunSetleri = db.urunSetleri.filter(sinceFilter);

      return send(res, 200, {
        serverTime: new Date().toISOString(),
        teklifler,
        cariler,
        urunler,
        urunSetleri,
      });
    }

    // POST /api/sync/push — bulk upsert with version-vector check
    // Body: { teklifler?, cariler?, urunler?, urunSetleri? } — her biri sync alanlarıyla
    // Conflict: incoming.version <= existing.version ise reddedilir (existing döner).
    if (method === 'POST' && url === '/api/sync/push') {
      const body = await parseBody(req);
      const ctx = parseRequestCtx(req);
      const db = readDB();
      const conflicts = [];
      const accepted = [];

      const collections = ['teklifler', 'cariler', 'urunler', 'urunSetleri'];
      for (const col of collections) {
        const incoming = Array.isArray(body[col]) ? body[col] : [];
        const arr = db[col] || (db[col] = []);
        for (const item of incoming) {
          if (!item || !item.id) continue;
          const idx = arr.findIndex((r) => r.id === item.id);
          const existing = idx >= 0 ? arr[idx] : null;

          // Yetki kontrolü — sadece teklifler için (cari/ürün paylaşımlı)
          if (col === 'teklifler' && existing && ctx.rol !== 'admin') {
            if (existing.hazirlayanKullaniciId && existing.hazirlayanKullaniciId !== ctx.userId) {
              conflicts.push({ collection: col, id: item.id, reason: 'forbidden', existing });
              continue;
            }
          }

          // Version-vector check
          const incomingVer = typeof item.version === 'number' ? item.version : 0;
          const existingVer = existing && typeof existing.version === 'number' ? existing.version : 0;
          if (existing && incomingVer <= existingVer && incomingVer > 0) {
            // Client eski sürüm gönderdi — conflict
            conflicts.push({ collection: col, id: item.id, reason: 'version_conflict', existing });
            continue;
          }

          // Bumpla ve kabul et
          if (idx >= 0) {
            arr[idx] = bumpRecord(existing, item, ctx);
            accepted.push({ collection: col, id: item.id, version: arr[idx].version });
          } else {
            const fresh = bumpRecord(null, item, ctx);
            if (col === 'teklifler') arr.unshift(fresh);
            else arr.push(fresh);
            accepted.push({ collection: col, id: item.id, version: fresh.version });
          }
        }
      }

      writeDB(db);
      syncTelemetryYaz({
        op: 'push',
        deviceId: ctx.deviceId,
        userId: ctx.userId,
        accepted: accepted.length,
        conflicts: conflicts.length,
      });
      return send(res, 200, {
        serverTime: new Date().toISOString(),
        accepted,
        conflicts,
      });
    }

    // POST /api/sync/full — admin + same-machine only; tüm DB'yi replace eder.
    // Acil durum kurtarma için — yanlış makineden çağrılırsa yıkıcı olur.
    if (method === 'POST' && url === '/api/sync/full') {
      const ctx = parseRequestCtx(req);
      if (ctx.rol !== 'admin') {
        return send(res, 403, { error: 'Sadece admin /api/sync/full kullanabilir.' });
      }
      if (!isSameMachineClient(req)) {
        return send(res, 403, { error: 'Full restore yalnızca server makinesinden tetiklenebilir.' });
      }
      const body = await parseBody(req);
      const db = readDB();
      const merged = {
        ...db,
        teklifler:   Array.isArray(body.teklifler)   ? body.teklifler   : db.teklifler,
        cariler:     Array.isArray(body.cariler)     ? body.cariler     : db.cariler,
        urunler:     Array.isArray(body.urunler)     ? body.urunler     : db.urunler,
        urunSetleri: Array.isArray(body.urunSetleri) ? body.urunSetleri : db.urunSetleri,
      };
      writeDB(merged);
      syncTelemetryYaz({ op: 'full', deviceId: ctx.deviceId, userId: ctx.userId });
      return send(res, 200, { ok: true, replaced: true, serverTime: new Date().toISOString() });
    }

    if (method === 'GET' && (url === '/api/sync/devices' || url.startsWith('/api/sync/devices?'))) {
      const db = readDB();
      return send(res, 200, db._devices || []);
    }

    if (method === 'POST' && url === '/api/sync/register-device') {
      const body = await parseBody(req);
      if (!body.deviceId) return send(res, 400, { error: 'deviceId zorunlu.' });
      const db = readDB();
      if (!Array.isArray(db._devices)) db._devices = [];
      const idx = db._devices.findIndex((d) => d.deviceId === body.deviceId);
      const record = {
        deviceId:    body.deviceId,
        deviceLabel: body.deviceLabel || 'Bilinmeyen Cihaz',
        firstSeenAt: idx >= 0 ? db._devices[idx].firstSeenAt : new Date().toISOString(),
        lastSeenAt:  new Date().toISOString(),
        userAgent:   req.headers['user-agent'] || '',
      };
      if (idx >= 0) db._devices[idx] = record;
      else db._devices.push(record);
      writeDB(db);
      return send(res, 200, record);
    }

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
});
