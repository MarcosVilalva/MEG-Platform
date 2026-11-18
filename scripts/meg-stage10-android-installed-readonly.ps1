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

# ADB pode emitir mensagens normais no stderr ao iniciar o daemon.
# PowerShell 5.1 transforma esse stderr em erro quando ErrorActionPreference=Stop.
# Isolar somente o comando nativo evita interrupcao e verifica o exit code.
function Invoke-AdbReadOnly([string[]]$commandArgs) {
  $oldPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $lines = @(& $adb.Source @commandArgs 2>$null)
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $oldPreference
  }
  return @{ Lines = $lines; ExitCode = $exitCode }
}

$startup = Invoke-AdbReadOnly -commandArgs @('start-server')
if ($startup.ExitCode -ne 0) {
  Report 'ADB_START_SERVER_FALHOU' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO_VERIFICADO'
  exit 0
}

# Seriais nao sao exibidos, copiados nem gravados.
$devices = Invoke-AdbReadOnly -commandArgs @('devices')
if ($devices.ExitCode -ne 0) {
  Report 'ADB_DEVICES_FALHOU' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO_VERIFICADO'
  exit 0
}
$available = @($devices.Lines | Where-Object { $_ -match '^(\S+)\s+device\s*
$versionNameMatch = [regex]::Match($body, 'versionName=([^\s]+)')
$versionCodeMatch = [regex]::Match($body, 'versionCode=(\d+)')
$found = $versionNameMatch.Success -and $versionCodeMatch.Success
if (-not $found) {
  Report 'PACOTE_NAO_LOCALIZADO_OU_METADADOS_INDISPONIVEIS' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO'
  exit 0
}

# Nenhum identificador pessoal, serial, logcat, token ou dado do app e recolhido.
Report 'METADADOS_INSTALADOS_CONFIRMADOS' $versionNameMatch.Groups[1].Value $versionCodeMatch.Groups[1].Value 'SIM'
 })
if ($available.Count -ne 1) {
  Report ('DISPOSITIVOS_AUTORIZADOS=' + $available.Count) 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO_VERIFICADO'
  exit 0
}

$serial = ([regex]::Match([string]$available[0], '^(\S+)')).Groups[1].Value
$dump = Invoke-AdbReadOnly -commandArgs @('-s', $serial, 'shell', 'dumpsys', 'package', $pkg)
if ($dump.ExitCode -ne 0) {
  Report 'ADB_DUMPSYS_FALHOU' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO_VERIFICADO'
  exit 0
}

$body = $dump.Lines -join [Environment]::NewLine
$versionNameMatch = [regex]::Match($body, 'versionName=([^\s]+)')
$versionCodeMatch = [regex]::Match($body, 'versionCode=(\d+)')
$found = $versionNameMatch.Success -and $versionCodeMatch.Success
if (-not $found) {
  Report 'PACOTE_NAO_LOCALIZADO_OU_METADADOS_INDISPONIVEIS' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO'
  exit 0
}

# Nenhum identificador pessoal, serial, logcat, token ou dado do app e recolhido.
Report 'METADADOS_INSTALADOS_CONFIRMADOS' $versionNameMatch.Groups[1].Value $versionCodeMatch.Groups[1].Value 'SIM'
