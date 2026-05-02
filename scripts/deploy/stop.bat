@echo off
REM ===========================================================
REM  MEBA Teklif Sistemi - Sunucu Durdurucu
REM ===========================================================
REM  Tum node.exe islemlerini sonlandirir. Eger ayni sunucuda
REM  baska Node servisleri calisiyorsa bu .bat'i kullanmayin -
REM  PID file'dan sadece kendi instance'imizi durdurun.
REM ===========================================================

setlocal
cd /d "%~dp0"

if exist .meba-running.pid (
  for /f "tokens=*" %%a in (.meba-running.pid) do (
    echo [stop.bat] PID %%a sonlandiriliyor...
    taskkill /F /PID %%a 2>nul
  )
  del /q .meba-running.pid
) else (
  echo [stop.bat] PID lock yok, PID dosyasi temizlenecek.
)

REM Garanti olarak port'u dinleyen node.exe'leri ara:
echo [stop.bat] launcher.cjs'i calistiran node.exe'ler aranıyor...
wmic process where "name='node.exe' and CommandLine like '%%launcher.cjs%%'" delete >nul 2>&1

echo [stop.bat] Tamam.
endlocal
