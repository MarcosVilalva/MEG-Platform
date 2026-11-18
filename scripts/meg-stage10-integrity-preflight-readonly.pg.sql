-- MEG Etapa 10 | PREFLIGHT SOMENTE LEITURA no PostgreSQL.
-- SQL SEM INSERT/UPDATE/DELETE/DDL. Resultado agregado: nao imprime dados pessoais.
-- Este arquivo NAO autoriza migracao nem muda restricoes de producao.
WITH active AS (
 SELECT e.id,e."userId",e."workspaceId",e."legacyTransactionId",
  e.type,e."categoryId",e."paymentMethodId",e."accountId",
  a."userId" AS account_owner, c."userId" AS category_owner,
  c.type AS category_type, pm."userId" AS payment_owner,
  w."ownerId" AS workspace_owner
 FROM "FinancialEvent" e
 LEFT JOIN "Account" a ON a.id=e."accountId"
 LEFT JOIN "Category" c ON c.id=e."categoryId"
 LEFT JOIN "PaymentMethod" pm ON pm.id=e."paymentMethodId"
 LEFT JOIN "Workspace" w ON w.id=e."workspaceId"
 WHERE e."archivedAt" IS NULL
),
counters AS (
 SELECT
  COUNT(*) AS active_events,
  COUNT(*) FILTER(WHERE "legacyTransactionId" IS NOT NULL) AS active_legacy,
  COUNT(*) FILTER(WHERE "workspaceId" IS NULL) AS active_no_workspace,
  COUNT(*) FILTER(WHERE "categoryId" IS NULL) AS active_no_category,
  COUNT(*) FILTER(WHERE "paymentMethodId" IS NULL) AS active_no_payment,
  COUNT(*) FILTER(WHERE "accountId" IS NOT NULL
      AND (account_owner IS NULL OR account_owner IS DISTINCT FROM "userId")) AS account_owner_mismatch,
  COUNT(*) FILTER(WHERE "categoryId" IS NOT NULL
      AND (category_owner IS NULL OR category_owner IS DISTINCT FROM "userId")) AS category_owner_mismatch,
  COUNT(*) FILTER(WHERE "paymentMethodId" IS NOT NULL
      AND (payment_owner IS NULL OR payment_owner IS DISTINCT FROM "userId")) AS payment_owner_mismatch,
  COUNT(*) FILTER(WHERE "categoryId" IS NOT NULL
      AND category_type IS NOT NULL AND category_type <> type) AS category_type_mismatch,
  COUNT(*) FILTER(WHERE "workspaceId" IS NOT NULL
      AND (workspace_owner IS NULL OR workspace_owner IS DISTINCT FROM "userId")) AS workspace_owner_mismatch
 FROM active
)
SELECT 'active_events' AS metric,active_events AS total FROM counters
UNION ALL SELECT 'active_legacy',active_legacy FROM counters
UNION ALL SELECT 'active_no_workspace',active_no_workspace FROM counters
UNION ALL SELECT 'active_no_category',active_no_category FROM counters
UNION ALL SELECT 'active_no_payment',active_no_payment FROM counters
UNION ALL SELECT 'account_owner_mismatch',account_owner_mismatch FROM counters
UNION ALL SELECT 'category_owner_mismatch',category_owner_mismatch FROM counters
UNION ALL SELECT 'payment_owner_mismatch',payment_owner_mismatch FROM counters
UNION ALL SELECT 'category_type_mismatch',category_type_mismatch FROM counters
UNION ALL SELECT 'workspace_owner_mismatch',workspace_owner_mismatch FROM counters;

WITH counts AS (
 SELECT
  COUNT(*) AS total_events,
  COUNT(*) FILTER(WHERE "archivedAt" IS NOT NULL) AS archived_events,
  COUNT(*) FILTER(WHERE "archivedAt" IS NOT NULL AND "workspaceId" IS NULL) AS archived_without_workspace,
  COUNT(*) FILTER(WHERE "archivedAt" IS NULL AND "legacyTransactionId" IS NOT NULL
    AND EXISTS(SELECT 1 FROM "LedgerEntry" l WHERE l."eventId"=e.id)) AS active_legacy_with_ledger,
  COUNT(*) FILTER(WHERE "archivedAt" IS NULL AND "legacyTransactionId" IS NOT NULL
    AND EXISTS(SELECT 1 FROM "Receipt" r WHERE r."financialEventId"=e.id)) AS active_legacy_with_receipt,
  COUNT(*) FILTER(WHERE "archivedAt" IS NULL AND "legacyTransactionId" IS NOT NULL
    AND EXISTS(SELECT 1 FROM "PayablePayment" p WHERE p."financialEventId"=e.id)) AS active_legacy_with_payable_payment,
  COUNT(*) FILTER(WHERE "archivedAt" IS NULL AND "legacyTransactionId" IS NOT NULL
    AND EXISTS(SELECT 1 FROM "ImportedRow" i WHERE i."eventId"=e.id)) AS active_legacy_with_import
 FROM "FinancialEvent" e
)
SELECT 'total_events' AS metric,total_events AS total FROM counts
UNION ALL SELECT 'archived_events',archived_events FROM counts
UNION ALL SELECT 'archived_without_workspace',archived_without_workspace FROM counts
UNION ALL SELECT 'active_legacy_with_ledger',active_legacy_with_ledger FROM counts
UNION ALL SELECT 'active_legacy_with_receipt',active_legacy_with_receipt FROM counts
UNION ALL SELECT 'active_legacy_with_payable_payment',active_legacy_with_payable_payment FROM counts
UNION ALL SELECT 'active_legacy_with_import',active_legacy_with_import FROM counts;

-- Nao transformar FK nominal em relacao obrigatoria.
-- Confirmar schema e autoridade financeira antes de considerar gatilhos no banco.
SELECT c.conname AS constraint_name, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid = '"FinancialEvent"'::regclass
  AND c.contype IN ('u','f')
ORDER BY c.conname;
