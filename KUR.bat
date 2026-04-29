@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Grup Sirketleri Teklif Sistemi - Kurulum

REM ============================================================
REM   KUR.bat - USB'den C:\GroupCompanies\TeklifSistemi'e kurulum
REM
REM   1. Yonetici check (firewall icin gerekli)
REM   2. Hedef klasore xcopy (node_modules dahil - USB icinde olmali)
REM   3. Config olustur (server veya client) + UUID deviceId
REM   4. Masaustu kisayolu (PowerShell + .ico)
REM   5. firewall-allow.bat (sadece server modunda)
REM ============================================================

echo.
echo ====================================================================
echo   Grup Sirketleri Teklif Sistemi - Kurulum
echo   (MEBA - MESA - ELMOS)
echo ====================================================================
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

REM Mod sec
echo   Bu bilgisayar SERVER mi, CLIENT mi?
echo     [1] SERVER  (Ana bilgisayar, db.json burada tutulur)
echo     [2] CLIENT  (Istemci, ana bilgisayara baglanir)
echo.
set /p MOD="Seciminiz [1/2]: "

if "%MOD%"=="1" (
  set "APP_MODE=server"
) else if "%MOD%"=="2" (
  set "APP_MODE=client"
) else (
  echo   Gecersiz secim. Kurulum iptal edildi.
  pause
  exit /b 1
)

echo.
echo   Mod: !APP_MODE!
echo.

REM Hedef klasoru olustur
if not exist "C:\GroupCompanies" mkdir "C:\GroupCompanies"
if not exist "%HEDEF%" mkdir "%HEDEF%"

echo   [1/5] Dosyalar kopyalaniyor (%KAYNAK% -^> %HEDEF%)...
xcopy "%KAYNAK%\*" "%HEDEF%\" /E /Y /I /Q /EXCLUDE:%KAYNAK%\install-exclude.txt >nul 2>&1
if %errorLevel% NEQ 0 (
  REM Exclude dosyasi yoksa basit xcopy kullan
  xcopy "%KAYNAK%\*" "%HEDEF%\" /E /Y /I /Q >nul
)

REM Mevcut runtime config'leri varsa silme
if not exist "%HEDEF%\config" mkdir "%HEDEF%\config"

echo   [2/5] Config olusturuluyor...

REM Yeni UUID benzeri deviceId uret (PowerShell ile)
for /f %%i in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString()"') do set "UUID=%%i"

if "!APP_MODE!"=="server" (
  REM Server config
  if not exist "%HEDEF%\config\server-config.json" (
    powershell -NoProfile -Command "$tpl = Get-Content -Raw '%HEDEF%\config\server-config.template.json' | ConvertFrom-Json; $tpl.deviceId = '!UUID!'; $tpl | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 '%HEDEF%\config\server-config.json'"
  )
) else (
  REM Client config
  if not exist "%HEDEF%\config\client-config.json" (
    set /p SERVER_HOST="Ana bilgisayarin IP'si (orn. 192.168.1.54): "
    powershell -NoProfile -Command "$tpl = Get-Content -Raw '%HEDEF%\config\client-config.template.json' | ConvertFrom-Json; $tpl.deviceId = '!UUID!'; $tpl.serverHost = '!SERVER_HOST!'; $tpl | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 '%HEDEF%\config\client-config.json'"
  )
)

REM Masaustu kisayolu
echo   [3/5] Masaustu kisayolu olusturuluyor...

set "ICO_PATH=%HEDEF%\assets\icon\teklif-sistemi.ico"
if not exist "%ICO_PATH%" set "ICO_PATH=%HEDEF%\build\icon.ico"
if not exist "%ICO_PATH%" set "ICO_PATH=%HEDEF%\public\favicon.svg"

set "DESKTOP=%USERPROFILE%\Desktop"
set "LNK=%DESKTOP%\Teklif Sistemi.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; $sh = $ws.CreateShortcut('%LNK%'); $sh.TargetPath = '%HEDEF%\BASLAT.bat'; $sh.WorkingDirectory = '%HEDEF%'; $sh.IconLocation = '%ICO_PATH%'; $sh.Description = 'Grup Sirketleri Teklif Sistemi'; $sh.WindowStyle = 7; $sh.Save()"

echo   [4/5] Firewall ayarlanmasi (sadece server modunda)...
if "!APP_MODE!"=="server" (
  call "%HEDEF%\firewall-allow.bat" >nul 2>&1
)

echo   [5/5] Tamamlandi.
echo.
echo ====================================================================
echo   Kurulum BASARILI
echo.
echo   Mod:        !APP_MODE!
echo   Konum:      %HEDEF%
echo   Kisayol:    %LNK%
echo   Device ID:  !UUID!
echo.
echo   Programi baslatmak icin masaustundeki "Teklif Sistemi" ikonuna
echo   cift tiklayin.
echo ====================================================================
echo.
pause
