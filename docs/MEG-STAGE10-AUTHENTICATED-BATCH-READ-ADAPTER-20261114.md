# MEG Finanças Web Evolution | Etapa 10 | Adaptador autenticado de prévia em lote

Data: 14/11/2026. Repositório oficial: `MarcosVilalva/MEG-Platform`.
PR #688 Draft. Branch: `stage08/unified-qa-stage05-08-10-20261112`.

## Autorização e limites

O responsável declarou "SEGUIR" após a definição do próximo passo: implementar e caracterizar um **adaptador server-side autenticado e somente leitura** para alimentar o contrato canônico de prévia, ainda isolado, sem expor endpoint, integrar a Web ou ativar writers.

O responsável já homologou visualmente a barra e o modal da edição em lote, publicados no Render QA, mas isso não autoriza operações reais.

## Implementação

- `apps/api/src/modules/finance/batch-edit-preview-adapter.ts`: função interna `previewBatchCardCycleForActor(actorId, request)`. Recebe `actorId` **do contexto de autenticação confiável do servidor**; não aceita ID do proprietário ou workspace no corpo da operação. Valida seleção, máximo de 200, fontes reconhecidas, IDs únicos e modo de compra.
- Consulta usuário ativo e membro ativo de workspace ativo, privilegiando o workspace próprio como faz `resolveWorkspaceContext`, **sem executar `ensurePrimaryWorkspace`**, que seria potencialmente mutável. VIEWER ativo possui leitura, conforme papéis de leitura já existentes em cartões.
- Lê, numa transação PostgreSQL `RepeatableRead`, somente `CardPurchase`, `CardInstallment` e `CreditCard` com `userId` igual ao proprietário do workspace autorizado. IDs desconhecidos ou de outro proprietário são tratados sem revelar conteúdo do outro escopo.
- Seleciona apenas campos financeiros necessários e converte Decimal para string sem perder centavos; obtém `updatedAt` do banco para comparação de versão, preserva IDs/números/valores/status das parcelas.
- Encaminha snapshots à **única fonte de prévia** `apps/api/src/modules/finance/batch-edit-preview-read.ts`, que chama os cálculos canônicos `cardPurchaseStatementMonth` e `cardStatementDueDate`, verifica cartões, versões, pagamento parcial, alterações de parcelas não suportadas e devolve `canWrite:false`.
- A função não é registrada em rota Fastify, não consulta AppState legado, não cria recibos, audit logs, contas, faturas ou alterações financeiras. O retorno é read-only. Não há leitura de credencial ou sessão dentro do adaptador: a garantia de identidade do ator será responsabilidade obrigatória do futuro handler autenticado.

## Testes

`apps/api/src/modules/finance/batch-edit-preview-adapter.isolated.test.ts` executado exclusivamente em PostgreSQL 17 **descartável** do GitHub Actions com guarda:
- `MEG_STAGE10_ISOLATED_PG=1`
- hostname `localhost` ou `127.0.0.1`
- banco `meg_stage10_sandbox`.

Casos validados: proprietário ativo, VIEWER ativo em workspace compartilhado, usuário sem membership, revogação de membership, usuário bloqueado, cartão de outro proprietário, ID desconhecido, seleção mista com benefício e payable, controle de `updatedAt`, parcela parcialmente paga, vencimentos e competências pela regra canônica, preservação dos IDs/valores das parcelas e **zero alteração persistente** provocada pelas consultas. Somente a montagem da fixture e a revogação em banco descartável escrevem dados, nunca a função adaptadora. Contagens de `AuditLog` e `CloudMutationReceipt` são preservadas pela leitura.

Workflow `.github/workflows/meg-stage10-financial-readonly.yml` recebeu a execução do novo teste e manteve testes já aprovados de atomicidade, concorrência, rollback, idempotência e auditoria do writer no banco isolado. Esses testes não liberam writers na Web.

**Resultados comprovados no commit técnico `e7a07ee83491a2f95148309968dc1faa7de99eae`:**
- [PostgreSQL e API read-only, run #43592296237](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43592296237): **SUCCESS**, incluindo TypeScript da API.
- [QA integrada, run #43592300938](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43592300938): **SUCCESS**, regressões do Prism em 390, 640, 960, 1024, 1366, paisagem e editor wide.

## Riscos e gates pendentes

- **Nenhuma rota HTTP implementada**. Futuro handler deve exigir `app.authorize` para papéis de leitura, obter `actorId` de `request.user.sub`, validar body por Zod, impor limites, rate limit, resposta com códigos seguros e não confiar em IDs de workspace ou propriedade fornecidos pelo browser.
- **Nenhuma integração com o modal QA**, que continua demonstrativo e bloqueia edição financeira. Futura resposta deve tratar bloqueios por registro, refresh de versão antes de qualquer commit e diferenças entre `card-purchase`, `financial-event`, `payable` e `benefit`.
- Leitura de snapshot não reserva versão. Concorrência entre a prévia e escrita exige revalidação transacional no futuro escritor, se e somente se esse escritor for autorizado.
- `Payable` e conversão `FinancialEvent` → compra com cartão permanecem sem contrato canônico de edição coletiva e bloqueados; benefícios e Verocard seguem writer exclusivo, sem converter para cartão de crédito.
- Ainda não há homologação funcional da prévia canônica na Web. A homologação visual anterior continua válida e a UI homologada não foi alterada nesta rodada.
- PR #688 continua Draft, sem merge; **proibido** writer real, PATCH/DELETE, API/banco de produção, Android, deploy produtivo, novo serviço Render, mudança visual ou Etapa 11.
- O workflow legado Stage09 continua com falha preexistente por hash antigo da Home; não adulterar proteção para forçar verde.

## Publicação e continuidade

Nenhum novo deploy Render nesta tarefa, pois código alterado é interno e não utilizado pela UI publicada. A última QA visual homologada continua em:
https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=01e55459aa6fba813984dc047470383c80eb54ec

Próximo passo técnico ainda na Etapa 10: caracterizar cuidadosamente um futuro handler HTTP **somente leitura**, com autenticação e autorização explícitas, schema público estável e redução de informações sensíveis, e então decidir se há autorização para expô-lo na QA. Sem ativar writer ou integração visual automaticamente.

