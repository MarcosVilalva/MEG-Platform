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


## 8. Inventário Render e tokens, sem deploy (14/11/2026)

- Inventário somente leitura feito no workspace Render `tea-d98k1qhkh4rs73f4sfj0`: a preview oficial `meg-stage08-alerta-prism-pr685` é **static_site**, branch `stage08/overdue-prism-warning-20261112`, autoDeploy OFF; as outras previews visuais e da Etapa 10 identificadas também são estáticas. Há Web services `meg-home-homologacao`, `meg-home-preview-web`, `meg-phoenix-v15-ux-preview` e outros, mas seguem branches legadas/main e autoDeploy ON; `meg-platform-api` está em main com autoDeploy ON. **Nenhum backend existente foi confirmado como dedicado à Etapa 10, isolado e seguro para reutilização imediata**. Não alterar outros serviços, branches, plano, deploys, ambientes ou billing.
- O backend QA usa hoje `@fastify/jwt` (`apps/api/src/plugins/auth.ts`), validado pelo segredo privado `config.jwtSecret`. A API canônica emite JWTs com `sub`, `role`, `email` e expiração. É uma compatibilidade apenas técnica e sintética: não há mecanismo comprovado de distribuição/rotação do segredo, audience/issuer, revogação imediata de sessões ou validação segura entre os serviços. **Não distribuir o segredo JWT da API canônica para um novo serviço por simples conveniência**.
- O fluxo Web de leitura isolada rejeita redirecionamento HTTP (`redirect:'error'`), usa `referrerPolicy:'no-referrer'` e exige `content-type: application/json` antes de aceitar a resposta. O navegador nunca deve encaminhar refresh token ao backend QA, nem tokens em query strings. Testes HTTP sintéticos incluem tokens expirados, assinaturas inválidas e roles não reconhecidas.
- Bloqueios para publicação continuam explícitos: autorização do ambiente backend isolado; autenticação e revogação seguras entre serviços, preferencialmente com verificação sem disseminação da chave de assinatura; conferência da origem exata no CORS da API canônica; credencial PostgreSQL somente leitura autorizada; E2E real com dados privados sob controle; aprovação funcional e visual do usuário. Build/CI não substituem essas etapas.


## 9. Auditoria do GET canônico e decisão de confiança JWT (14/11/2026)

A auditoria exata do código existente revela um detalhe que invalida a hipótese de introspecção ingênua:

- `apps/api/src/modules/auth/routes.ts`, rota `GET /auth/me`, chama `getUserById`.
- `apps/api/src/modules/auth/service.ts`, `getUserById`, chama `currentWorkspaceForUser`.
- `apps/api/src/modules/workspaces/service.ts`, `currentWorkspaceForUser`, chama `resolveWorkspaceContext`; **na ausência de membership ativo, esta função executa `ensurePrimaryWorkspace()`**, que pode alterar dados. Portanto, `GET /auth/me` **NÃO pode ser classificado como invariavelmente livre de escrita**. Esse efeito não acontece necessariamente em cada chamada, mas é inaceitável como premissa para a QA de leitura estrita.
- A Web da Etapa 10 deixa de chamar `validateSession` / `GET /auth/me` antes do snapshot. O backend QA já valida ator ativo e membership no PostgreSQL dentro da sua própria transação `READ ONLY`. O login continua na API canônica, onde a criação de sessões é regra existente.
- O backend QA atual usa `registerAuth` com verificação JWT HMAC por `JWT_SECRET`. Isso **não prova compatibilidade operacional** com a API canônica sem distribuição do segredo. Não copiar o segredo de assinatura para Render QA, não codificar segredo no browser e não ativar uma verificação remota contra o `/auth/me` atual como atalho.

**Alternativas de arquitetura (ainda NÃO implementadas/autorizadas):**

1. **Preferida para isolamento criptográfico:** contrato dedicado de token de acesso QA com assinatura assimétrica (chave privada fica exclusivamente no emissor canônico, chave pública no verificador QA), claims `aud`/`iss`/`sub` e expiração curta; sem refresh token no backend financeiro. Exige alteração planejada e testes da emissão na API canônica, sem quebrar tokens do Android ou Web atual, rotação/revogação, CORS, rate limit e gates financeiros. Nenhuma mudança de algoritmo foi feita.
2. **Alternativa possível, não existente:** endpoint de introspecção dedicado e comprovadamente somente leitura na API canônica, com autenticação e autorização entre serviços, sem uso de `currentWorkspaceForUser`, sem efeitos colaterais e sem transmitir segredos nas URLs. Requer código e infraestrutura próprios, mais verificação de tráfego/timeout e revogação. Não utilizar `GET /auth/me` existente para isso.

**Conclusão:** login/refresh continuam canônicos; a leitura de lançamentos é somente GET e agora não chama `/auth/me` previamente. Contudo, a autenticação real cross-service e publicação permanecem bloqueadas até aprovação de um contrato concreto de confiança e infraestrutura. CI sintético não prova JWT real.


## 10. Protótipo do contrato de verificação assimétrica (14/11/2026)

- `apps/api/src/stage10-public-jwt-contract.ts`: caracterização isolada e puramente local de verificação de JWT assinado com **RS256**, usando somente chave pública SPKI PEM. Bloqueia chaves privadas no verificador, assinatura inexistente ou adulterada, algoritmo distinto, cabeçalhos inesperados (`kid`, `jku`), emissor e audience incorretos, escopo diferente de `stage10:finance:read`, `sub` vazio, role desconhecida, `iat` futuro, `nbf` futuro, `exp` expirado ou janela de validade superior a 900 segundos. Sem DB/rede nem chave HMAC de produção.
- `apps/api/src/stage10-public-jwt-contract.test.ts`: gera pares RSA efêmeros apenas no processo de teste; assinaturas corretas e ataques sintéticos são exercitados sem qualquer token real. O workflow `meg-stage10-real-read-integration.yml` inclui um gate específico para a caracterização.
- **Importante:** o protótipo **NÃO está conectado** a `stage10-readonly-app.ts`, `stage10-readonly-server.ts` nem ao emissor de login de produção. O servidor QA atual ainda usa `registerAuth` HMAC de caráter sintético. A publicação com `JWT_SECRET` replicado continua PROIBIDA; não considerar o protótipo pronto para backend real.
- Pendências de arquitetura: emissão de token QA com chave privada apenas no serviço autorizado, identidade e escopo, key rotation/kid com whitelist ou JWKS pinado (não seguir URLs arbitrárias), sincronização de expiração/revogação e permissões, suporte de refresh da API canônica, definição de CORS, rate limit e anti-replay conforme ameaça modelada. Qualquer integração no serviço canônico exige planejamento e autorização específica.


## 11. Backend Fastify QA ligado ao verificador público RS256 (14/11/2026)

- `apps/api/src/stage10-readonly-app.ts` **não importa mais** `registerAuth` nem o JWT HMAC canônico; valida diretamente o cabeçalho `Authorization: Bearer` por `verifyStage10PublicJwt` usando somente chave pública RSA 2048+ SPKI, issuer, audience, escopo exclusivo `stage10:finance:read`, expiração, assinatura e identidade. `authenticate` e `authorize` são decoradores locais do Fastify de QA. Nenhuma emissão, refresh, registro ou rota de escrita foi adicionada.
- `apps/api/src/stage10-readonly-server.ts` exige `MEG_STAGE10_QA_JWT_PUBLIC_KEY_PEM`, `MEG_STAGE10_QA_JWT_ISSUER` e `MEG_STAGE10_QA_JWT_AUDIENCE` além de `NODE_ENV=production`, flag explícita, origem HTTPS e gate de permissão do PostgreSQL. Ausência de configuração ou chave pública incorreta provoca falha antes de servir tráfego. Não consultar nem replicar o `JWT_SECRET` da API canônica.
- `apps/api/src/modules/finance/stage10-readonly-http.pg.test.ts` passa a assinar tokens **RS256 fictícios em memória** e testar o fluxo HTTP real com PostgreSQL 17 descartável, negando tokens HMAC legados, assinatura de outro emissor, scope de escrita, audience/issuer diferentes, expiração e role desconhecida, além de workspace/membership, histórico integral de 3.731 eventos sintéticos e limite de 5.001. Testa também que nenhuma rota POST de mutação foi registrada e que a API rejeita configuração de chave ausente ou malformada.
- **Limitação funcional central:** a Web e a API canônica em produção ainda usam JWT legado HMAC. Não existe token RS256 específico para QA emitido pelo sistema real. Consequentemente, a nova API QA não consegue autenticar a sessão real atual e **não deve ser publicada como integração funcional**. Criar o emissor de token QA é mudança na API canônica, exigindo desenho seguro e autorização separada. Não habilitar modo real no Render.
- Para autorização efetiva, além da assinatura o backend consulta a identidade e o membership ativo em transação SQL `READ ONLY`. A revogação de refresh token legado não invalida imediatamente um token QA já emitido; validade curta, controles de revogação/autorização em banco e rotação de chave exigem definição e teste antes do uso real.
- O build e os testes sintéticos não substituem a validação do CORS produtivo da preview, plano/custo e infraestrutura dedicada, revisão financeira, responsividade, aprovação visual explícita ou autorização de merge/deploy.


## 12. Emissor RS256 somente sintético e desenho de troca de tokens (14/11/2026)

**Implementado fora da API canônica:** `apps/api/src/stage10-qa-token-issuer.contract.ts` contém a função pura `issueStage10QaReadToken`, que requer uma identidade já autenticada pelo chamador, RSA PKCS#8 privado de no mínimo 2048 bits, emissor e audience específicos, `scope=stage10:finance:read`, `iat/nbf/exp` e TTL positivo limitado a **300 segundos**. Não acessa o banco, não valida senha ou refresh token, não confere membership e **não deve ser tratada como endpoint de emissão autorizado**. O teste `stage10-qa-token-issuer.contract.test.ts` gera chaves temporárias, emite token fictício, verifica assinatura pela chave pública separada e exercita rejeições por validade, assinatura, perfil e configuração. Nenhuma chave foi compartilhada com backend de leitura.

**Desenho recomendado, ainda não implementado:**

1. O navegador autentica pela API canônica como já faz, sem mudar contratos do Android, login ou refresh. Um futuro endpoint de troca **restrito à preview QA**, com gate opt-in desativado por padrão, só poderá usar a autenticação canônica e verificar usuário ativo, role e membership em consulta sem efeitos colaterais, com limiter, autorização da origem exata e resposta `no-store`.
2. O emissor, executado apenas no backend canônico autorizado, assina um token RSA específico para leitura QA, com escopo e audience fixos e TTL curto (sugerido: 120 s, máximo técnico do protótipo: 300 s). **A chave privada nunca sai do emissor.** Não devolver chave, refresh token ou credenciais na URL ou nos logs.
3. O navegador envia exclusivamente esse token dedicado no `Authorization` do GET da API QA. A API QA valida localmente apenas a chave pública e depois revalida usuário ativo/membership no PostgreSQL em transação `READ ONLY`. Não redirecionar HTTP, não aceitar HMAC legado, nem realizar login/refresh no backend QA.
4. Em 401 por expiração, o cliente deve obter outro token QA no emissor autorizado, com revalidação do usuário. O refresh HMAC canônico continua restrito ao seu serviço. **A Web atual ainda envia HMAC diretamente ao backend QA**, logo o caminho real é incompatível e segue bloqueado por padrão. O navegador sintético que usa mocks de autenticação **não demonstra essa troca**.
5. O sistema precisa definir revogação de sessão para tokens já emitidos: a verificação do banco rejeita usuários/memberships bloqueados, mas não detecta necessariamente revogação isolada da refresh session atual até expirar o token QA. Testar logout/revogação, multi-tenant, rate limits, rotação pública pinada e rollback antes da liberação.

**Pontos dependentes de decisão/autorização:** endpoint de troca, custódia de chave privada e rotação, CORS das origens reais, infraestrutura backend QA de custo aprovado, usuário PG read-only, plano de rollback e validação funcional/visual com dados reais. Nenhum deles foi modificado, criado em serviços externos, autorizado para produção ou homologado nesta rodada.


## 13. Contrato experimental de troca ligado a sessao, sem endpoint (14/11/2026)

- Adicionado `apps/api/src/stage10-qa-token-exchange.contract.ts`, uma funcao pura de decisao e seu teste sintético. **Nao e rota HTTP, nao assina tokens e nao foi conectado ao login**.
- O contrato futuro exige a seguinte prova conjunta: opt-in explicito; POST com origem HTTPS exata; token HMAC ja verificado pelo chamador; `sub` e role coerentes com o usuario ACTIVE; um `sid` autenticado no access token, associado a uma `AuthSession` atual, nao revogada e nao expirada; membership ACTIVE para workspace ativo. Sem uma dessas evidencias, recusa a troca.
- A validade resultante para uma eventual assinatura RS256 e limitada a 120 segundos e ao tempo remanescente do JWT e da sessao de origem. **A implementacao vigente da API canônica nao emite `sid` no access token**; logo o contrato falha fechado para tokens reais atuais. A renovacao de refresh cria nova `AuthSession` e revoga a anterior, detalhe que precisa de caracterizacao ao desenhar `sid` futuro.
- A checagem de sessao bloqueia **novas emissoes** depois de logout/revogacao, mas nao elimina automaticamente tokens QA **ja emitidos**. Revogacao imediata desses tokens exigiria `sid` no JWT QA e consulta SQL read-only por requisicao (ou mecanismo equivalente formalmente aprovado); ainda nao implementado. Sem afirmar que logout invalida imediatamente um token QA ja existente.
- `Origin` e CORS sao defesa adicional, nao autenticacao. Nao aceitar token em URL, nao compartilhar refresh token com backend QA, nao usar `GET /auth/me` como introspeccao, nao alterar o login Android/Web atual nem inventar sessao legada. Permanecem necessarias analise de rotacao de chaves, revogacao, rate limit, CORS real e autorizacao separada antes de qualquer endpoint.


## 14. Token QA vinculado à sessão ativa (14/11/2026, revisão isolada)

- O contrato de emissão QA sintética acrescenta `sid` assinado; o verificador RSA/RS256 exige esse campo. A chave HMAC canônica não foi copiada ou modificada.
- O backend Fastify QA passa o `sid` verificado para `withStage10ReadOnlySessionWorkspace`, que consulta `AuthSession.userId`, `revokedAt` e `expiresAt` dentro da mesma transação `READ ONLY` e `RepeatableRead` dos dados financeiros. Sessão de outro usuário, revogada ou expirada recusa a consulta com 403. JWT sem `sid` recebe 401.
- Casos HTTP/JWT/PostgreSQL17 sintéticos cobrem revogação após emissão, expiração, session mix-up e restauração do cenário de teste; teste não usa dados do Supabase. Revogação impede novas transações que observam o estado atualizado, não interrompe uma consulta já iniciada sob snapshot anterior.
- **Não habilitar leitura real:** falta emissão do token QA na API canônica e validação da prova de sessão. A Web experimental ainda encaminha o JWT HMAC legado, que é incompatível. Nenhum deploy, merge, writer ou alteração em produção foi realizado.
- Analisar a alternativa de vincular o token QA à `AuthSession` por prova do refreshToken existente na API canônica (somente lá), sem exigir alteração do access token HMAC. Isso precisa de autorização específica, guarda de origem, rate limit, sessão/usuário/workspace read-only e fluxo de renovação seguro. Não enviar refreshToken ao backend QA nem publicá-lo.


## 15. Prova de sessão sem mudar JWT HMAC e cliente Web sem mistura de tokens (14/11/2026)

- Caracterização pura `stage10-qa-token-exchange.contract.ts` passou a exigir conjuntamente: JWT HMAC canônico já verificado, usuário e membership ACTIVE consultados pelo servidor, origem HTTPS exata, POST opt-in, `refreshToken` opaco em corpo JSON comprovado por SHA-256 contra `AuthSession.tokenHash`, sessão não revogada e validade restante. **Não exige `sid` no access token HMAC** e não modifica o formato usado por Android/Web. A comparação do hash usa `timingSafeEqual`. O resultado aprovado retorna apenas ator, role, workspace, sessionId e TTL, nunca o refresh token.
- Em futuro endpoint autorizado, o emissor canônico pode assinar RS256 com `sid=AuthSession.id` e TTL de até 120 s, limitado pela sessão e pelo JWT canônico. Backend QA verifica `sid` na transação READ ONLY já caracterizada, recusando sessões rotacionadas, expiradas ou revogadas.
- A ponte experimental Web (`real-data-read.ts`) agora solicita exclusivamente ao emissor canônico POST `/auth/stage10-qa/exchange` com access token HMAC no Authorization e refresh opaco **somente no corpo enviado à origem canônica**; exige JSON, `no-store`, identidade compatível e token QA curto; manda ao backend QA apenas o novo token RS256 no Authorization do GET. Em 401, renova pela API canônica e refaz a troca uma vez. Sem fallback de enviar HMAC à API QA, sem credenciais em URL, sem redirect e sem gravações financeiras.
- O navegador de CI usa **interceptações sintéticas**, não prova existência de endpoint real. Não foi criada nem registrada rota de troca na API canônica, não foi implantado backend QA e não existe token real emitido. O opt-in padrão permanece desabilitado e a preview homologada intacta.
- **Para fechamento:** dependem de autorização específica e validação própria a implementação e habilitação da rota canônica, rate limit e proteção de origem, custódia/rotação RSA, backend QA isolado e acesso SQL SELECT-only, CORS, testes E2E com identidade e base reais, homologação visual/funcional e decisão de PR/merge. Prova sintética não substitui esses gates.


## 16. Claim wid e cadeia completa autenticada em PostgreSQL fictício (14/11/2026)

- O JWT QA RS256 contém `sub`, `sid` (AuthSession) e `wid` (workspace) vinculados à assinatura. O verificador exige ambos; a API QA confere que `scope.workspaceId` corresponde ao `wid` assinado, além do usuário e da sessão ativa dentro do mesmo snapshot READ ONLY. Uma sessão válida não pode ser reaproveitada para abrir workspace diferente sem token específico.
- O teste HTTP/PostgreSQL17 sintético combina a prova de refresh opaco pela função `authorizeStage10QaTokenExchange`, emissão RSA efêmera por `issueStage10QaReadToken`, consulta ao Fastify QA e revogação da AuthSession. Exercita também prova de refresh inválida, `wid` diferente e token já emitido após revogação. Não usa a chave real nem banco de produção.
- **Limite da evidência:** assinatura HMAC canônica original é representada por `signatureVerified` no contrato puro, não há rota produtiva registrada, e o navegador usa interceptação. A execução sintética composta caracteriza a cadeia técnica, mas NÃO é autenticação real ponta a ponta. Requer novo gate e autorização para qualquer conexão real/preview.


## 17. Editor QA de dados reais estritamente consultivo (14/11/2026)

- Detectado em revisão que `UnifiedRealReadQa.tsx` passava uma callback de "salvar simulado" para `EditExpensePreview`, deixando habilitado o botão Salvar no editor com dados reais embora nenhuma mutação fosse executada. Isso confundia demonstração e execução.
- Introduzida prop `readOnly` opt-in no `EditExpensePreview`. O modo com dados reais ativa `readOnly` e não oferece callback de gravação, logo `ExpenseForm` recebe `saveEnabled=false`. O editor continua mostrando dados sem inventar IDs e sem escrita. A QA demonstrativa preexistente conserva sua simulação e comportamento visual homologado.
- O contrato estático protege essa separação; testes Web, browser e regressão devem validar o commit antes de promover a mudança. Esta correção NÃO implementa edição real, e publicação de writers continua proibida sem autorizações/gates.


## 18. Endpoint canônico de troca QA, opt-in e isolado (14/11/2026)

Implementado somente na branch `stage10/real-data-read-integration-20261114`, **sem deploy**:

- `apps/api/src/modules/auth/stage10-qa-exchange-routes.ts` registra `POST /auth/stage10-qa/exchange` somente quando `MEG_STAGE10_QA_EXCHANGE_ENABLED=true`; desligado por padrão, nenhuma rota. Na ativação exige `MEG_STAGE10_QA_PREVIEW_ORIGIN`, `MEG_STAGE10_QA_JWT_ISSUER`, `MEG_STAGE10_QA_JWT_AUDIENCE`, `MEG_STAGE10_QA_JWT_PRIVATE_KEY_PEM` e origem HTTPS exata já listada em `CORS_ORIGINS`. Configuração incompleta ou chave RSA privada inadequada impede inicialização, sem fallback.
- A rota usa `app.authenticate` existente somente para verificar HMAC do access token canônico, **não** `app.authorize`, que em POST chama `resolveWorkspaceContext` potencialmente mutante. Dentro de transação Prisma `REPEATABLE READ` / `SET TRANSACTION READ ONLY`, verifica usuário ativo, hash do refresh opaco em `AuthSession`, sessão ativa, workspace/membership ativos, role coerente e origem de navegador exata. A prova de refresh jamais sai do emissor. Não consome a refresh session e não altera o formato dos tokens Android/Web legados.
- Após autorização, assina RSA `RS256` com `sub,sid,wid,iss,aud,scope` e TTL de até 120s. `Cache-Control: no-store`, sem HTML redirect, corpo validado por Zod e rate limit por IP e fingerprint opaco. O backend QA continua validando sessão e workspace em cada transação GET READ ONLY; revogação impede novas consultas.
- Testes de caracterização em `apps/api/src/modules/auth/stage10-qa-exchange-http.pg.test.ts` conectam Fastify de teste ao PostgreSQL17 descartável, com chaves RSA efêmeras: flag false = 404, token válido, assinatura HMAC inválida, refresh de outro ator, role, origem, sessão/usuário/membership bloqueados e contagem de sessões intacta. Gate incluído no workflow sem modificar CORS de produção, credenciais nem dados reais.
- **Aguardando verificação do CI:** não registrar PASS até a execução efetiva. O recurso permanece desligado na QA real e produção; não foram configurados segredos RSA, backend QA, role PostgreSQL read-only nem dados reais. Depende de testes funcionais/autorização de infraestrutura e homologação visual antes de encerramento.


## 19. Adaptador real de comandos de despesa, ainda desligado (14/11/2026)

- `apps/api/src/modules/finance/stage10-readonly-routes.ts` passa a incluir `enteredAmount` no snapshot, usando exclusivamente `enteredAmountFromStored` da camada financeira canônica. A edição usa esse campo para preservar estornos; o navegador não recria a regra de sinal.
- `real-expense-mutation.ts` faz SOMENTE validação de entrada e referências ativas: dinheiro decimal textual com duas casas, data válida, categoria, forma ordinária, conta monetária para Pago, nenhuma conta obrigatória para Pendente e bloqueio explícito de benefício/crédito/transferência na rotina de despesa. Não calcula saldo/status/fatura.
- Modo opt-in `VITE_MEG_STAGE10_REAL_WRITE_ENABLED=true` exige ainda `VITE_MEG_STAGE10_WRITE_CANONICAL_API_ORIGIN` exata, origem `VITE_API_URL` HTTPS e separação da API financeira QA somente leitura. A QA existente continua sem escrita por padrão, inclusive se a leitura real estiver habilitada.
- Novo despesa/duplicação: `financeClient.createEvent` com `operationId`; edição: `financeClient.bulkUpdateEvents` com `expectedUpdatedAtById`; exclusão com confirmação: `financeClient.bulkArchiveEvents` com versão e `operationId`, restrita a ADMIN/MANAGER. Os serviços canônicos protegem atomicidade, idempotência e auditoria. O cliente não modifica KPIs diretamente, recarrega snapshot após sucesso. Operador não pode arquivar, Viewer não pode escrever.
- `ExpenseForm` e `EditExpensePreview` preservam o modo demonstrativo. No modo real, textos indicam corretamente leitura ou escrita e o editor tem confirmação antes da exclusão. Novos componentes se limitam à etapa 10, sem reuso de UI histórica.
- Testes sintéticos em `real-expense-mutation.contract.test.ts` para entrada, estorno, conta de baixa, refs inválidas, concorrência e bloqueios; CI de API/Web/PG17/Playwright deve ser revalidado. **O opt-in NÃO foi ativado nem publicado em Render.** Sem E2E real de gravação na base privada nem homologação visual de alteração, a etapa segue aberta.


## 20. Alimentação/Verocard canônico e prévia de parcelas read-only, 14/11/2026

- A entrada de categoria Alimentação na QA real opt-in resolve apenas IDs ativos de Conta Benefício e Verocard. A escolha força Pago e bloqueia os vínculos. A despesa segue `createBenefitEventProtected`/`updateBenefitEventProtected`, nunca `event-mutation` monetário; saldo e auditoria continuam responsabilidade do backend. Uma seleção ambígua falha fechada, não assume IDs.
- O catálogo financeiro QA mapeia checking/savings/cash como contas monetárias e deixa benefit/investment separados; cartões ativos são mostrados como `CreditCard` reais, não derivação por nome.
- Endpoint `GET /finance/stage10-readonly/card-preview` vincula ator, sessão, workspace e cartão ativo ao cálculo `cardPurchaseCyclePreview` já existente. Valida parâmetros, responde com `source=canonical`, `canWrite=false`, vencimentos, competências e parcelas; nunca executa mutações. A Web só exibe esta resposta e verifica sua correspondência com o formulário.
- Teste HTTP/JWT/PostgreSQL17 rejeita parâmetros, falta de JWT, cartão de outro owner e sessão revogada, e confere a divisão de 100,00 em 33,34+33,33+33,33. E2E browser testou criação sintética de Alimentação; teste específico da renderização da prévia de cartão no browser ainda não foi adicionado.
- `CardPurchase` usa writer distinto de `FinancialEvent`, portanto compras no cartão seguem sem gravação na nova Web até que Lançamentos leia e edite esse agregado sem duplicidade. Outros gates de publicação permanecem pendentes.
- Runs verificados [#43657516631](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43657516631), [#43658208899](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43658208899): SUCCESS. Nenhum serviço implantado, custo criado ou dado real acessado.


## 21. CardPurchase/CardInstallment histórico em GET exclusivo, 14/11/2026

- `apps/api/src/modules/finance/stage10-readonly-routes.ts`: rota `/stage10-readonly/card-purchases` sob prefixo `/finance`, somente GET e `withStage10ReadOnlySessionWorkspace`. A leitura em PostgreSQL `SET TRANSACTION READ ONLY`, `RepeatableRead` confere workspace único para o owner, não aceita evento financeiro de workspace externo e filtra `CardPurchase` original com `CardInstallment` por mês da compra OU `statementMonth` da parcela.
- Retorna `stage10-card-purchase-history-v1`, `source=canonical-card-purchases`, `canWrite=false`, IDs e parcelas, limite 5000. Nega rota para JWT inexistente/revogado, não usa `listCards` legada porque essa pode carregar rotinas de migração, e não calcula fatura nem status na Web. Permanece separada de `FinancialEvent` para evitar duplicação silenciosa.
- Teste HTTP PostgreSQL17 sintético validou compra R$ 100,00 (33,34 + 33,33 + 33,33), visibilidade por competência, usuário diverso, mês inválido, ausência de token e revogação. CI [#43659104411](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43659104411) SUCCESS. Sem dados, chaves, custos ou servidores reais.
- Próxima implementação apenas após resolver reconciliação/identidade e UI: leitura e edição canônicas de compras e parcelas, sem alterar regras financeiras. Publicação e aprovação visual permanecem pendentes.
