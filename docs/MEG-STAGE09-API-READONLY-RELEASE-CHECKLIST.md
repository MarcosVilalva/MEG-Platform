# MEG Finanças Web Evolution — Etapa 09 — Release isolada da API de leitura

Status: **DRAFT / NÃO PUBLICAR**. PR #663, base `main`. PR visual #656 continua independente.

## O que esta PR pode alterar
Somente: `apps/api/src/modules/finance/service.ts` (adições de leitura), `routes.ts` (GETs autorizados e flags aditivas), `history-filter.ts` (validação e seleção); testes, workflow e este documento. Não altera as rotas de escrita, imports, transferências, pagamentos, políticas monetárias, Prisma schema, Android, Home ou UI de Lançamentos.

## Risco crítico, confirmado na configuração REAL do Render
Serviço `meg-platform-api`, branch `main`, workspace `My Workspace`, id `srv-d98k61daeets7384hvb0`, comando vigente:
```sh
npm install && npm run db:generate && npm run build:api && npm run db:prepare:production && npm run db:push:production
```
O primeiro script de produção pode executar `DELETE` em `Budget`; o segundo executa `prisma db push --accept-data-loss`. **É proibido disparar deploy ou merge com esse comando.** A automação da PR não altera a configuração do serviço Render.

Comando candidato à publicação desta atualização *apenas de leitura*, sujeito a revisão:
```sh
npm ci --audit=false && npm run db:generate && npm run build:api
```
Executar o preflight usando o comando copiado literalmente da configuração REAL do serviço:
```sh
MEG_API_RENDER_BUILD_COMMAND='npm ci --audit=false && npm run db:generate && npm run build:api' node scripts/meg-stage09-api-readonly-preflight.mjs
```
Esse resultado apenas valida padrões perigosos conhecidos; não comprova que o serviço já tenha sido reconfigurado, nem equivale a autorização para publicar.

## Ordem de liberação, sem atalhos
1. Conferir a PR #663 e CI: API TypeScript, testes financeiros, segurança, CORS, paridade dos filtros, PostgreSQL 16 descartável com 3.731 eventos e limite de 5.001. O `prisma db push` do workflow é permitido **apenas** em `127.0.0.1:5432/meg_stage09_ci`, sem `--accept-data-loss`.
2. Revisar o diff contra a **main mais recente**, incluindo testes que bloqueiam alterações de writers, schema e frontend.
3. Corrigir no painel Render o build real do serviço antes de realizar merge; obter evidência documental do comando atualizado. Não executar `db:prepare:production`, `db:push:production` ou migrações nesta publicação.
4. Validar que o schema do banco já é compatível com as operações existentes; índices parciais `FinancialEvent_user_active_date_idx` e `FinancialEvent_user_active_status_date_idx` foram vistos por `SELECT`, sem alterações.
5. Exigir aprovação explícita para a mudança da branch `main` e para seu deploy; **PR em Draft não autoriza merge**. Não mesclar #656 implicitamente.
6. Publicar monitorando Build/Runtime; identificar commit SHA LIVE e health `/health`, sem logs de tokens/valores.
7. Testar autenticação real, 401 sem sessão, isolamento entre usuários, CORS da prévia, `Cache-Control:no-store`, snapshot consistente, 5.000/5.001, filtros gerais/grade, rótulos históricos e latência; usar sempre GET, sem writes.
8. Retestar Home/Android e fluxo legado; reverter código de aplicação se necessário sem migration ou tentativa de apagar dados.
9. Atualizar checkpoint, issue #660 e obter homologação operacional do usuário. Somente então considerar encerramento técnico da Etapa 09.

## Evidências apenas de metadados (09/11/2026)
Projeto financeiro correto: Supabase `meg-financas`. 6.576 eventos no total, 3.731 ativos e 2.845 arquivados. 3.626 ativos sem `categoryId` usam `sourcePayload.category`; 3.512 sem `paymentMethodId` usam `sourcePayload.paymentMethod`. Nenhum evento ativo sem `accountId` ou `userId`; índices de leitura foram observados. Nenhum valor ou registro individual foi extraído.

Os testes com dados sintéticos **não provam** a disponibilidade nem o desempenho dos endpoints na API LIVE. Esta PR não deve ser considerada pronta para release enquanto a configuração perigosa do Render permanecer.
