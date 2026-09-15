-- Phoenix V15 - auditoria de propriedade dos catálogos financeiros
-- SOMENTE LEITURA. Não executa UPDATE/INSERT/DELETE/DDL.
-- Alvo: schema atual de produção antes do backfill de userId em Account/Category/PaymentMethod.
--
-- Resultado esperado por catálogo:
--   SINGLE_OWNER       -> um único usuário identificado por referências reais
--   MULTI_OWNER        -> catálogo compartilhado entre usuários; exige clonagem/religação
--   REVIEW_OWNERLESS   -> há pelo menos uma referência cujo domínio não informa userId
--   NO_REFERENCE       -> catálogo sem referência; não atribuir proprietário por suposição

WITH catalog_refs AS (
  -- CONTAS
  SELECT
    'account'::text AS kind,
    fe."accountId" AS catalog_id,
    fe."userId" AS user_id,
    'FinancialEvent'::text AS source,
    fe.id AS reference_id
  FROM "FinancialEvent" fe
  WHERE fe."accountId" IS NOT NULL

  UNION ALL

  SELECT
    'account',
    r."accountId",
    rv."userId",
    'Receipt',
    r.id
  FROM "Receipt" r
  JOIN "Receivable" rv ON rv.id = r."receivableId"
  WHERE r."accountId" IS NOT NULL

  UNION ALL

  SELECT
    'account',
    pp."accountId",
    p."userId",
    'PayablePayment',
    pp.id
  FROM "PayablePayment" pp
  JOIN "Payable" p ON p.id = pp."payableId"
  WHERE pp."accountId" IS NOT NULL

  UNION ALL

  SELECT
    'account',
    le."accountId",
    fe."userId",
    'LedgerEntry',
    le.id
  FROM "LedgerEntry" le
  JOIN "FinancialEvent" fe ON fe.id = le."eventId"

  UNION ALL

  -- CATEGORIAS
  SELECT
    'category',
    fe."categoryId",
    fe."userId",
    'FinancialEvent',
    fe.id
  FROM "FinancialEvent" fe
  WHERE fe."categoryId" IS NOT NULL

  UNION ALL

  SELECT
    'category',
    cp."categoryId",
    cp."userId",
    'CardPurchase',
    cp.id
  FROM "CardPurchase" cp
  WHERE cp."categoryId" IS NOT NULL

  UNION ALL

  SELECT
    'category',
    p."categoryId",
    p."userId",
    'Payable',
    p.id
  FROM "Payable" p
  WHERE p."categoryId" IS NOT NULL

  UNION ALL

  SELECT
    'category',
    re."categoryId",
    re."userId",
    'RecurringExpense',
    re.id
  FROM "RecurringExpense" re
  WHERE re."categoryId" IS NOT NULL

  UNION ALL

  -- FORMAS DE PAGAMENTO
  SELECT
    'paymentMethod',
    fe."paymentMethodId",
    fe."userId",
    'FinancialEvent',
    fe.id
  FROM "FinancialEvent" fe
  WHERE fe."paymentMethodId" IS NOT NULL

  UNION ALL

  SELECT
    'paymentMethod',
    r."paymentMethodId",
    rv."userId",
    'Receipt',
    r.id
  FROM "Receipt" r
  JOIN "Receivable" rv ON rv.id = r."receivableId"
  WHERE r."paymentMethodId" IS NOT NULL

  UNION ALL

  SELECT
    'paymentMethod',
    pp."paymentMethodId",
    p."userId",
    'PayablePayment',
    pp.id
  FROM "PayablePayment" pp
  JOIN "Payable" p ON p.id = pp."payableId"
  WHERE pp."paymentMethodId" IS NOT NULL
),
all_catalogs AS (
  SELECT 'account'::text AS kind, a.id AS catalog_id, a.name AS label
  FROM "Account" a

  UNION ALL

  SELECT 'category', c.id, c.name
  FROM "Category" c

  UNION ALL

  SELECT 'paymentMethod', pm.id, pm.name
  FROM "PaymentMethod" pm
),
aggregated AS (
  SELECT
    c.kind,
    c.catalog_id,
    c.label,
    COUNT(r.reference_id)::int AS reference_count,
    COUNT(*) FILTER (WHERE r.reference_id IS NOT NULL AND r.user_id IS NULL)::int AS ownerless_reference_count,
    COUNT(DISTINCT r.user_id) FILTER (WHERE r.user_id IS NOT NULL)::int AS owner_count,
    COALESCE(
      ARRAY_AGG(DISTINCT r.user_id ORDER BY r.user_id) FILTER (WHERE r.user_id IS NOT NULL),
      ARRAY[]::text[]
    ) AS owner_ids,
    COALESCE(
      ARRAY_AGG(DISTINCT r.source ORDER BY r.source) FILTER (WHERE r.source IS NOT NULL),
      ARRAY[]::text[]
    ) AS sources
  FROM all_catalogs c
  LEFT JOIN catalog_refs r
    ON r.kind = c.kind
   AND r.catalog_id = c.catalog_id
  GROUP BY c.kind, c.catalog_id, c.label
)
SELECT
  kind,
  catalog_id,
  label,
  reference_count,
  owner_count,
  ownerless_reference_count,
  owner_ids,
  sources,
  CASE
    WHEN reference_count = 0 THEN 'NO_REFERENCE'
    WHEN ownerless_reference_count > 0 THEN 'REVIEW_OWNERLESS'
    WHEN owner_count > 1 THEN 'MULTI_OWNER'
    WHEN owner_count = 1 THEN 'SINGLE_OWNER'
    ELSE 'REVIEW_OWNERLESS'
  END AS ownership_status
FROM aggregated
ORDER BY
  CASE
    WHEN reference_count = 0 THEN 4
    WHEN ownerless_reference_count > 0 THEN 1
    WHEN owner_count > 1 THEN 2
    WHEN owner_count = 1 THEN 3
    ELSE 1
  END,
  kind,
  label,
  catalog_id;
