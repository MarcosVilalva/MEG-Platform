#!/usr/bin/env bash
# Read-only export of the original Supabase Vault/pgsodium root key.
# The unencrypted key is held in process memory only and NEVER printed.
set -Eeuo pipefail
umask 077
fail() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }
for cmd in curl age sha256sum mktemp date python3; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Comando necessario ausente: $cmd"
done
: "${SUPABASE_ACCESS_TOKEN:?PAT deve ser fornecido SOMENTE no terminal privado}"
: "${MEG_VAULT_KEY_BACKUP_DIR:?Caminho SEPARADO para salvar a chave raiz criptografada}"
: "${MEG_AGE_RECIPIENT:?Chave PUBLICA age necessaria}"
: "${MEG_AGE_IDENTITY:?Caminho da identidade privada age para verificacao local}"
[[ "$SUPABASE_ACCESS_TOKEN" =~ ^[a-zA-Z0-9._-]+$ ]] || fail 'Formato do token invalido.'
[[ "$MEG_AGE_RECIPIENT" == age1* && -r "$MEG_AGE_IDENTITY" ]] || fail 'Par age de criptografia indisponivel.'

readonly project_ref='ugbiqzaqnrhulhetevby'
vault_dir="$(mkdir -p -- "$MEG_VAULT_KEY_BACKUP_DIR" && cd -- "$MEG_VAULT_KEY_BACKUP_DIR" && pwd -P)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -n "$repo_root" ]]; then
  repo_root="$(cd "$repo_root" && pwd -P)"
  [[ "$vault_dir" != "$repo_root" && "$vault_dir" != "$repo_root/"* ]] || fail 'Proibido salvar segredo mesmo criptografado dentro do Git.'
fi

# -K / --config - le o cabecalho do stdin: PAT NAO aparece nos argumentos
# do processo curl, na URL, nos logs ou em arquivos locais.
key="$(printf 'header = "Authorization: Bearer %s"\n' "$SUPABASE_ACCESS_TOKEN" \
  | curl -fSs --retry 0 --config - "https://api.supabase.com/v1/projects/${project_ref}/pgsodium" \
  | python3 -c 'import sys,json,re
v=sys.stdin.read().strip()
try: obj=json.loads(v)
except json.JSONDecodeError: obj=v
if not isinstance(obj,str) or re.fullmatch(r"[0-9a-fA-F]{64}",obj) is None:
    raise SystemExit("API Vault nao retornou chave hexadecimal valida")
sys.stdout.write(obj)')" || fail 'Falha na consulta LEITURA da chave-raiz do Vault.'
[[ "$key" =~ ^[0-9a-fA-F]{64}$ ]] || fail 'Chave-raiz fora do formato esperado.'

stamp="$(date -u '+%Y%m%dT%H%M%SZ')"
base="meg-financas-vault-rootkey-${stamp}-$$"
workdir="$(mktemp -d "$vault_dir/.meg-vault-key-work.XXXXXXXX")"
trap 'rm -rf -- "$workdir"; unset key' EXIT
encrypted="$workdir/${base}.rootkey.age"
# O pipe conduz 64 bytes diretamente ao age, sem arquivo plaintext em disco.
printf '%s' "$key" | age -r "$MEG_AGE_RECIPIENT" -o "$encrypted"
unset key
[[ -s "$encrypted" ]] || fail 'Arquivo criptografado vazio.'
# Descriptografia para leitura transitoria e validacao de formato, sem imprimir.
decrypted="$(age -d -i "$MEG_AGE_IDENTITY" "$encrypted")" || fail 'Arquivo Vault nao pode ser decifrado.'
[[ "$decrypted" =~ ^[0-9a-fA-F]{64}$ ]] || fail 'Chave Vault decifrada invalida.'
unset decrypted
hash="$(sha256sum "$encrypted" | awk '{print $1}')"
[[ ! -e "$vault_dir/${base}.rootkey.age" ]] || fail 'Nome de backup Vault repetido.'
mv -- "$encrypted" "$vault_dir/${base}.rootkey.age"
cat > "$vault_dir/${base}.manifest.txt" <<MANIFEST
project_ref=$project_ref
created_at_utc=$stamp
encrypted_file=${base}.rootkey.age
archive_sha256=$hash
root_key_plaintext_exposed=NO
retrieval_method=Supabase_Management_API_GET_pgsodium
restore_project=NOT_ATTEMPTED
MANIFEST
printf 'CHAVE-RAIZ VAULT GUARDADA CRIPTOGRAFADA EM: %s\n' "$vault_dir/${base}.rootkey.age"
printf 'Nao copie este arquivo nem a identidade privada age para o GitHub ou ChatGPT.\n'
