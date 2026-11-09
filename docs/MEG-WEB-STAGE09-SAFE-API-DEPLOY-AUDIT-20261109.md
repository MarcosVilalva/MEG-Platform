# MEG Web Evolution — Etapa 09 — Auditoria de publicação segura (09/11/2026)

## Escopo e decisão
Auditoria técnica da PR #656, em Draft, sem merge. Este documento NÃO autoriza deploy da API, migração, alteração de banco, writers, Android, Home ou interface homologada. A issue #660 continua aberta. As issues #661 e #662 permanecem no backlog.

## Evidências efetivamente verificadas em GitHub e Render
- Workspace Render confirmado pelo usuário: `My Workspace` (`tea-d98k1qhkh4rs73f4sfj0`).
- Serviço estático da Etapa 09: `meg-lancamentos-09-pr`, id `srv-dblou80m7kps73brj0kg`, branch `preview/09-lancamentos-20261104`. Último deploy confirmado LIVE na auditoria: `a25a5796a150a7f4443f98ac4828a70bfeaca774`, concluído em 09/11/2026 às 01:43 UTC. Não confundir com o HEAD da PR, `d8e5e27f3ad31c96eb8c107eab4698dcb72a13e8` na consulta; os SHAs eram diferentes.
- Serviço da API financeira: `meg-platform-api`, id `srv-d98k61daeets7384hvb0`, branch `main`, deploy LIVE `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`, datado de 05/11/2026. Este serviço NÃO acompanha a branch Draft da Etapa 09.
- Serviço `meg-evolution-api` usa imagem externa `evoapicloud/evolution-api:v2.3.7` e **não** é a API financeira do MEG; não redirecionar Lançamentos para ele.
- A configuração da API no Render contém o build: `npm install && npm run db:generate && npm run build:api && npm run db:prepare:production && npm run db:push:production`.
- `packages/database/package.json` define `db:push:production` como `prisma db push --accept-data-loss && tsx prisma/ensure-performance-indexes.ts`. **BLOQUEIO CRÍTICO:** não iniciar deploy/redeploy da API atual com esse comando.
- A branch #656 contém `GET /finance/events/history-snapshot` com autenticação de leitura, isolamento por titular, `Cache-Control: no-store`, transação `RepeatableRead`, limite de 5.000 eventos e fallback validado por dupla leitura paginada. Não depende de alteração de schema.
- CI da branch: workflow `MEG Web Etapa 09 - Lançamentos isolados`, run #42601569567, **SUCCESS**, inclusive job PostgreSQL 16 descartável que testa 3.731 eventos e limite de 5.000. Esse job usa `prisma db push` SOMENTE no banco local descartável `meg_stage09_ci`, sem `--accept-data-loss`.
- Os quatro KPIs da tela continuam indisponíveis sob filtros personalizados, em vez de calcular resultados financeiros no React. Isso é uma proteção correta, não o cumprimento integral da funcionalidade.

## Procedimento obrigatório ANTES de publicar snapshot na API
1. Preparar alteração isolada e revisada da configuração de build do serviço `meg-platform-api`: **retirar `db:prepare:production` e `db:push:production` do caminho de deploy da alteração apenas de leitura**, após confirmar dependências operacionais do serviço. Não disparar deploy com o comando perigoso existente.
2. Conferir o diff integral da versão a publicar contra a `main`; não alterar writers ou contratos financeiros do Android; avaliar como disponibilizar a leitura sem mesclar automaticamente a PR #656 inteira (o branch contém UI não liberada para produção).
3. Executar `db:generate`, testes financeiros, TypeScript, contrato do snapshot, PostgreSQL descartável e regressões de autenticação/CORS. Nenhuma destas etapas exige modificar banco real.
4. Verificar que o serviço de deploy possui esquema compatível, **somente com leituras não destrutivas**, sem criar/alterar índices ou executar `db push`.
5. Apenas após revisão explícita do plano e dos gates, publicar a API em procedimento isolado e monitorar logs/health, retornos autenticados 200/limit-exceeded, 401 sem sessão, isolamento multiusuário, CORS e fallback da versão antiga. Nunca registrar tokens ou conteúdo financeiro privado nos artefatos.
6. Confirmar SHA LIVE da API; então testar a rota autenticada do MEG com dados reais em modo somente leitura, contagem/paginação/IDs, campos de categoria e pagamento, sinais de atualização, latência e ausência de writes. Validar que Android/Home continuam normais. Se qualquer teste falhar, interromper a liberação, sem migração corretiva improvisada.

## Projeto do contrato para KPIs filtrados (AINDA NÃO IMPLEMENTADO)
- A API deve aceitar filtros tipados e explicitamente validados correspondentes aos filtros gerais **e** aos do DataGrid, incluindo busca, tipo, categoria, conta, forma de pagamento, data e operadores da grade.
- O backend deve aplicar filtros exclusivamente sobre eventos autorizados do proprietário e usar `financial-policy.ts` / `summarizeMonetaryEvents` para valores canônicos. Não calcular totais, resultado realizado ou saldo em React.
- Resultado deve indicar `filterApplied`, período/critério normalizado, contagem da seleção e valores monetários canônicos. Não denominar o resultado do subconjunto filtrado como saldo disponível de conta.
- A semântica de filtros gerais e avançados deve ser caracterizada por testes de equivalência, com combinação AND entre colunas e OR nas seleções de uma coluna, incluindo estados vazios, competência e formas históricas. Evitar divergência entre linhas exibidas e eventos usados para agregar.
- Para snapshot e indicadores, verificar coerência observável entre leituras, revisão/token de sincronização, concorrência e impossibilidade de resultados mistos. Nunca publicar indicador de um snapshot como se fosse agregado de outro sem essa verificação.
- Casos obrigatórios: receita, despesa, transferências excluídas da posição monetária, benefício/Verocard, pendente, pago, Fixo, cartão de crédito, centavos, usuário distinto, categoria histórica, busca textual, filtro vazio, >5.000 itens e alterações concorrentes.
- Enquanto a API filtrada e os gates não existirem, preservar exatamente o fallback visual atual (`—`) sob filtros personalizados.

## Gate operacional
**NÃO CONCLUÍDO.** Falta publicação segura real da API, contrato de KPIs canônicos filtrados, testes correspondentes, validação autenticada em dados reais e autorização expressa de encerramento. Não fazer merge nem iniciar Etapa 10.


## Implementação isolada do resumo filtrado (09/11/2026, após a auditoria)
**Estado: implementado em código de PR Draft, ainda NÃO disponível na API principal da produção.** O uso real depende da publicação segura e dos gates operacionais pendentes.

- `apps/api/src/modules/finance/history-filter.ts`: contrato estrito dos filtros da consulta, sem regras monetárias; rejeita chaves, operadores, datas e tamanhos inválidos; seleção alinhada aos filtros gerais e tipos de DataGrid. Rótulos históricos continuam apenas informação exibida, sem reclassificação de eventos.
- `apps/api/src/modules/finance/service.ts`: `getCanonicalFilteredHistorySummary` reutiliza o snapshot `RepeatableRead` e **exclusivamente** `summarizeMonetaryEvents` da política financeira para obter receitas, despesas, resultado projetado e realizado. Não usa widgets/UI para somar dinheiro. Se houver mais de 5.000 eventos retorna `limit-exceeded`, sem subtotal incompleto.
- `apps/api/src/modules/finance/routes.ts`: endpoint GET autenticado `/finance/events/filtered-summary?filter=...`, `Cache-Control: no-store`, autorização idêntica aos eventos e resolução de titularidade de workspace; resposta 400 para filtros inválidos. `/finance/sync-status` anuncia `filteredSummaryV1` apenas quando a API que serve essa rota está publicada.
- `apps/web/src/app/finance-client.ts`: cliente tipado, somente GET/no-store, filtro serializado limitado a 6.000 caracteres. Não envia arquivos, tokens no query, valores financeiros derivados ou operações mutantes.
- `OperationalLaunches.tsx`: somente solicita indicadores se a API anunciar `filteredSummaryV1`, conferindo token de sincronização antes/depois da consulta contra a versão do histórico carregado.
- `LaunchesStage09.tsx`: debounce de 350 ms, cancelamento de consultas superadas, proteção contra resposta atrasada; a UI apenas apresenta os quatro valores retornados pelo servidor e conserva `—` quando a capacidade ou a agregação não estiverem disponíveis. O modo demonstrativo visual não foi alterado.
- CI: `scripts/meg-stage09-filtered-summary.contract.test.ts` compara a seleção com o DataGrid e testa receita, despesa, benefício, transferência, pendência, centavos e rejeição de critérios inválidos; `scripts/meg-stage09-snapshot-postgres.integration.ts` acrescenta cálculo de indicadores no PostgreSQL 16 descartável com 3.731 eventos e limite em 5.001; `scripts/meg-stage09-operational.browser.mjs` verifica no navegador os valores de um endpoint simulado para demonstrar que não há soma no React.
- Segurança adicional: `scripts/meg-stage09-api-readonly-preflight.mjs` verifica o comando de build REAL informado pelo operador e **falha fechado** se encontrar `db:prepare:production`, `db:push:production`, `prisma db push`, `--accept-data-loss`, migrações, seed ou scripts de mutação; o CI possui testes positivos e negativos do bloqueio.

### Limitações deliberadas
1. O endpoint filtrado não contorna o limite de 5.000 eventos. Uma alternativa de agregação paginada/streaming, ainda canônica, exige desenho próprio e testes antes de ampliar o volume.
2. Sem o token de sincronização consistente, não mostrar valores como definitivos; manter os indicadores indisponíveis.
3. O novo código **não** torna seguro o comando de build atual do Render. Um procedimento operacional separado deve trocar o build da API para **`npm ci --audit=false && npm run db:generate && npm run build:api`**, validar com o preflight e depois revisar o SHA que será publicado. Não executar `db:prepare:production` ou `db:push:production` no deploy de leitura.
4. O serviço `meg-platform-api` continua apontado para `main`. Esta PR Draft **não deve ser mesclada** para levar a API à produção. Preparar release/API isolada, revisar diff e pedir autorização de publicação quando a infraestrutura estiver segura.
5. Os testes de navegador e PostgreSQL são com dados sintéticos. Teste autenticado com dados financeiros reais, observabilidade, latência sob volume real, compatibilidade Android e validação operacional continuam pendentes.
6. Issues #661 (Home) e #662 (personalização transversal) continuam backlog. Este chat/branch só executa a Etapa 09.
