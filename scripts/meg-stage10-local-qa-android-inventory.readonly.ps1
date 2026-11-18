# MEG ETAPA 10: inventario local. Nenhuma escrita em banco, aparelho ou projeto.
# Codigo publico: NAO colocar IDs, valores, senhas, JWTs ou serial ADB.
cls
$ErrorActionPreference = 'Stop'
$lines = New-Object 'System.Collections.Generic.List[string]'
function Put([string]$value) { [void]$lines.Add($value) }
Put 'MEG_STAGE10_READONLY_INVENTORY=START'
Put 'PRODUCAO_ACESSADA=NAO'
Put 'BANCO_MODIFICADO=NAO'
Put 'ANDROID_MODIFICADO=NAO'

if (-not (Get-Command 'wsl.exe' -ErrorAction SilentlyContinue)) {
  Put 'WSL=NOT_AVAILABLE'
} else {
  try {
    $clusterLines = @(& wsl.exe -d Ubuntu-24.04 -u m_vil -- pg_lsclusters --no-header 2>&1)
    if ($LASTEXITCODE -ne 0) {
      Put 'QA_CLUSTER=LIST_FAILED'
    } else {
      $match = @($clusterLines | Where-Object { $_ -match '^\s*17\s+meg_stage10_qa\s+5448\s+' })
      if ($match.Count -ne 1) {
        Put 'QA_CLUSTER=NOT_FOUND_OR_AMBIGUOUS'
      } else {
        $parts = ($match[0].Trim() -split '\s+')
        $status = $parts[3]
        Put 'QA_CLUSTER=17/meg_stage10_qa'
        Put 'QA_PORT=5448'
        Put ('QA_STATUS=' + $status)
        if ($status -eq 'online') {
          # Postgres acessado SOMENTE por socket Unix e role sem senha.
          # A consulta nao inclui nenhuma tabela financeira.
          $sql = "SELECT concat('LOCAL_SOCKET=',CASE WHEN inet_server_addr() IS NULL THEN 'YES' ELSE 'NO' END,';DB=',current_database(),';ROLE=',current_user,';PG_VERSION=',current_setting('server_version'),';READ_ONLY=',current_setting('default_transaction_read_only'),';BYPASS_RLS=',CASE WHEN (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) THEN 'YES' ELSE 'NO' END)"
          $probe = @(& wsl.exe -d Ubuntu-24.04 -u m_vil -- psql -w -X -A -t -h /var/run/postgresql -p 5448 -U m_vil -d meg_stage10_qa -v ON_ERROR_STOP=1 -c $sql 2>&1)
          if ($LASTEXITCODE -eq 0 -and $probe.Count -gt 0) {
            $safe = $probe[-1].Trim()
            if ($safe -match '^LOCAL_SOCKET=YES;DB=meg_stage10_qa;ROLE=m_vil;PG_VERSION=17\.' -and
                $safe -match ';READ_ONLY=on;BYPASS_RLS=NO$') {
              Put 'QA_GUARD=PASS'
              Put 'QA_DATABASE=meg_stage10_qa'
              Put 'QA_ROLE=m_vil'
              Put 'QA_ROLE_READONLY=ON'
              Put 'QA_BYPASS_RLS=NO'
            } else {
              Put 'QA_GUARD=FAIL_CLOSED'
            }
          } else {
            Put 'QA_GUARD=PSQL_FAILED'
          }
        } else {
          Put 'QA_GUARD=NOT_TESTED_CLUSTER_NOT_ONLINE'
        }
      }
    }
  } catch {
    Put 'QA_CLUSTER=QUERY_ERROR'
  }
}

if (-not (Get-Command 'adb.exe' -ErrorAction SilentlyContinue)) {
  Put 'ADB=NOT_AVAILABLE'
} else {
  try {
    $deviceRows = @(& adb.exe devices 2>&1)
    $ready = @($deviceRows | Where-Object { $_ -match '^\S+\s+device\s*$' })
    $unauthorized = @($deviceRows | Where-Object { $_ -match '^\S+\s+unauthorized\s*$' })
    Put ('ADB_CONNECTED_DEVICES=' + $ready.Count)
    if ($unauthorized.Count -gt 0) { Put 'ADB_USB_AUTHORIZATION=PENDING' }
    if ($ready.Count -eq 1) {
      # O serial e usado apenas na memoria; NUNCA entra no relatorio.
      $serial = ($ready[0].Trim() -split '\s+')[0]
      $stablePath = @(& adb.exe -s $serial shell pm path br.com.megfinancas.app 2>&1)
      if ($LASTEXITCODE -eq 0 -and @($stablePath | Where-Object { $_ -match '^package:' }).Count -gt 0) {
        Put 'ANDROID_STABLE_PACKAGE=INSTALLED'
        $pkgLines = @(& adb.exe -s $serial shell dumpsys package br.com.megfinancas.app 2>&1)
        if ($LASTEXITCODE -eq 0) {
          $pkg = $pkgLines -join [Environment]::NewLine
          $code = [regex]::Match($pkg,'(?m)^\s*versionCode=(\d+)').Groups[1].Value
          $name = [regex]::Match($pkg,'(?m)^\s*versionName=([^\r\n]+)').Groups[1].Value.Trim()
          if ($code) { Put ('ANDROID_STABLE_VERSION_CODE=' + $code) }
          if ($name) { Put ('ANDROID_STABLE_VERSION_NAME=' + $name) }
        } else { Put 'ANDROID_STABLE_VERSION=NOT_READABLE' }
      } else {
        Put 'ANDROID_STABLE_PACKAGE=NOT_FOUND'
      }
      $qaPath = @(& adb.exe -s $serial shell pm path br.com.megfinancas.app.stage10qa 2>&1)
      if ($LASTEXITCODE -eq 0 -and @($qaPath | Where-Object { $_ -match '^package:' }).Count -gt 0) {
        Put 'ANDROID_STAGE10_QA_PACKAGE=INSTALLED'
      } else {
        Put 'ANDROID_STAGE10_QA_PACKAGE=NOT_INSTALLED'
      }
      # Sem adb install, reverse, clear, reboot, logcat, pull ou comandos que alteram o aparelho.
    } elseif ($ready.Count -gt 1) {
      Put 'ADB_DEVICE_SELECTION=AMBIGUOUS_NO_ACTION'
    }
  } catch {
    Put 'ADB_DIAGNOSTIC=ERROR'
  }
}

Put 'MEG_STAGE10_READONLY_INVENTORY=END'
$report = $lines -join [Environment]::NewLine
try {
  Set-Clipboard -Value $report
  $verified = ((Get-Clipboard -Raw).TrimEnd() -eq $report.TrimEnd())
  Put ('CLIPBOARD=' + $(if ($verified) { 'OK' } else { 'FALHA' }))
  $report = $lines -join [Environment]::NewLine
  if ($verified) {
    Set-Clipboard -Value $report
    if ((Get-Clipboard -Raw).TrimEnd() -ne $report.TrimEnd()) {
      $lines[$lines.Count - 1] = 'CLIPBOARD=FALHA'
      $report = $lines -join [Environment]::NewLine
    }
  }
} catch {
  Put 'CLIPBOARD=FALHA'
  $report = $lines -join [Environment]::NewLine
}
Write-Output $report
