# Dev-Only Scriptleri

Bu klasördeki scriptler **sadece geliştirme/demo** ortamında çalıştırılmak içindir.
**Üretim db.json'una karşı asla çalıştırılmamalıdır** — test verisi üretirler ve
mevcut kayıtları zenginleştirirler.

## İçerik

### Demo veri üretimi
- `rastgele-avatar.cjs` — Kullanıcılara rastgele profil fotoğrafı atar
- `rastgele-cari-logo.cjs` — Carilere rastgele SVG logo üretir
- `rastgele-kullanici.cjs` — Türkçe ad/soyad ile rastgele kullanıcı ekler
- `rastgele-teklif.cjs` — Aktif kullanıcılara 3-8 rastgele teklif ekler
- `rastgele-teklif-sonuc.cjs` — Teklif sonuçlarına KPI dağılımı uygular

### Demo hesap (Serkan)
- `serkan-alfa-tum-durumlar.cjs` — ALFA OTOMASYON için 8 farklı durum örneği
- `serkan-teklifleri.cjs` — Serkan kullanıcısına 100 teklif seed eder
- `serkan-tekliflerini-zenginlestir.cjs` — Mevcut tekliflere not/sonuç ekler

### Cari logo bakım scriptleri
- `cari-logo-arama.cjs` — Cari logoları için web araması (one-time)
- `cari-logo-temizle.cjs` — Logoların arka plan/boyut temizliği

### Asset & dev araçları
- `build-app-icon.cjs` — Uygulama ikonu üretir (.ico/.png)
- `capture-splash-gif.cjs` — Splash ekranını GIF'e çevirir (dökümantasyon için)
- `remove-bg.cjs` — Görüntülerden arka plan kaldırma (one-time logo işleri)

### Migration scriptleri
`migrations/` alt klasöründe — bkz. `migrations/README.md`.

## Çalıştırma

```bash
node scripts/dev-only/rastgele-teklif.cjs
```

**UYARI:** Hiçbir script `--prod` koruması içermez. Üretim db.json'una
çalıştırırsanız test verisi karışır ve geri alınamaz.
