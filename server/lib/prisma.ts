import { PrismaClient } from '@prisma/client';

declare global {
  // Dev-mode hot-reload sırasında her tsx watch döngüsünde yeni client
  // oluşturulmasın diye global'e cache'liyoruz.
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * DATABASE_URL'a Render basic-256mb için pool parametrelerini enjekte eder.
 * - connection_limit: 5 (Render starter Postgres ~25 conn limit; web service
 *   tek instance + cron + health check için bu yeterli)
 * - pool_timeout: 20 (varsayılan 10, Render Frankfurt latency'sinde kısa)
 *
 * Render dashboard'da DATABASE_URL üzerinden manuel override edilebilir,
 * ama burada da defansif olarak ayarlanır.
 */
function buildDatabaseUrl(): string {
  const base = process.env.DATABASE_URL || '';
  if (!base) return base;
  if (base.includes('connection_limit=')) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}connection_limit=5&pool_timeout=20`;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    datasources: { db: { url: buildDatabaseUrl() } },
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export type { Prisma } from '@prisma/client';
