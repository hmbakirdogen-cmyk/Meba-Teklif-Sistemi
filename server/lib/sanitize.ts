import type { Firma, Kullanici } from '@prisma/client';

/**
 * DB'de tarihsel olarak Cloudflare r2.dev public URL'leri saklı:
 *   https://pub-XXXXXX.r2.dev/firmalar/meba/logo.png?v=...
 * r2.dev URL'leri production'da güvenilmez (SSL handshake fail, kurumsal
 * firewall, rate limit). Response level'da bu URL'leri kendi backend proxy
 * endpoint'imize (/api/storage/...) yeniden yazıyoruz. DB'ye dokunulmaz —
 * remap-r2-domain.ts script'i istenirse kalıcı temizlik için ayrıca çalıştırılır.
 */
const R2_DEV_HOST_RE = /^https?:\/\/pub-[a-f0-9]+\.r2\.dev/i;

function rewriteR2Url(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  // r2.dev domain'i → /api/storage path'i (frontend kendi origin'inden çağırır)
  if (R2_DEV_HOST_RE.test(url)) {
    return url.replace(R2_DEV_HOST_RE, '/api/storage');
  }
  return url;
}

type SanitizedKullanici = Omit<Kullanici, 'sifreHash' | 'smtpPasswordEncrypted'> & {
  /** Frontend, kullanıcının SMTP şifresi tanımlı mı bilsin diye boolean flag. */
  smtpPasswordSet?: boolean;
};

/** sifreHash + smtpPasswordEncrypted'i client'a sızdırma. URL'leri rewrite et. */
export function sanitizeUser(u: Kullanici | null): SanitizedKullanici | null {
  if (!u) return null;
  const { sifreHash: _hash, smtpPasswordEncrypted: _smtp, ...rest } = u;
  void _hash;
  // GEÇİCİ: R2 token AccessDenied sorununu çözene kadar profilFotoUrl null
  // gönderilir → frontend zaten boş URL'de avatar initials fallback'ine düşer
  // (ad-soyadın baş harfleri renkli arka planda gösterilir). Bu sayede:
  //   • Console temiz (500 retry zinciri yok)
  //   • Kullanıcı kartları "kim olduğunu" net belli eder (isim + initials)
  //   • R2 token düzeldiğinde tek satır geri alınarak fotolara dönülür
  return {
    ...rest,
    profilFotoUrl: null,
    smtpPasswordSet: Boolean(_smtp),
  };
}

const FIRMA_TEXT_FALLBACKS: Record<string, Partial<Firma>> = {
  mesa: {
    ad: 'Mesa Enerji Taahhüt Elektrik Elektronik Mühendislik Danışmanlık Makine San. ve Tic. Ltd. Şti.',
  },
};

/**
 * Frontend kontratıyla uyumlu firma object. Prisma'da kolon adı `logoUrl`
 * ama eski frontend kodu her yerde `firma.logoPath` okuyor. shape transformer:
 *  - logoPath = logoUrl ?? `/logo-{id}.png` (fallback: lokal public/ asset'i)
 *  - logoUrl alanı da response'ta korunur (yeni kod isterse okuyabilir).
 *
 * Aynı zamanda bozuk MESA `ad` alanı için tarihsel fallback uygulanır.
 */
export function sanitizeFirma<T extends Firma>(f: T): T & { logoPath: string } {
  if (!f) return f as T & { logoPath: string };
  const fallback = FIRMA_TEXT_FALLBACKS[f.id];
  const ad =
    fallback && /Taahhut|Muhendislik|Danismanlik| Sti\.?/i.test(String(f.ad || ''))
      ? (fallback.ad ?? f.ad)
      : f.ad;
  // GEÇİCİ: R2 token AccessDenied sorununu çözene kadar firma logolarını
  // doğrudan frontend'in /public dizinindeki sabit asset'lerden serve et.
  // public/logo-meba.png, logo-elmos.png, logo-mesa.png — branding her zaman
  // garantili görünür, R2 storage'a bağımlı değil. R2 düzeldikten sonra
  // veritabanındaki logoUrl'ye geri dönülür (bir satırlık değişiklik).
  const logoPath = `/logo-${f.id}.png`;
  return { ...f, ad, logoUrl: logoPath, logoPath };
}

/**
 * Cari, Urun gibi modellerde de logoUrl/resimUrl alanları olabilir. Bunları da
 * response level'da rewrite etmek için generic helper — handler'lar isterse
 * direkt kullanır. (Cari route'unda da spread map'ten geçer; orada da
 * çağrılmalı.)
 */
export function rewriteResponseUrls<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const result: Record<string, unknown> = { ...obj };
  for (const key of ['logoUrl', 'profilFotoUrl', 'resimUrl', 'pdfUrl']) {
    if (typeof result[key] === 'string') {
      result[key] = rewriteR2Url(result[key] as string);
    }
  }
  return result as T;
}

export function uretInitials(adSoyad: string | null | undefined): string {
  return String(adSoyad || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('');
}
