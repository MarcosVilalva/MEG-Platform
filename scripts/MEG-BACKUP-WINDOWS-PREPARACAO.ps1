# MEG Backup - diagnostico SOMENTE LEITURA para Windows/WSL.
# Windows PowerShell 5.1 ou PowerShell 7. Nao instala programas.
$ErrorActionPreference = 'SilentlyContinue'
Write-Host 'MEG Backup | diagnostico somente leitura' -ForegroundColor Cyan
Write-Host 'Sem alteracao de seguranca, credenciais ou acesso a bancos.'
$os = Get-CimInstance Win32_OperatingSystem
if ($os) {
  [pscustomobject]@{
    Windows=$os.Caption;Version=$os.Version;Build=$os.BuildNumber;
    Architecture=$env:PROCESSOR_ARCHITECTURE;PowerShell=$PSVersionTable.PSVersion.ToString()
  } | Format-List
}
if (-not (Get-Command wsl.exe)) {
  Write-Host 'FALTANDO: WSL. Nenhuma instalacao foi iniciada.' -ForegroundColor Yellow
  exit 0
}
Write-Host 'Estado do WSL:'
& wsl.exe --status 2>&1 | ForEach-Object { Write-Host "  $_" }
$raw = & wsl.exe --list --quiet 2>$null
$distros = @($raw | ForEach-Object { ([string]$_ -replace [char]0,'').Trim() } | Where-Object { $_ })
if ($distros.Count -eq 0) {
  Write-Host 'FALTANDO: distribuicao Linux no WSL, preferencialmente Ubuntu.' -ForegroundColor Yellow
  exit 0
}
Write-Host 'Distribuicoes instaladas:'
$distros | ForEach-Object { Write-Host "  $_" }
$probe = @'
for x in bash pg_dump pg_restore psql age age-keygen sha256sum python3 curl git; do
 if command -v "$x" >/dev/null 2>&1; then
   printf 'OK|%s|%s\n' "$x" "$(command -v "$x")"
 else
   printf 'MISSING|%s|\n' "$x"
 fi
done
for x in pg_dump pg_restore psql age; do
 if command -v "$x" >/dev/null 2>&1; then
   printf 'VERSION|%s|%s\n' "$x" "$("$x" --version 2>&1 | head -n 1)"
 fi
done
'@
$out = & wsl.exe --exec sh -lc $probe 2>&1
$missing = @()
foreach ($line in $out) {
  $s = ([string]$line -replace [char]0,'').Trim()
  if ($s -match '^OK\|([^|]+)\|(.+)$') {
    Write-Host ('OK       {0}: {1}' -f $Matches[1],$Matches[2])
  } elseif ($s -match '^MISSING\|([^|]+)\|') {
    $missing += $Matches[1]
    Write-Host ('FALTANDO {0}' -f $Matches[1]) -ForegroundColor Yellow
  } elseif ($s -match '^VERSION\|([^|]+)\|(.+)$') {
    Write-Host ('VERSAO   {0}: {1}' -f $Matches[1],$Matches[2])
  } elseif ($s) {
    Write-Host $s
  }
}
if ($missing.Count) {
  Write-Host ('Pendentes: '+($missing -join ', ')) -ForegroundColor Yellow
} else {
  Write-Host 'Ferramentas presentes. Confirme PostgreSQL major 17 antes da exportacao.'
}
Write-Host 'Este diagnostico nao autoriza acesso a producao.'
