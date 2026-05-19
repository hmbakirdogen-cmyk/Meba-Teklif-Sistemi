import { ImapFlow } from 'imapflow';

export interface IMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

/**
 * SMTP host'undan eşdeğer IMAP konfigürasyonunu türetir. Bilinen sağlayıcılar
 * için sabit eşleme; bilinmeyen sağlayıcılar için null döner (APPEND atlanır).
 *
 * Not: Gmail SMTP otomatik olarak gönderileni "Sent" klasörüne kopyalar →
 * Gmail için APPEND'e gerek yok, zaten ikinci kez yazılmasını istemeyiz.
 */
export function deriveImapFromSmtp(smtpHost: string | null | undefined): { host: string; port: number; secure: boolean } | null {
  if (!smtpHost) return null;
  const h = smtpHost.toLowerCase().trim();
  if (h === 'smtp.gmail.com') return null; // Gmail kendisi yazar
  if (h === 'smtp.office365.com' || h === 'smtp-mail.outlook.com') {
    return { host: 'outlook.office365.com', port: 993, secure: true };
  }
  if (h === 'smtp.yandex.com' || h === 'smtp.yandex.ru' || h === 'smtp.yandex.com.tr') {
    return { host: 'imap.yandex.com', port: 993, secure: true };
  }
  if (h === 'smtp.zoho.com' || h === 'smtp.zoho.eu') {
    return { host: h.replace(/^smtp\./, 'imap.'), port: 993, secure: true };
  }
  return null;
}

/**
 * "Sent" / "Gönderilmiş Öğeler" klasörünün adı sağlayıcıya ve dile göre değişir.
 * IMAP SPECIAL-USE extension'ı (RFC 6154) ile \Sent attribute'lu klasörü
 * bulmaya çalışırız; bulunamazsa yaygın isimleri sırayla deneriz.
 */
async function findSentMailbox(client: ImapFlow): Promise<string> {
  const list = await client.list();
  const bySpecialUse = list.find((m) => m.specialUse === '\\Sent');
  if (bySpecialUse) return bySpecialUse.path;
  const candidates = [
    'Sent',
    'Sent Items',
    'Sent Mail',
    'Gönderilmiş Öğeler',
    'Gönderilmiş Ögeler',
    'Gönderilenler',
    'INBOX.Sent',
    'INBOX/Sent',
    '[Gmail]/Sent Mail',
  ];
  for (const name of candidates) {
    const found = list.find((m) => m.path === name || m.name === name);
    if (found) return found.path;
  }
  // Son çare: ilk klasörde "sent" geçen
  const heuristic = list.find((m) => /sent|gönderil/i.test(m.name) || /sent|gönderil/i.test(m.path));
  if (heuristic) return heuristic.path;
  throw new Error('IMAP: Gönderilenler klasörü bulunamadı.');
}

/**
 * Bir raw MIME mesajını kullanıcının IMAP hesabındaki "Sent" klasörüne ekler.
 * SMTP send'den hemen sonra çağrılır → Outlook desktop/web kullanıcıları
 * gönderdikleri maili kendi "Gönderilmiş Öğeler" klasöründe görürler.
 */
export async function appendToSent(
  config: IMAPConfig,
  rawMime: Buffer,
): Promise<{ ok: true; mailbox: string } | { ok: false; error: string }> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    logger: false,
  });
  try {
    await client.connect();
    const sentBox = await findSentMailbox(client);
    await client.append(sentBox, rawMime, ['\\Seen'], new Date());
    return { ok: true, mailbox: sentBox };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'IMAP APPEND başarısız.' };
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }
}
