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
