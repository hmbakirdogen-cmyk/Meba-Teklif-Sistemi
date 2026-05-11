import type { Request, Response, NextFunction } from 'express';
import { canAccessFirma } from '../lib/firmaScope.js';

/**
 * URL'den :firmaId paramı (veya request başka kaynaktan firmaId) ile auth
 * kullanıcısının firma erişimini doğrular.
 *
 * @param sourceParam - Express param adı (default 'firmaId').
 */
export function requireFirmaScope(sourceParam: string = 'firmaId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authCtx) {
      res.status(401).json({ error: 'Oturum gerekli.' });
      return;
    }
    const firmaId = String(req.params?.[sourceParam] || '');
    if (!firmaId) {
      res.status(400).json({ error: 'Firma id gerekli.' });
      return;
    }
    if (!canAccessFirma(req.authCtx.kullanici, firmaId)) {
      res.status(403).json({ error: 'Bu firmaya erisiminiz yok.' });
      return;
    }
    next();
  };
}
