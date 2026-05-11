import { Router } from 'express';
import { paramStr } from '../lib/params.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

export const bildirimlerRouter: Router = Router();

// ── GET /api/bildirimler — kullanıcının kendi bildirimleri ──────
bildirimlerRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.authCtx!.kullanici;
    const liste = await prisma.bildirim.findMany({
      where: { hedefKullaniciId: me.id },
      orderBy: { tarih: 'desc' },
    });
    res.json(liste);
  }),
);

// ── PATCH /api/bildirimler/:id — sadece kendi bildirimi ─────────
bildirimlerRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.authCtx!.kullanici;
    const id = paramStr(req, 'id');
    const mevcut = await prisma.bildirim.findUnique({ where: { id } });
    if (!mevcut) throw new HttpError(404, 'Bildirim bulunamadi.');
    if (mevcut.hedefKullaniciId !== me.id) {
      throw new HttpError(403, 'Bu bildirimi guncelleme yetkiniz yok.');
    }
    const body = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (typeof body.okundu === 'boolean') data.okundu = body.okundu;
    const updated = await prisma.bildirim.update({ where: { id }, data });
    res.json(updated);
  }),
);

// ── POST /api/bildirimler/toplu-okundu ──────────────────────────
bildirimlerRouter.post(
  '/toplu-okundu',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.authCtx!.kullanici;
    const result = await prisma.bildirim.updateMany({
      where: { hedefKullaniciId: me.id, okundu: false },
      data: { okundu: true },
    });
    res.json({ ok: true, degisen: result.count });
  }),
);
