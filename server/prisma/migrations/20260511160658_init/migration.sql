-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('super_admin', 'firma_admin', 'engineer', 'sales');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('team', 'private');

-- CreateEnum
CREATE TYPE "BildirimTur" AS ENUM ('ilgili_atandi', 'teklif_guncellendi', 'geri_bildirim_cevap');

-- CreateEnum
CREATE TYPE "GeriBildirimTur" AS ENUM ('hata', 'oneri', 'mesaj');

-- CreateEnum
CREATE TYPE "EmailDurum" AS ENUM ('queued', 'sent', 'failed');

-- CreateTable
CREATE TABLE "firmalar" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "kisaAd" TEXT,
    "slogan" TEXT,
    "logoUrl" TEXT,
    "renkBirincil" TEXT,
    "renkVurgu" TEXT,
    "adres" TEXT,
    "vergiDairesi" TEXT,
    "vergiNo" TEXT,
    "telefon" TEXT,
    "eposta" TEXT,
    "web" TEXT,
    "iban" TEXT,
    "pdfKlasorAdi" TEXT,
    "teklifPrefix" TEXT,
    "logoScale" DOUBLE PRECISION,
    "varsayilanlar" JSONB,

    CONSTRAINT "firmalar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kullanicilar" (
    "id" TEXT NOT NULL,
    "kullaniciAdi" TEXT NOT NULL,
    "sifreHash" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "unvan" TEXT,
    "initials" TEXT,
    "rol" "Rol" NOT NULL,
    "firmaId" TEXT,
    "gosterilenFirmalar" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "telefon" TEXT,
    "dahili" TEXT,
    "profilFotoUrl" TEXT,
    "profilFotoYuklemeTarihi" TIMESTAMP(3),
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "sifreDegisikligi" TIMESTAMP(3),
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "olusturanKullaniciId" TEXT,
    "silmeTarihi" TIMESTAMP(3),

    CONSTRAINT "kullanicilar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oturumlar" (
    "token" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "olusturulduAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "beniHatirla" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "ua" TEXT,
    "deviceId" TEXT,

    CONSTRAINT "oturumlar_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "teklifler" (
    "id" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "teklifNo" TEXT,
    "tarih" TEXT,
    "durum" TEXT,
    "status" TEXT,
    "paraBirimi" TEXT,
    "kdvOrani" DOUBLE PRECISION,
    "iskontoOrani" DOUBLE PRECISION,
    "odemeVadesi" TEXT,
    "gecerlilikSuresi" TEXT,
    "dovizKuru" DOUBLE PRECISION,
    "satirBazliParaBirimi" BOOLEAN NOT NULL DEFAULT false,
    "satirBazliIskonto" BOOLEAN NOT NULL DEFAULT false,
    "cariSnapshot" JSONB,
    "contactName" TEXT,
    "contactTitle" TEXT,
    "satirlar" JSONB NOT NULL DEFAULT '[]',
    "araToplam" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toplamIndirim" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "toplamVergi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "genelToplam" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notlar" TEXT,
    "notlarGosterilsin" BOOLEAN NOT NULL DEFAULT true,
    "hazirlayanKullaniciId" TEXT,
    "hazirlayanAdSoyad" TEXT,
    "hazirlayanRol" TEXT,
    "hazirlayanUnvan" TEXT,
    "ilgiliKisiId" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'team',
    "revizyonNo" INTEGER,
    "kaynakTeklifId" TEXT,
    "kokTeklifId" TEXT,
    "sonucTarihi" TIMESTAMP(3),
    "sonucGirenKullaniciId" TEXT,
    "sonucNotu" TEXT,
    "kayipSebebi" TEXT,
    "rakipFirma" TEXT,
    "pdfUrl" TEXT,
    "pdfDosyaAdi" TEXT,
    "pdfOlusturmaTarihi" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT,
    "updatedBy" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teklifler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cariler" (
    "id" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "cariKod" TEXT,
    "firmaAdi" TEXT NOT NULL,
    "yetkiliKisi" TEXT,
    "telefon" TEXT,
    "ePosta" TEXT,
    "adres" TEXT,
    "sehir" TEXT,
    "vergiDairesi" TEXT,
    "vergiNo" TEXT,
    "logoUrl" TEXT,
    "logoYuklemeTarihi" TIMESTAMP(3),
    "kisiler" JSONB,
    "lastContactName" TEXT,
    "lastContactTitle" TEXT,
    "notlar" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT,
    "updatedBy" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cariler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urunler" (
    "id" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "urunKod" TEXT,
    "urunAdi" TEXT NOT NULL,
    "aciklama" TEXT,
    "kategori" TEXT,
    "marka" TEXT,
    "birim" TEXT,
    "varsayilanFiyat" DOUBLE PRECISION,
    "resimUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT,
    "updatedBy" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "urunler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urun_setleri" (
    "id" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "setKod" TEXT,
    "setAdi" TEXT,
    "aciklama" TEXT,
    "kalemler" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT,
    "updatedBy" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "urun_setleri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referanslar" (
    "firmaId" TEXT NOT NULL,
    "markalar" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "birimler" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "teslimSecenekleri" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "odemeVadesiSecenekleri" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kdvOranlari" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gecerlilikSecenekleri" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paraBirimleri" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dovizKuruSecenekleri" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "referanslar_pkey" PRIMARY KEY ("firmaId")
);

-- CreateTable
CREATE TABLE "sayaclar" (
    "firmaId" TEXT NOT NULL,
    "yil" INTEGER NOT NULL,
    "ay" INTEGER NOT NULL,
    "deger" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sayaclar_pkey" PRIMARY KEY ("firmaId")
);

-- CreateTable
CREATE TABLE "bildirimler" (
    "id" TEXT NOT NULL,
    "hedefKullaniciId" TEXT NOT NULL,
    "kaynakKullaniciId" TEXT,
    "kaynakKullaniciAdSoyad" TEXT,
    "tur" "BildirimTur" NOT NULL,
    "teklifId" TEXT,
    "teklifNo" TEXT,
    "cariAdi" TEXT,
    "geriBildirimId" TEXT,
    "ozet" TEXT,
    "okundu" BOOLEAN NOT NULL DEFAULT false,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firmaId" TEXT,

    CONSTRAINT "bildirimler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geri_bildirimler" (
    "id" TEXT NOT NULL,
    "gonderenKullaniciId" TEXT NOT NULL,
    "gonderenAdSoyad" TEXT,
    "tur" "GeriBildirimTur" NOT NULL,
    "sayfa" TEXT,
    "mesaj" TEXT NOT NULL,
    "okundu" BOOLEAN NOT NULL DEFAULT false,
    "cevap" TEXT,
    "cevapTarihi" TIMESTAMP(3),
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geri_bildirimler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "zaman" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eylem" TEXT NOT NULL,
    "kullaniciId" TEXT,
    "kullaniciAdi" TEXT,
    "firmaId" TEXT,
    "detay" JSONB,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_log" (
    "id" SERIAL NOT NULL,
    "teklifId" TEXT,
    "teklifNo" TEXT,
    "aliciEposta" TEXT,
    "gonderen" TEXT,
    "durum" "EmailDurum" NOT NULL,
    "resendId" TEXT,
    "hata" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kullanicilar_kullaniciAdi_key" ON "kullanicilar"("kullaniciAdi");

-- CreateIndex
CREATE INDEX "kullanicilar_firmaId_idx" ON "kullanicilar"("firmaId");

-- CreateIndex
CREATE INDEX "oturumlar_expiresAt_idx" ON "oturumlar"("expiresAt");

-- CreateIndex
CREATE INDEX "oturumlar_kullaniciId_idx" ON "oturumlar"("kullaniciId");

-- CreateIndex
CREATE INDEX "teklifler_firmaId_deletedAt_idx" ON "teklifler"("firmaId", "deletedAt");

-- CreateIndex
CREATE INDEX "teklifler_hazirlayanKullaniciId_idx" ON "teklifler"("hazirlayanKullaniciId");

-- CreateIndex
CREATE INDEX "teklifler_ilgiliKisiId_idx" ON "teklifler"("ilgiliKisiId");

-- CreateIndex
CREATE INDEX "teklifler_teklifNo_idx" ON "teklifler"("teklifNo");

-- CreateIndex
CREATE INDEX "cariler_firmaId_deletedAt_idx" ON "cariler"("firmaId", "deletedAt");

-- CreateIndex
CREATE INDEX "cariler_firmaId_cariKod_idx" ON "cariler"("firmaId", "cariKod");

-- CreateIndex
CREATE INDEX "cariler_firmaId_firmaAdi_idx" ON "cariler"("firmaId", "firmaAdi");

-- CreateIndex
CREATE INDEX "urunler_firmaId_deletedAt_idx" ON "urunler"("firmaId", "deletedAt");

-- CreateIndex
CREATE INDEX "urunler_firmaId_urunKod_idx" ON "urunler"("firmaId", "urunKod");

-- CreateIndex
CREATE INDEX "urun_setleri_firmaId_deletedAt_idx" ON "urun_setleri"("firmaId", "deletedAt");

-- CreateIndex
CREATE INDEX "bildirimler_hedefKullaniciId_tarih_idx" ON "bildirimler"("hedefKullaniciId", "tarih");

-- CreateIndex
CREATE INDEX "bildirimler_okundu_idx" ON "bildirimler"("okundu");

-- CreateIndex
CREATE INDEX "geri_bildirimler_tarih_idx" ON "geri_bildirimler"("tarih");

-- CreateIndex
CREATE INDEX "audit_log_zaman_idx" ON "audit_log"("zaman");

-- CreateIndex
CREATE INDEX "audit_log_kullaniciId_idx" ON "audit_log"("kullaniciId");

-- CreateIndex
CREATE INDEX "email_log_tarih_idx" ON "email_log"("tarih");

-- CreateIndex
CREATE INDEX "email_log_teklifId_idx" ON "email_log"("teklifId");

-- AddForeignKey
ALTER TABLE "kullanicilar" ADD CONSTRAINT "kullanicilar_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firmalar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oturumlar" ADD CONSTRAINT "oturumlar_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teklifler" ADD CONSTRAINT "teklifler_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firmalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cariler" ADD CONSTRAINT "cariler_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firmalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "urunler" ADD CONSTRAINT "urunler_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firmalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "urun_setleri" ADD CONSTRAINT "urun_setleri_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firmalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referanslar" ADD CONSTRAINT "referanslar_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firmalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sayaclar" ADD CONSTRAINT "sayaclar_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firmalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bildirimler" ADD CONSTRAINT "bildirimler_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firmalar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geri_bildirimler" ADD CONSTRAINT "geri_bildirimler_gonderenKullaniciId_fkey" FOREIGN KEY ("gonderenKullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
