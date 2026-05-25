[CmdletBinding()]
param(
  [string]$RepoPath = "",
  [switch]$NoPathUpdate
)

$ErrorActionPreference = "Stop"

try {
  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
} catch {
  # Older PowerShell fallback.
}

function Write-Step([string]$Message) {
  Write-Host "[MEBA] $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Resolve-RepoPath {
  if ($RepoPath) {
    return (Resolve-Path -LiteralPath $RepoPath).Path
  }
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
}

function New-MebaShortcut([string]$ShortcutPath, [string]$RepoRoot, [string]$StartScript) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`""
  $shortcut.WorkingDirectory = $RepoRoot
  $icon = Join-Path $RepoRoot "build\icon.ico"
  if (Test-Path -LiteralPath $icon) {
    $shortcut.IconLocation = $icon
  }
  $shortcut.WindowStyle = 1
  $shortcut.Description = "MEBA Teklif Sistemi - guncelle ve localhostta baslat"
  $shortcut.Save()
}

$root = Resolve-RepoPath
$startScript = Join-Path $root "scripts\windows\start-meba.ps1"
if (-not (Test-Path -LiteralPath $startScript)) {
  throw "start-meba.ps1 bulunamadi: $startScript"
}

Write-Step "MEBA komutu ve kisayollari kuruluyor..."

$binDir = Join-Path $env:USERPROFILE "bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$cmdPath = Join-Path $binDir "meba.cmd"
$cmdContent = @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "$startScript" %*
"@
Set-Content -LiteralPath $cmdPath -Value $cmdContent -Encoding ASCII

if (-not $NoPathUpdate) {
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $parts = @()
  if ($userPath) { $parts = $userPath -split ";" | Where-Object { $_ } }
  $alreadyInPath = $parts | Where-Object { $_.TrimEnd("\") -ieq $binDir.TrimEnd("\") }
  if (-not $alreadyInPath) {
    $newPath = (($parts + $binDir) -join ";")
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path = (($env:Path -split ";" | Where-Object { $_ }) + $binDir) -join ";"
    Write-Ok "Kullanici PATH guncellendi: $binDir"
  } else {
    Write-Ok "PATH zaten hazir."
  }
}

$desktop = [Environment]::GetFolderPath("Desktop")
$desktopShortcut = Join-Path $desktop "MEBA Teklif - Guncel Baslat.lnk"
New-MebaShortcut $desktopShortcut $root $startScript

$startMenu = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs"
$startMenuShortcut = Join-Path $startMenu "MEBA Teklif - Guncel Baslat.lnk"
New-MebaShortcut $startMenuShortcut $root $startScript

Write-Ok "Komut: meba"
Write-Ok "Masaustu kisayolu: $desktopShortcut"
Write-Ok "Baslat menusu kisayolu: $startMenuShortcut"
Write-Host ""
Write-Host "Not: Acik terminaller PATH degisikligini hemen gormeyebilir. Yeni terminalde 'meba' yazman yeterli." -ForegroundColor Yellow
