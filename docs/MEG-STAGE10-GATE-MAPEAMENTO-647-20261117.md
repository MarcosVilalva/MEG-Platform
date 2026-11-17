# MEG Web Evolution | Etapa 10 | Gate de triagem financeira real dos 649 candidatos comuns
**Data:** 17/11/2026. **Escopo:** exclusividade da Etapa 10, [issue #700](https://github.com/MarcosVilalva/MEG-Platform/issues/700) e [PR #697 Draft](https://github.com/MarcosVilalva/MEG-Platform/pull/697). **Nada foi migrado em produção.**

## 1. Resultado do PostgreSQL real, somente leitura

SQL repetível: `scripts/meg-stage10-low-risk-647-readonly.sql`, executado diretamente em Supabase sob `BEGIN TRANSACTION READ ONLY`, fechando com `ROLLBACK`.

| Medida | Contagem |
| --- | ---: |
| Lançamentos ordinários monetários à vista com par técnico de FKs | **649** |
| Exceções com sinal positivo de despesa, para revisão especializada | **2** |
| Propostas com menor risco estrutural, ainda sem aprovação | **647** |
| Despesas pagas nesse grupo de 647 | **511** |
| Despesas planejadas nesse grupo | **135** |
| Receitas pagas nesse grupo | **1** |
| Contas inativas ou divergentes do titular entre os 649 | **0** |
| Dependências LedgerEntry/Receipt/PayablePayment/ImportedRow entre os 649 | **0** |

O grupo foi filtrado por dono, categoria ativa com nome + grupo + tipo compatíveis, método ativo com nome compatível, modalidade histórica `à vista`, escopo `monetary`, sem marcador especial de cartão/benefício, sem FK previamente atribuída e com conta monetária vinculada.

**647 é um grupo para REVISÃO, não para UPDATE.** Não prova inexistência de outras regras de domínio, nem validação de custos, cartão, histórico arquivado, operação do Android ou saldos agregados.

## 2. Barreiras automatizadas no código QA

`apps/api/src/modules/finance/stage10-historical-mapping-review.ts` é um classificador **puro, sem queries, DML, writer ou rota pública**, executado pela matriz `stage10-historical-mapping-review.test.ts`.

Ele falha fechado quando há: evento arquivado, titular inexistente, conta não monetária, conta inativa/de outro dono, vínculo canônico preexistente, categoria ou método de outro dono, ausência de match único, rótulo sentinela, cartão, crédito, Verocard/benefício, outro escopo/modalidade, status não reconhecido, sinal/valor inválido, dependências de ledger/recibo/baixa/importação, categoria Fixo ou mudança de `resolveCanonicalFinancialStatus`.

Até para as propostas classificadas `eligible_for_explicit_review`, o resultado é obrigatoriamente `writeAuthorized:false`. O módulo **não implementa aprovação nem migração**, pois a decisão de autorizar um vínculo financeiro real ainda não existe.

## 3. Prova de neutralidade e rollback no PostgreSQL 17 descartável

`apps/api/src/modules/finance/stage10-mapping-link-neutrality.isolated.test.ts` cria um workspace, conta monetária, categoria, método e lançamento **fictícios**, verifica a triagem e efetua dentro de uma única transação QA uma associação de FKs. Antes e depois confere ID, legacyTransactionId, userId, workspaceId, accountId, status, type, description, amount, signedAmount, data, competência, sourcePayload, quantidade de entradas ledger, unicidade da chave legada e novos IDs de catálogo.

A transação é **abortada intencionalmente**, e o teste confirma que User/FinancialEvent fictícios não persistiram.

**Evidência:** [Actions #44102527881](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44102527881) **SUCCESS**, PostgreSQL 17 descartável e regressões completas. O código QA não substitui a função financeira de produção.

## 4. O que continua bloqueado

Consulta adicional somente leitura demonstrou:
- **1.855** históricos de modalidade `CREDITO` com método candidato `type=other`: **1.729 com status paid**, **126 planned**, 30 com signedAmount positivo;
- **278** históricos Verocard/benefício com método candidato `type=credit`: **todos status paid**, 3 com signedAmount positivo.

Os números são históricos e não provam erro de saldo. Crédito, parcelamento, fatura e benefício têm escritores distintos, e as classificações existentes precisam de revisão por domínio. Não converter `paid` para `planned` nem sinais automaticamente.

## 5. Critério de encerramento da issue #700

Antes de qualquer execução produtiva, é necessário revisão das correspondências por ID, concordância das regras de cartão e benefício, neutralidade de status/saldos/parcelas, backup e restauração verificáveis, transação com controle de concorrência e autorização expressa de migração. Resolver também #699 quanto ao Android: atribuir FKs e então bloquear edições legadas pode criar repetição de 409 no cliente congelado.

**Indicador mantido:** 40% técnico da Etapa 10, 0% de migração real. Sem merge, deploy, Android, produção ou custos.