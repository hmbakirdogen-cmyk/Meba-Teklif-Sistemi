# Grup Şirketleri Teklif Sistemi (MEBA · MESA · ELMOS)

> **Online-only mimari.** Tüm kullanıcılar merkezi server'a tarayıcıdan bağlanır.
> Sync engine ve offline mod **kaldırılmıştır** — tek server, çok kullanıcı,
> tarayıcıdan erişim.

3 grup şirketinin (MEBA Mekanik, MESA Otomasyon, ELMOS Elektrik) ortak teklif
hazırlama ve yönetim platformu.

- React 19 + Vite + TypeScript + Ant Design 6 (frontend)
- Node.js (saf — Express yok) HTTP API + JSON dosya tabanlı DB (backend)
- Tek server kurulumu — kullanıcılar tarayıcıdan `http://server-ip:5173` ile bağlanır
- Multi-tenant: her firmanın kendi cari, ürün, teklif veri seti

---

## İçindekiler

1. [Hızlı Başlangıç](#hizli-baslangic)
2. [Server Kurulumu](#server-kurulumu)
3. [Masaüstü Kısayolu](#masaustu-kisayolu)
4. [Çalıştırma & Durdurma](#calistirma)
5. [Yetki Sistemi](#yetki)
6. [Güncelleme](#guncelleme)
7. [Yedekleme](#yedekleme)
8. [Mimari Diyagram](#mimari)
9. [Sorun Giderme](#sorun)

---

## <a id="hizli-baslangic"></a>1. Hızlı Başlangıç (Tek Bilgisayar / Geliştirme)

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

## <a id="server-kurulumu"></a>2. Server Kurulumu (Üretim)

Sistem **online-only**: sadece **bir bilgisayar**a (ofiste sürekli açık duracak
ana sunucu) kurulur. Diğer kullanıcılar ek kurulum yapmaz, kendi
tarayıcılarından bağlanır.

### Adımlar

1. **Node.js LTS** kur — https://nodejs.org/ (server PC'sinde bir kerelik)
2. USB'yi server PC'ye tak.
3. `USB:\KUR.bat`'a **sağ-tık → Yönetici olarak çalıştır**.
4. Kurulum bitince masaüstünde "Teklif Sistemi" kısayolu oluşur.
5. `firewall-allow.bat` (yönetici) ile 3001/5173 portlarını LAN'a aç.
6. Diğer kullanıcılar kendi PC'lerinde tarayıcı açıp `http://<server-ip>:5173`
   adresine gider — kurulum yapmaz.

### KUR.bat ne yapar?

- `xcopy` ile `C:\GroupCompanies\TeklifSistemi`'ne kopyalar
- `config/server-config.template.json`'dan runtime config üretir + UUID
  `deviceId` ekler
- PowerShell `WScript.Shell.CreateShortcut` ile masaüstü kısayolu oluşturur

### Server PC'nin IP'sini bulma

```powershell
ipconfig | findstr IPv4
```

Bu IP'yi kullanıcılara duyur (`http://192.168.X.Y:5173`).

---

## <a id="masaustu-kisayolu"></a>3. Masaüstü Kısayolu

`KUR.bat` otomatik oluşturur. Manuel olarak yeniden oluşturmak için:

```powershell
$ws = New-Object -ComObject WScript.Shell
$sh = $ws.CreateShortcut("$env:USERPROFILE\Desktop\Teklif Sistemi.lnk")
$sh.TargetPath = "C:\GroupCompanies\TeklifSistemi\BASLAT.bat"
$sh.WorkingDirectory = "C:\GroupCompanies\TeklifSistemi"
$sh.IconLocation = "C:\GroupCompanies\TeklifSistemi\assets\icon\teklif-sistemi.ico"
$sh.WindowStyle = 7
$sh.Save()
```

---

## <a id="calistirma"></a>4. Çalıştırma & Durdurma

| Script | İşlev |
|---|---|
| **BASLAT.bat** | Tek başlatıcı. PID lock kontrolü → backend + static frontend → tarayıcı otomatik açılır. Node.js sistem PATH'inde olmalı. |
| **DURDUR.bat** | `.meba-running.pid`'den PID okur, `taskkill /T /F` ile kapatır |
| **GUNCELLE.bat** | Git repo varsa `git pull --rebase --autostash` + `npm install` + `npm run build` |
| **firewall-allow.bat** | (Yönetici) Windows firewall'da 3001/5173 inbound aç (LAN üzerinden erişim için) |

`BASLAT.bat` zaten açıksa ikinci tıklamada port çakışması yapmaz —
mevcut tarayıcıyı yeniden açar (single-instance lock).

---

## <a id="yetki"></a>5. Yetki Sistemi

Roller (`src/types/kullanici.ts`):

- **super_admin** — sistem sahibi (Mehmet Bakırdöğen). Tüm firmalar arası geçiş,
  her şeyi görür/değiştirir, kullanıcı oluşturur.
- **firma_admin** — bir firmanın yöneticisi (3 ortağa karşılık 3 admin: MEBA,
  MESA, ELMOS). Sadece kendi firmasının verilerini yönetir, kendi firmasında
  kullanıcı oluşturabilir.
- **engineer** — mühendis. Kendi tekliflerini görür + `visibility='team'` olanları
  görür. Cari/ürün ekleyebilir.
- **sales** — satış. engineer ile aynı.
- **admin** — *deprecated*, eski kayıtlar için tip korunuyor; yeni kullanıcı
  bu rolü almaz.

`visibility` toggle KumandaPaneli'nden yapılır:
- **team** (default) — tüm ekip görür
- **private** — sadece hazırlayan + (firma_admin / super_admin)

Backend `/api/teklifler` endpoint'i visibility filter uygular — bu sayede
örneğin sales rolündeki bir kullanıcı engineer'in private teklifini göremez.

---

## <a id="guncelleme"></a>6. Güncelleme

```bash
GUNCELLE.bat
```

Git deposundan kurulu sistemler için: `git pull --rebase --autostash`,
`npm install`, `npm run build`.

USB'den kurulu sistemlerde: yeni USB ile `KUR.bat` üzerine kurun (config'ler
korunur — sadece yeni dosyalar üzerine yazılır).

---

## <a id="yedekleme"></a>7. Yedekleme

**Server makinesinde** kritik dosyalar:
- `server/db.json` — tüm teklifler, cariler, ürünler, kullanıcılar
- `config/server-config.json` — deviceId, port ayarları
- `server/email_dispatch.log` — email gönderim telemetrisi

```powershell
# Windows Görev Zamanlayıcı ile günlük backup
$src = "C:\GroupCompanies\TeklifSistemi\server\db.json"
$dst = "D:\backup\teklif-sistemi\db_$(Get-Date -Format yyyy-MM-dd).json"
Copy-Item $src $dst
```

Restore için: server'ı durdur, `db.json`'ı eski yedekle değiştir, server'ı başlat.

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
- Backend (HTTP server, auth): `server/` altı, `.cjs` (CJS, `require`/`module.exports`)
- Launcher / kurulum scripti: kök ya da `launcher/`, `.cjs`

İki sistem birbirini görmez — frontend backend'i HTTP üzerinden çağırır (`apiClient.ts`).

---

## <a id="mimari"></a>8. Mimari Diyagram

```
┌──────────────────────────────────────────────────────────┐
│                  SERVER PC (Office)                       │
│                                                           │
│  ┌────────────────────┐    ┌──────────────────────────┐  │
│  │  launcher.cjs      │    │  server.cjs (port 3001)  │  │
│  │   ├ pidLock        │───▶│   ├ /api/teklifler       │  │
│  │   ├ spawnBackend   │    │   ├ /api/health          │  │
│  │   ├ staticServer   │    │   └ db.json (file lock)  │  │
│  │   └ openBrowser    │    └──────────────────────────┘  │
│  └────────────────────┘                                   │
│         │                                                 │
│         ▼ http://server-ip:5173                           │
│  ┌─────────────────────────┐                              │
│  │  React UI (dist/)       │                              │
│  │   ├ AppLayout            │                             │
│  │   └ SyncStatusBar (sade) │                             │
│  └─────────────────────────┘                              │
└──────────────────────────────────┬───────────────────────┘
                                   │ LAN (HTTP)
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
   [tarayıcı]                 [tarayıcı]                  [tarayıcı]
   (yönetici)                 (mühendis)                  (satış)

       Online-only — kurulum yok, sadece tarayıcı
```

---

## <a id="sorun"></a>9. Sorun Giderme

### "Backend health check timeout"
- Backend port (3001) zaten kullanımda. `DURDUR.bat` → tekrar başlat.
- Veya `netstat -ano | findstr :3001` ile zombie process'i bul, kapat.

### "Server'a bağlanamıyorum"
- Server PC açık mı? `ping <server-ip>` ile test.
- Firewall server'da 3001/5173 portunu açıyor mu? `firewall-allow.bat` (yönetici).
- URL doğru mu? `http://<server-ip>:5173` (HTTPS değil, port 5173).

### Header'da "Bağlı Değil" kırmızı çıkıyor
- Server tarafında `node launcher.cjs` çalışıyor mu?
- Tarayıcıyı yenile (F5) veya popover'daki "Yeniden Bağlan" butonuna tıkla.

### Tarayıcı otomatik açılmıyor (server'da)
- `config/server-config.json` → `autoOpenBrowser: false` mı?
- Manual: `http://localhost:5173`'e git.

### Build hatası
- `node_modules` eksik veya bozuk: `rm -rf node_modules && npm install`.
- TypeScript hatası: `npx tsc --noEmit` ile detayı gör.

### "BASLAT.bat: Node.js bulunamadi"
- Server PC'sine Node.js LTS kurulu değil. https://nodejs.org/ → kur, PC'yi
  yeniden başlat, tekrar çalıştır.

---

## Lisans

Şirket içi kullanım — MEBA Mekanik · MESA Otomasyon · ELMOS Elektrik.

## Geliştirici

Mehmet Bakırdöğen
