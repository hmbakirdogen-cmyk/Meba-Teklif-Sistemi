import { Router } from 'express';
import { paramStr } from '../lib/params.js';
import { prisma } from '../lib/prisma.js';
import { canAccessFirma } from '../lib/firmaScope.js';
import { bumpFields, softDeleteFields } from '../lib/bump.js';
import { deriveCtx } from '../lib/reqCtx.js';
import { uploadFile, deleteFile, decodeDataUrl, mimeToExt, MAX_PHOTO_BYTES } from '../lib/storage.js';
import { audit } from '../lib/audit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { makeCrud } from '../lib/crudFactory.js';

export const carilerRouter: Router = Router();
const crud = makeCrud('cari');

// ── POST /api/cariler/:id/logo — R2 upload ──────────────────────
carilerRouter.post(
  '/:id/logo',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = paramStr(req, 'id');
    const cari = await prisma.cari.findUnique({ where: { id } });
    if (!cari) throw new HttpError(404, 'Cari bulunamadi.');
    if (!canAccessFirma(req.authCtx!.kullanici, cari.firmaId)) {
      throw new HttpError(403, 'Bu cariye logo yukleme yetkiniz yok.');
    }
    const body = req.body ?? {};
    const fotoBase64 = String(body.fotoBase64 || '');
    if (!fotoBase64) throw new HttpError(400, 'fotoBase64 bos.');

    const { mime, buffer } = decodeDataUrl(fotoBase64);
    if (buffer.length === 0) throw new HttpError(400, 'Foto verisi gecersiz.');
    if (buffer.length > MAX_PHOTO_BYTES) {
      throw new HttpError(
        400,
        `Logo cok buyuk (${Math.round(buffer.length / 1024)} KB). Maks ${Math.round(MAX_PHOTO_BYTES / 1024)} KB.`,
      );
    }
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = mimeToExt(mime);
    const key = `cariler/${safeId}.${ext}`;
    const { url } = await uploadFile(key, buffer, mime);
    const cacheBust = `${url}?v=${Date.now()}`;

    const ctx = deriveCtx(req);
    const sync = bumpFields(cari.version, { deviceId: ctx.deviceId, userId: ctx.userId });
    const updated = await prisma.cari.update({
      where: { id },
      data: { logoUrl: cacheBust, logoYuklemeTarihi: new Date(), ...sync },
    });
    const me = req.authCtx!.kullanici;
    await audit('cari_logo_yuklendi', { kullaniciId: me.id, kullaniciAdi: me.kullaniciAdi, firmaId: me.firmaId }, { cariId: id });
    res.json({ logoUrl: cacheBust, cari: updated });
  }),
);

// ── DELETE /api/cariler/:id/logo ────────────────────────────────
carilerRouter.delete(
  '/:id/logo',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = paramStr(req, 'id');
    const cari = await prisma.cari.findUnique({ where: { id } });
    if (!cari) throw new HttpError(404, 'Cari bulunamadi.');
    if (!canAccessFirma(req.authCtx!.kullanici, cari.firmaId)) {
      throw new HttpError(403, 'Bu cariye yetkiniz yok.');
    }
    // R2'den sil — varsa
    if (cari.logoUrl) {
      const match = cari.logoUrl.match(/cariler\/([^/?]+)/);
      if (match) {
        const key = `cariler/${match[1]}`;
        await deleteFile(key).catch(() => {});
      }
    }
    const ctx = deriveCtx(req);
    const sync = bumpFields(cari.version, { deviceId: ctx.deviceId, userId: ctx.userId });
    const updated = await prisma.cari.update({
      where: { id },
      data: { logoUrl: null, logoYuklemeTarihi: null, ...sync },
    });
    const me = req.authCtx!.kullanici;
    await audit('cari_logo_silindi', { kullaniciId: me.id, kullaniciAdi: me.kullaniciAdi, firmaId: me.firmaId }, { cariId: id });
    res.json({ ok: true, cari: updated });
  }),
);

// ── Generic CRUD ───────────────────────────────────────────────
carilerRouter.get('/', requireAuth, asyncHandler(crud.handleList));
carilerRouter.put('/', requireAuth, asyncHandler(crud.handleBulkReplace));
carilerRouter.put('/:id', requireAuth, asyncHandler(crud.handleUpsert));
carilerRouter.delete('/:id', requireAuth, asyncHandler(crud.handleRemove));

// Re-export softDeleteFields for unused-var lint (used elsewhere)
void softDeleteFields;
