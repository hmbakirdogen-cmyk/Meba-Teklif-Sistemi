'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const DB_PATH = path.join(__dirname, 'db.json');
const PORT    = 3001;

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
    if (method === 'GET' && url === '/api/init') {
      return send(res, 200, readDB());
    }

    // ── TEKLIFLER ─────────────────────────────────────────────────────────────
    if (teklifCrud.list(url, method))         return teklifCrud.handleList(res);
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
