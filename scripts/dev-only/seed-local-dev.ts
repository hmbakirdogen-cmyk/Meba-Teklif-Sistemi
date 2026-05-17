/**
 * seed-local-dev.ts
 * Lokal geliştirme için minimum başlangıç verisi:
 *   • 3 firma kaydı (meba / mesa / elmos)
 *   • 1 super_admin kullanıcı (kullanıcı adı: admin, şifre: 1234)
 *
 * Kullanım:
 *   npx tsx scripts/dev-only/seed-local-dev.ts
 *
 * Idempotent — tekrar çalıştırıldığında upsert ile güvenli.
 */

import 'dotenv/config';
import { prisma } from '../../server/lib/prisma.js';
import { hashPassword } from '../../server/lib/auth.js';

const FIRMALAR = [
  {
    id: 'meba',
    ad: 'MEBA Mühendislik',
    kisaAd: 'MEBA',
    slogan: 'Endüstriyel çözümler',
    renkBirincil: '#0e3a5f',
    renkVurgu: '#f5a623',
    teklifPrefix: 'MEBA',
  },
  {
    id: 'mesa',
    ad: 'MESA',
    kisaAd: 'MESA',
    slogan: 'Tasarım ve üretim',
    renkBirincil: '#1c5a3a',
    renkVurgu: '#c0d630',
    teklifPrefix: 'MESA',
  },
  {
    id: 'elmos',
    ad: 'ELMOS',
    kisaAd: 'ELMOS',
    slogan: 'Otomasyon sistemleri',
    renkBirincil: '#3a1c5a',
    renkVurgu: '#d63090',
    teklifPrefix: 'ELMOS',
  },
];

async function main() {
  console.log('Seeding firmas...');
  for (const f of FIRMALAR) {
    await prisma.firma.upsert({
      where: { id: f.id },
      update: {},
      create: f,
    });
    console.log(`  ${f.id}: ok`);
  }

  console.log('Seeding super_admin user (admin / 1234)...');
  await prisma.kullanici.upsert({
    where: { kullaniciAdi: 'admin' },
    update: {},
    create: {
      id: 'u-admin-local',
      kullaniciAdi: 'admin',
      sifreHash: hashPassword('1234'),
      adSoyad: 'Local Admin',
      unvan: 'Sistem Yöneticisi',
      initials: 'LA',
      rol: 'super_admin',
      firmaId: 'meba',
      gosterilenFirmalar: ['meba', 'mesa', 'elmos'],
      aktifMi: true,
      mustChangePassword: false,
    },
  });
  console.log('  admin: ok');

  console.log('\nDone. Login: admin / 1234');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
