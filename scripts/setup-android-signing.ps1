param(
  [string]$OutputDirectory = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'MEG-Android-Signing')
)

$ErrorActionPreference = 'Stop'
$keytool = 'C:\Users\m_vil\.gradle\temurin17\jdk-17.0.19+10\bin\keytool.exe'
if (-not (Test-Path -LiteralPath $keytool)) {
  $keytool = (Get-Command keytool.exe -ErrorAction Stop).Source
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$keystore = Join-Path $OutputDirectory 'meg-financas-release.jks'
$instructions = Join-Path $OutputDirectory 'GITHUB-SECRETS.txt'
if (Test-Path -LiteralPath $keystore) {
  throw "A chave já existe em $keystore. Ela não foi substituída para proteger as futuras atualizações."
}

$randomBytes = New-Object byte[] 30
$generator = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
$password = ([Convert]::ToBase64String($randomBytes) -replace '[^A-Za-z0-9]', '').Substring(0, 32)
$alias = 'meg-financas'

& $keytool -genkeypair -v -keystore $keystore -alias $alias -keyalg RSA -keysize 4096 -validity 10000 `
  -storepass $password -keypass $password -dname 'CN=MEG Financas, OU=Mobile, O=MEG, L=Presidente Prudente, ST=SP, C=BR'
if ($LASTEXITCODE -ne 0) { throw 'O keytool não conseguiu gerar a chave de assinatura.' }

$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystore))
@"
Cadastre estes quatro Repository secrets em:
GitHub > MEG-Platform > Settings > Secrets and variables > Actions > New repository secret

ANDROID_KEYSTORE_BASE64
$base64

ANDROID_STORE_PASSWORD
$password

ANDROID_KEY_ALIAS
$alias

ANDROID_KEY_PASSWORD
$password

IMPORTANTE: guarde toda esta pasta em backup seguro. Sem a chave JKS não será possível assinar futuras atualizações do mesmo aplicativo.
"@ | Set-Content -LiteralPath $instructions -Encoding UTF8

Write-Host ''
Write-Host 'Chave permanente criada com sucesso.' -ForegroundColor Green
Write-Host "Abra: $instructions"
