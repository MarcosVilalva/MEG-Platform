#!/usr/bin/env bash
# Restore somente em localhost, database isolado, nunca no Supabase/Render.
set -Eeuo pipefail
umask 077
fail() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }
for tool in psql pg_restore age sha256sum; do command -v "$tool" >/dev/null 2>&1 || fail "Comando ausente: $tool"; done
: "${MEG_BACKUP_FILE:?Caminho do .pgdump.age criado pelo backup}"
: "${MEG_AGE_IDENTITY:?Arquivo da chave privada age}"
[[ -r "$MEG_BACKUP_FILE" && -r "$MEG_AGE_IDENTITY" ]] || fail 'Arquivo de backup ou chave privada nao pode ser lido.'
[[ "${MEG_RESTORE_ISOLATED_OK:-}" == 'YES' ]] || fail 'Defina MEG_RESTORE_ISOLATED_OK=YES apenas apos conferir destino isolado.'
export PGHOST="${MEG_RESTORE_HOST:-127.0.0.1}"
export PGPORT="${MEG_RESTORE_PORT:-5432}"
export PGDATABASE="${MEG_RESTORE_DB:-meg_restore_drill}"
export PGUSER="${MEG_RESTORE_USER:-postgres}"
: "${MEG_RESTORE_PASSWORD:?Senha EXCLUSIVA do PostgreSQL local}"
export PGPASSWORD="$MEG_RESTORE_PASSWORD"
# Bloqueio de seguranca INDEPENDENTE da confirmacao, sem aceitar hostname.
[[ "$PGHOST" == '127.0.0.1' || "$PGHOST" == 'localhost' || "$PGHOST" == '::1' ]] || fail 'RESTORE bloqueado: apenas localhost.'
[[ "$PGDATABASE" == 'meg_restore_drill' ]] || fail 'RESTORE bloqueado: database deve ser meg_restore_drill.'
[[ "$PGPORT" =~ ^[0-9]+$ ]] || fail 'Porta local invalida.'
export PGSSLMODE=prefer

manifest="${MEG_BACKUP_FILE%.pgdump.age}.manifest.txt"
[[ -r "$manifest" ]] || fail 'Manifesto nao encontrado.'
expected_hash="$(sed -n 's/^archive_sha256=//p' "$manifest" | head -1)"
[[ "$expected_hash" =~ ^[0-9a-f]{64}$ ]] || fail 'SHA256 do manifesto invalido.'
actual_hash="$(sha256sum "$MEG_BACKUP_FILE" | awk '{print $1}')"
[[ "$expected_hash" == "$actual_hash" ]] || fail 'Integridade SHA256 nao confere.'

# Requer o banco ja criado pelo operador: este script nao cria, apaga nem
# recria bancos ou schemas automaticamente.
count="$(psql -X -w -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relkind IN ('r','p')" 2>/dev/null)" || fail 'Nao conectou ao PostgreSQL local isolado.'
[[ "$count" =~ ^[0-9]+$ && "$count" == 0 ]] || fail 'Destino nao esta vazio. RESTORE bloqueado.'
printf 'Destino confirmado: localhost / meg_restore_drill vazio. Restaurando somente o schema public.\n'

# O arquivo completo tambem pode conter schemas internos Supabase. A restauracao
# local e intencionalmente restrita ao public; autenticacao, Vault e Storage
# exigem validacao independente em novo Supabase conforme runbook.
if ! age -d -i "$MEG_AGE_IDENTITY" "$MEG_BACKUP_FILE" | pg_restore -w --single-transaction --exit-on-error --no-owner --no-privileges --schema=public --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" --dbname="$PGDATABASE"; then
  fail 'Restauração de public falhou; nao considerar o backup homologado.'
fi
restored="$(psql -X -w -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='public' AND c.relkind IN ('r','p')")"
expected="$(sed -n 's/^public_table_count=//p' "$manifest" | head -1)"
[[ "$expected" =~ ^[0-9]+$ && "$restored" == "$expected" ]] || fail "Divergencia no total de tabelas public: origem $expected / destino $restored."
# Confirmar que nao restauramos somente DDL vazio. Sem retornar valores
# financeiros ou credenciais, verificar que dados essenciais existem.
for table in 'FinancialEvent' 'AppState' 'User'; do
  n="$(psql -X -w -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM public.\"$table\"")" || fail "Falha ao contar $table na copia local."
  [[ "$n" =~ ^[0-9]+$ && "$n" -gt 0 ]] || fail "Tabela essencial $table nao contem registros na copia."
done
printf 'DRILL DE public APROVADO: %s tabela(s) restauradas, dados essenciais presentes.\n' "$restored"
printf 'PENDENTE: comparar contagens/dados sinteticos, validar users, Vault e integracoes em Supabase isolado.\n'
