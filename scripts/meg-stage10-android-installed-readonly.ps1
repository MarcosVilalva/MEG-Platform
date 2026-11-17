# MEG Stage10 | Diagnostico Android instalado | estritamente somente leitura
# Nao instala APK, nao faz root, nao altera app, nao extrai dados, nao executa sync.
$ErrorActionPreference = 'Stop'
$pkg = 'br.com.megfinancas.app'

function Report([string]$status, [string]$installedVersion, [string]$versionCode, [string]$packageFound) {
  $lines = @(
    'MEG_STAGE10_ANDROID_DIAGNOSTICO=READ_ONLY',
    'STATUS=' + $status,
    'PACOTE=' + $pkg,
    'VERSAO_INSTALADA=' + $installedVersion,
    'VERSION_CODE=' + $versionCode,
    'PACOTE_PRESENTE=' + $packageFound,
    'TESTE_OFFLINE_OUTBOX=NAO_EXECUTADO',
    'DADOS_FINANCEIROS_EXTRAIDOS=NAO'
  )
  $out = $lines -join [Environment]::NewLine
  Write-Output $out
  try { Set-Clipboard -Value $out -ErrorAction Stop } catch {}
}

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Report 'ADB_NAO_LOCALIZADO' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO_VERIFICADO'
  exit 0
}

# A lista de seriais nao sera exibida nem copiada.
$devicesOutput = @(& adb devices 2>$null)
$available = @($devicesOutput | Where-Object { $_ -match '^(\S+)\s+device\s*$' })
if ($available.Count -ne 1) {
  Report ('DISPOSITIVOS_AUTORIZADOS=' + $available.Count) 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO_VERIFICADO'
  exit 0
}

$serial = ([regex]::Match([string]$available[0], '^(\S+)')).Groups[1].Value
$dump = @(& adb -s $serial shell dumpsys package $pkg 2>$null)
if ($LASTEXITCODE -ne 0) {
  Report 'ADB_DUMPSYS_FALHOU' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO_VERIFICADO'
  exit 0
}

$body = $dump -join [Environment]::NewLine
$versionNameMatch = [regex]::Match($body, 'versionName=([^\s]+)')
$versionCodeMatch = [regex]::Match($body, 'versionCode=(\d+)')
$found = $versionNameMatch.Success -and $versionCodeMatch.Success
if (-not $found) {
  Report 'PACOTE_NAO_LOCALIZADO_OU_METADADOS_INDISPONIVEIS' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO'
  exit 0
}

# Nenhum identificador pessoal, serial, logcat, token ou dado do app e recolhido.
Report 'METADADOS_INSTALADOS_CONFIRMADOS' $versionNameMatch.Groups[1].Value $versionCodeMatch.Groups[1].Value 'SIM'
