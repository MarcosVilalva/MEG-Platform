# MEG Web Evolution | Etapa 10 | Backend QA isolado, sem deploy

Estado: **implementação isolada com testes sintéticos; uso real NÃO autorizado nem homologado**.

## 1. Escopo e fronteira

Repositório `MarcosVilalva/MEG-Platform`, branch `stage10/real-data-read-integration-20261114`, PR #688 ainda Draft. A preview oficial permanece em `meg-stage08-alerta-prism-pr685.onrender.com`, com deploy automático desativado. O serviço `meg-platform-api` acompanha `main` e executa rotinas que podem alterar dados, além de `db:push:production` no build declarado em `render.yaml`.

**Proibido** reutilizar `apps/api/src/server.ts` ou o `render.yaml` produtivo para QA, pois isso habilita rotinas de manutenção, escritores e preparação de schema. Não alterar serviços Render, Supabase, Android, `main`, credenciais, domínios nem publicar endpoint nesta etapa sem autorização específica.

## 2. Código preparado, não implantado

- `apps/api/src/stage10-readonly-app.ts`: app Fastify mínimo, sem importação de `server.ts`; registra apenas `GET /health`, `GET /auth/me` e `GET /finance/stage10-readonly/snapshot?month=YYYY-MM`, além do preflight estritamente limitado. CORS exige origem HTTPS exata. Não registra login, cadastro, refresh, logout, mutations ou rotinas de manutenção.
- `apps/api/src/stage10-readonly-db-guard.ts`: verifica privilégios efetivos SQL; rejeita usuários com CREATE em banco/schema ou INSERT, UPDATE, DELETE e TRUNCATE em tabelas do schema ativo. O snapshot tem ainda transação SQL READ ONLY, isolamento REPEATABLE READ e filtros de owner/workspace.
- `apps/api/src/stage10-readonly-server.ts`: só abre porta com `MEG_STAGE10_READONLY_SERVER_ENABLED=true`, `NODE_ENV=production`, `MEG_STAGE10_QA_PREVIEW_ORIGIN` (HTTPS explícito), porta válida e usuário PostgreSQL efetivamente sem permissão de escrita. Não executa `db:push`/migrate.
- `apps/api/package.json`: script opcional `start:stage10-readonly`. **Não executar em serviço real sem gates e autorização.**

## 3. Autenticação, ponto crítico ainda aberto

A aplicação real já possui JWT. O servidor mínimo **verifica tokens existentes, mas não emite nem renova tokens**. O login canônico (`authRoutes /login`) cria refresh session no banco, por isso não pode ser registrado no backend de leitura estrita sem contrariar seu objetivo.

A Web atual `UnifiedRealReadQa` inicia por login e exige autenticação funcional. Logo, mesmo com backend isolado e read-only pronto, **o E2E de login com dados reais NÃO está resolvido**. Não compartilhar segredos JWT entre serviços sem um desenho de segurança aprovado, não colocar tokens em URLs, não usar senha no GitHub Actions nem simular identidade real. O teste de browser existente usa respostas sintéticas locais.

## 4. Gates mínimos antes de disponibilização real

1. Confirmar serviço existente realmente dedicado e não homologado, plano/custo, branch fixa, sem deploy automático inesperado, sem migração ou build produtivo. Caso não exista, documentar a indisponibilidade; não criar serviço nem mudar plano por conveniência.
2. Definir formalmente a autenticação cross-origin entre preview e backend, com emissão/revalidação/revogação e CORS apropriados, sem expor segredos em cliente.
3. Configurar usuário **PostgreSQL somente leitura** usando procedimento aprovado, sem executar DDL/mudar grants no banco produtivo nesta rodada. Validar em conexão própria antes da inicialização.
4. Somente depois definir origem exata, segurança de cookies/tokens, CSP e políticas para QA, exclusão de outros endpoints, health/ready, rate limiting, observabilidade sem PII e compatibilidade com acesso a dados da base atual.
5. Reexecutar GitHub Actions, verificação real exclusivamente GET com usuário de QA autorizado, teste de 3.731 eventos ativos, cálculo canônico, autocomplete e responsividade na mesma preview; pedir aprovação visual e funcional explícita.
6. Merge na `main` somente com gates técnicos verdes e aprovação visual quando aplicável. Etapa 11 não autorizada.

## 5. Critério de conclusão

Build e browser sintético verdes **não equivalem** a dados reais na preview, nem a autenticação real homologada, nem a permissão de merge/deploy. Não alterar produção, Android ou a preview homologada automaticamente.

**Próximo passo exato:** verificar testes do app mínimo com JWT e conta PostgreSQL somente leitura no CI isolado; registrar o resultado no checkpoint oficial. Após isso, levantar alternativa de autenticação real sem gravações no backend QA e aguardar autorização para qualquer mudança de serviço.
