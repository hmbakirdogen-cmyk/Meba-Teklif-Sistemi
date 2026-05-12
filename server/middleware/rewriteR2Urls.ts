/**
 * rewriteR2Urls.ts
 * ──────────────────────────────────────────────────────────────────
 * Tüm JSON response'larda Cloudflare r2.dev public URL'lerini backend
 * proxy endpoint'imize (/api/storage) yeniden yazan Express middleware.
 *
 * Neden:
 *   r2.dev URL'leri production'da güvenilmez — kurumsal firewall'larda
 *   SSL_PROTOCOL_ERROR veriyor, Cloudflare rate-limit uygulayabiliyor.
 *   DB'de tarihsel olarak r2.dev URL'leri kaydedilmiş; migration script
 *   ile kalıcı temizlenebilir ama production'da hızlı çözüm için
 *   response-time rewrite kullanıyoruz.
 *
 * Akış:
 *   res.json(...) çağrısı → body'yi string'e serialize et → r2.dev host'unu
 *   "/api/storage" ile değiştir → string'i içerikle gönder. JSON parse'a
 *   gerek yok, tek serialize + replace + send.
 *
 * Performans:
 *   Tüm JSON response'larda 1 regex replace çalışır (küçük body'lerde
 *   mikrosaniye seviye). Endpoint'ler için fark edilmez.
 */

import type { Request, Response, NextFunction } from 'express';

const R2_DEV_HOST_RE = /https?:\/\/pub-[a-f0-9]+\.r2\.dev/gi;

export function rewriteR2UrlsMiddleware(_req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  res.json = function (data: unknown) {
    try {
      const json = JSON.stringify(data);
      if (R2_DEV_HOST_RE.test(json)) {
        // Regex stateful — test sonrası reset
        R2_DEV_HOST_RE.lastIndex = 0;
        const rewritten = json.replace(R2_DEV_HOST_RE, '/api/storage');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.send(rewritten);
      }
    } catch {
      // serialize fail → orijinal davranış
    }
    return originalJson(data);
  };
  next();
}
