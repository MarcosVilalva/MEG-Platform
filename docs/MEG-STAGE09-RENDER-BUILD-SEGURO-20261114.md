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
