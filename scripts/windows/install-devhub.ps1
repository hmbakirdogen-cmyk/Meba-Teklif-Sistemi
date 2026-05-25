[CmdletBinding()]
param(
  [string]$RepoPath = '',
  [switch]$NoPathUpdate
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Message) {
  Write-Host "[DEVHUB] $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Resolve-RepoPath {
  if ($RepoPath) {
    return (Resolve-Path -LiteralPath $RepoPath).Path
  }
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
}

function New-DevHubShortcut([string]$ShortcutPath, [string]$RepoRoot, [string]$ScriptPath) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -Command menu"
  $shortcut.WorkingDirectory = $RepoRoot
  $shortcut.WindowStyle = 1
  $shortcut.Description = 'DevHub - projeyi sec, guncelle ve localhostta baslat'
  $shortcut.Save()
}

$root = Resolve-RepoPath
$devHubScript = Join-Path $root 'scripts\windows\devhub.ps1'
if (-not (Test-Path -LiteralPath $devHubScript)) {
  throw "devhub.ps1 bulunamadi: $devHubScript"
}

Write-Step 'DevHub komutu ve kisayollari kuruluyor...'

$binDir = Join-Path $env:USERPROFILE 'bin'
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$cmdPath = Join-Path $binDir 'devhub.cmd'
$cmdContent = @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "$devHubScript" %*
"@
Set-Content -LiteralPath $cmdPath -Value $cmdContent -Encoding ASCII

if (-not $NoPathUpdate) {
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $parts = @()
  if ($userPath) { $parts = $userPath -split ';' | Where-Object { $_ } }
  $alreadyInPath = $parts | Where-Object { $_.TrimEnd('\') -ieq $binDir.TrimEnd('\') }
  if (-not $alreadyInPath) {
    $newPath = (($parts + $binDir) -join ';')
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    $env:Path = (($env:Path -split ';' | Where-Object { $_ }) + $binDir) -join ';'
    Write-Ok "Kullanici PATH guncellendi: $binDir"
  } else {
    Write-Ok 'PATH zaten hazir.'
  }
}

$desktop = [Environment]::GetFolderPath('Desktop')
$desktopShortcut = Join-Path $desktop 'DevHub - Proje Sec ve Baslat.lnk'
New-DevHubShortcut $desktopShortcut $root $devHubScript

$startMenu = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'
$startMenuShortcut = Join-Path $startMenu 'DevHub - Proje Sec ve Baslat.lnk'
New-DevHubShortcut $startMenuShortcut $root $devHubScript

Write-Ok "Komut: devhub"
Write-Ok "Masaustu kisayolu: $desktopShortcut"
Write-Ok "Baslat menusu kisayolu: $startMenuShortcut"
Write-Host ''
Write-Host "Sonraki adim: 'devhub add ...' ile proje kaydet, sonra 'devhub menu' ile secip calistir." -ForegroundColor Yellow
