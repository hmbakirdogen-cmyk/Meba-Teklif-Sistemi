import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const AUDIT_LOG_MAX = 5000;

export interface AuditCtx {
  kullaniciId?: string | null;
  kullaniciAdi?: string | null;
  firmaId?: string | null;
}

/**
 * Audit log kaydı ekle ve son AUDIT_LOG_MAX (5000) girdiyi koru. Tablo
 * büyümesin diye periyodik kırpma uygulanır (asenkron, fire-and-forget).
 */
export async function audit(
  eylem: string,
  ctx: AuditCtx,
  detay?: Prisma.JsonValue | null,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        eylem,
        kullaniciId: ctx.kullaniciId ?? null,
        kullaniciAdi: ctx.kullaniciAdi ?? null,
        firmaId: ctx.firmaId ?? null,
        detay: (detay ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.warn('[audit] log yazılamadı:', err);
  }
}

let _pruneInFlight = false;
export async function auditPrune(): Promise<void> {
  if (_pruneInFlight) return;
  _pruneInFlight = true;
  try {
    const count = await prisma.auditLog.count();
    if (count <= AUDIT_LOG_MAX) return;
    const fazla = count - AUDIT_LOG_MAX;
    const eski = await prisma.auditLog.findMany({
      orderBy: { zaman: 'asc' },
      take: fazla,
      select: { id: true },
    });
    if (eski.length === 0) return;
    await prisma.auditLog.deleteMany({ where: { id: { in: eski.map((r) => r.id) } } });
  } finally {
    _pruneInFlight = false;
  }
}
