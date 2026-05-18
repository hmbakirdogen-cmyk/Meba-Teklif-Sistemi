import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const main = async () => {
  const users = await prisma.kullanici.findMany({ select: { id: true, kullaniciAdi: true, firmaId: true, rol: true }, take: 20 });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
};
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
