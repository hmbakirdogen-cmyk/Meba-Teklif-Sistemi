@echo off
chcp 65001 >nul
title Grup Sirketleri Teklif Sistemi - Guncelle
setlocal

cd /d "%~dp0"

echo.
echo ====================================================================
echo   Grup Sirketleri Teklif Sistemi - Dist Klasoru Guncelleme
echo ====================================================================
echo.

set "HEDEF=C:\GroupCompanies\TeklifSistemi"

if not exist "%HEDEF%" (
  echo   HATA: %HEDEF% bulunamadi.
  echo   Once KUR.bat ile kurulum yapilmasi gerekir.
  echo.
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo   HATA: USB'de dist\ klasoru bulunamadi veya bos.
  echo.
  pause
  exit /b 1
)

echo   [1/3] Program durduruluyor (acikse)...
if exist "%HEDEF%\.app-running.pid" (
  for /f %%p in ('powershell -NoProfile -Command "(Get-Content -Raw '%HEDEF%\.app-running.pid' | ConvertFrom-Json).pid"') do (
    taskkill /T /F /PID %%p >nul 2>&1
  )
  del "%HEDEF%\.app-running.pid" 2>nul
)

echo   [2/3] Eski dist\ siliniyor...
if exist "%HEDEF%\dist" rmdir /S /Q "%HEDEF%\dist"

echo   [3/3] Yeni dist\ kopyalaniyor...
xcopy "dist\*" "%HEDEF%\dist\" /E /Y /I /Q >nul

echo.
echo ====================================================================
echo   Tamamlandi.
echo.
echo   Simdi:
echo     1. Masaustundeki "Teklif Sistemi" kisayoluna cift tikla
echo     2. Tarayicida Ctrl + Shift + R ile sert yenile
echo ====================================================================
echo.
pause
