-- Mehmet abi direktifi (2026-06-16) — Mustafa Ekiz geri bildirimi:
-- "Teklifi hazırlayanın kendi telefonu da teklifte görünsün."
-- teklifler tablosuna hazirlayanTelefon (snapshot) alanı ekle.
-- Nullable / additive — mevcut kayıtları bozmaz, tamamen geri uyumlu.

ALTER TABLE "teklifler" ADD COLUMN "hazirlayanTelefon" TEXT;
