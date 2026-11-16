# MEG Finanças Web Evolution | Etapa 10 | Contrato HTTP de prévia financeira em lote

Data: 14/11/2026. Repositório `MarcosVilalva/MEG-Platform`.
PR #688 Draft, branch `stage08/unified-qa-stage05-08-10-20261112`.

## Autorização e escopo

O responsável declarou **"AUTORIZADO"** após o fechamento do adaptador interno autenticado e a indicação do próximo passo: caracterizar rota HTTP de prévia **somente leitura** com JWT, Zod, controles de acesso e respostas seguras, **antes de qualquer exposição na QA**. Esta autorização **não** habilita writer financeiro, conexão com interface, publicação de rota, merge, banco real, Android, deploy produtivo nem Etapa 11.

## Implementado e NÃO registrado

- `apps/api/src/modules/finance/batch-edit-preview-http-contract.ts`: exporta a função `registerStage10BatchPreviewReadContract(app)`. Apenas testes `Fastify.inject` invocam a função. O arquivo `apps/api/src/server.ts` não importa nem registra o módulo, portanto não existe endpoint HTTP ativo na aplicação em execução.
- Caminho **reservado** para eventual registro futuro com prefixo `/finance`: `POST /finance/batch-edit/card-cycle/preview`. POST transporta uma seleção de até 200 itens, mas a operação é estritamente de leitura.
- O guard existente `app.authorize` aplica proteção de **escrita** a qualquer POST. Por isso o contrato de prévia possui verificação JWT e conferência de papel de leitura (ADMIN, MANAGER, OPERATOR e VIEWER), sem invocar writer ou `assertWorkspaceWriteAccess`. O adaptador `previewBatchCardCycleForActor` volta a verificar usuário ACTIVE, membro ACTIVE e workspace ACTIVE no banco, não confiando no papel/identidade vindo do body.
- `actorId` vem exclusivamente de `request.user.sub`, assinado pelo servidor. Qualquer campo extra como `userId`, `actorId`, `dataOwnerId` ou `workspaceId` no corpo é recusado pelo Zod `.strict()`.
- `stage10BatchPreviewBodySchema`: IDs não vazios até 160 caracteres, versões, fonte canônica, seleção entre 1 e 200 sem duplicidade, `purchaseDateMode` em `preserve|common`, data ISO real quando comum, cartão opcional e parâmetro de parcelas ainda não autorizado. Limite do corpo: 64 KiB.
- `stage10BatchPreviewResponseSchema`: resposta canônica `stage10-card-purchase-cycle-readonly-v1`, `canWrite:false` obrigatório; total e contagens coerentes; cada candidato precisa trazer Antes e Depois; registros bloqueados não podem trazer projeções financeiras; campos extras ou resposta inválida provocam erro genérico 503, sem vazamento de conteúdo ou dados internos.
- Controles HTTP: `Cache-Control: no-store`, `Pragma: no-cache`, `Vary: Authorization`, limite por IP 60 requisições por 60 segundos com `InMemoryRateLimiter` existente e resposta 429 com Retry-After. **Observação de produção:** o limiter é em memória por instância, não distribuído; rever a política de limitação antes de qualquer exposição com múltiplas instâncias.
- Erros seguros: 400 para corpo inválido, 401 sem JWT válido, 403 quando não autorizado, 429 excesso, 503 para falha interna genérica. A versão do registro é verificada pelo domínio; prévia jamais reserva versão ou concede permissão de escrita.

## Testes comprovados

Arquivo `apps/api/src/modules/finance/batch-edit-preview-http-contract.test.ts` usa Fastify real com JWT sintético e `Fastify.inject`, serviço de prévia injetado, sem banco real ou HTTP público. Verifica autenticação ausente/inválida, papel proibido, conta sem permissão, parâmetros extras, duplicidade, datas/versionamento inválidos, 200 itens, payload grande, bloqueio de informações internas do servidor na resposta, estrutura `canWrite:false`, ausência de registro no `server.ts`, limite por IP e GET indisponível.

O workflow `.github/workflows/meg-stage10-financial-readonly.yml` inclui o teste do contrato HTTP e mantém PostgreSQL 17 descartável exclusivamente local do runner (`MEG_STAGE10_ISOLATED_PG=1`, `meg_stage10_sandbox`), caracterização de cartão/benefício, rollback/concorrência/idempotência/auditoria e `tsc --noEmit`.

Evidências da versão técnica `00ee181968a8cf1799351902c16a52439da138a7`:
- [GitHub Actions financeiro #43593729676](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43593729676): **SUCCESS**, com `MEG_STAGE10_HTTP_PREVIEW_AUTH_ZOD_RATE_READONLY PASS`, adaptador em PostgreSQL descartável e TypeScript da API.
- [GitHub Actions QA integrada #43593732640](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43593732640): **SUCCESS**, preservando testes de navegador das telas homologadas.

## Arquivos técnicos

Criados:
- `apps/api/src/modules/finance/batch-edit-preview-http-contract.ts`
- `apps/api/src/modules/finance/batch-edit-preview-http-contract.test.ts`

Alterado:
- `.github/workflows/meg-stage10-financial-readonly.yml`

Commits desta rodada:
- `0a76205ab41f1ec94a27ce9520aac605a299bfa3` (módulo inicial)
- `e1d07e879d1e9e530b765e0044f86944c03ae835` (testes e CI)
- `c3ef3070c8800f8bc0ee39c0b2e9791ad1b8deca` e `65727e942498daee4f5a261a974c4fa542551616` (tipagem de fixtures)
- `00ee181968a8cf1799351902c16a52439da138a7` (validação estrita de resposta)

## Aprovações, divergências e próxima ação

Aparência de Nova Despesa, Editar Despesa, menu Ações e modal Editar em lote permanece homologada visualmente. O contrato HTTP foi validado tecnicamente, **não visualmente, não funcionalmente na Web e não publicado**. A prévia financeira real no modal, conversão FinancialEvent → cartão, edição de vencimento de Payable e escritores reais continuam bloqueados. Verocard/Alimentação seguem autoridade exclusiva de benefício.

O gate legado Stage09 tem falha pré-existente de hash da Home, independente desta mudança; não adulterar nem desativar o guard. PR #688 continua Draft, sem merge na main. Nenhum novo serviço Render foi criado e nenhum deploy adicional foi necessário.

**QA visual preservada, link sem cache**:
https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=01e55459aa6fba813984dc047470383c80eb54ec

**Próximo passo exato:** revisão de segurança do plano de exposição QA do endpoint read-only (autenticação real, política de rate limiting em eventual multi-instância, contrato de dados mínimos e política de deploy da API isolada); obter autorização específica antes de registrar/publicar rota ou integrar o modal homologado. Escrita financeira real continua estritamente proibida sem novo gate.
