# Teste sintetico: nenhum aparelho, nenhum servidor e nenhum dado real.
$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'meg-stage10-android-installed-readonly.ps1'
$originalPath = $env:PATH
$originalMode = $env:MEG_STAGE10_ADB_TEST_MODE
$fakeDir = Join-Path ([IO.Path]::GetTempPath()) ('meg-stage10-adb-fake-' + [guid]::NewGuid().ToString('N'))

try {
  New-Item -ItemType Directory -Path $fakeDir -Force | Out-Null
  $fakeAdb = Join-Path $fakeDir 'adb'
  $fakeContents = @'
#!/usr/bin/env bash
case "$1" in
  start-server)
    echo "* daemon not running; starting now at tcp:5037" >&2
    exit 0
    ;;
  devices)
    printf 'List of devices attached\n'
    if [ "$MEG_STAGE10_ADB_TEST_MODE" = "connected" ]; then
      printf 'qa-synthetic-device\tdevice\n'
    fi
    exit 0
    ;;
  -s)
    if [ "$3" = "shell" ] && [ "$4" = "dumpsys" ] && [ "$5" = "package" ] && [ "$6" = "br.com.megfinancas.app" ]; then
      printf 'versionCode=708 minSdk=27 targetSdk=35\nversionName=2.0.708\n'
      exit 0
    fi
    exit 2
    ;;
esac
exit 2
'@
  [IO.File]::WriteAllText($fakeAdb, $fakeContents + [Environment]::NewLine)
  & chmod +x $fakeAdb
  if ($LASTEXITCODE -ne 0) { throw 'FAKE_ADB_CHMOD_FAILED' }
  $env:PATH = $fakeDir + [IO.Path]::PathSeparator + $originalPath

  $env:MEG_STAGE10_ADB_TEST_MODE = 'disconnected'
  $disconnected = (& pwsh -NoProfile -NonInteractive -File $scriptPath 2>&1 | Out-String)
  if ($LASTEXITCODE -ne 0 -or $disconnected -notmatch 'STATUS=DISPOSITIVOS_AUTORIZADOS=0') {
    throw 'STAGE10_ANDROID_FAKE_NO_DEVICE_FAILED'
  }

  $env:MEG_STAGE10_ADB_TEST_MODE = 'connected'
  $connected = (& pwsh -NoProfile -NonInteractive -File $scriptPath 2>&1 | Out-String)
  if ($LASTEXITCODE -ne 0) { throw 'STAGE10_ANDROID_FAKE_CONNECTED_EXIT_CODE' }
  foreach ($required in @(
    'STATUS=METADADOS_INSTALADOS_CONFIRMADOS'
    'VERSAO_INSTALADA=2\.0\.708'
    'VERSION_CODE=708'
    'PACOTE_PRESENTE=SIM'
  )) {
    if ($connected -notmatch $required) { throw ('STAGE10_ANDROID_FAKE_CONNECTED_MISSING_' + $required) }
  }
  if ($connected -match 'qa-synthetic-device') {
    throw 'STAGE10_ANDROID_FAKE_LEAKED_DEVICE_IDENTIFIER'
  }

  Write-Output 'STAGE10_ANDROID_POWERSHELL_FAKE_ADB_RUNTIME=PASS'
} finally {
  $env:PATH = $originalPath
  if ($null -eq $originalMode) {
    Remove-Item Env:MEG_STAGE10_ADB_TEST_MODE -ErrorAction SilentlyContinue
  } else {
    $env:MEG_STAGE10_ADB_TEST_MODE = $originalMode
  }
  Remove-Item -LiteralPath $fakeDir -Force -Recurse -ErrorAction SilentlyContinue
}
