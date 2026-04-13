@echo off
title MEBA Teklif Sistemi
cd /d "%~dp0"

echo.
echo  MEBA Teklif Sistemi baslatiliyor...
echo.

:: API sunucusunu ayri bir pencerede baslat (port 3001)
start "MEBA API Sunucu" cmd /k "node server/server.cjs"

:: API sunucusunun hazir olmasi icin kisa bekleme
timeout /t 2 /nobreak >nul

:: Vite arayuz sunucusunu bu pencerede baslat (port 5173)
npm run dev

pause
