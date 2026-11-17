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


## Correção da causa P0 implementada e testada na branch QA
**Data:** 17/11/2026. **Status:** implementação em PR #697 Draft, não mesclada e NÃO implantada.

A função `synchronizeNormalizedRows` foi modificada **somente nesta branch** para atualização em lugar com `updatedAt` como guarda concorrente. Ela mantém o `FinancialEvent.id` e os `categoryId` / `paymentMethodId` existentes; não usa mais `deleteMany/createMany` no caminho sincronizado primário. Valida unicidade de ID legado, proprietário e conta antes de aceitar criação ou alteração. Não aceita classificação de origem incompatível com vínculos canônicos já existentes. Eventos com `LedgerEntry`, `Receipt`, `PayablePayment` ou `ImportedRow` somente admitem repetição idêntica do espelho; qualquer mudança de conteúdo ou exclusão exige escritor canônico específico e retorna conflito. Mudança de conta via espelho também é rejeitada para registros existentes.

A exclusão de evento legado *sem dependências* passou a efetuar arquivamento, conservando o registro e ID; reativação implícita da mesma chave legada é bloqueada por exigência de protocolo explícito de restauração. Isso é adaptação funcional deliberadamente conservadora que precisa de validação de compatibilidade na integração com Android/legado antes de deploy.

As rotas `apps/api/src/modules/app-state/routes.ts` agora traduzem bloqueios do sincronizador em HTTP **409**, com falha fechada. No `PUT`, o `UPDATE` usa a revisão original no `where` para impedir gravação obsoleta e traduz eventual `P2025` em `STATE_CONFLICT`.

### Evidência técnica
- Workflow [#44074296133](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44074296133): **SUCCESS** na revisão de código da branch QA, contendo provas sintéticas de identidade/FKs, rollback, bloqueio das alterações de categorias, métodos e conta, arquivo de histórico, teste de referência a `LedgerEntry`, `Receipt`, `PayablePayment`, `ImportedRow`, preservação de usuário e workspace, idempotência.
- Testes existentes de normalização, espelho primário, AppState, `event-mutation`, benefício, transferência e autoridade financeira: executados no mesmo workflow com **SUCCESS**.
- TypeScript `npx tsc -p apps/api/tsconfig.json --noEmit`: **SUCCESS**.
- O teste inicial de TypeScript falhou em teste de caracterização por propriedades extras no objeto Verocard, foi corrigido antes do gate final verde. Não esconder o histórico.
- Sem modificações em Supabase real, Render, `main`, Android, autenticação produtiva ou banco externo; PostgreSQL descartável `meg_stage10_sandbox` com fixtures fictícias revertidas.

### Gates remanescentes antes de retirar o P0
1. Verificar end-to-end autenticado o comportamento dos endpoints `PATCH/PUT` e o tratamento de 409 em fluxo legítimo do cliente. O teste atual é de função e contratos existentes, não homologação de navegador autenticado.
2. Caracterizar explicitamente efeitos da nova política de arquivamento e restauração sobre o cliente legado/Android, sem modificar o Android.
3. Conferir invariantes financeiros com os demais escritores e concorrência da Web, quando for disponibilizada QA integrada isolada, sem dados reais.
4. Validar visualmente a Web publicada, ainda SEM aprovação explícita do usuário.
5. Resolver a correspondência das 3.033 categorias candidatas e 2.900 formas de pagamento candidatas, os casos não resolvidos, catálogo Verocard/credit/other e os 2.838 arquivados sem workspace. Não assumir que correspondência nominal é migração autorizada.
6. Preparar backup restaurado, dry-run referenciado por IDs, plano de rollback e autorização **específica** antes de qualquer saneamento do Supabase real ou merge/deploy.

A Issue [#698](https://github.com/MarcosVilalva/MEG-Platform/issues/698) fica aberta até integração e aprovação dos gates. Sem iniciar a Etapa 11.


## Gate adicional: HTTP Fastify.inject integrado, PG17 descartável
**Data:** 17/11/2026. [Actions #44075362762](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44075362762): **SUCCESS** no commit de código `21ef93b91b8fb02e50369af58694c3a26c527160`.

Novo teste `apps/api/src/modules/finance/stage10-saneamento-routes.isolated.test.ts`, com rotas **reais** `appStateRoutes`, usando `Fastify.inject`, isolamento PostgreSQL 17 e autenticação **simulada**, não JWT real. Provas:
1. `PATCH /app-state/transactions` com revisão válida atualiza em lugar, preservando ID e referências de categoria/pagamento, e incrementa revisão.
2. `PATCH` obsoleto retorna HTTP 409 `STATE_CONFLICT`.
3. Mudar rótulo legado com `categoryId` canônico gera HTTP 409 `NORMALIZATION_CANONICAL_CATEGORY_CONFLICT` sem atualização de AppState ou evento.
4. `PUT /app-state` completo com revisão correta mantém ID e avança revisão; revisão obsoleta retorna 409.
5. Após anexar `LedgerEntry`, `PATCH` e `PUT` que tentem modificar a mesma origem retornam HTTP 409 `NORMALIZATION_LINKED_EVENT_REQUIRES_CANONICAL_WRITER`, mantendo AppState, ID e ledger.
6. Banco descartável tem fixtures removidas ao fim e workflow verifica ausência de resíduos; nenhuma consulta/escrita ao Supabase produtivo.
7. Testes de AppState, autoridade financeira, benefício, transferências e `tsc` concluíram com sucesso.

**Limitação:** o teste não usou JWT real e não constitui homologação visual/funcional com conta financeira real. A compatibilidade do comportamento de soft archive e da política fail-closed com fluxos legítimos do Android/legado precisa ser caracterizada sem alterar o Android. A Issue P0 #698 permanece aberta até aprovação técnica e autorização de integração. Ainda **não** há autorização para deploy, merge ou saneamento do banco real.
