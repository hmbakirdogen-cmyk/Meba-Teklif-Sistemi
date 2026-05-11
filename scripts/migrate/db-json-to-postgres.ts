/**
 * db-json-to-postgres.ts
 * ──────────────────────────────────────────────────────────────────
 * Mevcut server/db.json'daki tüm veriyi Render Postgres'e taşır.
 *
 * Akış:
 *   1. db.json oku
 *   2. R2 yapılandırıldıysa: public/profil-fotograflari, public/cari-logolari,
 *      public/logo-<firma>.png dosyalarını R2'ye yükle.
 *   3. FK sırasıyla upsert: Firma → Kullanici → Referans → Sayac → Cari →
 *      Urun → UrunSeti → Teklif → Bildirim → GeriBildirim → AuditLog.
 *   4. Oturumlar migrate edilmez — kullanıcılar yeniden login olur.
 *
 * Kullanım:
 *   npm run migrate:data            # gerçek migration
 *   npm run migrate:data -- --dry-run  # sadece raporla, DB'ye yazma
 *   npm run migrate:data -- --db ./server/db.json
 *
 * Tekrar çalıştırma güvenli — upsert idempotent. R2 upload mevcut dosyaları
 * üzerine yazar.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';
import { prisma } from '../../server/lib/prisma.js';
import { uploadFile, r2Configured } from '../../server/lib/storage.js';

/** Prisma Json? alanları için: null → Prisma.JsonNull, undefined → atla. */
function jsonOrNull(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (v === null || v === undefined) return Prisma.JsonNull;
  return v as Prisma.InputJsonValue;
}

/** db.json'daki numeric alanlar bazen string ("1.0935" gibi). Float? alanlar için
 *  güvenli coerce: boş/undefined → null, sayıya çevrilemiyor → null. */
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const trimmed = v.trim().replace(',', '.');
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Float (not null) alanlar için: parse edilemezse 0 döner. */
function numOrZero(v: unknown): number {
  return numOrNull(v) ?? 0;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

interface CliOptions {
  dbPath: string;
  dryRun: boolean;
  skipImages: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let dbPath = path.join(REPO_ROOT, 'server', 'db.json');
  let dryRun = false;
  let skipImages = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--skip-images') skipImages = true;
    else if (a === '--db') dbPath = path.resolve(args[++i] ?? '');
  }
  return { dbPath, dryRun, skipImages };
}

interface RawDb {
  firmalar?: RawFirma[];
  kullanicilar?: RawKullanici[];
  referans?: Record<string, RawReferans>;
  sayaclar?: Record<string, RawSayac>;
  teklifler?: RawTeklif[];
  cariler?: RawCari[];
  urunler?: RawUrun[];
  urunSetleri?: RawUrunSeti[];
  bildirimler?: RawBildirim[];
  geriBildirimler?: RawGeriBildirim[];
  auditLog?: RawAuditEntry[];
}

interface RawFirma {
  id: string;
  ad?: string;
  kisaAd?: string;
  slogan?: string;
  logoPath?: string;
  logoUrl?: string;
  renkBirincil?: string;
  renkVurgu?: string;
  adres?: string;
  vergiDairesi?: string;
  vergiNo?: string;
  telefon?: string;
  eposta?: string;
  web?: string;
  iban?: string;
  pdfKlasorAdi?: string;
  teklifPrefix?: string;
  logoScale?: number;
  varsayilanlar?: unknown;
}

interface RawKullanici {
  id: string;
  kullaniciAdi: string;
  sifreHash: string;
  adSoyad?: string;
  unvan?: string;
  initials?: string;
  rol: string;
  firmaId?: string | null;
  gosterilenFirmalar?: string[];
  telefon?: string;
  dahili?: string;
  profilFotoUrl?: string;
  profilFotoYuklemeTarihi?: string;
  aktifMi?: boolean;
  mustChangePassword?: boolean;
  sifreDegisikligi?: string;
  olusturmaTarihi?: string;
  olusturanKullaniciId?: string;
  silmeTarihi?: string;
}

interface RawReferans {
  markalar?: string[];
  birimler?: string[];
  teslimSecenekleri?: string[];
  odemeVadesiSecenekleri?: string[];
  kdvOranlari?: string[];
  gecerlilikSecenekleri?: string[];
  paraBirimleri?: string[];
  dovizKuruSecenekleri?: string[];
}

interface RawSayac {
  yil: number;
  ay: number;
  deger: number;
}

interface RawTeklif {
  id: string;
  firmaId?: string;
  teklifNo?: string;
  tarih?: string;
  durum?: string;
  status?: string;
  paraBirimi?: string;
  kdvOrani?: number;
  iskontoOrani?: number;
  odemeVadesi?: string;
  gecerlilikSuresi?: string;
  dovizKuru?: string | number;
  satirBazliParaBirimi?: boolean;
  satirBazliIskonto?: boolean;
  cari?: unknown;
  cariSnapshot?: unknown;
  contactName?: string;
  contactTitle?: string;
  satirlar?: unknown[];
  araToplam?: number;
  toplamIndirim?: number;
  toplamVergi?: number;
  genelToplam?: number;
  notlar?: string;
  notlarGosterilsin?: boolean;
  hazirlayanKullaniciId?: string;
  hazirlayanAdSoyad?: string;
  hazirlayanRol?: string;
  hazirlayanUnvan?: string;
  ilgiliKisiId?: string;
  visibility?: string;
  revizyonNo?: number;
  kaynakTeklifId?: string;
  kokTeklifId?: string;
  sonucTarihi?: string;
  sonucGirenKullaniciId?: string;
  sonucNotu?: string;
  kayipSebebi?: string;
  rakipFirma?: string;
  pdfYolu?: string;
  pdfDosyaAdi?: string;
  pdfOlusturmaTarihi?: string;
  version?: number;
  deviceId?: string;
  updatedBy?: string;
  lastSyncedAt?: string;
  deletedAt?: string | null;
  olusturmaTarihi?: string;
  guncellemeTarihi?: string;
}

interface RawCari {
  id: string;
  firmaId?: string;
  cariKod?: string;
  firmaAdi: string;
  yetkiliKisi?: string;
  telefon?: string;
  ePosta?: string;
  adres?: string;
  sehir?: string;
  vergiDairesi?: string;
  vergiNo?: string;
  logoUrl?: string;
  logoYuklemeTarihi?: string;
  kisiler?: unknown;
  lastContactName?: string;
  lastContactTitle?: string;
  notlar?: string;
  version?: number;
  deviceId?: string;
  updatedBy?: string;
  lastSyncedAt?: string;
  deletedAt?: string | null;
  olusturmaTarihi?: string;
  guncellemeTarihi?: string;
}

interface RawUrun {
  id: string;
  firmaId?: string;
  urunKod?: string;
  urunAdi: string;
  aciklama?: string;
  kategori?: string;
  marka?: string;
  birim?: string;
  varsayilanFiyat?: number;
  resimUrl?: string;
  version?: number;
  deviceId?: string;
  updatedBy?: string;
  lastSyncedAt?: string;
  deletedAt?: string | null;
  olusturmaTarihi?: string;
  guncellemeTarihi?: string;
}

interface RawUrunSeti {
  id: string;
  firmaId?: string;
  setKod?: string;
  setAdi?: string;
  aciklama?: string;
  kalemler?: unknown;
  version?: number;
  deviceId?: string;
  updatedBy?: string;
  lastSyncedAt?: string;
  deletedAt?: string | null;
  olusturmaTarihi?: string;
  guncellemeTarihi?: string;
}

interface RawBildirim {
  id: string;
  hedefKullaniciId: string;
  kaynakKullaniciId?: string;
  kaynakKullaniciAdSoyad?: string;
  tur: string;
  teklifId?: string;
  teklifNo?: string;
  cariAdi?: string;
  geriBildirimId?: string;
  ozet?: string;
  okundu?: boolean;
  tarih?: string;
}

interface RawGeriBildirim {
  id: string;
  gonderen?: { id: string; adSoyad?: string };
  tarih?: string;
  sayfa?: string;
  tur: string;
  mesaj: string;
  okundu?: boolean;
  cevap?: string | null;
  cevapTarihi?: string | null;
}

interface RawAuditEntry {
  zaman?: string;
  eylem: string;
  kullaniciId?: string | null;
  kullaniciAdi?: string | null;
  firmaId?: string | null;
  detay?: unknown;
}

function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function safeParseDate(s?: string | null, fallback: Date = new Date()): Date {
  return parseDate(s) ?? fallback;
}

const ALLOWED_ROLES = new Set(['super_admin', 'firma_admin', 'engineer', 'sales']);
const ALLOWED_BILDIRIM_TUR = new Set(['ilgili_atandi', 'teklif_guncellendi', 'geri_bildirim_cevap']);
const ALLOWED_GERIBILDIRIM_TUR = new Set(['hata', 'oneri', 'mesaj']);

// ── R2 upload helpers ────────────────────────────────────────────

async function uploadIfExists(localPath: string, r2Key: string, contentType: string): Promise<string | null> {
  if (!fs.existsSync(localPath)) return null;
  const buf = fs.readFileSync(localPath);
  if (buf.length === 0) return null;
  const { url } = await uploadFile(r2Key, buf, contentType);
  return `${url}?v=${Date.now()}`;
}

function inferContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

async function migrateFirmaLogo(firmaId: string, logoPath: string | undefined): Promise<string | null> {
  if (!logoPath) return null;
  const candidates = [
    path.join(REPO_ROOT, 'public', logoPath.replace(/^[/\\]+/, '')),
    path.join(REPO_ROOT, 'public', `logo-${firmaId}.png`),
  ];
  for (const aday of candidates) {
    if (!fs.existsSync(aday)) continue;
    const ext = aday.split('.').pop() || 'png';
    return await uploadIfExists(aday, `firmalar/${firmaId}/logo.${ext}`, inferContentType(aday));
  }
  return null;
}

async function migrateKullaniciFoto(userId: string): Promise<string | null> {
  const dir = path.join(REPO_ROOT, 'public', 'profil-fotograflari');
  if (!fs.existsSync(dir)) return null;
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const aday = path.join(dir, `${userId}.${ext}`);
    if (fs.existsSync(aday)) {
      return await uploadIfExists(aday, `kullanicilar/${userId}.${ext}`, inferContentType(aday));
    }
  }
  return null;
}

async function migrateCariLogo(cariId: string): Promise<string | null> {
  const dir = path.join(REPO_ROOT, 'public', 'cari-logolari');
  if (!fs.existsSync(dir)) return null;
  const safe = cariId.replace(/[^a-zA-Z0-9_-]/g, '_');
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const aday = path.join(dir, `${safe}.${ext}`);
    if (fs.existsSync(aday)) {
      return await uploadIfExists(aday, `cariler/${safe}.${ext}`, inferContentType(aday));
    }
  }
  return null;
}

// ── Main migration ───────────────────────────────────────────────

async function migrate() {
  const opts = parseArgs();
  console.log('▶ Migration başlıyor');
  console.log('  db.json:', opts.dbPath);
  console.log('  dry-run:', opts.dryRun);
  console.log('  R2:', r2Configured ? 'yapılandırılmış' : 'YOK (görseller atlanacak)');

  if (!fs.existsSync(opts.dbPath)) {
    console.error('✖ db.json bulunamadı:', opts.dbPath);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(opts.dbPath, 'utf-8')) as RawDb;

  const stats = {
    firmalar: 0,
    kullanicilar: 0,
    referans: 0,
    sayaclar: 0,
    cariler: 0,
    urunler: 0,
    urunSetleri: 0,
    teklifler: 0,
    bildirimler: 0,
    geriBildirimler: 0,
    auditLog: 0,
    r2Uploads: 0,
  };

  const writeAllowed = !opts.dryRun;

  // 1) FIRMALAR
  for (const f of raw.firmalar ?? []) {
    if (!f.id) continue;
    let logoUrl: string | null = f.logoUrl ?? null;
    if (!opts.skipImages && r2Configured) {
      const uploaded = await migrateFirmaLogo(f.id, f.logoPath || `logo-${f.id}.png`);
      if (uploaded) {
        logoUrl = uploaded;
        stats.r2Uploads++;
      }
    }
    const data = {
      ad: f.ad ?? f.id,
      kisaAd: f.kisaAd ?? null,
      slogan: f.slogan ?? null,
      logoUrl,
      renkBirincil: f.renkBirincil ?? null,
      renkVurgu: f.renkVurgu ?? null,
      adres: f.adres ?? null,
      vergiDairesi: f.vergiDairesi ?? null,
      vergiNo: f.vergiNo ?? null,
      telefon: f.telefon ?? null,
      eposta: f.eposta ?? null,
      web: f.web ?? null,
      iban: f.iban ?? null,
      pdfKlasorAdi: f.pdfKlasorAdi ?? null,
      teklifPrefix: f.teklifPrefix ?? null,
      logoScale: f.logoScale ?? null,
      varsayilanlar: jsonOrNull(f.varsayilanlar),
    };
    if (writeAllowed) {
      await prisma.firma.upsert({
        where: { id: f.id },
        update: data,
        create: { id: f.id, ...data },
      });
    }
    stats.firmalar++;
  }
  console.log(`  ✓ Firma: ${stats.firmalar}`);

  // 2) KULLANICILAR
  for (const u of raw.kullanicilar ?? []) {
    if (!u.id || !u.kullaniciAdi || !u.sifreHash) continue;
    if (!ALLOWED_ROLES.has(u.rol)) continue;
    let profilFotoUrl: string | null = u.profilFotoUrl ?? null;
    if (!opts.skipImages && r2Configured) {
      const uploaded = await migrateKullaniciFoto(u.id);
      if (uploaded) {
        profilFotoUrl = uploaded;
        stats.r2Uploads++;
      }
    }
    const data = {
      kullaniciAdi: u.kullaniciAdi.toLocaleLowerCase('tr-TR'),
      sifreHash: u.sifreHash,
      adSoyad: u.adSoyad ?? '',
      unvan: u.unvan ?? null,
      initials: u.initials ?? null,
      rol: u.rol as 'super_admin' | 'firma_admin' | 'engineer' | 'sales',
      firmaId: u.firmaId ?? null,
      gosterilenFirmalar: u.gosterilenFirmalar ?? [],
      telefon: u.telefon ?? null,
      dahili: u.dahili ?? null,
      profilFotoUrl,
      profilFotoYuklemeTarihi: parseDate(u.profilFotoYuklemeTarihi),
      aktifMi: u.aktifMi !== false,
      mustChangePassword: u.mustChangePassword ?? false,
      sifreDegisikligi: parseDate(u.sifreDegisikligi),
      olusturmaTarihi: safeParseDate(u.olusturmaTarihi),
      olusturanKullaniciId: u.olusturanKullaniciId ?? null,
      silmeTarihi: parseDate(u.silmeTarihi),
    };
    if (writeAllowed) {
      await prisma.kullanici.upsert({
        where: { id: u.id },
        update: data,
        create: { id: u.id, ...data },
      });
    }
    stats.kullanicilar++;
  }
  console.log(`  ✓ Kullanici: ${stats.kullanicilar}`);

  // 3) REFERANS — per-firma
  if (raw.referans && typeof raw.referans === 'object') {
    for (const [firmaId, r] of Object.entries(raw.referans)) {
      if (!firmaId) continue;
      const data = {
        markalar: r.markalar ?? [],
        birimler: r.birimler ?? [],
        teslimSecenekleri: r.teslimSecenekleri ?? [],
        odemeVadesiSecenekleri: r.odemeVadesiSecenekleri ?? [],
        kdvOranlari: r.kdvOranlari ?? [],
        gecerlilikSecenekleri: r.gecerlilikSecenekleri ?? [],
        paraBirimleri: r.paraBirimleri ?? [],
        dovizKuruSecenekleri: r.dovizKuruSecenekleri ?? [],
      };
      if (writeAllowed) {
        await prisma.referans.upsert({
          where: { firmaId },
          update: data,
          create: { firmaId, ...data },
        });
      }
      stats.referans++;
    }
  }
  console.log(`  ✓ Referans: ${stats.referans}`);

  // 4) SAYACLAR
  if (raw.sayaclar && typeof raw.sayaclar === 'object') {
    for (const [firmaId, s] of Object.entries(raw.sayaclar)) {
      if (!firmaId || !s || typeof s !== 'object') continue;
      const data = {
        yil: typeof s.yil === 'number' ? s.yil : new Date().getFullYear(),
        ay: typeof s.ay === 'number' ? s.ay : new Date().getMonth() + 1,
        deger: typeof s.deger === 'number' ? s.deger : 0,
      };
      if (writeAllowed) {
        await prisma.sayac.upsert({
          where: { firmaId },
          update: data,
          create: { firmaId, ...data },
        });
      }
      stats.sayaclar++;
    }
  }
  console.log(`  ✓ Sayac: ${stats.sayaclar}`);

  // 5) CARILER
  let cariIdx = 0;
  for (const c of raw.cariler ?? []) {
    if (!c.id || !c.firmaId) continue;
    let logoUrl: string | null = null;
    // Eski local /cari-logolari/... URL'leri R2'ye yükle; absolute URL ise koru.
    if (c.logoUrl && /^https?:\/\//i.test(c.logoUrl)) {
      logoUrl = c.logoUrl;
    } else if (!opts.skipImages && r2Configured) {
      const uploaded = await migrateCariLogo(c.id);
      if (uploaded) {
        logoUrl = uploaded;
        stats.r2Uploads++;
      }
    }
    const data = {
      firmaId: c.firmaId,
      cariKod: c.cariKod ?? null,
      firmaAdi: c.firmaAdi || '(adsız)',
      yetkiliKisi: c.yetkiliKisi ?? null,
      telefon: c.telefon ?? null,
      ePosta: c.ePosta ?? null,
      adres: c.adres ?? null,
      sehir: c.sehir ?? null,
      vergiDairesi: c.vergiDairesi ?? null,
      vergiNo: c.vergiNo ?? null,
      logoUrl,
      logoYuklemeTarihi: parseDate(c.logoYuklemeTarihi),
      kisiler: jsonOrNull(c.kisiler),
      lastContactName: c.lastContactName ?? null,
      lastContactTitle: c.lastContactTitle ?? null,
      notlar: c.notlar ?? null,
      version: c.version ?? 1,
      deviceId: c.deviceId ?? null,
      updatedBy: c.updatedBy ?? null,
      lastSyncedAt: parseDate(c.lastSyncedAt),
      deletedAt: parseDate(c.deletedAt),
      olusturmaTarihi: safeParseDate(c.olusturmaTarihi),
      guncellemeTarihi: safeParseDate(c.guncellemeTarihi),
    };
    if (writeAllowed) {
      await prisma.cari.upsert({
        where: { id: c.id },
        update: data,
        create: { id: c.id, ...data },
      });
    }
    stats.cariler++;
    cariIdx++;
    if (cariIdx % 500 === 0) console.log(`    … Cari ilerleme: ${cariIdx}`);
  }
  console.log(`  ✓ Cari: ${stats.cariler}`);

  // 6) URUNLER — büyük tablo (45k+), transaction batch'ler
  const urunBatch: Array<Prisma.UrunCreateInput> = [];
  for (const u of raw.urunler ?? []) {
    if (!u.id || !u.firmaId) continue;
    const data: Prisma.UrunCreateInput = {
      id: u.id,
      firma: { connect: { id: u.firmaId } },
      urunKod: u.urunKod ?? null,
      urunAdi: u.urunAdi || '(adsız)',
      aciklama: u.aciklama ?? null,
      kategori: u.kategori ?? null,
      marka: u.marka ?? null,
      birim: u.birim ?? null,
      varsayilanFiyat: numOrNull(u.varsayilanFiyat),
      resimUrl: u.resimUrl ?? null,
      version: u.version ?? 1,
      deviceId: u.deviceId ?? null,
      updatedBy: u.updatedBy ?? null,
      lastSyncedAt: parseDate(u.lastSyncedAt),
      deletedAt: parseDate(u.deletedAt),
      olusturmaTarihi: safeParseDate(u.olusturmaTarihi),
      guncellemeTarihi: safeParseDate(u.guncellemeTarihi),
    };
    urunBatch.push(data);
    stats.urunler++;
  }
  if (writeAllowed && urunBatch.length > 0) {
    console.log(`    … Urun upsert: ${urunBatch.length} kayıt batch'lerde işleniyor`);
    const BATCH = 500;
    for (let i = 0; i < urunBatch.length; i += BATCH) {
      const slice = urunBatch.slice(i, i + BATCH);
      await prisma.$transaction(
        slice.map((u) =>
          prisma.urun.upsert({
            where: { id: u.id! },
            update: { ...u, firma: undefined, firmaId: (u.firma as { connect: { id: string } }).connect.id },
            create: u,
          }),
        ),
      );
      if ((i + BATCH) % 5000 === 0 || i + BATCH >= urunBatch.length) {
        console.log(`      Urun ${Math.min(i + BATCH, urunBatch.length)}/${urunBatch.length}`);
      }
    }
  }
  console.log(`  ✓ Urun: ${stats.urunler}`);

  // 7) URUN SETLERI
  for (const s of raw.urunSetleri ?? []) {
    if (!s.id || !s.firmaId) continue;
    const data = {
      firmaId: s.firmaId,
      setKod: s.setKod ?? null,
      setAdi: s.setAdi ?? null,
      aciklama: s.aciklama ?? null,
      kalemler: (s.kalemler ?? []) as Prisma.InputJsonValue,
      version: s.version ?? 1,
      deviceId: s.deviceId ?? null,
      updatedBy: s.updatedBy ?? null,
      lastSyncedAt: parseDate(s.lastSyncedAt),
      deletedAt: parseDate(s.deletedAt),
      olusturmaTarihi: safeParseDate(s.olusturmaTarihi),
      guncellemeTarihi: safeParseDate(s.guncellemeTarihi),
    };
    if (writeAllowed) {
      await prisma.urunSeti.upsert({
        where: { id: s.id },
        update: data,
        create: { id: s.id, ...data },
      });
    }
    stats.urunSetleri++;
  }
  console.log(`  ✓ UrunSeti: ${stats.urunSetleri}`);

  // 8) TEKLIFLER
  for (const t of raw.teklifler ?? []) {
    if (!t.id || !t.firmaId) continue;
    const visibility: 'team' | 'private' = t.visibility === 'private' ? 'private' : 'team';
    const cariSnapshot = jsonOrNull(t.cariSnapshot ?? t.cari);
    const data = {
      firmaId: t.firmaId,
      teklifNo: t.teklifNo ?? null,
      tarih: t.tarih ?? null,
      durum: t.durum ?? null,
      status: t.status ?? null,
      paraBirimi: t.paraBirimi ?? null,
      kdvOrani: numOrNull(t.kdvOrani),
      iskontoOrani: numOrNull(t.iskontoOrani),
      odemeVadesi: t.odemeVadesi ?? null,
      gecerlilikSuresi: t.gecerlilikSuresi ?? null,
      dovizKuru: t.dovizKuru == null ? null : String(t.dovizKuru),
      satirBazliParaBirimi: !!t.satirBazliParaBirimi,
      satirBazliIskonto: !!t.satirBazliIskonto,
      cariSnapshot,
      contactName: t.contactName ?? null,
      contactTitle: t.contactTitle ?? null,
      satirlar: (t.satirlar ?? []) as Prisma.InputJsonValue,
      araToplam: numOrZero(t.araToplam),
      toplamIndirim: numOrZero(t.toplamIndirim),
      toplamVergi: numOrZero(t.toplamVergi),
      genelToplam: numOrZero(t.genelToplam),
      notlar: t.notlar ?? null,
      notlarGosterilsin: t.notlarGosterilsin !== false,
      hazirlayanKullaniciId: t.hazirlayanKullaniciId ?? null,
      hazirlayanAdSoyad: t.hazirlayanAdSoyad ?? null,
      hazirlayanRol: t.hazirlayanRol ?? null,
      hazirlayanUnvan: t.hazirlayanUnvan ?? null,
      ilgiliKisiId: t.ilgiliKisiId ?? null,
      visibility,
      revizyonNo: t.revizyonNo ?? null,
      kaynakTeklifId: t.kaynakTeklifId ?? null,
      kokTeklifId: t.kokTeklifId ?? null,
      sonucTarihi: parseDate(t.sonucTarihi),
      sonucGirenKullaniciId: t.sonucGirenKullaniciId ?? null,
      sonucNotu: t.sonucNotu ?? null,
      kayipSebebi: t.kayipSebebi ?? null,
      rakipFirma: t.rakipFirma ?? null,
      pdfUrl: null,
      pdfDosyaAdi: t.pdfDosyaAdi ?? null,
      pdfOlusturmaTarihi: parseDate(t.pdfOlusturmaTarihi),
      version: t.version ?? 1,
      deviceId: t.deviceId ?? null,
      updatedBy: t.updatedBy ?? null,
      lastSyncedAt: parseDate(t.lastSyncedAt),
      deletedAt: parseDate(t.deletedAt),
      olusturmaTarihi: safeParseDate(t.olusturmaTarihi),
      guncellemeTarihi: safeParseDate(t.guncellemeTarihi),
    };
    if (writeAllowed) {
      await prisma.teklif.upsert({
        where: { id: t.id },
        update: data,
        create: { id: t.id, ...data },
      });
    }
    stats.teklifler++;
  }
  console.log(`  ✓ Teklif: ${stats.teklifler}`);

  // 9) BILDIRIMLER
  for (const b of raw.bildirimler ?? []) {
    if (!b.id || !b.hedefKullaniciId) continue;
    if (!ALLOWED_BILDIRIM_TUR.has(b.tur)) continue;
    const data = {
      hedefKullaniciId: b.hedefKullaniciId,
      kaynakKullaniciId: b.kaynakKullaniciId ?? null,
      kaynakKullaniciAdSoyad: b.kaynakKullaniciAdSoyad ?? null,
      tur: b.tur as 'ilgili_atandi' | 'teklif_guncellendi' | 'geri_bildirim_cevap',
      teklifId: b.teklifId ?? null,
      teklifNo: b.teklifNo ?? null,
      cariAdi: b.cariAdi ?? null,
      geriBildirimId: b.geriBildirimId ?? null,
      ozet: b.ozet ?? null,
      okundu: !!b.okundu,
      tarih: safeParseDate(b.tarih),
      firmaId: null,
    };
    if (writeAllowed) {
      await prisma.bildirim.upsert({
        where: { id: b.id },
        update: data,
        create: { id: b.id, ...data },
      });
    }
    stats.bildirimler++;
  }
  console.log(`  ✓ Bildirim: ${stats.bildirimler}`);

  // 10) GERI BILDIRIMLER
  for (const g of raw.geriBildirimler ?? []) {
    if (!g.id || !g.gonderen?.id) continue;
    if (!ALLOWED_GERIBILDIRIM_TUR.has(g.tur)) continue;
    const data = {
      gonderenKullaniciId: g.gonderen.id,
      gonderenAdSoyad: g.gonderen.adSoyad ?? null,
      tur: g.tur as 'hata' | 'oneri' | 'mesaj',
      sayfa: g.sayfa ?? null,
      mesaj: g.mesaj,
      okundu: !!g.okundu,
      cevap: g.cevap ?? null,
      cevapTarihi: parseDate(g.cevapTarihi),
      tarih: safeParseDate(g.tarih),
    };
    if (writeAllowed) {
      await prisma.geriBildirim.upsert({
        where: { id: g.id },
        update: data,
        create: { id: g.id, ...data },
      });
    }
    stats.geriBildirimler++;
  }
  console.log(`  ✓ GeriBildirim: ${stats.geriBildirimler}`);

  // 11) AUDIT LOG — son 5000 girdi
  const auditEntries = (raw.auditLog ?? []).slice(-5000);
  if (writeAllowed && auditEntries.length > 0) {
    await prisma.auditLog.createMany({
      data: auditEntries.map((a) => ({
        zaman: safeParseDate(a.zaman),
        eylem: a.eylem,
        kullaniciId: a.kullaniciId ?? null,
        kullaniciAdi: a.kullaniciAdi ?? null,
        firmaId: a.firmaId ?? null,
        detay: jsonOrNull(a.detay),
      })),
      skipDuplicates: true,
    });
  }
  stats.auditLog = auditEntries.length;
  console.log(`  ✓ AuditLog: ${stats.auditLog}`);

  console.log('');
  console.log('▶ Migration özeti:');
  console.log(JSON.stringify(stats, null, 2));
  if (opts.dryRun) console.log('(dry-run — DB değişmedi)');
  console.log('✓ Tamamlandı');
}

migrate()
  .catch((err) => {
    console.error('✖ Migration başarısız:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
