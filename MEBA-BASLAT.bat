@echo off
chcp 65001 >nul
title MEBA Teklif Sistemi

cd /d "%~dp0"

echo.
echo   MEBA Teklif Sistemi baslatiliyor...
echo.

REM Node.js varlik kontrolu
where node >nul 2>&1
if %errorLevel% NEQ 0 (
  echo   HATA: Node.js bulunamadi.
  echo   Lutfen https://nodejs.org/ adresinden kurun veya bilgi islem yetkilisine
  echo   basvurun. Programin calismasi icin Node.js gereklidir.
  echo.
  pause
  exit /b 1
)

REM dist/ klasoru var mi?
if not exist "dist\index.html" (
  echo   UYARI: dist\ klasoru yok veya bos.
  echo   Once "npm run build" calistirilmali. Yoksa dev modunda da calisir mi denenir.
  echo.
)

REM Launcher'i baslat (PID lock + backend + frontend + browser auto-open)
node launcher.cjs
