[CmdletBinding()]
param([switch]$Force)
$ErrorActionPreference = 'Stop'
$exitCode = 1
try {
    $state = Join-Path $env:LOCALAPPDATA 'MEG-Backup-Semanal'
    $config = Get-Content -Raw -LiteralPath (Join-Path $state 'config.json') | ConvertFrom-Json
    foreach ($name in @('MEG-EXECUTAR-BACKUP-SEMANAL.ps1','meg-stage09-weekly-backup.py','meg-stage09-safe-backup.sh')) {
        $expected = $config.hashes.$name
        if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $state $name)).Hash.ToLowerInvariant() -ne $expected) {
            throw 'KIT_HASH_INVALID'
        }
    }
    $credential = Import-Clixml -LiteralPath (Join-Path $state 'credential.xml')
    $request = @{config=$config.runtime;password=$credential.GetNetworkCredential().Password;force=[bool]$Force}
    $json = $request | ConvertTo-Json -Depth 6 -Compress
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
    $result = $encoded | & wsl.exe -d $config.distro -u $config.linuxUser --exec python3 $config.runnerLinux 2>$null
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { throw 'WSL_BACKUP_FAILED' }
    $report = ([string]::Join("`n", $result)) | ConvertFrom-Json
    $report | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $state 'last-report.json')
    Write-Host ('RESULTADO=' + $report.status)
    Write-Host 'UPLOAD_REMOTO=NAO_COMPROVADO_PELA_COPIA_LOCAL'
} catch {
    $exitCode = 1
    Write-Host 'RESULTADO=FALHA_REVISAR_LOCALMENTE_SEM_REPETICAO_AUTOMATICA'
} finally {
    $request = $null; $json = $null; $encoded = $null; $credential = $null
}
exit $exitCode
