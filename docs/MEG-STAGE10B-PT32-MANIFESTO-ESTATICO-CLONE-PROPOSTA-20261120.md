# MEG Finanças Web Evolution | Etapa 10B | Manifesto estático de clone descartável, PT32

**Data-base:** 20/11/2026. **Natureza:** PROPOSTA DOCUMENTAL, SEM ARTEFATO EXECUTÁVEL, SEM SERVIÇO INICIADO. **Gate de manifesto:** EM REVISÃO; sem homologação do runtime ou do isolamento.

## Escopo e fontes

Base nominal do GitHub: commit `ac34f799013daf7730ddda35c5675c7e933fea35`; estado local preservado conforme relatório PT32 de seis hashes, não necessariamente idêntico ao remoto. Referências: `MEG-ETAPA10B-CHECKPOINT-CONSOLIDADO-PT29-PT32-20261120.md`, pareceres PT31/32 e fontes versionadas `apps/api/src/config.ts`, `apps/api/src/server.ts`, `packages/database/src/index.ts`, `package.json`, `apps/api/package.json` e `packages/database/package.json`. **Não confundir** manifestação de dependência com prova de resolução real da árvore instalada.

## Entradas declaradas do repositório

| Entrada | Evidência de código/metadados | Risco ou decisão |
|---|---|---|
| Aplicação API | `apps/api/package.json`: `start: tsx src/server.ts`, `dev: tsx watch src/server.ts`, `build: tsc -p tsconfig.json`, pacote `@meg/api`, `type: module` | `tsx` é o interpretador de fonte; imports ESM avaliados antes do corpo do servidor. Proibir `npm start`, `npm run`, `tsx` ou Node até o isolador real aprovado. |
| Workspace | `package.json`: `workspaces` inclui `apps/api`, `packages/database`, `packages/core` e outros; `type: module` | Runtime por workspace pode depender de symlinks. Manifesto não deve copiar symlink para árvore externa, HOME, `/mnt`, ou arquivos protegidos. |
| Banco Prisma | `apps/api/package.json`: `@meg/database` com dependência local declarada e `packages/database/package.json`: `main: src/index.ts`, sem `exports` declarado | Resolver entrada real apenas em artefato descartável; o valor nominal `main` não prova onde o Node/tsx instalado irá resolver. |
| Cliente Prisma | `packages/database/package.json`: `@prisma/client` `6.12.0`; `prisma` dev `6.12.0` | Gerado de cliente e engine não estão homologados como conjunto de arquivos; não executar `prisma generate`. |
| `dotenv/config` | `apps/api/src/config.ts`: `import 'dotenv/config'` | Por padrão, procura `.env` no **cwd** do processo (pode depender de `DOTENV_CONFIG_PATH`). Exigir cwd descartável, env limpo e ausência comprovada de qualquer `.env` acessível. |
| `dotenv.config({path})` | `packages/database/src/index.ts`: `fileURLToPath(import.meta.url)`, `__dirname`, `path.resolve(__dirname, '../.env')` | Com `src/index.ts`, resolve para `packages/database/.env`; em outra árvore transpilada a resolução muda com a localização real do módulo. Exigir análise do arquivo carregado no clone, não do HOME original. |
| Configuração | `apps/api/src/config.ts`: validação Zod `safeParse(process.env)` em top-level e `process.exit(1)` em erro | Sanitizar o ambiente **antes** do primeiro import. `RUN_LEGACY_REPAIR: z.coerce.boolean()` converte strings não vazias em `true`; não confiar em `RUN_LEGACY_REPAIR=false`. |
| DB Client | `packages/database/src/index.ts`: `new PrismaClient()` em top-level | Construção do cliente é efeito de avaliação, não prova conexão; acesso SQL real apenas em clone e gate posterior. |
| Roteamento | `apps/api/src/server.ts` local SHA-256 `2136...95341E8` | Guardas de WebQA não podem ser reapontadas ao clone; listener, registros e manutenção exigem variante isolada e revisão de paridade, sem tocar no original. |

**Dependências declaradas no pacote API** (não equivalentes aos 13 imports externos únicos da PT31): `@fastify/compress`, `@fastify/cors`, `@fastify/jwt`, `@fastify/swagger`, `@fastify/swagger-ui`, `@meg/database`, `bcryptjs`, `dotenv`, `fastify`, `zod`. Dependências de desenvolvimento incluem `tsx` e `typescript`. Pacote `@meg/database` declara `@prisma/client`, `csv-parse`, `iconv-lite`; ferramentas de desenvolvimento `prisma`, `tsx`, `typescript`. O lockfile/árvore instalada/transitivos e os **13 imports externos PT31** não foram homologados individualmente nesta rodada. Não afirmar fechamento binário de dependências.

## Manifesto permitido em termos de categorias, ainda não efetivado

**Fontes mínimas candidatas**: entradas TypeScript do API sob `apps/api/src`, caminhos internos transitivos efetivamente requeridos, `packages/database/src/index.ts`, Prisma client/artefatos gerados pré-existentes **somente após comprovação de integridade**, e manifestos de pacote que determinam resolução. O conjunto exato de fontes será fechado por hashes na árvore isolada e após completar a revisão das bibliotecas externas. **Não copiar automaticamente** os 77 arquivos como se fossem a árvore inteira.

**Exclusões obrigatórias**: `.env`, `.env.*`, arquivos de chave/credenciais, `.git`, backups e dumps (`*.age`, `*.pgdump`), sockets de PostgreSQL, diretórios de WebQA, QA/histórico, Android, OneDrive, HOME e `/mnt` originais, quaisquer symlinks com alvo externo e caches/`node_modules` que apontem fora do clone. Fontes que exigirem dependências externas faltantes devem provocar bloqueio, nunca fallback para a árvore original.

**Metadados necessários para eventual manifesto fechado:** path relativo canonizado à raiz do clone, SHA-256 por arquivo, tipo de entrada (arquivo/diretório/symlink), destino de symlink validado, pacote dono, origem e propósito, autorização de inclusão, versão/resolução real de runtime e ausência de referências operacionais. Não embutir URLs, senhas, strings de conexão reais ou conteúdo de `.env` no manifesto.

## Invariantes de segurança do futuro supervisor (não implementado)

1. `env -i` com allowlist positiva e valores fictícios; eliminar credenciais herdadas, `DATABASE_URL` operacional, `PG*`, `NODE_OPTIONS`, `DOTENV_CONFIG_PATH`, caminhos de proxy/configuração e integrações. **Nenhum dotenv original montado**. `cwd` e `HOME` dedicados ao clone, sem leitura do original.
2. Antes de iniciar Node: namespaces user/mount/pid/net reais e verificáveis, UID sem privilégios, mounts privados/mascarados, `lo` apenas, sem bridge/NAT/default route IPv4/IPv6, bloqueio de egress, sem bind na rede do host. Nunca usar porta/socket 55490, WebQA, QA 5448 ou histórico 55489.
3. Bloqueio de descritores herdados; destino SQL fictício e exclusivo, com identidade real do processo PostgreSQL quando/SE explicitamente aprovado. Esta fase não executa PG nem API.
4. Preflight fail-closed de árvore e namespaces, timeout externo, identificação rigorosa de processos/descendentes e limpeza independente. Não usar `pkill` genérico nem declarar PASS diante de resíduos não auditáveis. PT29 R2 sintético PASS não transfere aprovação automaticamente ao executor real.
5. Separação de construção do Fastify, registro de plugins, listener e manutenções **somente em variante descartável**, preservando fonte original e paridade funcional. Não confundir stub HTTP com API real. Rotas e timers que escrevem continuam bloqueados na pré-integração.
6. Roles SQL: administrador do clone, proprietário do esquema e executor comum distintos. Executor sem `BYPASSRLS`, superusuário, `CREATEDB`, `CREATEROLE`, ownership das tabelas ou herança administrativa. `SELECT 1` não homologa grants nem RLS. Sem criar políticas inventadas.

## Gates de saída desta documentação

| Gate | Situação |
|---|---|
| Caminho literal de dotenv explícito no código fonte do HEAD | **Identificado**: relativo ao diretório do módulo, `../.env` |
| Base do dotenv/config | **Identificada**: cwd (exceto override de ambiente a bloquear) |
| Entradas declaradas `tsx`, workspace e `@meg/database` | **Identificadas por manifestos**, resolução efetiva não demonstrada |
| Varredura PT31 R3 | **PASS dirigido, coleta única preservada**: não repetir |
| 13 dependências externas / árvore instalada | **PENDENTE de fechamento e revisão de efeitos** |
| Isolamento real pré-import, egress, FD, timeout e limpeza | **NÃO IMPLEMENTADOS/NÃO EXECUTADOS** |
| Bootstrap HTTP, segurança SQL/RLS, restore | **NÃO EXECUTADOS/BLOQUEADOS** |

**Próximo passo técnico exato:** revisão documental dirigida da resolução efetiva das dependências externas e do layout runtime **sem executar npm/tsx/Node**. Após autorização de implementação em clone exclusivamente descartável, revisão do supervisor e da variante de bootstrap antes de qualquer teste real. Etapa 10B permanece ABERTA.