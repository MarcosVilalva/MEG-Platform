# MEG Finanças Web Evolution — Etapa 09 — Release isolada da API de leitura

Status: **DRAFT / NÃO PUBLICAR**. PR #663, base `main`. PR visual #656 continua independente.

## O que esta PR pode alterar
Somente: `apps/api/src/modules/finance/service.ts` (adições de leitura), `routes.ts` (GETs autorizados, flags aditivas e token de revisão), `history-filter.ts` (validação, seleção e compatibilidade dos rótulos históricos), `history-revision.ts` (consulta SQL `SELECT` do fingerprint de eventos ativos/importação). Alterações de teste em `workspace-sharing.contract.test.ts`, scripts de contrato/integração e workflow. Não altera rotas de escrita, importadores, transferências, pagamentos, políticas monetárias, Prisma schema, Android, Home ou UI de Lançamentos.

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


## Evidência adicional de 10/11/2026 — custos e limites em CI efêmero
- HEAD de teste `abf2feec97aa7def64d9c5b4148e9d8b3e1df8e0`. [API read-only #42863126002](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/42863126002) **SUCCESS**, incluindo contratos, regressão financeira, build e PostgreSQL sintético descartável.
- Logs do job `postgres-ephemeral-snapshot`: assinatura de 3.731 eventos ativos em **54,74 ms** e 5.001 ativos em **75,75 ms**; snapshot 3.731 em **353 ms**, payload JSON de **5.189.007 bytes**. Dados sintéticos e execução única, **não** representam SLA do banco/Render em produção.
- Novas asserções verificam revisões idênticas em duas leituras sem mutação, edição sem CloudMutationReceipt, importação, arquivamento e isolamento de outro titular. O limite 5.001 continua `limit-exceeded` sem KPI parcial.
- O benchmark mede custo em ambiente isolado, não autoriza deploy. **Pendente** avaliar latência real de `/sync-status` e concorrência da carga; o fingerprint percorre os eventos ativos para detectar alterações mesmo sem recibo.
- A configuração REAL do Render continua com `db:prepare:production` e `db:push:production`: **não publicar**, não alterar Build Command nem mesclar antes das autorizações separadas do usuário.
