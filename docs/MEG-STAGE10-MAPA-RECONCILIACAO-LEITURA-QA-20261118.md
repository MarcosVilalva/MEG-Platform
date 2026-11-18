# MEG Web Evolution | Etapa 10 | Mapa real de reconciliação e ensaio PG17

**Data:** 18/11/2026. **Status:** triagem real **somente leitura** e execução de QA **fictícia** comprovadas. Nenhuma autorização de atualização de produção.

## 1. Fonte da verdade e proteção dos dados
- Banco de origem: Supabase `meg-financas` PostgreSQL 17; acesso exclusivamente SQL `SELECT` pela conexão autenticada.
- Planilha original, regra confirmada pelo titular: Excel `CLASSIFIÇÃO DA DESPESA` corresponde ao rótulo `sourcePayload.expenseClass`; Excel `GRUPO` corresponde a `sourcePayload.category`. Receitas podem não possuir classificação de despesa, forma ou situação preenchidas.
- **Arquivo operacional por ID:** [`scripts/meg-stage10-reconciliation-map.readonly.sql`](../scripts/meg-stage10-reconciliation-map.readonly.sql). A consulta possui uma linha para cada `FinancialEvent.id` ativo com categoria ou método de pagamento não vinculado. Apresenta tipo, status, data, valores, IDs atuais, classe/grupo/método de origem, conta, domínio financeiro, correspondências restritas a titular+catálogo ativo, IDs candidatos, evidência, confiança e `escrita_autorizada=false`. Não consulta descrições, nomes, emails ou observações.
- O repositório é **público**. **Não versionar a saída com IDs, valores, titular ou lista de transações reais**. Versionar apenas a consulta e os totais agregados. IDs exatos e diferenças são obtidos diretamente com SELECT autenticado no Supabase quando existir gate e autorização específica para piloto. Nenhum lote real foi autorizado.
- Fingerprint do mapa em 18/11/2026, para detecção de alterações entre snapshots: MD5 de `event_id:category_proposed_id:payment_proposed_id` concatenados por ID, **`c4c054589418d5e8a2e13cfffbbd153c`**. Não é assinatura de integridade criptográfica nem backup.

## 2. Resultado EXECUTADO: mapa por IDs, produção SELECT

| Domínio | Eventos com vínculo ausente | Propostas automáticas de FK | Regra |
|---|---:|---:|---|
| Receita | 571 | 0 | Classificação de despesa ausente pode ser legítima |
| Despesa comum | 108 | **107, apenas para revisão** | Corresponde por nome+grupo+tipo, pagamento por nome+titular, sem vínculo financeiro conhecido e frequência pontual |
| Despesa recorrente | 559 | 0 | Exige regra de recorrência, competência e preservação de vínculos |
| Cartão de crédito | 2.095 | 0 | Exige autoridade de compra, parcelas e fatura |
| Benefício/Verocard | 293 | 0 | Exige writer de benefícios e saldo próprio |
| **Total** | **3.626** | **107** | **0 escritas autorizadas** |

A consulta retornou **3.626 IDs distintos**. As 107 propostas são técnicas, **não equivalem a 107 alterações aprovadas**. O classificador canônico precisa ser revisado por ID antes da escrita; a proteção da API não está publicada. Os grupos acima são definidos por sinais do evento importado e do domínio; constituem **triagem**, não julgamento definitivo da natureza de toda transação.

- Eventos com um match único em ambos os catálogos: **2.919** segundo o mapa, mas isso **não é critério suficiente de escrita**, pois a maioria pertence a cartão, benefícios, recorrências ou receitas.
- Despesa comum: 108 linhas; 107 passaram na triagem conservadora e 1 possui vínculo contábil.
- Recorrentes: 559, dos quais 18 já possuem ledger relacionado.
- Cartões: 2.095, dos quais 95 já possuem ledger relacionado.
- Benefícios: 293, com catálogo de pagamentos de um único nome ativo em 278 ocorrências.
- Os campos `categoria_atual` e `metodo_atual` não foram modificados. O mapa deixa `category_proposed_id` e `payment_proposed_id` nulos em casos especiais/inseguros.

## 3. Verificação independente dos 589

**Consulta reproduzível:** [`scripts/meg-stage10-589-source-rule.readonly.sql`](../scripts/meg-stage10-589-source-rule.readonly.sql). Recorte EXATO: `FinancialEvent` com `archivedAt IS NULL`, `categoryId IS NULL` e `lower(trim(sourcePayload.expenseClass)) = 'sem classificação'`.

| Tipo | Contagem | Distribuição |
|---|---:|---|
| `income` | **587** | 495 `Não informado`, 88 PIX, 3 VEROCARD e 1 DINHEIRO |
| `expense` | **2** | Ambos `CARTÃO ML`, modalidade crédito |
| **Total no recorte** | **589** | Composição confirmada diretamente na produção via SELECT |

O universo total de eventos ativos com `expenseClass='SEM CLASSIFICAÇÃO'`, independentemente de `categoryId`, contém **590** eventos na auditoria anterior, logo **não** extrapolar a afirmação 587+2 para todo o banco. Receitas legitimamente sem classificação de DESPESA não precisam de categoria inventada. As duas despesas devem seguir o domínio de cartão, não ser convertidas em receita.

## 4. QA real executado em PG17 descartável, dados 100% sintéticos

**Implementação:** [`apps/api/src/modules/finance/stage10-reconciliation-map.pg17.isolated.test.ts`](../apps/api/src/modules/finance/stage10-reconciliation-map.pg17.isolated.test.ts) e [workflow](../.github/workflows/meg-stage10-reconciliation-map-pg17.yml).

**CI de referência atualizado:** [GitHub Actions #44365664676](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44365664676) **SUCCESS**. Processo usa PostgreSQL 17 criado no runner com usuário `meg_stage10_ci`, host `127.0.0.1:5432`, database `meg_stage10_sandbox` e variável obrigatória `MEG_STAGE10_QA_LOCAL_ONLY=1`. Sem conexão com Supabase ou endpoints produtivos.

Marcadores efetivamente verificados nos logs do CI:
- `MEG_STAGE10_MAP_QA_SEVEN_DOMAINS_AND_AMBIGUITY=PASS`: 7 eventos fictícios com receitas, despesas, recorrência, cartão, Verocard, ambiguidade e ledger; nenhum produto cartesiano indevido; proposta apenas para despesa simples.
- `MEG_STAGE10_MAP_QA_CANONICAL_REVIEW_PARITY=PASS`: o caso simples preserva o resultado do classificador de revisão existente.
- `MEG_STAGE10_MAP_QA_TRANSACTION_ROLLBACK=PASS`: atualização fictícia de duas FKs dentro da transação e erro deliberado; após rollback campos e `updatedAt` iguais aos originais.
- `MEG_STAGE10_MAP_QA_CANONICAL_MONETARY_BALANCES=PASS`: saldo anterior/posterior conferido pelas funções canônicas `monetaryAccountBalanceAt` e `monetaryBalanceAt`.
- `MEG_STAGE10_MAP_QA_IDEMPOTENCE_IDS_BALANCE_LEDGER=PASS`: único update fictício, segundo update no-op; contagem, IDs, situações, somas em centavos, ledger e relações de receita mantidos.
- `MEG_STAGE10_MAP_QA_DUPLICATE_LEGACY_ID_BLOCKED=PASS`: constraint única `(workspaceId,legacyTransactionId)` impediu duplicata.

**Limite dos testes:** os sete casos são dados sintéticos representativos; não se executou um lote com 3.626 linhas reais em uma cópia fiel do banco atual. O sandbox de recuperação Supabase `meg-stage09-restore-sandbox-20261112` não possui `FinancialEvent`, logo **não foi usado** como se fosse réplica útil. Os testes provam algoritmo, proteção e reversão nos casos definidos, não homologação de uma migração integral dos dados reais. O CI isolado não substitui o security gate geral do monorepo.

## 5. Gates e próximas ações sem produção

1. Gerar artefato **privado** e versionado para o lote escolhido por ID, sem publicar dados individuais no GitHub público; comparar estado no instante imediatamente anterior ao piloto.
2. Dispor de réplica QA isolada **com esquema e amostra fiel, minimizada** do banco corrente, e simular o conjunto real de candidatos, não apenas os 7 cenários sintéticos.
3. Aprovar e publicar a proteção de IDs da API (#702) somente com auditoria de dependências, compatibilidade do Android instalado, revisão de rollback e autorização explícita.
4. Verificar backup recuperável; demonstrar rollback compatível com vínculos novos. Somente então apresentar a relação exata de IDs, FKs antigas/novas e invariantes para decisão de um pequeno lote em produção.
5. **Sem correção massiva** de receitas, cartões, Verocard e recorrências por similaridade textual. Sem merge, deploy, DML/DDL produtivo ou Etapa 11.

**Etapa 10 permanece aberta.** Indicador anterior 5/10 técnico não é porcentagem de registros consertados. Saneamento produtivo: **0**.
