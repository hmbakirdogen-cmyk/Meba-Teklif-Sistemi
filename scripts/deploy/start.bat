@echo off
REM ===========================================================
REM  MEBA Teklif Sistemi - Production Sunucu Baslatici
REM ===========================================================
REM  Bu .bat dosyasi build-deployment/ klasorunun KOKUNDE
REM  bulunmali. Cift tiklandiginda veya Gorev Zamanlayici ile
REM  bilgisayar acildiginda otomatik baslar.
REM ===========================================================

setlocal
cd /d "%~dp0"

REM Tek instance kontrolu - launcher.cjs PID lock kullaniyor.
if exist .meba-running.pid (
  echo [start.bat] Zaten calisiyor gibi gorunuyor (PID lock var).
  echo [start.bat] Yine de baslatmak istiyorsaniz once stop.bat calistirin.
  timeout /t 4 >nul
)

echo [start.bat] Sunucu baslatiliyor...
"%~dp0bin\node.exe" "%~dp0launcher.cjs"

REM Process exit ettiyse:
echo.
echo [start.bat] Sunucu kapandi.
pause
endlocal
