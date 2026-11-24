# MEG Finanças | Etapa 10 | Issue #699 | Relatório da Fase A (QA isolada)
**Data:** 24/11/2026. **Status:** EM HOMOLOGAÇÃO, NÃO CONCLUÍDA. **PR:** [#706 Draft](https://github.com/MarcosVilalva/MEG-Platform/pull/706), baseada na PR #705, branch `stage10/issue699-phase-a-qa-20261124`. **Issue:** #699 OPEN/P0.

## RESULTADO ATUALIZADO COM EVIDÊNCIA VERIFICADA, 24/11/2026

**Último gate integrado completo:** [GitHub Actions #45468800946](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45468800946), job `138710800004`, **COMPLETED/SUCCESS**, commit do código `f5f7e0f583b15b9a31ab9c9072b34d4b4349d1b9`. Os marcadores individuais no log são **A01–A14 e A18 = PASS (15/18)**, com HTTP Fastify real, JWT de login fictício e PostgreSQL17 descartável. O run anterior #45467858050, onde A10 tinha falhado, fica como histórico de diagnóstico, **superado** pela revisão testada.

**Evidências críticas do log #45468800946:**
- `A04=PASS`: `events=2, ledger=2, audits=2`, secondEvent distinto depois de ACK perdido e novo ID.
- `A05=PASS`: duas despesas legítimas idênticas criadas, `deltaEvents=2, deltaSuspicions=2`.
- `A06=PASS`: ambos os cenários indistinguíveis resultaram em `CREATED_AND_AUDITED`.
- `A10=PASS`: `requests=4, events=4, ledgers=4, bilateralAuditRows=6`; retries serializáveis controlados.
- `A11=PASS`: GET autenticado `/finance/events/suspected-duplicates`, `total=10`, ambos os `pairLinks` presentes, sem exposição entre workspaces (A08).
- `A12=PASS`: `syntheticFailureStatus=500, financialCountsPreserved=true`, rollback atômico.
- `A14=PASS`: `tombstone=true, status=409` após expurgo simulado em banco descartável.
- `A18=PASS`: `twoDifferentIDsCreate=true, ledgerDelta=2, auditDelta=2, possibleDuplicate409=false`.
- A01–A03, A07–A09 e A13 também têm marcadores individuais PASS no mesmo job.

**Critérios ainda pendentes:** A15 integração APK708 nativa com novo writer; A16 APK706 e APK707 originais dinamicamente testadas contra compatibilidade da nova API; A17 regressão completa incluindo revisão humana reversível e RLS. Não confundir **15/18 PASS (83,3% dos gates)** com conclusão da Fase A ou percentual do MEG inteiro. Não declarar 18/18.

**A17, regressão complementar separada:** [run #45469115424](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45469115424), job `138711915864`: **finance domain full static/unit contracts PASS**, **Phoenix/mobile compatibility contracts PASS**, **RLS offline test FAIL**, por exigência **preexistente de RLS explícito em CardLimitControl**. Não alterar schema/política de cartões fora da Etapa 10 nem maquiar o erro. A17 segue **PENDENTE**; revisão humana de suspeitas ainda é consulta sem conclusão manual persistida ou reversão testada.

**Workflow de A16 em preparação:** `.github/workflows/meg-stage10-issue699-phase-a-legacy-apks-native-qa.yml`, com matriz de APK706/707 originais, SHA fixos, CA/proxy HTTPS de QA, egress bloqueado, usando o harness nativo já caracterizado para APK708. O resultado de execução **ainda não foi confirmado**; a intenção de executar não equivale a PASS.

## Escopo e verificação do canal
A revisão do código confirmou que, previamente à Fase A, `GET /finance/audit` listava auditorias gerais e `GET /finance/events` listava eventos, porém **não existia auditoria bilateral persistente de suspeitas nem endpoint específico para consultá-las**. Alertas `POSSIBLE_DUPLICATE` da UI eram transitórios e bloqueantes.

A branch QA passa a oferecer `GET /finance/events/suspected-duplicates?page=1&pageSize=50`, protegido por JWT e autorização de leitura, com retorno paginado (`items,total,page,pageSize`). Cada item contém evento, par relacionado, ID de agrupamento de suspeita, fingerprint versionado, horário e situação `SUSPECTED`. Consulta `Cache-Control:no-store`; filtro de workspace/owner feito no **JOIN SQL** antes da paginação. Não há UI nova nas APKs originais nem operação de exclusão/mesclagem.

## Implementação candidata, sem merge/deploy
- `apps/api/src/modules/finance/event-mutation.ts`: a guarda de duplicidade semântica, antes `POSSIBLE_DUPLICATE/409`, tornou-se detecção **não bloqueante** para criação de despesa; mesmo conteúdo com operação diferente cria um segundo FinancialEvent financeiramente válido, seu ledger e recibo, com auditoria bilateral vinculando o evento predecessor e o novo na mesma transação serializável. O replay do **mesmo operationId+hash** preserva a gravação única. A proteção contra saldo insuficiente não foi removida.
- `apps/api/src/modules/finance/monetary-protection.ts`: fingerprint contextual SHA256 versionado; comparação agora abrange competência e notas; janela de 10 minutos só localiza candidatos. Adicionadas opções explícitas de retry de concorrência serializável para o writer de criação, preservando default dos outros writers.
- `apps/api/src/modules/finance/audit.ts`: ação `FINANCIAL_EVENT_DUPLICATE_SUSPECTED` na tabela AuditLog existente, sem schema novo.
- `apps/api/src/modules/finance/suspected-duplicates-read.ts`: consulta read-only segura, paginação e vínculo A↔B.
- `apps/api/src/modules/finance/routes.ts`: rota autenticada de consulta; POST mantém HTTP 201 só após criação confirmada.
- `apps/api/src/modules/finance/event-mutation.contract.test.ts`: expectativa de política atualizada.
- `apps/api/src/modules/finance/stage10-issue699-phase-a-http-pg17.disposable.test.ts`: suíte sintética sobre Fastify HTTP real + login JWT + PostgreSQL17 local. Não depende de mocks que substituam a mutação da API.
- `.github/workflows/meg-stage10-issue699-phase-a-http-pg17-qa.yml`: runner descartável Ubuntu24.04 + PostgreSQL17, npm ci, Prisma generate/db push só no banco fictício, trigger de tombstone QA-only, build e testes.

**Ambiente de teste:** `GITHUB_ACTIONS=true`, PostgreSQL `127.0.0.1:5432/meg_stage10_phase_a_sandbox` com usuário fictício `meg_stage10_ci`; gate bloqueia banco remoto, produção e banco protegido. APK, Android estável, Render, Supabase, main, merge e deploy intactos.

## Evidências dos gates e execução

**Run [#45467346820](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45467346820):** FAILURE de compilação TS na tipagem do retorno da consulta SQL. Corrigido na branch QA. Nenhum gate financeiro executado nessa tentativa.

**Run [#45467580941](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45467580941):** build e contrato estático PASS, mas login real 401 por maiúscula no e-mail sintético. Fixture corrigida; nenhuma regra de autenticação alterada.

**Run [#45467858050](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45467858050), job 138707511260:** PostgreSQL17 descartável, build API, contrato estático e HTTP/JWT reais executados. A01–A09 deram PASS individual antes de A10 retornar HTTP500 na quarta operação concorrente.

| Gate | Última evidência disponível | Estado estrito |
| --- | --- | --- |
| A01 | POST201, FinancialEvent=1, LedgerEntry=1, receipt=1, auditoria de criação | **PASS** run #45467858050 |
| A02 | Mesmo operationId replay: 1 evento/ledger/receipt, `idempotentReplay=true` | **PASS** run #45467858050 |
| A03 | Mesmo operationId, payload divergente: HTTP409, 0 nova escrita | **PASS** run #45467858050 |
| A04 | Resposta perdida simulada, retry com **novo ID**: 2 eventos, 2 ledger, 2 auditorias de suspeita, 2 receipts | **PASS** run #45467858050 |
| A05 | Duas despesas legítimas iguais: 2 novas gravações + 2 audit logs de suspeita, sem bloqueio | **PASS** run #45467858050 |
| A06 | Mesma decisão conservadora, criar + auditar, para retry e segunda despesa real | **PASS** run #45467858050 |
| A07 | 11 diferenças de fingerprint verificadas; notas diferentes não criam falsa associação | **PASS** run #45467858050 |
| A08 | JWT de outro workspace vê 0 suspeitas; escrita cruzada HTTP409, leitura anônima HTTP401 | **PASS** run #45467858050 |
| A09 | 5 POSTs HTTP concorrentes com mesmo operationId, 1 evento, 1 ledger, 1 receipt | **PASS** run #45467858050 |
| A10 | 4 POSTs com IDs distintos: [201,201,201,500]; não foram quatro gravações confirmadas | **FAIL** run #45467858050; retry serializável ajustado, reexecução pendente |
| A11 | Consulta de ambas suspeitas e vínculos em GET protegido | **PENDENTE** nesta execução, A10 interrompeu a suíte |
| A12 | Falha sintética de auditoria e rollback atômico | **PENDENTE** |
| A13 | Evento predecessor arquivado/estornado, não ressuscitar nem retornar predecessor em falso sucesso | **PENDENTE** |
| A14 | Expurgo simulado de recibo, marcador de tombstone fictício preserva ID | **PENDENTE** |
| A15 | APK708 original emulador, integração com nova API e responses nativas | **PENDENTE**, a caracterização anterior não cobre a nova implementação |
| A16 | Execução dinâmica APKs706/707 originais no contexto da nova implementação | **PENDENTE**, inventário estático não substitui execução |
| A17 | Regressões financeiras completas, consulta autorizada, revisão humana e reversão comprovada | **PENDENTE** |
| A18 | Guarda atual de 10min com `allowDuplicate` ausente/falso deixa criar os dois eventos | **PENDENTE**, A10 interrompeu a suíte |

**Run posterior para revalidar A10:** [#45468209260](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45468209260), commit `73714fa9850cbc26ddc5603e7081df7800a2813e`. No último acompanhamento este run estava `pending` e sem jobs atribuídos. **Não antecipar resultado**. A correção colocou retry `P2034` serializável limitado a 12 tentativas com backoff no writer de criação e reforçou a expectativa A10 para 6 logs de auditoria bilateral.

## Bloqueios e próxima ação
- **NÃO CONCLUÍDO.** Não afirmar 18/18, sem PASS dos gates ainda pendentes.
- Não alterar o contrato de qualquer outro escritor financeiro com base nesta suíte; benefício Verocard, cartão, fatura, transferência, pendentes, PATCH/PUT e demais domínios permanecem sujeitos a A17.
- Canal de revisão humana nesta entrega é **somente consulta autenticada**, sem resolução manual persistida nem UI nas APKs. Fluxo de revisão/correção reversível requer desenho e testes em seu domínio autorizado.
- **Próximo passo exato:** concluir run #45468209260, ler cada log PASS/FAIL, corrigir A10 se necessário sem reduzir integridade; depois executar A11–A14/A18, preparar gates A15/APK708 e A16/APKs706/707 em emuladores originais e A17 de regressão, sem modificar produção. Manter #699 OPEN/P0, PR#705/#706 Draft, sem merge nem deploy.

**Saúde do chat:** ATENÇÃO, operação longa com muitos checkpoints e runs. Este documento é o estado verificável para transferência.


## Execução adicional em APKs originais e regressão RLS, sem homologação

- **Regressão A17:** [run #45469115424](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45469115424) foi parcialmente positivo: `ISSUE699_A17_FINANCE_DOMAIN_CONTRACTS=PASS` e `ISSUE699_A17_WEB_COMPATIBILITY_CONTRACTS=PASS`, mas `npm --workspace packages/database run test:supabase-rls` FALHOU em `RLS deve ser habilitado explicitamente em CardLimitControl`. O arquivo de contrato RLS `packages/database/prisma/supabase-rls-policy.test.ts` tem o **mesmo blob SHA `4ef927b94a1125f6b1ca94e0f76354fcb832d608` na PR #705 base e na PR #706 QA**, logo não foi modificado por esta Fase A. Não concluir A17 nem alterar política de cartões sem etapa/autorização específica.
- **A16, matriz de APKs legadas:** [run #45469309550](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45469309550), Android13 com proxy isolado, APK706 SHA original confirmado, foi instalada e inicializada. Job 706 `138712596606` terminou **FAIL infra exit 137** imediatamente após `ISSUE699_APK708_ORIGINAL_RUNNING_OFFLINE=PASS`, antes da captura de POST. Logo não há comprovação A16 para 706. O job 707 `138712596111` ainda estava em execução no último acompanhamento; **não presumir resultado**. O workflow foi ajustado, em branch QA apenas, para uma tentativa **706 isolada** sem `uiautomator dump` auxiliar após o encerramento 137 (commit `8279d3a5290014247c7b8b0e95c37c9462d24f49`). O instrumento original APK não foi modificado.
- **A15, APK708 original com writer real:** criado `scripts/meg-stage10-issue699-apk708-realwriter-pg17-qa.mjs` (commit `ebdbd6eb342ced106f18af4978be1c7687917fa6`) derivado do harness aprovado, com backend Fastify/JWT local e fixture Prisma sintética, autenticação fictícia, primeira criação PG17 com resposta HTTP retida 130s, retry manual usando ID novo e asserts de 2 eventos, 2 ledgers, 2 receipts, 2 auditorias e GET de suspeitas. Workflow `.github/workflows/meg-stage10-issue699-phase-a-apk708-pg17-qa.yml` (commit `110edb34cae1ca84803739a419682bd1fc67dfe9`) usa Android13 isolado com CA de teste e proxy que bloqueia egress, PostgreSQL17 descartável local. [Run #45469996727](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45469996727), job `138715053459`, tinha passado guard de DB/schema e SHA da APK708, mas estava **in_progress** na instrumentação Android no último acompanhamento. Sem PASS A15 até logs e contagens PG17 confirmados.
- **Limite:** mesmo que A15/A16 sejam aprovados posteriormente, A17 permanece pendente em razão de regressão RLS e ausência de comprovação de revisão humana persistida com correção reversível. Proibido declarar 18/18 ou encerrar #699 enquanto houver qualquer pendência crítica.



## 24/11/2026 | Validação dinâmica APK707 e execuções A15/A16 em andamento

- **APK707 original comprovada em emulador Android13:** [run #45469309550](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45469309550), job `138712596111`, COMPLETED/SUCCESS. Hash SHA256 original `0a4554d1881e736e088e9db05eb7b5592e95667f5d1d5aeb1a17247cf926e6da` confirmado; versão fixada pelo job e exibida como `ISSUE699_A16_TEST_ORIGINAL_APK_VERSION=707`. O harness (logs herdados de nome "APK708", mas realmente aplicado à APK707 original) verificou `CapacitorHttpAndroidInterface.isEnabled()=true`, `ISSUE699_NATIVE_FINANCIAL_POST_PROXY=PASS`, estado de timeout `{"errorVisible":true,"saveEnabled":true,"processing":false}`, `ISSUE699_NATIVE_LONG_TIMEOUT_MANUAL_RETRY_ID_CHANGED=PASS` e `ISSUE699_APK708_ORIGINAL_PROBE_ERRORS=[]`. **É prova dinâmica de transporte/UX sob mock HTTPS local isolado, NÃO é prova de Writer/PG17 novo nem PASS completo A16.**
- **APK706 primeira tentativa:** mesmo run, job `138712596606`, APK706 original SHA `d12bd3b1995609cfdc62db314b1916b54f94e83ee8c3e9d77a89fb3d77f942c1` verificado, instalação e inicialização com egress bloqueado. Terminação 137 no diagnóstico auxiliar `uiautomator dump`, antes de qualquer POST nativo comprovado. **Falha de infraestrutura**, não conclusão sobre a APK. Revisão QA para remover esse diagnóstico custoso no commit `8279d3a5290014247c7b8b0e95c37c9462d24f49`; novo [run #45470294504](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45470294504), job `138716107323`, exclusivo APK706, **em execução na última verificação**.
- **APK708 original contra escritor financeiro REAL:** [run #45469996727](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45469996727), job `138715053459`, preparou PostgreSQL17 real descartável, schema e SHA original da APK708 em PASS; instrumentação Android **em execução na última verificação**. Gate A15 só recebe PASS após os asserts de dois FinancialEvent/ledger/receipts/auditoria bilateral e consulta autenticada, todos no mesmo run, não apenas boot.
- **Status preservado:** **A01–A14 e A18 = 15/18 PASS com evidência no run #45468800946**. A15, A16 e A17 continuam pendentes até comprovação integral. O contrato RLS não foi alterado entre base e QA (SHA `4ef927b94a1125f6b1ca94e0f76354fcb832d608`); a falha de CardLimitControl permanece no A17. Sem writer/DB produtivo, Android estável, merge ou deploy.

