# MEG Finanças Web Evolution | Etapa 09 PT4
## Rastreio técnico do Egress Supabase — 10/11/2026
**Status:** auditoria parcial, causalidade final ainda não comprovada. **Escopo:** somente leitura de metadados, SQL de estatísticas agregadas, código GitHub, configuração Render e documentação oficial. Nenhum código financeiro, schema, banco, Render, PR visual, Home ou Android modificado.

### 1. Situação real do incidente
- Fonte: relatório Work autenticado fornecido pelo usuário, `MEG-WEB-AUDITORIA-INFRAESTRUTURA-BACKUP-20261110 (1).md`. Egress ciclo **27/10–27/11/2026**: **11,419 GB de 5 GB (228%)**; `meg-financas` **11,365 GB**, `meg-evolution` **0,054 GB**. Painel `Egress Exceeded`, `All services are restricted`, projeto `Unhealthy`; eventual HTTP 402. Cota consumida não pode ser reduzida retroativamente.
- Supabase Free: sem backups gerenciados; nenhum backup externo/restauração comprovados. **NO-GO** para deploy/merge e scripts modificadores de banco.
- Documentação Supabase atual: https://supabase.com/docs/guides/platform/manage-your-usage/egress . A franquia inclui tráfego do banco direto e do **Supavisor/Shared Pooler**; compressão HTTP da API não reduz os bytes já transportados do PostgreSQL ao Render. Supabase recomenda inspecionar divisão diária por serviço, endpoints e consultas frequentes.

### 2. Evidência SQL: consulta dominante com origem localizada
- Banco `meg-financas`, `pg_stat_statements_info.stats_reset = 2026-07-10 18:40:22 UTC`. Contadores acumulados desde julho; **NÃO são o volume exato do ciclo de novembro**.
- `queryid = 5094852670518382389`: **6.591 execuções**, **23.922.170 linhas retornadas**, **~3.629,5 linhas/chamada**, total ~1.022 segundos de execução do servidor desde o reset. Campos incluem `sourcePayload`; cláusula `workspaceId = $1 AND legacyTransactionId IS NOT NULL AND archivedAt IS NULL`. **Corresponde à implementação `normalizedItems()`** em [`apps/api/src/modules/app-state/normalization-migration.ts:64-83`](https://github.com/MarcosVilalva/MEG-Platform/blob/main/apps/api/src/modules/app-state/normalization-migration.ts#L64-L83). Matching por seleção de colunas, filtro e tamanho médio da base; não é atribuição de requestId por log.
- `queryid = 839621940969818402`: **3.516 execuções / 11.554.183 linhas**, filtros de eventos anteriores a um período, `userId`, `archivedAt` e ordem crescente. **Segundo candidato a leituras históricas volumosas, call site não comprovado**.
- Consultas adicionais: `queryid 8637865989334625977`, **1.263 execuções / 4.585.530 linhas**; `queryid -2724073358134369300`, **1.296 / 4.126.856**. SQLs semelhantes mostram outros caminhos de leitura integral.
- Agregado da base atual: **3.630 eventos legados ativos**, `sourcePayload` médio **578,5 bytes como texto JSON**, `pg_column_size(t)` médio **912,3 bytes armazenados/tupla**, estado `AppState` (1 registro) **2.412.952 bytes como texto JSON (~2,41 MB)**. Nenhum conteúdo financeiro, pessoal ou payload individual foi retornado ao relatório. **Tamanho de armazenamento/JSON não é igual a bytes exatos na rede nem permite deduzir quota faturada sem metadados de tráfego.**

### 3. Fluxos confirmados no código
#### A. Auditoria periódica da própria API — independente do usuário (prioridade crítica)
- [`apps/api/src/server.ts:215-240`](https://github.com/MarcosVilalva/MEG-Platform/blob/main/apps/api/src/server.ts#L215-L240) executa `normalizationPreview()` **a cada 15 minutos** quando processo ativo.
- `normalizationPreview` [`normalization-migration.ts:108-121`](https://github.com/MarcosVilalva/MEG-Platform/blob/main/apps/api/src/modules/app-state/normalization-migration.ts#L108-L121): lê o JSON `AppState`, cria resumo/fingerprint e chama `currentNormalizedSummary` que realiza **full scan** de `normalizedItems()` (~3.630 rows, com `sourcePayload`).
- A checagem protege a consistência financeira e **não deve ser removida sem caracterização de rollback/fallback**. Substituir o mecanismo de verificação, quando autorizado, por método consistente com menor tráfego, por exemplo comparação de resumo calculada **no servidor Postgres** em vez de trazer todas as linhas ao Node, desde que os fingerprints/totais e estados sejam matematicamente equivalentes e a concorrência fique protegida.
- O servidor também faz `reconcilePrimaryAppStateFromNormalized()` no **startup** [`server.ts:178-181`], leitura ampla separada, além de manutenção financeira a cada **6h** [`server.ts:155-175`].
#### B. Web: duas leituras grandes no mesmo ciclo auxiliar
- [`apps/web/src/phoenix/data/load-phoenix-read-model.ts:210-248`](https://github.com/MarcosVilalva/MEG-Platform/blob/main/apps/web/src/phoenix/data/load-phoenix-read-model.ts#L210-L248): `fetchStaticContext()` faz simultaneamente **GET `/app-state/normalization-preview` e GET `/app-state`**. Cache auxiliar `STATIC_CACHE_TTL = 10 min` [linhas 94-99].
- `GET /app-state/normalization-preview` chama `normalizationPreview` (full read).
- `GET /app-state` chama `normalizedStateForRead()` [`normalization-migration.ts:241-286`], que lê `AppState`, `normalizedItems` completo e reconstrói `transactions` legadas para compatibilidade. API registra ambas em [`apps/api/src/modules/app-state/routes.ts:104-108,195-200`].
- `apps/web/src/app/auth-client.ts:215-235` também pré-carrega `/app-state` após login; há cache HTTP próprio de 5 min, mas deduplicação é limitada à janela de cache, não substitui reduzir a carga estrutural.
#### C. Web: outros ciclos de consultas
- [`PhoenixApp.tsx:710-721`] atualiza snapshot financeiro mensal **a cada 2 min** quando tela visível; [`PhoenixApp.tsx:748-782`] consulta `/finance/sync-status` **a cada 6 segundos** quando visível. Esta última é resposta pequena hoje, mas exige caracterizar custo antes de adotar token com hash no backend.
- [`load-phoenix-read-model.ts:464-469,551-565`] usa `/finance/phoenix-preview/events` para recuperar **todos os eventos** e pré-carregá-los, com cache de **5 min**. [`phoenix-preview-events.ts:42-83`] `findMany` sem `take`, com relações; outro candidato de Egress quando há sessão, não o único culpado.
- [`server.ts:75-80`] compressão HTTP Fastify para navegador/Android, **mas ela ocorre depois** da saída de linhas do Supabase rumo à API: não protege quota de conexão DB/Shared Pooler.
- [`server.ts:100-107`] `GET /health` só lê status em memória, **não consulta PostgreSQL**. Logs Render mostram checks internos `/health` de 5 em 5 segundos, portanto não culpar essa rota pelas leituras `FinancialEvent`.
#### D. Release e proteção
- PR #663 contém novos GET de snapshot/indicadores mas **ainda NÃO está LIVE**; não atribuir Egress passado aos endpoints não publicados. PR #656 UI validada permanece isolada/DRAFT; não redesenhar. Android congelado, API writers imutáveis.

### 4. Linha temporal indicativa
- Commit [`c760bb0f7d`](https://github.com/MarcosVilalva/MEG-Platform/commit/c760bb0f7df217cf4a64c1d0cc0a22ca38d40357), 13/09/2026, separou cache estático do modelo mensal.
- PR/commit [`9e1c3c8c1f`](https://github.com/MarcosVilalva/MEG-Platform/commit/9e1c3c8c1fea0d2bd6232b1b3cf34b46951ceb3e), 14/09/2026, tratou reconciliação incremental normalizada.
- Commit [`605616dc92`](https://github.com/MarcosVilalva/MEG-Platform/commit/605616dc925ced59a8f359257c774b15ba5ad8a6), 17/09/2026, adicionou cache persistente.
- Commit [`075d1427dd`](https://github.com/MarcosVilalva/MEG-Platform/commit/075d1427dde1c819440e2cbf88b7e92bfb1f42cf), 01/10/2026, adicionou revalidação silenciosa no shell.
- Essas datas identificam mudanças relacionadas; **não provam que qualquer commit iniciou o excesso**. Necessário cruzar com Egress diário e por serviço.

### 5. Evidência faltante e solicitação precisa ao Work
No Dashboard Supabase autenticado, obter **sem alterar configurações**:
1. Gráfico histórico de Egress **diário**, com total e detalhamento por serviço (preferencialmente **Shared Pooler, Database/Data API, Auth, Storage, Realtime, Edge Functions**) no projeto `meg-financas`, separando períodos 27/08–27/09, 27/09–27/10, 27/10–10/11, quando houver histórico.
2. Primeiro dia em que o Egress/dia cresceu, valores por dia, antes/depois dos commits 13/09, 14/09, 17/09 e 01/10. Quantificar se Shared Pooler é dominante; se não, reorientar hipótese.
3. Projetos/rotas/Top Paths no Explorer (sem corpo de requisições, tokens, emails, IPs, dados financeiros). Se métricas indisponíveis, registrar limitação e não inventar.
4. Média e pico de Egress/dia, e quantas vezes maior que períodos anteriores. Anexar capturas **sem segredos** ou tabela Markdown.
5. Retornar relatório `MEG-STAGE09-EGRESS-HISTORICO-WORK-20261110.md`; **não executar SQL que exponha linhas financeiras, dump, alteração, deploy, upgrade ou exclusão**.

### 6. Plano de correção futura — NÃO AUTORIZADA
- Primeiro: distinguir **tráfego automático 24/7** de requisições sob interação e identificar serviço faturado (Shared Pooler vs outros) por métricas; gerar benchmark de bytes com base sintética e resposta real **sem dados sensíveis**.
- Para auditoria periódica, preservar cheque de paridade de normalização, fallback e fingerprint, porém evitar trazer todas as linhas para Node a cada 15 min. Testes de caracterização com divergência real/sintética e concorrência antes de otimizar.
- Para Web, evitar duas reconstruções completas do legado em um mesmo ciclo, sem perder `activityLog`, cartão legado, classificação histórica, autenticação e permissões. Encurtar payload pela autoridade da leitura, com paginação/delta/capabilities conforme contrato da Etapa 09, não calcular valores financeiros na UI.
- Verificar custos de pulso a cada 6 segundos e de prewarm de histórico com múltiplas abas/usuários, respeitando token de alteração de eventos da PR #663. Não trocar cache por risco de dados financeiros obsoletos sem versionamento comprovado.
- Garantir backup externo cifrado e restauração de teste antes de mutações; qualquer alteração futura de API exige remover comandos destrutivos do Build Command Render, autorização específica, CI e release segura. **Nenhuma implementação feita nesta auditoria.**

### 7. Estado operacional
**Etapa 09 ABERTA/NO-GO.** Render segue em build com `db:prepare:production` e `db:push:production`; Supabase Free restrito por Egress e sem backup gerenciado. UI validada da Etapa 09 não alterada. Este relatório é evidência documental em branch isolada.
