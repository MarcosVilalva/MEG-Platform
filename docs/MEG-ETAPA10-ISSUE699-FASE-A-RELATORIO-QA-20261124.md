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

## 24/11/2026 | A15 confirmado, A16 transporte dinâmico confirmado, A17 investigação histórica e issue #707

**Evidência nova A15:** [run #45469996727](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45469996727), job `138715053459`, COMPLETED/SUCCESS. O log contém `ISSUE699_A15_APK708_NATIVE_HTTP_JWT_PG17=PASS` com `events=2, ledgers=2, receipts=2, bilateralAudit=2, suspectsReturned=2`, `ISSUE699_A15_NATIVE_REAL_COMMITTED=2`, `ISSUE699_NATIVE_LONG_TIMEOUT_MANUAL_RETRY_ID_CHANGED=PASS`, `ISSUE699_APK708_ORIGINAL_PROBE_ERRORS=[]` e `ISSUE699_NATIVE_FINANCIAL_POST_PROXY=PASS`. APK708 original, Fastify real, JWT fictício e PostgreSQL17 descartável. **A15 PASS**.

**Evidência nova A16:** APK706 original [run #45470294504](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45470294504), job `138716107323`, COMPLETED/SUCCESS. Log: `ISSUE699_A16_APK_706_ORIGINAL_SHA256=PASS`, `ISSUE699_A16_TEST_ORIGINAL_APK_VERSION=706`, CapacitorHttp nativo=true, POST via proxy=PASS, retry manual com `operationId` diferente=PASS, erros=[]; removido apenas `uiautomator dump` diagnóstico auxiliar após exit137 prévio. APK707 original já havia apresentado o mesmo conjunto dinâmico em [run #45469309550](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45469309550), job `138712596111`. **Limitação para aceite estrito:** APK706/707 foram exercitadas contra mock HTTPS isolado, não demonstraram escrita direta de ambas no novo writer/PG17. A16 permanece **PARCIAL/CONDICIONADO** até comprovar a compatibilidade exigida com a nova API; job SUCCESS não equivale automaticamente a PASS de ponta a ponta.

**A17, causa histórica comprovada:** [run #45469115424](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45469115424), job `138711915864`: contratos financeiros e Phoenix/mobile PASS, teste RLS estático FAIL `RLS deve ser habilitado explicitamente em CardLimitControl`. `git blame` do teste `packages/database/prisma/supabase-rls-policy.test.ts:11-20` remonta a `afe9ccee0` de **18/09/2026**; modelo `CardLimitControl` em `schema.prisma:692-704` criado por `c19e4689b` de **23/11/2026**. `supabase-rls-hardening.sql` e o próprio teste têm SHA idênticos na branch base e na PR706, `784af2baa008ad65f70c4a0749644b2c48b8e5c4` e `4ef927b94a1125f6b1ca94e0f76354fcb832d608` respectivamente. Tabelas `FinancialEvent`, `LedgerEntry`, `AuditLog`, `CloudMutationReceipt` constam do hardening. Ausência de RLS/REVOKE para `CardLimitControl` é **preexistente à Fase A**; não prova exploração ou exposição em produção. Decisão **(a)**: [issue #707](https://github.com/MarcosVilalva/MEG-Platform/issues/707) criada para correção e validação de segurança separadas, sem afrouxar teste nem alterar cartões nesta PR. A17 ainda registra `MANUAL_REVERSIBLE_REVIEW=NOT_TESTED` e `LIVE_RLS_AND_MIGRATION=NOT_TESTED`. O endpoint de suspeitas é somente leitura, `reviewStatus=SUSPECTED`, sem resolução humana persistida comprovada. **A17 NÃO PASS**.

**Matriz estrita atual:** A01–A14 e A18 preservados (15 PASS); A15 PASS novo (total **16/18 com evidência completa**); A16 parcialmente comprovado, A17 pendente/condicionado. Não declarar 18/18, não preparar merge, não encerrar #699. Permanece proibido alterar Android estável, produção, banco protegido, worktree sujo, PR705, ou fazer merge/deploy. Próximo gate legítimo: fechar A16 frente à API efetiva e caracterizar revisão reversível de A17 com proteção de domínio, aguardando #707 para RLS integral.

## 24/11/2026 | Continuidade A16 real APK706/707 e dependência #707

**A16: implementação de teste, SEM PASS antecipado.** Criado `scripts/meg-stage10-issue699-apks706707-realwriter-pg17-qa.mjs` no commit `9bd21584d9651e0339afff0b8d0043150291a482`, cópia isolada do harness A15 aprovado, ajustada para exigir a versão original explícita 706/707 e emitir marcador financeiro individual `ISSUE699_A16_APK706_NATIVE_HTTP_JWT_PG17=PASS` / `ISSUE699_A16_APK707_NATIVE_HTTP_JWT_PG17=PASS`. Criado workflow separado `.github/workflows/meg-stage10-issue699-phase-a-apks706707-realwriter-pg17-qa.yml` (commit `3a33b862c95aded319ee5a6f2d94fcbfec3942d3`) com matriz 706 SHA256 `d12bd3b1995609cfdc62db314b1916b54f94e83ee8c3e9d77a89fb3d77f942c1` e 707 SHA256 `0a4554d1881e736e088e9db05eb7b5592e95667f5d1d5aeb1a17247cf926e6da`, Postgres17 e JWT fictícios em runners descartáveis separados, egress do emulador bloqueado, sem editar APKs. Mantido contrato de 2 eventos/ledgers/receipts/auditoria bilateral/consulta autenticada após perda de ACK e retry com outro ID; diagnóstico auxiliar `uiautomator dump` omitido porque associado ao exit137 anterior. **Run [#45476549672](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45476549672)** iniciado com jobs 138738178491 (706) e 138738179112 (707), ambos ainda `in_progress` no último check, depois de guard/schema/hash PASS, no passo de emulador. **A16 PENDENTE até dois marcadores e logs completos; não inferir resultado de status de job.**

**Issue #707, mitigação isolada tecnicamente PASS, integração PENDENTE.** Branch `stage10/issue707-cardlimit-rls-qa-20261124`, PR [#708 Draft](https://github.com/MarcosVilalva/MEG-Platform/pull/708) baseada em `stage10/p0-public-review-20261123`, sem mesclar na PR706. SQL hardening atualizado apenas para adicionar `CardLimitControl` ao REVOKE e ENABLE RLS, commit `ea7e3a0fcc5bcd356c3e4c4b5d2645527ca38750`; workflow de PG17 isolado com ajuste de quoting commit `3612bb5c7ba9d691e2c842574214a3e2f5ec08f4`. [Run #45476866276](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45476866276), job 138739268505, COMPLETED/SUCCESS: 33/33 modelos no contrato RLS, direitos preexistentes simulados, SQL aplicado, `CardLimitControl` RLS ativo, REVOKE efetivo em 3 roles `anon/authenticated/service_role`, leituras diretas negadas, leitura da role de backend de teste preservada. **É aplicação de SQL em PG descartável, não prova de migração versionada para Supabase protegido, não houve deploy.** Issue #707 permanece OPEN até integração formal autorizada.

**A17 manual reversível não comprovado:** documento adicional `docs/MEG-ETAPA10-ISSUE699-A17-REVISAO-REVERSIVEL-LACUNA-20261124.md` (commit `11809d1420427ca5da486bc6e1695c5845dd36d3`) caracteriza endpoint de suspeitas read-only com `reviewStatus='SUSPECTED'` fixo e bloqueio no writer genérico `FINANCIAL_EVENT_REVERSAL_REQUIRES_CANONICAL_WRITER`. Arquivamento genérico remove ledger mas não prova restauração/compensação reversível. Não implementar endpoint destrutivo ou mudar domínio de cartão para gerar PASS. Além de revisão/correção humana com desfazimento auditado, A17 ainda exige regressão dos demais domínios e integração autorizada #707.

**Matriz estrita mantida 16/18**: A01–A15 + A18 comprovados; A16 aguardando 706/707 writer/PG17; A17 aberto. #699 P0 OPEN, PR706 Draft, PR708 Draft. Zero merge/deploy, zero alteração de produção, Android estável, worktree local sujo, bancos protegidos, Render ou Supabase. Saúde: ATENÇÃO, checkpoint operacional atualizado.

## 24/11/2026 | A16 HOMOLOGADO EM API REAL, MATRIZ ATUAL 17/18

**A16 PASS com duas APKs originais sem alteração, Fastify/JWT real e PostgreSQL17 descartável.** [Workflow #45476549672](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45476549672), COMPLETED/SUCCESS, head `3a33b862c95aded319ee5a6f2d94fcbfec3942d3`. Jobs independentes:
- **APK706**, job `138738178491`, COMPLETED/SUCCESS. SHA original `d12bd3b1995609cfdc62db314b1916b54f94e83ee8c3e9d77a89fb3d77f942c1` conferido. `ISSUE699_A16_APK706_NATIVE_HTTP_JWT_PG17=PASS` com `events=2, ledgers=2, receipts=2, bilateralAudit=2, suspectsReturned=2`; `ISSUE699_A16_NATIVE_REAL_COMMITTED=2`, `ISSUE699_NATIVE_LONG_TIMEOUT_MANUAL_RETRY_ID_CHANGED=PASS`, `ISSUE699_NATIVE_FINANCIAL_POST_PROXY=PASS`.
- **APK707**, job `138738179112`, COMPLETED/SUCCESS. SHA original `0a4554d1881e736e088e9db05eb7b5592e95667f5d1d5aeb1a17247cf926e6da` conferido. `ISSUE699_A16_APK707_NATIVE_HTTP_JWT_PG17=PASS` com `events=2, ledgers=2, receipts=2, bilateralAudit=2, suspectsReturned=2`; `ISSUE699_A16_NATIVE_REAL_COMMITTED=2`, `ISSUE699_NATIVE_LONG_TIMEOUT_MANUAL_RETRY_ID_CHANGED=PASS`, `ISSUE699_NATIVE_FINANCIAL_POST_PROXY=PASS`.
- O teste reutiliza o contrato A15 mas em novos arquivos de QA, sem alterar nem executar novamente o A15. Usa API real, não somente respostas mockadas. Instrumentação da UI/transport via proxy local com egress externo bloqueado. Omitido diagnóstico opcional `uiautomator` responsável pelo risco observado de saída 137 no teste antigo; nenhum assert financeiro foi removido.

**Matriz estrita agora 17/18 PASS:** A01–A14, A15, A16, A18; A17 permanece PENDENTE.

**A17 sem falso aceite:** evidência da correção de segurança preexistente na Issue [#707](https://github.com/MarcosVilalva/MEG-Platform/issues/707) via [PR #708 Draft](https://github.com/MarcosVilalva/MEG-Platform/pull/708), [run #45476866276](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45476866276) COMPLETED/SUCCESS, 33 tabelas, RLS/REVOKE real PostgreSQL17 descartável, sem tocar Supabase protegido; porém PR708 ainda não integrada e migração versionada/produtiva não aprovada. `MANUAL_REVERSIBLE_REVIEW` segue não implementado/testado, pois o endpoint mantém `reviewStatus='SUSPECTED'` fixo e o writer genérico não comprova reversão financeira; revisão/correção canônica precisa ser projetada/validada de acordo com documento de lacuna `docs/MEG-ETAPA10-ISSUE699-A17-REVISAO-REVERSIVEL-LACUNA-20261124.md`. Verocard, cartões, faturas, transferências, pendentes, PATCH/PUT, importação e outras referências mantêm regressão estrita pendente para a nova operação de correção, sem repetir os contratos estáticos aprovados por rotina.

**Bloqueios:** #699 P0 OPEN; PR706 Draft e não mesclada; PR708 Draft e não mesclada; nenhuma autorização de merge/deploy/produção/Android/Supabase/Render/bancos protegidos. Worktree local pré-existente preservado. **Não preparar merge até A17 PASS integral e matriz 18/18 documentada.**

## 24/11/2026 | A17 APROVADO EM QA DESCARTÁVEL | MATRIZ A01–A18 = 18/18 PASS

**Evidência de aceite do A17:** [run #45487627046](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45487627046), job `138777109018`, head `4cd088571c78449220ba3db5209204d720a5480d`, **COMPLETED/SUCCESS**. A suíte executou Fastify HTTP real, login/JWT fictício, PostgreSQL17 descartável local, código da PR706 e hardening RLS fixado pelo commit `3612bb5c7ba9d691e2c842574214a3e2f5ec08f4` da PR708 copiado **somente para o runner efêmero** (sem merge ou alteração de produção). Os marcadores comprovados nos logs:
- `ISSUE699_A17_TYPES_AND_SCHEMA=PASS`.
- `ISSUE699_A17_ISSUE707_COMBINED_RLS_33_MODELS=PASS`; `ISSUE707_CARDLIMIT_ENABLE_RLS=PASS`; `ISSUE707_CARDLIMIT_REVOKE_ALL_3_DATA_API_ROLES=PASS`; `ISSUE707_DIRECT_DATA_API_READ_DENIED=PASS`; `ISSUE707_POSTGRES_BACKEND_ROLE_READ_PRESERVED=PASS`; `ISSUE699_A17_LIVE_RLS_AND_MIGRATION=PASS` **apenas em banco PG17 descartável**, não migração produtiva.
- `ISSUE699_A17_LEGITIMATE_AND_UNDO=PASS`: revisão de duas despesas legítimas preserva ambas, sem contrapartida e com desfazimento auditado.
- `ISSUE699_A17_CANONICAL_CONTRA_EXPENSE=PASS`: evento de estorno com `type=expense` e `signedAmount` oposto ao original; FinancialEvent/ledger/recibos originais intactos.
- `ISSUE699_A17_CANONICAL_BYPASS_AND_ISOLATION=PASS`: PATCH/DELETE genéricos não podem alterar fonte corrigida ou contrapartida; autorização e workspace isolados.
- `ISSUE699_A17_INVERSE_COMPENSATION_AND_AUDIT=PASS`: inversão por novo evento e ledger com sinal inverso, sem exclusão do anterior, justificativa e ator registrados, idempotência comprovada.
- `ISSUE699_A17_ATOMIC_FAULT_ROLLBACK=PASS`: falha injetada em auditoria impede commit parcial, recibo e evento órfão.
- `ISSUE699_A17_CONCURRENT_REVIEW_SINGLE_WINNER=PASS`: duas decisões concorrentes não geram dupla correção.
- `ISSUE699_A17_MANUAL_REVERSIBLE_REVIEW=PASS` e `ISSUE699_A17_HTTP_JWT_PG17_AND_RLS_COMBINED=PASS`.
- `ISSUE699_A17_FINANCE_SECURITY_PHOENIX_REGRESSION=PASS`: suíte `test:finance`, `test:security` e contratos Phoenix/mobile.
- `ISSUE699_A17_FULL_GATE=PASS`.

**Arquivos de implementação da PR706:** novo `apps/api/src/modules/finance/suspected-duplicates-review.ts` (decisão humana e contrapartida/reversão), `stage10-issue699-a17-review.pg17.disposable.test.ts`, `.github/workflows/meg-stage10-issue699-a17-review-pg17-qa.yml`; alterados `apps/api/src/modules/finance/routes.ts` (POST `/finance/events/:id/resolve` e `/finance/events/:id/resolve/undo`), `audit.ts` (ações auditáveis), `suspected-duplicates-read.ts` (status de revisão consultável), `service.ts` (proteção contra bypass em PATCH/DELETE). Nenhuma mudança em schema Prisma, Android ou produção. A rota A17 está **desabilitada por padrão** e exige `MEG_STAGE10_ISSUE699_A17_REVIEW_ENABLED=1` no runtime de QA. Não presumir habilitação para usuários sem autorização separada.

**Matriz QA atualizada:** **18/18 gates PASS (100% da matriz de aceite da Fase A em ambiente isolado, NÃO 100% do projeto ou autorização de produção)**. A01–A14+A18 preservados via run #45468800946; A15 via #45469996727; A16 via #45476549672 (706/707 nativas com writer real e PG17); A17 via #45487627046.

**Divergência técnica ainda relevante para integração:** [run #45487627107](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45487627107), workflow de regressão legado da PR706, ficou **FAIL no teste RLS estático original** porque o SQL da #707 continua corretamente isolado na PR708; [run #45487627030](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/45487627030), suite Phase A original, terminou SUCCESS. O run A17 integrado comprovou que ambas as versões funcionam juntas no runner, mas a branch #706 sozinha ainda não contém a correção de hardening #707. **Não alegar que todos os checks da PR estão verdes, nem preparar merge/deploy antes de resolver a dependência.**

**Proteções vigentes:** PR706 Draft e PR708 Draft separadas; Issue #699 P0 e #707 abertas, sem autorização de merge, deploy, ativação do endpoint, alteração de Android, bancos protegidos, Supabase/Render ou produção. Worktree local pré-existente intocado; commits feitos via GitHub apenas. Validação visual não foi concedida. Próximo passo: decisão formal da sequência de integração da #708 e dos checks de RLS da #706, com gates técnicos e aprovação visual aplicáveis, sem qualquer merge automático.
