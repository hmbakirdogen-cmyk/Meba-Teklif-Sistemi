'use strict';

/**
 * launcher/staticServer.cjs — Production'da `dist/` klasörünü servisleyen
 * 50-satırlık Node http static server. Vite runtime gereksiz.
 *
 * SPA fallback: bilinmeyen yollar index.html'e yönlendirilir
 * (React Router client-side routing için).
 *
 * Electron geçişinde BrowserWindow.loadFile ile değiştirilebilir; bu modül
 * plain web mode için kalır.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.txt':  'text/plain; charset=utf-8',
};

function safeResolve(rawUrl) {
  // Query string'i at, decode et, normalize et
  const urlPath = decodeURIComponent(rawUrl.split('?')[0].split('#')[0]);
  // Path traversal guard: dist/ dışına çıkmasın
  const target = path.join(DIST_DIR, urlPath);
  const normalized = path.normalize(target);
  if (!normalized.startsWith(DIST_DIR)) return null;
  return normalized;
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    });
    res.end(data);
  });
}

/**
 * dist/ klasörünü servis eden HTTP sunucusu başlatır.
 * @param {{port: number, onLog?: Function}} opts
 */
function startStaticServer({ port = 5173, onLog = () => {} } = {}) {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`dist/ klasörü yok: ${DIST_DIR}. Önce 'npm run build' çalıştırın.`);
  }

  const server = http.createServer((req, res) => {
    const url = req.url || '/';
    let filePath = safeResolve(url);
    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isFile()) {
        return serveFile(filePath, res);
      }
      // Klasör veya not-found → SPA fallback (index.html)
      const indexPath = path.join(DIST_DIR, 'index.html');
      serveFile(indexPath, res);
    });
  });

  server.listen(port, '0.0.0.0', () => {
    onLog(`[static] dist/ sunuluyor: http://localhost:${port}`);
  });

  return server;
}

module.exports = { startStaticServer };
