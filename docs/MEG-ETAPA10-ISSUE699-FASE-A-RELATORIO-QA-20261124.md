# MEG Finanças | Etapa 10 | Issue #699 | Relatório da Fase A (QA isolada)
**Data:** 24/11/2026. **Status:** EM HOMOLOGAÇÃO, NÃO CONCLUÍDA. **PR:** [#706 Draft](https://github.com/MarcosVilalva/MEG-Platform/pull/706), baseada na PR #705, branch `stage10/issue699-phase-a-qa-20261124`. **Issue:** #699 OPEN/P0.

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
