import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { canAccessFirma } from '../lib/firmaScope.js';
import { mailKonuUret, mailGovdesiUretText, mailHtmlGovdesiUret, sendTeklifEmailFromUser } from '../lib/email.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

export const emailRouter: Router = Router();

function buildFileName(teklifNo: string | null, cariAdi: string | null): string {
  const cleanWord = (s: string) => s.replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim();
  const cari = cleanWord(cariAdi || 'TEKLIF').toLocaleUpperCase('tr-TR').split(' ').slice(0, 2).join(' ') || 'TEKLIF';
  const tn = cleanWord(teklifNo || '');
  return (tn ? `${cari} - ${tn}` : cari) + '.pdf';
}

// ── POST /api/teklif/eposta-gonder ──────────────────────────────
emailRouter.post(
  '/eposta-gonder',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as {
      teklifId?: string;
      to?: string;
      subject?: string;
      customMessage?: string;
      pdfBase64?: string;
    };
    const teklifId = String(body.teklifId || '').trim();
    const to = String(body.to || '').trim();
    const pdfBase64 = String(body.pdfBase64 || '').trim();
    if (!teklifId) throw new HttpError(400, 'teklifId zorunlu.');
    if (!to) throw new HttpError(400, 'Alıcı e-posta zorunlu.');
    if (!pdfBase64) throw new HttpError(400, 'pdfBase64 zorunlu.');

    const teklif = await prisma.teklif.findUnique({ where: { id: teklifId } });
    if (!teklif) throw new HttpError(404, 'Teklif bulunamadi.');
    if (!canAccessFirma(req.authCtx!.kullanici, teklif.firmaId)) {
      throw new HttpError(403, 'Bu teklife erisim yetkiniz yok.');
    }

    const firma = await prisma.firma.findUnique({ where: { id: teklif.firmaId } });
    const cariSnap = teklif.cariSnapshot as { firmaAdi?: string } | null;
    const subject = body.subject?.trim() || mailKonuUret({ teklifNo: teklif.teklifNo }, firma);
    const ctx = {
      contactName: teklif.contactName,
      contactTitle: teklif.contactTitle,
      cariAdi: cariSnap?.firmaAdi ?? null,
      teklifNo: teklif.teklifNo,
      hazirlayanAdSoyad: teklif.hazirlayanAdSoyad,
      hazirlayanUnvan: teklif.hazirlayanUnvan,
    };
    const text = mailGovdesiUretText(ctx, firma);
    const html = mailHtmlGovdesiUret(ctx, firma, null);
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (pdfBuffer.length === 0) throw new HttpError(400, 'PDF verisi geçersiz.');
    const fileName = buildFileName(teklif.teklifNo, cariSnap?.firmaAdi ?? null);

    const me = req.authCtx!.kullanici;
    const sonuc = await sendTeklifEmailFromUser(me, {
      to,
      subject,
      html,
      text,
      pdfBuffer,
      pdfFileName: fileName,
    });

    await prisma.emailLog.create({
      data: {
        teklifId: teklif.id,
        teklifNo: teklif.teklifNo,
        aliciEposta: to,
        gonderen: me.smtpFromAddress || me.smtpUser || null,
        durum: sonuc.ok ? 'sent' : 'failed',
        resendId: sonuc.messageId || null,
        hata: sonuc.error || null,
      },
    });

    if (!sonuc.ok) {
      res.status(502).json({ ok: false, error: sonuc.error || 'E-posta gönderilemedi.' });
      return;
    }
    res.json({ ok: true, messageId: sonuc.messageId, fileName, subject });
  }),
);
