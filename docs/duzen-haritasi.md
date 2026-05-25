# MEBA Dijital Duzen Haritasi

Son kontrol: 2026-05-25

## Ana isimler

| Alan | Standart isim | Amac |
| --- | --- | --- |
| GitHub repo | `Meba-Teklif-Sistemi` | Kaynak kodun tek dogru yeri |
| Yerel kod klasoru | `C:\Users\user\Desktop\Meba-Teklif-Sistemi` | Gelistirme klasoru |
| Local dev kisayolu | `MEBA Teklif - Guncel Baslat` | GitHub'dan guncelle + localhost ac |
| Live API localhost | `MEBA Teklif - Canli API Localhost` | Yerel arayuz + canli veri/API |
| Canli PWA kisayolu | `MEBA Teklif - Canli Sistem` | Render'daki canli sistemi ac |
| PDF arsiv klasoru | `MEBA Mekanik Teklifler - PDF Arsiv` | Elle saklanan teklif PDF'leri |
| Eski indirme arsivi | `MEBA Teklif - Eski Zip Arsivi` | Downloads'taki eski zip indirmeleri |

## GitHub durumu

- Hesapta public gorunen ana repo: `hmbakirdogen-cmyk/Meba-Teklif-Sistemi`
- Ana branch: `main`
- Local ve GitHub `main` ayni commit'e getirildi.
- Kalan remote branch'ler:
  - `pwa-masaustu-ikonu`: `main` icine merge edilmis gorunuyor; silme adayi.
  - `feature/eposta-composer-onyx-tema`: `main`'den ayri 1 commit iceriyor; once karar verilmeli.

## Gunluk kullanim

En kisa yol:

```powershell
meba
```

veya masaustundeki:

```text
MEBA Teklif - Guncel Baslat
```

Bu akis:

1. GitHub `main` guncellemesini kontrol eder.
2. Yerel degisiklikleri ezmez.
3. Gerekiyorsa `npm install` calistirir.
4. PostgreSQL'i baslatir.
5. Prisma migration'lari uygular.
6. `http://localhost:5173/` adresini acar.

Canli veriyle local arayuz gerekiyorsa:

```powershell
meba -LiveApi
```

Bu mod `http://localhost:5174/` adresini acar ve API olarak `https://meba-teklif.onrender.com/api` kullanir.

Dikkat: Bu modda kaydetme/silme gibi islemler canli sistemi etkiler.

## Varsayilan calisma kuralimiz

Programla ilgili bir is yaptigimizda, kullanici aksini soylemedikce yerel bilgisayardaki ilgili program dosyalari da o isle beraber guncellenir. Sadece tarif veya oneride kalinmaz; guvenli ise degisiklik dogrudan yerel repo icinde uygulanir.

Her program isinde standart kontrol:

1. Yerel repo durumu kontrol edilir.
2. GitHub guncelligi kontrol edilir.
3. Yerel/user degisiklikleri ezilmeden gerekli dosyalar guncellenir.
4. Makul test veya saglik kontrolu calistirilir.
5. Son durumda GitHub ile fark varsa acikca soylenir.

## Yeni bilgisayar kurulumu

Git ve Node.js kuruluysa PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/hmbakirdogen-cmyk/Meba-Teklif-Sistemi/main/scripts/windows/install-meba-from-github.ps1 | iex"
```

Bu komut repo yoksa indirir, varsa gunceller, `meba` komutunu ve kisayollari kurar.

## Temizlik kurali

- Kod sadece `Meba-Teklif-Sistemi` klasorunde tutulur.
- GitHub'dan indirilen zip dosyalari gelistirme icin kullanilmaz; arsive alinabilir veya silinebilir.
- Canli sistem ve local gelistirme kisayollari farkli isimlerle tutulur:
  - Canli: `MEBA Teklif - Canli Sistem`
  - Canli API localhost: `MEBA Teklif - Canli API Localhost`
  - Gelistirme: `MEBA Teklif - Guncel Baslat`
- Branch temizligi onaysiz yapilmaz. Once branch'in merge durumu kontrol edilir.
