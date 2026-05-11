import type { Request, Response, NextFunction } from 'express';
import { oturumDogrula } from '../lib/sessions.js';

/** X-Session-Token header'ı doğrula, req.authCtx'a kullanıcı + oturumu ekle. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const raw = req.headers['x-session-token'];
  const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  if (!token) {
    res.status(401).json({ error: 'Oturum gerekli.' });
    return;
  }
  const oturum = await oturumDogrula(token);
  if (!oturum) {
    res.status(401).json({ error: 'Oturum gecersiz veya suresi dolmus.' });
    return;
  }
  req.authCtx = { kullanici: oturum.kullanici, oturum };
  next();
}

/** Bazı role yetkilerini gerektirir. */
export function requireRol(...roller: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authCtx) {
      res.status(401).json({ error: 'Oturum gerekli.' });
      return;
    }
    if (!roller.includes(req.authCtx.kullanici.rol)) {
      res.status(403).json({ error: 'Bu islem icin yetkili degilsiniz.' });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRol('super_admin', 'firma_admin');
export const requireSuperAdmin = requireRol('super_admin');
