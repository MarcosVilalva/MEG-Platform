# MEG Etapa 10 | Hash somente leitura do APK instalado, sem copiar arquivos
$ErrorActionPreference = 'Stop'
$pkg = 'br.com.megfinancas.app'
$expected = '1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6'

function Report([string]$status, [string]$hash = 'NAO_VERIFICADO') {
  $comparison = 'INDETERMINADO'
  if ($status -eq 'HASH_IGUAL_A_RELEASE') { $comparison = 'SIM' }
  if ($status -eq 'HASH_DIFERENTE_DA_RELEASE') { $comparison = 'NAO' }
  $report = @(
    'MEG_STAGE10_ANDROID_APK_HASH=READ_ONLY'
    "STATUS=$status"
    "PACOTE=$pkg"
    "HASH_APK_INSTALADO=$hash"
    "HASH_APK_RELEASE=$expected"
    "MESMO_BINARIO_DA_RELEASE=$comparison"
    'DADOS_FINANCEIROS_EXTRAIDOS=NAO'
    'APK_INSTALADA_OU_ALTERADA=NAO'
  ) -join [Environment]::NewLine
  Write-Output $report
  try { Set-Clipboard -Value $report -ErrorAction Stop } catch {}
}

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  $locations = @(
    (Join-Path $env:LOCALAPPDATA 'MEG\AndroidTools\platform-tools\adb.exe')
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe')
  )
  foreach ($location in $locations) {
    if (Test-Path -LiteralPath $location) {
      $adb = Get-Command $location -ErrorAction SilentlyContinue
      break
    }
  }
}
if (-not $adb) { Report 'ADB_NAO_LOCALIZADO'; exit 0 }

function Invoke-AdbReadOnly([string[]]$argsList) {
  $old = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $lines = @(& $adb.Source @argsList 2>$null)
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $old
  }
  return @{ Lines = $lines; ExitCode = $code }
}

$devices = Invoke-AdbReadOnly -argsList @('devices')
if ($devices.ExitCode -ne 0) { Report 'ADB_DEVICES_FALHOU'; exit 0 }
$authorized = @($devices.Lines | Where-Object { $_ -match '^\S+\s+device\s*$' })
if ($authorized.Count -ne 1) {
  Report ('DISPOSITIVOS_AUTORIZADOS=' + $authorized.Count)
  exit 0
}
$serial = ([regex]::Match([string]$authorized[0], '^\S+')).Value
$paths = Invoke-AdbReadOnly -argsList @('-s', $serial, 'shell', 'pm', 'path', $pkg)
if ($paths.ExitCode -ne 0) { Report 'PM_PATH_FALHOU'; exit 0 }
$apkPaths = @($paths.Lines | Where-Object { $_ -match '^package:(/.+\.apk)\s*$' } |
    ForEach-Object { ([regex]::Match([string]$_, '^package:(/.+\.apk)\s*$')).Groups[1].Value })
if ($apkPaths.Count -eq 0) { Report 'PACOTE_OU_CAMINHO_NAO_ENCONTRADO'; exit 0 }
if ($apkPaths.Count -ne 1) { Report 'SPLIT_APK_HASH_NAO_COMPARAVEL'; exit 0 }

$apkPath = [string]$apkPaths[0]
if ($apkPath -notmatch '^/[A-Za-z0-9._~+/=-]+\.apk$') {
  Report 'CAMINHO_APK_INVALIDO'
  exit 0
}
$checksum = Invoke-AdbReadOnly -argsList @('-s', $serial, 'shell', 'sha256sum', $apkPath)
if ($checksum.ExitCode -ne 0) { Report 'SHA256SUM_INDISPONIVEL_OU_NEGADO'; exit 0 }
$hashString = $checksum.Lines -join [Environment]::NewLine
$matchResult = [regex]::Match($hashString, '(?i)\b([0-9a-f]{64})\s+')
if (-not $matchResult.Success) { Report 'HASH_NAO_RECONHECIDO'; exit 0 }
$actual = $matchResult.Groups[1].Value.ToLowerInvariant()
if ($actual -eq $expected) {
  Report 'HASH_IGUAL_A_RELEASE' $actual
} else {
  Report 'HASH_DIFERENTE_DA_RELEASE' $actual
}
