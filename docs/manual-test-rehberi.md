# Manuel Smoke Test Rehberi

Her büyük değişiklikten (özellikle `temizlik-faz-1` gibi mimari refactor'lardan)
sonra bu adımları sırayla geç. Build/lint kod düzeyinde doğrulama yapar; bu
rehber **kullanıcı akışlarını** doğrular.

## 1. Build & Lint

```bash
npm run build      # tsc -b && vite build → "✓ built in Xs"
npm run lint       # 8 pre-existing problem (temizlik PR'ı bunları artırmadı)
```

`npm run build` hatasız tamamlanmalı. Lint hata sayısı artmamalı.

## 2. Boot

- `BASLAT.bat` (veya `node launcher.cjs`)
- Konsolda `[launcher] Backend hazır.` + `Frontend: http://localhost:5173`
- Tarayıcı otomatik açılır → login ekranı görünür

## 3. Login

- Süper admin (Mehmet Bakırdöğen) ile giriş yap
- Header'da yeşil **"Bağlı"** chip'i
- Profil fotoğrafı + isim sağ üstte

## 4. Sync mimarisi temizliği doğrulaması

- DevTools → Application → Local Storage:
  - `meba_sync_queue` **YOK**
  - `meba_conflicts` **YOK**
  - `meba_last_snapshot` **YOK**
  - `meba_conflict_local_*` **YOK**
  - `meba_device_id` **YOK** (`gc_device_id` kalır, normal)
  - `mebaCleanup_v1 = "1"` set
- DevTools Network → 60sn timer'dan kaynaklı `/sync/*` istek **YOK**
  (sadece 30 saniyelik `/api/health` probe görmelisin)
- Header chip'e tıkla → popover'da queueLength/conflict count **YOK**, sadece
  "Yeniden Bağlan" butonu

## 5. Teklifler CRUD

- Teklifler sayfası açılır, mevcut kayıtlar listede
- Yeni teklif oluştur → kaydet → liste yenilensin
- Teklifi düzenle, durum değiştir, sonuç gir, revize oluştur
- Server tarafında `db.json`'a yazıldığını doğrula (file mtime değişti)
- Sil → onay → liste güncel

## 6. Cari / Ürün / UrunSeti

- Cari sayfası — yeni cari ekle, düzenle, logo yükle
- Ürün sayfası — bulkReplace (1500+ kayıt) timeout'a uğramamalı
- UrunSeti sayfası — yeni set oluştur, ürün ata

## 7. Multi-tenant (super_admin)

- Header'dan firma değiştir (MEBA → MESA → ELMOS)
- Her firmada teklifler / cariler / ürünler farklı veri seti gösterir
- super_admin tüm firmalara geçebilir; firma_admin sadece kendi firmasında
  kalır

## 8. Offline davranışı (yeni online-only mantık)

- Server'ı kapat (`DURDUR.bat` veya `taskkill /f /im node.exe`)
- ~30 sn içinde header **"Bağlı Değil"** kırmızıya döner
- Bir teklif kaydetmeyi dene → console.error (UI çökmemeli)
- Server'ı tekrar aç → popover'dan "Yeniden Bağlan" → "Bağlı"ya döner

## 9. KUR.bat / BASLAT.bat

- `dist/` varsa: `BASLAT.bat` doğru çalışır
- `dist/` silinirse: HATA + pause + exit (frontend build eksik mesajı)
- Node.js sistem PATH'inde değilse: HATA + nodejs.org link'i

## 10. Email gönderim (escapePowerShellLiteral)

- Bir teklifi onayla → "Müşteriye Gönder" → Outlook taslağı açılmalı
- Konu / alıcı / ek dosya doğru görünmeli (PowerShell literal escape bozulmadı)

## 11. README doğrulaması

- "Senkronizasyon Mimarisi", "Çakışma Çözümü", "Offline Kullanım" bölümleri
  **YOK**
- Mimari diyagramda client kutuları **yok** (sadece tarayıcılar)
- "Online-only" notu üst banner'da var

## 12. Build pipeline (üretim)

- `npm run build:production` (varsa) — bytenode compile dahil çalışmalı
