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

## 9. Decisão arquitetural PROPOSTA para origem de canal, Etapa 1 isolada, 25/11/2026

**Estado:** SOMENTE DESENHO E DOCUMENTAÇÃO, aguardando leitura e aprovação explícita do responsável pelo projeto antes dos passos 2–6. **Nenhuma migração, alteração de schema, autenticação, writer, rota, teste ou banco foi executada nesta etapa.** HEAD de partida: `5b6764340df7426606b1690096b3dfae711ea78f`. Fundamentação: documento permanente `MEG Finanças — Visão de Produto e Princípios Fundadores`, especialmente Seção 4.1 e Camada 1 da Seção 5, e `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`.

### 9.1 Situação real verificada no repositório

- `apps/api/src/modules/auth/routes.ts` assina o token de acesso no registro, login e refresh apenas com `sub`, `role` e `email`. Não existe claim de canal verificada nem identidade do cliente autenticada.
- `apps/api/src/plugins/auth.ts` valida JWT e papel, não atesta a origem da aplicação que apresenta o token.
- `apps/api/src/modules/auth/service.ts` persiste `AuthSession.userAgent` e exibe `Web/Android` com base no User-Agent; **isso é apenas rótulo visual manipulável, não prova de origem**.
- A rota `POST /finance/events` em `apps/api/src/modules/finance/routes.ts` usa o JWT do usuário e o header de workspace esperado; o header atual protege contexto de workspace, mas **não** autentica o canal.
- `apps/api/src/modules/finance/audit.ts` grava `userId`, `createdAt` e `metadata`, mas não recebe identidade de canal atestada. Existem também gravações diretas de `prisma.auditLog.create` fora dessa função (por exemplo, serviço de autenticação), cuja abrangência precisará ser inventariada.
- CORS, Referer, Origin, User-Agent, clientId público, um header `X-Source-Channel` e um campo livre no JSON **não demonstram** a origem. Atribuir `web` a todo JWT do login público seria autodeclaração de canal disfarçada de assinatura do servidor, portanto **rejeitado**.

### 9.2 Mecanismo proposto: identidade do serviço de ingresso, autenticada pelo servidor

**Escolha:** canal por **ingresso servidor-servidor credenciado**, com `atestado criptográfico de serviço` e vínculo ao usuário autenticado; opcionalmente um JWT curto emitido/validado pelo servidor com origem derivada **da identidade credenciada**, nunca do corpo da requisição. Para a Web, exige um backend intermediário confidencial (BFF, Backend for Frontend), **ainda inexistente como garantia comprovada no fluxo atual e não autorizado a implementar nesta etapa**.

1. O usuário autentica-se no fluxo Web. O BFF, no servidor, valida a sessão do usuário, o workspace autorizado e a proteção da chamada (incluindo CSRF para sessão por cookie). Senhas de serviço/chaves privadas ficam **somente no servidor**, jamais no pacote JavaScript, HTML, LocalStorage ou app móvel.
2. O BFF chama a API financeira via TLS e apresenta, além do contexto autenticado do usuário, uma **asserção de serviço assinada com chave privada** cujo identificador público (`kid`) está previamente registrado na API como principal `meg-web-bff`. O verificador confere a assinatura e usa o cadastro interno `kid → canal=web`; o próprio valor de canal enviado na requisição é ignorado ou recusado.
3. A asserção curta vincula `issuer`, `audience`, `iat`, `exp`, `jti/nonce`, método HTTP, caminho, hash do corpo, identidade do usuário (`sub`), identificador de workspace e referência de sessão. O gateway valida janela temporal, replay do `jti`, integridade de conteúdo, sessão e vínculo ator/workspace. Uma asserção copiada para outra operação, usuário ou workspace deve falhar. Detalhes de assinatura/rotação, storage de `jti` e compatibilidade com infraestrutura são itens de especificação/teste antes de implantação.
4. A API constrói no contexto autenticado de execução um objeto **`VerifiedAuditOrigin`** imutável para a operação, com `channel=web`, principal de serviço verificado e referência de sessão/correlação. Esse contexto é propagado pelo writer e por todas as gravações financeiras de auditoria na mesma transação serializável. `recordFinancialAudit` não deve aceitar um canal escolhido livremente por caller externo.
5. A **autoria** permanece separada do canal: `actorUserId`/`userId` identifica o usuário efetivo; `sourceChannel` identifica o ingresso credenciado; `clientPrincipal` identifica o serviço que atestou a origem; `operationId`, `workspaceId`, timestamp DB e metadados mantêm correlação e idempotência.
6. Requisições diretas com JWT de usuário, mas **sem asserção válida do serviço de ingresso**, continuam autenticadas para os usos explicitamente permitidos, porém **NÃO podem criar/alterar dado financeiro auditável quando o novo contrato for ativado**. Falhar fechado com erro de origem não verificada antes do commit; nenhuma criação parcial de `FinancialEvent`, `LedgerEntry`, recibo ou auditoria de sucesso. A rejeição pode ir para log de segurança próprio, não ser mascarada como auditoria financeira bem-sucedida.

**Garantia exata e limite:** um cliente externo **não consegue atribuir por conta própria** `web`, `android` ou `api-interna` apresentando um header, modificando o JWT do usuário ou falsificando User-Agent, pois falta a credencial privada do serviço confiável. A declaração **comprova passagem por um ingresso servidor-servidor registrado**, **não comprova que o dispositivo físico era um navegador**: alguém pode automatizar chamadas ao ingresso público Web. Essa semântica deve ser aceita ou revista expressamente antes da implementação; não prometer atestação de dispositivo que a arquitetura não possui.

### 9.3 Determinação por tipo de canal, sem improvisar Android

| Canal proposto | Autoridade que pode atribuir | Comprovação exigida | Disponibilidade nesta fase |
|---|---|---|---|
| `web` | Identidade de serviço `meg-web-bff` registrada na API, nunca header do navegador | Asserção assimétrica assinada pelo BFF + sessão de usuário válida + vínculo de requisição | **PROPOSTO**, requer BFF/fluxo credenciado e gates isolados antes do cutover |
| `android` | Identidade de cliente Android a definir na etapa própria | Credencial/prova adequada ao cliente público, com proteção contra clonagem e vínculo de sessão; simples clientId ou UA insuficientes | **RESERVADO E INATIVO**; não alterar ou integrar Android agora |
| `importacao` | Worker/importador servidor registrado | Identidade autenticada de workload + ID do lote, operador responsável e hash/referência do documento de origem, quando aplicável | **PROPOSTO** para fase futura; não marcar importação como Web |
| `api-interna` | Workload interno registrado e autorizado | Credencial de serviço exclusiva, escopo permitido, correlação da execução e ator de sistema/delegado auditável | **PROPOSTO** para fluxos internos explicitamente autorizados |
| `historico-desconhecido` | Processo de migração de registros que **já existiam** antes do corte | Conjunto histórico identificado de maneira controlada, sem dedução a partir de timestamp, IP ou User-Agent | **SOMENTE HISTÓRICO**, proibido como fallback de escrita nova |

### 9.4 Persistência e migração planejadas (NÃO EXECUTADAS)

- Propor campo estruturado `AuditLog.sourceChannel` com domínio controlado (`web`, `android`, `importacao`, `api-interna`, `historico-desconhecido`). Propor metadados correlatos de confiança (`sourcePrincipal` ou referência equivalente) e validar necessidade real de campos adicionais antes da migração, preservando `userId` e `createdAt`.
- Migração em fases **exclusivamente em clone descartável**: snapshot/contagem das linhas preexistentes; adicionar coluna; preencher **somente essas linhas preexistentes** com `historico-desconhecido`; validar contagem e imutabilidade de `id`, `userId`, `action`, `metadata` e `createdAt`; após cobrir e testar todos os escritores, exigir origem válida para novas linhas. **Não criar DEFAULT permanente de histórico** que permita novas escritas sem origem.
- Auditoria não é exclusiva de `recordFinancialAudit`: antes de impor `NOT NULL`/constraints, inventariar todos os escritores de `AuditLog`, inclusive autenticação, benefícios, cartões, pendências, transferências, jobs e imports. O contrato global precisa incluir cada caminho sem quebrar funcionalidades existentes. Mudanças de schema e cortes de acesso requerem plano de compatibilidade e autorização separada de produção.
- Nenhum registro anterior recebe `web` por inferência. Correções de registros financeiros devem permanecer auditáveis e sem apagar o original, conforme Seção 4.1/A17.

### 9.5 Compatibilidade, critérios e bloqueios para as etapas 2–6

- **Dependência arquitetural crítica:** hoje o Web/API usa JWT de usuário sem comprovação de aplicação cliente. Classificar diretamente esse JWT como Web seria inseguro. Antes de habilitar obrigatoriedade de origem, será necessário disponibilizar o ingresso Web confiável ou aprovar alternativa com garantias equivalentes. **Sem essa dependência, o contrato deve recusar novas escritas, não inventar origem nem derrubar silenciosamente funcionalidades antigas.**
- Gate positivo: Web ingressa via BFF com identidade verificada, grava `sourceChannel=web` e principal/usuário correto em PostgreSQL descartável, auditoria no mesmo commit que evento, ledger e recibo; replay não duplica auditorias.
- Gates negativos: JWT comum sem asserção, header/JSON forjado, User-Agent falsificado, token de serviço inválido/expirado/reutilizado, actor/workspace divergente, hash de payload divergente; todos devem falhar sem gravar finanças e sem audit de sucesso.
- Gate histórico: inserir linhas fictícias antes da migração, migrar e comparar hashes/contagens/campos, comprovar `historico-desconhecido` apenas nas antigas e proibição desse valor como fallback de futuras escritas.
- Segurança: verificar rotação/revogação de chaves de serviço, escopo, detecção de replay e isolamento entre workspaces; não logar tokens ou segredos.
- **A17 permanece OFF por padrão**, sem A15/A16, Android, merge, deploy ou banco protegido. Outros contratos legados/financeiros continuam **FAIL** conforme seção 8 até os testes propriamente reexecutados; este desenho não os aprova.
- **Gate de decisão do usuário:** leitura e aprovação/revisão da semântica “canal de ingresso credenciado” e da dependência BFF antes de autorizar **qualquer código ou migração**. Nenhum passo 2–6 autorizado a iniciar automaticamente nesta entrega.

**Resultado da Etapa 1:** `DOCUMENTADO, AGUARDANDO APROVAÇÃO`. Sem execução técnica, sem alteração operacional e sem homologação da Camada 1.
