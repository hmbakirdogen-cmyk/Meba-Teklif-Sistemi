import { Router } from 'express';
import { paramStr } from '../lib/params.js';
import { prisma } from '../lib/prisma.js';
import { canAccessFirma } from '../lib/firmaScope.js';
import { sanitizeFirma, uretInitials } from '../lib/sanitize.js';
import { audit } from '../lib/audit.js';
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

export const firmalarRouter: Router = Router();

// ── GET /api/firmalar — PUBLIC (login öncesi splash) ────────────
firmalarRouter.get(
  '/firmalar',
  asyncHandler(async (_req, res) => {
    const liste = await prisma.firma.findMany({ orderBy: { id: 'asc' } });
    res.json(liste.map(sanitizeFirma));
  }),
);

// ── GET /api/firma/:firmaId — auth ──────────────────────────────
firmalarRouter.get(
  '/firma/:firmaId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = paramStr(req, 'firmaId');
    if (!canAccessFirma(req.authCtx!.kullanici, id)) throw new HttpError(403, 'Bu firmaya erisiminiz yok.');
    const f = await prisma.firma.findUnique({ where: { id } });
    if (!f) throw new HttpError(404, 'Firma bulunamadi.');
    res.json(sanitizeFirma(f));
  }),
);

// ── PATCH /api/firma/:firmaId — admin'ler ───────────────────────
firmalarRouter.patch(
  '/firma/:firmaId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = paramStr(req, 'firmaId');
    if (!canAccessFirma(req.authCtx!.kullanici, id)) throw new HttpError(403, 'Bu firmayi duzenleyemezsiniz.');
    const f = await prisma.firma.findUnique({ where: { id } });
    if (!f) throw new HttpError(404, 'Firma bulunamadi.');

    const body = req.body ?? {};
    const izinli: (keyof typeof body)[] = [
      'ad',
      'kisaAd',
      'slogan',
      'logoUrl',
      'renkBirincil',
      'renkVurgu',
      'adres',
      'vergiDairesi',
      'vergiNo',
      'telefon',
      'eposta',
      'web',
      'iban',
      'pdfKlasorAdi',
      'teklifPrefix',
      'varsayilanlar',
      'logoScale',
    ];
    const data: Record<string, unknown> = {};
    for (const alan of izinli) {
      if (alan in body) data[alan as string] = body[alan];
    }

    const updated = await prisma.firma.update({ where: { id }, data });
    const k = req.authCtx!.kullanici;
    await audit('firma_guncellendi', { kullaniciId: k.id, kullaniciAdi: k.kullaniciAdi, firmaId: k.firmaId }, { firmaId: id });
    res.json(sanitizeFirma(updated));
  }),
);

// ── GET /api/firma/:firmaId/personel — PUBLIC ───────────────────
// Login ekranında firma kartlarında personel listesi gösterimi için.
// Hassas alanlar (sifreHash vb.) HİÇ gönderilmez.
firmalarRouter.get(
  '/firma/:firmaId/personel',
  asyncHandler(async (req, res) => {
    const firmaId = paramStr(req, 'firmaId');
    if (!firmaId) throw new HttpError(400, 'Firma id gerekli.');

    const liste = await prisma.kullanici.findMany({ where: { aktifMi: true } });
    const ROL_AGIRLIK: Record<string, number> = { super_admin: 0, firma_admin: 1, engineer: 2, sales: 3 };

    const filtered = liste
      .filter((u) => {
        if (u.rol === 'super_admin' || u.rol === 'firma_admin') {
          if (Array.isArray(u.gosterilenFirmalar) && u.gosterilenFirmalar.length > 0) {
            return u.gosterilenFirmalar.includes(firmaId);
          }
          return u.firmaId === firmaId;
        }
        return u.firmaId === firmaId;
      })
      .map((u) => ({
        id: u.id,
        kullaniciAdi: u.kullaniciAdi || '',
        adSoyad: u.adSoyad || '',
        unvan: u.unvan || '',
        rol: u.rol,
        firmaId: u.firmaId || null,
        profilFotoUrl: u.profilFotoUrl || null,
        initials: u.initials || uretInitials(u.adSoyad),
        telefon: u.telefon || '',
        dahili: u.dahili || '',
      }))
      .sort((a, b) => {
        const wa = ROL_AGIRLIK[a.rol] ?? 9;
        const wb = ROL_AGIRLIK[b.rol] ?? 9;
        if (wa !== wb) return wa - wb;
        return a.adSoyad.localeCompare(b.adSoyad, 'tr');
      });

    res.json(filtered);
  }),
);

// ── POST /api/firma/:firmaId/logo — super_admin/firma_admin ─────
import { uploadFile, decodeDataUrl, mimeToExt, MAX_PHOTO_BYTES } from '../lib/storage.js';

firmalarRouter.post(
  '/firma/:firmaId/logo',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = paramStr(req, 'firmaId');
    if (!canAccessFirma(req.authCtx!.kullanici, id)) throw new HttpError(403, 'Bu firmayi duzenleyemezsiniz.');
    const body = req.body ?? {};
    const fotoBase64 = String(body.fotoBase64 || '');
    if (!fotoBase64) throw new HttpError(400, 'fotoBase64 bos.');

    const { mime, buffer } = decodeDataUrl(fotoBase64);
    if (buffer.length === 0) throw new HttpError(400, 'Foto verisi gecersiz.');
    if (buffer.length > MAX_PHOTO_BYTES * 4) {
      throw new HttpError(400, 'Logo cok buyuk.');
    }
    const ext = mimeToExt(mime);
    const key = `firmalar/${id}/logo.${ext}`;
    const { url } = await uploadFile(key, buffer, mime);
    const cacheBust = `${url}?v=${Date.now()}`;
    const updated = await prisma.firma.update({ where: { id }, data: { logoUrl: cacheBust } });
    res.json(sanitizeFirma(updated));
  }),
);
