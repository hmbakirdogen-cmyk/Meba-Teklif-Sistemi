'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const DB_PATH = path.join(__dirname, 'db.json');
const PORT    = 3002;

// ── DB helpers ────────────────────────────────────────────────────────────────

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
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
    if (method === 'GET' && url === '/api/init') {
      return send(res, 200, readDB());
    }

    // ── TEKLIFLER ─────────────────────────────────────────────────────────────

    if (url === '/api/teklifler' && method === 'GET') {
      return send(res, 200, readDB().teklifler);
    }

    // PUT /api/teklifler/:id — upsert (create or update)
    if (/^\/api\/teklifler\/[^/]+$/.test(url) && method === 'PUT') {
      const id   = url.split('/')[3];
      const body = await parseBody(req);
      const db   = readDB();
      const idx  = db.teklifler.findIndex((t) => t.id === id);
      if (idx >= 0) {
        db.teklifler[idx] = body;
      } else {
        db.teklifler.unshift(body);
      }
      writeDB(db);
      return send(res, 200, body);
    }

    // DELETE /api/teklifler/:id
    if (/^\/api\/teklifler\/[^/]+$/.test(url) && method === 'DELETE') {
      const id = url.split('/')[3];
      const db = readDB();
      db.teklifler = db.teklifler.filter((t) => t.id !== id);
      writeDB(db);
      return send(res, 200, { ok: true });
    }

    // ── CARILER ──────────────────────────────────────────────────────────────

    if (url === '/api/cariler' && method === 'GET') {
      return send(res, 200, readDB().cariler);
    }

    // PUT /api/cariler — bulk replace (Excel import)
    if (url === '/api/cariler' && method === 'PUT') {
      const body = await parseBody(req);
      const db   = readDB();
      db.cariler = body;
      writeDB(db);
      return send(res, 200, body);
    }

    // PUT /api/cariler/:id — upsert single
    if (/^\/api\/cariler\/[^/]+$/.test(url) && method === 'PUT') {
      const id   = url.split('/')[3];
      const body = await parseBody(req);
      const db   = readDB();
      const idx  = db.cariler.findIndex((c) => c.id === id);
      if (idx >= 0) {
        db.cariler[idx] = body;
      } else {
        db.cariler.push(body);
      }
      writeDB(db);
      return send(res, 200, body);
    }

    // DELETE /api/cariler/:id
    if (/^\/api\/cariler\/[^/]+$/.test(url) && method === 'DELETE') {
      const id = url.split('/')[3];
      const db = readDB();
      db.cariler = db.cariler.filter((c) => c.id !== id);
      writeDB(db);
      return send(res, 200, { ok: true });
    }

    // ── URUNLER ──────────────────────────────────────────────────────────────

    if (url === '/api/urunler' && method === 'GET') {
      return send(res, 200, readDB().urunler);
    }

    // PUT /api/urunler — bulk replace (Excel import / sıfırla)
    if (url === '/api/urunler' && method === 'PUT') {
      const body = await parseBody(req);
      const db   = readDB();
      db.urunler = body;
      writeDB(db);
      return send(res, 200, body);
    }

    // PUT /api/urunler/:id — upsert single
    if (/^\/api\/urunler\/[^/]+$/.test(url) && method === 'PUT') {
      const id   = url.split('/')[3];
      const body = await parseBody(req);
      const db   = readDB();
      const idx  = db.urunler.findIndex((u) => u.id === id);
      if (idx >= 0) {
        db.urunler[idx] = body;
      } else {
        db.urunler.push(body);
      }
      writeDB(db);
      return send(res, 200, body);
    }

    // DELETE /api/urunler/:id
    if (/^\/api\/urunler\/[^/]+$/.test(url) && method === 'DELETE') {
      const id = url.split('/')[3];
      const db = readDB();
      db.urunler = db.urunler.filter((u) => u.id !== id);
      writeDB(db);
      return send(res, 200, { ok: true });
    }

    // ── REFERANS ─────────────────────────────────────────────────────────────

    if (url === '/api/referans' && method === 'GET') {
      return send(res, 200, readDB().referans);
    }

    // PUT /api/referans — replace whole referans object
    if (url === '/api/referans' && method === 'PUT') {
      const body = await parseBody(req);
      const db   = readDB();
      db.referans = body;
      writeDB(db);
      return send(res, 200, body);
    }

    // ── SAYAC ─────────────────────────────────────────────────────────────────

    // POST /api/sayac/increment — atomic increment, returns new value
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

    // ── MIGRATION endpoint — frontend pushes its localStorage data once ───────
    // POST /api/migrate — { teklifler, cariler, urunler, referans, sayacDeger }
    if (url === '/api/migrate' && method === 'POST') {
      const body = await parseBody(req);
      const db   = readDB();

      // Only migrate if server is still at defaults (no user data yet)
      const serverEmpty =
        db.teklifler.length === 0 &&
        db.cariler.length <= 1 &&
        db.urunler.length <= 15;

      if (serverEmpty) {
        if (Array.isArray(body.teklifler) && body.teklifler.length > 0) {
          db.teklifler = body.teklifler;
        }
        if (Array.isArray(body.cariler) && body.cariler.length > 0) {
          db.cariler = body.cariler;
        }
        if (Array.isArray(body.urunler) && body.urunler.length > 0) {
          db.urunler = body.urunler;
        }
        if (body.referans) {
          db.referans = { ...db.referans, ...body.referans };
        }
        if (typeof body.sayacDeger === 'number' && body.sayacDeger > db.sayac.deger) {
          db.sayac.deger = body.sayacDeger;
        }
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

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('');
  console.log('  MEBA Teklif — API Sunucusu');
  console.log('  Yerel:  http://localhost:' + PORT);
  console.log('  Ag:     http://' + ip + ':' + PORT);
  console.log('');
});
