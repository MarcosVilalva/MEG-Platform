# MEG Etapa 10 | Inventario PG17 WSL e Android, apenas leitura.
# Nunca imprimir serial ADB, caminho de usuario, dados financeiros, tokens ou erros brutos.
# Nao iniciar PostgreSQL, restaurar backup, instalar APK, alterar configuracoes ou arquivos.
cls
$ErrorActionPreference = 'Stop'
$lines = New-Object 'System.Collections.Generic.List[string]'
function Put([string]$value) { [void]$lines.Add($value) }

# No Windows PowerShell 5.1, stderr de executavel externo sob Stop pode
# virar NativeCommandError. Capture exit code sem transformar isso em QUERY_ERROR
# e sem divulgar mensagens nao sanitizadas.
function Invoke-ExternalReadOnly {
  param(
    [Parameter(Mandatory=$true)][string]$Binary,
    [Parameter(Mandatory=$true)][string[]]$Arguments
  )
  $before = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $raw = @(& $Binary @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $text = @($raw | ForEach-Object { [string]$_ })
    return [pscustomobject]@{ ExitCode = $exitCode; Lines = $text }
  } catch {
    return [pscustomobject]@{ ExitCode = -1; Lines = @() }
  } finally {
    $ErrorActionPreference = $before
  }
}

Put 'MEG_STAGE10_READONLY_INVENTORY=START'
Put 'PRODUCAO_ACESSADA=NAO'
Put 'BANCO_MODIFICADO=NAO'
Put 'ANDROID_MODIFICADO=NAO'
Put 'QA_CLUSTER=NOT_CHECKED'
Put 'ADB=NOT_CHECKED'

$wsl = Get-Command 'wsl.exe' -ErrorAction SilentlyContinue
if (-not $wsl) {
  Put 'WSL=NOT_AVAILABLE'
} else {
  Put 'WSL=FOUND'
  $distros = Invoke-ExternalReadOnly -Binary $wsl.Source -Arguments @('--list','--quiet')
  if ($distros.ExitCode -ne 0) {
    Put 'WSL_DISTRIBUTIONS=QUERY_FAILED'
    Put ('WSL_LIST_EXIT=' + $distros.ExitCode)
  } else {
    $names = @($distros.Lines | ForEach-Object { $_ -replace [string][char]0, '' })
    if (-not ($names | Where-Object { $_.Trim() -ieq 'Ubuntu-24.04' })) {
      Put 'QA_CLUSTER=WSL_DISTRO_NOT_FOUND'
    } else {
      Put 'WSL_DISTRO=Ubuntu-24.04'
      $cluster = Invoke-ExternalReadOnly -Binary $wsl.Source -Arguments @(
        '-d','Ubuntu-24.04','-u','m_vil','--','pg_lsclusters','--no-header'
      )
      if ($cluster.ExitCode -ne 0) {
        Put 'QA_CLUSTER=LIST_FAILED'
        Put ('QA_LIST_EXIT=' + $cluster.ExitCode)
        # A falha pode ser: user Linux ausente, pg_lsclusters ausente,
        # permissao negada ou WSL indisponivel. Nao adivinhar nem divulgar stderr.
      } else {
        $matches = @($cluster.Lines | Where-Object { $_ -match '^\s*17\s+meg_stage10_qa\s+5448\s+' })
        if ($matches.Count -ne 1) {
          Put 'QA_CLUSTER=NOT_FOUND_OR_AMBIGUOUS'
        } else {
          $parts = @($matches[0].Trim() -split '\s+')
          $status = $parts[3]
          Put 'QA_CLUSTER=17/meg_stage10_qa'
          Put 'QA_PORT=5448'
          Put ('QA_STATUS=' + $status)
          if ($status -eq 'online') {
            # SQL de metadados, sem FROM em tabela financeira; socket peer, sem TCP.
            $sql = "SELECT concat('LOCAL_SOCKET=',CASE WHEN inet_server_addr() IS NULL THEN 'YES' ELSE 'NO' END,';DB=',current_database(),';ROLE=',current_user,';PG_VERSION=',current_setting('server_version'),';READ_ONLY=',current_setting('default_transaction_read_only'),';BYPASS_RLS=',CASE WHEN (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) THEN 'YES' ELSE 'NO' END)"
            $probe = Invoke-ExternalReadOnly -Binary $wsl.Source -Arguments @(
              '-d','Ubuntu-24.04','-u','m_vil','--','psql',
              '-w','-X','-A','-t','-h','/var/run/postgresql','-p','5448',
              '-U','m_vil','-d','meg_stage10_qa','-v','ON_ERROR_STOP=1','-c',$sql
            )
            if ($probe.ExitCode -ne 0) {
              Put 'QA_GUARD=PSQL_FAILED'
              Put ('QA_PSQL_EXIT=' + $probe.ExitCode)
            } else {
              $candidate = @($probe.Lines | Where-Object { $_ -match '^LOCAL_SOCKET=' })
              if ($candidate.Count -eq 1 -and
                  $candidate[0] -match '^LOCAL_SOCKET=YES;DB=meg_stage10_qa;ROLE=m_vil;PG_VERSION=17\.' -and
                  $candidate[0] -match ';READ_ONLY=on;BYPASS_RLS=NO$') {
                Put 'QA_GUARD=PASS'
                Put 'QA_DATABASE=meg_stage10_qa'
                Put 'QA_ROLE=m_vil'
                Put 'QA_ROLE_READONLY=ON'
                Put 'QA_BYPASS_RLS=NO'
              } else {
                Put 'QA_GUARD=FAIL_CLOSED'
              }
            }
          } else {
            Put 'QA_GUARD=NOT_TESTED_CLUSTER_NOT_ONLINE'
          }
        }
      }
    }
  }
}

# ADB muitas vezes existe no Android SDK, mas NAO consta no PATH.
$adbCommand = Get-Command 'adb.exe' -ErrorAction SilentlyContinue
$adbPath = if ($adbCommand) { $adbCommand.Source } else { $null }
$adbSource = if ($adbPath) { 'PATH' } else { 'NONE' }
if (-not $adbPath) {
  $candidatePaths = @(
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'),
    $(if ($env:ANDROID_HOME) { Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe' }),
    $(if ($env:ANDROID_SDK_ROOT) { Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe' }),
    (Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk\platform-tools\adb.exe')
  )
  foreach ($candidatePath in $candidatePaths) {
    if ($candidatePath -and (Test-Path -LiteralPath $candidatePath -PathType Leaf)) {
      $adbPath = $candidatePath
      $adbSource = 'ANDROID_SDK'
      break
    }
  }
}
if (-not $adbPath) {
  Put 'ADB=NOT_FOUND_IN_PATH_OR_COMMON_SDK_PATHS'
} else {
  Put 'ADB=FOUND'
  Put ('ADB_SOURCE=' + $adbSource)
  $adbVersion = Invoke-ExternalReadOnly -Binary $adbPath -Arguments @('version')
  Put ('ADB_BINARY=' + $(if ($adbVersion.ExitCode -eq 0) { 'USABLE' } else { 'FAILED' }))
  if ($adbVersion.ExitCode -eq 0) {
    $deviceRows = Invoke-ExternalReadOnly -Binary $adbPath -Arguments @('devices')
    if ($deviceRows.ExitCode -ne 0) {
      Put 'ADB_DEVICES=QUERY_FAILED'
      Put ('ADB_DEVICES_EXIT=' + $deviceRows.ExitCode)
    } else {
      $ready = @($deviceRows.Lines | Where-Object { $_ -match '^\S+\s+device\s*$' })
      $unauthorized = @($deviceRows.Lines | Where-Object { $_ -match '^\S+\s+unauthorized\s*$' })
      $offline = @($deviceRows.Lines | Where-Object { $_ -match '^\S+\s+offline\s*$' })
      Put ('ADB_CONNECTED_DEVICES=' + $ready.Count)
      Put ('ADB_UNAUTHORIZED_DEVICES=' + $unauthorized.Count)
      Put ('ADB_OFFLINE_DEVICES=' + $offline.Count)
      if ($ready.Count -eq 1) {
        # Serial local somente em memoria. Sem shell financeiro, pull, install ou clear.
        $serial = ($ready[0].Trim() -split '\s+')[0]
        $stable = Invoke-ExternalReadOnly -Binary $adbPath -Arguments @(
          '-s',$serial,'shell','pm','path','br.com.megfinancas.app'
        )
        if ($stable.ExitCode -eq 0 -and
            @($stable.Lines | Where-Object { $_ -match '^package:' }).Count -gt 0) {
          Put 'ANDROID_STABLE_PACKAGE=INSTALLED'
          $pkg = Invoke-ExternalReadOnly -Binary $adbPath -Arguments @(
            '-s',$serial,'shell','dumpsys','package','br.com.megfinancas.app'
          )
          if ($pkg.ExitCode -eq 0) {
            $text = $pkg.Lines -join [Environment]::NewLine
            $code = [regex]::Match($text,'(?m)^\s*versionCode=(\d+)').Groups[1].Value
            $name = [regex]::Match($text,'(?m)^\s*versionName=([^\r\n]+)').Groups[1].Value.Trim()
            if ($code) { Put ('ANDROID_STABLE_VERSION_CODE=' + $code) }
            if ($name) { Put ('ANDROID_STABLE_VERSION_NAME=' + $name) }
          } else {
            Put 'ANDROID_STABLE_VERSION=QUERY_FAILED'
          }
        } else {
          Put 'ANDROID_STABLE_PACKAGE=NOT_FOUND'
        }
        $qa = Invoke-ExternalReadOnly -Binary $adbPath -Arguments @(
          '-s',$serial,'shell','pm','path','br.com.megfinancas.app.stage10qa'
        )
        Put ('ANDROID_STAGE10_QA_PACKAGE=' + $(if ($qa.ExitCode -eq 0 -and
          @($qa.Lines | Where-Object { $_ -match '^package:' }).Count -gt 0) {
          'INSTALLED'
        } else { 'NOT_INSTALLED' }))
      } elseif ($ready.Count -gt 1) {
        Put 'ADB_DEVICE_SELECTION=AMBIGUOUS_NO_ACTION'
      }
    }
  }
}

Put 'MEG_STAGE10_READONLY_INVENTORY=END'
$report = $lines -join [Environment]::NewLine
try {
  Set-Clipboard -Value $report
  $copied = ((Get-Clipboard -Raw).TrimEnd() -eq $report.TrimEnd())
  Put ('CLIPBOARD=' + $(if ($copied) { 'OK' } else { 'FALHA' }))
  $report = $lines -join [Environment]::NewLine
  if ($copied) { Set-Clipboard -Value $report }
} catch {
  Put 'CLIPBOARD=FALHA'
  $report = $lines -join [Environment]::NewLine
}
Write-Output $report
