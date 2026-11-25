# MEG Stage11 | Checkpoint de QA da candidata Web limpa

**Data:** 25/11/2026
**Repositório:** `MarcosVilalva/MEG-Platform`
**Branch:** `stage11/web-foundation-clean-20261125`
**Parent exclusivo:** `main@28703a95310c9b9b5f193ef4f3a0cbe80e121f07`
**Escopo:** Fase A da Issue #699 e RLS da Issue #707, somente QA e código isolado.

## 1. Reconstrução de origem comprovada

- PR #706: `ca7560243856bbfee72384ea739847be1fb090f1`. Somente trechos funcionais para criar evento, verificar saldo, registrar suspeitas, leitura, revisão e desfazimento.
- PR #708: `3612bb5c7ba9d691e2c842574214a3e2f5ec08f4`. SQL de hardening idêntico ao da #706, blob `12d16bc4c7b6991add4f4e38c8263953952824a4`.
- Fixture de recibos A14: PR #706, blob `1fb28a7adbe6e25161c1ff0d1cc4c67e349dedeb`, arquivo `packages/database/prisma/stage10-issue699-receipt-purge-guard.disposable.sql`, **somente QA descartável**.
- Proveniência arquivo a arquivo: `docs/MEG-STAGE11-WEB-CLEAN-ISSUE699-PROVENANCE.md`.
- Reconstrução reprodutível: `scripts/meg-stage11-port-curated.mjs`. Nenhum commit ancestral das PRs #696/#697/#705 foi mesclado ou cherry-picked.
- Sem mudanças de UI ou código Android. Endpoint A17 permanece **OFF por padrão**; o valor `1` foi usado exclusivamente dentro do processo de teste com PostgreSQL local fictício.

## 2. Gates efetivamente executados na nova árvore

| Gate / validação | Resultado | Evidência |
|---|---|---|
| `npm ci --ignore-scripts --prefer-offline` | PASS | NITROMEG, clone novo |
| Prisma Client Generate (6.12.0) | PASS | `npm run db:generate` |
| API TypeScript build | PASS | `npm run build:api` |
| Web Vite build | PASS | `npm run build:web`; aviso não bloqueante de chunk >500 KB |
| Fundação Web | PASS | `npm run test:evolution-foundation` |
| Fonte única da Web | PASS | `npm run test:evolution-data` |
| Contratos RLS estáticos | PASS | `npm run test:supabase-rls` |
| Segurança | PASS | `npm run test:security` |
| A01–A14 e A18 | PASS | Teste **original, inalterado** `stage10-issue699-phase-a-http-pg17.disposable.test.ts`, Fastify/JWT/PG17 |
| Instalação SQL RLS PostgreSQL 17 descartável | PASS | PostgreSQL 17.12, SQL da PR #708 |
| A17 | PASS | Teste **original, inalterado** `stage10-issue699-a17-review.pg17.disposable.test.ts`, Fastify/JWT/PG17 |
| Remoção do cluster QA PG17 | PASS | `STAGE11_QA_CLUSTER_CLEANUP=COMPLETE` |
| `npm run test:finance` integral | **FAIL** | `first-write.contract.test.ts:35` exige correspondência textual exata de `const workspace = await resolveWorkspaceContext(userId)`; a versão segura usa opções para evitar bootstrap legado |
| A15 e A16 | **NÃO EXECUTADOS** | Gates originais envolvem APKs; integração Android permanece fora do escopo atual |

Os testes originais **não foram alterados nem enfraquecidos**.

## 3. Primeiro teste do A14 e correção do ambiente

A primeira tentativa do gate A14 falhou com `P2025` porque o PostgreSQL novo ainda não possuía a fixture de tombstone que o workflow original da PR #706 instala antes do teste. A correção foi adicionar **a mesma fixture SQL original, sem modificá-la**, somente no PostgreSQL descartável. Na segunda rodada, **A01–A14 e A18 passaram integralmente**, sem alterar asserções nem lógica dos testes. Não presumir que a proteção de expurgo de recibos esteja instalada em produção.

## 4. Ambiente e limpeza

- Clone WSL isolado: `/home/m_vil/meg-stage11-web-clean-20261125`.
- Bancos temporários locais: `meg_stage10_phase_a_sandbox` e `meg_stage10_a17_sandbox`; PostgreSQL 17.12, bind `127.0.0.1:5432`; somente identidades e dados fictícios.
- Logs locais: `.qa/logs/`. Runner local: `.qa/run-stage11-disposable.sh`, **não versionado**.
- Cluster PG17 criado apenas para o QA, encerrado e removido após os gates. Nenhum Supabase, Render, banco protegido ou produção acessado.

## 5. Bloqueios e restrições

1. **Gate financeiro completo ainda vermelho** por contrato de escrita legado. Não adaptar teste apenas para obter verde. O contrato deve ser avaliado como comportamento e compatibilidade antes de revisão autorizada.
2. **A15/A16 não repetidos.** A matriz anterior 18/18 **não é transferida**. O conjunto realizado nesta candidata é A01–A14, A17 e A18, ficando A15/A16 pendentes pela proibição atual de integração Android.
3. **CI remota da candidata não demonstrada** por testes locais. Não confundir Web build com homologação funcional e visual no navegador real.
4. **Schema `CardLimitControl`** foi trazido para combinar com RLS, sem migração protegida. Qualquer rollout exige plano próprio.
5. A17 continua desabilitado por padrão. Nenhum deploy, merge, habilitação em ambiente persistente ou aplicação do SQL real.
6. PRs #705/#706/#708 permanecem Draft; Issues #699/#707 permanecem abertas. Android permanece congelado.

## 6. Próxima ação segura

Revisar o contrato financeiro legado que está falhando sem afrouxá-lo, preparar gate CI específico da nova branch e demonstrar compatibilidade Web no navegador real com infraestrutura descartável. Somente após aprovação técnica/funcional/visual explícita decidir substituição das PRs antigas, merge e implantação.

## 7. Regra permanente de saúde do chat

Se houver risco de perda de decisões, outputs extensos ou precisão, emitir aviso preventivo no topo da resposta e checkpoint integral com SHAs, PRs, Issues, gates, restrições e prompt de retomada pronto para copiar, sem esperar solicitação. Repetir periodicamente até transição.


## 8. Continuação autorizada em 25/11/2026: first-write comportamental e documento fundador

**Fonte fundacional lida integralmente:** `MEG Finanças — Visão de Produto e Princípios Fundadores`, 25/11/2026, disponibilizada pelo usuário, SHA-256 `0c2d642186be5d6840bcd8af632d1e980c211a5ac8c9b03ea04f0478fa2c9027`. Seção 4.1 exige autoria, timestamp, origem/canal, unicidade de verdade e imutabilidade do histórico original; Camada 1 da Seção 5 permanece **em construção**. Documento de produto não foi alterado. A integração Android é posterior e separada.

**Base de trabalho conferida:** `stage11/web-foundation-clean-20261125`, HEAD inicial `a53d67003843d2c2591f568618073fbc6df6ed9e`. Alterações restritas a testes e a este checkpoint. Nenhum código financeiro, schema, SQL, rota, Android ou configuração de produção foi modificado.

### 8.1 Teste first-write refeito sem literal da chamada

Arquivo `apps/api/src/modules/finance/first-write.contract.test.ts`: substituída **apenas** a exigência textual exata de `resolveWorkspaceContext(userId)` por execução real da função importada, com isolamento simulado exclusivamente no ponto de leitura `prisma.workspaceMember.findFirst` (sem conexão a banco). Foram exercitados: prioridade do workspace do proprietário, fallback para membership ativa em workspace compartilhado e falha `WORKSPACE_ACCESS_REQUIRED` sem bootstrap legado quando `allowLegacyBootstrap:false`. O restante das asserções estruturais originais foi mantido. **PASS**, marcador `FIRST_WRITE_WORKSPACE_RESOLUTION_BEHAVIOR=PASS`. Este teste isolado não substitui PostgreSQL real.

### 8.2 HTTP/JWT/PostgreSQL 17 descartável com auditoria

Novo arquivo `apps/api/src/modules/finance/stage11-first-write-behavior.pg17.disposable.test.ts`: executado com banco exclusivamente sintético `meg_stage11_first_write_sandbox`, PostgreSQL 17 local em `127.0.0.1:5432`, usuário fictício `meg_stage10_ci`, flags de guarda obrigatórias, A17 **OFF**, Fastify HTTP, login JWT real e criação de dados fictícios. **PASS** nos seguintes comportamentos verificados:

- `SAME_OPERATION_CONCURRENT`: duas chamadas simultâneas com mesmo `operationId`; exatamente um evento, um ledger, um recibo e uma auditoria de criação, respostas 201 com mesmo ID, sendo uma replay.
- `REPLAY_NO_EXTRA_WRITE`: reenvio idêntico retorna mesmo evento e replay, sem efeitos adicionais; payload alterado com mesmo ID operacional recebe 409 `OPERATION_ID_REUSED`.
- `DISTINCT_OPERATIONS_CONCURRENT`: dois `operationId` distintos na mesma workspace resultam em dois eventos, dois ledgers, dois recibos e duas auditorias independentes.
- `WORKSPACE_MISMATCH_NO_WRITE`: JWT de A com `X-MEG-Expected-Workspace-Id` de B recebe HTTP 409 `WORKSPACE_CONTEXT_CHANGED`, sem novas gravações nem auditoria de criação em A ou B; escrita autorizada de B gera evento/auditoria apenas em B.
- Auditoria das criações: conferidos `AuditLog.userId` (ator), `createdAt`, `metadata.schemaVersion=1`, `context.operationId`, `context.workspaceId`, `after.id`, `after.workspaceId`, além de `FinancialEvent.workspaceId`, `FinancialEvent.userId` e `FinancialEvent.createdAt`.

**FAIL em requisito fundacional independente de concorrência:** `FOUNDER_SECTION_4_ORIGIN_CHANNEL_MISSING_IN_CREATE_AUDIT`. O contexto persistido pela criação de evento não contém `sourceChannel`, `origin` ou `channel`, e o modelo `FinancialEvent` inspecionado não declara campo inequívoco de canal de origem. Não inferir automaticamente `Web` a partir do transporte HTTP, pois isso não constitui proveniência persistida. **Não corrigido:** exige decisão de contrato/arquitetura e nova autorização. A falha do teste deve continuar visível; não classificar o gate completo como PASS.

A primeira preparação deste teste parou antes da concorrência com `401 INVALID_CREDENTIALS`, causado por e-mail sintético com maiúscula em um serviço que normaliza para minúscula; o dado de teste foi normalizado, sem alterar autenticação ou produção. Segunda execução: os quatro cenários transacionais passaram e o requisito de canal falhou. Cluster local fechado e removido pelo `trap`, marcador `STAGE11_FIRST_WRITE_QA_CLEANUP=COMPLETE`. Runner `.qa/run-first-write-only.sh` e logs `.qa/logs/fw-*.log` são artefatos locais não versionados, sem acesso a ambientes protegidos.

### 8.3 Suíte financeira legada completa e TypeScript

- `npm run build:api`: **PASS** (`tsc -p tsconfig.json`) incluindo os novos testes.
- `npm run test:finance`: **FAIL**, mesmo após o teste first-write passar. **Nova falha descoberta** em `apps/api/src/modules/finance/event-mutation.contract.test.ts:26`, que ainda exige o literal antigo `const workspace = await resolveWorkspaceContext(userId)`. Esse é outro teste estático legado, separado do teste cuja reescrita foi explicitamente autorizada. Ele permanece **inalterado**. As verificações desse mesmo arquivo nas linhas 38–49 ainda presumem bloqueio de duplicidade semântica, podendo conflitar com a Fase A não bloqueante; **não foram executadas** devido ao primeiro erro e não devem ser consideradas falhas confirmadas nem aprovações.
- A execução completa passou por **14 testes anteriores** incluindo o first-write e parou no **15º** (event-mutation). Os **sete contratos subsequentes** (event-bulk-mutation, benefit-event, transfer-service, workspace-sharing, routes de payables/receivables/cards) foram executados **individualmente** depois da falha, todos **PASS**. Isso não transforma a suíte composta em PASS.
- Não executados novamente A01–A14, A17 ou A18 já aprovados no checkpoint anterior. **A15/A16 continuam proibidos** e não executados.

### 8.4 Concorrência residual não comprovada

**Nenhuma condição de corrida real foi detectada nos cenários especificamente executados.** Isto não prova ausência universal de corrida. Ainda não cobertos nesta rodada: revogação de membership concorrente à janela entre resolução de workspace e commit (TOCTOU), concorrência de débitos disputando saldo próximo do limite, múltiplas instâncias de API, falhas de rede no exato limite do commit, e consistência efetiva Web/Android (integração Android proibida). Não extrapolar esses resultados.

### 8.5 Bloqueios e próximos passos condicionados

1. **Camada 1 NÃO homologada:** origem/canal de criação não persistido de forma comprovada, gate fundacional adicional FAIL.
2. **Suíte financeira integral FAIL:** contrato textual legado adicional `event-mutation.contract.test.ts:26` permanece vermelho; qualquer mudança nesse outro teste ou em regras financeiras exige delimitação/autorização própria, preservando os contratos pertinentes.
3. CI remota, integração Android, A15/A16, validação visual e produção não foram exercitadas nesta rodada.
4. Não houve condição de corrida real nos cenários realizados; nenhuma correção financeira foi aplicada.
5. Manter PRs #705/#706/#708 Draft, Issues #699/#707 abertas; **sem merge, deploy, SQL em banco protegido, ativação A17 ou alteração Android**.

**Saúde do chat:** checkpoint complementado com evidência concreta para continuidade sem repetir gates aprovados.
