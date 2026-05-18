import { PrismaClient } from '@prisma/client';
import { verifyPassword } from './server/lib/auth.ts';
const prisma = new PrismaClient();
const main = async () => {
  const user = await prisma.kullanici.findUnique({ where: { id: 'u-mehmet' } });
  const candidates = ['1234','0000','mehmet','mehmet123','123456','admin'];
  const results = candidates.map((candidate) => ({ candidate, ok: user ? verifyPassword(candidate, user.sifreHash) : false }));
  console.log(JSON.stringify({ user: user ? { id: user.id, kullaniciAdi: user.kullaniciAdi } : null, results }, null, 2));
  await prisma.$disconnect();
};
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
