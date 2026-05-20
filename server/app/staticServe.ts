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

  // Diğer statik dosyalar (logo, favicon, markalar/*.png, vb.) — kisa cache.
  // 5 dakika: kullanici PWA'sini tekrar acinca veya 5 dk pasif kalinca yeni
  // surum gelir. 24 saat once cok uzundu (logo guncellemeleri 1 gun sonra
  // gorunuyordu). Hash'li /assets/* zaten 1y cache (icerik hash'i ile bust).
  app.use(
    express.static(DIST_DIR, {
      maxAge: '5m',
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
    // Agresif no-cache (PWA + browser HTTP cache + proxy hepsi için):
    //   no-store        → tarayıcı diske/belleğe yazmasın
    //   no-cache        → her istekte server'a sor (etag/304 bile olmasın)
    //   must-revalidate → eski sürümü asla kullanma
    //   max-age=0       → expire immediate
    //   Pragma + Expires → eski tarayıcılar / aradaki proxy'ler için
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(INDEX_HTML);
  });
}
