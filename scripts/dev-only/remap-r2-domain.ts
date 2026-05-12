/**
 * remap-r2-domain.ts
 * ──────────────────────────────────────────────────────────────────
 * Cloudflare R2 public URL domain değişimi sonrası DB'deki tüm logo /
 * profil fotoğrafı URL'lerini eski domain'den yeni domain'e map eder.
 *
 * Kullanım:
 *   $env:DATABASE_URL = "postgres://..."
 *   $env:OLD_DOMAIN   = "https://pub-71297d823cd5457fa44dc32fb24d6cb4.r2.dev"
 *   $env:NEW_DOMAIN   = "https://r2.mebamekanik.com"
 *
 *   npx tsx scripts/dev-only/remap-r2-domain.ts             # dry-run
 *   npx tsx scripts/dev-only/remap-r2-domain.ts --confirm   # gerçek update
 *
 * Etkilenen tablolar/alanlar:
 *   • firmalar.logoUrl
 *   • cariler.logoUrl
 *   • kullanicilar.profilFotoUrl
 *   • urunler.resimUrl
 *   • teklifler.pdfUrl
 *
 * Operasyon idempotent — birden fazla kez çalıştırmak güvenli (yalnız OLD ile
 * başlayan değerleri günceller).
 */

import 'dotenv/config';
import { prisma } from '../../server/lib/prisma.js';

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');

const OLD = (process.env.OLD_DOMAIN || '').replace(/\/+$/, '');
const NEW = (process.env.NEW_DOMAIN || '').replace(/\/+$/, '');

async function main() {
  console.log('━'.repeat(70));
  console.log('R2 domain remap — DB URL migration');
  console.log(`OLD: ${OLD || '(boş!)'}`);
  console.log(`NEW: ${NEW || '(boş!)'}`);
  console.log(`Mod: ${CONFIRM ? '🔥 GERÇEK UPDATE' : '👁  DRY RUN'}`);
  console.log('━'.repeat(70));

  if (!OLD || !NEW) {
    console.error('❌ OLD_DOMAIN ve NEW_DOMAIN env değişkenleri zorunlu.');
    process.exit(1);
  }
  if (OLD === NEW) {
    console.error('❌ OLD ve NEW aynı. Değişiklik gereksiz.');
    process.exit(1);
  }

  // Sayım — kaç kayıt etkilenecek
  const [firmaCount, cariCount, kullaniciCount, urunCount, teklifCount] = await Promise.all([
    prisma.firma.count({ where: { logoUrl: { startsWith: OLD } } }),
    prisma.cari.count({ where: { logoUrl: { startsWith: OLD } } }),
    prisma.kullanici.count({ where: { profilFotoUrl: { startsWith: OLD } } }),
    prisma.urun.count({ where: { resimUrl: { startsWith: OLD } } }),
    prisma.teklif.count({ where: { pdfUrl: { startsWith: OLD } } }),
  ]);

  console.log('\n📊 Eski domain (OLD) ile başlayan kayıtlar:');
  console.log(`   • Firma logoUrl:           ${firmaCount.toString().padStart(6)}`);
  console.log(`   • Cari logoUrl:            ${cariCount.toString().padStart(6)}`);
  console.log(`   • Kullanıcı profilFoto:    ${kullaniciCount.toString().padStart(6)}`);
  console.log(`   • Ürün resimUrl:           ${urunCount.toString().padStart(6)}`);
  console.log(`   • Teklif pdfUrl:           ${teklifCount.toString().padStart(6)}`);
  const total = firmaCount + cariCount + kullaniciCount + urunCount + teklifCount;
  console.log(`   ─────────────────────────────────────`);
  console.log(`   • TOPLAM güncellenecek:    ${total.toString().padStart(6)}`);

  if (!CONFIRM) {
    console.log('\n👁  DRY RUN tamamlandı. Gerçek update için: --confirm');
    return;
  }

  if (total === 0) {
    console.log('\n✅ Etkilenen kayıt yok. Hiçbir şey yapılmadı.');
    return;
  }

  // SQL REPLACE — sadece OLD ile başlayan değerlerde, sondaki path korunur.
  // Prisma string operations native REPLACE desteklemediği için raw SQL.
  console.log('\n🔄 Update başlıyor...');

  const r1 = await prisma.$executeRawUnsafe(
    `UPDATE "firmalar" SET "logoUrl" = REPLACE("logoUrl", $1, $2) WHERE "logoUrl" LIKE $3`,
    OLD, NEW, OLD + '%',
  );
  console.log(`   ✓ ${r1} firmalar.logoUrl güncellendi`);

  const r2 = await prisma.$executeRawUnsafe(
    `UPDATE "cariler" SET "logoUrl" = REPLACE("logoUrl", $1, $2) WHERE "logoUrl" LIKE $3`,
    OLD, NEW, OLD + '%',
  );
  console.log(`   ✓ ${r2} cariler.logoUrl güncellendi`);

  const r3 = await prisma.$executeRawUnsafe(
    `UPDATE "kullanicilar" SET "profilFotoUrl" = REPLACE("profilFotoUrl", $1, $2) WHERE "profilFotoUrl" LIKE $3`,
    OLD, NEW, OLD + '%',
  );
  console.log(`   ✓ ${r3} kullanicilar.profilFotoUrl güncellendi`);

  const r4 = await prisma.$executeRawUnsafe(
    `UPDATE "urunler" SET "resimUrl" = REPLACE("resimUrl", $1, $2) WHERE "resimUrl" LIKE $3`,
    OLD, NEW, OLD + '%',
  );
  console.log(`   ✓ ${r4} urunler.resimUrl güncellendi`);

  const r5 = await prisma.$executeRawUnsafe(
    `UPDATE "teklifler" SET "pdfUrl" = REPLACE("pdfUrl", $1, $2) WHERE "pdfUrl" LIKE $3`,
    OLD, NEW, OLD + '%',
  );
  console.log(`   ✓ ${r5} teklifler.pdfUrl güncellendi`);

  console.log('\n' + '━'.repeat(70));
  console.log('✅ DB URL migration tamamlandı. Frontend\'i Ctrl+Shift+R ile yenile.');
  console.log('━'.repeat(70));
}

main()
  .catch((e) => {
    console.error('\n❌ Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
