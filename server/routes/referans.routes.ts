import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { canAccessFirma } from '../lib/firmaScope.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

export const referansRouter: Router = Router();

const REFERANS_DEFAULTS = {
  markalar: [] as string[],
  birimler: [] as string[],
  teslimSecenekleri: [] as string[],
  odemeVadesiSecenekleri: [] as string[],
  kdvOranlari: [] as string[],
  gecerlilikSecenekleri: [] as string[],
  paraBirimleri: [] as string[],
  dovizKuruSecenekleri: [] as string[],
};

function resolveFirmaIdFromReq(req: { headers: Record<string, unknown>; query: Record<string, unknown> }): string {
  const h = req.headers['x-firma-id'];
  if (typeof h === 'string' && h) return h;
  const q = req.query.firmaId;
  if (typeof q === 'string' && q) return q;
  return 'meba';
}

// ── GET /api/referans ──────────────────────────────────────────
referansRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const firmaId = resolveFirmaIdFromReq(req);
    if (!canAccessFirma(req.authCtx!.kullanici, firmaId)) {
      throw new HttpError(403, 'Bu firma referansina erisim yok.');
    }
    const r = await prisma.referans.findUnique({ where: { firmaId } });
    if (!r) {
      res.json({ ...REFERANS_DEFAULTS });
      return;
    }
    res.json({
      markalar: r.markalar,
      birimler: r.birimler,
      teslimSecenekleri: r.teslimSecenekleri,
      odemeVadesiSecenekleri: r.odemeVadesiSecenekleri,
      kdvOranlari: r.kdvOranlari,
      gecerlilikSecenekleri: r.gecerlilikSecenekleri,
      paraBirimleri: r.paraBirimleri,
      dovizKuruSecenekleri: r.dovizKuruSecenekleri,
    });
  }),
);

// ── PUT /api/referans ──────────────────────────────────────────
referansRouter.put(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const firmaId = resolveFirmaIdFromReq(req);
    if (!canAccessFirma(req.authCtx!.kullanici, firmaId)) {
      throw new HttpError(403, 'Bu firma referansina erisim yok.');
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const data = {
      markalar: Array.isArray(body.markalar) ? (body.markalar as string[]) : [],
      birimler: Array.isArray(body.birimler) ? (body.birimler as string[]) : [],
      teslimSecenekleri: Array.isArray(body.teslimSecenekleri) ? (body.teslimSecenekleri as string[]) : [],
      odemeVadesiSecenekleri: Array.isArray(body.odemeVadesiSecenekleri)
        ? (body.odemeVadesiSecenekleri as string[])
        : [],
      kdvOranlari: Array.isArray(body.kdvOranlari) ? (body.kdvOranlari as string[]) : [],
      gecerlilikSecenekleri: Array.isArray(body.gecerlilikSecenekleri)
        ? (body.gecerlilikSecenekleri as string[])
        : [],
      paraBirimleri: Array.isArray(body.paraBirimleri) ? (body.paraBirimleri as string[]) : [],
      dovizKuruSecenekleri: Array.isArray(body.dovizKuruSecenekleri)
        ? (body.dovizKuruSecenekleri as string[])
        : [],
    };
    const saved = await prisma.referans.upsert({
      where: { firmaId },
      update: data,
      create: { firmaId, ...data },
    });
    res.json({
      markalar: saved.markalar,
      birimler: saved.birimler,
      teslimSecenekleri: saved.teslimSecenekleri,
      odemeVadesiSecenekleri: saved.odemeVadesiSecenekleri,
      kdvOranlari: saved.kdvOranlari,
      gecerlilikSecenekleri: saved.gecerlilikSecenekleri,
      paraBirimleri: saved.paraBirimleri,
      dovizKuruSecenekleri: saved.dovizKuruSecenekleri,
    });
  }),
);
