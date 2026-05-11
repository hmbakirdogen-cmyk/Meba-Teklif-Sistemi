import { Router } from 'express';
import { paramStr } from '../lib/params.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireSuperAdmin } from '../middleware/requireAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

export const geribildirimRouter: Router = Router();

const IZINLI_TUR = ['hata', 'oneri', 'mesaj'] as const;
type IzinliTur = (typeof IZINLI_TUR)[number];

function uretBildirimId(): string {
  return 'b-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function uretGeriBildirimId(): string {
  return 'gb-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── GET /api/geribildirim ───────────────────────────────────────
geribildirimRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.authCtx!.kullanici;
    if (me.rol === 'super_admin') {
      const liste = await prisma.geriBildirim.findMany({
        orderBy: { tarih: 'desc' },
      });
      res.json(formatList(liste));
      return;
    }
    const liste = await prisma.geriBildirim.findMany({
      where: { gonderenKullaniciId: me.id },
      orderBy: { tarih: 'desc' },
    });
    res.json(formatList(liste));
  }),
);

// ── POST /api/geribildirim ──────────────────────────────────────
geribildirimRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.authCtx!.kullanici;
    const body = req.body ?? {};
    const mesaj = String(body.mesaj || '').trim();
    const tur: string = String(body.tur || '');
    const sayfa = String(body.sayfa || 'bilinmeyen');
    if (!mesaj) throw new HttpError(400, 'Mesaj boş olamaz.');
    if (!(IZINLI_TUR as readonly string[]).includes(tur)) throw new HttpError(400, 'Geçersiz tür.');

    const yeni = await prisma.geriBildirim.create({
      data: {
        id: uretGeriBildirimId(),
        gonderenKullaniciId: me.id,
        gonderenAdSoyad: me.adSoyad,
        tur: tur as IzinliTur,
        sayfa,
        mesaj,
        okundu: false,
      },
    });
    res.json(formatOne(yeni));
  }),
);

// ── PATCH /api/geribildirim/:id — super_admin ───────────────────
geribildirimRouter.patch(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const me = req.authCtx!.kullanici;
    const id = paramStr(req, 'id');
    const mevcut = await prisma.geriBildirim.findUnique({ where: { id } });
    if (!mevcut) throw new HttpError(404, 'Bildirim bulunamadı.');
    const body = req.body ?? {};
    const data: Record<string, unknown> = {};
    const eskiCevap = mevcut.cevap || '';
    if (typeof body.okundu === 'boolean') data.okundu = body.okundu;
    if (typeof body.cevap === 'string') {
      const yeniCevap = body.cevap.trim() || null;
      data.cevap = yeniCevap;
      data.cevapTarihi = yeniCevap ? new Date() : null;

      // Cevap yeni eklendi/değiştiyse, geri bildirim sahibine bildirim aç
      if (yeniCevap && yeniCevap !== eskiCevap && mevcut.gonderenKullaniciId !== me.id) {
        const ozet = yeniCevap.length > 140 ? yeniCevap.slice(0, 140) + '…' : yeniCevap;
        await prisma.bildirim.create({
          data: {
            id: uretBildirimId(),
            hedefKullaniciId: mevcut.gonderenKullaniciId,
            kaynakKullaniciId: me.id,
            kaynakKullaniciAdSoyad: me.adSoyad,
            tur: 'geri_bildirim_cevap',
            geriBildirimId: mevcut.id,
            ozet,
            okundu: false,
          },
        });
      }
    }
    const updated = await prisma.geriBildirim.update({ where: { id }, data });
    res.json(formatOne(updated));
  }),
);

// ── DELETE /api/geribildirim/:id — super_admin ──────────────────
geribildirimRouter.delete(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = paramStr(req, 'id');
    await prisma.geriBildirim.delete({ where: { id } }).catch(() => {});
    res.json({ ok: true });
  }),
);

// ── helpers ─────────────────────────────────────────────────────
type GeriBildirimRow = {
  id: string;
  gonderenKullaniciId: string;
  gonderenAdSoyad: string | null;
  tur: string;
  sayfa: string | null;
  mesaj: string;
  okundu: boolean;
  cevap: string | null;
  cevapTarihi: Date | null;
  tarih: Date;
};

function formatOne(r: GeriBildirimRow) {
  return {
    id: r.id,
    gonderen: { id: r.gonderenKullaniciId, adSoyad: r.gonderenAdSoyad || '' },
    tarih: r.tarih.toISOString(),
    sayfa: r.sayfa || 'bilinmeyen',
    tur: r.tur,
    mesaj: r.mesaj,
    okundu: r.okundu,
    cevap: r.cevap,
    cevapTarihi: r.cevapTarihi ? r.cevapTarihi.toISOString() : null,
  };
}

function formatList(rows: GeriBildirimRow[]) {
  return rows.map(formatOne);
}
