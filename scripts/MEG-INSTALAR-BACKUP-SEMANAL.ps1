# Windows PowerShell 5.1. Run as your regular Windows user, not another account.
# Installs locally, performs one encrypted backup, then schedules if it succeeds.
[CmdletBinding()]
param(
    [string]$Distro = 'Ubuntu-24.04',
    [string]$LinuxUser = 'm_vil'
)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'WINDOWS_REQUIRED' }
foreach ($cmd in @('wsl.exe','Register-ScheduledTask','Get-FileHash')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw ('MISSING_' + $cmd) }
}
$taskName = 'MEG-Backup-Semanal-OneDrive'
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'TASK_EXISTS_NOT_OVERWRITTEN' }
$kitManifest = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'kit-sha256.json') | ConvertFrom-Json
foreach ($property in $kitManifest.PSObject.Properties) {
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $PSScriptRoot $property.Name)).Hash.ToLowerInvariant() -ne $property.Value) {
        throw 'PACKAGE_HASH_INVALID'
    }
}
$state = Join-Path $env:LOCALAPPDATA 'MEG-Backup-Semanal'
if (Test-Path -LiteralPath $state) { throw 'LOCAL_INSTALL_EXISTS_NOT_OVERWRITTEN' }
$oneDrives = @(@($env:OneDrive,$env:OneDriveConsumer,$env:OneDriveCommercial) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique)
if ($oneDrives.Count -eq 1) { $oneDrive = [string]$oneDrives[0] }
else { $oneDrive = Read-Host 'Caminho da pasta OneDrive local ja sincronizada' }
if (-not (Test-Path -LiteralPath $oneDrive -PathType Container)) { throw 'ONEDRIVE_MISSING' }
$hostName = Read-Host 'Host PostgreSQL do projeto meg-financas (Connect, Session Pooler porta 5432 ou direto)'
if ($hostName -ne 'db.ugbiqzaqnrhulhetevby.supabase.co' -and $hostName -notmatch '^[a-zA-Z0-9.-]+\.pooler\.supabase\.com$') { throw 'HOST_NOT_ALLOWED' }
$identity = Read-Host 'Caminho Linux da identidade age local existente (nao a copia USB)'
$ca = Read-Host 'Caminho Linux do certificado CA oficial existente'
if (-not $identity.StartsWith('/') -or -not $ca.StartsWith('/')) { throw 'ABSOLUTE_LINUX_PATH_REQUIRED' }
$credential = Get-Credential -UserName 'postgres.ugbiqzaqnrhulhetevby' -Message 'Senha PostgreSQL somente neste terminal privado. DPAPI protege a copia local para este usuario e computador.'
if (-not $credential) { throw 'CREDENTIAL_CANCELLED' }
$runnerDir = '/home/' + $LinuxUser + '/.meg-stage09-weekly-tools'
& wsl.exe -d $Distro -u $LinuxUser --exec mkdir -m 700 -- $runnerDir
if ($LASTEXITCODE -ne 0) { throw 'WSL_TOOLS_DIRECTORY_FAILED_OR_EXISTS' }
$cloudLinux = (& wsl.exe -d $Distro -u $LinuxUser --exec wslpath -a -u $oneDrive).Trim()
if ($LASTEXITCODE -ne 0 -or -not $cloudLinux.StartsWith('/mnt/')) { throw 'ONEDRIVE_PATH_CONVERSION_FAILED' }
New-Item -ItemType Directory -Path $state | Out-Null
$account = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner($sid)
$acl.SetAccessRuleProtection($true,$false)
$rule = New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $state -AclObject $acl
$hashes = @{}
foreach ($name in @('MEG-EXECUTAR-BACKUP-SEMANAL.ps1','meg-stage09-weekly-backup.py','meg-stage09-safe-backup.sh')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $state $name)
    $hashes[$name] = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $state $name)).Hash.ToLowerInvariant()
}
$unc = '\\wsl.localhost\' + $Distro + ($runnerDir.Replace('/','\'))
foreach ($name in @('meg-stage09-weekly-backup.py','meg-stage09-safe-backup.sh')) {
    Copy-Item -LiteralPath (Join-Path $state $name) -Destination (Join-Path $unc $name)
    & wsl.exe -d $Distro -u $LinuxUser --exec chmod 600 -- ($runnerDir + '/' + $name)
    if ($LASTEXITCODE -ne 0) { throw 'WSL_FILE_PERMISSIONS_FAILED' }
}
$credential | Export-Clixml -LiteralPath (Join-Path $state 'credential.xml')
$credential = $null
$config = @{
    distro=$Distro;linuxUser=$LinuxUser;runnerLinux=($runnerDir + '/meg-stage09-weekly-backup.py');hashes=$hashes
    runtime=@{host=$hostName;identity=$identity;ca=$ca;onedrive_linux=$cloudLinux;backup_sha256=$hashes['meg-stage09-safe-backup.sh']}
}
$config | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $state 'config.json')
$powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$runner = Join-Path $state 'MEG-EXECUTAR-BACKUP-SEMANAL.ps1'
# No ExecutionPolicy bypass. If policy blocks this, report and resolve locally.
& $powerShell -NoProfile -File $runner
if ($LASTEXITCODE -ne 0) { throw 'FIRST_BACKUP_FAILED_TASK_NOT_REGISTERED' }
$action = New-ScheduledTaskAction -Execute $powerShell -Argument ('-NoProfile -File "' + $runner + '"')
$weekly = New-ScheduledTaskTrigger -Weekly -WeeksInterval 1 -DaysOfWeek Sunday -At '10:00'
$logon = New-ScheduledTaskTrigger -AtLogOn -User $account
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 50) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId $account -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($weekly,$logon) -Settings $settings -Principal $principal -Description 'MEG: backup cifrado semanal + copia local OneDrive; exige sessao disponivel. Upload remoto nao comprovado automaticamente.' | Out-Null
$registered = Get-ScheduledTask -TaskName $taskName
if (-not $registered -or $registered.State -eq 'Disabled') { throw 'TASK_NOT_VERIFIED' }
Write-Host 'INSTALACAO=OK'
Write-Host 'TAREFA=MEG-Backup-Semanal-OneDrive'
Write-Host 'AGENDA=DOMINGO_10H_E_LOGIN_SE_VENCIDO_7_DIAS'
Write-Host 'BACKUP_INICIAL_E_COPIA_LOCAL=OK'
Write-Host 'UPLOAD_REMOTO=CONFIRMAR_NO_ONEDRIVE_WEB'
