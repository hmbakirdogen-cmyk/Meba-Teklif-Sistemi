[CmdletBinding()]
param(
  [string]$DesktopPath = ''
)

$ErrorActionPreference = 'Stop'

function Resolve-DesktopPath {
  if ($DesktopPath) {
    return (Resolve-Path -LiteralPath $DesktopPath).Path
  }
  return [Environment]::GetFolderPath('Desktop')
}

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')
$devHubScript = Join-Path $repoRoot 'scripts\windows\devhub.ps1'
if (-not (Test-Path -LiteralPath $devHubScript)) {
  throw "devhub.ps1 bulunamadi: $devHubScript"
}

$desktop = Resolve-DesktopPath
$projectsRoot = Join-Path $desktop 'Projects'

if (-not (Test-Path -LiteralPath $projectsRoot)) {
  New-Item -ItemType Directory -Path $projectsRoot | Out-Null
}

$projectDefs = @(
  @{
    Key = 'teklif-motoru'
    Name = 'Teklif Motoru'
    RepoUrl = 'https://github.com/hmbakirdogen-cmyk/Meba-Teklif-Sistemi.git'
    LocalPath = Join-Path $projectsRoot 'Teklif-Motoru'
    Branch = 'feature/eposta-composer-onyx-tema'
    StartCommand = 'npm run dev'
    Url = 'http://localhost:5173/'
    Ports = '3001,5173'
  },
  @{
    Key = 'komuta-merkezi'
    Name = 'Komuta Merkezi'
    RepoUrl = 'https://github.com/hmbakirdogen-cmyk/meba-komuta-portal.git'
    LocalPath = Join-Path $projectsRoot 'Komuta-Merkezi'
    Branch = 'main'
    StartCommand = 'npm run dev'
    Url = 'http://localhost:5173/'
    Ports = '5173,3000'
  },
  @{
    Key = 'ciftlik-yonetimi'
    Name = 'Ciftlik Yonetimi'
    RepoUrl = 'https://github.com/hmbakirdogen-cmyk/asrin-projesi.git'
    LocalPath = Join-Path $projectsRoot 'Ciftlik-Yonetimi'
    Branch = 'main'
    StartCommand = 'cmd /c BASLAT.bat'
    Url = 'http://localhost:3001/'
    Ports = '3001,5173'
  }
)

$legacyKeys = @(
  'meba',
  'meba-teklif-sistemi',
  'meba-komuta-portal',
  'asrin-projesi'
)

foreach ($legacy in $legacyKeys) {
  try {
    powershell -NoProfile -ExecutionPolicy Bypass -File $devHubScript -Command remove -Key $legacy | Out-Null
  } catch {
    # key yoksa devam
  }
}

foreach ($p in $projectDefs) {
  try {
    powershell -NoProfile -ExecutionPolicy Bypass -File $devHubScript -Command remove -Key $p.Key | Out-Null
  } catch {
    # key yoksa devam
  }

  powershell -NoProfile -ExecutionPolicy Bypass -File $devHubScript -Command add -Key $p.Key -Name $p.Name -RepoUrl $p.RepoUrl -LocalPath $p.LocalPath -Branch $p.Branch -StartCommand $p.StartCommand -Url $p.Url -Ports $p.Ports | Out-Null
}

powershell -NoProfile -ExecutionPolicy Bypass -File $devHubScript -Command list
