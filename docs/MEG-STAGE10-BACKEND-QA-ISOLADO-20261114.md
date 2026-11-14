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


## 6. Auditoria da autenticação e permissões (14/11/2026)

- Verificado o código em `apps/web/src/app/auth-client.ts`: `VITE_API_URL` configura **uma única origem** para login, validação `/auth/me`, refresh e GET financeiro. A sessão é guardada no cliente e `authenticatedRequest` faz refresh POST quando o access token expira. Logo, apontar `VITE_API_URL` ao backend somente leitura tornaria login e refresh impossíveis.
- `apps/api/src/modules/auth/routes.ts`: `POST /auth/login` e `POST /auth/refresh` geram/renovam sessões persistidas. Esses endpoints devem permanecer apenas na API canônica, não no backend de leitura.
- `apps/api/src/plugins/auth.ts`: autenticação usa `@fastify/jwt` com segredo privado `config.jwtSecret`. Não há contrato de chave pública/audience dedicado verificado para consumo pelo servidor QA. Compartilhar segredo de assinatura com outro serviço eleva a superfície de risco; não efetuar sem projeto de segurança aprovado.
- `render.yaml` declara CORS de produção somente para origens existentes da aplicação (`marcosvilalva.github.io`, localhost/Capacitor); **a presença da origem específica da preview na configuração efetiva do Render não foi comprovada**. Não modificar CORS de produção como efeito colateral.
- **Conclusão:** autenticação completa e dados reais pelo navegador continuam bloqueados. Uma solução deverá separar corretamente a origem que faz login/refresh da origem que serve GET com token, considerar expiração e revogação sem alterar a segurança do serviço canônico, e validar configuração real de CORS. Não publicar token, segredo ou credenciais em documentação, URLs, respostas ou CI.

### Privilegios SQL reforçados

A partir desta auditoria, `stage10-readonly-db-guard.ts` exige também que a sessão PostgreSQL esteja **efetivamente em modo READ ONLY**, que a role não tenha privilégios administrativos nem TEMP no banco e que nenhuma tabela/sequence de schemas não sistêmicos tenha concessões efetivas de escrita. A verificação considera grants efetivos fora de `public`, além das transações READ ONLY do snapshot. Os testes criam roles, schemas e concessões apenas no PostgreSQL descartável do CI; **nenhuma operação desse tipo é autorizada na produção por esta documentação**.


## 7. Roteamento separado concluído em código, ainda sem publicação (14/11/2026)

- `apps/web/src/meg-web-evolution/stage10/real-data-read.ts`: `VITE_API_URL` permanece na autenticação canônica (login, `/auth/me` e `/auth/refresh`), enquanto **apenas** o GET do snapshot financeiro utiliza `VITE_MEG_STAGE10_READONLY_API_URL`. A chamada QA exige HTTPS estrito, `Authorization: Bearer`, `credentials: omit`, `cache: no-store`, método GET e caminho financeiro específico; se a QA devolver HTTP 401, o refresh ocorre exclusivamente na API canônica. JWT não é incluído na URL; sessão e identidade do proprietário são novamente confrontadas antes da entrega dos dados.
- `apps/web/src/meg-web-evolution/integrated-qa/unified-preview.tsx`: opt-in de dados reais só é liberado com `VITE_MEG_STAGE10_REAL_READ_ENABLED=true`, origens HTTPS de autenticação e leitura distintas entre si e da preview. Fluxo padrão mantém bloqueio de rede e conteúdo demonstrativo já homologado.
- `apps/web/vite.stage08-funcional-qa.config.ts`: em build opt-in, CSP `connect-src` permite especificamente as duas origens declaradas, sem wildcard. No build padrão, permanece `connect-src 'self'`.
- `.github/workflows/meg-stage10-real-read-integration.yml` e `scripts/meg-stage10-real-read-browser.synthetic.mjs`: testes passam a usar **dois hosts sintéticos** diferentes (autenticação e leitura), confirmam HTTP 401 da QA, refresh POST somente no host de autenticação, repetição GET financeiro no host somente leitura, zero endpoint financeiro legado, ausência de token nas URLs, histórico integral e limite fail-closed. O teste inicialmente apontou configuração incorreta do mock (GET simulado no host de login), que foi corrigida e reexecutada até verde.
- **Evidência de CI final**: commit técnico `e9fb5d74734188853cf7a1f3106f8d40ccbcf03c`, run `43641240846`, job `132589070513`, resultado `SUCCESS`. Passaram contrato estático, TS API/Web, PostgreSQL 17/JWT/grants, build opt-in e CSP, Playwright com 2 origens e refresh, build padrão da preview e regressão visual de QA. Não houve deploy nem contato com produção.
- **Bloqueios remanescentes**: o servidor QA ainda teria de validar JWT emitido pela API canônica sem distribuir segredo de assinatura de forma insegura; não há acordo homologado de audience/issuer, rotação, revogação, política de CORS real ou usuário de banco somente leitura efetivo no ambiente Render. O CORS da API canônica deve reconhecer explicitamente a origem da preview antes de funcionar com browser real. Nenhuma configuração desses serviços foi alterada. Backend real na mesma preview ainda NÃO homologado.
