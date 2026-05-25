# MEBA Teklif Sistemi - Tek Tik Baslatma

Bu kurulumdan sonra gunluk kullanim:

```powershell
meba
```

veya masaustundeki `MEBA Teklif - Guncel Baslat` kisayoluna cift tik.

## Bu bilgisayarda tek seferlik kurulum

Repo klasorunde:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\install-meba-launcher.ps1
```

Kurulum sunlari ekler:

- `meba` komutu: `%USERPROFILE%\bin\meba.cmd`
- Masaustu kisayolu
- Baslat menusu kisayolu

## Yeni ev/is bilgisayarinda tek komut

Git ve Node.js kuruluysa PowerShell'de:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/hmbakirdogen-cmyk/Meba-Teklif-Sistemi/main/scripts/windows/install-meba-from-github.ps1 | iex"
```

Bu komut repo yoksa `Desktop\Meba-Teklif-Sistemi` klasorune klonlar, varsa GitHub'dan guncellemeyi dener, `meba` komutunu ve kisayollari kurar, sonra localhost'u acar.

## Baslatma akisi

`meba` calisinca:

1. GitHub `origin/main` guncellemesini kontrol eder.
2. Yerel dosyalarda kaydedilmemis degisiklik varsa ezmeden devam eder.
3. Gerekirse `npm install` calistirir.
4. Lokal PostgreSQL'i baslatir.
5. Lokal migration'lari uygular.
6. API + Vite dev server'i acar.
7. Tarayicida `http://localhost:5173/` adresini acar.

Yerel degisiklik varken yine de GitHub guncellemesini denemek icin:

```powershell
meba -AutoStash
```

## Canli veriyle localhost

Lokal PostgreSQL eski kaldiginda ve giris ekraninda personeller eksik gorundugunde, local arayuzu canli Render API'ye baglayarak ac:

```powershell
meba -LiveApi
```

Bu mod `http://localhost:5174/` adresini acar. Arayuz yerel koddan gelir, veri ve giris canli sistemden gelir.

Dikkat: Bu modda kaydetme/silme gibi islemler canli veriyi etkiler.
