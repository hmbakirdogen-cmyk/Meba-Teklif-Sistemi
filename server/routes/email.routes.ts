import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { canAccessFirma } from '../lib/firmaScope.js';
import {
  mailKonuUret,
  mailGovdesiUretText,
  mailHtmlGovdesiUret,
  sendTeklifEmailFromUser,
  loadFirmaLogoBase64,
  type SendTeklifMailAttachment,
} from '../lib/email.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

export const emailRouter: Router = Router();

function buildFileName(teklifNo: string | null, cariAdi: string | null): string {
  const cleanWord = (s: string) => s.replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim();
  const cari = cleanWord(cariAdi || 'TEKLIF').toLocaleUpperCase('tr-TR').split(' ').slice(0, 2).join(' ') || 'TEKLIF';
  const tn = cleanWord(teklifNo || '');
  return (tn ? `${cari} - ${tn}` : cari) + '.pdf';
}

// Tek satır "a@x.com, b@y.com" veya ["a", "b"] formatlarını normalize eder.
function parseEmailList(input: unknown): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input.join(',') : String(input);
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Kullanıcı düz-metin gövdeyi düzenleyebildiği için, html templatesi yerine
// basit bir HTML versiyon üret (newline → <br>). Imzaya logo ekle (varsa).
function plainTextToHtml(text: string, logoBase64: string | null): string {
  const escape = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const logoBlock = logoBase64
    ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #dde3ec;"><img src="data:image/png;base64,${logoBase64}" alt="" style="display:block;height:64px;width:auto;"></div>`
    : '';
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1e293b;line-height:1.6;"><div style="white-space:pre-wrap;">${escape(text)}</div>${logoBlock}</body></html>`;
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
      bccSelf?: boolean;
      subject?: string;
      customText?: string;
      pdfBase64?: string;
      extraAttachments?: Array<{ filename?: string; base64?: string }>;
    };
    const teklifId = String(body.teklifId || '').trim();
    const toList = parseEmailList(body.to);
    const ccList = parseEmailList(body.cc);
    const bccList = parseEmailList(body.bcc);
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
    const ctx = {
      contactName: teklif.contactName,
      contactTitle: teklif.contactTitle,
      cariAdi: cariSnap?.firmaAdi ?? null,
      teklifNo: teklif.teklifNo,
      hazirlayanAdSoyad: teklif.hazirlayanAdSoyad,
      hazirlayanUnvan: teklif.hazirlayanUnvan,
    };
    // Kullanıcı gövdeyi düzenlediyse onu kullan; aksi halde varsayılan template'i koru.
    // İmza bloğuna firma logosu eklenir (R2 URL → fetch; yoksa lokal public/).
    const customText = body.customText?.trim();
    const text = customText || mailGovdesiUretText(ctx, firma);
    const logoBase64 = await loadFirmaLogoBase64(firma);
    const html = customText
      ? plainTextToHtml(customText, logoBase64)
      : mailHtmlGovdesiUret(ctx, firma, logoBase64);
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (pdfBuffer.length === 0) throw new HttpError(400, 'PDF verisi geçersiz.');
    const fileName = buildFileName(teklif.teklifNo, cariSnap?.firmaAdi ?? null);

    const me = req.authCtx!.kullanici;

    // bccSelf → kullanıcının kendi SMTP user adresini BCC'ye ekle. Aynı adres
    // hem to hem bcc'de olursa SMTP sunucusu çoğu zaman tek kopya gönderir;
    // yine de duplicate'i defansif olarak temizle.
    const senderSelf = (me.smtpFromAddress || me.smtpUser || '').trim();
    const effectiveBcc = [...bccList];
    if (body.bccSelf && senderSelf) {
      if (!effectiveBcc.includes(senderSelf) && !toList.includes(senderSelf) && !ccList.includes(senderSelf)) {
        effectiveBcc.push(senderSelf);
      }
    }

    // Extra ekler (kullanıcı modal'dan eklediği dosyalar).
    const extraAttachments = Array.isArray(body.extraAttachments) ? body.extraAttachments : [];
    const attachments: SendTeklifMailAttachment[] = [{ filename: fileName, content: pdfBuffer }];
    for (const a of extraAttachments) {
      const name = String(a?.filename || '').trim();
      const data = String(a?.base64 || '').trim();
      if (!name || !data) continue;
      const buf = Buffer.from(data, 'base64');
      if (buf.length === 0) continue;
      attachments.push({ filename: name, content: buf });
    }

    const sonuc = await sendTeklifEmailFromUser(me, {
      to: toList,
      cc: ccList.length > 0 ? ccList : undefined,
      bcc: effectiveBcc.length > 0 ? effectiveBcc : undefined,
      subject,
      html,
      text,
      attachments,
    });

    await prisma.emailLog.create({
      data: {
        teklifId: teklif.id,
        teklifNo: teklif.teklifNo,
        aliciEposta: toList.join(', '),
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
