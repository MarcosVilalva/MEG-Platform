# MEG | Etapa 10 | Gate de saneamento financeiro isolado
**Data:** 17/11/2026  
**Base:** PR #696 Draft, commit `5a3f6b81817b7739d0c13f509d93f9898b7b5245`  
**Branch isolada:** `stage10/saneamento-qa-descartavel-20261117`  
**Alcance:** somente SQL de teste em PostgreSQL 17 descartável e caracterização canônica de risco. Nenhum serviço público, writer de aplicação, dado real, esquema produtivo ou deploy é modificado.

## Autorização e limites
O responsável autorizou continuar as etapas necessárias à regularização. Preservam-se os bloqueios já definidos para produção, Android, banco real, alterações de escritores, pagamento, merge e Etapa 11. O gate experimental **não é** autorização de migração produtiva. Não usar o sandbox Supabase da Etapa 09.

## Dados observados na auditoria de leitura
- `FinancialEvent`: 6.576 IDs próprios distintos; 3.731 eventos ativos e 2.845 arquivados.
- Ativos sem `categoryId`: 3.626. Matches únicos usando proprietário + tipo + nome + `sourcePayload.expenseClass`: 3.035; excluídos 2 sentinelas `Sem categoria`: **3.033 candidatos não aprovados**. Outros **591** necessitam resolução; destes, 587 receitas `Receitas` com classe histórica `SEM CLASSIFICAÇÃO`.
- Ativos sem `paymentMethodId`: 3.512; 2.900 matches nominais únicos, **não liberados**; 612 sem match, sendo 496 `Não informado` e 116 `CARTÃO LATAM PASS`.
- Todos os ativos possuem conta e workspace. Dos arquivados, 2.838 não têm workspace e exigem decisão histórica de escopo.
- 1.855 ocorrências históricas `CREDITO` coincidem com método de tipo `other`; 278 ocorrências `ALIMENTAÇÃO` coincidem com método de tipo `credit`. Esses dados são um **bloqueio para migração por nome**.

## Gate técnico adicionado
1. O workflow `.github/workflows/meg-stage10-saneamento-pg17-qa.yml` usa somente banco `meg_stage10_sandbox`, PostgreSQL 17 em serviço descartável GitHub Actions, e a guarda `MEG_STAGE10_ISOLATED_PG=1`. Aborta se a URL não for de loopback, DB esperado e usuário QA. Sem conexão à produção.
2. `scripts/meg-stage10-saneamento-qa.pg.sql` cria **apenas fixtures fictícias** de dois usuários e workspaces. Verifica identidade, categorias homônimas, ausência de classificação, `Fixo`, `Verocard`, crédito, vínculo pré-existente, linhas arquivadas e isolamento entre titulares.
3. A simulação grava **somente nas fixtures descartáveis**, executa savepoint/rollback, prova idempotência e invariantes de ID, proprietário, conta, workspace, data, competência, valores, status, payload e ledger. A transação externa termina em `ROLLBACK`.
4. `stage10-saneamento-risk-characterization.test.ts` comprova que incluir referência `credit` ou `Fixo` pode alterar uma futura decisão de status. Nenhuma atualização produtiva será executada nesses casos.
5. Testes de política existente `financial-policy.test.ts` e `card-statement-canonical.test.ts` acompanham o gate.
6. O workflow exige consulta final com **zero fixtures persistidas**.

## Gates ainda necessários
- Confirmar execução e resultado do workflow no GitHub Actions. Código enviado não implica teste verde.
- Validar a semântica do importador por versão e o contrato das categorias antes da aprovação da lista real.
- Reconciliação financeira canônica com fixtures isoladas de faturas e benefícios, inclusive estado histórico e risco de status.
- Aprovar tratamento das 591 categorias e 612 formas de pagamento não resolvidas, dos 2.838 arquivados sem workspace e do catálogo de pagamento (`credit/other`).
- Planejar um pacote de produção com mapeamento por ID, trilha de auditoria, backup restaurado em sandbox específico, lock/versão, dry-run e rollback; este pacote ainda **não existe**.
- Teste real autenticado da Web e homologação visual/funcional explícita. PR #696 continua Draft, sem merge.

**Estado:** gate QA preparado; não confundir com banco normalizado ou homologação de produção.


## Bloqueio P0 encontrado depois do primeiro gate
Consulta somente leitura ao AppState real: `mode=normalized-primary`, revisão **1561**, espelho com **3.630** transações. Dos **3.731** eventos ativos, **3.630** possuem `legacyTransactionId`; destes, **4** já têm `categoryId`, **118** têm `paymentMethodId`, e **118** têm `LedgerEntry`. Não significa que todos sofrerão uma nova sincronização, mas define o conjunto potencialmente atingível.

A função existente `synchronizeNormalizedRows` em `apps/api/src/modules/app-state/normalization-migration.ts` contém `deleteMany` seguido de `createMany`. As rotas `PATCH /app-state/transactions` e `PUT /app-state` a alcançam nas condições descritas em `apps/api/src/modules/app-state/routes.ts`. No teste isolado `stage10-saneamento-sync-characterization.isolated.test.ts`, o evento fictício teve **ID recriado, categoryId e paymentMethodId perdidos**; a transação foi revertida. [GitHub Actions #44068500928](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44068500928) **SUCCESS**, incluindo o teste de reprodução da perda e rollback.

**Decisão de segurança:** nenhuma correção histórica em produção até resolver a [Issue P0 #698](https://github.com/MarcosVilalva/MEG-Platform/issues/698). A regularização de IDs sem sanear essa sincronização pode ser desfeita em futura gravação legítima.

**Escopo obrigatório da futura correção:** preservar ID existente, vínculos canônicos e FK de ledger/receipt/payable/import; usar atualização em lugar quando juridicamente/financeiramente permitida, nunca apagar/recriar sem prova; caracterizar caminhos `PATCH`/`PUT`, exclusões, estados antigos, concorrência e Android. Se a semântica de operação não estiver comprovada, rejeitar a mutação e não perder dados. Testar tudo em PostgreSQL 17 descartável. Sem deploy, merge nem alteração produtiva neste gate.
