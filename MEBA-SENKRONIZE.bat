@echo off
chcp 65001 >nul
title MEBA Teklif Sistemi - Senkronize

cd /d "%~dp0"

echo.
echo   MEBA Teklif Sistemi - Manuel Senkronizasyon
echo.

REM Backend portunu config'den oku
set "BACKEND_PORT=3001"
if exist "config\client-config.json" (
  for /f %%p in ('powershell -NoProfile -Command "(Get-Content -Raw 'config\client-config.json' | ConvertFrom-Json).serverPort"') do set "BACKEND_PORT=%%p"
)
if exist "config\server-config.json" (
  for /f %%p in ('powershell -NoProfile -Command "(Get-Content -Raw 'config\server-config.json' | ConvertFrom-Json).listenPort"') do set "BACKEND_PORT=%%p"
)

echo   Server health check (port %BACKEND_PORT%)...

powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://localhost:%BACKEND_PORT%/api/health' -TimeoutSec 5 -UseBasicParsing; if ($r.StatusCode -eq 200) { Write-Host '   Server hazir.'; exit 0 } else { Write-Host '   Server yanit vermiyor.'; exit 1 } } catch { Write-Host ('   Server bulunamadi: ' + $_.Exception.Message); exit 1 }"

if %errorLevel% NEQ 0 (
  echo.
  echo   Ana bilgisayar su anda bulunamadi. Program offline kullanilmaya devam edebilir.
  echo   Senkronizasyon ana bilgisayar acilinca otomatik basarili olacak.
  echo.
  pause
  exit /b 1
)

echo   Sync push + pull tetikleniyor...

powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://localhost:%BACKEND_PORT%/api/sync/status' -TimeoutSec 8 -UseBasicParsing; $j = $r.Content | ConvertFrom-Json; Write-Host ('   Live kayitlar: teklifler=' + $j.liveCounts.teklifler + ' cariler=' + $j.liveCounts.cariler + ' urunler=' + $j.liveCounts.urunler); Write-Host ('   Server zamani: ' + $j.serverTime); exit 0 } catch { Write-Host ('   Hata: ' + $_.Exception.Message); exit 1 }"

echo.
echo   Manuel senkron icin tarayicidaki "Sync" baricigindan "Simdi Senkronize Et"
echo   butonuna basabilirsiniz. Otomatik senkronizasyon her 5 dakikada bir calisir.
echo.
pause
