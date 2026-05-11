import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { canAccessFirma, isYonetici } from '../lib/firmaScope.js';
import { shapeTeklifList } from '../lib/shape.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const initRouter: Router = Router();

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

// ── GET /api/init — bulk pull, frontend boot'ta çağırır ─────────
initRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const k = req.authCtx!.kullanici;
    const firmaIdHeader = String(req.headers['x-firma-id'] || '');
    const firmaId = firmaIdHeader || null;

    const baseWhere: Record<string, unknown> = { deletedAt: null };
    if (firmaId) {
      if (!canAccessFirma(k, firmaId)) {
        res.json({ teklifler: [], cariler: [], urunler: [], urunSetleri: [], referans: REFERANS_DEFAULTS, sayac: null });
        return;
      }
      baseWhere.firmaId = firmaId;
    } else if (k.rol !== 'super_admin') {
      const izinli: string[] = [];
      if (k.rol === 'firma_admin' && k.gosterilenFirmalar.length > 0) {
        izinli.push(...k.gosterilenFirmalar);
      } else if (k.firmaId) {
        izinli.push(k.firmaId);
      }
      if (izinli.length === 0) {
        res.json({ teklifler: [], cariler: [], urunler: [], urunSetleri: [], referans: REFERANS_DEFAULTS, sayac: null });
        return;
      }
      baseWhere.firmaId = { in: izinli };
    }

    const [teklifler, cariler, urunler, urunSetleri, refRow, sayac, firmalar] = await Promise.all([
      prisma.teklif.findMany({ where: baseWhere, orderBy: { olusturmaTarihi: 'desc' } }),
      prisma.cari.findMany({ where: baseWhere, orderBy: { firmaAdi: 'asc' } }),
      prisma.urun.findMany({ where: baseWhere, orderBy: { urunAdi: 'asc' } }),
      prisma.urunSeti.findMany({ where: baseWhere }),
      firmaId ? prisma.referans.findUnique({ where: { firmaId } }) : null,
      firmaId ? prisma.sayac.findUnique({ where: { firmaId } }) : null,
      prisma.firma.findMany({ orderBy: { id: 'asc' } }),
    ]);

    // Visibility filter (admin değilse 'team' + kendi teklifler)
    const filteredTeklifler = isYonetici(k.rol)
      ? teklifler
      : teklifler.filter((t) => (t.visibility ?? 'team') === 'team' || t.hazirlayanKullaniciId === k.id);

    const referans = refRow
      ? {
          markalar: refRow.markalar,
          birimler: refRow.birimler,
          teslimSecenekleri: refRow.teslimSecenekleri,
          odemeVadesiSecenekleri: refRow.odemeVadesiSecenekleri,
          kdvOranlari: refRow.kdvOranlari,
          gecerlilikSecenekleri: refRow.gecerlilikSecenekleri,
          paraBirimleri: refRow.paraBirimleri,
          dovizKuruSecenekleri: refRow.dovizKuruSecenekleri,
        }
      : REFERANS_DEFAULTS;

    res.json({
      teklifler: shapeTeklifList(filteredTeklifler),
      cariler,
      urunler,
      urunSetleri,
      referans,
      sayac: sayac ? { yil: sayac.yil, ay: sayac.ay, deger: sayac.deger } : null,
      firmalar,
    });
  }),
);
