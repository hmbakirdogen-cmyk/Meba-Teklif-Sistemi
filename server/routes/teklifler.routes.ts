import { Router } from 'express';
import { paramStr } from '../lib/params.js';
import { prisma } from '../lib/prisma.js';
import { canAccessFirma, isYonetici } from '../lib/firmaScope.js';
import { bumpFields, softDeleteFields } from '../lib/bump.js';
import { deriveCtx } from '../lib/reqCtx.js';
import { shapeTeklif, shapeTeklifList } from '../lib/shape.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

export const tekliflerRouter: Router = Router();

const MANAGED = new Set([
  'id',
  'version',
  'deviceId',
  'updatedBy',
  'lastSyncedAt',
  'deletedAt',
  'olusturmaTarihi',
  'guncellemeTarihi',
]);

function pickTeklifInput(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(body)) {
    if (MANAGED.has(k)) continue;
    // 'cari' eski format — cariSnapshot'a map'le
    if (k === 'cari') {
      out.cariSnapshot = body[k];
      continue;
    }
    out[k] = body[k];
  }
  return out;
}

// ── GET /api/teklifler — visibility filter ──────────────────────
tekliflerRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const k = req.authCtx!.kullanici;
    const firmaIdHeader = (req.headers['x-firma-id'] as string | undefined) || '';
    const where: Record<string, unknown> = { deletedAt: null };
    if (firmaIdHeader) {
      if (!canAccessFirma(k, firmaIdHeader)) {
        res.json([]);
        return;
      }
      where.firmaId = firmaIdHeader;
    } else if (k.rol !== 'super_admin') {
      const izinli: string[] = [];
      if (k.rol === 'firma_admin' && k.gosterilenFirmalar.length > 0) {
        izinli.push(...k.gosterilenFirmalar);
      } else if (k.firmaId) {
        izinli.push(k.firmaId);
      }
      if (izinli.length === 0) {
        res.json([]);
        return;
      }
      where.firmaId = { in: izinli };
    }
    const all = await prisma.teklif.findMany({
      where,
      orderBy: { olusturmaTarihi: 'desc' },
    });
    if (isYonetici(k.rol)) {
      res.json(shapeTeklifList(all));
      return;
    }
    const filtered = all.filter((t) => {
      const vis = t.visibility ?? 'team';
      return vis === 'team' || t.hazirlayanKullaniciId === k.id;
    });
    res.json(shapeTeklifList(filtered));
  }),
);

// ── PUT /api/teklifler/:id — upsert + atama bildirimi ───────────
tekliflerRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = paramStr(req, 'id');
    const me = req.authCtx!.kullanici;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ctx = deriveCtx(req);

    const existing = await prisma.teklif.findUnique({ where: { id } });
    const targetFirmaId = (body.firmaId as string | undefined) || existing?.firmaId;
    if (targetFirmaId && !canAccessFirma(me, targetFirmaId)) {
      throw new HttpError(403, 'Bu firmaya yazma yetkiniz yok.');
    }

    // Sahiplik kontrolü — personel başkasının teklifini düzenleyemez
    const adminLike = isYonetici(me.rol);
    if (!adminLike && existing) {
      if (existing.hazirlayanKullaniciId && existing.hazirlayanKullaniciId !== me.id) {
        throw new HttpError(403, 'Bu teklifi düzenleme yetkiniz yok.');
      }
    }
    if (!adminLike && !existing && !body.hazirlayanKullaniciId) {
      body.hazirlayanKullaniciId = me.id;
    }

    const oncekiIlgili = existing?.ilgiliKisiId ?? null;
    const data = pickTeklifInput(body);
    const sync = bumpFields(existing?.version, { deviceId: ctx.deviceId, userId: ctx.userId });

    let final;
    if (existing) {
      final = await prisma.teklif.update({ where: { id }, data: { ...data, ...sync } });
    } else {
      final = await prisma.teklif.create({
        data: { id, ...(data as Record<string, unknown>), ...sync, deletedAt: null } as any,
      });
    }

    // Atama bildirimi: ilgiliKisi yeni atandıysa veya değiştiyse
    const yeniIlgili = final.ilgiliKisiId ?? null;
    const hazirlayan = final.hazirlayanKullaniciId ?? null;
    if (yeniIlgili && yeniIlgili !== oncekiIlgili && yeniIlgili !== hazirlayan) {
      const kaynak = await prisma.kullanici.findUnique({ where: { id: me.id } });
      const cariAdi =
        (final.cariSnapshot && typeof final.cariSnapshot === 'object' && 'firmaAdi' in final.cariSnapshot
          ? String((final.cariSnapshot as { firmaAdi?: unknown }).firmaAdi ?? '')
          : '') || '';
      await prisma.bildirim.create({
        data: {
          id: 'b-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          hedefKullaniciId: yeniIlgili,
          kaynakKullaniciId: me.id,
          kaynakKullaniciAdSoyad: kaynak?.adSoyad ?? '',
          teklifId: final.id,
          teklifNo: final.teklifNo ?? '',
          cariAdi,
          tur: 'ilgili_atandi',
          okundu: false,
          firmaId: final.firmaId,
        },
      });
    }

    res.json(shapeTeklif(final));
  }),
);

// ── DELETE /api/teklifler/:id — soft delete ─────────────────────
tekliflerRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = paramStr(req, 'id');
    const me = req.authCtx!.kullanici;
    const existing = await prisma.teklif.findUnique({ where: { id } });
    if (!existing) {
      res.json({ ok: true });
      return;
    }
    if (existing.firmaId && !canAccessFirma(me, existing.firmaId)) {
      throw new HttpError(403, 'Bu teklife erisim yetkiniz yok.');
    }
    if (!isYonetici(me.rol) && existing.hazirlayanKullaniciId && existing.hazirlayanKullaniciId !== me.id) {
      throw new HttpError(403, 'Bu teklifi silme yetkiniz yok.');
    }
    const ctx = deriveCtx(req);
    const sync = softDeleteFields(existing.version, { deviceId: ctx.deviceId, userId: ctx.userId });
    await prisma.teklif.update({ where: { id }, data: sync });
    res.json({ ok: true });
  }),
);
