CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE INDEX IF NOT EXISTS urunler_urunKod_trgm_idx
ON "urunler" USING gin ("urunKod" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS urunler_aciklama_trgm_idx
ON "urunler" USING gin (aciklama gin_trgm_ops);

CREATE INDEX IF NOT EXISTS urunler_marka_trgm_idx
ON "urunler" USING gin (marka gin_trgm_ops);