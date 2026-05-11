import type { Request } from 'express';
import type { Kullanici, Oturum } from '@prisma/client';

export interface AuthCtx {
  kullanici: Kullanici;
  oturum: Oturum;
}

declare module 'express-serve-static-core' {
  interface Request {
    authCtx?: AuthCtx;
  }
}

export interface RequestCtx {
  deviceId: string | null;
  userId: string | null;
  rol: string | null;
  firmaId: string | null;
  sessionToken: string | null;
}

/**
 * Request'ten device/user/firma bilgilerini çıkar. Auth middleware sonrası
 * `req.authCtx.kullanici` mevcuttur ve daha güvenilirdir; header/query
 * yalnızca pre-auth (login) veya ek context için.
 */
export function parseRequestCtx(req: Request): RequestCtx {
  const h = req.headers;
  const headerStr = (k: string): string | null => {
    const v = h[k];
    if (typeof v === 'string' && v) return v;
    if (Array.isArray(v) && v[0]) return v[0]!;
    return null;
  };
  const qUserId = (req.query?.userId as string | undefined) || null;
  const qRol = (req.query?.rol as string | undefined) || null;
  const qDeviceId = (req.query?.deviceId as string | undefined) || null;
  const qFirmaId = (req.query?.firmaId as string | undefined) || null;
  return {
    deviceId: headerStr('x-device-id') || qDeviceId,
    userId: headerStr('x-user-id') || qUserId,
    rol: headerStr('x-user-role') || qRol,
    firmaId: headerStr('x-firma-id') || qFirmaId,
    sessionToken: headerStr('x-session-token'),
  };
}

/** Auth + ctx birleşik — handler'lara şu format girer. */
export function deriveCtx(req: Request): RequestCtx {
  const baseCtx = parseRequestCtx(req);
  if (req.authCtx?.kullanici) {
    return {
      ...baseCtx,
      userId: req.authCtx.kullanici.id,
      rol: req.authCtx.kullanici.rol,
      firmaId: baseCtx.firmaId, // X-Firma-Id header — kullanıcının aktif firmasi
    };
  }
  return baseCtx;
}
