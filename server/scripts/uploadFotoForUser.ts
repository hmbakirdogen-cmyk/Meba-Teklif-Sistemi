/**
 * uploadFotoForUser.ts — Bir kerelik: dosya yolundan bir kullanıcının profil
 * fotosunu R2'ye yükler + Prisma'da profilFotoUrl'ü günceller. Yüz tespiti
 * yapmaz; admin Personel sayfasındaki "Yüz Odaklı İşle" butonu sonradan
 * çağrılabilir veya kullanıcı kendi profilinde tekrar işleyebilir.
 *
 * Kullanım:
 *   tsx server/scripts/uploadFotoForUser.ts "<dosya yolu>" "<kullaniciAdi>"
 * Örnek:
 *   tsx server/scripts/uploadFotoForUser.ts "data/mesa/fatih lazoğlu.jpeg" "fatih lazoğlu"
 */

import { readFileSync } from 'node:fs';
import { extname, basename } from 'node:path';
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { uploadFile } from '../lib/storage.js';

function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.png') return 'image/png';
  if (e === '.webp') return 'image/webp';
  throw new Error(`Desteklenmeyen uzantı: ${ext}`);
}

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

async function main(): Promise<void> {
  const [filePath, kullaniciAdi] = process.argv.slice(2);
  if (!filePath || !kullaniciAdi) {
    console.error('Kullanım: tsx server/scripts/uploadFotoForUser.ts <dosya> <kullaniciAdi>');
    process.exit(1);
  }

  const buffer = readFileSync(filePath);
  const mime = mimeFromExt(extname(filePath));
  console.log(`[uploadFoto] Dosya: ${basename(filePath)} (${buffer.length} bytes, ${mime})`);

  // Kullanıcıyı bul — kullaniciAdi tam eşleşme, yoksa ilk-kelime ile dene
  const lower = kullaniciAdi.toLocaleLowerCase('tr-TR');
  const aktifler = await prisma.kullanici.findMany({ where: { aktifMi: true } });
  let user = aktifler.find((u) => String(u.kullaniciAdi || '').toLocaleLowerCase('tr-TR') === lower);
  if (!user) {
    const firstWord = lower.split(/\s+/)[0];
    const matches = aktifler.filter((u) => {
      const ka = String(u.kullaniciAdi || '').toLocaleLowerCase('tr-TR');
      return ka.startsWith(firstWord + ' ') || ka === firstWord;
    });
    if (matches.length === 1) user = matches[0];
    else if (matches.length > 1) {
      console.error(`'${kullaniciAdi}' birden fazla kullanıcıyla eşleşti:`, matches.map((u) => u.kullaniciAdi));
      process.exit(2);
    }
  }
  if (!user) {
    console.error(`Kullanıcı bulunamadı: '${kullaniciAdi}'`);
    process.exit(3);
  }
  console.log(`[uploadFoto] Hedef kullanıcı: ${user.kullaniciAdi} (${user.id}, firma: ${user.firmaId ?? '-'})`);

  const ext = extFromMime(mime);
  const key = `kullanicilar/${user.id}.${ext}`;
  const { url } = await uploadFile(key, buffer, mime);
  const cacheBust = `${url}?v=${Date.now()}`;
  console.log(`[uploadFoto] R2 yüklendi: ${cacheBust}`);

  await prisma.kullanici.update({
    where: { id: user.id },
    data: {
      profilFotoUrl: cacheBust,
      profilFotoYuklemeTarihi: new Date(),
    },
  });
  console.log('[uploadFoto] Prisma güncellendi ✓');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[uploadFoto] HATA:', err);
  process.exit(99);
});
