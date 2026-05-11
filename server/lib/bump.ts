/**
 * Sync alanları (version, deviceId, updatedBy, lastSyncedAt, guncellemeTarihi)
 * için yardımcılar. PUT/POST handler'ları create/update veri hazırlarken bunu
 * kullanır.
 */

export interface BumpCtx {
  deviceId?: string | null;
  userId?: string | null;
}

export interface BumpedFields {
  version: number;
  deviceId: string | null;
  updatedBy: string | null;
  lastSyncedAt: Date;
  guncellemeTarihi: Date;
}

export function nextVersion(prevVersion: number | null | undefined): number {
  return (typeof prevVersion === 'number' ? prevVersion : 0) + 1;
}

export function bumpFields(prevVersion: number | null | undefined, ctx: BumpCtx): BumpedFields {
  const now = new Date();
  return {
    version: nextVersion(prevVersion),
    deviceId: ctx.deviceId ?? null,
    updatedBy: ctx.userId ?? null,
    lastSyncedAt: now,
    guncellemeTarihi: now,
  };
}

export function softDeleteFields(prevVersion: number | null | undefined, ctx: BumpCtx) {
  return {
    ...bumpFields(prevVersion, ctx),
    deletedAt: new Date(),
  };
}
