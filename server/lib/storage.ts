import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Render UI'da env değerleri yapıştırılırken yaygın yapıştırma hataları:
 *   - "KEY=value" satırı tamamı kopyalanmış (env editöründe sadece value alanı dolar)
 *   - Değer çift veya tek tırnak içine alınmış ('"a58a..."')
 *   - Başında/sonunda whitespace var
 * Bu helper hepsini sessizce temizler ki R2 endpoint'i bozuk DNS'e gitmesin.
 */
function sanitizeEnv(raw: string | undefined): string {
  if (!raw) return '';
  let v = String(raw).trim();
  // "R2_ACCOUNT_ID=a58a..." gibi → solu kırp
  const eqMatch = v.match(/^[A-Z_][A-Z0-9_]*\s*=\s*(.+)$/i);
  if (eqMatch) v = eqMatch[1].trim();
  // "..." veya '...' içinde → tırnakları soy
  if (v.length >= 2) {
    const first = v[0];
    const last = v[v.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      v = v.slice(1, -1);
    }
  }
  return v.trim();
}

const accountId = sanitizeEnv(process.env.R2_ACCOUNT_ID);
const accessKeyId = sanitizeEnv(process.env.R2_ACCESS_KEY_ID);
const secretAccessKey = sanitizeEnv(process.env.R2_SECRET_ACCESS_KEY);
const bucket = sanitizeEnv(process.env.R2_BUCKET) || 'meba-teklif';
const publicBase = sanitizeEnv(process.env.R2_PUBLIC_URL).replace(/\/+$/, '');

// Boot teşhisi — env durumunu maskeli logla. Sensitive değerler gizli, sadece
// uzunluk ve ilk 4 karakter görünür. Render Logs'ta env değişimi sonrası
// hangi değer geldiğini hızlıca kontrol etmek için.
function maskValue(v: string): string {
  if (!v) return '(BOŞ)';
  if (v.length <= 8) return `(len=${v.length})`;
  return `${v.slice(0, 4)}…(len=${v.length})`;
}
console.log('[storage] R2 boot config:', {
  R2_ACCOUNT_ID: maskValue(accountId),
  R2_ACCESS_KEY_ID: maskValue(accessKeyId),
  R2_SECRET_ACCESS_KEY: maskValue(secretAccessKey),
  R2_BUCKET: bucket,
  R2_PUBLIC_URL: publicBase || '(BOŞ)',
  configured: Boolean(accountId && accessKeyId && secretAccessKey && bucket),
});

export const r2Configured = Boolean(accountId && accessKeyId && secretAccessKey && bucket);

let _client: S3Client | null = null;
function getClient(): S3Client {
  if (_client) return _client;
  if (!r2Configured) {
    throw new Error('R2 env vars eksik (R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET).');
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: false,
  });
  return _client;
}

export interface UploadOptions {
  cacheControl?: string;
  contentDisposition?: string;
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
  opts: UploadOptions = {},
): Promise<{ key: string; url: string }> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: opts.cacheControl ?? 'public, max-age=31536000, immutable',
      ContentDisposition: opts.contentDisposition,
    }),
  );
  return { key, url: publicUrl(key) };
}

export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * R2'den bir objeyi Node.js Readable stream olarak getirir. Bulunamazsa null.
 * Backend storage proxy endpoint'inde (GET /api/storage/*) kullanılır —
 * dosyalar Cloudflare R2 public URL'i yerine kendi domain'imizden serve edilir.
 */
export async function streamObject(key: string): Promise<{
  body: NodeJS.ReadableStream;
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
} | null> {
  const client = getClient();
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) return null;
    return {
      body: result.Body as NodeJS.ReadableStream,
      contentType: result.ContentType,
      contentLength: typeof result.ContentLength === 'number' ? result.ContentLength : undefined,
      etag: result.ETag,
      lastModified: result.LastModified,
    };
  } catch (err) {
    const meta = (err as { name?: string; $metadata?: { httpStatusCode?: number } })?.$metadata;
    const name = (err as { name?: string })?.name;
    if (name === 'NoSuchKey' || meta?.httpStatusCode === 404) return null;
    throw err;
  }
}

export async function presignedDownloadUrl(key: string, expiresInSec = 600): Promise<string> {
  const client = getClient();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSec });
}

export function publicUrl(key: string): string {
  if (!publicBase) {
    return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
  }
  return `${publicBase}/${key}`;
}

/** "image/png" → "png" gibi mime → extension. */
export function mimeToExt(mime: string): string {
  const m = (mime || '').toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  if (m === 'image/svg+xml') return 'svg';
  if (m === 'application/pdf') return 'pdf';
  return 'jpg';
}

/** "data:image/png;base64,XXX" → { mime, buffer }. */
export function decodeDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:([a-z]+\/[a-z0-9+.-]+);base64,(.+)$/i);
  if (match) {
    return { mime: match[1].toLowerCase(), buffer: Buffer.from(match[2], 'base64') };
  }
  return { mime: 'image/jpeg', buffer: Buffer.from(dataUrl, 'base64') };
}

export const MAX_PHOTO_BYTES = 600 * 1024;
