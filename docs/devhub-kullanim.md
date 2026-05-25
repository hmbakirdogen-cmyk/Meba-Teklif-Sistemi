# DevHub - Iki Projeyi Karistirmadan Yonetme

Bu rehber, iki farkli projeyi tek ekrandan secip en guncel haliyle localhostta acmak icindir.

## Hedef

- Her projeye tek ve sabit bir key verilir (ornek: `meba`, `saha`).
- Her iki bilgisayarda da ayni key/isim kullanilir.
- `devhub menu` ile proje secilir, kod guncellenir, localhost acilir.

## 1) Tek seferlik kurulum

Repo klasorunde PowerShell acip calistir:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\install-devhub.ps1
```

Bu islem:

- `%USERPROFILE%\bin\devhub.cmd` olusturur
- Masaustu kisayolu olusturur
- Baslat menusu kisayolu olusturur

## 2) Projeleri kaydet

Asagidaki ornekleri kendi ikinci projenle doldur:

```powershell
devhub add -Key meba -Name "MEBA Teklif Sistemi" -RepoUrl "https://github.com/hmbakirdogen-cmyk/Meba-Teklif-Sistemi.git" -LocalPath "C:\Users\user\Desktop\Meba-Teklif-Sistemi" -Branch "feature/eposta-composer-onyx-tema" -StartCommand "npm run dev" -Url "http://localhost:5173/" -Ports "3001,5173"

devhub add -Key ikinci-proje -Name "Ikinci Proje" -RepoUrl "https://github.com/ORG/REPO.git" -LocalPath "C:\Users\user\Desktop\Ikinci-Proje" -Branch "main" -StartCommand "npm run dev" -Url "http://localhost:5175/" -Ports "3002,5175"
```

Not: Ikinci projede farkli port kullanmak karisiklik riskini ciddi azaltir.

Bu calismada kullanilan sabit 3 proje anahtari:

```powershell
devhub add -Key teklif-motoru -Name "Teklif Motoru" -RepoUrl "https://github.com/hmbakirdogen-cmyk/Meba-Teklif-Sistemi.git" -LocalPath "C:\Users\user\Desktop\Projects\Teklif-Motoru" -Branch "feature/eposta-composer-onyx-tema" -StartCommand "npm run dev" -Url "http://localhost:5173/" -Ports "3001,5173"

devhub add -Key komuta-merkezi -Name "Komuta Merkezi" -RepoUrl "https://github.com/hmbakirdogen-cmyk/meba-komuta-portal.git" -LocalPath "C:\Users\user\Desktop\Projects\Meba-Komuta-Portal" -Branch "main" -StartCommand "npm run dev" -Url "http://localhost:5173/" -Ports "5173,3000"

devhub add -Key ciftlik-yonetimi -Name "Ciftlik Yonetimi" -RepoUrl "https://github.com/hmbakirdogen-cmyk/asrin-projesi.git" -LocalPath "C:\Users\user\Desktop\Projects\Asrin-Projesi" -Branch "main" -StartCommand "cmd /c BASLAT.bat" -Url "http://localhost:3001/" -Ports "3001,5173"
```

## 3) Gunluk kullanim

- Liste: `devhub list`
- Secip ac: `devhub menu`
- Direkt ac: `devhub launch -Key teklif-motoru`

Launch adimlari otomatik:

1. Gerekirse repo klonlar.
2. `git fetch` + `git pull --rebase --autostash` ile gunceller.
3. `npm install` calistirir.
4. Tanimli portlari temizler.
5. `startCommand` ile projeyi baslatir.
6. Tarayicida `Url` acilir.

## 4) Isim standardi onerisi

Her yerde ayni adi kullan:

- Kisa key: `teklif-motoru`, `komuta-merkezi`, `ciftlik-yonetimi`
- Gorunen ad: `Teklif Motoru`, `Komuta Merkezi`, `Ciftlik Yonetimi`
- Repo adlari: mevcut GitHub adlari (istersen sonraki adimda birlikte yeniden adlandiririz)
- Lokal klasor: `C:\Users\user\Desktop\Projects\Teklif-Motoru`, `C:\Users\user\Desktop\Projects\Komuta-Merkezi`, `C:\Users\user\Desktop\Projects\Ciftlik-Yonetimi`

## 5) Ayni duzeni diger bilgisayara tasima

- Diger PC'de de `install-devhub.ps1` calistir.
- Ayni `devhub add` komutlarini aynen gir.
- Boylece iki bilgisayarda da ayni key/isim/port duzeni korunur.

Alternatif (tek komutla otomatik kayit):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\bootstrap-devhub-projects.ps1
```

Bu komut 3 projeyi standart key/ad ile yeniden yazar.

## 6) Canli ortami etkilememe kurali

- Gunluk gelistirme icin `Branch` alanina `main` yerine feature branch yaz.
- Canliya etki eden adim merge + main push oldugu icin, feature branchte guvendesin.
