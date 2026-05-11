import type { Firma, Teklif, Kullanici } from '@prisma/client';
import { decryptPassword, sendViaSMTP, type SMTPConfig } from './smtp.js';

function normalizeWhitespace(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FIRMA_FALLBACK = {
  meba: { kisaAd: 'MEBA', ad: 'MEBA Pnömatik Hidrolik Makina Elektrik Elektronik Mühendislik San. Tic. Ltd. Şti.', adres: '', telefon: '', eposta: '', web: '' },
  mesa: { kisaAd: 'MESA', ad: 'Mesa Enerji Taahhüt Elektrik Elektronik Mühendislik Danışmanlık Makine San. ve Tic. Ltd. Şti.', adres: '', telefon: '', eposta: '', web: '' },
  elmos: { kisaAd: 'ELMOS', ad: 'ELMOS Otomasyon San. Tic. Ltd. Şti.', adres: '', telefon: '', eposta: '', web: '' },
} as const;

export function mailKonuUret(teklif: Pick<Teklif, 'teklifNo'>, firma: Pick<Firma, 'id' | 'kisaAd'> | null): string {
  const kisaAd =
    normalizeWhitespace(firma?.kisaAd) ||
    (firma?.id ? FIRMA_FALLBACK[firma.id as keyof typeof FIRMA_FALLBACK]?.kisaAd : '') ||
    'MEBA';
  return teklif.teklifNo ? `${kisaAd} Teklif Belgesi - ${teklif.teklifNo}` : `${kisaAd} Teklif Belgesi`;
}

export interface TeklifEmailContext {
  contactName?: string | null;
  contactTitle?: string | null;
  cariAdi?: string | null;
  teklifNo?: string | null;
  hazirlayanAdSoyad?: string | null;
  hazirlayanUnvan?: string | null;
}

export function mailGovdesiUretText(ctx: TeklifEmailContext, firma: Firma | null): string {
  const kisi = normalizeWhitespace(ctx.contactName);
  const title = ctx.contactTitle === 'HANIM' ? 'Hanım' : 'Bey';
  const hitap = kisi ? `Sayın ${kisi} ${title},` : 'Sayın İlgili,';
  const cariAdi = normalizeWhitespace(ctx.cariAdi);
  const teklifNo = ctx.teklifNo ?? '';
  const hazirlayanAdi = normalizeWhitespace(ctx.hazirlayanAdSoyad);
  const sep = '--------------------------------------------------';

  const firmaAd = normalizeWhitespace(firma?.ad);
  const telefon = normalizeWhitespace(firma?.telefon);
  const eposta = normalizeWhitespace(firma?.eposta);
  const web = normalizeWhitespace(firma?.web);
  const adres = normalizeWhitespace(firma?.adres);

  const lines: string[] = [
    hitap,
    '',
    `${cariAdi ? cariAdi + ' için hazırladığımız teklif belgemiz' : 'Teklif belgemiz'}${teklifNo ? ' (No: ' + teklifNo + ')' : ''} ekte yer almaktadır.`,
    'Herhangi bir sorunuz olması durumunda lütfen bizimle iletişime geçiniz.',
    '',
    'Saygılarımızla,',
    '',
    sep,
  ];
  if (hazirlayanAdi) lines.push(hazirlayanAdi);
  if (firmaAd) lines.push(firmaAd);
  lines.push('');
  if (telefon) lines.push(`T: ${telefon}`);
  if (eposta) lines.push(`E: ${eposta}`);
  if (web) lines.push(`W: ${web}`);
  if (adres) lines.push('', adres);
  lines.push(sep);
  return lines.join('\n');
}

export function mailHtmlGovdesiUret(
  ctx: TeklifEmailContext,
  firma: Firma | null,
  logoBase64?: string | null,
): string {
  const kisi = normalizeWhitespace(ctx.contactName);
  const title = ctx.contactTitle === 'HANIM' ? 'Hanım' : 'Bey';
  const hitap = kisi ? `Sayın ${kisi} ${title},` : 'Sayın İlgili,';
  const cariAdi = normalizeWhitespace(ctx.cariAdi);
  const teklifNo = ctx.teklifNo ?? '';
  const hazirlayanAdi = normalizeWhitespace(ctx.hazirlayanAdSoyad);
  const hazirlayanUnvan = normalizeWhitespace(ctx.hazirlayanUnvan);

  const govdeMetni = `${cariAdi ? cariAdi + ' için hazırladığımız teklif belgemiz' : 'Teklif belgemiz'}${teklifNo ? ' (No: ' + teklifNo + ')' : ''} ekte yer almaktadır. Herhangi bir sorunuz olması durumunda lütfen bizimle iletişime geçiniz.`;

  const firmaAd = normalizeWhitespace(firma?.ad);
  const telefon = normalizeWhitespace(firma?.telefon);
  const eposta = normalizeWhitespace(firma?.eposta);
  const web = normalizeWhitespace(firma?.web);
  const adres = normalizeWhitespace(firma?.adres);

  const logoHtml = logoBase64
    ? `<td style="padding-right:16px;vertical-align:top;width:195px;line-height:0;font-size:0;"><img src="data:image/png;base64,${logoBase64}" width="195" height="89" alt="${htmlEscape(firma?.kisaAd ?? '')}" style="display:block;width:195px;height:89px;"></td>`
    : '';
  const separatorHtml = logoBase64 ? `<td style="width:1px;background:#1A2B42;padding:0;"></td>` : '';
  const iletisimHtml = [
    telefon ? `<span style="color:#94a3b8;">T</span>&nbsp; ${htmlEscape(telefon)}` : '',
    eposta ? `<span style="color:#94a3b8;">E</span>&nbsp; ${htmlEscape(eposta)}` : '',
    web ? `<span style="color:#94a3b8;">W</span>&nbsp; ${htmlEscape(web)}` : '',
  ]
    .filter(Boolean)
    .join(' &nbsp;&nbsp;');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:600px;padding:28px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#1e293b;line-height:1.7;">
  <p style="margin:0 0 14px;">${htmlEscape(hitap)}</p>
  <p style="margin:0 0 14px;">${htmlEscape(govdeMetni)}</p>
  <p style="margin:0 0 24px;">Saygılarımızla,</p>
  <div style="border-top:1px solid #dde3ec;padding-top:16px;">
    <table style="border-collapse:collapse;" cellpadding="0" cellspacing="0">
      <tr>
        ${logoHtml}
        ${separatorHtml}
        <td style="vertical-align:top;padding-left:16px;">
          ${hazirlayanAdi ? `<div style="font-size:13px;font-weight:700;color:#1A2B42;line-height:1.3;margin-bottom:1px;">${htmlEscape(hazirlayanAdi)}${hazirlayanUnvan ? `<span style="font-weight:400;color:#64748b;font-size:12px;"> &nbsp;·&nbsp; ${htmlEscape(hazirlayanUnvan)}</span>` : ''}</div>` : ''}
          <div style="font-size:11px;color:#64748b;line-height:1.3;margin-bottom:7px;">${htmlEscape(firmaAd)}</div>
          ${iletisimHtml ? `<div style="font-size:12px;color:#334155;line-height:1.9;">${iletisimHtml}</div>` : ''}
          ${adres ? `<div style="font-size:11px;color:#94a3b8;line-height:1.4;margin-top:3px;">${htmlEscape(adres)}</div>` : ''}
        </td>
      </tr>
    </table>
  </div>
</div>
</body></html>`;
}

export interface SendTeklifMailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  pdfBuffer: Buffer;
  pdfFileName: string;
}

export interface SendTeklifMailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** Kullanıcının kendi SMTP credentials'ları ile gönderim (multi-tenant doğal akış). */
export async function sendTeklifEmailFromUser(
  kullanici: Kullanici,
  params: SendTeklifMailParams,
): Promise<SendTeklifMailResult> {
  if (!kullanici.smtpHost || !kullanici.smtpUser || !kullanici.smtpPasswordEncrypted) {
    return {
      ok: false,
      error: 'E-posta hesabınız tanımlı değil. Profilden SMTP ayarlarını ekleyin.',
    };
  }
  let plainPassword: string;
  try {
    plainPassword = decryptPassword(kullanici.smtpPasswordEncrypted);
  } catch (err) {
    return {
      ok: false,
      error: `SMTP şifresi okunamadı: ${err instanceof Error ? err.message : 'bilinmeyen hata'}`,
    };
  }
  const fromAddress = kullanici.smtpFromAddress || kullanici.smtpUser;
  const config: SMTPConfig = {
    host: kullanici.smtpHost,
    port: kullanici.smtpPort ?? 587,
    secure: kullanici.smtpSecure ?? true,
    user: kullanici.smtpUser,
    password: plainPassword,
    fromName: kullanici.smtpFromName || kullanici.adSoyad,
    fromAddress,
  };
  const result = await sendViaSMTP(config, {
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: [{ filename: params.pdfFileName, content: params.pdfBuffer }],
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, messageId: result.messageId };
}
