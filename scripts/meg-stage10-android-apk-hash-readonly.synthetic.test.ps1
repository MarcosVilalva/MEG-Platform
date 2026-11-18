# QA 100% sintetico: metadados de dispositivo ficticio, sem ADB real.
$ErrorActionPreference = 'Stop'
$target = Join-Path $PSScriptRoot 'meg-stage10-android-apk-hash-readonly.ps1'
$oldPath = $env:PATH
$oldMode = $env:MEG_STAGE10_HASH_FAKE
$testDir = Join-Path ([IO.Path]::GetTempPath()) ('meg-adb-hash-qa-' + [guid]::NewGuid().ToString('N'))
try {
  New-Item -ItemType Directory -Path $testDir -Force | Out-Null
  $fake = @'
#!/usr/bin/env bash
if [ "$1" = "devices" ]; then
  echo "List of devices attached"
  printf 'fictional-qa-serial\tdevice\n'
  exit 0
fi
if [ "$1" = "-s" ] && [ "$3" = "shell" ]; then
  if [ "$4" = "pm" ] && [ "$5" = "path" ] && [ "$6" = "br.com.megfinancas.app" ]; then
    printf 'package:/data/app/~~fictional/meg/base.apk\n'
    exit 0
  fi
  if [ "$4" = "sha256sum" ] && [ "$5" = "/data/app/~~fictional/meg/base.apk" ]; then
    if [ "$MEG_STAGE10_HASH_FAKE" = "match" ]; then
      printf '1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6  /data/app/~~fictional/meg/base.apk\n'
    else
      printf 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  /data/app/~~fictional/meg/base.apk\n'
    fi
    exit 0
  fi
fi
exit 4
'@
  $fakePath = Join-Path $testDir 'adb'
  [IO.File]::WriteAllText($fakePath, $fake + [Environment]::NewLine)
  & chmod +x $fakePath
  if ($LASTEXITCODE -ne 0) { throw 'CHMOD_FAILED' }
  $env:PATH = $testDir + [IO.Path]::PathSeparator + $oldPath

  $env:MEG_STAGE10_HASH_FAKE = 'match'
  $output = & pwsh -NoProfile -NonInteractive -File $target 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw 'FAKE_HASH_MATCH_EXIT_FAILED' }
  if ($output -notmatch 'STATUS=HASH_IGUAL_A_RELEASE') { throw 'FAKE_HASH_MATCH_STATUS_FAILED' }
  if ($output -notmatch 'MESMO_BINARIO_DA_RELEASE=SIM') { throw 'FAKE_HASH_MATCH_RESULT_FAILED' }
  if ($output -match 'fictional-qa-serial') { throw 'FAKE_HASH_SERIAL_LEAK' }

  $env:MEG_STAGE10_HASH_FAKE = 'different'
  $output = & pwsh -NoProfile -NonInteractive -File $target 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw 'FAKE_HASH_DIFF_EXIT_FAILED' }
  if ($output -notmatch 'STATUS=HASH_DIFERENTE_DA_RELEASE') { throw 'FAKE_HASH_DIFF_STATUS_FAILED' }
  if ($output -notmatch 'MESMO_BINARIO_DA_RELEASE=NAO') { throw 'FAKE_HASH_DIFF_RESULT_FAILED' }
  Write-Output 'MEG_STAGE10_ANDROID_INSTALLED_APK_HASH_QA_SYNTHETIC_PASS'
} finally {
  $env:PATH = $oldPath
  if ($null -eq $oldMode) {
    Remove-Item Env:MEG_STAGE10_HASH_FAKE -ErrorAction SilentlyContinue
  } else {
    $env:MEG_STAGE10_HASH_FAKE = $oldMode
  }
  Remove-Item -LiteralPath $testDir -Force -Recurse -ErrorAction SilentlyContinue
}
