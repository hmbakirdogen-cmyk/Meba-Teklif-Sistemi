/**
 * reset-profile-photos.ts
 * ──────────────────────────────────────────────────────────────────
 * Tüm aktif kullanıcıların profilFotoUrl alanını null yapar — herkes
 * Profil sayfasından kendi fotoğrafını yeniden yüklemek zorunda kalır.
 *
 * R2 bucket'taki eski foto dosyalarına dokunulmaz (orphan kalır; istenirse
 * Cloudflare R2 dashboard üzerinden manuel temizlik yapılabilir).
 *
 * Kullanım:
 *   $env:DATABASE_URL = "postgresql://...@...render.com/..."
 *   npx tsx scripts/dev-only/reset-profile-photos.ts             # dry-run
 *   npx tsx scripts/dev-only/reset-profile-photos.ts --confirm   # gerçek
 */

import 'dotenv/config';
import { prisma } from '../../server/lib/prisma.js';

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');

async function main() {
  console.log('━'.repeat(70));
  console.log('Profil fotoğrafları reset — herkes yeniden yüklesin');
  console.log(`Mod: ${CONFIRM ? '🔥 GERÇEK UPDATE' : '👁  DRY RUN'}`);
  console.log('━'.repeat(70));

  const fotoluCount = await prisma.kullanici.count({
    where: { profilFotoUrl: { not: null } },
  });
  const aktifCount = await prisma.kullanici.count({ where: { aktifMi: true } });

  console.log(`\n📊 Durum:`);
  console.log(`   • Toplam aktif kullanıcı:        ${aktifCount}`);
  console.log(`   • Profil fotoğraflı kullanıcı:   ${fotoluCount}  ← null'lanacak`);
  console.log('');

  if (!CONFIRM) {
    console.log('👁  DRY RUN tamamlandı. Gerçek için --confirm flag\'i ekle.');
    return;
  }

  if (fotoluCount === 0) {
    console.log('✅ Etkilenen kayıt yok. Hiçbir şey yapılmadı.');
    return;
  }

  console.log('🔥 Güncelleme başlıyor...');
  const r = await prisma.kullanici.updateMany({
    where: { profilFotoUrl: { not: null } },
    data: {
      profilFotoUrl: null,
      profilFotoYuklemeTarihi: null,
    },
  });

  console.log(`\n   ✓ ${r.count} kullanıcının profilFotoUrl null'landı`);
  console.log('\n' + '━'.repeat(70));
  console.log('✅ Tamamlandı. Tüm kullanıcılar Profil sayfasından yeniden fotoğraf yükleyebilir.');
  console.log('   R2 token Render env\'de güncel olmazsa upload AccessDenied verir.');
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
