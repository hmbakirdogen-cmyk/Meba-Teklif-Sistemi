import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const main = async () => {
  const exts = await prisma.$queryRawUnsafe(`SELECT extname FROM pg_extension ORDER BY extname;`);
  const indexes = await prisma.$queryRawUnsafe(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'urunler' ORDER BY indexname;`);
  const explain = await prisma.$queryRawUnsafe(`EXPLAIN ANALYZE SELECT id FROM "urunler" WHERE "deletedAt" IS NULL AND ("urunKod" % 'vana' OR aciklama % 'vana') LIMIT 20;`);
  console.log(JSON.stringify({ exts, indexes, explain }, null, 2));
  await prisma.$disconnect();
};
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
