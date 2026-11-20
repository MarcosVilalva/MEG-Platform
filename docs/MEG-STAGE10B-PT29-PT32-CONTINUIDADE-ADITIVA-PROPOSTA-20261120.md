# MEG Finanças Web Evolution | Etapa 10B | Continuidade aditiva PT29–PT32

**Data-base:** 20/11/2026. **Status do documento:** REGISTRO DOCUMENTAL EM BRANCH EXCLUSIVAMENTE DOCUMENTAL PARA REVISÃO EM PR DRAFT; NÃO MERGEADO NA MAIN. **Etapa 10B:** ABERTA.

## Proveniência, escopo e decisão de não sobrescrever

Registro preparado a partir de `MEG-ETAPA10B-CHECKPOINT-CONSOLIDADO-PT29-PT32-20261120.md`, dos pareceres PT31/PT32 do ZIP de transferência e das consultas **somente leitura** ao GitHub. Resultados de WSL e Windows abaixo foram relatados pelo usuário no checkpoint; não constituem nova execução independente. **Nenhuma API, banco, Node, AGE, pg_restore, restore, instalação ou auditoria anterior foi executada nesta rodada.**

Repositório: `MarcosVilalva/MEG-Platform`. Worktree informado: `/home/m_vil/meg-etapa10b-api-isolada-20261119`. Branch local conhecida: `stage10b/webqa-readonly-bootstrap-20261119`; HEAD do checkpoint: `ac34f799013daf7730ddda35c5675c7e933fea35`. A consulta ao GitHub não encontrou branch remota `stage10b`. **O estado atual do worktree local, `git status`, HEAD local atual e diferenças não foram verificados diretamente** nesta sessão; nenhuma alteração local foi tentada.

Consulta GitHub de 20/11/2026: `main` HEAD `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`; blob de `MEG-WEB-CONTINUIDADE-OFICIAL.md` no `main`: `0b48f59cad5896b2226dcd70e4250dde4ef67956`; no commit operacional `ac34f799`: `de0b98f15be51eeb3e84011052d0b11f71c67339`. Comparação `main...ac34f799`: históricos **divergentes**, 1.093 commits exclusivos do HEAD operacional e três do `main`. Não é seguro sobrescrever uma versão pela outra. Na consulta anterior nenhuma branch documental autorizada havia sido identificada. **Em 20/11/2026, o usuário autorizou explicitamente uma branch exclusivamente documental a partir do main remoto confirmado, com commits e PR Draft, sem merge, deploy ou alteração do worktree operacional.**

## Resultados aprovados ou preservados (sem reexecução)

1. Gates financeiros V12, V16R1, V17R4, RC1, V18R5R1 e Fastify inject: resultados anteriores reportados PASS, incluindo Novo Lançamento, edição, idempotência, duplicidade, reversão, ledger, saldos, atomicidade e isolamento entre workspaces. Não revalidam o bootstrap real.
2. TOC offline: 692 objetos, 252 incluídos, 109 em revisão, 331 excluídos. Os selecionados incluem 220 objetos estruturais e 32 `TABLE DATA`; os dados **não** estão homologados. Nenhuma restauração autorizada.
3. DDL × Prisma declarativo: 32 tabelas, 341 colunas, 25 campos `Decimal`, 32 PKs, 52 FKs, 68 índices, quatro enums, 32 tabelas com `ENABLE RLS`; zero divergências declarativas identificadas. Não equivale a RLS operacional. `pgcrypto` e `uuid-ossp` não necessários nesse recorte estrutural, sem autorização de removê-los de outros ambientes.
4. PT29 R2: executor integrado **sintético** PASS, com evidências relatadas de isolamento, env allowlist, mascaramento HOME/MNT, somente `lo`, sem rotas padrão utilizáveis, descritor marcador não herdado e processos residuais marcados zero. Não autoriza executor real.
5. PT30: `server.ts` local inspecionado, SHA-256 `2136F2E69AD3D353E6FC15B645A90434CBA7C466232659CF70EE580FE95341E8`. Proteções `MEG_WEBQA_READONLY`, filtros HTTP `/health` e `/ready`, manutenção pós-listen desativada no modo restrito. A guarda local fixa banco/socket do **WebQA protegido** e não pode ser apontada diretamente para clone.
6. PT31 R3: resolvedor corrigido, `PATCH_RELATIVOS=PASS`, `PATCH_WORKSPACES=PASS`, AST PASS, **12/12 imports** dirigidos PASS. Artefato R3 SHA-256 `5C184C96C9F81F5A4DABFA467D6FF8D0D5541BFDCCD43FC1EC2AE7B0F524A5E2`.
7. PT31: varredura estática única R3, 77 arquivos alcançados, zero imports relativos não resolvidos **na cobertura**, 13 imports externos únicos, oito arquivos sinalizados, profundidade máxima três. `GATE_PT31=COLETADO_EXIGE_REVISAO`; nenhuma afirmação de cobertura integral ou de segurança de pacotes externos.
8. PT31: revisão dirigida de nove arquivos e 25 indicadores, inclusive avaliação top-level de `dotenv/config`, `dotenv.config({ path: ... })`, validação de ambiente e construção de `PrismaClient`. `fetch`/temporizadores apareceram em funções, não provaram ausência global de efeitos na árvore.
9. PT32: preflight estático verificou seis hashes no worktree, `WSL_EXIT_CODE=0`, `SERVER_SHA256=PASS`, `WORKTREE_MODIFICADO=NAO` **naquela execução**. `GATE_PT32=COLETADO_EXIGE_REVISAO`; runtime, executor real e HTTP não homologados.

### Hashes PT32 reportados

| Arquivo local | SHA-256 |
|---|---|
| `apps/api/src/server.ts` | `2136F2E69AD3D353E6FC15B645A90434CBA7C466232659CF70EE580FE95341E8` |
| `apps/api/src/config.ts` | `3B5FB354781F29BB0670D66978DE45FC4F2206CDB84C7989E9686B38467F216F` |
| `packages/database/src/index.ts` | `79471AC57E41E46417AA6215E1AE7215DAD7E4C9A4227BE7FFE611FB26F62796` |
| `package.json` | `9E099B4E5385FC7D3E711CE0EB57A052687AD43EE87542B4A1EB7931470E274B` |
| `apps/api/package.json` | `62286DF382552BF771EECBA10B7E763C0D215BC94D9B6E294E6297D1F2F8C5A8` |
| `packages/database/package.json` | `0F8F31588C7977603EF1D0158EE6655E4DAF74F667D1F711DB1B4693DDF30632` |

Esses hashes foram comprovados no WSL pela saída anterior do usuário; **não foram recalculados em seu worktree** na presente sessão.

## CI/PRs consultados no GitHub, evidência pontual

| PR | Branch da PR | HEAD confirmado em 20/11 | Estado | CI consultada |
|---|---|---|---|---|
| [#701](https://github.com/MarcosVilalva/MEG-Platform/pull/701) | `stage10/android-confirmacao-qa-20261118` | `1b3b256a38712a40600d39f22aada139b95b6b46` | OPEN DRAFT | Seis workflows `SUCCESS`: 44510468424, 44510468161, 44510468162, 44510468208, 44510468259, 44510468284 |
| [#702](https://github.com/MarcosVilalva/MEG-Platform/pull/702) | `stage10/api-identidades-release-20261118` | `19aaa96b508f3d4db2a38ef0866ca5622b377200` | OPEN DRAFT | 44303935939 e 44303935997 `SUCCESS`; 44303935984 `SKIPPED` |
| [#697](https://github.com/MarcosVilalva/MEG-Platform/pull/697) | `stage10/saneamento-qa-descartavel-20261117` | `ef7d1641c99e9fd42c06d0e3f3da8d74e66e09a4` | OPEN DRAFT | 44279891802 `SUCCESS` |
| [#688](https://github.com/MarcosVilalva/MEG-Platform/pull/688) | `stage08/unified-qa-stage05-08-10-20261112` | `d15ae63455a92b1d66b058ee216490464093493b` | OPEN DRAFT | Não consultada |
| [#696](https://github.com/MarcosVilalva/MEG-Platform/pull/696) | `stage10/prism-real-read-optin-20261116` | `5a3f6b81817b7739d0c13f509d93f9898b7b5245` | OPEN DRAFT | Não consultada |

No commit de referência `ac34f799`, seis workflows PR-triggered `SUCCESS`: 44430765997, 44430765994, 44430765979, 44430766057, 44430766082, 44430765988. `get_commit_combined_status` retornou lista vazia para os SHAs consultados, **não** um PASS dos required checks. Workflows mencionados são históricos por commit e não equivalem a aprovação de merge, PR específico 10B nem homologação do clone. Não foi disparado workflow novo.

## Bloqueios técnicos que permanecem

- `MEG_WEBQA_READONLY` exige identidade e socket do WebQA persistente; proibição de acessá-los preservada. Porta 55490 tem validação condicional.
- Imports ESM vêm antes da guarda local, e o módulo `server.ts` executa registros e listener em top-level. Importar dinamicamente o arquivo original não garante segurança.
- `config.ts` carrega `dotenv/config` e valida ambiente top-level. `packages/database/src/index.ts` chama `dotenv.config({path: path.resolve(__dirname, '../.env')})` e instancia Prisma no topo. O alvo do dotenv explícito é o `.env` da **raiz do pacote database**, derivado de `src/index.ts` no source usado pelo `tsx`, não o mesmo alvo do dotenv/config associado ao `cwd`. Não ler o conteúdo de qualquer `.env`.
- `RUN_LEGACY_REPAIR: z.coerce.boolean()` não interpreta a string `false` como segurança; a variante futura deve bloquear manutenções por construção, não por essa variável.
- PT31 analisou 13 externos como nomes/imports, sem homologar side effects externos e fechamento de dependências transitivas.
- API usa Prisma compartilhado; 32 tabelas com RLS habilitado, mas SQL de schema-only sem políticas. Executor comum com grants convencionais permanece sujeito a RLS, e o contrato efetivo de roles/grants/RLS não foi aprovado. Nenhum `BYPASSRLS` ou política inventada.
- HTTP real, egress, isolamento de mounts/processos/FD, runtime `tsx`, criação/limpeza real do clone, dados `TABLE DATA`, RLS operacional e restauração: **pendentes/bloqueados**.

## Próximo passo exato e autorização

1. Revisar documentalmente `MEG-STAGE10B-PT32-MANIFESTO-ESTATICO-CLONE-PROPOSTA-20261120.md`, com entradas `dotenv`, pacotes e dependências por metadados apenas, sem nova varredura PT31.
2. Autorização documental específica concedida: registrar este parecer e o manifesto em branch isolada derivada do `main` remoto conferido, abrir PR Draft, verificar diff e checks, sem merge. A branch 10B local não está no GitHub e `main` divergiu do commit operacional; não fazer merge/reset/cherry-pick automático nem sobrescrever o checkpoint oficial.
3. Com branch autorizada e base reconciliada, adicionar este documento em `docs/` e incluir no arquivo oficial **apenas um apontamento aditivo**, em seção da Etapa 10B. Conferir diff, escopo dos commits e checks realmente produzidos. Não avançar para executor real antes de decisão separada de isolamento e RLS.

### Proibições e decisão final

Nenhuma alteração em Android, dados de produção/Supabase, WebQA persistente, QA 5448, histórico 55489, porta/socket 55490, AGE, dump, banco, API, Node, npm, Prisma Generate, testes repetidos, worktree local, `main`, merge ou deploy. Sem autorização de restore. Este documento registra o histórico técnico e foi preparado exclusivamente para revisão via PR Draft, sem execução operacional.

```text
ETAPA10B=ABERTA
GATE_DDL_DECLARATIVO=PASS_PRESERVADO
PT29_R2_EXECUTOR_SINTETICO=PASS_HISTORICO
PT30_SERVER_LOCAL=PASS_HISTORICO
PT31_R3_12_IMPORTS=PASS_HISTORICO
PT31_77_ARQUIVOS=COLETADO_EXIGE_REVISAO
PT31_EXTERNOS=13_NAO_HOMOLOGADOS
PT32_6_HASHES=PASS_HISTORICO
PT32_PREFLIGHT=COLETADO_EXIGE_REVISAO
GATE_MANIFESTO_CLONE=PROPOSTA_DOCUMENTAL
GATE_IMPORTS_EXTERNOS=PENDENTE
GATE_EXECUTOR_REAL=PENDENTE
GATE_HTTP_REAL=NAO_EXECUTADO
GATE_ROLE_GRANTS_RLS=PENDENTE
GATE_RESTORE=BLOCKED_PROPOSTA_SEM_APROVACAO
GITHUB_REGISTRO=CONFERIR_NA_PR_DRAFT
GITHUB_MAIN_ALTERADA=NAO
```