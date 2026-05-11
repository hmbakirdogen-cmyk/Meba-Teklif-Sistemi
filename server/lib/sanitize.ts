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

/** Eski db'de bazı firma kayıtlarının `ad` alanı bozulmuş olabilir; fallback uygula. */
export function sanitizeFirma<T extends Firma>(f: T): T {
  if (!f) return f;
  const fallback = FIRMA_TEXT_FALLBACKS[f.id];
  if (!fallback) return f;
  if (/Taahhut|Muhendislik|Danismanlik| Sti\.?/i.test(String(f.ad || ''))) {
    return { ...f, ad: fallback.ad ?? f.ad };
  }
  return f;
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
