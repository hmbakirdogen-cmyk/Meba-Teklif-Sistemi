-- Faz 14b — Mehmet Bey direktifi (2026-05-26):
-- "Herkese Bey veya Hanım hitabeti her yerde kullanılmalı."
-- Kullanici tablosuna `unvanCinsiyet` alanı ekle ('Bey' | 'Hanım').
-- Default 'Bey' fallback frontend tarafında (geri uyumlu); SQL NULL kabul.

ALTER TABLE "Kullanici" ADD COLUMN "unvanCinsiyet" TEXT;
