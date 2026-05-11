-- AlterTable
ALTER TABLE "kullanicilar" ADD COLUMN     "smtpFromAddress" TEXT,
ADD COLUMN     "smtpFromName" TEXT,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPasswordEncrypted" TEXT,
ADD COLUMN     "smtpPort" INTEGER,
ADD COLUMN     "smtpSecure" BOOLEAN DEFAULT true,
ADD COLUMN     "smtpUser" TEXT;
