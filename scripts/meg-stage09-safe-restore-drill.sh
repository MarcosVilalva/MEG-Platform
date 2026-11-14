#!/usr/bin/env bash
# Restauração controlada SOMENTE em PostgreSQL 17 LOCAL via socket Unix.
# Nunca executar em Supabase, Render, túnel TCP ou banco de produção.
set -Eeuo pipefail
umask 077

fail() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }
for tool in psql pg_restore age sha256sum stat sed head awk id; do
  command -v "$tool" >/dev/null 2>&1 || fail "Comando ausente: $tool"
done

: "${MEG_BACKUP_FILE:?Informe arquivo .pgdump.age criptografado}"
: "${MEG_AGE_IDENTITY:?Informe chave privada age local}"
[[ -r "$MEG_BACKUP_FILE" && -r "$MEG_AGE_IDENTITY" ]] || fail 'Backup/chave indisponiveis.'
[[ "$MEG_BACKUP_FILE" == *.pgdump.age ]] || fail 'Extensao de backup inesperada.'
[[ "${MEG_RESTORE_ISOLATED_OK:-}" == 'YES' ]] || fail 'Confirme MEG_RESTORE_ISOLATED_OK=YES apos revisar o destino.'

# Endereço, porta e banco FIXOS. Não há opção para host TCP nem service file.
readonly socket_dir='/var/run/postgresql'
readonly socket_file="$socket_dir/.s.PGSQL.5432"
readonly restore_db='meg_restore_drill'
readonly restore_port='5432'
readonly restore_user="$(id -un)"
[[ "$restore_user" =~ ^[a-z_][a-z0-9_]*$ ]] || fail 'Usuario Unix local inesperado.'
[[ -d "$socket_dir" && -S "$socket_file" && ! -L "$socket_file" ]] || fail 'Socket Unix local PostgreSQL 17 nao encontrado.'
[[ "$(stat -c '%U' -- "$socket_file")" == 'postgres' ]] || fail 'Socket nao pertence ao usuario de sistema postgres.'

for tool in psql pg_restore; do
  version="$("$tool" --version)"
  [[ "$version" =~ ([0-9]+)\.([0-9]+) && "${BASH_REMATCH[1]}" == 17 ]] || fail "$tool precisa ser PostgreSQL major 17."
done

# env -i descarta PGHOSTADDR, PGSERVICE, PGSERVICEFILE, PGOPTIONS,
# PGPASSWORD, PGPASSFILE, PGHOST, portas ou SSL herdados do backup remoto.
# PGREQUIREPEER compara o proprietario real do processo PostgreSQL no
# extremo do socket. Mesmo assim, conferimos inet_server_addr() por SQL.
local_pg() {
  env -i PATH="$PATH" HOME="$HOME" LC_ALL='C' PGREQUIREPEER='postgres' "$@"
}
local_sql() {
  local_pg psql -X -w -v ON_ERROR_STOP=1 --host="$socket_dir" --port="$restore_port" \
    --username="$restore_user" --dbname="$restore_db" -Atc "$1"
}

manifest="${MEG_BACKUP_FILE%.pgdump.age}.manifest.txt"
[[ -r "$manifest" ]] || fail 'Manifesto de backup nao encontrado.'
grep -qx 'project_ref=ugbiqzaqnrhulhetevby' "$manifest" || fail 'Manifesto nao pertence ao MEG.'
grep -qx 'archive_format=pg_dump_custom_age_encrypted' "$manifest" || fail 'Formato de backup nao permitido.'
expected_hash="$(sed -n 's/^archive_sha256=//p' "$manifest" | head -1)"
[[ "$expected_hash" =~ ^[0-9a-f]{64}$ ]] || fail 'SHA256 do manifesto invalido.'
actual_hash="$(sha256sum "$MEG_BACKUP_FILE" | awk '{print $1}')"
[[ "$expected_hash" == "$actual_hash" ]] || fail 'SHA256 nao confere. Nenhuma restauracao executada.'
expected="$(sed -n 's/^public_table_count=//p' "$manifest" | head -1)"
[[ "$expected" =~ ^[1-9][0-9]*$ ]] || fail 'Quantidade de tabelas public invalida no manifesto.'

# Primeiro apenas leitura: testar identidade, transporte, versao e base alvo.
identity="$(local_sql "SELECT current_database() || '|' || COALESCE(inet_server_addr()::text,'LOCAL_SOCKET') || '|' || current_user || '|' || current_setting('server_version_num')")" || fail 'Conexao Unix local recusada.'
[[ "$identity" == "$restore_db|LOCAL_SOCKET|$restore_user|"17* ]] || fail 'Servidor nao corresponde a PostgreSQL 17 local esperado.'
empty="$(local_sql "SELECT (SELECT count(*) FROM pg_namespace WHERE nspname NOT IN ('public','information_schema') AND nspname NOT LIKE 'pg_%') + (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f'))")" || fail 'Falha na verificacao de isolamento.'
[[ "$empty" == '0' ]] || fail 'Destino possui objetos ou schemas adicionais. Restauracao bloqueada.'

# pg_restore --list pode encerrar apos ler somente o catalogo. Drenar o resto
# do stream ate EOF evita SIGPIPE e exige autenticacao completa do age.
# Nenhum SQL descriptografado e gravado no disco.
if ! age -d -i "$MEG_AGE_IDENTITY" "$MEG_BACKUP_FILE" | {
  pg_restore --list >/dev/null
  catalog_rc=$?
  cat >/dev/null
  drain_rc=$?
  (( catalog_rc == 0 && drain_rc == 0 ))
}; then
  fail 'Archive criptografado invalido ou incompleto; restauracao cancelada.'
fi

printf 'Destino autenticado por socket Unix local, banco isolado vazio. Restaurando somente public.\n'
if ! age -d -i "$MEG_AGE_IDENTITY" "$MEG_BACKUP_FILE" |
    local_pg pg_restore -w --single-transaction --exit-on-error --no-owner --no-privileges \
      --schema=public --host="$socket_dir" --port="$restore_port" \
      --username="$restore_user" --dbname="$restore_db"; then
  fail 'Restore public falhou. Banco de teste nao foi homologado.'
fi

restored="$(local_sql "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relkind IN ('r','p')")"
[[ "$restored" == "$expected" ]] || fail "Quantidade de tabelas divergente: origem $expected destino $restored."
for table in 'FinancialEvent' 'AppState' 'User'; do
  n="$(local_sql "SELECT count(*) FROM public.\"$table\"")" || fail "Nao foi possivel contar $table na copia isolada."
  [[ "$n" =~ ^[0-9]+$ && "$n" -gt 0 ]] || fail "Tabela $table sem registros na copia isolada."
done
printf 'DRILL public APROVADO: %s tabelas restauradas no PostgreSQL LOCAL.\n' "$restored"
printf 'PENDENTE: validar Auth/Vault/Storage/configuracoes em novo Supabase isolado.\n'
