# MEG Stage10 | Diagnostico Android instalado | estritamente somente leitura
# Nao instala APK, nao faz root, nao altera app, nao extrai dados, nao executa sync.
$ErrorActionPreference = 'Stop'
$pkg = 'br.com.megfinancas.app'

function Report([string]$status, [string]$installedVersion, [string]$versionCode, [string]$packageFound) {
  $lines = @(
    'MEG_STAGE10_ANDROID_DIAGNOSTICO=READ_ONLY'
    'STATUS=' + $status
    'PACOTE=' + $pkg
    'VERSAO_INSTALADA=' + $installedVersion
    'VERSION_CODE=' + $versionCode
    'PACOTE_PRESENTE=' + $packageFound
    'TESTE_OFFLINE_OUTBOX=NAO_EXECUTADO'
    'DADOS_FINANCEIROS_EXTRAIDOS=NAO'
  )
  $out = $lines -join [Environment]::NewLine
  Write-Output $out
  try { Set-Clipboard -Value $out -ErrorAction Stop } catch {}
}

# Reutiliza ADB disponivel no PATH ou o SDK instalado na pasta do usuario.
$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  $knownPaths = @(
    (Join-Path $env:LOCALAPPDATA 'MEG\AndroidTools\platform-tools\adb.exe')
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe')
  )
  $candidate = $knownPaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($candidate) { $adb = Get-Command $candidate -ErrorAction SilentlyContinue }
}
if (-not $adb) {
  Report 'ADB_NAO_LOCALIZADO' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO_VERIFICADO'
  exit 0
}

# PowerShell 5.1 pode transformar stderr do ADB em NativeCommandError durante start-server.
# Somente para chamadas de leitura, nao interromper com mensagens esperadas do daemon.
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

# Nao imprimir nem copiar identificadores do dispositivo.
$devices = Invoke-AdbReadOnly -commandArgs @('devices')
if ($devices.ExitCode -ne 0) {
  Report 'ADB_DEVICES_FALHOU' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO_VERIFICADO'
  exit 0
}

$available = @($devices.Lines | Where-Object { $_ -match '^\S+\s+device\s*$' })
if ($available.Count -ne 1) {
  Report ('DISPOSITIVOS_AUTORIZADOS=' + $available.Count) 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO_VERIFICADO'
  exit 0
}

$serial = ([regex]::Match([string]$available[0], '^\S+')).Value
$dump = Invoke-AdbReadOnly -commandArgs @('-s', $serial, 'shell', 'dumpsys', 'package', $pkg)
if ($dump.ExitCode -ne 0) {
  Report 'ADB_DUMPSYS_FALHOU' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO_VERIFICADO'
  exit 0
}

$body = $dump.Lines -join [Environment]::NewLine
$versionNameMatch = [regex]::Match($body, 'versionName=([^\s]+)')
$versionCodeMatch = [regex]::Match($body, 'versionCode=(\d+)')
if (-not ($versionNameMatch.Success -and $versionCodeMatch.Success)) {
  Report 'PACOTE_NAO_LOCALIZADO_OU_METADADOS_INDISPONIVEIS' 'NAO_VERIFICADA' 'NAO_VERIFICADO' 'NAO'
  exit 0
}

# Consulta somente metadados de instalacao, sem acessar dados do aplicativo.
Report 'METADADOS_INSTALADOS_CONFIRMADOS' $versionNameMatch.Groups[1].Value $versionCodeMatch.Groups[1].Value 'SIM'
