-- ETAPA 10 | Diferenca entre mapa RECEITA (571) e recorte SEM CLASSIFICACAO (587).
-- Fonte: Supabase meg-financas. SOMENTE SELECT; nenhum dado pessoal ou ID individual.
-- Mapa total: ativos, categoryId ou paymentMethodId ausente.
-- Recorte 589: ativos, categoryId ausente, expenseClass SEM CLASSIFICAÇÃO;
-- nele 587 sao income e 2 sao expense. Nao extrapolar para outros grupos.
WITH source AS (
 SELECT e.id, e.type, e."categoryId" AS category_id,
  e."paymentMethodId" AS payment_id, e."archivedAt" AS archived_at,
  a.type AS account_type,
  lower(btrim(COALESCE(e."sourcePayload"->>'expenseClass',''))) AS legacy_class,
  lower(btrim(COALESCE(e."sourcePayload"->>'paymentMethod',''))) AS legacy_method,
  lower(btrim(COALESCE(e."sourcePayload"->>'financialScope',''))) AS legacy_scope,
  lower(btrim(COALESCE(e."sourcePayload"->>'modality',''))) AS legacy_modality,
  (SELECT min(p.type) FROM public."PaymentMethod" p
   WHERE p."userId"=e."userId" AND p."isActive"=TRUE
     AND lower(btrim(p.name))=lower(btrim(COALESCE(e."sourcePayload"->>'paymentMethod','')))
  ) AS matched_method_type
 FROM public."FinancialEvent" e
 LEFT JOIN public."Account" a ON a.id=e."accountId"
 WHERE e."archivedAt" IS NULL
),
mapped AS (
 SELECT *,
  (category_id IS NULL OR payment_id IS NULL) AS in_map,
  (category_id IS NULL AND legacy_class=lower('SEM CLASSIFICAÇÃO')) AS in_sem_classification,
  CASE
   WHEN lower(COALESCE(account_type,''))='benefit'
     OR legacy_scope='benefit' OR legacy_method='verocard' OR legacy_modality='alimentação'
       THEN 'BENEFICIO_VEROCARD'
   WHEN legacy_modality IN ('credito','crédito') OR legacy_method LIKE 'cartão%'
     OR legacy_method LIKE 'cartao%' OR lower(COALESCE(matched_method_type,''))='credit'
       THEN 'CARTAO_CREDITO'
   WHEN type='income' THEN 'RECEITA'
   ELSE 'OUTRO'
  END AS grupo_do_mapa
 FROM source
)
SELECT
 count(*)::int AS ativos_total,
 count(*) FILTER (WHERE in_map)::int AS mapa_total,
 count(*) FILTER (WHERE type='income')::int AS receitas_ativas_total,
 count(*) FILTER (WHERE type='income' AND in_map)::int AS receitas_tipo_no_mapa,
 count(*) FILTER (WHERE in_map AND grupo_do_mapa='RECEITA')::int AS receitas_comuns_mapa_571,
 count(*) FILTER (WHERE in_map AND type='income' AND grupo_do_mapa='BENEFICIO_VEROCARD')::int AS receitas_beneficio_mapa_18,
 count(*) FILTER (WHERE in_sem_classification)::int AS recorte_sem_classificacao_589,
 count(*) FILTER (WHERE in_sem_classification AND type='income')::int AS receitas_sem_classificacao_587,
 count(*) FILTER (WHERE in_sem_classification AND type='expense')::int AS despesas_sem_classificacao_2,
 count(*) FILTER (WHERE in_sem_classification AND type='income' AND in_map AND grupo_do_mapa='RECEITA')::int AS intersecao_570,
 count(*) FILTER (WHERE in_sem_classification AND type='income' AND in_map AND grupo_do_mapa='BENEFICIO_VEROCARD')::int AS intersecao_17,
 count(*) FILTER (WHERE in_map AND type='income' AND NOT in_sem_classification AND grupo_do_mapa='RECEITA')::int AS fora_do_recorte_receita_1,
 count(*) FILTER (WHERE in_map AND type='income' AND NOT in_sem_classification AND grupo_do_mapa='BENEFICIO_VEROCARD')::int AS fora_do_recorte_beneficio_1
FROM mapped;
