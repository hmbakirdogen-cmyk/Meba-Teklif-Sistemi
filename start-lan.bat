@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Grup Sirketleri Teklif Sistemi - LAN Sunucu

cd /d "%~dp0"

echo.
echo ====================================================================
echo   Grup Sirketleri Teklif Sistemi - Yerel Ag Sunucusu
echo ====================================================================
echo.

REM Lokal IPv4 adresini bul (ilk IPv4)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4 Adresi" /C:"IPv4 Address"') do (
  set "IP=%%a"
  goto :found_ip
)
:found_ip
set "IP=!IP: =!"

if "!IP!"=="" (
  echo   UYARI: Yerel IP adresi otomatik bulunamadi.
  echo   ipconfig komutu ile manuel olarak ogrenin.
  echo.
) else (
  echo   Bu bilgisayarin yerel IP adresi: !IP!
  echo.
  echo   Diger kullanicilar tarayicidan su adrese baglanir:
  echo.
  echo       http://!IP!:5173
  echo.
  echo   ^(Ayni makine icin: http://localhost:5173^)
  echo.
)

echo --------------------------------------------------------------------
echo   Ilk calistirmada Windows Firewall pop-up'i cikabilir.
echo   "Allow Access" / "Erisime Izin Ver" sec.
echo.
echo   Firewall'i once acmak istersen yonetici olarak:
echo       firewall-allow.bat
echo --------------------------------------------------------------------
echo.
echo   Sunucu baslatiliyor... (Ctrl+C ile durdur)
echo.

call npm run start

endlocal
