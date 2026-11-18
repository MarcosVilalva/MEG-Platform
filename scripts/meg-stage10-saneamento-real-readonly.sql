-- ETAPA 10 / SANEAMENTO REAL. CONSULTAS SOMENTE LEITURA.
-- Conferir permissao e alvo antes de executar. NUNCA migrar ou reescrever FKs aqui.
-- BEGIN READ ONLY garante falha para DML/DDL acidental.
BEGIN TRANSACTION READ ONLY;

WITH events AS (
 SELECT e.id,e."userId",e.type,e."categoryId",e."paymentMethodId",
 e."legacyTransactionId",e."archivedAt",e."accountId",e."workspaceId",
 lower(btrim(coalesce(e."sourcePayload"->>'category',''))) AS cat,
 lower(btrim(coalesce(e."sourcePayload"->>'expenseClass',''))) AS grp,
 lower(btrim(coalesce(e."sourcePayload"->>'paymentMethod',''))) AS method,
 lower(btrim(coalesce(e."sourcePayload"->>'modality',''))) AS modality,
 lower(btrim(coalesce(e."sourcePayload"->>'financialScope',''))) AS scope,
 e.amount,e."signedAmount"
 FROM public."FinancialEvent" e
), active AS (
 SELECT e.*,
 (SELECT count(*)::int FROM public."Category" c
   WHERE c."userId"=e."userId" AND c."isActive"
     AND c.type=e.type AND lower(btrim(c.name))=e.cat
     AND lower(btrim(coalesce(c."group",'')))=e.grp) AS cat_hits,
 (SELECT count(*)::int FROM public."PaymentMethod" p
   WHERE p."userId"=e."userId" AND p."isActive"
     AND lower(btrim(p.name))=e.method) AS method_hits,
 (SELECT max(p.type) FROM public."PaymentMethod" p
   WHERE p."userId"=e."userId" AND p."isActive"
     AND lower(btrim(p.name))=e.method) AS candidate_method_type
 FROM events e WHERE e."archivedAt" IS NULL
)
SELECT
 (SELECT count(*) FROM events)::int AS total_events,
 count(*)::int AS active_events,
 (SELECT count(*) FROM events WHERE "archivedAt" IS NOT NULL)::int AS archived_events,
 count(*) FILTER(WHERE "legacyTransactionId" IS NOT NULL)::int AS active_legacy,
 count(*) FILTER(WHERE "categoryId" IS NULL)::int AS missing_category,
 count(*) FILTER(WHERE "paymentMethodId" IS NULL)::int AS missing_method,
 count(*) FILTER(WHERE "categoryId" IS NULL AND cat_hits=1)::int AS cat_technical_unique,
 count(*) FILTER(WHERE "categoryId" IS NULL AND cat_hits=1
   AND cat NOT IN('sem categoria','sem classificação','sem classificacao'))::int AS cat_reviewable,
 count(*) FILTER(WHERE "categoryId" IS NULL AND cat_hits=1 AND cat='sem categoria')::int AS cat_sentinel,
 count(*) FILTER(WHERE "categoryId" IS NULL AND cat_hits=0)::int AS cat_unmatched,
 count(*) FILTER(WHERE "paymentMethodId" IS NULL AND method_hits=1)::int AS payment_technical_unique,
 count(*) FILTER(WHERE "paymentMethodId" IS NULL AND method_hits=0)::int AS payment_unmatched,
 count(*) FILTER(WHERE "paymentMethodId" IS NULL AND method_hits=0 AND method='não informado')::int AS payment_uninformed,
 count(*) FILTER(WHERE "paymentMethodId" IS NULL AND method_hits=0 AND method='cartão latam pass')::int AS payment_latam_unmatched,
 count(*) FILTER(WHERE "paymentMethodId" IS NULL AND method_hits=1
   AND modality='credito' AND candidate_method_type='other')::int AS credit_other_collision,
 count(*) FILTER(WHERE "paymentMethodId" IS NULL AND method_hits=1
   AND scope='benefit' AND method='verocard' AND candidate_method_type='credit')::int AS verocard_credit_collision,
 count(*) FILTER(WHERE scope='benefit')::int AS active_benefits,
 count(*) FILTER(WHERE scope='benefit' AND method='verocard')::int AS verocard_benefits,
 count(*) FILTER(WHERE type='expense' AND amount>0 AND "signedAmount"=amount)::int AS positive_expense_signed
FROM active;

WITH tables AS (
 SELECT c.oid,c.relrowsecurity
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN('r','p')
), rights AS (
 SELECT oid,relrowsecurity,
 has_table_privilege('anon',oid,'SELECT') OR has_table_privilege('anon',oid,'INSERT')
 OR has_table_privilege('anon',oid,'UPDATE') OR has_table_privilege('anon',oid,'DELETE') AS anon_any,
 has_table_privilege('authenticated',oid,'SELECT') OR has_table_privilege('authenticated',oid,'INSERT')
 OR has_table_privilege('authenticated',oid,'UPDATE') OR has_table_privilege('authenticated',oid,'DELETE') AS auth_any
 FROM tables
)
SELECT count(*)::int AS public_tables,
 count(*) FILTER(WHERE relrowsecurity)::int AS public_rls_on,
 count(*) FILTER(WHERE anon_any)::int AS anon_granted_tables,
 count(*) FILTER(WHERE auth_any)::int AS authenticated_granted_tables,
 (SELECT count(*) FROM pg_policies WHERE schemaname='public')::int AS policies_in_public
FROM rights;

ROLLBACK;
