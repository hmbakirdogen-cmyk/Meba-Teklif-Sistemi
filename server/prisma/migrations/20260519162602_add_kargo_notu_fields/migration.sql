-- DropIndex
DROP INDEX "urunler_aciklama_trgm_idx";

-- DropIndex
DROP INDEX "urunler_marka_trgm_idx";

-- DropIndex
DROP INDEX "urunler_urunkod_trgm_idx";

-- AlterTable
ALTER TABLE "teklifler" ADD COLUMN     "kargoNotuGizli" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kargoNotuMetni" TEXT;
