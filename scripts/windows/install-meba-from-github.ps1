[CmdletBinding()]
param(
  [string]$RepoUrl = "https://github.com/hmbakirdogen-cmyk/Meba-Teklif-Sistemi.git",
  [string]$RepoPath = "",
  [switch]$NoStart
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

function Write-Warn([string]$Message) {
  Write-Host "[UYARI] $Message" -ForegroundColor Yellow
}

if (-not $RepoPath) {
  $RepoPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "Meba-Teklif-Sistemi"
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git bulunamadi. Once Git for Windows kurulmali: https://git-scm.com/download/win"
}

if (-not (Test-Path -LiteralPath $RepoPath)) {
  Write-Step "Repo GitHub'dan indiriliyor..."
  git clone $RepoUrl $RepoPath
  if ($LASTEXITCODE -ne 0) { throw "git clone basarisiz oldu." }
} else {
  Write-Step "Mevcut repo bulundu, GitHub guncellemesi deneniyor..."
  $dirty = git -C $RepoPath status --porcelain 2>$null
  git -C $RepoPath fetch origin --prune
  if ($LASTEXITCODE -eq 0 -and -not $dirty) {
    $branch = (git -C $RepoPath branch --show-current).Trim()
    if ($branch) {
      git -C $RepoPath pull --ff-only origin $branch
      if ($LASTEXITCODE -ne 0) { Write-Warn "git pull tamamlanamadi; mevcut kodla devam ediliyor." }
    }
  } elseif ($dirty) {
    Write-Warn "Yerel degisiklik var; ezmemek icin pull atlandi."
  }
}

$installer = Join-Path $RepoPath "scripts\windows\install-meba-launcher.ps1"
if (-not (Test-Path -LiteralPath $installer)) {
  throw "Kurulum scripti bulunamadi: $installer"
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $installer -RepoPath $RepoPath
if ($LASTEXITCODE -ne 0) { throw "Launcher kurulumu basarisiz oldu." }

Write-Ok "MEBA launcher kuruldu."

if (-not $NoStart) {
  $starter = Join-Path $RepoPath "scripts\windows\start-meba.ps1"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $starter -RepoPath $RepoPath
}
