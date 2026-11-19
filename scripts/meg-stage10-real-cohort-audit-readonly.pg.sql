-- Auditoria de coortes da Etapa 10. Executar somente na base autorizada.
-- Candidato significa revisão, sem autorização para vincular ou reclassificar.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
WITH pairs AS (
 SELECT e.id,e."workspaceId",e."userId",e.type,e.status,e.amount,e."signedAmount",e."categoryId",e."paymentMethodId",e."legacyTransactionId",
 a.type as account_type,a."isActive" as account_active,a."userId" as account_owner,w."ownerId" as workspace_owner,
 lower(trim(coalesce(e."sourcePayload"->>'paymentMethod',''))) AS method,
 lower(trim(coalesce(e."sourcePayload"->>'category',''))) AS category,
 lower(trim(coalesce(e."sourcePayload"->>'expenseClass',''))) AS grp,
 lower(trim(coalesce(e."sourcePayload"->>'modality',''))) AS modality,
 lower(trim(coalesce(e."sourcePayload"->>'financialScope',''))) AS scope,
 e.description ILIKE '%verocard%' AS benefit_description
 FROM public."FinancialEvent" e LEFT JOIN public."Account" a ON a.id=e."accountId"
 LEFT JOIN public."Workspace" w ON w.id=e."workspaceId" WHERE e."archivedAt" IS NULL
),
matched AS (
 SELECT e.*,c.n AS cn,c.id AS cid,p.n AS pn,p.id AS pid,p.kind,
 EXISTS(SELECT 1 FROM public."LedgerEntry" l WHERE l."eventId"=e.id) OR
 EXISTS(SELECT 1 FROM public."Receipt" r WHERE r."financialEventId"=e.id) OR
 EXISTS(SELECT 1 FROM public."PayablePayment" b WHERE b."financialEventId"=e.id) OR
 EXISTS(SELECT 1 FROM public."ImportedRow" i WHERE i."eventId"=e.id) AS linked
 FROM pairs e
 LEFT JOIN LATERAL (SELECT count(*) n,min(id) id FROM public."Category" c
   WHERE c."userId"=e."userId" AND c."isActive" AND c.type=e.type AND lower(trim(c.name))=e.category
   AND lower(trim(coalesce(c."group",'')))=e.grp) c ON TRUE
 LEFT JOIN LATERAL (SELECT count(*) n,min(id) id,min(type) kind FROM public."PaymentMethod" p
   WHERE p."userId"=e."userId" AND p."isActive" AND lower(trim(p.name))=e.method) p ON TRUE
), reviewed AS (
 SELECT *, CASE
 WHEN "paymentMethodId" IS NULL AND scope='benefit' AND method='verocard' AND pn=1 AND kind='credit' THEN 'VEROCARD_CREDIT'
 WHEN "paymentMethodId" IS NULL AND modality IN ('crédito','credito') AND pn=1 AND kind='other' THEN 'CREDITO_OTHER'
 WHEN "paymentMethodId" IS NULL AND method IN ('não informado','nao informado','') THEN 'SEM_INFORMACAO'
 WHEN "paymentMethodId" IS NULL AND pn=0 AND method IN ('cartão latam pass','cartao latam pass') THEN 'LATAM_SEM_CADASTRO'
 WHEN "categoryId" IS NULL AND "paymentMethodId" IS NULL AND "legacyTransactionId" IS NOT NULL
   AND "userId" IS NOT NULL AND workspace_owner="userId" AND account_owner="userId" AND account_active
   AND lower(account_type) IN ('checking','savings','cash') AND scope='monetary' AND modality='à vista'
   AND cn=1 AND pn=1 AND kind IS DISTINCT FROM 'credit' AND NOT linked AND NOT benefit_description
   AND method NOT IN ('verocard','','não informado','nao informado') AND method NOT LIKE 'cartão%' AND method NOT LIKE 'cartao%'
   AND category NOT IN ('','fixo','sem categoria','sem classificação','sem classificacao') AND grp<>'fixo'
   AND status IN ('paid','planned') AND amount>0
   AND ((type='expense' AND "signedAmount"<0) OR (type='income' AND "signedAmount">0 AND status='paid')) THEN 'CANDIDATO_ORDINARIO'
 WHEN "categoryId" IS NULL OR "paymentMethodId" IS NULL THEN 'OUTRAS_PENDENCIAS'
 ELSE 'COM_VINCULOS' END AS cohort FROM matched
)
SELECT cohort,count(*) AS events,count(DISTINCT id) AS ids,count(DISTINCT "workspaceId") AS workspaces,
count(*) FILTER (WHERE status='paid') AS paid,count(*) FILTER (WHERE status='planned') AS planned,
count(*) FILTER (WHERE linked) AS linked,count(*) FILTER (WHERE type='expense' AND "signedAmount">0) AS positive_expense,
count(*) FILTER (WHERE lower(account_type)='benefit') AS benefit_account,
count(*) FILTER(WHERE "categoryId" IS NULL) AS missing_category,count(*) FILTER(WHERE "paymentMethodId" IS NULL) AS missing_method
FROM reviewed GROUP BY cohort ORDER BY cohort;
COMMIT;
