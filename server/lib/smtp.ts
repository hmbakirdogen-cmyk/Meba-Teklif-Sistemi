import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions, SentMessageInfo } from 'nodemailer';

/**
 * SMTP credentials her kullanıcı için DB'de saklanır.
 * Şifre AES-256-GCM ile encrypt edilir; key SMTP_ENCRYPTION_KEY env'inden gelir
 * (32 byte = 64 hex char).
 *
 * Format: base64(iv (12 byte) | ciphertext | authTag (16 byte))
 */

const KEY_HEX = process.env.SMTP_ENCRYPTION_KEY || '';

function getKey(): Buffer {
  if (!KEY_HEX) {
    throw new Error('SMTP_ENCRYPTION_KEY env yok (32 byte hex bekleniyor).');
  }
  const key = Buffer.from(KEY_HEX, 'hex');
  if (key.length !== 32) {
    throw new Error(`SMTP_ENCRYPTION_KEY ${key.length} byte, 32 byte (64 hex char) gerekli.`);
  }
  return key;
}

export function encryptPassword(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // GCM önerilen IV uzunluğu
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, authTag]).toString('base64');
}

export function decryptPassword(payload: string): string {
  const key = getKey();
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < 12 + 16 + 1) throw new Error('SMTP password payload kısa.');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(buf.length - 16);
  const ciphertext = buf.subarray(12, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;       // plain — decrypt edilmiş
  fromName?: string | null;
  fromAddress: string;
}

export function buildTransporter(config: SMTPConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // 465 → true, 587 → false (STARTTLS)
    auth: { user: config.user, pass: config.password },
    // Bazı sağlayıcılarda (Yandex, custom) self-signed sertifika olabilir;
    // production'da rejectUnauthorized:true bırak (default).
  });
}

export async function sendViaSMTP(
  config: SMTPConfig,
  mail: Omit<SendMailOptions, 'from'>,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  let transporter: Transporter | null = null;
  try {
    transporter = buildTransporter(config);
    const fromDisplay = config.fromName ? `"${config.fromName}" <${config.fromAddress}>` : config.fromAddress;
    const info: SentMessageInfo = await transporter.sendMail({
      from: fromDisplay,
      ...mail,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SMTP gönderim başarısız.';
    return { ok: false, error: message };
  } finally {
    if (transporter) transporter.close();
  }
}

/** Sadece bağlantı + auth testi yap, mail göndermez. */
export async function verifySMTP(
  config: Omit<SMTPConfig, 'fromAddress' | 'fromName'>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let transporter: Transporter | null = null;
  try {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
    });
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'SMTP bağlantı hatası.' };
  } finally {
    if (transporter) transporter.close();
  }
}

/** Yaygın e-posta sağlayıcıları için preset host/port'lar (frontend dropdown'da kullanılır). */
export const SMTP_PRESETS = {
  gmail: { host: 'smtp.gmail.com', port: 465, secure: true, label: 'Gmail' },
  outlook365: { host: 'smtp.office365.com', port: 587, secure: false, label: 'Outlook / Microsoft 365' },
  yandex: { host: 'smtp.yandex.com', port: 465, secure: true, label: 'Yandex' },
  zoho: { host: 'smtp.zoho.com', port: 465, secure: true, label: 'Zoho Mail' },
  custom: { host: '', port: 587, secure: false, label: 'Diğer (manuel)' },
} as const;
