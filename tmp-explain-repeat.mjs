import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const run = async () => {
  const runs = [];
  for (let i = 0; i < 3; i += 1) {
    const explain = await prisma.$queryRawUnsafe(`EXPLAIN ANALYZE SELECT id FROM "urunler" WHERE "deletedAt" IS NULL AND ("urunKod" % 'vana' OR aciklama % 'vana') LIMIT 20;`);
    runs.push(explain.map((row) => row['QUERY PLAN']));
  }
  console.log(JSON.stringify(runs, null, 2));
  await prisma.$disconnect();
};
run().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
