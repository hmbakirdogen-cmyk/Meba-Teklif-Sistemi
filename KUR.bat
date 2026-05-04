@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Grup Sirketleri Teklif Sistemi - Kurulum

REM ============================================================
REM   KUR.bat - USB'den C:\GroupCompanies\TeklifSistemi'e kurulum
REM
REM   Online-only mimari: tek server, kullanicilar tarayicidan baglanir.
REM   Bu kurulum YALNIZCA SERVER bilgisayarina yapilir.
REM
REM   1. Yonetici check
REM   2. Hedef klasore xcopy (node_modules dahil - USB icinde olmali)
REM   3. Server config olustur + UUID deviceId
REM   4. Masaustu kisayolu (PowerShell + .ico)
REM ============================================================

echo.
echo ====================================================================
echo   Grup Sirketleri Teklif Sistemi - Server Kurulumu
echo   (MEBA - MESA - ELMOS)
echo ====================================================================
echo.
echo   NOT: Bu kurulum sadece SERVER bilgisayarina yapilir.
echo        Diger kullanicilar tarayiciden http://server-ip:5173 ile baglanir.
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

REM Calisma dizini = USB veya bu bat'in oldugu dizin
cd /d "%~dp0"
set "KAYNAK=%CD%"
set "HEDEF=C:\GroupCompanies\TeklifSistemi"

echo   Kaynak: %KAYNAK%
echo   Hedef:  %HEDEF%
echo.

REM Hedef klasoru olustur
if not exist "C:\GroupCompanies" mkdir "C:\GroupCompanies"
if not exist "%HEDEF%" mkdir "%HEDEF%"

echo   [1/4] Dosyalar kopyalaniyor (%KAYNAK% -^> %HEDEF%)...
xcopy "%KAYNAK%\*" "%HEDEF%\" /E /Y /I /Q >nul

REM Mevcut runtime config'leri varsa silme
if not exist "%HEDEF%\config" mkdir "%HEDEF%\config"

echo   [2/4] Server config olusturuluyor...

REM Yeni UUID benzeri deviceId uret (PowerShell ile)
for /f %%i in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString()"') do set "UUID=%%i"

if not exist "%HEDEF%\config\server-config.json" (
  powershell -NoProfile -Command "$tpl = Get-Content -Raw '%HEDEF%\config\server-config.template.json' | ConvertFrom-Json; $tpl.deviceId = '!UUID!'; $tpl | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 '%HEDEF%\config\server-config.json'"
)

REM Masaustu kisayolu
echo   [3/4] Masaustu kisayolu olusturuluyor...

set "ICO_PATH=%HEDEF%\assets\icon\teklif-sistemi.ico"
if not exist "%ICO_PATH%" set "ICO_PATH=%HEDEF%\build\icon.ico"
if not exist "%ICO_PATH%" set "ICO_PATH=%HEDEF%\public\favicon.svg"

set "DESKTOP=%USERPROFILE%\Desktop"
set "LNK=%DESKTOP%\Teklif Sistemi.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; $sh = $ws.CreateShortcut('%LNK%'); $sh.TargetPath = '%HEDEF%\BASLAT.bat'; $sh.WorkingDirectory = '%HEDEF%'; $sh.IconLocation = '%ICO_PATH%'; $sh.Description = 'Grup Sirketleri Teklif Sistemi'; $sh.WindowStyle = 7; $sh.Save()"

echo   [4/4] Tamamlandi.
echo.
echo ====================================================================
echo   Kurulum BASARILI
echo.
echo   Konum:      %HEDEF%
echo   Kisayol:    %LNK%
echo   Device ID:  !UUID!
echo.
echo   Server'i baslatmak icin masaustundeki "Teklif Sistemi" ikonuna
echo   cift tiklayin. Diger kullanicilar tarayicidan baglanir:
echo     http://[bu-bilgisayarin-ip-adresi]:5173
echo ====================================================================
echo.
pause
