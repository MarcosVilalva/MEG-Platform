#!/usr/bin/env bash
# MEG Financas - logical PostgreSQL backup; original project is NEVER modified.
set -Eeuo pipefail
umask 077

fail() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }
require() { command -v "$1" >/dev/null 2>&1 || fail "Comando nao encontrado: $1"; }
for tool in pg_dump pg_restore psql age sha256sum mktemp date grep awk wc tr stat; do require "$tool"; done

readonly project_ref='ugbiqzaqnrhulhetevby'
: "${PGHOST:?Informe PGHOST (painel Supabase > Connect)}"
: "${PGUSER:?Informe PGUSER (painel Supabase > Connect)}"
: "${PGPASSWORD:?Informe PGPASSWORD via leitura segura; nao grave em arquivos Git}"
: "${MEG_BACKUP_DIR:?Informe diretorio seguro de destino, fora do repositorio Git}"
: "${MEG_AGE_RECIPIENT:?Informe chave PUBLICA age, iniciada por age1}"
: "${MEG_AGE_IDENTITY:?Informe caminho do arquivo PRIVADO age para verificacao local}"
[[ "$MEG_AGE_RECIPIENT" == age1* ]] || fail 'MEG_AGE_RECIPIENT nao parece uma chave publica age.'
[[ -r "$MEG_AGE_IDENTITY" ]] || fail 'Chave privada age indisponivel.'

# "require" criptografa mas NAO autentica o servidor; impedir MITM.
[[ -z "${PGSSLMODE:-}" || "$PGSSLMODE" == 'verify-full' ]] || fail 'TLS verify-full e obrigatorio. Remova PGSSLMODE inseguro.'
: "${PGSSLROOTCERT:?Informe o caminho do certificado CA oficial baixado do Supabase Database Settings}"
[[ "$PGSSLROOTCERT" == /* && -f "$PGSSLROOTCERT" && -s "$PGSSLROOTCERT" ]] || fail 'Certificado CA precisa ser arquivo absoluto, existente e nao vazio.'
export PGSSLMODE='verify-full'
export PGSSLROOTCERT
# Nao permitir que parametros libpq em ambiente redirecionem o alvo.
unset PGHOSTADDR PGSERVICE PGSERVICEFILE PGPASSFILE PGREQUIRESSL PGSSLCERT PGSSLKEY PGSSLCRL PGSSLCRLDIR
for client in pg_dump pg_restore psql; do
  version="$("$client" --version)"
  [[ "$version" =~ ([0-9]+)\.([0-9]+) && "${BASH_REMATCH[1]}" == 17 ]] || fail "$client deve ser PostgreSQL major 17."
done
export PGPORT="${PGPORT:-5432}" PGDATABASE="${PGDATABASE:-postgres}"
[[ "$PGPORT" == '5432' ]] || fail 'Porta inesperada; conferir Connect do Supabase.'
[[ "$PGDATABASE" == 'postgres' ]] || fail 'Banco inesperado; este procedimento e exclusivo de postgres.'
if [[ "$PGHOST" == "db.${project_ref}.supabase.co" ]]; then
  [[ "$PGUSER" == 'postgres' ]] || fail 'Usuario incorreto para conexao direta.'
elif [[ "$PGHOST" == *.pooler.supabase.com ]]; then
  [[ "$PGUSER" == "postgres.${project_ref}" ]] || fail 'Usuario de pooler nao pertence ao projeto MEG.'
else
  fail 'PGHOST nao e o Supabase de producao MEG. Nenhum backup executado.'
fi

backup_dir="$(mkdir -p -- "$MEG_BACKUP_DIR" && cd -- "$MEG_BACKUP_DIR" && pwd -P)"
# Diretório já existente pode ser compartilhado mesmo com umask 077.
[[ -O "$backup_dir" ]] || fail 'Diretorio de backup deve pertencer ao usuario corrente.'
mode="$(stat -c '%a' -- "$backup_dir")"
[[ "$mode" =~ ^[0-7]+$ ]] || fail 'Nao foi possivel verificar permissoes.'
(( (8#$mode & 077) == 0 )) || fail 'Diretorio permite acesso de grupo/outros. Use pasta privada no filesystem Linux WSL.'

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -n "$repo_root" ]]; then
  repo_root="$(cd "$repo_root" && pwd -P)"
  [[ "$backup_dir" != "$repo_root" && "$backup_dir" != "$repo_root/"* ]] || fail 'Backup NAO pode ser armazenado dentro do repositorio.'
fi

# A conexao do psql e do pg_dump usa as mesmas variaveis PG*: senha fica
# somente em ambiente do processo, nunca e impressa ou passada em argumentos.
export PGOPTIONS='-c default_transaction_read_only=on'
source_db="$(psql -X -w -v ON_ERROR_STOP=1 -Atc 'SELECT current_database()' 2>/dev/null)" || fail 'Falha na conexao PostgreSQL com TLS verify-full. Conferir certificado, quota e credenciais.'
[[ "$source_db" == 'postgres' ]] || fail 'O servidor respondeu com um database inesperado.'
public_tables="$(psql -X -w -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relkind IN ('r','p')" 2>/dev/null)" || fail 'Falha ao auditar quantidade de tabelas.'
[[ "$public_tables" =~ ^[0-9]+$ && "$public_tables" -gt 0 ]] || fail 'Nenhuma tabela public encontrada. Backup nao confiavel.'

stamp="$(date -u '+%Y%m%dT%H%M%SZ')"
base="meg-financas-full-${stamp}-$$"
workdir="$(mktemp -d "$backup_dir/.meg-backup-work.XXXXXXXX")"
trap 'rm -rf -- "$workdir"' EXIT
archive="$workdir/${base}.pgdump.age"
manifest="$workdir/${base}.manifest.txt"

printf 'Iniciando backup LOGICO do PostgreSQL MEG: %s tabela(s) public.\n' "$public_tables"
printf 'Nenhum dado sera alterado; dados exportados saem criptografados com age.\n'
# Dump completo para preservar metadados de schemas gerenciados e Vault,
# quando o papel PostgreSQL possuir privilegios de leitura. O RESTORE de
# schemas gerenciados requer procedimento separado da documentacao Supabase.
# Nao ha dump SQL claro em disco: pg_dump escreve no pipe criptografado.
if ! pg_dump -w --format=custom --no-owner --no-privileges --no-tablespaces --compress=6 --lock-wait-timeout=10000 2>"$workdir/pgdump.err" | age -r "$MEG_AGE_RECIPIENT" -o "$archive"; then
  fail 'Exportacao ou criptografia falhou. Nao considerar backup concluido.'
fi
[[ -s "$archive" ]] || fail 'Arquivo criptografado vazio.'

# age valida autenticidade durante o decrypt; pg_restore -l verifica estrutura
# do formato custom sem gravar nada e sem extrair dados para um arquivo.
if ! age -d -i "$MEG_AGE_IDENTITY" "$archive" | pg_restore --list >"$workdir/contents.txt" 2>"$workdir/verify.err"; then
  fail 'Nao foi possivel decifrar e listar o archive. Guardar como FALHA, nao backup.'
fi
if ! grep -Eq 'TABLE DATA[[:space:]]+public[[:space:]]' "$workdir/contents.txt"; then
  fail 'Backup nao contem dados de tabelas public.'
fi
has_vault='no'
if grep -Eq 'TABLE DATA[[:space:]]+vault[[:space:]]+secrets([[:space:]]|$)' "$workdir/contents.txt"; then
  has_vault='yes'
fi
if [[ "$has_vault" != 'yes' ]]; then
  printf 'ALERTA: vault.secrets nao aparece no inventario do archive. Exige copia separada e chave-raiz.\n' >&2
fi

hash="$(sha256sum "$archive" | awk '{print $1}')"
bytes="$(wc -c < "$archive" | tr -d ' ')"
cat > "$manifest" <<MANIFEST
project_ref=$project_ref
created_at_utc=$stamp
source_schema=logical_postgresql_all_readable
public_table_count=$public_tables
archive_name=${base}.pgdump.age
archive_sha256=$hash
archive_size_bytes=$bytes
archive_format=pg_dump_custom_age_encrypted
archive_verified=age_decrypt_and_pg_restore_list
vault_secrets_table_found=$has_vault
vault_root_key_included=NO
restore_drill_completed=NO
MANIFEST
[[ ! -e "$backup_dir/${base}.pgdump.age" && ! -e "$backup_dir/${base}.manifest.txt" ]] || fail "Arquivo com nome repetido. Abortando."
mv -- "$archive" "$backup_dir/${base}.pgdump.age" || fail 'Nao foi possivel mover o backup criptografado.'
mv -- "$manifest" "$backup_dir/${base}.manifest.txt" || fail 'Nao foi possivel mover o manifesto.'
printf 'BACKUP LOGICO CRIPTOGRAFADO: %s\n' "$backup_dir/${base}.pgdump.age"
printf 'MANIFESTO: %s\n' "$backup_dir/${base}.manifest.txt"
printf 'PENDENTE: restaurar em PostgreSQL ISOLADO e guardar chave raiz Vault de modo seguro.\n'
printf 'PENDENTE: copiar arquivo criptografado para local externo independente.\n'
