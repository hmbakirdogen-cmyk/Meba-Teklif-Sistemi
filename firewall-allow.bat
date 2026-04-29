@echo off
chcp 65001 >nul
title Grup Sirketleri Teklif - Firewall Port Acici

REM Yonetici degilse uyari + cikis
net session >nul 2>&1
if %errorLevel% NEQ 0 (
  echo.
  echo   HATA: Bu script YONETICI olarak calistirilmali.
  echo   ^(Sag-tik -^> "Yonetici olarak calistir"^)
  echo.
  pause
  exit /b 1
)

echo.
echo ====================================================================
echo   Grup Sirketleri Teklif Sistemi - Windows Firewall Port Kurallari
echo ====================================================================
echo.
echo   Su portlara LAN'dan gelen baglantilari aciyor:
echo     - 5173  (Vite dev server)
echo     - 4173  (Vite preview, production)
echo     - 3001  (Backend API)
echo.

REM Eski kurallari (varsa) sil ve yeniden ekle (idempotent calisir)
netsh advfirewall firewall delete rule name="Teklif Sistemi Frontend Dev" >nul 2>&1
netsh advfirewall firewall delete rule name="Teklif Sistemi Frontend Preview" >nul 2>&1
netsh advfirewall firewall delete rule name="Teklif Sistemi API" >nul 2>&1
REM Eski isimli kurallari da temizle (geriye uyumluluk)
netsh advfirewall firewall delete rule name="MEBA Teklif Frontend Dev" >nul 2>&1
netsh advfirewall firewall delete rule name="MEBA Teklif Frontend Preview" >nul 2>&1
netsh advfirewall firewall delete rule name="MEBA Teklif API" >nul 2>&1

netsh advfirewall firewall add rule name="Teklif Sistemi Frontend Dev" dir=in action=allow protocol=TCP localport=5173 profile=private,domain >nul
if %errorLevel% EQU 0 (echo   [OK] 5173 ^(dev^) acildi) else (echo   [HATA] 5173 acilamadi)

netsh advfirewall firewall add rule name="Teklif Sistemi Frontend Preview" dir=in action=allow protocol=TCP localport=4173 profile=private,domain >nul
if %errorLevel% EQU 0 (echo   [OK] 4173 ^(preview^) acildi) else (echo   [HATA] 4173 acilamadi)

netsh advfirewall firewall add rule name="Teklif Sistemi API" dir=in action=allow protocol=TCP localport=3001 profile=private,domain >nul
if %errorLevel% EQU 0 (echo   [OK] 3001 ^(API^) acildi) else (echo   [HATA] 3001 acilamadi)

echo.
echo   Tamamlandi. Artik diger ag kullanicilari erisebilir.
echo.
echo   NOT: Sadece "Private" ve "Domain" aglarda acildi.
echo        Herkese acik (Public) Wi-Fi'da kapali kalir - guvenlik icin.
echo.
pause
