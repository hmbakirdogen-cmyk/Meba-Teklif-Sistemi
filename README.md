# MEBA Teklif Sistemi

MEBA Mekanik Ltd. Şti. için geliştirilmiş, **offline-first** ve **yerel ağ
senkronizasyonlu** profesyonel teklif hazırlama ve yönetim sistemi.

- React 19 + Vite + TypeScript + Ant Design 6 (frontend)
- Node.js (saf — Express yok) HTTP API + JSON dosya tabanlı DB (backend)
- USB ile taşınabilir, masaüstü kısayolu ile başlatılabilir
- Ana bilgisayar açıkken LAN üzerinden otomatik senkron

---

## İçindekiler

1. [Hızlı Başlangıç](#hizli-baslangic)
2. [Çok-Bilgisayarlı Kurulum](#cok-bilgisayarli-kurulum)
3. [USB Kurulumu](#usb-kurulumu)
4. [Masaüstü Kısayolu](#masaustu-kisayolu)
5. [Çalıştırma & Durdurma](#calistirma)
6. [Senkronizasyon Mimarisi](#senkronizasyon)
7. [Çakışma Çözümü](#cakisma)
8. [Offline Kullanım](#offline)
9. [Yetki Sistemi](#yetki)
10. [Güncelleme](#guncelleme)
11. [Yedekleme](#yedekleme)
12. [Mimari Diyagram](#mimari)
13. [Sorun Giderme](#sorun)

---

## <a id="hizli-baslangic"></a>1. Hızlı Başlangıç (Tek Bilgisayar)

```bash
git clone https://github.com/hmbakirdogen-cmyk/Meba-Teklif-Sistemi.git
cd Meba-Teklif-Sistemi
npm install
npm run build
node launcher.cjs
```

`launcher.cjs` backend'i (3001) ve frontend'i (5173) başlatır, tarayıcıyı açar.

Geliştirme modunda canlı yeniden yükleme için:
```bash
npm run start  # API + Vite dev server, paralel
```

---

## <a id="cok-bilgisayarli-kurulum"></a>2. Çok-Bilgisayarlı Kurulum (Server + Client'lar)

### Ana bilgisayar (Server)

```bash
cd C:\MEBA\Meba-Teklif-Sistemi
copy config\server-config.template.json config\server-config.json
firewall-allow.bat   # yönetici olarak — 3001/5173/4173 portlarını aç
node launcher.cjs
```

Sunucu kurulu makinenin IP'si (örn. `192.168.1.54`) tüm istemcilerde
`client-config.json`'a yazılır.

### İstemci PC'ler (Client)

USB üzerinden **MEBA-KUR.bat** çalıştırılır → C:\MEBA içine kurulur,
masaüstü kısayolu oluşur, server IP girilir.

Detay → [USB Kurulumu](#usb-kurulumu).

---

## <a id="usb-kurulumu"></a>3. USB Kurulumu (Adım Adım)

USB belleğe **tüm proje + node_modules + dist + Node.js binary'si** kopyalanır.
Şu klasörler zorunlu:

- `server/` — backend kodu + `db.json` (server modunda canlı, client'ta lokal kopya)
- `dist/` — production frontend build'i (önceden `npm run build` ile üretilmeli)
- `node_modules/` — bağımlılıklar (USB'de hazır → hedef PC'de internet/install gerekmez)
- **`bin/node.exe`** — Node.js binary'si (~87 MB; hedef PC'de Node.js kurulumu gerekmesin diye)
- `config/` — `*.template.json` şablonları (KUR.bat runtime config'leri üretir)
- `launcher.cjs`, `launcher/` — başlatıcı modülleri
- `MEBA-*.bat` — Windows başlatma/durdurma scriptleri
- `assets/icon/meba-premium.ico` — masaüstü kısayolu için

### `bin/node.exe`'yi USB'ye eklemek (server PC'de bir kerelik)

Git repo'da `bin/` ignore'lu (87 MB binary GitHub'a push edilmez). USB
hazırlarken manuel kopyalanır:

```powershell
# Server PC'de, Node.js kurulu olduğu varsayılır
mkdir C:\MEBA-USB-HAZIRLIK\bin
copy "C:\Program Files\nodejs\node.exe" "C:\MEBA-USB-HAZIRLIK\bin\node.exe"
```

Veya hazır kurulumdan: `C:\MEBA\Meba-Teklif-Sistemi\bin\node.exe` zaten var
ise USB'ye doğrudan klasörüyle birlikte sürükle-bırak.

`MEBA-BASLAT.bat` öncelikle `bin\node.exe`'yi kullanır; yoksa sistem PATH'ine
düşer (Node.js elle kurulmuşsa). İkisi de yoksa anlaşılır hata mesajı verir.

### Adımlar

1. USB'yi hedef PC'ye tak.
2. `USB:\MEBA-KUR.bat`'a **sağ-tık → Yönetici olarak çalıştır**.
3. Mod seç:
   - **1 = SERVER** — bu PC ana bilgisayar olacak
   - **2 = CLIENT** — bu PC istemci (server IP'si sorulur)
4. Kurulum bitince masaüstünde "MEBA Teklif Sistemi" kısayolu oluşur.

KUR.bat ne yapar?
- `xcopy` ile `C:\MEBA\Meba-Teklif-Sistemi`'ye kopyalar
- `config/*.template.json`'dan runtime config üretir + UUID `deviceId` ekler
- PowerShell `WScript.Shell.CreateShortcut` ile masaüstü kısayolu oluşturur
- Server modunda `firewall-allow.bat`'ı tetikler

---

## <a id="masaustu-kisayolu"></a>4. Masaüstü Kısayolu

`MEBA-KUR.bat` otomatik oluşturur. Manuel olarak yeniden oluşturmak için:

```powershell
$ws = New-Object -ComObject WScript.Shell
$sh = $ws.CreateShortcut("$env:USERPROFILE\Desktop\MEBA Teklif Sistemi.lnk")
$sh.TargetPath = "C:\MEBA\Meba-Teklif-Sistemi\MEBA-BASLAT.bat"
$sh.WorkingDirectory = "C:\MEBA\Meba-Teklif-Sistemi"
$sh.IconLocation = "C:\MEBA\Meba-Teklif-Sistemi\assets\icon\meba-premium.ico"
$sh.WindowStyle = 7
$sh.Save()
```

---

## <a id="calistirma"></a>5. Çalıştırma & Durdurma

| Script | İşlev |
|---|---|
| **MEBA-BASLAT.bat** | Tek başlatıcı. PID lock kontrolü → backend + static frontend → tarayıcı otomatik açılır |
| **MEBA-DURDUR.bat** | `.meba-running.pid`'den PID okur, `taskkill /T /F` ile kapatır |
| **MEBA-GUNCELLE.bat** | Git repo varsa `git pull --rebase --autostash` + `npm install` + `npm run build` |
| **MEBA-SENKRONIZE.bat** | Manuel sync tetik (sadece bilgi/health kontrol; gerçek sync UI'daki "Şimdi Senkronize Et" butonu) |
| **firewall-allow.bat** | (Yönetici) Windows firewall'da 3001/5173/4173 inbound aç |

`MEBA-BASLAT.bat` zaten açıksa ikinci tıklamada port çakışması yapmaz —
mevcut tarayıcıyı yeniden açar (single-instance lock).

---

## <a id="senkronizasyon"></a>6. Senkronizasyon Mimarisi

### Otomatik (her 5 dakika)
- Frontend `App.tsx` `setInterval(syncEngine.syncNow, 5min)` ile pull + push
- Sayfa görünür durumdayken çalışır

### Manuel
- Header'daki **Sync chip**'e tıkla → "Şimdi Senkronize Et"
- Veya `MEBA-SENKRONIZE.bat` (CLI)

### Veri akışı

```
Client.upsertTeklif(t)
   ↓ optimistic
DataStore (cache güncel)
   ↓
api.teklifler.upsert(t)  ──── network OK ──── server bumpRecord → version+1
   ↓                                                       ↓
   ↓ network fail                              writeDB (file lock)
syncEngine.enqueue
   ↓
localStorage.meba_sync_queue
   ↓ 5dk sonra otomatik
syncEngine.pushOnce()
   ↓
api.sync.push() → server version-vector check
                 ├ accepted → queue'dan sil
                 └ conflict → meba_conflicts'e taşı
```

### Sync alanları (her record'da)

```ts
version?: number;       // backend'de PUT'ta +1
deletedAt?: string;     // soft delete (UI'dan gizli, sync'te tombstone)
deviceId?: string;      // son yazan cihaz
updatedBy?: string;     // son güncelleyen kullanıcı id
lastSyncedAt?: string;  // pull/push başarılı olduğunda
```

---

## <a id="cakisma"></a>7. Çakışma Çözümü

İki kullanıcı aynı teklifi aynı anda düzenlerse, **ikincinin push'u** server
tarafından `version_conflict` ile reddedilir. Detay:

1. Yerel kayıt `meba_conflicts` localStorage'ına taşınır.
2. Header'daki Sync chip turuncuya döner ve **Çakışma sayısı** badge'i görünür.
3. **Sadece admin** rolünden kullanıcı popover'dan "Çakışmaları Görüntüle" görür.
4. Modal: server vs yerel JSON yan yana. 3 seçim:
   - **Server'ı Kabul Et** — yerel değişiklik silinir
   - **Benimkini Zorla Gönder** — version'ı server+1'e set eder, force push
   - **Manuel Düzenle** — JSON textarea ile özel kayıt

---

## <a id="offline"></a>8. Offline Kullanım

Server erişilemediğinde:

- App init `localStorage.meba_last_snapshot`'tan veriyi yükler
- Sync chip "Çevrimdışı" olur
- Yeni kayıt/değişiklik queue'ya yazılır
- TeklifListesi kartlarında "Senkron Bekliyor" rozeti gösterilir
- Server tekrar erişilebildiğinde otomatik queue boşalır

Snapshot formatı: `{ teklifler, cariler, urunler, urunSetleri, referans, sayac }`
— her başarılı sync'te güncellenir.

---

## <a id="yetki"></a>9. Yetki Sistemi

3 rol (`src/types/kullanici.ts`):

- **admin** — tüm teklifleri görür, çakışmaları çözer, sync/full restore çağırabilir
- **engineer** — kendi teklifleri + `visibility='team'` olanlar
- **sales** — engineer ile aynı

**Defense in depth:** Backend `GET /api/sync/pull` zorunlu visibility filter
uygular. Frontend `syncEngine` server'dan gelen veriyi tekrar filtreler — server
kötü davransa bile sales rolü engineer'in private teklifini görmez.

`visibility` toggle KumandaPaneli'nden yapılır:
- **team** (default) — tüm ekip görür
- **private** — sadece hazırlayan + admin

---

## <a id="guncelleme"></a>10. Güncelleme

```bash
MEBA-GUNCELLE.bat
```

Git deposundan kurulu sistemler için: `git pull --rebase --autostash`,
`npm install`, `npm run build`.

USB'den kurulu sistemlerde: yeni USB ile `MEBA-KUR.bat` üzerine kurun (config'ler
korunur — sadece yeni dosyalar üzerine yazılır).

---

## <a id="yedekleme"></a>11. Yedekleme

**Server makinesinde** kritik dosyalar:
- `server/db.json` — tüm teklifler, cariler, ürünler
- `config/server-config.json` — deviceId, port ayarları
- `server/email_dispatch.log`, `server/sync_telemetry.log` — telemetri

```powershell
# Windows Görev Zamanlayıcı ile günlük backup
$src = "C:\MEBA\Meba-Teklif-Sistemi\server\db.json"
$dst = "D:\backup\meba\db_$(Get-Date -Format yyyy-MM-dd).json"
Copy-Item $src $dst
```

Restore için: server'ı durdur, `db.json`'ı eski yedekle değiştir, server'ı başlat.

Veya admin UI'dan `POST /api/sync/full` ile yeni DB push edilebilir
(yalnızca server makinesinden, `isSameMachineClient` korumalı).

---

## Modül sistemi (ESM frontend, CJS backend)

Proje **karışık modül sistemi** kullanır — bu **kasıtlıdır**:

| Konum | Modül sistemi | Uzantı | Sebep |
|---|---|---|---|
| `src/**/*.ts(x)` | ECMAScript Modules (ESM) | `.ts` / `.tsx` | Vite ESM ister, `package.json` `"type": "module"` global |
| `server/**/*.cjs` | CommonJS (CJS) | `.cjs` | `.cjs` uzantısı `"type": "module"` override eder; bytenode ile derlemede CJS daha stabil |
| `launcher.cjs`, `KUR.bat`/`BASLAT.bat` script'leri | CommonJS | `.cjs` | Aynı sebep — Node native, build-time bağımsız |

**Yeni dosya eklerken:**
- Frontend (React/Vite): `src/` altı, `.ts` / `.tsx` (ESM, `import`/`export`)
- Backend (HTTP server, auth, sync): `server/` altı, `.cjs` (CJS, `require`/`module.exports`)
- Launcher / kurulum scripti: kök ya da `launcher/`, `.cjs`

İki sistem birbirini görmez — frontend backend'i HTTP üzerinden çağırır (`apiClient.ts`).

---

## <a id="mimari"></a>12. Mimari Diyagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER PC (Office)                         │
│                                                                  │
│  ┌────────────────────┐       ┌──────────────────────────────┐  │
│  │  launcher.cjs      │       │  server.cjs (port 3001)      │  │
│  │   ├ pidLock        │──────▶│   ├ /api/teklifler           │  │
│  │   ├ spawnChildren  │       │   ├ /api/sync/pull (filter)  │  │
│  │   ├ staticServer   │       │   ├ /api/sync/push (version) │  │
│  │   └ openBrowser    │       │   └ db.json (file lock)      │  │
│  └────────────────────┘       └──────────────────────────────┘  │
│         │                                                        │
│         ▼ http://localhost:5173                                  │
│  ┌─────────────────────────┐                                    │
│  │  React UI (dist/)       │                                    │
│  │   ├ AppLayout            │                                   │
│  │   ├ SyncStatusBar        │                                   │
│  │   └ syncEngine.ts        │                                   │
│  └─────────────────────────┘                                    │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ LAN (192.168.x.x:3001/api/sync/*)
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
  ┌─────────┐                ┌─────────┐                 ┌─────────┐
  │ CLIENT  │                │ CLIENT  │                 │ CLIENT  │
  │ (USB)   │                │ (USB)   │                 │ (USB)   │
  │ Lokal   │                │ Lokal   │                 │ Lokal   │
  │ db.json │                │ db.json │                 │ db.json │
  │ +       │                │ +       │                 │ +       │
  │snapshot │                │snapshot │                 │snapshot │
  └─────────┘                └─────────┘                 └─────────┘
       Offline-capable, 5dk'da bir sync, conflict aware
```

---

## <a id="sorun"></a>13. Sorun Giderme

### "Backend health check timeout"
- Backend port (3001) zaten kullanımda. `MEBA-DURDUR.bat` → tekrar başlat.
- Veya `netstat -ano | findstr :3001` ile zombie process'i bul, kapat.

### "Server bulunamadı" (client)
- `config/client-config.json` → `serverHost` IP'si doğru mu?
- Ana bilgisayar açık mı? `ping <IP>` ile test.
- Firewall ana bilgisayarda 3001 portunu açıyor mu? `firewall-allow.bat` (yönetici).

### "Senkron Bekliyor" rozetleri kaldırılmıyor
- Header'daki Sync chip "Çevrimdışı" mı? Server kapalı.
- "Bağlı" ama hala bekliyor → **Çakışma** olabilir, admin'e başvur.
- localStorage temizleme (son çare): F12 → `localStorage.removeItem('meba_sync_queue')`.

### Çakışmalar birikiyor
- Admin **Çakışmaları Görüntüle** ile temizle (her seferinde tek tek karar ver).

### Tarayıcı otomatik açılmıyor
- `config/server-config.json` → `autoOpenBrowser: false` mı?
- Manual: `http://localhost:5173`'e git.

### Build hatası
- `node_modules` eksik veya bozuk: `rm -rf node_modules && npm install`.
- TypeScript hatası: `npx tsc --noEmit` ile detayı gör.

---

## Lisans

Şirket içi kullanım — MEBA Mekanik Ltd. Şti.

## Geliştirici

Mehmet Bakırdöğen
