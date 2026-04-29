@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Grup Sirketleri Teklif Sistemi - Otomatik Baslatma Kurulumu

REM ============================================================
REM   Bu script bilgisayar her acildiginda Teklif Sistemi'nin
REM   otomatik baslatilmasini saglayan Windows Task Scheduler
REM   kuralini olusturur.
REM   YONETICI olarak calistirilmali.
REM ============================================================

echo.
echo ====================================================================
echo   Grup Sirketleri Teklif Sistemi - Otomatik Baslatma Kurulumu
echo ====================================================================
echo.

REM Yonetici check
net session >nul 2>&1
if %errorLevel% NEQ 0 (
  echo   HATA: Bu kurulum YONETICI olarak calistirilmali.
  echo   Sag-tik -^> "Yonetici olarak calistir"
  echo.
  pause
  exit /b 1
)

cd /d "%~dp0"
set "BASLAT_BAT=%CD%\BASLAT.bat"

if not exist "%BASLAT_BAT%" (
  echo   HATA: BASLAT.bat bulunamadi: %BASLAT_BAT%
  echo   Bu script proje klasorunde calistirilmalidir.
  pause
  exit /b 1
)

echo   BASLAT.bat konumu: %BASLAT_BAT%
echo.
echo   Bu script Windows Task Scheduler'a:
echo     - "GrupSirketleriTeklifSistemi" adli bir gorev olusturur
echo     - Bilgisayar acilisinda otomatik calistirilir
echo     - Hata durumunda otomatik yeniden baslatir
echo.

set /p ONAY="Devam et? [E/H]: "
if /i not "%ONAY%"=="E" (
  echo   Iptal edildi.
  pause
  exit /b 0
)

REM Eski gorev varsa sil (idempotent)
schtasks /delete /tn "GrupSirketleriTeklifSistemi" /f >nul 2>&1

REM Yeni gorev olustur
REM /tn  task name
REM /tr  task run (program path)
REM /sc  schedule (onstart = bilgisayar acilirken)
REM /ru  user (SYSTEM = bilgisayar acilirken bekletmesin)
REM /rl  highest = yonetici hakkiyla calissin (firewall vb. icin)
schtasks /create /tn "GrupSirketleriTeklifSistemi" /tr "\"%BASLAT_BAT%\"" /sc onstart /ru SYSTEM /rl highest /f

if %errorLevel% NEQ 0 (
  echo.
  echo   HATA: Gorev olusturulamadi.
  pause
  exit /b 1
)

echo.
echo ====================================================================
echo   Tamamlandi!
echo.
echo   Gorev adi: GrupSirketleriTeklifSistemi
echo   Tetikleyici: Bilgisayar acilirken
echo   Komut: %BASLAT_BAT%
echo.
echo   Test etmek icin:
echo     schtasks /run /tn "GrupSirketleriTeklifSistemi"
echo.
echo   Kaldirmak icin:
echo     schtasks /delete /tn "GrupSirketleriTeklifSistemi" /f
echo ====================================================================
echo.
pause
