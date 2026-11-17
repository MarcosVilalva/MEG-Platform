-- MEG WEB EVOLUTION / ETAPA 10 / GATE DE TRIAGEM CANDIDATA.
-- SOMENTE LEITURA. Não contém quaisquer comandos de migração.
-- A classificação 'baixo risco estrutural' não autoriza UPDATE.
BEGIN TRANSACTION READ ONLY;

WITH active AS (
 SELECT e.id,e."userId",e.type,e.status,e."signedAmount",
 e."categoryId",e."paymentMethodId",
 a."userId" AS account_owner,a."isActive" AS account_active,a.type AS account_type,
 lower(btrim(coalesce(e."sourcePayload"->>'category',''))) AS legacy_category,
 lower(btrim(coalesce(e."sourcePayload"->>'expenseClass',''))) AS legacy_group,
 lower(btrim(coalesce(e."sourcePayload"->>'paymentMethod',''))) AS legacy_method,
 lower(btrim(coalesce(e."sourcePayload"->>'financialScope',''))) AS legacy_scope,
 lower(btrim(coalesce(e."sourcePayload"->>'modality',''))) AS legacy_modality
 FROM public."FinancialEvent" e LEFT JOIN public."Account" a ON a.id=e."accountId"
 WHERE e."archivedAt" IS NULL
), matches AS (
 SELECT a.*,
 (SELECT count(*) FROM public."Category" c
  WHERE c."userId"=a."userId" AND c."isActive" AND c.type=a.type
  AND lower(btrim(c.name))=a.legacy_category
  AND lower(btrim(coalesce(c."group",'')))=a.legacy_group) AS category_hits,
 (SELECT count(*) FROM public."PaymentMethod" p
  WHERE p."userId"=a."userId" AND p."isActive"
  AND lower(btrim(p.name))=a.legacy_method) AS payment_hits,
 (SELECT max(p.type) FROM public."PaymentMethod" p
  WHERE p."userId"=a."userId" AND p."isActive"
  AND lower(btrim(p.name))=a.legacy_method) AS payment_type,
 EXISTS(SELECT 1 FROM public."LedgerEntry" l WHERE l."eventId"=a.id) AS has_ledger,
 EXISTS(SELECT 1 FROM public."Receipt" r WHERE r."financialEventId"=a.id) AS has_receipt,
 EXISTS(SELECT 1 FROM public."PayablePayment" pp WHERE pp."financialEventId"=a.id) AS has_payable_payment,
 EXISTS(SELECT 1 FROM public."ImportedRow" ir WHERE ir."eventId"=a.id) AS has_import
 FROM active a
), ordinary AS (
 SELECT *,(
   NOT (type='expense' AND "signedAmount">=0)
   AND NOT (type='income' AND "signedAmount"<=0)
   AND account_active IS TRUE AND account_owner="userId"
   AND lower(btrim(coalesce(account_type,''))) IN ('checking','savings','cash')
   AND payment_type IS DISTINCT FROM 'credit'
   AND legacy_group<>'fixo' AND legacy_category NOT IN ('fixo','sem categoria','sem classificação','sem classificacao')
   AND NOT has_ledger AND NOT has_receipt AND NOT has_payable_payment AND NOT has_import
 ) AS lower_structural_risk
 FROM matches
 WHERE "categoryId" IS NULL AND category_hits=1
   AND "paymentMethodId" IS NULL AND payment_hits=1
   AND legacy_scope='monetary' AND legacy_modality='à vista'
   AND legacy_method NOT IN ('','não informado','verocard')
   AND legacy_method NOT LIKE 'cartão%' AND legacy_method NOT LIKE 'cartao%'
)
SELECT count(*)::int AS technical_pair_candidates,
 count(*) FILTER(WHERE lower_structural_risk)::int AS conditional_review_candidates,
 count(*) FILTER(WHERE NOT lower_structural_risk)::int AS exceptions_require_special_review,
 count(*) FILTER(WHERE lower_structural_risk AND type='expense' AND status='paid')::int AS expense_paid,
 count(*) FILTER(WHERE lower_structural_risk AND type='expense' AND status='planned')::int AS expense_planned,
 count(*) FILTER(WHERE lower_structural_risk AND type='income' AND status='paid')::int AS income_paid,
 count(*) FILTER(WHERE account_active IS DISTINCT FROM TRUE OR account_owner IS DISTINCT FROM "userId")::int AS account_scope_issue,
 count(*) FILTER(WHERE has_ledger OR has_receipt OR has_payable_payment OR has_import)::int AS linked_financial_dependencies,
 count(*) FILTER(WHERE "signedAmount">0 AND type='expense')::int AS positive_signed_expense
FROM ordinary;

ROLLBACK;
