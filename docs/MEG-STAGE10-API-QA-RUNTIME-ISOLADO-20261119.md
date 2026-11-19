# Etapa 10 | API QA com identidade runtime separada e isolamento por titular

Data: 19/11/2026. Branch: `stage10/android-confirmacao-qa-20261118`. PRs #701/#702 permanecem Draft.

## Evidencias anteriores preservadas
- PostgreSQL Windows nativo 17.12 `127.0.0.1:5448/meg_stage10_qa`: 32 tabelas, 4 enums, zero registros; gates de estrutura, banco vazio, ACL basica e membresia real PASS.
- O papel `meg_stage10_qa_migrator` e proprietario das tabelas: nao pode ser identidade runtime da API.
- RLS local=0 e API QA bloqueada; nao aplicar o SQL especifico de hardening Supabase no Windows.
- Testes anteriores do PG17 usam fixtures sinteticas e nao representam uma copia fiel dos tres eventos produtivos. Sem importacao de dados reais.

## Novo contrato implementado SOMENTE como teste manual nao executado
- `.github/workflows/meg-stage10-api-runtime-tenant-manual.yml`: exclusivamente `workflow_dispatch`, nunca push/PR, branch e repo exatos, parametro manual de autorizacao, PostgreSQL 17 efemero do GitHub com `127.0.0.1:5432/meg_stage10_runtime_sandbox`. Nao usa secrets, conexoes ou projetos Supabase/Render.
- `scripts/meg-stage10-runtime-disposable-guard.mjs`: guard fail-closed de repo, ref, ambiente GitHub Actions, flags, host, porta, DB e usuario, antes de DDL.
- `scripts/meg-stage10-runtime-disposable-role.sql`: ROLE CI runtime isolada com CONNECT + USAGE + SELECT apenas `Workspace`, `WorkspaceMember`, `AppState`; nenhuma permissao em `FinancialEvent`, nenhuma escrita. Contem guarda SQL repetida; so foi PREPARADO, NAO aplicado.
- `apps/api/src/modules/app-state/stage10-runtime-tenant-pg17.isolated.test.ts`: dois workspaces ficticios, dois titulares, terceiro usuario sem contexto; admin Prisma exclusivo para seeding, Fastify `app.inject` com `DATABASE_URL` na role runtime read-only, endpoints reais `/app-state/revision`. Verifica JWT ausente/invalido=401, diferenca de workspace/revision, ausencia de membro novo para usuario isolado e negacao controlada 403 sem contexto.
- Nao invoca `apps/api/src/server.ts` nem rotinas automaticas de reconcile/activate, migracoes produtivas, APK, deploy ou UPDATE.

## Separacao de operacoes e autorizacoes
1. **Preparacao de codigo/documentacao (esta entrega):** arquivos na branch de QA; nenhum DDL, GRANT, role, INSERT ou teste do workflow executado.
2. **DDL em PostgreSQL efemero do GitHub:** `prisma db push` apos guarda, somente se autorizada execucao manual do workflow.
3. **ROLE/GRANT em PG efemero:** script separado, somente depois do schema e de novo guarda. Nao atinge Windows ou Supabase.
4. **INSERTs de fixtures artificiais:** somente na propria suite, via Prisma admin com URL separada e guardada. Nenhum registro produtivo.
5. **HTTP e isolamento:** `Fastify.inject` usa role SELECT-only e verifica os resultados. O workflow falha em qualquer negativa incorreta.

## Bloqueio funcional esperado que exige evidencia
A implementacao atual de `resolveWorkspaceContext()` chama `ensurePrimaryWorkspace()` ao faltar associacao ativa. Esse fallback pode tentar escritas inclusive durante uma requisicao GET. Como o teste usa role runtime SELECT-only sem SELECT em `User`, a rota do usuario sem contexto pode hoje devolver 500, e nao 403. **A suite exige 403 e por design deve falhar ate que a negacao seja demonstrada**. Nao adaptar a expectativa para aceitar 500 nem conceder poder extra a runtime para ocultar o problema.

Corrigir esse fluxo requer avaliar a compatibilidade historica antes de qualquer alteracao funcional; nao remover `ensurePrimaryWorkspace` indiscriminadamente. O teste de leitura nao cobre os writers financeiros nem prova autorizacao de UPDATE. RLS=0 permanece defesa adicional ausente.

## Gate posterior
Com autorizacao explicita para executar o workflow manual, validar logs e fixar o SHA do run. Depois tratar divergencia de ausencia de contexto, reexecutar testes no PG descartavel e so entao decidir a arquitetura de runtime local Windows. Criacao de role no Windows, grants, novas fixtures locais, replica privada dos tres registros, backup/restauracao e reversao financeira dependem de autorizacao propria e novos gates. Sem merge/deploy, escrita produtiva, Android fisico ou Etapa 11.
