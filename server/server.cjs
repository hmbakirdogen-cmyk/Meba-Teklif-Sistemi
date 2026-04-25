'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { spawn } = require('child_process');

const DB_PATH = path.join(__dirname, 'db.json');
const PORT    = 3001;
const PDF_ROOT_FOLDER_NAME = 'MEBA MEKAN\u0130K TEKL\u0130FLER';
const INVALID_WINDOWS_SEGMENT_REGEX = /[<>:"/\\|?*\u0000-\u001F]/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;

// ── DB helpers ────────────────────────────────────────────────────────────────

const DB_DEFAULTS = {
  teklifler: [],
  cariler: [],
  urunler: [],
  referans: { markalar: [], birimler: [], teslimSecenekleri: [] },
  sayac: { yil: new Date().getFullYear(), deger: 0 },
};

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (err) {
    console.warn('[readDB] db.json okunamadı, varsayılan yapı kullanılıyor:', err.message);
    return { ...DB_DEFAULTS };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
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

function mailHtmlGovdesiUret(teklif, logoBase64) {
  const kisi = normalizeWhitespace(teklif?.contactName ?? '');
  const title = teklif?.contactTitle === 'HANIM' ? 'Hanım' : 'Bey';
  const hitap = kisi ? `Sayın ${kisi} ${title},` : 'Sayın İlgili,';
  const cariAdi = normalizeWhitespace(teklif?.cari?.firmaAdi ?? '');
  const teklifNo = teklif?.teklifNo ?? '';
  const hazirlayanAdi = normalizeWhitespace(teklif?.hazirlayanAdSoyad ?? '');

  const govdeMetni = `${cariAdi ? cariAdi + ' için hazırladığımız teklif belgemiz' : 'Teklif belgemiz'}${teklifNo ? ' (No: ' + teklifNo + ')' : ''} ekte yer almaktadır. Herhangi bir sorunuz olması durumunda lütfen bizimle iletişime geçiniz.`;

  const logoHtml = logoBase64
    ? `<td style="padding-right:20px;vertical-align:middle;"><img src="data:image/png;base64,${logoBase64}" width="130" alt="MEBA" style="display:block;width:130px;height:auto;"></td>`
    : '';
  const infoBorderStyle = logoBase64 ? 'border-left:2px solid #1A2B42;padding-left:18px;' : '';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:600px;padding:28px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1e293b;line-height:1.65;">
  <p style="margin:0 0 14px;">${hitap}</p>
  <p style="margin:0 0 14px;">${govdeMetni}</p>
  <p style="margin:0 0 28px;">Saygılarımızla,</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;"><tr><td style="padding-top:20px;">
    <table style="border-collapse:collapse;">
      <tr>
        ${logoHtml}
        <td style="vertical-align:top;${infoBorderStyle}">
          ${hazirlayanAdi ? `<div style="font-weight:700;font-size:13px;color:#1A2B42;margin-bottom:3px;">${hazirlayanAdi}</div>` : ''}
          <div style="font-size:11px;color:#64748b;line-height:1.4;margin-bottom:10px;">MEBA Pnömatik Hidrolik Makina Elektrik Elektronik<br>Mühendislik San. Tic. Ltd. Şti.</div>
          <table style="border-collapse:collapse;font-size:12px;color:#334155;line-height:1.85;">
            <tr><td style="padding-right:6px;color:#64748b;white-space:nowrap;">T:</td><td>+90 352 502 07 80</td></tr>
            <tr><td style="color:#64748b;">E:</td><td>info@mebamekanik.com</td></tr>
            <tr><td style="color:#64748b;">W:</td><td>www.mebamekanik.com</td></tr>
          </table>
          <div style="font-size:11px;color:#94a3b8;margin-top:9px;">Kayseri OSB İnecik Mah. Fatih Sultan Mehmet Blv.<br>No:252/D Melikgazi / KAYSERİ</div>
        </td>
      </tr>
    </table>
  </td></tr></table>
</div>
</body></html>`;
}

function outlookTaslagiAc({ aliciEposta, konu, htmlGovde, ekDosyaYolu }) {
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
    return Promise.resolve({
      epostaHazirlandi: false,
      epostaHatasi: 'Geçici mail dosyası oluşturulamadı.',
      epostaTaslakYontemi: null,
    });
  }

  const script = [
    "$ErrorActionPreference = 'Stop'",
    '$outlook = New-Object -ComObject Outlook.Application',
    '$mail = $outlook.CreateItem(0)',
    `$mail.To = '${escapePowerShellLiteral(aliciEposta)}'`,
    `$mail.Subject = '${escapePowerShellLiteral(konu)}'`,
    `$mail.HTMLBody = [System.IO.File]::ReadAllText('${escapePowerShellLiteral(tempFile)}', [System.Text.Encoding]::UTF8)`,
    `$mail.Attachments.Add('${escapePowerShellLiteral(ekDosyaYolu)}') | Out-Null`,
    '$mail.Display()',
    `Remove-Item '${escapePowerShellLiteral(tempFile)}' -Force -ErrorAction SilentlyContinue`,
  ].join('; ');

  const result = spawn('powershell.exe', ['-NoProfile', '-STA', '-Command', script], {
    stdio: 'ignore',
  });

  return new Promise((resolve) => {
    result.on('error', () => {
      try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
      resolve({
        epostaHazirlandi: false,
        epostaHatasi: 'Outlook gönder penceresi açılamadı.',
        epostaTaslakYontemi: null,
      });
    });

    result.on('exit', (code) => {
      if (code === 0) {
        resolve({
          epostaHazirlandi: true,
          epostaTaslakYontemi: 'outlook',
        });
        return;
      }
      try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
      resolve({
        epostaHazirlandi: false,
        epostaHatasi: 'Outlook gönder penceresi açılamadı.',
        epostaTaslakYontemi: null,
      });
    });
  });
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
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': Buffer.byteLength(json, 'utf-8'),
  });
  res.end(json);
}

// ── Request router ────────────────────────────────────────────────────────────

// ── Generic CRUD factory — DRY handler for teklifler/cariler/urunler ──────────
function crudRoutes(collectionKey, { insertMethod = 'push' } = {}) {
  const basePath = `/api/${collectionKey}`;
  const itemRegex = new RegExp(`^/api/${collectionKey}/[^/]+$`);

  return {
    /** GET /api/<collection> */
    list(url, method) {
      return url === basePath && method === 'GET';
    },
    handleList(res) {
      return send(res, 200, readDB()[collectionKey]);
    },

    /** PUT /api/<collection> — bulk replace */
    bulkReplace(url, method) {
      return url === basePath && method === 'PUT';
    },
    async handleBulkReplace(req, res) {
      const body = await parseBody(req);
      const db = readDB();
      db[collectionKey] = body;
      writeDB(db);
      return send(res, 200, body);
    },

    /** PUT /api/<collection>/:id — upsert single */
    upsert(url, method) {
      return itemRegex.test(url) && method === 'PUT';
    },
    async handleUpsert(req, res, url) {
      const id = url.split('/')[3];
      const body = await parseBody(req);
      const db = readDB();
      const arr = db[collectionKey];
      const idx = arr.findIndex((item) => item.id === id);
      if (idx >= 0) {
        arr[idx] = body;
      } else if (insertMethod === 'unshift') {
        arr.unshift(body);
      } else {
        arr.push(body);
      }
      writeDB(db);
      return send(res, 200, body);
    },

    /** DELETE /api/<collection>/:id */
    remove(url, method) {
      return itemRegex.test(url) && method === 'DELETE';
    },
    handleRemove(res, url) {
      const id = url.split('/')[3];
      const db = readDB();
      db[collectionKey] = db[collectionKey].filter((item) => item.id !== id);
      writeDB(db);
      return send(res, 200, { ok: true });
    },
  };
}

const teklifCrud = crudRoutes('teklifler', { insertMethod: 'unshift' });
const cariCrud   = crudRoutes('cariler');
const urunCrud   = crudRoutes('urunler');

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const url = req.url || '';

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  try {

    // ── GET /api/init — fetch everything at once (used by frontend on startup) ──
    // Visibility filter teklifler üzerinde — /api/teklifler ile aynı kural.
    if (method === 'GET' && (url === '/api/init' || url.startsWith('/api/init?'))) {
      const parsed = new URL(url, 'http://localhost');
      const qUserId = parsed.searchParams.get('userId') || '';
      const qRol = parsed.searchParams.get('rol') || '';
      const db = readDB();
      if (!qRol || qRol === 'admin') {
        return send(res, 200, db);
      }
      const filteredTeklifler = db.teklifler.filter((t) => {
        const vis = t.visibility || 'team';
        return vis === 'team' || t.hazirlayanKullaniciId === qUserId;
      });
      return send(res, 200, { ...db, teklifler: filteredTeklifler });
    }

    // ── TEKLIFLER ─────────────────────────────────────────────────────────────
    // Custom GET /api/teklifler — visibility filter (userId+rol query params).
    // Admin tüm teklifleri görür; engineer/sales sadece kendi tekliflerini ve
    // visibility='team' (veya undefined → backward compat 'team') olanları.
    // Query yoksa (legacy caller) → tüm liste döner.
    if (method === 'GET' && (url === '/api/teklifler' || url.startsWith('/api/teklifler?'))) {
      const parsed = new URL(url, 'http://localhost');
      const qUserId = parsed.searchParams.get('userId') || '';
      const qRol = parsed.searchParams.get('rol') || '';
      const all = readDB().teklifler;
      if (!qRol || qRol === 'admin') {
        return send(res, 200, all);
      }
      const filtered = all.filter((t) => {
        const vis = t.visibility || 'team';
        return vis === 'team' || t.hazirlayanKullaniciId === qUserId;
      });
      return send(res, 200, filtered);
    }
    if (teklifCrud.upsert(url, method))       return await teklifCrud.handleUpsert(req, res, url);
    if (teklifCrud.remove(url, method))       return teklifCrud.handleRemove(res, url);

    // ── CARILER ──────────────────────────────────────────────────────────────
    if (cariCrud.list(url, method))           return cariCrud.handleList(res);
    if (cariCrud.bulkReplace(url, method))    return await cariCrud.handleBulkReplace(req, res);
    if (cariCrud.upsert(url, method))         return await cariCrud.handleUpsert(req, res, url);
    if (cariCrud.remove(url, method))         return cariCrud.handleRemove(res, url);

    // ── URUNLER ──────────────────────────────────────────────────────────────
    if (urunCrud.list(url, method))           return urunCrud.handleList(res);
    if (urunCrud.bulkReplace(url, method))    return await urunCrud.handleBulkReplace(req, res);
    if (urunCrud.upsert(url, method))         return await urunCrud.handleUpsert(req, res, url);
    if (urunCrud.remove(url, method))         return urunCrud.handleRemove(res, url);

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

    if (url === '/api/sayac/increment' && method === 'POST') {
      const db    = readDB();
      const buYil = new Date().getFullYear();
      if (db.sayac.yil !== buYil) {
        db.sayac.yil  = buYil;
        db.sayac.deger = 0;
      }
      db.sayac.deger += 1;
      writeDB(db);
      return send(res, 200, { yil: db.sayac.yil, deger: db.sayac.deger });
    }

    if ((url === '/api/teklif/disa-aktar' || url === '/api/pdf/kaydet-ve-ac') && method === 'POST') {
      const body = await parseBody(req);
      const teklif = body?.teklif;
      const pdfBase64 = typeof body?.pdfBase64 === 'string' ? body.pdfBase64.trim() : '';
      const hedef = body?.hedef === 'email' ? 'email' : 'pdf';
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
        const anaKlasorYolu = path.join(masaustuYolu, PDF_ROOT_FOLDER_NAME);
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
        const teklifKaydi = {
          ...teklif,
          pdfYolu: tamYol,
          pdfDosyaAdi: dosyaAdi,
          pdfOlusturmaTarihi,
          guncellemeTarihi: pdfOlusturmaTarihi,
        };
        const teklifIndex = db.teklifler.findIndex((item) => item.id === teklif.id);

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
        const epostaSonucu = hedef === 'email'
          ? await outlookTaslagiAc({
            aliciEposta,
            konu: mailKonu,
            htmlGovde: mailHtmlGovdesi,
            ekDosyaYolu: tamYol,
          })
          : {
            epostaHazirlandi: false,
            epostaTaslakYontemi: null,
          };

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
          aliciEposta: aliciEposta || undefined,
          mailKonu: hedef === 'email' ? mailKonu : undefined,
          mailGovdesi: hedef === 'email' ? mailGovdesi : undefined,
        });
      } catch (error) {
        const hataMesaji = error instanceof Error ? error.message : 'PDF kayit islemi tamamlanamadi.';

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
  console.log('  MEBA Teklif — API Sunucusu');
  console.log('  Yerel:  http://localhost:' + PORT);
  console.log('  Ag:     http://' + ip + ':' + PORT);
  console.log('');
});
