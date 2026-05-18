# Ürün Arama Altyapısı Mevcut Durum Analizi ve Uygulama Planı

## Summary

Keşif özeti: teklif satırı ürün seçimi şu an tamamen istemci tarafında çalışıyor; `InlineSatirEditor` ve `PaginatedBelgeInlineEditor` ürünleri `urunService.tumUrunleriGetir()` ile belleğe alıp `Array.filter(...includes(...))` ile arıyor. Backend'de ürünler için sadece genel liste CRUD endpoint'i var; özel bir arama endpoint'i, full text arama veya trigram tabanlı sorgu yok.

Plan özeti:
- PostgreSQL'e `pg_trgm` ve `unaccent` eklenecek.
- `urunler` tablosunda `urunKod`, `aciklama`, `marka` kolonlarına trigram GIN index eklenecek.
- Yeni endpoint: `GET /api/urun/search?q=...&limit=...`.
- Frontend'de istemci filtreleme yapan ürün seçiciler server-side aramaya geçirilecek.
- Migration `server/prisma/migrations/<timestamp>_urun_search_trgm/` altında oluşturulacak.
- Geri dönüş için yeni endpoint ve indexler feature-flag/geri alınabilir migration ile izole tutulacak.

## 1) Mevcut durum analizi

### Frontend ürün seçim / arama akışı

- Satır hücre tıklamaları ürün kodu ve açıklama editörünü tetikliyor:
  - `src/components/SatirRow.tsx:180`
  - `src/components/SatirRow.tsx:181`
  - `src/components/SatirRow.tsx:199`
  - `src/components/SatirRow.tsx:200`

- Inline editörde ürün arama tamamen client-side:
  - `src/components/InlineSatirEditor.tsx:111` → `UrunKodEditor`
  - `src/components/InlineSatirEditor.tsx:114` → `urunService.tumUrunleriGetir()`
  - `src/components/InlineSatirEditor.tsx:133` → `const filtered = useMemo(...)`
  - `src/components/InlineSatirEditor.tsx:136` → `urunler.filter((u) => ...)`
  - `src/components/InlineSatirEditor.tsx:153` → `setler.filter((s) => ...)`

- Popup editörde de aynı şekilde client-side filtreleme var:
  - `src/components/PaginatedBelgeInlineEditor.tsx:691` → `UrunKodPopupBody`
  - `src/components/PaginatedBelgeInlineEditor.tsx:704` → `urunService.tumUrunleriGetir()`
  - `src/components/PaginatedBelgeInlineEditor.tsx:718` → `const filteredUrun = (q ...`
  - `src/components/PaginatedBelgeInlineEditor.tsx:719` → `urunler.filter((u) => ...)`
  - `src/components/PaginatedBelgeInlineEditor.tsx:724` → `const filteredSet = (q ...`
  - `src/components/PaginatedBelgeInlineEditor.tsx:725` → `setler.filter((s) => ...)`
  - `src/components/PaginatedBelgeInlineEditor.tsx:730` → ürün + set merge
  - `src/components/PaginatedBelgeInlineEditor.tsx:854` → arama input placeholder

- Veri kaynağı servis katmanında da lokal dataStore üzerinden okunuyor:
  - `src/services/urunService.ts:35` → `tumUrunleriGetir`
  - `src/services/urunService.ts:36` → `dataStore.getUrunler()`
  - `src/services/urunService.ts:40` → `urunKaydet`
  - `src/services/urunService.ts:41` → `dataStore.upsertUrun(urun)`

### Şu an client mı server mı arıyor?

Sonuç: **mevcut ürün seçim akışı client-side arıyor.**

Kanıt:
- Bileşenler ürün listesini topluca çekiyor (`tumUrunleriGetir`) ve bellekte `filter + includes` ile arıyor.
- Herhangi bir `/api/urun/search`, `/api/urunler/search` veya özel arama handler'ı bulunmadı.
- Mevcut backend ürün route'u sadece generic CRUD list/upsert/delete sağlıyor.

### Backend ürün endpoint’leri

- Router mount:
  - `server/app/index.ts:89` → `app.use('/api/urunler', urunlerRouter);`

- Ürün route tanımları:
  - `server/routes/urunler.routes.ts:7` → `const crud = makeCrud('urun');`
  - `server/routes/urunler.routes.ts:9` → `GET /api/urunler/`
  - `server/routes/urunler.routes.ts:10` → `PUT /api/urunler/`
  - `server/routes/urunler.routes.ts:11` → `PUT /api/urunler/:id`
  - `server/routes/urunler.routes.ts:12` → `DELETE /api/urunler/:id`

- Generic list sorgusu:
  - `server/lib/crudFactory.ts:57` → `const where: Prisma.JsonObject = { deletedAt: null };`
  - `server/lib/crudFactory.ts:63` → `where.firmaId = firmaIdHeader;`
  - `server/lib/crudFactory.ts:78` → `const rows = await model.findMany({ where });`

Yani mevcut server tarafı ürün endpoint'i arama yapmıyor; yalnızca firma scope + `deletedAt = null` ile tüm kayıtları listeliyor.

### Prisma `Urun` modeli alanları

Kaynak: `server/prisma/schema.prisma:271-296`

- `id`
- `firmaId`
- `urunKod`
- `urunAdi`
- `aciklama`
- `kategori`
- `marka`
- `birim`
- `varsayilanFiyat`
- `resimUrl`
- `version`
- `deviceId`
- `updatedBy`
- `lastSyncedAt`
- `deletedAt`
- `olusturmaTarihi`
- `guncellemeTarihi`

İlgili satır referansları:
- `server/prisma/schema.prisma:271`
- `server/prisma/schema.prisma:272`
- `server/prisma/schema.prisma:273`
- `server/prisma/schema.prisma:274`
- `server/prisma/schema.prisma:275`
- `server/prisma/schema.prisma:276`
- `server/prisma/schema.prisma:277`
- `server/prisma/schema.prisma:278`
- `server/prisma/schema.prisma:279`
- `server/prisma/schema.prisma:280`
- `server/prisma/schema.prisma:281`
- `server/prisma/schema.prisma:284`
- `server/prisma/schema.prisma:285`
- `server/prisma/schema.prisma:286`
- `server/prisma/schema.prisma:287`
- `server/prisma/schema.prisma:288`
- `server/prisma/schema.prisma:290`
- `server/prisma/schema.prisma:291`
- `server/prisma/schema.prisma:295`
- `server/prisma/schema.prisma:296`

### Mevcut index’ler

Migration kaynağı:
- `server/prisma/migrations/20260511160658_init/migration.sql:164`
- `server/prisma/migrations/20260511160658_init/migration.sql:327`
- `server/prisma/migrations/20260511160658_init/migration.sql:330`

Veritabanı `\d+ urunler` çıktısına göre mevcut index’ler:
- `urunler_pkey` → `PRIMARY KEY (id)`
- `urunler_firmaId_deletedAt_idx` → `btree (firmaId, deletedAt)`
- `urunler_firmaId_urunKod_idx` → `btree (firmaId, urunKod)`

Yorum:
- `ILIKE '%...%'` için uygun trigram/GIN index yok.
- `aciklama` ve `marka` üzerinde hiç arama index’i yok.
- `firmaId, urunKod` btree index’i tam eşleşme / prefix senaryolarında yardımcı olabilir, ama `%term%` için yetersiz kalır.

## 2) Performans ölçümü

### Gerçek satır sayısı

SQL:

```sql
SELECT count(*) FROM urunler;
```

Sonuç:
- `45810`

### EXPLAIN ANALYZE sonuçları

#### a) `vana`

SQL:

```sql
EXPLAIN ANALYZE
SELECT *
FROM urunler
WHERE "urunKod" ILIKE '%vana%' OR aciklama ILIKE '%vana%'
LIMIT 20;
```

Özet:
- Plan: `Seq Scan on urunler`
- Planning Time: `4.778 ms`
- Execution Time: `19.879 ms`
- `Rows Removed by Filter: 10927`

#### b) `motor`

SQL:

```sql
EXPLAIN ANALYZE
SELECT *
FROM urunler
WHERE "urunKod" ILIKE '%motor%' OR aciklama ILIKE '%motor%'
LIMIT 20;
```

Özet:
- Plan: `Seq Scan on urunler`
- Planning Time: `1.961 ms`
- Execution Time: `0.419 ms`
- `Rows Removed by Filter: 412`

Not: `motor` araması hızlı görünüyor çünkü eşleşen kayıtlar tablo başına yakın bulunduğundan `LIMIT 20` nedeniyle sequential scan erken durmuş.

#### c) `pompa`

SQL:

```sql
EXPLAIN ANALYZE
SELECT *
FROM urunler
WHERE "urunKod" ILIKE '%pompa%' OR aciklama ILIKE '%pompa%'
LIMIT 20;
```

Özet:
- Plan: `Seq Scan on urunler`
- Planning Time: `2.017 ms`
- Execution Time: `7.208 ms`
- `Rows Removed by Filter: 8258`

### Extension durumu

SQL:

```sql
SELECT extname FROM pg_extension ORDER BY extname;
```

Sonuç:
- `plpgsql`

Durum:
- `pg_trgm`: **yok**
- `unaccent`: **yok**

## 3) Uygulama planı

### PostgreSQL extension’ları

Eklenecek:
- `pg_trgm`
- `unaccent`

Önerilen migration SQL çekirdeği:
- `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- `CREATE EXTENSION IF NOT EXISTS unaccent;`

### Eklenecek index’ler

Prisma schema’daki gerçek kolon adları baz alınarak:
- `urunKod`
- `aciklama`
- `marka`

Öneri:
- `urunKod` için GIN trigram index
- `aciklama` için GIN trigram index
- `marka` için GIN trigram index

Not:
- Firma bazlı filtre korunacağı için sorguda `deletedAt IS NULL` ve `firmaId = ...` koşulları kalmalı.
- Gerekirse ikinci fazda `unaccent(lower(...))` expression index değerlendirilebilir; ilk fazda trigram GIN çoğu ihtiyacı çözer.

Örnek hedef sorgu yaklaşımı:

```sql
SELECT id, "urunKod", "urunAdi", aciklama, marka, birim, "varsayilanFiyat"
FROM urunler
WHERE "deletedAt" IS NULL
  AND "firmaId" = $1
  AND (
    unaccent(coalesce("urunKod", '')) ILIKE unaccent($2)
    OR unaccent(coalesce(aciklama, '')) ILIKE unaccent($2)
    OR unaccent(coalesce(marka, '')) ILIKE unaccent($2)
  )
ORDER BY
  CASE
    WHEN "urunKod" ILIKE $3 THEN 0
    WHEN marka ILIKE $3 THEN 1
    ELSE 2
  END,
  "urunKod" ASC
LIMIT $4;
```

Burada:
- `$2` = `'%term%'`
- `$3` = `'term%'`

### Yeni / güncellenecek backend endpoint imzası

Yeni endpoint:

```text
GET /api/urun/search?q=...&limit=...
```

Önerilen davranış:
- Query params:
  - `q`: zorunlu, min 2 karakter
  - `limit`: opsiyonel, default `20`, max `50`
- Auth + firma scope mevcut `requireAuth` / `x-firma-id` mantığıyla korunur.
- Dönen alanlar minimal tutulur:
  - `id`
  - `urunKod`
  - `urunAdi`
  - `aciklama`
  - `marka`
  - `birim`
  - `varsayilanFiyat`

Alternatifler:
- `/api/urunler/search` mevcut route hiyerarşisine daha uyumlu olabilir.
- Ancak istenen hedef imza `GET /api/urun/search` ise bunu yeni özel route ile eklemek daha temiz olur.

### Frontend tarafında değişmesi gereken dosyalar

Sadece liste:
- `src/components/InlineSatirEditor.tsx`
- `src/components/PaginatedBelgeInlineEditor.tsx`
- `src/components/SatirRow.tsx` (akış tetikleme noktası, gerekirse prop/handler bağlantısı için)
- `src/services/urunService.ts`

Muhtemel ek temas noktaları:
- `src/components/SagPanel.tsx`
- `src/pages/MalzemeHareketleriSayfasi.tsx`
- `src/pages/VeriYonetimiSayfasi.tsx`

Not:
- Ana performans problemi ürün seçim popup/editörlerinde; ilk geçişte bu iki editör önceliklendirilmeli.
- `SatirRow.tsx` muhtemelen doğrudan arama mantığı taşımaz; fakat editör açma zincirinin parçası olduğu için etkilenebilir.

### Migration dosyası nereye konacak?

Prisma migrations klasörü:

```text
server/prisma/migrations/<timestamp>_urun_search_trgm/
```

Örnek:

```text
server/prisma/migrations/20260518xxxxxx_urun_search_trgm/migration.sql
```

### Riskler

- `ILIKE '%...%'` + `OR` kombinasyonu şu an `Seq Scan` üretiyor; veri büyüdükçe gecikme daha da artar.
- `unaccent(...)` kullanımı expression index olmadan index kullanımını engelleyebilir.
- Firma scope unutulursa başka firmaların ürünleri yanlışlıkla dönebilir.
- Frontend’in mevcut “lokalde tüm ürünleri yükle” varsayımı bazı ekranlarda davranış farkı yaratabilir.
- “Yeni ürün olarak kaydet” akışı mevcut local servis varsayımına bağlı; server-side aramaya geçişte bu akış ayrıca uyarlanmalı.

### Geri dönüş planı

- Yeni arama endpoint’i mevcut liste endpoint’inden bağımsız eklensin.
- Frontend’de geçiş kontrollü yapılsın; gerekirse feature flag veya fallback olarak eski lokal filtre kısa süre korunabilsin.
- Migration geri alınırsa:
  - trigram GIN index’ler drop edilir,
  - `pg_trgm` / `unaccent` başka bağımlılık yoksa kaldırılır.
- Herhangi bir sorun halinde ürün arama tekrar mevcut `/api/urunler` toplu liste + client-side filtre modeline dönebilir.

## 4) Sonuç

- 45.8K ürün var.
- Mevcut arama akışı teklif editörlerinde tamamen client-side.
- Backend’de özel ürün arama endpoint’i yok; yalnızca generic listeleme var.
- PostgreSQL’de `pg_trgm` ve `unaccent` kurulu değil.
- `ILIKE '%term%'` sorguları mevcut index setiyle `Seq Scan` yapıyor.
- Sunucu taraflı arama için en uygun ilk adım: yeni özel arama endpoint’i + trigram GIN index + frontend editörlerini bu endpoint’e geçirmek.