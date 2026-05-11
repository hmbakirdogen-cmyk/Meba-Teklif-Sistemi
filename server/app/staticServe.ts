import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Express, Request, Response, NextFunction } from 'express';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dist/ klasörü repo root'a göre çözülür (server/app/staticServe.ts → ../../dist)
const DIST_DIR = path.resolve(__dirname, '..', '..', 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

export function mountStaticServe(app: Express): void {
  if (!fs.existsSync(DIST_DIR)) {
    console.warn('[staticServe] dist/ bulunamadı — frontend build edilmemiş olabilir.');
    return;
  }

  // Vite'ın hash'li immutable asset'leri için uzun cache.
  // index.html için no-cache (her zaman taze HTML, asset URL'leri içerik hash'i taşır).
  app.use(
    '/assets',
    express.static(path.join(DIST_DIR, 'assets'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: true,
    }),
  );

  // Diğer statik dosyalar (logo, favicon, vb.) — orta cache.
  app.use(
    express.static(DIST_DIR, {
      maxAge: '1d',
      fallthrough: true,
      index: false,
    }),
  );

  // SPA fallback — API olmayan istekler için index.html
  // Express 5 + path-to-regexp v8 syntax: '*' yerine '/*splat' veya middleware.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api/')) return next();
    if (!fs.existsSync(INDEX_HTML)) {
      res.status(503).send('Frontend build edilmemiş. `npm run build` çalıştırın.');
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(INDEX_HTML);
  });
}
