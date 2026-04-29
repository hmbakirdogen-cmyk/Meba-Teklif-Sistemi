@echo off
chcp 65001 >nul
title MEBA Teklif Sistemi - Guncelle

cd /d "%~dp0"

echo.
echo   MEBA Teklif Sistemi - Guncelleme
echo.

REM Git deposu mu kontrol et
if not exist ".git" (
  echo   Bu kurulum git deposundan kurulmamis.
  echo   Yeni surumu USB ile elden alip MEBA-KUR.bat ile uzerine kurun.
  echo.
  pause
  exit /b 0
)

where git >nul 2>&1
if %errorLevel% NEQ 0 (
  echo   HATA: Git bulunamadi. https://git-scm.com/ adresinden kurun.
  pause
  exit /b 1
)

echo   [1/3] Git pull --rebase --autostash ...
git pull --rebase --autostash
if %errorLevel% NEQ 0 (
  echo.
  echo   HATA: git pull basarisiz. Cakisma var olabilir; bilgi islem yetkilisine danisin.
  pause
  exit /b 1
)

echo   [2/3] npm install (gerekirse)...
where npm >nul 2>&1
if %errorLevel% EQU 0 (
  call npm install --no-audit --no-fund --silent
)

echo   [3/3] npm run build ...
if exist "package.json" (
  call npm run build
)

echo.
echo   Guncelleme tamamlandi. Programi yeniden baslatin.
echo.
pause
