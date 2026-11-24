-- Etapa 10 | Prova do recorte de 589 registros: consulta somente leitura.
-- A planilha original permite campo CLASSIFICACAO DA DESPESA vazio em receitas.
-- Nao generalizar esta contagem para registros fora do recorte.
WITH original_scope AS (
 SELECT e.id, e.type, e.status,
  btrim(COALESCE(e."sourcePayload"->>'expenseClass','')) AS legacy_expense_class,
  btrim(COALESCE(e."sourcePayload"->>'category','')) AS legacy_group,
  btrim(COALESCE(e."sourcePayload"->>'paymentMethod','')) AS legacy_payment,
  btrim(COALESCE(e."sourcePayload"->>'modality','')) AS legacy_modality,
  e."categoryId" AS category_current_id
 FROM public."FinancialEvent" e
 WHERE e."archivedAt" IS NULL
),
recorte_589 AS (
 SELECT * FROM original_scope
 WHERE category_current_id IS NULL
 AND lower(legacy_expense_class)=lower('SEM CLASSIFICAÇÃO')
)
SELECT type AS tipo, count(*)::int AS registros,
 count(*) FILTER (WHERE lower(legacy_group)='receitas')::int AS grupo_receitas,
 count(*) FILTER (WHERE lower(legacy_payment)='não informado')::int AS pagamento_nao_informado,
 count(*) FILTER (WHERE lower(legacy_payment)='pix')::int AS pagamento_pix,
 count(*) FILTER (WHERE lower(legacy_payment)='verocard')::int AS pagamento_verocard,
 count(*) FILTER (WHERE lower(legacy_payment)='dinheiro')::int AS pagamento_dinheiro,
 count(*) FILTER (WHERE lower(legacy_payment)='cartão ml')::int AS pagamento_cartao_ml
FROM recorte_589 GROUP BY type ORDER BY type;
