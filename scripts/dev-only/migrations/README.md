# Migration Scriptleri (one-time)

Bu scriptler **bir kerelik** çalıştırılmıştır ve geçmiş referans için saklanır.

## Scriptler

### `migrate-multi-tenant.cjs` (idempotent)
Multi-tenant geçişi için firmalar dizisini ve `firmaId` alanlarını kurar.
- **Idempotent:** Firmalar zaten varsa atlar.
- **Güvenli:** Tekrar çalıştırılabilir.

### `sonuc-durum-migration.cjs` (idempotent)
Eski tek-alanlı durum şemasını yeni iki-alanlı (`durum` + `sonuc`) şemaya geçirir.
- **Idempotent:** Sonuç alanı zaten dolu olan teklifleri atlar.
- **Güvenli:** Tekrar çalıştırılabilir.

### `teklif-cari-degistir.cjs` (DİKKAT: idempotent değil)
Belirli bir teklifin carisini bir başkasıyla değiştirir.
- **Idempotent DEĞİL:** Her çalıştırmada hardcoded ID'leri etkiler.
- **Sadece dev/test:** Üretimde kullanma.

## Yeni proje kurulumu

Yeni bir kurulumda bu scriptleri çalıştırmaya **gerek yok** — şu anki `db.json`
zaten güncel şemada.
