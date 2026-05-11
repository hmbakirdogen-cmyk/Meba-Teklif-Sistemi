import { prisma } from './prisma.js';
import { SESSION_TTL_MS, SESSION_TTL_REMEMBERED_MS, generateSessionToken } from './auth.js';

export async function olusturOturum(params: {
  kullaniciId: string;
  beniHatirla?: boolean;
  ip?: string;
  ua?: string;
  deviceId?: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const ttl = params.beniHatirla ? SESSION_TTL_REMEMBERED_MS : SESSION_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);
  const token = generateSessionToken();
  await prisma.oturum.create({
    data: {
      token,
      kullaniciId: params.kullaniciId,
      expiresAt,
      beniHatirla: Boolean(params.beniHatirla),
      ip: params.ip ?? null,
      ua: params.ua ?? null,
      deviceId: params.deviceId ?? null,
    },
  });
  return { token, expiresAt };
}

export async function oturumDogrula(token: string) {
  if (!token) return null;
  const oturum = await prisma.oturum.findUnique({
    where: { token },
    include: { kullanici: true },
  });
  if (!oturum) return null;
  if (oturum.expiresAt.getTime() <= Date.now()) {
    await prisma.oturum.delete({ where: { token } }).catch(() => {});
    return null;
  }
  if (!oturum.kullanici.aktifMi) return null;
  return oturum;
}

export async function oturumKapat(token: string): Promise<void> {
  if (!token) return;
  await prisma.oturum.delete({ where: { token } }).catch(() => {});
}

export async function kullaniciOturumlariniIptalEt(kullaniciId: string, hariçToken?: string): Promise<void> {
  await prisma.oturum.deleteMany({
    where: {
      kullaniciId,
      ...(hariçToken ? { token: { not: hariçToken } } : {}),
    },
  });
}

export async function expiredOturumlariSil(): Promise<number> {
  const r = await prisma.oturum.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return r.count;
}
