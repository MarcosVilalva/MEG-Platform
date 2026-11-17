# MEG WEB EVOLUTION / ETAPA 10 / CONSULTA SOMENTE LEITURA.
# Identifica a versao realmente instalada no Android fisicamente conectado.
# Nao instala/atualiza/reinicia aplicativo, nao acessa dados MEG ou internet.
# Executar APENAS pelo responsavel num computador com ADB e aparelho autorizado.
param(
    [string]$PackageName = 'br.com.megfinancas.app'
)
$ErrorActionPreference = 'Stop'
if ($PackageName -ne 'br.com.megfinancas.app') {
    throw 'STAGE10_ANDROID_TARGET_NOT_ALLOWED'
}
$command = Get-Command adb -ErrorAction SilentlyContinue
if (-not $command) {
    throw 'ADB_NAO_DISPONIVEL: consulta nao executada'
}
$devices = @(& $command.Source devices 2>&1)
$connected = @($devices | Where-Object { $_ -match '^\S+\s+device\s*$' })
if ($connected.Count -ne 1) {
    throw "ADB_REQUER_EXATAMENTE_UM_APARELHO_AUTORIZADO: encontrado=$($connected.Count)"
}
$info = @(& $command.Source shell dumpsys package $PackageName 2>&1)
if ($LASTEXITCODE -ne 0) {
    throw 'ADB_DUMPSYS_FALHOU: nenhuma conclusao sobre a versao instalada'
}
$raw = $info -join "`n"
$versionCode = [regex]::Match($raw, '(?m)^\s*versionCode=(\d+)\b')
$versionName = [regex]::Match($raw, '(?m)^\s*versionName=([^\r\n]+)')
$installed = [regex]::Match($raw, '(?m)^\s*firstInstallTime=([^\r\n]+)')
$updated = [regex]::Match($raw, '(?m)^\s*lastUpdateTime=([^\r\n]+)')
if (-not $versionCode.Success -or -not $versionName.Success) {
    throw 'STAGE10_APK_NAO_INSTALADA_OU_VERSAO_INDISPONIVEL'
}
$result = [PSCustomObject]@{
    Contexto = 'MEG Etapa 10 - leitura do Android realmente conectado'
    Pacote = $PackageName
    Versao = $versionName.Groups[1].Value.Trim()
    VersionCode = [int]$versionCode.Groups[1].Value
    PrimeiraInstalacao = if ($installed.Success) { $installed.Groups[1].Value.Trim() } else { 'INDETERMINADA' }
    UltimaAtualizacao = if ($updated.Success) { $updated.Groups[1].Value.Trim() } else { 'INDETERMINADA' }
    Modo = 'SOMENTE_LEITURA'
    DadosFinanceirosLidos = $false
}
$result | ConvertTo-Json -Depth 3
