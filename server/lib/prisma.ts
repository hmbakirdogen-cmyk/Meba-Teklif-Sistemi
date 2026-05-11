import { PrismaClient } from '@prisma/client';

declare global {
  // Dev-mode hot-reload sırasında her tsx watch döngüsünde yeni client
  // oluşturulmasın diye global'e cache'liyoruz.
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export type { Prisma } from '@prisma/client';
