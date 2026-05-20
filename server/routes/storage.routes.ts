/**
 * storage.routes.ts
 * ──────────────────────────────────────────────────────────────────
 * Cloudflare R2 nesneleri için backend proxy endpoint.
 *
 *   GET /api/storage/firmalar/meba/logo.png  →  R2 bucket/firmalar/meba/logo.png
 *
 * Cloudflare R2 public URL'i (pub-*.r2.dev) production'da güvenilmez —
 * kurumsal firewall'larda engellenebiliyor, Cloudflare rate-limit uygulayabiliyor,
 * SSL provisioning hatası verebiliyor. Bu endpoint dosyaları kendi
 * domain'imizden (meba-teklif.onrender.com) serve eder; R2 bucket'ın public
 * olmasına bile gerek yoktur (AWS SDK ile signed erişim).
 *
 * Cache: dosyalar uzun cache header'ı ile döner; tarayıcı + CDN tarafında
 * cache'lenir. URL'lere cache-bust query string (?v=timestamp) zaten
 * uploadFile sırasında ekleniyor → güncel sürüm garantili.
 *
 * Auth: bu endpoint PUBLIC — herkes logo/foto görüntüleyebilir. Hassas
 * dosyalar (örn. müşteri PDF'leri) için presigned URL flow ayrıca mevcut.
 */

import { Router } from 'express';
import { streamObject } from '../lib/storage.js';

export const storageRouter: Router = Router();

storageRouter.get(/^\/(.+)/, async (req, res) => {
  // req.path → "/firmalar/meba/logo.png" → key = "firmalar/meba/logo.png"
  const raw = req.path.replace(/^\/+/, '');
  let key: string;
  try {
    key = decodeURIComponent(raw);
  } catch {
    key = raw;
  }

  // Path traversal koruması — R2 keyleri "/" içerir ama ".." içermez
  if (!key || key.includes('..') || key.includes('\0')) {
    res.status(400).json({ error: 'Gecersiz key.' });
    return;
  }

  try {
    const obj = await streamObject(key);
    if (!obj) {
      res.status(404).json({ error: 'Dosya bulunamadi.' });
      return;
    }
    if (obj.contentType) res.setHeader('Content-Type', obj.contentType);
    if (obj.contentLength != null) res.setHeader('Content-Length', String(obj.contentLength));
    if (obj.etag) res.setHeader('ETag', obj.etag);
    if (obj.lastModified) res.setHeader('Last-Modified', obj.lastModified.toUTCString());
    // 1 gün cache — URL'ler zaten ?v= cache-bust içeriyor, güncel sürüm garantili
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    obj.body.pipe(res);
    obj.body.on('error', (e: unknown) => {
      console.error('[storage] stream error:', e);
      if (!res.headersSent) res.status(502).end();
      else res.destroy();
    });
  } catch (err) {
    console.error('[storage] GET error:', err);
    if (!res.headersSent) {
      // R2 AccessDenied / NoSuchKey → frontend için 404 olarak davran;
      // tarayıcı retry yapmaz, broken image fallback'ine düşer, console
      // 500 alarmı vermez. Asıl gerçek hatalar için 500 ayrılı.
      const code = String((err as { Code?: string })?.Code ?? '');
      const name = String((err as { name?: string })?.name ?? '');
      const message = String((err as { message?: string })?.message ?? '');
      const isPermissionOrNotFound =
        code === 'AccessDenied' || code === 'NoSuchKey' ||
        name === 'AccessDenied' || name === 'NoSuchKey' ||
        message.includes('R2 env vars eksik');
      if (isPermissionOrNotFound) {
        res.status(404).json({ error: 'Dosya bulunamadi.' });
      } else {
        res.status(500).json({ error: 'Sunucu hatasi.' });
      }
    }
  }
});
