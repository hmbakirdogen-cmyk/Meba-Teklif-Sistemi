/**
 * reset-launch.ts
 * ──────────────────────────────────────────────────────────────────
 * Production lansman öncesi temizlik. Test sürecinde birikmiş demo
 * teklifleri / sayaçları / e-posta loglarını siler; kullanıcı şifrelerini
 * rol bazlı default'a (personel 0000 / yönetici 1234) reset eder ve
 * ilk-giriş zorunlu hâline çevirir.
 *
 * DOKUNULMAYAN (production verisi olarak korunur):
 *   • Firma kayıtları (meba/elmos/mesa)
 *   • Cari (8440 müşteri firma)
 *   • Ürün (45790)  + Ürün setleri
 *   • Referans listeleri (per-firma)
 *   • Kullanıcı kayıtları (yalnız şifre alanları reset)
 *   • MEBA kullanıcılarının profil fotoğrafları (firmaId = 'meba')
 *   • Geri bildirim arşivi
 *   • Audit log
 *
 * SİLİNEN:
 *   • Tüm Teklif kayıtları (her firma, hard delete)
 *   • Sayac (teklifNo aylık sayacı) — sonraki teklif yarattığında yeniden create edilir
 *   • EmailLog (test gönderim telemetrisi)
 *   • Teklif-temelli Bildirim (orphan kalmasın)
 *   • Tüm Oturum (herkes yeniden login olsun)
 *   • MEBA DIŞI (elmos + mesa) kullanıcıların profil fotoğrafları
 *     — R2'den dosya silinir + DB'de profilFotoUrl=null
 *
 * Kullanım:
 *   $env:DATABASE_URL = "postgres://..."   # Render Postgres connection string
 *   npx tsx scripts/dev-only/reset-launch.ts             # dry-run (sayar, silmez)
 *   npx tsx scripts/dev-only/reset-launch.ts --confirm   # gerçek silme
 *
 * ÖNCESİNDE: Render Dashboard → Postgres → Backups → "Take backup" → backup ID'yi not et.
 */

import 'dotenv/config';
import { prisma } from '../../server/lib/prisma.js';
import { hashPassword, verifyPassword, getVarsayilanSifre } from '../../server/lib/auth.js';
import { deleteFile, r2Configured } from '../../server/lib/storage.js';

/** profilFotoUrl → R2 key. URL formatı: "<publicBase>/kullanicilar/<id>.<ext>?v=<ts>".
 *  Query string atılır, host kısmı atılır, kalan path key olur. */
function profilFotoUrlToKey(url: string): string | null {
  try {
    const cleaned = url.split('?')[0].split('#')[0];
    const m = cleaned.match(/kullanicilar\/[^/]+$/);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');
const DB_URL = process.env.DATABASE_URL || '';

function maskDbUrl(url: string): string {
  // postgres://user:password@host:port/db  →  postgres://user:***@host:port/db
  return url.replace(/(\/\/[^:]+:)[^@]+(@)/, '$1***$2');
}

async function main() {
  const isProd = /render\.com|onrender|amazonaws/i.test(DB_URL);
  const banner = isProd ? '🔴 PRODUCTION (Render Postgres)' : '🟢 lokal/development';

  console.log('━'.repeat(70));
  console.log('Teklif Yönetim Sistemi — Lansman Reset');
  console.log('Hedef:', banner);
  console.log('DB URL:', maskDbUrl(DB_URL) || '(boş)');
  console.log('Mod  :', CONFIRM ? '🔥 GERÇEK SİLME' : '👁  DRY RUN (yalnızca sayım, hiçbir şey silinmez)');
  console.log('━'.repeat(70));
  console.log('');

  if (!DB_URL) {
    console.error('❌ DATABASE_URL boş. .env veya $env:DATABASE_URL set et ve yeniden çalıştır.');
    process.exit(1);
  }

  // ── 1) Mevcut sayım ──────────────────────────────────────────────
  const [
    teklifSayisi, sayacSayisi, emailLogSayisi, oturumSayisi,
    kullaniciSayisi, bildirimTeklifSayisi, profilFotoMebaDisi,
  ] = await Promise.all([
    prisma.teklif.count(),
    prisma.sayac.count(),
    prisma.emailLog.count(),
    prisma.oturum.count(),
    prisma.kullanici.count({ where: { aktifMi: true } }),
    prisma.bildirim.count({ where: { teklifId: { not: null } } }),
    prisma.kullanici.count({
      where: { aktifMi: true, firmaId: { not: 'meba' }, profilFotoUrl: { not: null } },
    }),
  ]);

  console.log('📊 Silinecek / değişecek:');
  console.log(`   • Teklif kayıtları:           ${teklifSayisi.toString().padStart(6)}`);
  console.log(`   • Sayaç (teklif no aylık):    ${sayacSayisi.toString().padStart(6)}`);
  console.log(`   • EmailLog:                   ${emailLogSayisi.toString().padStart(6)}`);
  console.log(`   • Teklif-temelli bildirim:    ${bildirimTeklifSayisi.toString().padStart(6)}`);
  console.log(`   • Aktif oturum:               ${oturumSayisi.toString().padStart(6)}`);
  console.log(`   • Aktif kullanıcı (şifre rs): ${kullaniciSayisi.toString().padStart(6)}`);
  console.log(`   • MEBA dışı profil fotoğrafı: ${profilFotoMebaDisi.toString().padStart(6)} (elmos + mesa)`);
  console.log('');

  const [
    firmaSayisi, cariSayisi, urunSayisi, urunSetSayisi, refSayisi,
    geriBilSayisi, auditSayisi, profilFotoMebaIci,
  ] = await Promise.all([
    prisma.firma.count(),
    prisma.cari.count(),
    prisma.urun.count(),
    prisma.urunSeti.count(),
    prisma.referans.count(),
    prisma.geriBildirim.count(),
    prisma.auditLog.count(),
    prisma.kullanici.count({
      where: { aktifMi: true, firmaId: 'meba', profilFotoUrl: { not: null } },
    }),
  ]);

  console.log('🔒 Dokunulmayan (production verisi):');
  console.log(`   • Firma:                      ${firmaSayisi.toString().padStart(6)}`);
  console.log(`   • Cari:                       ${cariSayisi.toString().padStart(6)}`);
  console.log(`   • Ürün:                       ${urunSayisi.toString().padStart(6)}`);
  console.log(`   • Ürün seti:                  ${urunSetSayisi.toString().padStart(6)}`);
  console.log(`   • Referans (per-firma):       ${refSayisi.toString().padStart(6)}`);
  console.log(`   • Geri bildirim:              ${geriBilSayisi.toString().padStart(6)}`);
  console.log(`   • Audit log:                  ${auditSayisi.toString().padStart(6)}`);
  console.log(`   • MEBA profil fotoğrafı:      ${profilFotoMebaIci.toString().padStart(6)} (korunur)`);
  console.log('');

  if (!CONFIRM) {
    console.log('───────────────────────────────────────────────────────');
    console.log('👁  DRY RUN tamamlandı. Yukarıdaki sayılar değişecek.');
    console.log('   Gerçek silme için:');
    console.log('   npx tsx scripts/dev-only/reset-launch.ts --confirm');
    console.log('───────────────────────────────────────────────────────');
    return;
  }

  if (isProd) {
    console.log('⚠  PRODUCTION DB hedefli silme başlıyor. 5 saniye içinde Ctrl+C ile iptal edebilirsin...');
    await new Promise((r) => setTimeout(r, 5000));
  }

  // ── 2) Silme — bağımlılık sırasına göre ──────────────────────────
  console.log('🔥 Silme başlıyor...\n');

  // (a) Teklif-temelli bildirimler — teklif silmeden önce orphan'lar temizlensin
  const r1 = await prisma.bildirim.deleteMany({ where: { teklifId: { not: null } } });
  console.log(`   ✓ ${r1.count} teklif-temelli bildirim silindi`);

  // (b) EmailLog — teklifId reference'lar bozulmadan önce
  const r2 = await prisma.emailLog.deleteMany({});
  console.log(`   ✓ ${r2.count} email log silindi`);

  // (c) Teklifler — hard delete (cascade yok, atomik silme)
  const r3 = await prisma.teklif.deleteMany({});
  console.log(`   ✓ ${r3.count} teklif silindi`);

  // (d) Sayaçlar — bir sonraki teklifte upsert ile yeniden oluşur
  const r4 = await prisma.sayac.deleteMany({});
  console.log(`   ✓ ${r4.count} teklif no sayacı sıfırlandı`);

  // (e) Oturumlar — herkes yeniden login olsun
  const r5 = await prisma.oturum.deleteMany({});
  console.log(`   ✓ ${r5.count} aktif oturum iptal edildi`);

  // ── 3) MEBA dışı kullanıcı profil fotoğrafları reset ─────────────
  console.log('\n🖼  MEBA dışı kullanıcı profil fotoğrafları reset ediliyor...');
  const mebaDisiFotolar = await prisma.kullanici.findMany({
    where: { aktifMi: true, firmaId: { not: 'meba' }, profilFotoUrl: { not: null } },
    select: { id: true, adSoyad: true, firmaId: true, profilFotoUrl: true },
  });

  let r2Silinen = 0;
  let r2HataliKey = 0;
  let r2Atlanan = 0;

  for (const u of mebaDisiFotolar) {
    const key = profilFotoUrlToKey(u.profilFotoUrl || '');
    if (!key) {
      r2HataliKey++;
    } else if (r2Configured) {
      try {
        await deleteFile(key);
        r2Silinen++;
      } catch (err) {
        // R2'de zaten yoksa / izin yoksa: best effort, devam et
        console.log(`     ⚠ R2 silme atlandı (${key}): ${(err as Error).message}`);
        r2Atlanan++;
      }
    } else {
      r2Atlanan++;
    }
    await prisma.kullanici.update({
      where: { id: u.id },
      data: { profilFotoUrl: null, profilFotoYuklemeTarihi: null },
    });
    console.log(`     • ${u.adSoyad.padEnd(28)} (${u.firmaId}) → foto sıfırlandı`);
  }
  console.log(`\n   ✓ ${mebaDisiFotolar.length} kullanıcının DB profilFotoUrl=null`);
  if (r2Configured) {
    console.log(`   ✓ ${r2Silinen} R2 dosyası silindi, ${r2Atlanan} atlandı, ${r2HataliKey} key parse edilemedi`);
  } else {
    console.log(`   ⚠ R2 env vars yok → R2 dosyaları silinmedi (DB referansı null, orphan kalır)`);
  }

  // ── 4) Kullanıcı şifreleri reset (rol bazlı) ─────────────────────
  console.log('\n🔐 Kullanıcı şifreleri rol bazlı default\'a reset ediliyor...');
  const aktifler = await prisma.kullanici.findMany({
    where: { aktifMi: true },
    select: { id: true, rol: true, kullaniciAdi: true, adSoyad: true },
  });

  let resetCount = 0;
  for (const u of aktifler) {
    const varsayilan = getVarsayilanSifre(u.rol);
    await prisma.kullanici.update({
      where: { id: u.id },
      data: {
        sifreHash: hashPassword(varsayilan),
        mustChangePassword: true,
        sifreDegisikligi: new Date(),
      },
    });
    resetCount++;
    console.log(`     • ${u.adSoyad.padEnd(28)} (${u.rol.padEnd(12)}) → ${varsayilan}`);
  }
  console.log(`\n   ✓ ${resetCount} kullanıcının şifresi reset edildi`);
  console.log(`   ✓ Hepsi için mustChangePassword=true (ilk girişte yeni şifre zorunlu)`);

  // ── 5) Şifre doğrulama (verify pass) ─────────────────────────────
  // Paranoid kontrol: her aktif kullanıcının yeni sifreHash'i gerçekten rol
  // bazlı default şifre ile eşleşiyor mu? Eşleşmeyen varsa kritik hata.
  console.log('\n✅ Şifre doğrulama (verify pass)...');
  const dogrulananlar = await prisma.kullanici.findMany({
    where: { aktifMi: true },
    select: { id: true, rol: true, adSoyad: true, kullaniciAdi: true, sifreHash: true, mustChangePassword: true },
  });

  type Hatali = { adSoyad: string; rol: string; kullaniciAdi: string; sebep: string };
  const hatalilar: Hatali[] = [];

  for (const u of dogrulananlar) {
    const beklenen = getVarsayilanSifre(u.rol);
    if (!verifyPassword(beklenen, u.sifreHash)) {
      hatalilar.push({
        adSoyad: u.adSoyad,
        rol: u.rol,
        kullaniciAdi: u.kullaniciAdi,
        sebep: `hash "${beklenen}" ile doğrulanmıyor`,
      });
    } else if (!u.mustChangePassword) {
      hatalilar.push({
        adSoyad: u.adSoyad,
        rol: u.rol,
        kullaniciAdi: u.kullaniciAdi,
        sebep: 'mustChangePassword=false (true olmalıydı)',
      });
    }
  }

  const yoneticiSayisi = dogrulananlar.filter((u) => u.rol === 'super_admin' || u.rol === 'firma_admin').length;
  const personelSayisi = dogrulananlar.length - yoneticiSayisi;

  console.log(`   • Toplam aktif kullanıcı:         ${dogrulananlar.length}`);
  console.log(`   • Yönetici (super_admin/firma_admin → 1234): ${yoneticiSayisi}`);
  console.log(`   • Personel (engineer/sales → 0000):           ${personelSayisi}`);

  if (hatalilar.length > 0) {
    console.log(`\n   ❌ ${hatalilar.length} KULLANICI DOĞRULANAMADI:`);
    for (const h of hatalilar) {
      console.log(`      ✗ ${h.adSoyad} (${h.kullaniciAdi}, ${h.rol}) — ${h.sebep}`);
    }
    console.log('\n   Bu kullanıcılar manuel kontrol gerektirir. Reset tamamlanmadı sayılır.');
    process.exit(2);
  } else {
    console.log(`   ✓ Hepsi başarıyla doğrulandı — herkes (yönetici dahil) rol bazlı default şifreyle giriş yapabilir`);
    console.log(`   ✓ Hepsinde mustChangePassword=true — ilk girişte yeni şifre zorunlu`);
  }

  // ── 6) Özet ──────────────────────────────────────────────────────
  console.log('\n' + '━'.repeat(70));
  console.log('✅ Lansman reset tamamlandı. Sistem yönetici arkadaşlara açılmaya hazır.');
  console.log('━'.repeat(70));
  console.log('');
  console.log('Sonraki adımlar:');
  console.log('  1) https://meba-teklif.onrender.com adresine super_admin (Mehmet) ile gir');
  console.log('     → şifre: 1234 → ilk girişte yeni şifre belirle');
  console.log('  2) Profil → E-posta Ayarları\'ndan kendi SMTP\'ni gir');
  console.log('  3) Yönetici arkadaşlara hazırladığın mesajı gönder');
  console.log('  4) İlk teklif denemesi: PDF üretim + e-posta gönderim akışı düz mü kontrol et');
}

main()
  .catch((e) => {
    console.error('\n❌ Reset hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
