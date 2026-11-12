#!/usr/bin/env bash
# MEG Etapa 09 | Diagnostico de invariantes financeiros em restore LOCAL.
# SOMENTE SELECT e catalogos. Nao valida a execucao das regras financeiras da API.
set -Eeuo pipefail
umask 077

fail() { printf 'ERRO_AUDITORIA=%s\n' "$1" >&2; exit 1; }
[[ "$(id -un)" == 'm_vil' ]] || fail 'USUARIO_UNIX_INCORRETO'
readonly socket='/var/run/postgresql/.s.PGSQL.5432'
[[ -S "$socket" && ! -L "$socket" ]] || fail 'SOCKET_UNIX_INDISPONIVEL'
[[ "$(stat -c '%U' -- "$socket")" == 'postgres' ]] || fail 'SOCKET_NAO_PERTENCE_A_POSTGRES'
for tool in psql pg_lsclusters awk grep sed; do command -v "$tool" >/dev/null || fail "COMANDO_AUSENTE_${tool}"; done
[[ "$(psql --version)" =~ ^psql[[:space:]]+\(PostgreSQL\)[[:space:]]+17\.[0-9]+([[:space:]].*)?$ ]] || fail 'CLIENTE_PSQL_NAO_E_POSTGRES17'
[[ "$(pg_lsclusters -h | awk '$1 == "17" && $2 == "meg_restore" && $3 == "5432" && $4 == "online" {print "OK"}')" == 'OK' ]] || fail 'CLUSTER_LOCAL_INCORRETO'

# Toda a sessao e read-only. BEGIN fornece snapshot consistente, mesmo entre varias SELECTs.
# env -i e PGREQUIREPEER eliminam variaveis de redirecionamento (PGHOSTADDR, PGSERVICE etc).
output="$(env -i PATH="$PATH" HOME="$HOME" LC_ALL=C \
    PGREQUIREPEER=postgres PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=30000' \
    psql -X -w -q -A -t -v ON_ERROR_STOP=1 \
    --host=/var/run/postgresql --port=5432 \
    --username=m_vil --dbname=meg_restore_drill <<'SQL'
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT 'DB=' || current_database();
SELECT 'ROLE=' || current_user;
SELECT 'SOCKET=' || COALESCE(inet_server_addr()::text,'LOCAL_SOCKET');
SELECT 'READ_ONLY=' || current_setting('transaction_read_only');
SELECT 'PG_MAJOR=' || split_part(current_setting('server_version'), '.', 1);
SELECT 'TABELAS_PUBLIC=' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p');
SELECT 'CORE_TABLES=' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname IN ('FinancialEvent','User','AppState');
SELECT 'EVENTOS_TOTAL=' || count(*) FROM public."FinancialEvent";
SELECT 'EVENTOS_ATIVOS=' || count(*) FROM public."FinancialEvent" WHERE "archivedAt" IS NULL;

-- Contrato financeiro: financial-policy.ts / amount-sign.ts. Contagens diagnosticas,
-- nao declaracoes automaticas de fraude/erro: migracao e legado podem divergir.
SELECT 'EVENTOS_RECEITA_COM_SINAL_NEGATIVO=' || count(*)
  FROM public."FinancialEvent"
  WHERE "archivedAt" IS NULL AND type IN ('income','redemption') AND "signedAmount" < 0;
SELECT 'EVENTOS_DESPESA_COM_SINAL_POSITIVO=' || count(*)
  FROM public."FinancialEvent"
  WHERE "archivedAt" IS NULL AND type = 'expense' AND "signedAmount" > 0;
SELECT 'EVENTOS_MAGNITUDE_DIVERGENTE=' || count(*)
  FROM public."FinancialEvent"
  WHERE "archivedAt" IS NULL AND (amount < 0 OR abs("signedAmount") <> amount);
SELECT 'EVENTOS_FRACAO_SUBCENTAVO=' || count(*)
  FROM public."FinancialEvent"
  WHERE "archivedAt" IS NULL AND (amount <> round(amount,2) OR "signedAmount" <> round("signedAmount",2));
SELECT 'EVENTOS_COM_DATA_COMPETENCIA_DISTINTA=' || count(*)
  FROM public."FinancialEvent"
  WHERE "archivedAt" IS NULL AND competence <> to_char(date AT TIME ZONE 'UTC','YYYY-MM');

-- Transferencia: transfer-core.ts exige duas pernas opostas, conta de origem
-- distinta da de destino e soma zero. Apenas transferencias com payload moderno.
SELECT 'TRANSFER_EVENTOS_SEM_ID_MODERNO=' || count(*)
  FROM public."FinancialEvent"
  WHERE "archivedAt" IS NULL AND type='transfer'
    AND ("sourcePayload" IS NULL OR jsonb_typeof("sourcePayload") <> 'object'
       OR coalesce("sourcePayload"->>'transferId','')='');
WITH legs AS (
  SELECT "workspaceId", "sourcePayload"->>'transferId' AS transfer_id,
         "sourcePayload"->>'transferLeg' AS leg,
         "sourcePayload"->>'counterpartyAccountId' AS counterparty,
         "accountId", "signedAmount", status
    FROM public."FinancialEvent"
   WHERE "archivedAt" IS NULL AND type='transfer'
     AND jsonb_typeof("sourcePayload")='object'
     AND coalesce("sourcePayload"->>'transferId','')<>''
), groups AS (
  SELECT "workspaceId", transfer_id, count(*) AS total,
         count(*) FILTER (WHERE leg='source' AND "signedAmount" < 0) AS source_ok,
         count(*) FILTER (WHERE leg='destination' AND "signedAmount" > 0) AS dest_ok,
         count(DISTINCT "accountId") AS distinct_accounts,
         count(*) FILTER (WHERE "accountId" IS NULL OR counterparty IS NULL OR counterparty="accountId") AS bad_accounts,
         sum("signedAmount") AS sum_signed,
         count(*) FILTER (WHERE status<>'paid') AS not_paid
  FROM legs GROUP BY "workspaceId", transfer_id
)
SELECT 'TRANSFER_GRUPOS_MODERNOS=' || count(*) FROM groups;
WITH legs AS (
  SELECT "workspaceId", "sourcePayload"->>'transferId' AS transfer_id,
         "sourcePayload"->>'transferLeg' AS leg,
         "sourcePayload"->>'counterpartyAccountId' AS counterparty,
         "accountId", "signedAmount", status
    FROM public."FinancialEvent"
   WHERE "archivedAt" IS NULL AND type='transfer'
     AND jsonb_typeof("sourcePayload")='object'
     AND coalesce("sourcePayload"->>'transferId','')<>''
), groups AS (
  SELECT "workspaceId", transfer_id, count(*) AS total,
         count(*) FILTER (WHERE leg='source' AND "signedAmount" < 0) AS source_ok,
         count(*) FILTER (WHERE leg='destination' AND "signedAmount" > 0) AS dest_ok,
         count(DISTINCT "accountId") AS distinct_accounts,
         count(*) FILTER (WHERE "accountId" IS NULL OR counterparty IS NULL OR counterparty="accountId") AS bad_accounts,
         sum("signedAmount") AS sum_signed,
         count(*) FILTER (WHERE status<>'paid') AS not_paid
  FROM legs GROUP BY "workspaceId", transfer_id
)
SELECT 'TRANSFER_GRUPOS_SUSPEITOS=' || count(*) FROM groups
 WHERE total<>2 OR source_ok<>1 OR dest_ok<>1 OR distinct_accounts<>2
       OR bad_accounts<>0 OR sum_signed<>0 OR not_paid<>0;

-- A autoridade do saldo inicial e o evento, com legado como fallback.
SELECT 'SALDO_INICIAL_EVENTOS_ATIVOS=' || count(*) FROM public."FinancialEvent"
 WHERE "archivedAt" IS NULL AND "legacyTransactionId" LIKE 'opening-balance:%';
SELECT 'SALDO_INICIAL_EVENTOS_COM_CONTRATO_DIVERGENTE=' || count(*)
 FROM public."FinancialEvent"
 WHERE "archivedAt" IS NULL AND "legacyTransactionId" LIKE 'opening-balance:%'
   AND (status<>'paid' OR "accountId" IS NULL
        OR "legacyTransactionId" <> 'opening-balance:' || "accountId");

-- Beneficio: dominio separado (benefit-event-mutation.ts), sem somar saldo.
SELECT 'BENEFICIO_EVENTOS_CONTA_BENEFICIO=' || count(*)
  FROM public."FinancialEvent" e JOIN public."Account" a ON a.id=e."accountId"
 WHERE e."archivedAt" IS NULL AND lower(trim(a.type))='benefit';
SELECT 'BENEFICIO_EVENTOS_VEROCARD_FORA_CONTA_BENEFICIO=' || count(*)
  FROM public."FinancialEvent" e
  LEFT JOIN public."Account" a ON a.id=e."accountId"
  LEFT JOIN public."PaymentMethod" m ON m.id=e."paymentMethodId"
 WHERE e."archivedAt" IS NULL AND upper(trim(coalesce(m.name,'')))='VEROCARD'
   AND coalesce(lower(trim(a.type)),'')<>'benefit';

-- Razao: a escritura dos novos eventos cria debito OU credito; dados historicos
-- podem ter outros formatos. Nao exige presenca de ledger para todo evento legado.
SELECT 'LEDGER_TOTAL=' || count(*) FROM public."LedgerEntry";
SELECT 'LEDGER_VALORES_NEGATIVOS=' || count(*) FROM public."LedgerEntry" WHERE debit<0 OR credit<0;
SELECT 'LEDGER_DEBITO_E_CREDITO_SIMULTANEOS=' || count(*) FROM public."LedgerEntry" WHERE debit>0 AND credit>0;
SELECT 'LEDGER_AMBOS_ZERO=' || count(*) FROM public."LedgerEntry" WHERE debit=0 AND credit=0;

-- Cartao: service.ts e dominio de compras/parcelas. Valores sao comparados
-- internamente, mas nao sao impressos neste relatorio.
SELECT 'CARTAO_PARCELAS_TOTAL=' || count(*) FROM public."CardInstallment";
SELECT 'CARTAO_PARCELAS_PAGO_PARCIAL_INCONSISTENTE=' || count(*)
 FROM public."CardInstallment"
 WHERE amount<0 OR "partialPaidAmount"<0 OR "partialPaidAmount">amount;
SELECT 'CARTAO_NUMERACAO_PARCELAS_INVALIDA=' || count(*)
 FROM public."CardInstallment" i JOIN public."CardPurchase" p ON p.id=i."purchaseId"
 WHERE i.number<1 OR i.number>p.installments;
WITH sums AS (
 SELECT p.id, p.installments, p."totalAmount", count(i.id) AS entries,
        coalesce(sum(i.amount),0) AS sum_amount
 FROM public."CardPurchase" p LEFT JOIN public."CardInstallment" i ON i."purchaseId"=p.id
 GROUP BY p.id, p.installments, p."totalAmount"
)
SELECT 'CARTAO_COMPRAS_DIVERGENTES=' || count(*) FROM sums
 WHERE entries<>installments OR sum_amount<>"totalAmount";

-- Pendentes: contagens diagnosticas; juros/multas e legado podem influenciar
-- valores de aberto. Nenhum pagamento ou saldo e recalculado pela auditoria.
SELECT 'PENDENTES_TOTAL=' || count(*) FROM public."Payable";
SELECT 'PENDENTES_VALOR_ABERTO_NEGATIVO=' || count(*) FROM public."Payable" WHERE "openAmount"<0;
SELECT 'PENDENTES_ABERTO_MAIOR_TOTAL=' || count(*) FROM public."Payable" WHERE "openAmount">"totalAmount";
SELECT 'PENDENTES_PARCELA_NUMERACAO_INVALIDA=' || count(*) FROM public."Payable"
 WHERE "installmentNo"<1 OR "installmentQty"<1 OR "installmentNo">"installmentQty";
SELECT 'RECIBOS_MUTACAO_TOTAL=' || count(*) FROM public."CloudMutationReceipt";
COMMIT;
SQL
)" || fail 'CONSULTAS_POSTGRESQL_FALHARAM'

# Não exibe query, valores, IDs, nomes, contas, documentos, payload, JSON nem logs privados.
printf '%s\n' "$output"
for expected in 'DB=meg_restore_drill' 'ROLE=m_vil' 'SOCKET=LOCAL_SOCKET' 'READ_ONLY=on' 'PG_MAJOR=17' 'TABELAS_PUBLIC=32' 'CORE_TABLES=3'; do
  grep -Fxq -- "$expected" <<< "$output" || fail 'IDENTIDADE_OU_ESTRUTURA_DIVERGENTE'
done
for metric in EVENTOS_TOTAL EVENTOS_ATIVOS EVENTOS_RECEITA_COM_SINAL_NEGATIVO EVENTOS_DESPESA_COM_SINAL_POSITIVO \
 EVENTOS_MAGNITUDE_DIVERGENTE EVENTOS_FRACAO_SUBCENTAVO EVENTOS_COM_DATA_COMPETENCIA_DISTINTA \
 TRANSFER_EVENTOS_SEM_ID_MODERNO TRANSFER_GRUPOS_MODERNOS TRANSFER_GRUPOS_SUSPEITOS \
 SALDO_INICIAL_EVENTOS_ATIVOS SALDO_INICIAL_EVENTOS_COM_CONTRATO_DIVERGENTE \
 BENEFICIO_EVENTOS_CONTA_BENEFICIO BENEFICIO_EVENTOS_VEROCARD_FORA_CONTA_BENEFICIO \
 LEDGER_TOTAL LEDGER_VALORES_NEGATIVOS LEDGER_DEBITO_E_CREDITO_SIMULTANEOS LEDGER_AMBOS_ZERO \
 CARTAO_PARCELAS_TOTAL CARTAO_PARCELAS_PAGO_PARCIAL_INCONSISTENTE CARTAO_NUMERACAO_PARCELAS_INVALIDA CARTAO_COMPRAS_DIVERGENTES \
 PENDENTES_TOTAL PENDENTES_VALOR_ABERTO_NEGATIVO PENDENTES_ABERTO_MAIOR_TOTAL PENDENTES_PARCELA_NUMERACAO_INVALIDA RECIBOS_MUTACAO_TOTAL; do
  values="$(sed -n "s/^${metric}=//p" <<< "$output")"
  [[ "$values" =~ ^[0-9]+$ ]] || fail "METRICA_NAO_NUMERICA_OU_AUSENTE_${metric}"
done
printf 'FONTE_REGRAS=FINANCIAL_AUTHORITY_CANONICA_DA_PR666\n'
printf 'LIMITACAO=DIAGNOSTICO_DE_INVARIANTES_NAO_E_TESTE_DE_EXECUCAO_FINANCEIRA\n'
printf 'PRODUCAO_NAO_ACESSADA=SIM\n'
printf 'SEM_DADOS_DE_LINHA=SIM\n'
printf 'SEM_ALTERACAO=SIM\n'
printf 'RESULTADO_WSL=DIAGNOSTICO_FINANCEIRO_LOCAL_CONCLUIDO\n'
# MEG_FINANCIAL_INVARIANTS_END
