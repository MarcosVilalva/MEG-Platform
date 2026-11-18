# MEG Web Evolution | Etapa 10 | Denominadores, três padrões, QA e paridade de leitura

Data: **18/11/2026**. Branch: `stage10/android-confirmacao-qa-20261118`. PR #701 DRAFT. **Apenas SELECT na produção. Sem merge, deploy, APK ou piloto produtivo.**

## 1. Reconciliar explicitamente 571 versus 587 (COMPROVADO)

Consulta reproduzível no projeto `meg-financas`: [`scripts/meg-stage10-571-587-denominators.readonly.sql`](../scripts/meg-stage10-571-587-denominators.readonly.sql), executada via Supabase SQL somente leitura; não contém dados pessoais.

**Denominadores:**
- Todos `FinancialEvent` ativos (`archivedAt IS NULL`): **3.731**. Deles, **646** são `type='income'`.
- Universo do mapa: ativos com `categoryId IS NULL OR paymentMethodId IS NULL`: **3.626**; nele **589** são `type='income'`. A segmentação prioriza `BENEFICIO_VEROCARD` pela conta, escopo, pagamento Verocard ou modalidade alimentação. Consequentemente **571** são RECEITA comum e **18** são receitas no grupo BENEFICIO_VEROCARD.
- Universo restrito `SEM CLASSIFICAÇÃO`: ativos com `categoryId IS NULL` e `lower(trim(sourcePayload.expenseClass))='sem classificação'`: **589** eventos, incluindo **587 `income`** e **2 `expense`**. Recorte não condicionado ao `paymentMethodId`.
- **Interseção das 587 com o mapa:** **570** classificadas em RECEITA comum e **17** classificadas em BENEFICIO_VEROCARD. Das 17, **14** têm conta benefit/escopo benefit com meio de pagamento histórico `Não informado`, e **3** com Verocard/ALIMENTAÇÃO. Esses 14 não devem ser convertidos em renda monetária ordinária sem regra própria.
- **Fora do recorte:** exatamente **1** `income` no grupo RECEITA comum, com classe `CONTAS GERAIS`, grupo `Receitas` e método PIX, e **1** no grupo BENEFICIO_VEROCARD, com classe `CONTAS GERAIS`, grupo `Receitas`, método `Não informado` e conta benefit.
- Equações do resultado: `570 + 1 = 571`; `570 + 17 = 587`; `571 + 18 = 589` receitas do mapa; `587 + 2 = 589` no recorte estrito. São **dois 589 diferentes**: um de eventos income no mapa, outro de todos os tipos no recorte de classificação.
- Regra original da planilha: receitas podem legitimamente deixar vazia a classificação de **despesa**. Um `categoryId NULL` de receita não autoriza atribuir uma categoria inventada. Não extrapolar estas contagens para outros filtros.

## 2. As 107 propostas, verificadas individualmente em SELECT real

Com o [mapa SQL por ID](../scripts/meg-stage10-reconciliation-map.readonly.sql), foram contadas **107** propostas estritas de duas FKs em `DESPESA_COMUM`, das quais **106 `paid`** e **1 `planned`**.

**Checagens da base corrente:**
- **107/107** possuem precisamente uma transação no `AppState.state.transactions` com o mesmo `legacyTransactionId`.
- **107/107** possuem `sourcePayload` **integralmente idêntico** ao objeto correspondente no espelho legado.
- **107/107** possuem propostas não nulas de `categoryId` e `paymentMethodId`, com catálogos ativos e correspondência única por titular + nome/grupo/tipo ou nome do pagamento.
- Zero registros com `LedgerEntry` vinculado; zero com a descrição contendo Verocard; zero com forma de pagamento tipo credit entre as propostas, conforme regras do mapa.
- Esses testes são evidência de **elegibilidade para revisão**, não de permissão para execução. O classificador financeiro canônico e a política de status ainda precisam ser aplicados em QA com amostra fiel à produção antes de piloto.

**Lote mínimo selecionado em conversa privada, sem inserir IDs produtivos neste repositório público:** três `expense` `ONE_OFF` de `CONTAS GERAIS`, combinando (1) TITULOS/PREVIDÊNCIA e DÉBITO AUTOMÁTICO / paid; (2) LAZER e PIX / paid; (3) MOTO e BOLETO / planned. Todos os três têm duas FKs ausentes, candidatos únicos, conta monetária válida, sem ledger/recibo/baixa/importação, espelho legado único e `normalized-primary`. IDs concretos e valores são fornecidos apenas ao titular na conversa para revisão, não nesta documentação pública.

## 3. A réplica QA integral ainda NÃO existe

**Impedimentos técnicos confirmados:**
- A organização Supabase `MEG Vilalva` está no plano **Free**, confirmado por consulta de leitura da organização. Branching gerenciado para réplica isolada é recurso de plano **Pro**. Não autorizar custos sem consentimento específico; não promover upgrade.
- O projeto de recuperação `meg-stage09-restore-sandbox-20261112` existe, mas uma consulta SELECT já confirmou que **não contém a tabela `FinancialEvent`**. Não criar tabelas ali nem confundir sandbox de restauração com réplica fiel da Etapa 10.
- O runner PG17 descartável recebe o schema Prisma do código, **não contém dados financeiros produtivos**, e não tem acesso à base real. Sem canal privado de importação das linhas correntes nesse runner, uma cópia fiel dos 3.626 eventos não foi montada. Transferir IDs, valores ou dados sensíveis ao repositório público/artefatos de CI seria inadequado.

**Alternativa segura EXECUTADA, não apenas proposta:** cruzar diretamente **todos os 107 IDs na base real por SELECT** e reproduzir em PG17 de CI três padrões de origem (nome de grupo, classificação, método, estado, conta, modalidade, frequência) com **IDs, descrições, datas e valores fictícios**, além dos sete casos QA de domínio/ambiguidade já validados. Esta é uma reprodução **estrutural**, não uma restauração fiel da base corrente.

## 4. Ensaio QA efetivamente executado com duas interfaces da API

Novo teste: [`apps/api/src/modules/finance/stage10-qa-legacy-web-android-parity.pg17.isolated.test.ts`](../apps/api/src/modules/finance/stage10-qa-legacy-web-android-parity.pg17.isolated.test.ts). Workflow reutilizado: [`meg-stage10-reconciliation-map-pg17.yml`](../.github/workflows/meg-stage10-reconciliation-map-pg17.yml).

- Primeiro run [#44370459595](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44370459595): **FAIL da fixture**, porque eventos de QA foram semeados sem os metadados calculados pela rotina canônica `buildNormalizationPreview`. Corrigida **somente a montagem da fixture** para usar a rotina real, sem mudança financeira ou produtiva.
- Run final [**#44370905954 SUCCESS**](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44370905954), com banco PostgreSQL 17 descartável, servidor Fastify real injetado, JWT real de titular fictício e guardas exigindo host `127.0.0.1`, porta `5432`, database `meg_stage10_sandbox`, role `meg_stage10_ci`, `MEG_STAGE10_QA_LOCAL_ONLY=1`, `MEG_STAGE10_ISOLATED_PG=1`.
- O mesmo run preservou os seis PASS pré-existentes: separação dos sete domínios/ambiguidade, revisão canônica, rollback, saldo monetário canônico, idempotência com IDs/ledger, e constraint de duplicidade.
- **Novos PASS reais no log:**
  1. `MEG_STAGE10_PARITY_QA_THREE_SOURCE_PATTERNS=PASS` (três representações artificiais coerentes com o legado original, com comparação do classificador).
  2. `MEG_STAGE10_PARITY_QA_BATCH_ROLLBACK=PASS` (três alterações tentadas e transação revertida integralmente).
  3. `MEG_STAGE10_PARITY_QA_IDS_AMOUNTS_BALANCES_LEDGER=PASS` (lote de 3 aplicado apenas em PG17, reenvio sem efeito, mesmos IDs, legados, valor em centavos, status, data, ledger e saldos `monetaryAccountBalanceAt`/`monetaryBalanceAt`).
  4. `MEG_STAGE10_PARITY_QA_WEB_HISTORY_ANDROID_APPSTATE_CONTRACT=PASS` (repostas REST autenticadas `/finance/events/history-snapshot` e `/app-state`; valores, ID legado, data, status, conta, grupo, classe e forma preservados; Web retorna novos vínculos canônicos, espelho Android continua sem perda nem divergência).
  5. `MEG_STAGE10_PARITY_QA_NO_ANDROID_BINARY_EXECUTION=NOT_TESTED` (limite registrado de forma deliberada).

**Fronteira da prova:** ambas as rotas foram executadas na **API QA**, não na Web Render LIVE ou na APK física. A análise do código histórico do commit do APK 2.0.708 (`36c886b9...`) mostrou que `apps/web/src/phoenix/data/load-phoenix-read-model.ts` chama `/app-state`, mas **não prova o que a APK instalada efetivamente exibirá**. Sem dispositivo conectado ao ambiente e com artefato QA bloqueado pelo gate de dependências, não houve homologação Android física. A Web operacional também permanece sem aprovação visual explícita.

## 5. Proibições e saída

- **Produção:** SQL SELECT apenas. Nenhum UPDATE/INSERT/DELETE/DDL, alteração de conta/identidade/valores, merge, deploy ou Android congelado.
- **Gates abertos:** cópia QA fiel e privada, teste integral do lote real, backup restaurável atual, reversão operacional pós-piloto, gate monorepo de dependências (picomatch), integração e compatibilidade real do Android, aprovação visual e autorização explícita de cada lote produtivo.
- PR #702 proteção de IDs permanece Draft e não publicada. PR #701 continua Draft. Etapa 11 proibida.
- **Próxima ação executável sem custo nem dados reais:** desenvolver mecanismo protegido para inserir um subconjunto anonimizado e representativo em PG17 efêmero por canal privado, mantendo a prova atual como gate básico. Em paralelo, revisar por ID as três propostas na conversa e só pedir autorização de produção após os gates de segurança e recuperação.

**Saúde do chat:** normal nesta atualização. Continuar exclusivamente Etapa 10.
