@echo off
chcp 65001 >nul
title Grup Sirketleri Teklif Sistemi - Durdur

cd /d "%~dp0"

set "PID_FILE=.app-running.pid"

if not exist "%PID_FILE%" (
  echo   Program zaten kapali (PID dosyasi yok).
  echo.
  pause
  exit /b 0
)

REM PID'yi JSON'dan oku (PowerShell)
for /f %%p in ('powershell -NoProfile -Command "(Get-Content -Raw '%PID_FILE%' | ConvertFrom-Json).pid"') do set "APP_PID=%%p"

if "%APP_PID%"=="" (
  echo   PID okunamadi, dosya silinerek temizleniyor.
  del "%PID_FILE%" 2>nul
  pause
  exit /b 1
)

echo   Program kapatiliyor (PID=%APP_PID%)...
taskkill /T /F /PID %APP_PID% >nul 2>&1

if exist "%PID_FILE%" del "%PID_FILE%" 2>nul

echo   Tamamlandi.
echo.
pause
