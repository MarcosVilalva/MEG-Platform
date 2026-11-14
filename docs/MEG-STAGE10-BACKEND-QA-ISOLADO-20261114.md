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
