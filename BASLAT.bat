@echo off
chcp 65001 >nul
title Grup Sirketleri Teklif Sistemi

cd /d "%~dp0"

echo.
echo   Grup Sirketleri Teklif Sistemi baslatiliyor...
echo   (MEBA - MESA - ELMOS)
echo.

REM 1) Onceligi paket icindeki bin\node.exe'ye ver (USB'den geldi, kurulum gerekmez)
REM 2) Yoksa sistem PATH'ine bak (Node.js elle kurulmussa)
set "NODE_EXE="
if exist "%~dp0bin\node.exe" (
  set "NODE_EXE=%~dp0bin\node.exe"
) else (
  where node >nul 2>&1
  if %errorLevel% EQU 0 set "NODE_EXE=node"
)

if "%NODE_EXE%"=="" (
  echo   HATA: Node.js bulunamadi.
  echo.
  echo   Cozum 1: USB'den paketle birlikte gelen bin\node.exe eksik.
  echo            USB icerigini eksiksiz kopyaladiginizdan emin olun.
  echo   Cozum 2: https://nodejs.org/ adresinden Node.js LTS surumunu kurun.
  echo.
  pause
  exit /b 1
)

REM dist/ klasoru var mi? Yoksa launcher static server kuramaz, sessizce
REM crash olur. Burada erken durdurup kullaniciya net mesaj veriyoruz.
if not exist "dist\index.html" (
  echo.
  echo   HATA: dist\index.html bulunamadi.
  echo.
  echo   Frontend build'i eksik. Cozum:
  echo     1. PowerShell veya CMD'de bu klasore gel
  echo     2. "npm install" calistir (ilk kurulumda)
  echo     3. "npm run build" calistir
  echo     4. dist\ klasoru olusunca BASLAT.bat'i tekrar calistir
  echo.
  pause
  exit /b 1
)

REM Launcher'i baslat (PID lock + backend + frontend + browser auto-open)
"%NODE_EXE%" launcher.cjs
