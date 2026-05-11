import { Router } from 'express';
import { paramStr } from '../lib/params.js';
import { prisma } from '../lib/prisma.js';
import { canAccessFirma } from '../lib/firmaScope.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

export const sayacRouter: Router = Router();

async function incrementForFirma(firmaId: string) {
  const buYil = new Date().getFullYear();
  const buAy = new Date().getMonth() + 1;
  const existing = await prisma.sayac.findUnique({ where: { firmaId } });
  let s;
  if (!existing) {
    s = await prisma.sayac.create({
      data: { firmaId, yil: buYil, ay: buAy, deger: 1 },
    });
  } else if (existing.yil !== buYil || existing.ay !== buAy) {
    s = await prisma.sayac.update({
      where: { firmaId },
      data: { yil: buYil, ay: buAy, deger: 1 },
    });
  } else {
    s = await prisma.sayac.update({
      where: { firmaId },
      data: { deger: existing.deger + 1 },
    });
  }
  return s;
}

// ── POST /api/sayac/:firmaId/increment ──────────────────────────
sayacRouter.post(
  '/:firmaId/increment',
  requireAuth,
  asyncHandler(async (req, res) => {
    const firmaId = paramStr(req, 'firmaId');
    if (!canAccessFirma(req.authCtx!.kullanici, firmaId)) {
      throw new HttpError(403, 'Bu firma sayacina erisiminiz yok.');
    }
    const s = await incrementForFirma(firmaId);
    res.json({ firmaId: s.firmaId, yil: s.yil, ay: s.ay, deger: s.deger });
  }),
);

// ── POST /api/sayac/increment — backward compat ─────────────────
sayacRouter.post(
  '/increment',
  requireAuth,
  asyncHandler(async (req, res) => {
    const headerFirma = (req.headers['x-firma-id'] as string | undefined) || '';
    const firmaId = headerFirma || 'meba';
    if (!canAccessFirma(req.authCtx!.kullanici, firmaId)) {
      throw new HttpError(403, 'Bu firma sayacina erisiminiz yok.');
    }
    const s = await incrementForFirma(firmaId);
    res.json({ firmaId: s.firmaId, yil: s.yil, ay: s.ay, deger: s.deger });
  }),
);
