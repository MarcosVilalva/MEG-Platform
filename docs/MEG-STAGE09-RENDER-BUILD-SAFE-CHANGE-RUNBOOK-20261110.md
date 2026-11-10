# MEG Finanças Web Evolution | Etapa 09 PT4 | Procedimento controlado para Build Command da API
**Checkpoint de preparação:** 10/11/2026. **Estado:** NO-GO até aprovação explícita específica do usuário. **Não é ordem para executar.**

## Escopo e autoridades
- Serviço Render: `meg-platform-api` (`srv-d98k61daeets7384hvb0`), workspace `tea-d98k1qhkh4rs73f4sfj0`.
- Dashboard: https://dashboard.render.com/web/srv-d98k61daeets7384hvb0
- Serviço Web da API: https://meg-platform-api.onrender.com ; health `GET /health`.
- Branch: `main` (Auto Deploy **ON**, gatilho commit). Build filter inclui `apps/api/**`, `packages/database/**`, `package.json`, `package-lock.json`. **Congelar commits/merges nessa base durante a operação; manter branches de Home PT2, UI de Lançamentos e Android intocadas.**
- Deploy LIVE observado: `dep-dbm92b17lnhs738s0jr0`, commit `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`. Verificar outra vez imediatamente antes de operar.
- Banco externo: Supabase `meg-financas` (`ugbiqzaqnrhulhetevby`, ACTIVE_HEALTHY no momento da inspeção, PostgreSQL 17). Nenhum Postgres interno do Render foi encontrado. **Não confundir ausência de Postgres do Render com backup da Supabase.**
- Backup **NÃO COMPROVADO**: a conexão disponível ao Supabase não informa a lista/garantia de backups nem o plano do projeto. Confirmar no painel `Database > Backups` antes de deploy. Se plano sem backup automático, exigir cópia lógica/restauração testável ou outra estratégia formal, criada e mantida pelo operador autorizado; não restaurar nem fazer dump durante esta etapa de auditoria.
- Render connector atual disponibiliza consulta de serviço e deploys, mas **não oferece mutação direta de buildCommand**; mudança deve ser feita por operador autorizado no Dashboard ou outro mecanismo de alteração aprovado e auditado. Não solicitar credenciais ou tokens.

## Achado crítico
**Build Command REAL, ainda em vigor:**
```bash
npm install && npm run db:generate && npm run build:api && npm run db:prepare:production && npm run db:push:production
```
`db:prepare:production` executa `packages/database/prisma/prepare-production.ts`, capaz de aplicar `DELETE FROM "Budget"` após detecção de duplicados. `db:push:production` executa `prisma db push --accept-data-loss` mais criação/ajuste de índices. O build do serviço não pode realizar operações de banco.

**Candidato de compilação, já caracterizado no CI isolado:**
```bash
npm ci --audit=false && npm run db:generate && npm run build:api
```
No repositório, `db:generate` executa `prisma generate` e `build:api` executa `tsc -p tsconfig.json`. `npm ci` ainda pode executar scripts de ciclo de vida de dependências; validar logs reais e não tratar o padrão estático como prova absoluta de inocuidade. Não alterar `Start Command` (`npm run start:api`) nem `/health`.

## Sequência exata — fases e autorizações
### Fase A — concluída parcialmente, SOMENTE LEITURA
1. Registrar SHA LIVE, deploy ID, serviço, configuração completa, filtros e CI. Conferidos acima.
2. Conferir PRs #656/#663 Draft e isoladas, sem merge. CI read-only, PostgreSQL efêmero e segurança verdes para o HEAD testado da #663. Não mesclar durante a mudança de configuração.
3. Confirmar backup recuperável do Supabase `meg-financas` em `Database > Backups`, retenção/recurso de restauração, ou cópia segura alternativa, SEM produzir restore. **PENDENTE**.
4. Confirmar uma janela controlada, ausência de operações de produção concorrentes e operador capaz de acessar painel Render, com plano de validação e rollback. **PENDENTE**.

### Fase B — requer autorização expressa para alteração de configuração com potencial de deploy
1. Abrir https://dashboard.render.com/web/srv-d98k61daeets7384hvb0 e conferir serviço `meg-platform-api`, branch `main`, SHA LIVE e Build Command real, antes de salvar qualquer coisa.
2. Desabilitar **Auto Deploy** temporariamente para reduzir risco de commit concorrente; confirmar que a opção foi salva e observar eventos/Deploys. Tratar qualquer ação que desencadeie build como operação sob autorização. Não atualizar branch, root dir, variáveis, pre-deploy ou banco.
3. Em **Settings > Build & Deploy / Build Command** (nome exato pode variar na UI atual), substituir **somente** a linha do Build Command pelo candidato acima. Conferir todos os caracteres, especialmente ausência de `db:prepare:production`, `db:push:production` e `--accept-data-loss`.
4. **Salvar somente dentro da janela aprovada.** A documentação da API Render distingue atualização de configuração e deploy, mas a UI pode disparar publicação; por segurança, operar como se salvar pudesse causar build/deploy. Monitorar Events, Deploys e logs imediatamente.
5. Se NÃO houver deploy por salvar, manter AUTO DEPLOY desligado e **não disparar deploy manual ainda**, a menos que a autorização específica inclua deploy de verificação do **SHA atual**. Antes de qualquer novo deploy conferir novamente comando persistido e backup.
6. Se houver deploy permitido nesta fase, verificar que está usando **o mesmo SHA `28703a...`**; que só executa instalação, Prisma generate e compilação; que `/health` permanece saudável; que não há DDL, migrações, `db push`, `DELETE` ou comandos de seed. Confirmar duração/erros sem expor variáveis ou registros financeiros.
7. Conferir manualmente Render após a mudança: Build Command igual ao aprovado, `main`, Auto Deploy mantido OFF até liberação, deploy LIVE conhecido, sem writes. **Não autorizar merge #663 nem #656 por associação.**

### Fase C — requer AUTORIZAÇÃO SEPARADA da PR #663 e de sua publicação
1. Confirmar compatibilidade de schema existente com a API de leitura, PR #663 HEAD, auditoria de diffs, CI final, auth/CORS e backup. Nenhuma migration ou write de produção.
2. Solicitar aprovação específica para concluir PR #663 e realizar deploy monitorado; antes do merge, verificar o filtro de Auto Deploy e o plano de acionamento controlado. Não mesclar PR #656 implicitamente.
3. Durante publicação, validar SHA e health, acesso autenticado, 401/403, isolamento de workspace, no-store, snapshot RepeatableRead, limite 5.000/5.001, rótulos históricos, KPIs filtrados, token entre chamadas e latência sob carga real **somente GET**.
4. Caso algum gate falhe, manter UI em fallback seguro sem calcular dinheiro na Web; reverter aplicação sem alterar schema, writers ou valores. Encerramento da Etapa 09 exige homologação operacional explícita e integração visual controlada #656.

## Falhas possíveis e rollback
- Configuração ou build falha: parar avanço, manter último deploy saudável; verificar eventos do Render. Não desfazer a proteção introduzindo de volta o build antigo.
- Novo deploy sobe e falha em runtime: Render > serviço > Deploys > localizar deploy saudável `dep-dbm92b17lnhs738s0jr0` **se ainda disponível como rollback** > Rollback > confirmar. Verificar /health e logs depois. No plano Free, a disponibilidade de artefatos para rollback é limitada. Não assumir disponibilidade futura sem confirmar na hora.
- Rollback de código **NÃO reverte banco**, nem substitui recuperação/backup. Se houver alteração de dados, interromper a operação e exigir decisão separada de recuperação, com análise de impacto e backup/restore explícitos.
- A documentação Render indica que rollback feito pelo Dashboard desabilita Auto Deploy, enquanto rollback via API não faz isso necessariamente; confirmar o estado final.
- Se falha ocorrer sem deploy e live SHA continuar saudável, nenhuma ação de rollback é necessária; documentar evento e manter configuração segura antes de tentar novamente.

## Gate GO / NO-GO antes de qualquer alteração
- [x] Comando inseguro e risco destrutivo comprovados por código e configuração real.
- [x] Comando candidato caracterizado por CI isolado.
- [x] Serviço Render, SHA e deploy saudável identificados.
- [x] Banco Supabase correto e estado ACTIVE_HEALTHY verificado por conexão de metadados.
- [ ] Backup Supabase recuperável, ou alternativa equivalente, verificado e identificado.
- [ ] Operador/janela e recurso de rollback disponíveis no momento da intervenção.
- [ ] Autorização explícita específica para editar Build Command considerando possibilidade de deploy.
- [ ] Confirmação do Build Command realmente salvo; Auto Deploy e SHA registrados.
- [ ] Verificações de /health e comportamento de runtime após a mudança.
- [ ] Autorização SEPARADA para merge/deploy da PR #663.
- [ ] Homologação operacional da integração da tela de Lançamentos e atualização do checkpoint na branch relevante, sem causar deploy não autorizado.

**Decisão atual: NO-GO.** Etapa 09 aberta, Home PT2 em trabalho isolado, Android congelado. Não é permitido inferir autorização de deploy de uma instrução geral para continuar a auditoria.

## Fontes externas de operação
- Render: https://render.com/docs/deploys
- Render: https://render.com/docs/rollbacks
- Render: https://api-docs.render.com/reference/update-service
- Supabase: https://supabase.com/docs/guides/platform/backups
