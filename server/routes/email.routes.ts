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

function normalizeRecipients(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string') {
    return value.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((v) => String(v || '').trim()).filter(Boolean);
  }
  return [];
}

/** HTML body'den plain text fallback üretir (basit tag-strip). */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── POST /api/teklif/eposta-gonder ──────────────────────────────
emailRouter.post(
  '/eposta-gonder',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as {
      teklifId?: string;
      to?: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
      subject?: string;
      bodyHtml?: string;
      bodyText?: string;
      logoBase64?: string;
      logoContentType?: string;
      partnerLogos?: Array<{ cid?: string; base64?: string; contentType?: string }>;
      pdfBase64?: string;
    };
    const teklifId = String(body.teklifId || '').trim();
    const toList = normalizeRecipients(body.to);
    const ccList = normalizeRecipients(body.cc);
    const bccList = normalizeRecipients(body.bcc);
    const pdfBase64 = String(body.pdfBase64 || '').trim();
    if (!teklifId) throw new HttpError(400, 'teklifId zorunlu.');
    if (toList.length === 0) throw new HttpError(400, 'Alıcı e-posta zorunlu.');
    if (!pdfBase64) throw new HttpError(400, 'pdfBase64 zorunlu.');

    const teklif = await prisma.teklif.findUnique({ where: { id: teklifId } });
    if (!teklif) throw new HttpError(404, 'Teklif bulunamadi.');
    if (!canAccessFirma(req.authCtx!.kullanici, teklif.firmaId)) {
      throw new HttpError(403, 'Bu teklife erisim yetkiniz yok.');
    }

    const firma = await prisma.firma.findUnique({ where: { id: teklif.firmaId } });
    const cariSnap = teklif.cariSnapshot as { firmaAdi?: string } | null;
    const subject = body.subject?.trim() || mailKonuUret({ teklifNo: teklif.teklifNo }, firma);

    // Modal'dan bodyHtml geldiyse onu kullan; gelmediyse template ile üret
    // (eski mailto akışından dönen istekler için backward compat).
    // İmza HER ZAMAN şu an mail gönderen (aktif) kullanıcının bilgilerini gösterir;
    // teklifi orijinal kimin hazırladığından bağımsız. Sebep: bir başkası başka
    // birinin teklifini "kendi" gönderdiğinde imzada kendi bilgisinin görünmesi
    // gerekiyor (alıcı maile yanıt verirse doğru kişiye gitsin).
    const meKullanici = req.authCtx!.kullanici;
    const ctx = {
      contactName: teklif.contactName,
      contactTitle: teklif.contactTitle,
      cariAdi: cariSnap?.firmaAdi ?? null,
      teklifNo: teklif.teklifNo,
      hazirlayanAdSoyad: meKullanici.adSoyad ?? teklif.hazirlayanAdSoyad,
      hazirlayanUnvan: meKullanici.unvan ?? teklif.hazirlayanUnvan,
      hazirlayanTelefon: meKullanici.telefon,
      hazirlayanEposta: meKullanici.smtpFromAddress ?? meKullanici.smtpUser,
    };
    const html = (body.bodyHtml && body.bodyHtml.trim().length > 0)
      ? body.bodyHtml
      : mailHtmlGovdesiUret(ctx, firma, null);
    const text = (body.bodyText && body.bodyText.trim().length > 0)
      ? body.bodyText
      : (body.bodyHtml ? htmlToText(body.bodyHtml) : mailGovdesiUretText(ctx, firma));

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (pdfBuffer.length === 0) throw new HttpError(400, 'PDF verisi geçersiz.');
    const fileName = buildFileName(teklif.teklifNo, cariSnap?.firmaAdi ?? null);

    let logoCid: { cid: string; buffer: Buffer; contentType: string } | null = null;
    if (body.logoBase64 && body.logoBase64.length > 0) {
      try {
        const buf = Buffer.from(body.logoBase64, 'base64');
        if (buf.length > 0) {
          logoCid = { cid: 'firma-logo', buffer: buf, contentType: body.logoContentType || 'image/png' };
        }
      } catch {
        // logo opsiyonel — dönüştürme hatası gönderimi engellemesin
      }
    }

    // Bayilik markaları — body içinde cid:partner-X referansları varsa
    // her biri ayrı CID attachment olarak eklenir.
    const partnerCids: Array<{ cid: string; buffer: Buffer; contentType: string }> = [];
    if (Array.isArray(body.partnerLogos)) {
      for (const p of body.partnerLogos) {
        if (!p.cid || !p.base64) continue;
        try {
          const buf = Buffer.from(p.base64, 'base64');
          if (buf.length === 0) continue;
          partnerCids.push({
            cid: p.cid,
            buffer: buf,
            contentType: p.contentType || 'image/png',
          });
        } catch {
          // skip — opsiyonel
        }
      }
    }

    const me = req.authCtx!.kullanici;
    const sonuc = await sendTeklifEmailFromUser(me, {
      to: toList.join(', '),
      cc: ccList,
      bcc: bccList,
      subject,
      html,
      text,
      pdfBuffer,
      pdfFileName: fileName,
      logoCid,
      partnerCids,
    });

    await prisma.emailLog.create({
      data: {
        teklifId: teklif.id,
        teklifNo: teklif.teklifNo,
        aliciEposta: toList.join(', '),
        gonderen: me.smtpFromAddress || me.smtpUser || null,
        durum: sonuc.ok ? 'sent' : 'failed',
        resendId: sonuc.messageId || null,
        hata: sonuc.error || (sonuc.sentSyncError ? `SENT_SYNC: ${sonuc.sentSyncError}` : null),
      },
    });

    if (!sonuc.ok) {
      res.status(502).json({ ok: false, error: sonuc.error || 'E-posta gönderilemedi.' });
      return;
    }
    res.json({
      ok: true,
      messageId: sonuc.messageId,
      fileName,
      subject,
      sentSyncOk: sonuc.sentSyncOk ?? false,
      sentSyncError: sonuc.sentSyncError || null,
      sentMailbox: sonuc.sentMailbox || null,
    });
  }),
);
