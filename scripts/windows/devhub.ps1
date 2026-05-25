[CmdletBinding()]
param(
  [ValidateSet('menu', 'list', 'add', 'remove', 'rename', 'launch', 'edit', 'help')]
  [string]$Command = 'menu',
  [string]$Key = '',
  [string]$Name = '',
  [string]$RepoUrl = '',
  [string]$LocalPath = '',
  [string]$Branch = 'main',
  [string]$StartCommand = 'npm run dev',
  [string]$Url = 'http://localhost:5173/',
  [string]$Ports = '',
  [switch]$NoUpdate,
  [switch]$NoInstall,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

function Write-Info([string]$Message) {
  Write-Host "[DEVHUB] $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-WarnMsg([string]$Message) {
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Err([string]$Message) {
  Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Command([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-ConfigDir {
  return Join-Path $env:USERPROFILE '.devhub'
}

function Get-ConfigPath {
  return Join-Path (Get-ConfigDir) 'projects.json'
}

function Ensure-ConfigFile {
  $dir = Get-ConfigDir
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
  }

  $configPath = Get-ConfigPath
  if (-not (Test-Path -LiteralPath $configPath)) {
    Set-Content -LiteralPath $configPath -Value "[]" -Encoding UTF8
  }
}

function Load-Projects {
  Ensure-ConfigFile
  $configPath = Get-ConfigPath
  $raw = Get-Content -LiteralPath $configPath -Raw
  if ([string]::IsNullOrWhiteSpace([string]$raw)) { return @() }
  $parsed = ConvertFrom-Json -InputObject $raw
  if ($null -eq $parsed) { return @() }
  if ($parsed -is [System.Array]) { return @($parsed) }
  return @($parsed)
}

function Save-Projects($projects) {
  Ensure-ConfigFile
  $configPath = Get-ConfigPath
  $json = $projects | ConvertTo-Json -Depth 8
  Set-Content -LiteralPath $configPath -Value $json -Encoding UTF8
}

function Normalize-Key([string]$text) {
  $k = $text.Trim().ToLowerInvariant()
  $k = ($k -replace '\s+', '-')
  $k = ($k -replace '[^a-z0-9\-_]', '')
  return $k
}

function Parse-Ports([string]$text) {
  if (-not $text) { return @() }
  $parts = $text.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  $arr = @()
  foreach ($p in $parts) {
    $n = 0
    if ([int]::TryParse($p, [ref]$n)) {
      $arr += $n
    }
  }
  return $arr | Select-Object -Unique
}

function Find-Project($projects, [string]$searchKey) {
  if (-not $searchKey) { return $null }
  $k = Normalize-Key $searchKey
  return $projects | Where-Object { $_.key -eq $k } | Select-Object -First 1
}

function Show-Projects($projects) {
  if (-not $projects -or $projects.Count -eq 0) {
    Write-WarnMsg 'Kayitli proje yok. Once add komutunu kullanin.'
    return
  }

  Write-Host ''
  Write-Host 'Kayitli projeler:' -ForegroundColor White
  $i = 1
  foreach ($p in $projects) {
    $line = ('{0,2}. {1} | key={2} | branch={3} | {4}' -f $i, $p.name, $p.key, $p.branch, $p.localPath)
    Write-Host $line
    $i++
  }
  Write-Host ''
}

function Get-ProjectSelection($projects) {
  Show-Projects $projects
  if (-not $projects -or $projects.Count -eq 0) { return $null }

  $choice = Read-Host 'Secmek istedigin proje numarasi (bos=iptal)'
  if (-not $choice) { return $null }
  $index = 0
  if (-not [int]::TryParse($choice, [ref]$index)) { return $null }
  if ($index -lt 1 -or $index -gt $projects.Count) { return $null }
  return $projects[$index - 1]
}

function Stop-Ports($project) {
  if (-not $project.ports) { return }
  $ports = @($project.ports)
  if ($ports.Count -eq 0) { return }

  $owning = @()
  foreach ($port in $ports) {
    try {
      $owning += Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess
    } catch {
      # Ignore missing connection details.
    }
  }

  $uniquePids = $owning | Where-Object { $_ } | Select-Object -Unique
  foreach ($procId in $uniquePids) {
    try {
      Stop-Process -Id $procId -Force -ErrorAction Stop
      Write-Info "Port temizligi: PID $procId kapatildi."
    } catch {
      Write-WarnMsg "PID $procId kapatilamadi: $($_.Exception.Message)"
    }
  }
}

function Ensure-Repo($project) {
  $path = $project.localPath
  if (Test-Path -LiteralPath $path) {
    return
  }

  if (-not $project.repoUrl) {
    throw "Proje klasoru yok ve repoUrl tanimli degil: $($project.key)"
  }

  if (-not (Test-Command 'git')) {
    throw 'Git bulunamadi. Projeyi klonlamak icin Git gerekli.'
  }

  $parent = Split-Path -Parent $path
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  Write-Info "Repo klonlaniyor: $($project.repoUrl)"
  git clone $project.repoUrl $path
  if ($LASTEXITCODE -ne 0) {
    throw 'git clone basarisiz oldu.'
  }
}

function Update-Repo($project) {
  if ($NoUpdate) {
    Write-WarnMsg 'Git update atlandi (-NoUpdate).'
    return
  }

  if (-not (Test-Command 'git')) {
    Write-WarnMsg 'Git bulunamadi; update atlandi.'
    return
  }

  $path = $project.localPath
  if (-not (Test-Path -LiteralPath (Join-Path $path '.git'))) {
    Write-WarnMsg 'Bu klasor bir git repo degil; update atlandi.'
    return
  }

  Push-Location $path
  try {
    Write-Info 'Git fetch/pull calisiyor...'
    git fetch origin --prune
    if ($LASTEXITCODE -ne 0) {
      Write-WarnMsg 'git fetch basarisiz; mevcut kodla devam.'
      return
    }

    if ($project.branch) {
      git checkout $project.branch
      if ($LASTEXITCODE -ne 0) {
        Write-WarnMsg "branch checkout basarisiz: $($project.branch)"
      }

      $dirty = (git status --porcelain)
      if ($dirty) {
        Write-WarnMsg 'Yerel degisiklik var; pull atlandi (dosyalari korumak icin).'
        return
      }

      $aheadCount = 0
      $behindCount = 0
      try {
        $aheadRaw = (git rev-list --count "origin/$($project.branch)..$($project.branch)").Trim()
        $behindRaw = (git rev-list --count "$($project.branch)..origin/$($project.branch)").Trim()
        [void][int]::TryParse($aheadRaw, [ref]$aheadCount)
        [void][int]::TryParse($behindRaw, [ref]$behindCount)
      } catch {
        # parse fail olursa normal akisa devam
      }

      if ($aheadCount -gt 0) {
        Write-WarnMsg "Branch origin'den ileride ($aheadCount commit). Rebase conflict riskine karsi pull atlandi."
        if ($behindCount -gt 0) {
          Write-WarnMsg "Not: origin'de ayrica $behindCount yeni commit var. Elle merge/rebase onerilir."
        }
        return
      }

      git pull --rebase --autostash origin $project.branch
      if ($LASTEXITCODE -ne 0) {
        Write-WarnMsg 'git pull basarisiz; mevcut kodla devam.'
      } else {
        Write-Ok 'Kod guncel.'
      }
    }
  } finally {
    Pop-Location
  }
}

function Ensure-Dependencies($project) {
  if ($NoInstall) {
    Write-WarnMsg 'npm install atlandi (-NoInstall).'
    return
  }

  $path = $project.localPath
  $packageJson = Join-Path $path 'package.json'
  if (-not (Test-Path -LiteralPath $packageJson)) {
    Write-WarnMsg 'package.json bulunamadi; dependency adimi atlandi.'
    return
  }

  if (-not (Test-Command 'npm')) {
    throw 'npm bulunamadi. Node.js/npm kurulumu gerekli.'
  }

  Push-Location $path
  try {
    Write-Info 'npm install calisiyor...'
    npm install
    if ($LASTEXITCODE -ne 0) {
      throw 'npm install basarisiz oldu.'
    }
  } finally {
    Pop-Location
  }
}

function Start-Project($project) {
  Stop-Ports $project
  Ensure-Repo $project
  Update-Repo $project
  Ensure-Dependencies $project

  $path = $project.localPath
  $startCmd = [string]$project.startCommand
  if (-not $startCmd) {
    $startCmd = 'npm run dev'
  }

  $escapedPath = $path.Replace("'", "''")
  $cmd = "Set-Location -LiteralPath '$escapedPath'; $startCmd"

  Write-Info "Proje baslatiliyor: $($project.name)"
  $proc = Start-Process -FilePath 'powershell' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $cmd) -WindowStyle Hidden -PassThru
  Write-Ok "Calisiyor (PID $($proc.Id))."

  if (-not $NoBrowser -and $project.url) {
    Start-Process $project.url
  }

  Write-Host ''
  Write-Host "Proje: $($project.name)"
  Write-Host "Branch: $($project.branch)"
  Write-Host "Path: $($project.localPath)"
  if ($project.url) {
    Write-Host "URL: $($project.url)"
  }
}

function Show-Help {
  Write-Host ''
  Write-Host 'DevHub - Coklu proje guncelle/launch araci'
  Write-Host ''
  Write-Host 'Komutlar:'
  Write-Host '  devhub menu'
  Write-Host '  devhub list'
  Write-Host '  devhub add -Key meba -Name "MEBA Teklif" -RepoUrl "https://github.com/org/repo.git" -LocalPath "C:\Users\user\Desktop\Meba-Teklif-Sistemi" -Branch "feature/eposta-composer-onyx-tema" -StartCommand "npm run dev" -Url "http://localhost:5173/" -Ports "3001,5173"'
  Write-Host '  devhub launch -Key meba'
  Write-Host '  devhub rename -Key meba -Name "MEBA Teklif Sistemi"'
  Write-Host '  devhub remove -Key meba'
  Write-Host '  devhub edit'
  Write-Host ''
}

try {
  $projects = Load-Projects

  switch ($Command) {
    'help' {
      Show-Help
      exit 0
    }

    'list' {
      Show-Projects $projects
      exit 0
    }

    'edit' {
      $cfg = Get-ConfigPath
      Start-Process notepad.exe $cfg | Out-Null
      Write-Ok "Config acildi: $cfg"
      exit 0
    }

    'add' {
      $projects = @($projects)
      if (-not $Key) { throw 'add icin -Key zorunlu.' }
      if (-not $Name) { throw 'add icin -Name zorunlu.' }
      if (-not $LocalPath) { throw 'add icin -LocalPath zorunlu.' }

      $k = Normalize-Key $Key
      if (-not $k) { throw 'Gecerli bir key girin.' }
      $exists = Find-Project $projects $k
      if ($exists) {
        throw "Ayni key zaten var: $k"
      }

      $item = [PSCustomObject]@{
        key = $k
        name = $Name.Trim()
        repoUrl = $RepoUrl.Trim()
        localPath = $LocalPath.Trim()
        branch = $Branch.Trim()
        startCommand = $StartCommand.Trim()
        url = $Url.Trim()
        ports = @(Parse-Ports $Ports)
      }

      $projects += $item
      Save-Projects $projects
      Write-Ok "Proje eklendi: $($item.name) ($($item.key))"
      exit 0
    }

    'remove' {
      if (-not $Key) { throw 'remove icin -Key zorunlu.' }
      $k = Normalize-Key $Key
      $exists = Find-Project $projects $k
      if (-not $exists) {
        throw "Proje bulunamadi: $k"
      }

      $next = @($projects | Where-Object { $_.key -ne $k })
      Save-Projects $next
      Write-Ok "Proje silindi: $k"
      exit 0
    }

    'rename' {
      if (-not $Key) { throw 'rename icin -Key zorunlu.' }
      if (-not $Name) { throw 'rename icin -Name zorunlu.' }

      $k = Normalize-Key $Key
      $updated = @()
      $found = $false
      foreach ($p in $projects) {
        if ($p.key -eq $k) {
          $p.name = $Name.Trim()
          $found = $true
        }
        $updated += $p
      }

      if (-not $found) { throw "Proje bulunamadi: $k" }
      Save-Projects $updated
      Write-Ok "Proje adi guncellendi: $k -> $Name"
      exit 0
    }

    'launch' {
      $selected = Find-Project $projects $Key
      if (-not $selected) {
        if ($Key) {
          throw "Proje bulunamadi: $Key"
        }
        $selected = Get-ProjectSelection $projects
      }
      if (-not $selected) {
        Write-WarnMsg 'Proje secilmedi. Islem iptal.'
        exit 0
      }

      Start-Project $selected
      exit 0
    }

    'menu' {
      $selected = Get-ProjectSelection $projects
      if (-not $selected) {
        Write-WarnMsg 'Proje secilmedi. Islem iptal.'
        exit 0
      }

      Start-Project $selected
      exit 0
    }

    default {
      Show-Help
      exit 1
    }
  }
} catch {
  Write-Err $_.Exception.Message
  exit 1
}
