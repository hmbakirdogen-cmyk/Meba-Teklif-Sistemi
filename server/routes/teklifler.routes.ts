import { Router } from 'express';
import { paramStr } from '../lib/params.js';
import { prisma } from '../lib/prisma.js';
import { canAccessFirma, isYonetici } from '../lib/firmaScope.js';
import { bumpFields, softDeleteFields } from '../lib/bump.js';
import { deriveCtx } from '../lib/reqCtx.js';
import { shapeTeklif, shapeTeklifList } from '../lib/shape.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { uploadFile, deleteFile, r2Configured } from '../lib/storage.js';

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

    // Race condition fix: findUnique + create arasinda baska istek ayni id ile
    // yarisabilir (kullanici hizli edit yapinca client ayni id ile birden cok
    // upsert tetikliyor). Prisma.upsert atomic — tek query'de varsa update
    // yoksa create, unique constraint hatasi olusmaz.
    let final;
    if (existing) {
      final = await prisma.teklif.update({ where: { id }, data: { ...data, ...sync } });
    } else {
      try {
        final = await prisma.teklif.create({
          data: { id, ...(data as Record<string, unknown>), ...sync, deletedAt: null } as any,
        });
      } catch (err: any) {
        // P2002 = unique constraint — baska istek bizden once create etti
        if (err?.code === 'P2002') {
          final = await prisma.teklif.update({ where: { id }, data: { ...data, ...sync } });
        } else {
          throw err;
        }
      }
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

// ── POST /api/teklifler/:id/pdf-yukle — R2 arşiv ───────────────
tekliflerRouter.post(
  '/:id/pdf-yukle',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!r2Configured) throw new HttpError(503, 'R2 depolama yapılandırılmamış.');
    const id = paramStr(req, 'id');
    const me = req.authCtx!.kullanici;
    const existing = await prisma.teklif.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Teklif bulunamadı.');
    if (existing.firmaId && !canAccessFirma(me, existing.firmaId)) {
      throw new HttpError(403, 'Bu teklife erişim yetkiniz yok.');
    }

    const body = req.body ?? {};
    const pdfBase64 = String(body.pdfBase64 || '');
    const dosyaAdi = String(body.dosyaAdi || `${id}.pdf`).replace(/[^a-zA-Z0-9._\- ]/g, '_');
    if (!pdfBase64) throw new HttpError(400, 'pdfBase64 zorunlu.');

    const buffer = Buffer.from(pdfBase64, 'base64');
    if (buffer.length === 0) throw new HttpError(400, 'PDF verisi geçersiz.');

    // Eski PDF varsa sil
    if (existing.pdfUrl) {
      const oldKey = existing.pdfUrl.replace(/^https?:\/\/[^/]+\//, '').split('?')[0];
      deleteFile(oldKey).catch(() => {});
    }

    const firmaId = existing.firmaId || 'ortak';
    const key = `teklifler/${firmaId}/${id}/${dosyaAdi}`;
    const { url } = await uploadFile(key, buffer, 'application/pdf', {
      contentDisposition: `inline; filename="${dosyaAdi}"`,
      cacheControl: 'no-cache',
    });

    const ctx = deriveCtx(req);
    const sync = bumpFields(existing.version, { deviceId: ctx.deviceId, userId: ctx.userId });
    const updated = await prisma.teklif.update({
      where: { id },
      data: { pdfUrl: url, pdfDosyaAdi: dosyaAdi, pdfOlusturmaTarihi: new Date(), ...sync },
    });

    res.json({ ok: true, pdfUrl: url, teklif: shapeTeklif(updated) });
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
