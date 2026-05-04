@echo off
chcp 65001 >nul
title Grup Sirketleri Teklif Sistemi

cd /d "%~dp0"

echo.
echo   Grup Sirketleri Teklif Sistemi baslatiliyor...
echo   (MEBA - MESA - ELMOS)
echo.

REM Node.js sistem PATH'inde olmali. Yoksa nodejs.org'dan LTS surumunu kurun.
where node >nul 2>&1
if %errorLevel% NEQ 0 (
  echo   HATA: Node.js bulunamadi.
  echo.
  echo   Cozum: https://nodejs.org/ adresinden Node.js LTS surumunu kurun
  echo          ve bilgisayari yeniden baslatin.
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
node launcher.cjs
