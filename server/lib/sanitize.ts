import type { Firma, Kullanici } from '@prisma/client';

type SanitizedKullanici = Omit<Kullanici, 'sifreHash' | 'smtpPasswordEncrypted'> & {
  /** Frontend, kullanıcının SMTP şifresi tanımlı mı bilsin diye boolean flag. */
  smtpPasswordSet?: boolean;
};

/** sifreHash + smtpPasswordEncrypted'i client'a sızdırma. */
export function sanitizeUser(u: Kullanici | null): SanitizedKullanici | null {
  if (!u) return null;
  const { sifreHash: _hash, smtpPasswordEncrypted: _smtp, ...rest } = u;
  void _hash;
  return { ...rest, smtpPasswordSet: Boolean(_smtp) };
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
  const logoPath = f.logoUrl || `/logo-${f.id}.png`;
  return { ...f, ad, logoPath };
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
