import type { Firma, Teklif, Kullanici } from '@prisma/client';
import { decryptPassword, sendAndComposeRaw, sendViaSMTP, type SMTPConfig } from './smtp.js';
import { appendToSent, deriveImapFromSmtp } from './imap.js';

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
  /** Kişisel iletişim — imzada T (cep no) olarak görünür.
   *  Boşsa firma telefonuna fallback yapılır. */
  hazirlayanTelefon?: string | null;
  /** Kişisel kurumsal mail — imzada E olarak görünür.
   *  Boşsa firma e-postasına fallback yapılır. */
  hazirlayanEposta?: string | null;
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
  // Kişisel iletişim — kullanıcının cep + kurumsal mail; boşsa firma fallback
  const telefon = normalizeWhitespace(ctx.hazirlayanTelefon) || normalizeWhitespace(firma?.telefon);
  const eposta = normalizeWhitespace(ctx.hazirlayanEposta) || normalizeWhitespace(firma?.eposta);
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

/** Slogan formatlayıcı — her öğe leading "· " bullet ile. */
function formatSlogan(s: string): string {
  const items = s.split(/\s*·\s*/).map((t) => t.trim()).filter(Boolean);
  if (items.length < 2) return htmlEscape(s);
  if (items.length === 2) return '· ' + htmlEscape(items[0]) + ' · ' + htmlEscape(items[1]);
  if (items.length === 3) return '· ' + htmlEscape(items[0]) + ' · ' + htmlEscape(items[1]) + '<br>· ' + htmlEscape(items[2]);
  return items.map((i) => '· ' + htmlEscape(i)).join('<br>');
}

/** Parantez içi gruplar (örn. "(Master Of Science)", "(No: 2605-318)") satır
 *  kırılırken bölünmesin diye nowrap span ile sarmalar. htmlEscape SONRASI
 *  çağrılır (escaped text üzerinde çalışır). */
function protectParens(escapedHtml: string): string {
  return escapedHtml.replace(/\([^()]*\)/g, (m) => `<span style="white-space:nowrap;">${m}</span>`);
}

/** "Dul kelime" (widow) önleme — uzun metnin son kelimesi tek başına alta
 *  düşmesin diye son iki kelimeyi NBSP (U+00A0) ile birleştirir. */
function noWidow(s: string): string {
  const parts = s.split(' ');
  if (parts.length < 3) return s;
  parts[parts.length - 2] = parts[parts.length - 2] + ' ' + parts[parts.length - 1];
  parts.pop();
  return parts.join(' ');
}

/** Türkçe-doğru baş harf büyütme: "ahmet aydın" → "Ahmet Aydın". */
function capitalizeTr(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => {
      if (!w) return w;
      const first = w.charAt(0);
      const firstUpper = first === 'i' ? 'İ' : first.toLocaleUpperCase('tr-TR');
      return firstUpper + w.slice(1).toLocaleLowerCase('tr-TR');
    })
    .join(' ');
}

/** Email-safe HTML body — modal'daki ile birebir aynı yapı. Outlook/Gmail/
 *  Apple Mail/mobil hepsinde aynı görünür: table-bazlı layout, inline CSS,
 *  sabit pixel ölçüler. Modal'dan bodyHtml gelmezse bu kullanılır (fallback). */
export function mailHtmlGovdesiUret(
  ctx: TeklifEmailContext,
  firma: Firma | null,
  logoBase64?: string | null,
): string {
  const FONT = 'Arial, Helvetica, sans-serif';
  const TEXT = '#1e293b';
  const MUTED = '#64748b';
  const ACCENT = '#1A2B42';
  const FAINT = '#94a3b8';
  const DIVIDER = '#e2e8f0';

  // Cari yetkili adı küçük harfle başlıyorsa düzelt: "ahmet" → "Ahmet"
  const kisi = capitalizeTr(normalizeWhitespace(ctx.contactName));
  const title = ctx.contactTitle === 'HANIM' ? 'Hanım' : 'Bey';
  const greetingText = kisi ? `Sayın ${kisi} ${title},` : 'Sayın İlgili,';
  const cariAdi = normalizeWhitespace(ctx.cariAdi);
  const teklifNo = ctx.teklifNo ?? '';
  const messageText = `${cariAdi ? cariAdi + ' için hazırladığımız teklif belgemiz' : 'Teklif belgemiz'}${teklifNo ? ' (No: ' + teklifNo + ')' : ''} ekte yer almaktadır. Herhangi bir sorunuz olması durumunda lütfen bizimle iletişime geçiniz.`;
  const closingText = 'Saygılarımızla,';

  const hazirlayanAdi = normalizeWhitespace(ctx.hazirlayanAdSoyad);
  const hazirlayanUnvan = normalizeWhitespace(ctx.hazirlayanUnvan);
  const firmaKisaAd = normalizeWhitespace(firma?.kisaAd) || 'MEBA';
  const firmaAd = normalizeWhitespace(firma?.ad);
  const firmaSlogan = normalizeWhitespace(firma?.slogan);
  // İletişim — KİŞİSEL bilgiler (hazırlayan kullanıcının), firma bilgileri değil.
  // Boşsa firmaya fallback (eski tekliflerde kişisel bilgi olmayabilir).
  const telefon = normalizeWhitespace(ctx.hazirlayanTelefon) || normalizeWhitespace(firma?.telefon);
  const eposta = normalizeWhitespace(ctx.hazirlayanEposta) || normalizeWhitespace(firma?.eposta);
  const web = normalizeWhitespace(firma?.web);
  const adres = normalizeWhitespace(firma?.adres);

  // İmza — KOMPAKT, yeni düzen
  //   Sol kolon: logo + altında slogan (italic, dar)
  //   Sağ kolon: hazırlayan / firma / iletişim / adres / yetkili bayi
  const sloganUnderLogoHtml = (logoBase64 && firmaSlogan)
    ? `<div style="font-family:${FONT};font-size:9.5px;color:${FAINT};font-style:italic;line-height:1.35;margin:6px 0 0 0;text-align:left;letter-spacing:0.02em;">${formatSlogan(firmaSlogan)}</div>`
    : '';
  const logoCell = logoBase64
    ? `<td valign="top" align="left" width="140" style="width:140px;padding:0 14px 0 0;"><img src="data:image/png;base64,${logoBase64}" width="140" alt="${htmlEscape(firmaKisaAd)}" style="display:block;width:140px;height:auto;border:0;">${sloganUnderLogoHtml}</td>
       <td valign="top" width="1" style="width:1px;background:${ACCENT};padding:0;"></td>`
    : '';
  const textCellWidth = logoBase64 ? 445 : 600;
  // Word-wrap: text cell sınırını bilir, uzun firma adı / adres alt satıra düşer.
  const W = 'word-wrap:break-word;overflow-wrap:break-word;word-break:normal;';

  // noWidow: uzun text'lerin son kelimesi tek başına alta düşmesin
  const titleLine = hazirlayanAdi
    ? `<div style="font-family:${FONT};font-size:12.5px;font-weight:700;color:${ACCENT};line-height:1.25;margin:0 0 1px 0;${W}">${htmlEscape(hazirlayanAdi)}${hazirlayanUnvan ? `<span style="font-weight:400;color:${MUTED};font-size:11px;"> &nbsp;·&nbsp; ${protectParens(htmlEscape(noWidow(hazirlayanUnvan)))}</span>` : ''}</div>`
    : '';
  const firmaLine = firmaAd
    ? `<div style="font-family:${FONT};font-size:10.5px;color:${MUTED};line-height:1.35;margin:0 0 6px 0;${W}">${protectParens(htmlEscape(noWidow(firmaAd)))}</div>`
    : '';
  // Slogan artık logo altında — sağ kolonda tekrar göstermiyoruz
  const sloganLine = '';
  // İletişim öğelerinin her biri kendi içinde nowrap. Etiketler ☎ ✉ 🌐 unicode.
  const iletisimItems = [
    telefon ? `<span style="white-space:nowrap;"><span style="color:${FAINT};font-size:13px;">☎</span>&nbsp;${htmlEscape(telefon)}</span>` : '',
    eposta ? `<span style="white-space:nowrap;"><span style="color:${FAINT};font-size:12px;">✉</span>&nbsp;${htmlEscape(eposta)}</span>` : '',
    web ? `<span style="white-space:nowrap;"><span style="color:${FAINT};font-size:12px;">🌐</span>&nbsp;${htmlEscape(web)}</span>` : '',
  ].filter(Boolean).join(' <span style="color:' + FAINT + ';">·</span> ');
  const iletisimLine = iletisimItems
    ? `<div style="font-family:${FONT};font-size:11px;color:#334155;line-height:1.6;margin:0;${W}">${iletisimItems}</div>`
    : '';
  const adresLine = adres
    ? `<div style="font-family:${FONT};font-size:10px;color:${FAINT};line-height:1.35;margin:3px 0 0 0;${W}">${protectParens(htmlEscape(noWidow(adres)))}</div>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;background:#ffffff;">
<tr><td align="left" style="padding:20px 24px;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="border-collapse:collapse;max-width:600px;width:100%;">
    <tr><td style="padding:0 0 10px 0;font-family:${FONT};font-size:13.5px;color:${TEXT};line-height:1.55;">${htmlEscape(greetingText)}</td></tr>
    <tr><td style="padding:0 0 10px 0;font-family:${FONT};font-size:13.5px;color:${TEXT};line-height:1.55;">${htmlEscape(messageText)}</td></tr>
    <tr><td style="padding:0 0 14px 0;font-family:${FONT};font-size:13.5px;color:${TEXT};line-height:1.55;">${htmlEscape(closingText)}</td></tr>
    <tr><td style="padding:0;border-top:1px solid ${DIVIDER};">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;table-layout:fixed;margin:10px 0 0 0;">
        <tr>
          ${logoCell}
          <td valign="top" width="${textCellWidth}" style="width:${textCellWidth}px;padding:0 0 0 ${logoBase64 ? '14px' : '0'};${W}">
            ${titleLine}
            ${firmaLine}
            ${sloganLine}
            ${iletisimLine}
            ${adresLine}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

export interface SendTeklifMailParams {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
  pdfBuffer: Buffer;
  pdfFileName: string;
  /** Modal'dan gelen logo (firma.logoUrl'den fetch edilip base64'e çevrilmiş).
   *  HTML body'de `<img src="cid:firma-logo">` referansıyla kullanılacak. */
  logoCid?: { cid: string; buffer: Buffer; contentType: string } | null;
  /** Bayilik markaları (CID attachments) — body'de cid:partner-X referansları
   *  ile kullanılır. Her biri ayrı inline image olarak embed edilir. */
  partnerCids?: Array<{ cid: string; buffer: Buffer; contentType: string }>;
}

export interface SendTeklifMailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  /** Gönderim başarılı oldu ve IMAP APPEND ile "Gönderilenler" klasörüne de
   *  yazıldıysa true. SMTP başarılı + IMAP başarısız ise false + sentSyncError
   *  doldurulur (gönderim yine de başarılı sayılır, log'a düşer). */
  sentSyncOk?: boolean;
  sentSyncError?: string;
  sentMailbox?: string;
}

/** Kullanıcının kendi SMTP credentials'ları ile gönderim (multi-tenant doğal akış).
 *
 *  Gönderim başarılı olursa raw MIME, eşdeğer IMAP sunucusuna APPEND edilir →
 *  kullanıcı kendi Outlook/365 / Yandex / Zoho "Gönderilmiş Öğeler" klasöründe
 *  bu maili görür. Gmail için APPEND atlanır (Gmail otomatik kopyalar).
 *  Bilinmeyen / custom SMTP için APPEND atlanır (sentSyncOk=false, sessizce). */
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
  const attachments: Array<{ filename?: string; content: Buffer; cid?: string; contentType?: string }> = [
    { filename: params.pdfFileName, content: params.pdfBuffer, contentType: 'application/pdf' },
  ];
  if (params.logoCid) {
    attachments.push({
      filename: 'logo.png',
      content: params.logoCid.buffer,
      cid: params.logoCid.cid,
      contentType: params.logoCid.contentType || 'image/png',
    });
  }
  // Bayilik logoları — her biri ayrı inline image CID. body içindeki
  // cid:partner-X referansları bunları işaretler.
  if (params.partnerCids && params.partnerCids.length > 0) {
    for (const p of params.partnerCids) {
      attachments.push({
        filename: `${p.cid}.png`,
        content: p.buffer,
        cid: p.cid,
        contentType: p.contentType || 'image/png',
      });
    }
  }
  const mailOptions = {
    to: params.to,
    cc: params.cc && params.cc.length > 0 ? params.cc : undefined,
    bcc: params.bcc && params.bcc.length > 0 ? params.bcc : undefined,
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments,
  };
  const composed = await sendAndComposeRaw(config, mailOptions);
  if (!composed.ok) return { ok: false, error: composed.error };

  // IMAP APPEND — başarısız olsa bile gönderim ana akışı bozulmaz.
  const imapTarget = deriveImapFromSmtp(kullanici.smtpHost);
  if (!imapTarget) {
    return { ok: true, messageId: composed.messageId, sentSyncOk: false };
  }
  try {
    const appendRes = await appendToSent(
      { host: imapTarget.host, port: imapTarget.port, secure: imapTarget.secure, user: kullanici.smtpUser, password: plainPassword },
      composed.raw,
    );
    if (appendRes.ok) {
      return { ok: true, messageId: composed.messageId, sentSyncOk: true, sentMailbox: appendRes.mailbox };
    }
    return { ok: true, messageId: composed.messageId, sentSyncOk: false, sentSyncError: appendRes.error };
  } catch (err) {
    return {
      ok: true,
      messageId: composed.messageId,
      sentSyncOk: false,
      sentSyncError: err instanceof Error ? err.message : 'IMAP append exception.',
    };
  }
}

void sendViaSMTP; // legacy compat — gerekirse import edilen yerlerde kalsın
