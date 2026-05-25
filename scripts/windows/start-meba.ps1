[CmdletBinding()]
param(
  [string]$RepoPath = "",
  [string]$Branch = "",
  [switch]$NoUpdate,
  [switch]$NoBrowser,
  [switch]$OpenVSCode,
  [switch]$AutoStash,
  [switch]$LiveApi,
  [string]$LiveApiBase = "https://meba-teklif.onrender.com/api",
  [int]$LivePort = 5174
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

$script:CodeUpdated = $false
$script:NpmInstallNeededFromGit = $false

function Resolve-RepoPath {
  if ($RepoPath) {
    return (Resolve-Path -LiteralPath $RepoPath).Path
  }
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
}

function Test-Command([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Native([string]$File, [string[]]$ArgList) {
  & $File @ArgList
  if ($LASTEXITCODE -ne 0) {
    throw "$File exited with code $LASTEXITCODE"
  }
}

function Test-HttpOk([string]$Url, [int]$TimeoutSec = 3) {
  try {
    $res = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing
    return ($res.StatusCode -ge 200 -and $res.StatusCode -lt 400)
  } catch {
    return $false
  }
}

function Test-ApiOk {
  try {
    $res = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 3
    return ($res.ok -eq $true -and $res.prismaOk -eq $true)
  } catch {
    return $false
  }
}

function Test-LiveApiOk {
  try {
    $res = Invoke-RestMethod -Uri "$LiveApiBase/health" -TimeoutSec 10
    return ($res.ok -eq $true -and $res.prismaOk -eq $true)
  } catch {
    return $false
  }
}

function Test-LocalPort([int]$Port) {
  try {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  } catch {
    return $false
  }
}

function Get-GitObjectHash([string]$Root, [string]$Path) {
  try {
    $hash = (git -C $Root rev-parse "HEAD:$Path" 2>$null).Trim()
    return $hash
  } catch {
    return ""
  }
}

function Get-DotEnvValue([string]$Root, [string]$Key) {
  $envPath = Join-Path $Root ".env"
  if (-not (Test-Path -LiteralPath $envPath)) { return "" }
  $line = Get-Content -LiteralPath $envPath | Where-Object { $_ -match "^\s*$([regex]::Escape($Key))\s*=" } | Select-Object -First 1
  if (-not $line) { return "" }
  $value = ($line -replace "^\s*$([regex]::Escape($Key))\s*=\s*", "").Trim()
  return $value.Trim('"').Trim("'")
}

function Update-FromGit([string]$Root) {
  if ($NoUpdate) {
    Write-Warn "GitHub guncellemesi atlandi (-NoUpdate)."
    return
  }
  if (-not (Test-Command "git")) {
    Write-Warn "Git bulunamadi; kod guncellemesi atlandi."
    return
  }

  Write-Step "GitHub guncellemesi kontrol ediliyor..."
  $beforeHead = ""
  $beforePackageJson = ""
  $beforePackageLock = ""
  try { $beforeHead = (git -C $Root rev-parse HEAD).Trim() } catch { }
  $beforePackageJson = Get-GitObjectHash $Root "package.json"
  $beforePackageLock = Get-GitObjectHash $Root "package-lock.json"

  $currentBranch = $Branch
  if (-not $currentBranch) {
    $currentBranch = (git -C $Root branch --show-current).Trim()
  }
  if (-not $currentBranch) {
    Write-Warn "Aktif branch bulunamadi; git pull atlandi."
    return
  }

  git -C $Root fetch origin --prune
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "git fetch basarisiz oldu; mevcut kodla devam ediliyor."
    return
  }

  $dirty = (git -C $Root status --porcelain)
  try {
    if ($dirty -and -not $AutoStash) {
      Write-Warn "Yerel degisiklik var; ezmemek icin pull atlandi. Gerekirse 'meba -AutoStash' kullan."
      return
    }

    if ($AutoStash) {
      git -C $Root pull --rebase --autostash origin $currentBranch
    } else {
      git -C $Root pull --ff-only origin $currentBranch
    }
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "Kod guncel."
      $afterHead = ""
      try { $afterHead = (git -C $Root rev-parse HEAD).Trim() } catch { }
      $afterPackageJson = Get-GitObjectHash $Root "package.json"
      $afterPackageLock = Get-GitObjectHash $Root "package-lock.json"
      $script:CodeUpdated = ($beforeHead -and $afterHead -and $beforeHead -ne $afterHead)
      $script:NpmInstallNeededFromGit =
        ($beforePackageJson -and $afterPackageJson -and $beforePackageJson -ne $afterPackageJson) -or
        ($beforePackageLock -and $afterPackageLock -and $beforePackageLock -ne $afterPackageLock)
    } else {
      Write-Warn "git pull tamamlanamadi; mevcut kodla devam ediliyor."
    }
  } catch {
    Write-Warn "Git guncellemesi tamamlanamadi: $($_.Exception.Message)"
  }
}

function Ensure-NpmInstall([string]$Root) {
  if (-not (Test-Command "node")) { throw "Node.js bulunamadi. Once Node.js kurulmali." }
  if (-not (Test-Command "npm")) { throw "npm bulunamadi. Once Node.js/npm kurulmali." }

  $nodeModules = Join-Path $Root "node_modules"
  $installedLock = Join-Path $nodeModules ".package-lock.json"
  $needsInstall = (-not (Test-Path -LiteralPath $nodeModules)) -or $script:NpmInstallNeededFromGit
  if (-not $needsInstall -and -not (Test-Path -LiteralPath $installedLock)) {
    $needsInstall = $true
  }

  if ($needsInstall) {
    Write-Step "Bagimliliklar kuruluyor/guncelleniyor (npm install)..."
    Push-Location $Root
    try { Invoke-Native "npm" @("install") }
    finally { Pop-Location }
    Write-Ok "Bagimliliklar hazir."
  } else {
    Write-Ok "Bagimliliklar zaten hazir."
  }
}

function Stop-MebaDevServer {
  $ports = @(3001, 5173)
  $pids = @()
  foreach ($port in $ports) {
    try {
      $pids += Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess
    } catch {
      # Ignore missing port data.
    }
  }
  $pids = $pids | Where-Object { $_ } | Select-Object -Unique
  if (-not $pids) { return }

  Write-Step "Kod guncellendi; eski dev server surecleri kapatiliyor..."
  foreach ($processId in $pids) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
      Write-Warn "PID $processId kapatilamadi: $($_.Exception.Message)"
    }
  }
  Start-Sleep -Seconds 2
}

function Ensure-Postgres([string]$Root) {
  $dbUrl = Get-DotEnvValue $Root "DATABASE_URL"
  if ($dbUrl -notmatch "postgres" -or $dbUrl -notmatch "(localhost|127\.0\.0\.1)") {
    Write-Warn "DATABASE_URL lokal Postgres gibi gorunmuyor; Postgres baslatma atlandi."
    return
  }

  if (Test-LocalPort 5432) {
    Write-Ok "Postgres 5432 portunda calisiyor."
    return
  }

  $pgRoot = Join-Path ${env:ProgramFiles} "PostgreSQL"
  if (-not (Test-Path -LiteralPath $pgRoot)) {
    Write-Warn "PostgreSQL klasoru bulunamadi. DB zaten baska yerde calismiyorsa API acilmayabilir."
    return
  }

  $candidates = Get-ChildItem -LiteralPath $pgRoot -Directory -ErrorAction SilentlyContinue |
    ForEach-Object {
      [PSCustomObject]@{
        Version = $_.Name
        PgCtl = Join-Path $_.FullName "bin\pg_ctl.exe"
        PgReady = Join-Path $_.FullName "bin\pg_isready.exe"
        Data = Join-Path $_.FullName "data"
      }
    } |
    Where-Object {
      (Test-Path -LiteralPath $_.PgCtl) -and
      (Test-Path -LiteralPath (Join-Path $_.Data "postgresql.conf"))
    } |
    Sort-Object Version -Descending

  if (-not $candidates) {
    Write-Warn "Baslatilabilir PostgreSQL data klasoru bulunamadi."
    return
  }

  $pg = $candidates | Select-Object -First 1
  $log = Join-Path $Root "postgres-local.log"
  Write-Step "Postgres baslatiliyor (v$($pg.Version))..."
  & $pg.PgCtl start -D $pg.Data -l $log -w | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "Postgres baslatilamadi; ayrinti: $log"
    return
  }

  if (Test-Path -LiteralPath $pg.PgReady) {
    & $pg.PgReady -h localhost -p 5432 -U postgres | Out-Null
  }
  Write-Ok "Postgres hazir."
}

function Ensure-Prisma([string]$Root) {
  $dbUrl = Get-DotEnvValue $Root "DATABASE_URL"
  if ($dbUrl -notmatch "postgres" -or $dbUrl -notmatch "(localhost|127\.0\.0\.1)") {
    Write-Warn "Remote DB olasiligi nedeniyle otomatik migration atlandi."
    return
  }
  if (-not (Test-LocalPort 5432)) {
    Write-Warn "Postgres hazir degil; migration atlandi."
    return
  }

  Write-Step "Prisma migration kontrol ediliyor..."
  Push-Location $Root
  try {
    Invoke-Native "npm" @("run", "db:deploy", "--", "--schema", "server/prisma/schema.prisma")
  } finally {
    Pop-Location
  }
  Write-Ok "Veritabani semasi hazir."
}

function Start-DevServer([string]$Root) {
  if ($LiveApi) {
    Start-LiveApiFrontend $Root
    return
  }

  $apiReady = Test-ApiOk
  $webReady = Test-HttpOk "http://localhost:5173/"

  if ($apiReady -and $webReady) {
    Write-Ok "Localhost zaten calisiyor."
    return
  }

  if ((Test-LocalPort 3001) -and -not $apiReady) {
    Write-Warn "3001 portu dolu ama API saglikli degil. Eski sureci kapatman gerekebilir."
  }
  if ((Test-LocalPort 5173) -and -not $webReady) {
    Write-Warn "5173 portu dolu ama web cevap vermiyor. Eski sureci kapatman gerekebilir."
  }

  Write-Step "Dev server baslatiliyor..."
  $log = Join-Path $Root "dev-runtime.log"
  $escapedRoot = $Root.Replace("'", "''")
  $escapedLog = $log.Replace("'", "''")
  $cmd = "Set-Location -LiteralPath '$escapedRoot'; npm run dev *> '$escapedLog'"
  $proc = Start-Process -FilePath "powershell" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $cmd) -WindowStyle Hidden -PassThru
  Write-Ok "Dev server sureci basladi (PID $($proc.Id)). Log: $log"

  $deadline = (Get-Date).AddSeconds(90)
  do {
    Start-Sleep -Seconds 2
    $apiReady = Test-ApiOk
    $webReady = Test-HttpOk "http://localhost:5173/"
    if ($apiReady -and $webReady) { break }
  } while ((Get-Date) -lt $deadline)

  if ($apiReady -and $webReady) {
    Write-Ok "Localhost hazir: http://localhost:5173/"
  } else {
    Write-Warn "Server tam hazir gorunmuyor. Log dosyasini kontrol et: $log"
  }
}

function Start-LiveApiFrontend([string]$Root) {
  if (Test-LiveApiOk) {
    Write-Ok "Canli API hazir: $LiveApiBase"
  } else {
    Write-Warn "Canli API saglik kontrolu gecemedi: $LiveApiBase"
  }

  $url = "http://localhost:$LivePort/"
  if (Test-HttpOk $url) {
    Write-Ok "Canli API modunda localhost zaten calisiyor: $url"
    return
  }

  if (Test-LocalPort $LivePort) {
    Write-Warn "$LivePort portu dolu ama web cevap vermiyor. Eski sureci kapatman gerekebilir."
  }

  Write-Step "Frontend canli API modunda baslatiliyor..."
  $log = Join-Path $Root "dev-live-api-runtime.log"
  $escapedRoot = $Root.Replace("'", "''")
  $escapedLog = $log.Replace("'", "''")
  $escapedApi = $LiveApiBase.Replace("'", "''")
  $cmd = "Set-Location -LiteralPath '$escapedRoot'; `$env:VITE_API_BASE='$escapedApi'; npx vite --host 0.0.0.0 --port $LivePort *> '$escapedLog'"
  $proc = Start-Process -FilePath "powershell" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $cmd) -WindowStyle Hidden -PassThru
  Write-Ok "Canli API frontend sureci basladi (PID $($proc.Id)). Log: $log"

  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Seconds 2
    if (Test-HttpOk $url) { break }
  } while ((Get-Date) -lt $deadline)

  if (Test-HttpOk $url) {
    Write-Ok "Canli API modu hazir: $url"
  } else {
    Write-Warn "Canli API modu tam hazir gorunmuyor. Log dosyasini kontrol et: $log"
  }
}

$root = Resolve-RepoPath
if (-not (Test-Path -LiteralPath (Join-Path $root ".git"))) {
  throw "Repo bulunamadi: $root"
}

Write-Host ""
Write-Host "MEBA Teklif Sistemi baslatiliyor..." -ForegroundColor White
Write-Host "Repo: $root" -ForegroundColor DarkGray
Write-Host ""

Set-Location -LiteralPath $root
Update-FromGit $root

$alreadyRunning = (Test-ApiOk) -and (Test-HttpOk "http://localhost:5173/")
if (-not $LiveApi -and $alreadyRunning -and -not $script:CodeUpdated -and -not $script:NpmInstallNeededFromGit) {
  Write-Ok "Localhost zaten calisiyor; gereksiz kurulum adimlari atlandi."
  if (-not $NoBrowser) {
    Start-Process "http://localhost:5173/"
  }
  if ($OpenVSCode -and (Test-Command "code")) {
    Start-Process "code" -ArgumentList @($root)
  }
  Write-Host ""
  Write-Ok "Bitti. Gunluk kullanim: meba"
  return
}

if ($alreadyRunning -and $script:CodeUpdated) {
  Stop-MebaDevServer
}

Ensure-NpmInstall $root
if ($LiveApi) {
  Write-Ok "Canli API modunda lokal Postgres/migration adimlari atlandi."
} else {
  Ensure-Postgres $root
  Ensure-Prisma $root
}
Start-DevServer $root

if (-not $NoBrowser) {
  if ($LiveApi) {
    Start-Process "http://localhost:$LivePort/"
  } else {
    Start-Process "http://localhost:5173/"
  }
}

if ($OpenVSCode -and (Test-Command "code")) {
  Start-Process "code" -ArgumentList @($root)
}

Write-Host ""
Write-Ok "Bitti. Gunluk kullanim: meba"
