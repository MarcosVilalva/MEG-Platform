# MEG Finanças Web Evolution — Etapa 10B — Checkpoint PT37

Data: 21/11/2026 (America/Sao_Paulo)
Escopo: incorporação controlada das correções homologadas no PT35, a partir do PT36, exclusivamente em clone e ambientes descartáveis.

## Resultado executivo

Os três gates obrigatórios desta incorporação estão verdes:

- privilégios padrão de funções futuras do RLS: PASS;
- cold start da normalização: PASS;
- compilação focada da API: PASS.

A incorporação está contida na branch isolada `stage10b/pt36-incorporacao-20261121`, baseada no commit aprovado `ac34f799013daf7730ddda35c5675c7e933fea35`. O commit de entrega é o commit que contém este checkpoint na branch. Não houve merge nem deploy.

## Fonte preservada e isolamento Git

- fonte original: `/home/m_vil/meg-etapa10b-api-isolada-20261119`;
- branch original: `stage10b/webqa-readonly-bootstrap-20261119`;
- HEAD original: `ac34f799013daf7730ddda35c5675c7e933fea35`;
- alterações preexistentes da fonte foram somente inventariadas e não descartadas nem sobrescritas;
- clone de incorporação: `/home/m_vil/meg-etapa10b-pt36-incorporacao-20261121`;
- branch de incorporação: `stage10b/pt36-incorporacao-20261121`;
- remoto conferido: `https://github.com/MarcosVilalva/MEG-Platform.git`.

Hashes relevantes da fonte original antes da incorporação:

- `apps/api/src/server.ts`: `2136f2e69ad3d353e6fc15b645a90434cba7c466232659cf70ee580fe95341e8`;
- teste de fault proxy: `7f6928327c4ecc0dae1dd57647b87cd0476210903c4f4ba61d4c303225143fe4`;
- SQL RLS no commit-base: `e65a0a17d0d61750db41b23fef786f9a2d57d0281c388a343afb7283948669b1`.

## Entradas verificadas

- checkpoint PT36: `54622DE067B3DCDA458093E15031294E11002988BE8F6E3DDF703C78424FA89A`;
- `pt35-rls-default-function-fix.diff`: `3CC4AD07377926766EC8EDC7896830D849D95A437851612E3C8BE2CEEB7E3267`;
- `pt35-normalization-startup-order-fix.diff`: `F47C883A3457E3DE99D684827C16E2DF2BAB19EFA452EDC784EE16A0E376FF8B`;
- patch proibido `pt35-automation-isolation-guard.diff`, apenas conferido e não aplicado: `4A78FE4AC5EBEB63DD1747CD490D938CFBD4CD50E41F30FFAE2BC114C314CA71`.

## Alterações incorporadas

1. `packages/database/prisma/supabase-rls-hardening.sql`
   - revoga globalmente de `PUBLIC` o `EXECUTE` padrão das funções futuras criadas pela role `postgres`;
   - preserva os revokes de tabelas e sequências no schema `public`;
   - hash final: `1431e2601fc37fdcb940a226f3beb345baed2869ff31ca0cf645a1ffde93b8c0`.
2. `apps/api/src/server.ts`
   - consulta `normalizationPreview()` e só reconcilia o AppState a partir do normalizado quando a fonte já é primária, permitindo que o cold start ative a fonte normalizada antes da reconciliação;
   - hash final: `b59ccd8e142593a724311fd41ca24decc6683f2c24b4542486d9646a96d1ebad`.
3. `apps/api/src/modules/finance/stage10-qa-fault-proxy.pg17.isolated.test.ts`
   - guarda a porta já validada em `apiPort`, eliminando dois erros de estreitamento de tipo sem reduzir as proteções do teste;
   - hash final: `7f6928327c4ecc0dae1dd57647b87cd0476210903c4f4ba61d4c303225143fe4`.
4. `scripts/meg-stage10-qa-fault-proxy.d.mts`
   - declara minimamente os tipos do módulo JS do fault proxy, eliminando o terceiro erro TypeScript;
   - hash final: `7cfe302a9d9700f5977300ec003e03f87636fd887369823a6271f19bf263a503`.

O patch `pt35-automation-isolation-guard.diff` não foi aplicado e seus marcadores não aparecem na árvore de incorporação.

## Revisão dos privilégios padrão PostgreSQL

`ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` é global no banco para funções futuras criadas por `postgres`, inclusive fora do schema `public`. A forma restrita `IN SCHEMA public` não neutralizaria o grant global padrão de `EXECUTE` a `PUBLIC`. O ajuste não é retroativo: funções existentes mantêm seus ACLs. Qualquer função futura que precise de acesso por uma role de aplicação deve recebê-lo por `GRANT EXECUTE` explícito e revisado. Nenhuma outra permissão foi alterada além do patch homologado.

## Retestes estritamente necessários

### RLS — funções futuras e abrangência global

Execução em PostgreSQL 17.12 descartável, dentro de namespace de rede sem rota, somente socket Unix:

- função existente antes do patch: permissões anteriores preservadas, como esperado;
- função futura em `public`: `anon`, `authenticated` e `service_role` sem `EXECUTE`; `postgres` com `EXECUTE`;
- função futura em schema privado: mesma matriz, comprovando abrangência global;
- tabela e sequência futuras: roles de API sem privilégios;
- ACL padrão observada para funções: `postgres`, escopo global, `{postgres=X/postgres}`;
- resultado: `RLS_GLOBAL_FUNCTION_SCOPE_GATE=PASS`;
- evidência: `PT36-RLS-GLOBAL-SCOPE-20261121.log`;
- SHA-256 da evidência: `4C15F11319C522F6E9763166150D53F49DA8C2DC6C6A7EB058EA347857C5368E`.

### Normalização — cold start

Execução contra PostgreSQL 17.12 descartável, namespace sem rota, sem dotenv ativo e sem porta protegida:

- antes: membership primária ausente, membership reconciliada presente, revisão 1;
- resultado da normalização: `normalized-primary`, primária ativada;
- depois: primária e reconciliada presentes, revisão 2, sem eventos financeiros;
- a ordem corrigida evitou a reconciliação prematura quando a fonte ainda não era primária e permitiu a ativação no cold start; resultado: `NORMALIZATION_COLD_START_GATE=PASS` e `NORMALIZATION_DATABASE_GATE=PASS`;
- evidência: `PT36-NORMALIZATION-COLD-START-RETEST-20261121.log`;
- SHA-256 da evidência: `A8A232D545DBFC00EF15FC16C6C3911EACB7576C2F8FB71FCD1F7599706099F8`.

A primeira tentativa do cold start parou antes do harness porque o diretório temporário da ferramenta Node havia desaparecido. O PostgreSQL e o diretório temporário dessa tentativa foram limpos. A repetição usou o mesmo código, Node portátil verificado em diretório temporário durável, e passou.

### Compilação focada da API

- comando: `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`;
- ambiente: namespace de rede sem rota e ambiente mínimo;
- resultado: exit code 0, sem diagnósticos TypeScript;
- gate: PASS.

Os gates históricos V17R4, V18R5R1, RC1, Fastify inject e HTTP PT32 R9 não foram repetidos.

## Isolamento, limpeza e restrições

- produção, Android, WebQA persistente, QA 5448 e bancos históricos protegidos não foram acessados;
- nenhum merge, deploy, serviço persistente, instalação persistente ou alteração de infraestrutura foi executado;
- os dois bancos de reteste foram descartáveis, sem rede e removidos ao fim;
- nenhuma porta protegida ficou aberta;
- processos de PostgreSQL e da aplicação encerrados ao fim de cada harness;
- dependências e Node portátil usados apenas para o reteste são removidos após a validação final do commit;
- a fonte original permanece com seu estado preexistente preservado.

## Checklist e pendências

- [x] hashes do PT36 e dos patches conferidos;
- [x] fonte original preservada e branch isolada criada do commit aprovado;
- [x] somente os dois patches autorizados aplicados;
- [x] patch de automação não aplicado;
- [x] três erros TypeScript corrigidos minimamente;
- [x] gate RLS futuro/global verde;
- [x] gate cold start verde;
- [x] compilação focada verde;
- [x] gates históricos não repetidos;
- [x] sem produção, Android, QA persistente, merge ou deploy;
- [x] revisão final por `git diff --check`, hashes, árvore e limpeza antes do commit.

Não resta gate técnico obrigatório da Etapa 10B nesta incorporação isolada. Permanecem fora do escopo e sujeitos a autorização separada: revisão/merge da branch e qualquer deploy. O alcance não retroativo do PostgreSQL exige inventário separado somente se houver decisão futura de endurecer funções já existentes.
