@echo off
chcp 65001 >nul
title MEBA Teklif Sistemi

cd /d "%~dp0"

echo.
echo   MEBA Teklif Sistemi baslatiliyor...
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
  echo   Cozum 2: https://nodejs.org/ adresinden Node.js LTS sürümünü kurun.
  echo.
  pause
  exit /b 1
)

REM dist/ klasoru var mi?
if not exist "dist\index.html" (
  echo   UYARI: dist\ klasoru yok veya bos.
  echo   Once "npm run build" calistirilmali. Yoksa dev modunda calistirilamaz.
  echo.
)

REM Launcher'i baslat (PID lock + backend + frontend + browser auto-open)
"%NODE_EXE%" launcher.cjs
