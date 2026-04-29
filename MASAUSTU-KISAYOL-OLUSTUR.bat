@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Grup Sirketleri Teklif Sistemi - Masaustu Kisayolu

REM ============================================================
REM   Bu script bilgisayarinin masaustune cilt cilt parlak
REM   bir "Teklif Sistemi" kisayolu birakir.
REM
REM   - Yonetici hakki gerekmez
REM   - Her kullanici kendi hesabinda calistirabilir
REM   - Mevcut kisayol varsa uzerine yazar (yenileme)
REM ============================================================

cd /d "%~dp0"
set "PROJE_DIZINI=%CD%"
set "BASLAT_BAT=%PROJE_DIZINI%\BASLAT.bat"
set "ICO_PATH=%PROJE_DIZINI%\assets\icon\teklif-sistemi.ico"
set "DESKTOP=%USERPROFILE%\Desktop"
set "LNK=%DESKTOP%\Teklif Sistemi.lnk"

echo.
echo ====================================================================
echo   Grup Sirketleri Teklif Sistemi - Masaustu Kisayolu
echo ====================================================================
echo.

REM Onceriksizleri kontrol et
if not exist "%BASLAT_BAT%" (
  echo   HATA: BASLAT.bat bulunamadi.
  echo   Bu script proje klasorunde calistirilmalidir.
  echo   Bulundugu klasor: %PROJE_DIZINI%
  echo.
  pause
  exit /b 1
)

if not exist "%ICO_PATH%" (
  echo   UYARI: Ikon bulunamadi: %ICO_PATH%
  echo   Genel ikon kullanilacak.
  set "ICO_PATH=%PROJE_DIZINI%\build\icon.ico"
  if not exist "!ICO_PATH!" set "ICO_PATH=%PROJE_DIZINI%\public\favicon.svg"
)

if not exist "%DESKTOP%" (
  echo   HATA: Masaustu klasoru bulunamadi: %DESKTOP%
  echo   OneDrive masaustu mu? Lutfen yolu kontrol edin.
  pause
  exit /b 1
)

echo   Hedef:    %LNK%
echo   Komut:    %BASLAT_BAT%
echo   Ikon:     %ICO_PATH%
echo.

REM Mevcut kisayolu kaldir (varsa)
if exist "%LNK%" (
  del "%LNK%" 2>nul
  echo   Mevcut kisayol kaldirildi (yenileme).
)

REM PowerShell ile kisayol olustur
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $sh = $ws.CreateShortcut('%LNK%'); ^
   $sh.TargetPath = '%BASLAT_BAT%'; ^
   $sh.WorkingDirectory = '%PROJE_DIZINI%'; ^
   $sh.IconLocation = '%ICO_PATH%, 0'; ^
   $sh.Description = 'Grup Sirketleri Teklif Sistemi - MEBA, ELMOS, MESA'; ^
   $sh.WindowStyle = 7; ^
   $sh.Save()"

if %errorLevel% NEQ 0 (
  echo.
  echo   HATA: Kisayol olusturulamadi.
  pause
  exit /b 1
)

echo.
echo ====================================================================
echo   Tamamlandi!
echo.
echo   Masaustunde "Teklif Sistemi" kisayoli hazir.
echo   Cift tiklayarak programi baslatabilirsin.
echo ====================================================================
echo.
echo   Ipucu: Kisayolu sag tikla -^> Ozellikler -^> Calistirma
echo          listesinden "Tam Ekran" sec (opsiyonel).
echo.
pause
