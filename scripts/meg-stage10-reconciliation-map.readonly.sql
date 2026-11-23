-- ETAPA 10 | Mapa por ID, somente leitura. NENHUM UPDATE/DDL.
-- Executar em PostgreSQL 17 com credencial SELECT. Nao publica dados reais no repositorio.
-- Evidencia da planilha: expenseClass = CLASSIFICACAO DA DESPESA; category = GRUPO.
-- Receitas podem ter campos de classificacao da DESPESA vazios: nunca preencher por heuristica.
-- Nao traz descricao, observacoes, sourcePayload inteiro, nomes ou emails de usuarios.
WITH events AS (
 SELECT e.id AS event_id, e."workspaceId" AS workspace_id,
  e."userId" AS owner_id, e.type AS event_type, e.status, e.date::date AS event_date,
  e.amount, e."signedAmount" AS signed_amount, e.frequency, e."amountBehavior" AS amount_behavior,
  e."legacyTransactionId" AS legacy_id, e."updatedAt" AS updated_at,
  e."accountId" AS account_id, a.type AS account_type,
  (a."userId"=e."userId" AND a."isActive"=TRUE) AS account_owned_active,
  e."categoryId" AS category_current_id, e."paymentMethodId" AS payment_current_id,
  btrim(COALESCE(e."sourcePayload"->>'category','')) AS legacy_group,
  btrim(COALESCE(e."sourcePayload"->>'expenseClass','')) AS legacy_expense_class,
  btrim(COALESCE(e."sourcePayload"->>'paymentMethod','')) AS legacy_payment,
  btrim(COALESCE(e."sourcePayload"->>'modality','')) AS legacy_modality,
  btrim(COALESCE(e."sourcePayload"->>'financialScope','')) AS legacy_scope,
  EXISTS(SELECT 1 FROM public."LedgerEntry" l WHERE l."eventId"=e.id) AS has_ledger,
  EXISTS(SELECT 1 FROM public."Receipt" r WHERE r."financialEventId"=e.id) AS has_receipt,
  EXISTS(SELECT 1 FROM public."PayablePayment" p WHERE p."financialEventId"=e.id) AS has_payable_payment,
  EXISTS(SELECT 1 FROM public."ImportedRow" i WHERE i."eventId"=e.id) AS has_imported_row
 FROM public."FinancialEvent" e
 LEFT JOIN public."Account" a ON a.id=e."accountId"
 WHERE e."archivedAt" IS NULL AND (e."categoryId" IS NULL OR e."paymentMethodId" IS NULL)
),
catalog AS (
 SELECT e.*,
  c.n AS category_matches, CASE WHEN c.n=1 THEN c.id END AS category_match_id,
  c.name AS category_match_name, c.group_name AS category_match_group,
  p.n AS payment_matches, CASE WHEN p.n=1 THEN p.id END AS payment_match_id,
  p.type AS payment_match_type
 FROM events e
 LEFT JOIN LATERAL (
   SELECT count(*)::int AS n, min(id) AS id, min(name) AS name,
    min("group") AS group_name
   FROM public."Category" c
   WHERE c."userId"=e.owner_id AND c."isActive"=TRUE AND c.type=e.event_type
    AND lower(btrim(c.name))=lower(e.legacy_group)
    AND lower(btrim(COALESCE(c."group",'')))=lower(e.legacy_expense_class)
 ) c ON TRUE
 LEFT JOIN LATERAL (
   SELECT count(*)::int AS n, min(id) AS id, min(type) AS type
   FROM public."PaymentMethod" p
   WHERE p."userId"=e.owner_id AND p."isActive"=TRUE
     AND lower(btrim(p.name))=lower(e.legacy_payment)
 ) p ON TRUE
),
segmented AS (
 SELECT catalog.*,
 CASE
  WHEN lower(account_type)='benefit' OR lower(legacy_scope)='benefit'
   OR lower(legacy_payment)='verocard' OR lower(legacy_modality)='alimentação' THEN 'BENEFICIO_VEROCARD'
  WHEN lower(legacy_modality) IN ('credito','crédito')
   OR lower(legacy_payment) LIKE 'cartão%' OR lower(legacy_payment) LIKE 'cartao%'
   OR lower(COALESCE(payment_match_type,''))='credit' THEN 'CARTAO_CREDITO'
  WHEN event_type='income' THEN 'RECEITA'
  WHEN upper(COALESCE(frequency,''))='RECURRING' THEN 'DESPESA_RECORRENTE'
  WHEN event_type='expense' THEN 'DESPESA_COMUM'
  ELSE 'CASO_AMBIGUO'
 END AS grupo_financeiro
 FROM catalog
),
review AS (
 SELECT segmented.*,
 (
  grupo_financeiro='DESPESA_COMUM'
  AND upper(COALESCE(frequency,''))='ONE_OFF'
  AND event_type='expense' AND status IN ('paid','planned')
  AND amount>0 AND signed_amount<0
  AND account_owned_active IS TRUE
  AND account_type IN ('checking','savings','cash')
  AND lower(legacy_scope)='monetary'
  AND lower(legacy_modality)='à vista'
  AND category_current_id IS NULL AND payment_current_id IS NULL
  AND category_matches=1 AND payment_matches=1
  AND lower(COALESCE(payment_match_type,'')) <> 'credit'
  AND lower(legacy_group) NOT IN ('fixo','sem categoria','sem classificação')
  AND lower(legacy_expense_class) NOT IN ('fixo','sem classificação')
  AND lower(legacy_payment) NOT IN ('não informado','nao informado')
  AND NOT(has_ledger OR has_receipt OR has_payable_payment OR has_imported_row)
 ) AS unica_candidata_simples
 FROM segmented
)
SELECT event_id, workspace_id, event_type, status, event_date, amount, signed_amount,
 legacy_id, updated_at, account_id, account_type, account_owned_active,
 category_current_id, payment_current_id,
 legacy_group, legacy_expense_class, legacy_payment, legacy_modality, legacy_scope,
 frequency, amount_behavior, grupo_financeiro,
 category_matches, category_match_id, category_match_name, category_match_group,
 payment_matches, payment_match_id, payment_match_type,
 has_ledger, has_receipt, has_payable_payment, has_imported_row,
 CASE WHEN unica_candidata_simples THEN category_match_id ELSE NULL END AS category_proposed_id,
 CASE WHEN unica_candidata_simples THEN payment_match_id ELSE NULL END AS payment_proposed_id,
 CASE WHEN unica_candidata_simples THEN 'ALTA_PARA_REVISAO'
      WHEN grupo_financeiro='RECEITA' AND lower(legacy_expense_class)='sem classificação'
        THEN 'SEM_ALTERACAO_DE_CLASSIFICACAO_DE_DESPESA'
      WHEN category_matches>1 OR payment_matches>1 THEN 'AMBIGUA'
      WHEN category_matches=0 OR payment_matches=0 THEN 'SEM_CORRESPONDENCIA'
      ELSE 'DOMINIO_OU_VINCULO_EXIGE_REVISAO' END AS confianca,
 concat_ws('|',
  'ORIGEM_PLANILHA_TIPO_GRUPO_CLASSE_METODO',
  CASE WHEN category_matches=1 THEN 'CAT_UNICA_NOME_GRUPO_TIPO' ELSE 'CAT_MATCH_'||category_matches END,
  CASE WHEN payment_matches=1 THEN 'PAG_UNICO_NOME_TITULAR' ELSE 'PAG_MATCH_'||payment_matches END,
  CASE WHEN has_ledger THEN 'COM_LEDGER' END,
  CASE WHEN has_receipt THEN 'COM_RECIBO' END,
  CASE WHEN has_payable_payment THEN 'COM_BAIXA' END,
  CASE WHEN has_imported_row THEN 'COM_IMPORTACAO' END,
  CASE WHEN NOT COALESCE(account_owned_active,FALSE) THEN 'CONTA_FORA_ESCOPO_OU_INATIVA' END,
  CASE WHEN grupo_financeiro='RECEITA' AND lower(legacy_expense_class)='sem classificação'
    THEN 'RECEITA_SEM_CLASSIFICACAO_DE_DESPESA_LEGITIMA' END,
  CASE WHEN grupo_financeiro IN ('CARTAO_CREDITO','BENEFICIO_VEROCARD','DESPESA_RECORRENTE')
    THEN 'EXIGE_WRITER_ESPECIALIZADO' END,
  CASE WHEN unica_candidata_simples THEN 'SEM_VINCULOS_FINANCEIROS_DETETADOS_E_STATUS_PRESERVADO'
    ELSE 'SEM_AUTORIZACAO_DE_ESCRITA' END
 ) AS evidencia,
 FALSE AS escrita_autorizada
FROM review
ORDER BY event_id;
