# Etapa 09: build seguro Render, aplicacao e rollback

Estado: candidata na PR #692 Draft. Preparacao tecnica, sem aplicar infraestrutura,
sincronizar Blueprint, fazer merge ou deploy. Issue #691 permanece aberta.

## Problema e alteracao preparada

O build efetivo do servico `meg-platform-api` ainda chama `db:prepare:production`
(inclui DELETE de Budget) e `db:push:production` (`--accept-data-loss`). A proposta
substitui esse caminho por `bash scripts/meg-stage09-render-api-build.sh`.

O script verifica o contrato antes de instalar dependencias, substitui DATABASE_URL
por um destino ficticio localhost somente no processo de build, desativa lifecycle
hooks npm e executa apenas instalacao congelada pelo lockfile, Prisma generate e
compilacao TypeScript. `npm run` continua executando o script explicitamente pedido,
mas sem seus pre/post hooks. A variavel exportada no build nao altera o valor de
DATABASE_URL configurado no servico nem deve ser salva como variavel de runtime.

O contrato compara todas as instrucoes, inclusive echo, e bloqueia alteracoes de
scripts e hooks dos pacotes raiz/API/database. Regressoes recusam DDL extra,
substituicao de comando em echo, URL externa, falta de ignore-scripts e hooks
introduzidos em manifests. Nao se trata de sandbox contra dependencia maliciosa:
as dependencias executadas explicitamente continuam exigindo lockfile e revisao.

O workflow constroi sem PostgreSQL disponivel, testa tsx e instancia o PrismaClient
gerado sem conexao. Sem banco produtivo, segredo ou credencial real no CI.

## Fonte declarativa encontrada no painel em 14/11/2026

| Item | Estado observado, somente leitura |
|---|---|
| Servico | meg-platform-api, srv-d98k61daeets7384hvb0 |
| Runtime/plano/regiao | Node, Free, ohio |
| Branch e live | main, 28703a95310c9b9b5f193ef4f3a0cbe80e121f07 |
| Deploy live | dep-dbm92b17lnhs738s0jr0 |
| Auto-deploy do servico | On Commit |
| Blueprint | meg-platform-production, exs-d98k30uq1p3s738jj240 |
| Origem Blueprint | main, render.yaml |
| Auto Sync Blueprint | Yes |
| Start/health | npm run start:api, /health |

Corrigir apenas o painel seria incompleto: um novo sync poderia reaplicar o YAML
inseguro. Por isso `render.yaml` na PR candidata aponta para o script seguro e
propoe `autoDeployTrigger: 'off'`. Plano, nome, runtime, regiao, envVars, start,
health e buildFilter permanecem iguais. Nao cria banco, disco ou recurso novo.
O comentario antigo que confundia migracao com deploy automatico foi corrigido.

## Auditoria de codigo do startup e scripts antigos (14/11/2026)

A remocao de `db:prepare:production` e `db:push:production` do **build** foi
verificada em codigo, mas o `startCommand` segue `npm run start:api`.
O arquivo `apps/api/src/server.ts` inicia manutencoes apos abrir a porta HTTP.
Portanto **nenhum deploy deve ser descrito como read-only**. Inventario do caminho
atual, com fontes em `apps/api/src/modules`:

| Caminho invocado no startup | Escrita possivel identificada no codigo | Observacao de gate |
| --- | --- | --- |
| `ensureCommercialFoundation` | `plan.upsert`, administrador e `workspaceSubscription.createMany` | Pode alterar contratos e permissao de plataforma |
| `refreshCommercialBillingStatuses` | faturas automaticas e `workspaceInvoice.updateMany`, `workspaceSubscription.update` | Pode transicionar para PAST_DUE/SUSPENDED |
| `materializeRecurringExpenses` | `prisma.$transaction` com `materializeTemplate` | Pode criar compromissos financeiros recorrentes |
| `migrateLegacyCardsForAllWorkspaces` | caminho `migrateLegacyCards` com criacao de cartoes | Migra relacoes legadas em startup |
| `ensurePrimaryWorkspace` | `workspace.create`, `workspaceMember.upsert/createMany`, `appState.update/create` | Pode vincular estado e titularidade |
| `reconcilePrimaryAppStateFromNormalized` | transacao e `writeBackNormalizedEventsToAppState` | Pode reescrever espelho AppState e remover referencias legadas obsoletas; requer autoridade canonica |
| `activateNormalizationPrimary` | `appState.updateMany`, aplicacao eventual de shadow | Pode ativar fonte normalizada, condicionada a conciliacao |
| `repairLegacyImportedEvents` | `financialEvent.updateMany` e catalogos, se `config.runLegacyRepair` | Opcional, padrao de configuracao falso; revisar ambiente antes de liberar |

`runFinancialMaintenance` executa no startup **e a cada 6h**. O timer de
auditoria da normalizacao roda **a cada 15min** e utiliza
`ensurePrimaryWorkspace`; o fluxo de ativacao normalizada tambem pode persistir
alteracoes. O resultado de um `/health` HTTP 200 apenas indica que o
servidor respondeu, enquanto `/ready` testa conexao DB. Nenhum dos dois atesta
conclusao de manutencao ou integridade financeira completa.

**Scripts antigos nao executados nesta auditoria**:

- `packages/database/prisma/prepare-production.ts` tem `DELETE FROM "Budget"`
  para eliminar duplicados por `userId/month/group`, selecionando o registro
  com `updatedAt` mais recente. **Nao compara `amount` antes de apagar**.
  Sem leitura de linhas reais, nao e possivel afirmar se ha duplicatas ou perdas
  atuais, mas executar em deploy seria uma alteracao financeira destrutiva.
- `packages/database/prisma/ensure-performance-indexes.ts` executa
  `CREATE INDEX IF NOT EXISTS` para sete indices e consulta seus nomes. Esse
  teste nao prova se definicoes preexistentes estao compativeis.
- `db:push:production` permanece como script legado acessivel por comando,
  com `--accept-data-loss`. E retirado **somente** do novo build candidato.
  Nao apagar, renomear ou refatorar essas rotinas sem caracterizacao, decisao de
  negocio e autorizacao separadas.

A CI candidata executa
`scripts/meg-stage09-render-startup-writers.contract.test.mjs` antes de compilar.
O teste e **estatico, sintetico e sem rede/DB**: conserva um inventario de oito
paths conhecidos e exige nova revisao se seus marcadores mudarem. Nao garante que
nenhum novo caminho de escrita exista; nao testa atomicidade, idempotencia,
seguranca de dados ou execucao real de startup. `SUCCESS` nao libera deploy.

**Gate operacional adicional de #691:** antes de qualquer janela de publicacao,
caracterizar em PG17 descartavel e com fixtures ficticias os efeitos de startup,
especialmente recorrencia, cartoes, normalizacao e billing; conferir que toda
escrita no cold start e permitida pela autoridade financeira e preserva dados;
revalidar flags/runtime sem expor segredos. Caso isso nao seja demonstrado,
`NO-GO`. Nao "resolver" o risco desativando automaticamente rotinas que ja sao
regras de negocio.

## Caracterização funcional PG17 descartável (14/11/2026)

**Execução comprovada, exclusivamente em dados fictícios e ambiente descartável.** A PR #692 adicionou:

- `scripts/meg-stage09-render-startup-pg17-synthetic.test.ts`
- `.github/workflows/meg-stage09-render-startup-pg17.yml`

O workflow usa serviço Docker `postgres:17` em `127.0.0.1:65431`, banco `meg_stage09_ephemeral`, com credenciais descartáveis publicamente conhecidas **apenas na CI**. O teste rejeita outra `DATABASE_URL`, projeto fora do GitHub Actions, administrador não sintético ou variáveis de integrações externas. A CI instala dependências sem lifecycle hooks, gera Prisma Client e aplica **somente o schema via `prisma db push --skip-generate` sem `--accept-data-loss`** no banco novo e vazio. Essa operação não é incluída no build do Render. Ao final, o contêiner é descartado.

Provas no SHA `47f390c385f7a70fed998f5d26c4140483871448`:
- [PG17 run #43625663923](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43625663923): SUCCESS, com operações reais de `ensurePrimaryWorkspace`, `ensureCommercialFoundation`, `refreshCommercialBillingStatuses`, `materializeRecurringExpenses` e `migrateLegacyCardsForAllWorkspaces`.
- Duas execuções sequenciais de cada rotina preservaram cardinalidade: 1 workspace, 3 planos, 1 assinatura, 1 fatura, 1 conta a pagar de R$ 89,17 e 1 cartão sintético com limite R$ 1.500,00. O FinancialEvent fictício de R$ 12,34 e Budget fictício de R$ 100,42 mantiveram valor/status e quantidade.
- [Build seguro run #43625663860](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43625663860): SUCCESS, independentemente do PG17.

Provas adicionais no SHA `1be3e178b903b89bc2abef91aa7e7e4a11807efd`:
- [PG17 run #43625870082](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43625870082): SUCCESS, com os testes anteriores e caracterização de que `reconcilePrimaryAppStateFromNormalized` **recusa** um `AppState` ainda não normalizado lançando `NORMALIZATION_PRIMARY_REQUIRED`, **sem alteração de revision/state** no fixture. Não é permitido interpretar a recusa como perda ou corrupção de dados.
- [Build sem DB run #43625869991](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43625869991): SUCCESS.

**Divergência técnica ainda pendente:** em `apps/api/src/server.ts`, o startup chama `reconcilePrimaryAppStateFromNormalized` antes de `activateNormalizationPrimary`, dentro da mesma sequência `then`. Para workspaces ainda legados, a recusa acima pode fazer essa sequência ir direto ao `catch` de fallback **antes de tentar a ativação**. Isso não comprova falha em produção, onde o estado inicial pode já ser normalizado. Não inverter chamadas nem alterar a semântica da autoridade financeira sem ensaio separado e revisão do domínio.

**O que esta caracterização NÃO comprovou:** comportamento completo do processo `server.ts` iniciado com todas as rotas/timers, idempotência sob concorrência, transações de cartão com faturas reais, normalização já ativa e backfill, todos os estados de billing (incluindo suspensão), integração externa, RTO/RPO ou rollback de produção. O ensaio só prova os casos sintéticos e sequenciais descritos. Resultado verde não autoriza deploy nem encerra issue #691.

### Normalizacao legado, primaria, concorrencia e rollback no PG17 sintetico (14/11/2026)

Nova caracterizacao usando as **funcoes reais** `normalizationPreview`,
`normalizedStateForRead`, `activateNormalizationPrimary`,
`reconcilePrimaryAppStateFromNormalized` e `rollbackNormalizationPrimary`,
sem alterar os modulos financeiros nem chamar `server.ts`:

1. **Legado:** um AppState com despesa sintetica valida de R$ 27,35 nao
   possui linha normalizada; leitura cai em `app-state`; reconciliar antes da
   ativacao recusa com `NORMALIZATION_PRIMARY_REQUIRED`, sem modificar
   `state` nem `revision`.
2. **Ativacao** isolada explicita: `activateNormalizationPrimary(..., { automatic: true })`
   executa a projecao em PostgreSQL17 e ativa `normalized-primary` apos
   conciliacao de fingerprint. Evento criado preserva valor de R$ 27,35 e
   sinal de despesa de -R$ 27,35. Repetir ativacao nao aumenta revisao nem
   duplica linhas. A leitura posterior usa `dataSource=normalized`.
3. **Reconciliacao concorrente:** alterando apenas a fixture normalizada para
   R$ 29,40, duas chamadas simultaneas tentam atualizar o espelho legado.
   Prova de convergencia: uma transacao legada permanece, sem duplicacoes,
   com descricao/valor atualizados; uma reconciliacao subsequente nao muda
   a revisao. Rejeicoes sao aceitas **somente** com
   `NORMALIZED_PRIMARY_MIRROR_CONFLICT` ou `NORMALIZATION_REVISION_CONFLICT`.
   Erros inesperados de infraestrutura **reprovam** o teste.
4. **Revision guard e rollback:** chamada com `expectedRevision` antiga
   recusa `NORMALIZATION_REVISION_CONFLICT` sem mutacao. O rollback
   explicito produz `app-state-rollback`; a tentativa subsequente de
   reativacao automatica retorna `blockedByRollback=true`, preservando
   `state/revision` e dados. O espelho normalizado nao pode ser
   reconciliado enquanto o rollback continuar ativo.
5. Em todas as etapas, um `FinancialEvent` ficticio independente de R$ 12,34
   e `Budget` de R$ 100,42 permaneceram sem mudanca; Payable, Cartao e
   Fatura anteriormente caracterizados mantiveram cardinalidade.

**Provas exatas da PR #692:**

- Commit `874c44f29e638e3c5a0c4f0dc65454b6ae7069e3`, [PG17 run #43640091740](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43640091740) SUCCESS e [build run #43640091795](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43640091795) SUCCESS: duas reconciliações solicitadas, ambas concluídas.
- Commit `5788d69e2b04c92cd17fae92017f9365aa1c7d44`, [PG17 run #43640235940](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43640235940) SUCCESS e [build run #43640235941](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43640235941) SUCCESS: apenas uma reconciliação concorrente concluiu; integridade, proteção de revisão obsoleta e rollback verificados.
- Commit `013ccd53915cb63d2a355675a3993c98117e348d`, [PG17 run #43640354963](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43640354963) SUCCESS e [build run #43640355004](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43640355004) SUCCESS: a exigência adicional de rejeição apenas por conflito conhecido passou. Neste run, as duas chamadas concluíram.

**Limites de prova:** isso comprova sequências e interleavings sintéticos
observados, **não** prova linearizabilidade sob todas as disputas, alta
concorrência, ausência de risco de deadlock em outros fluxos, startup integral
HTTP, compatibilidade com os dados produtivos, nem que a API realmente
conclua a normalização durante sua inicialização atual. A chamada antecipada
de `reconcilePrimaryAppStateFromNormalized` em `server.ts` ainda pode
impedir a ativação automática de um workspace legado. Nao inverter a
ordem, desativar tarefas ou reinterpretar a autoridade financeira sem
decisao funcional documentada.

O build produtivo Render permanece inseguro, a issue #691 segue OPEN,
e nenhum merge/deploy/Blueprint sync está liberado por esses testes.

## Gates especificos, sem confundir preparacao e operacao

| Gate | Estado |
|---|---|
| Build anterior sem banco | PASS, preservado |
| Hardening de hooks e URL ficticia | PASS no codigo ed90f7b, run 43599543691 |
| Contratos de injecao e comandos extras locais | PASS |
| YAML candidato no schema JSON oficial Render | PASS local |
| Novo HEAD que inclui YAML e runbook | Exige checks proprios apos commit |
| Backup real de 14/11 cifrado + OneDrive Web/download/hash | PASS pelo operador |
| Tarefa Windows, disparo codigo 0 e NOT_DUE | PASS pelo operador |
| Restore funcional do novo archive / Supabase gerenciado | PENDENTE, sem nova execucao |
| Mudanca de configuracao Render e Blueprint | NAO EXECUTADA |
| Ensaio real de rollback do servico produtivo | NAO EXECUTADO |
| Liberacao de merge/deploy | NO-GO |

Backup e agenda estao registrados no checkpoint oficial da branch #666. A evidencia
nao autoriza marcar recuperacao integral Supabase ou disponibilidade futura como
concluidas. #674, #676, #690 e #691 mantem seus gates separados.

## Aplicacao preparada, somente apos gates e autorizacao especifica

1. Congelar o escopo em um SHA exato. Confirmar CI nesse SHA e todo o diff para
   main: #692 tem base #666 e NAO e patch independente aplicavel integralmente a
   main sem revisar as alteracoes herdadas. Nao integrar #689/#693 ou ligar flags
   de cache junto com a mudanca de build.
2. Confirmar backup recuperavel e rollback compativel com o schema. Manter as
   operacoes de migracao/indices em procedimento separado, sem executar neste
   build. Nao repetir auditorias encerradas: usar a evidencia anterior e revalidar
   apenas divergencias relevantes antes da janela autorizada.
3. ANTES de colocar o YAML aprovado na main, desativar Auto Sync do Blueprint e
   auto-deploy do servico por operacao especificamente autorizada. Confirmar ambos
   por releitura e verificar que nao houve deploy disparado. Se a interface/API
   obrigar publicacao para salvar, interromper: nao existe autorizacao implicita.
4. Verificar que a revisao proposta contem script, contratos e render.yaml seguros
   juntos. Integra-la so apos autorizacao de merge separada. Nao alterar branch do
   Blueprint para uma branch experimental e nao criar segundo Blueprint.
5. Revisar o plano de sync: deve atingir somente meg-platform-api existente,
   alterando buildCommand e autoDeployTrigger; rejeitar exclusoes, novos recursos,
   plano pago, segredos gerados novamente, mudanca de envVars ou schema. Nunca
   clicar Manual Sync como simples validacao: sync pode disparar deploy.
6. Aplicar o sync apenas na janela autorizada para publicacao. Nao somar um manual
   deploy se o sync ja iniciou um. Registrar ID e acompanhar ate estado terminal.
   Nao basta o trigger ser aceito. Confirmar SHA live e comandos efetivos.
7. Conferir /health, /ready, leitura autenticada e isolamento no escopo aprovado,
   sem lancamentos financeiros de teste em producao. Observar erros e conexoes.
   Cold start Free nao tem SLA de resposta imediata. UI requer aprovacao visual
   propria; esta PR nao altera telas.
8. Manter Auto Sync e auto-deploy controlados depois da publicacao. Reativacao e
   outra decisao, nao etapa automatica. O YAML proposto mantem deploy automatico off.

## Rollback preparado e seus limites

- Live observado: dep-dbm92b17lnhs738s0jr0, SHA 28703a9. Esse e o candidato para
  retorno apos uma futura publicacao; disponibilidade do artefato deve ser
  reconfirmada naquele momento, nao e garantida por sua presenca live hoje.
- O painel mostrou links Rollback ativos para dep-dbm7cprncjis738tl350 (222cee8)
  e dep-dbm7are8bjmc739li41g (db32195); versoes antigas exibiram botao desabilitado.
  Isso prova que ha opcao do provedor, NAO compatibilidade financeira desses
  commits com o estado atual nem aprovacao para usá-los. Nenhum link foi acionado.
- Se o novo build falhar, nao corrigir conectando o build ao banco. Confirmar que
  o deploy live anterior continua servindo. Se houve troca e regressao, rollback
  deve reutilizar artefato aprovado e compativel, com autorizacao e ID registrados.
- Rollback nao desfaz dados, migracoes, mensagens, tarefas de startup nem efeitos
  externos. A aplicacao possui rotinas normais de manutencao no startup; build
  sem DDL/DML nao significa que iniciar a API seja totalmente sem efeitos.
- Pelo Dashboard, rollback desativa auto-deploy; pela API isso nao ocorre
  automaticamente. Auto Sync do Blueprint e controle distinto, e deve permanecer
  desativado. Reler ambos depois de qualquer rollback.
- Nao restaurar Build Command inseguro, nao reverter o YAML para DDL/DML, nao
  executar db push e nao restaurar backup sobre producao como rollback de codigo.
- Se nao houver artefato compativel disponivel, abortar a publicacao ANTES de
  afetar o live. Nao improvisar rebuild de commit antigo com build inseguro.

## Fontes oficiais verificadas em 14/11/2026

- https://render.com/docs/deploys.md
- https://render.com/docs/health-checks.md
- https://render.com/docs/rollbacks.md
- https://render.com/docs/infrastructure-as-code.md
- https://render.com/docs/blueprint-spec.md
- https://render.com/schema/render.yaml.json
- https://docs.npmjs.com/cli/v11/commands/npm-ci/

Preparacao concluida nos limites descritos, sem liberar producao. O proximo ato
operacional depende dos gates pendentes e de autorizacao especifica. Esta rodada
nao deve voltar a pedir instalacao de backup, chave ou teste de transporte ja aprovado.


### Cadeia reconcile -> activate do startup, PG17 efemero (14/11/2026)

- Teste adicional em `scripts/meg-stage09-render-startup-pg17-synthetic.test.ts`,
  commit de prova `72d3f02ad12937ad97425adfbc9472321172c661`.
  O teste confere por leitura direta o trecho de `apps/api/src/server.ts` que
  encadeia `ensurePrimaryWorkspace -> reconcilePrimaryAppStateFromNormalized ->
  activateNormalizationPrimary`, os retries e o `catch`; reproduz essa
  mesma sequencia com os **writers reais** e as fixtures PG17 efemeras.
  **Nao executou o processo Fastify**, as rotas HTTP, timers nem integracoes
  externas. Mudanca do bloco de startup deve exigir revisao do teste.
- **Legado:** o `reconcile` anterior a ativacao gera
  `NORMALIZATION_PRIMARY_REQUIRED`. O `catch` do startup registra
  `status=fallback`, `reason=NORMALIZATION_PRIMARY_REQUIRED`;
  a ativacao automatica nao e alcancada. O `AppState.state/revision`
  e a contagem de `FinancialEvent` permanecem intactos no fixture.
- **Ja normalizado e reconciliado:** a mesma sequencia conclui e registra
  `status=completed` com `primary=true` e `reconciled=true`.
  Uma chamada sem alteracoes de dados nao incrementa revision nem duplica
  `FinancialEvent`.
- **Rollback administrativo:** apos rollback explicito para
  `app-state-rollback`, a cadeia passa pelo mesmo erro no reconcile
  e registra **`status=fallback`** em vez de `rollback-protected`,
  pois nao chega a chamar `activate(..., {automatic:true})`.
  O modo gravado, os valores, a revisao e as contagens permanecem
  preservados. Uma leitura posterior por `normalizedStateForRead`
  reconhece o rollback e atualiza o status para `rollback-protected`.
  Portanto o status de runtime pode variar conforme o caminho de leitura,
  mesmo com o rollback persistido sem mutacao.
- **Prova exata do commit:** workflow
  [PG17 #43642900810](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43642900810)
  `SUCCESS`; no log
  `PG17_SYNTHETIC_STARTUP_CHARACTERIZATION_PASS` com
  `startup_legacy_fallback=true`,
  `startup_normalized_completed=true`,
  `startup_rollback_status_fallback=true`,
  `startup_http_not_executed=true`.
  Workflow independente
  [build sem DB #43642900797](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43642900797)
  `SUCCESS`, ambos no SHA `72d3f02ad12937ad97425adfbc9472321172c661`.
- **Interpretacao restrita:** foi comprovada a semantica desse fluxo em
  fixtures, nao a incidencia real, perda de dados, o startup HTTP integral
  ou o comportamento de todas as rotinas concorrentes/timers.
  Nao mudar ordem, `catch`, fonte canonica, rollback ou regras
  financeiras sem decisao expressa. Issue #691 continua bloqueando
  merge, deploy, Blueprint sync e alteracao do Render produtivo.


## Startup HTTP real do server.ts com PostgreSQL17 descartavel (14/11/2026)

**Teste funcional concluido, sem modificar a API.** A candidata #692 recebeu
`scripts/meg-stage09-render-startup-http-pg17-synthetic.test.ts`,
executado apos o teste de writers ja consolidado, no mesmo job com
PostgreSQL17 novo em `127.0.0.1:65431/meg_stage09_ephemeral`.

- Guarda fail-closed de `GITHUB_ACTIONS=true`, `CI=true`, `NODE_ENV=test`,
  `DATABASE_URL` local fixa, administrador `@example.invalid`, unica conta
  sintetica e unico workspace. Variaveis de integracoes externas, Supabase,
  SMTP/WhatsApp, webhooks e tokens devem estar ausentes. O servidor filho herda
  apenas ambiente explicitamente permitido e ouve em `127.0.0.1:65432`,
  sem publicar porta fora do runner. `RUN_LEGACY_REPAIR=false`. Ao finalizar
  cada caso o processo recebe SIGTERM, com SIGKILL apenas como fail-safe.
- O teste inicia **o arquivo real** `apps/api/src/server.ts` via
  `node --import tsx`, em tres processos sequenciais: estado
  `app-state-rollback`, estado legado sem metadados de normalizacao e estado
  `normalized-primary` previamente ativado **somente na fixture**.
  O teste nao invoca endpoints financeiros de escrita e confere o snapshot
  de `AppState.state/revision`, `FinancialEvent`, `Budget`, cardinalidade
  de `Payable` e `CreditCard` antes e depois de cada partida.
- `/ready` retorna `ready` apos conexao DB mesmo quando `/health` informa
  `financialReady=false`: nao confundir disponibilidade com normalizacao
  concluida. `/auth/me` sem JWT retorna 401. O `/health` usa no-store.
- **Rollback administrativo:** o processo real observa a recusa do
  reconciliador e registra fallback; nao altera o rollback gravado no banco.
  **Legado:** fallback sem ativacao automatica, reproduzido em HTTP real.
  **Ja normalizado:** o fluxo conclui com `financialReady=true` e nao
  duplica eventos nem modifica o snapshot financeiro.
- O teste de contrato confere a ordem do `reconcile -> activate`,
  existencia dos timers de 15min e 6h e chave `runLegacyRepair`,
  mas **nao adianta o relogio nem dispara os timers**. Nao verifica
  comportamento periodico em execucao, corrida entre multiplas instancias,
  todas as rotas, integracoes gerenciadas, dados reais ou integridade de
  todos os estados do dominio.
- **Prova exata:** commit `d41f3ea9cc9ab3612ebb1c9faab1c33d28b329e3`,
  [GitHub Actions PG17 #43644042686](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43644042686)
  `SUCCESS`, log `PG17_SYNTHETIC_REAL_HTTP_STARTUP_PASS`.
  [Build seguro sem DB #43644042692](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43644042692)
  `SUCCESS`, mesmo SHA.
- **Decisao:** risco da ordem de startup confirmado pelo processo HTTP em
  fixture, nao verificado em producao. Nao inverter ordem, alterar writer,
  status, rollback ou fonte financeira sem aprovacao de autoridade. Issue #691
  permanece bloqueadora. O build real do Render continua inseguro e nao foi
  atualizado; nenhuma mudanca no Blueprint, envVars, banco, Auth, Storage,
  Vault, Android, Web aprovada ou infraestrutura. PR #692 permanece Draft.

**Proximo gate tecnico:** definir e caracterizar, antes de qualquer alteracao
funcional, a semantica aprovada para inicializacao LEGADA e estado rollback;
adicionalmente avaliar o comportamento dos timers e do cold start concorrente
em ambiente efemero com seguranca equivalente. O Gate 1 gerenciado de
Supabase permanece parcial por HTTP 402 e falta de evidencias Auth/Storage
autenticadas. Nao liberar merge, deploy, restore remoto ou upgrade.
