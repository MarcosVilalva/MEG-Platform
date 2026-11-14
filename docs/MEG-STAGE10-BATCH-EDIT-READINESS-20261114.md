# MEG Finanças Web Evolution | Etapa 10 | Edição em lote, prontidão

Data: 14/11/2026. Repositório `MarcosVilalva/MEG-Platform`. PR #688 (Draft), branch `stage08/unified-qa-stage05-08-10-20261112`.

## Decisão autorizada

O responsável autorizou a proposta integral de evolução de edição em lote, em três entregas encadeadas:
1. reposicionar `Editar em lote` na barra do DataGrid, substituir o seletor amplo de `Ordenar por`, mantendo ordenação acessível no celular;
2. expandir campos de edição e prévia por registro, incluindo vencimento, forma de pagamento, cartão, data da compra e parcelas, preservando cálculos no domínio canônico;
3. caracterizar contratos financeiros e, **apenas mediante homologação visual e autorização específica de writer**, integrar operações seguras.

Esta autorização não homologa visualmente as mudanças pós-deploy nem autoriza writers no ambiente real.

## Entrega demonstrativa concluída na branch

Código técnico publicado no Render QA: `01e55459aa6fba813984dc047470383c80eb54ec`.

- `apps/web/src/meg-web-evolution/datagrid/types.ts` e `DataGrid.tsx`: propriedade opcional `toolbarAction` para ação contextual sem refazer seleção e sem alterar os consumidores que não ativam o novo slot.
- `apps/web/src/meg-web-evolution/launches/LaunchesStage09.tsx`: botão `Editar em lote (N)` saiu do hero e passou ao slot do DataGrid, com a mesma seleção existente. A Home, Nova Despesa e a versão não opt-in de Lançamentos não foram redesenhadas.
- `apps/web/src/meg-web-evolution/stage10/BatchEditQa.tsx` e `BatchEditQa.css`: modal Prism 2.0 de campos opt-in com Descrição, Observações (substituir/acrescentar), Categoria, Vencimento, Forma de pagamento, Conta, Cartão + Data da compra e Quantidade de parcelas. Prévia por registro Antes → Depois, motivos de bloqueio e resumo dos tipos selecionados.
- `apps/web/src/meg-web-evolution/integrated-qa/unified-preview.tsx`: fornece somente catálogo da fixture QA, sem dados reais ou acesso à API financeira.
- `apps/web/src/meg-web-evolution/stage10/LaunchActionsQa.tsx`: menu unitário homologado preservado, editor antigo de lote substituído por módulo próprio.
- `scripts/meg-stage08-unified-qa.browser.mjs`: cobertura de seleção 1/11, modal, operações bloqueadas, cartão, cancelamento, ausência de writes e responsividade.
- `scripts/meg-stage10-batch-card-readonly.contract.test.ts` e workflow `.github/workflows/meg-stage08-unified-qa.yml`: caracterização somente leitura de vencimento da fatura, competência e guardas dos writers. **Não é teste transacional PostgreSQL nem habilitação de endpoint.**

## Regras comprovadas e limites

- `apps/api/src/modules/cards/service.ts`: competência da primeira parcela depende da data da compra e dia de fechamento. `apps/api/src/modules/finance/card-statement-canonical.ts` contém a regra canônica de vencimento, inclusive ajuste para dia útil.
- `apps/api/src/modules/cards/routes.ts`: PATCH de compra unitária contém bloqueio para parcela paga/parcial `CARD_PURCHASE_PAYMENT_EXISTS` e atualiza competência sob writer próprio. Isso **não** equivale a edição financeira coletiva segura ou permissão para converter FinancialEvent monetário em compra de cartão.
- `apps/api/src/modules/finance/service.ts:updateFinancialEvent`: possui transação de atualização de FinancialEvent e guarda `FINANCIAL_EVENT_LINKED_DOMAIN`, mas carece de caracterização suficiente de concorrência, proteção monetária, versão/idempotência, lote/rollback e efeito em outros domínios para uso na nova Web.
- `apps/api/src/modules/finance/benefit-event-mutation.ts`: autoridade exclusiva para benefício. Alimentação continua Conta Benefício + Verocard + Pago. Verocard não é cartão de crédito.
- Vencimento de despesa pendente exige vínculo real com `Payable` ou origem equivalente; a data exibida na grade pode ser a data do evento, não o vencimento. Não inferir identidade de origem por descrição.
- Cartões na QA mostram dia de fechamento e dia de vencimento configurados. **Não** calculam competência, data efetiva ou parcelas no navegador: aguardam um contrato de prévia canônica do servidor.
- Campos financeiros do lote ficam marcados **Protegidos**. Mesmo com seleção válida, o botão Simular não executa nem simula persistência financeira. Descrição/Observações/Categoria somente geram prévia local visual, sem escritor real.

## Proposta de contrato read-only futuro (não implementado)

Request: seleção com `id`, tipo de origem canônico, versão e contexto de workspace; campos marcados; método/cartão/conta por IDs canônicos; datas de vencimento/compra e política explícita para aplicar data comum ou preservar datas de compra existentes.

Response por registro: autorização/ligação de origem, `eligible`, motivos de bloqueio, Antes/Depois completo, fatura/competência/vencimento calculados pelo backend, vínculos afetados, saldos protegidos e riscos de parcela paga, além de resumo de elegíveis e impedidos. Sem alteração nem criação de lançamento no endpoint de prévia.

Writer futuro somente após testes de serialização, idempotência, rollback integral, auditoria, atomicidade de lote e concorrência; retorno de resultado por registro, sem mudanças parciais silenciosas. Contratos de cartão/benefício/pagamento continuam separados e têm prioridade sobre a interface.

## Gates e restrições

- CI integrado `43587853904`: **SUCCESS**, inclui caracterização canônica e Chrome com 390, 640, 960, 1024 e 1366 px; testes de regressão de Prism, Poco C75 paisagem e Editar Despesa.
- Render QA reutilizado: `meg-stage08-alerta-prism-pr685`, serviço `srv-dbr00b56e07s738n62n0`, workspace `tea-d98k1qhkh4rs73f4sfj0`, Auto Deploy OFF; deploy `dep-dbs3vijbc2fs73aggcn0` em `01e55459aa6fba813984dc047470383c80eb54ec`, LIVE.
- Teste público pós-deploy `43587853875`: **SUCCESS**, reexecução (attempt 2, job `132427119393`) após Render LIVE; logs `MEG_STAGE10_QA_ACTIONS` PASS em 390, 640, 960, 1024 e 1366px, além de `MEG_PRISM_COMPACT_LANDSCAPE` e `MEG_EDIT_PRISM_WIDE`. A falha inicial ocorreu contra Render antigo antes do deploy.
- Gate legado Stage09 `43588097006` continua **FAILURE** em comparação fixa do hash antigo de `HomeDashboard.tsx`. Falha já verificada antes deste incremento; não alterar hashes/guard para forçar resultado verde.
- Nenhum PATCH/DELETE, banco real, API de produção, Android, merge, deploy produtivo, criação de novo serviço Render ou Etapa 11.
- Não homologado visualmente: novo posicionamento do botão e modal ampliado. Não considerar verde técnico como aceite visual.

## Próximo passo exato

Confirmar smoke público após deploy; fornecer link sem cache; usuário conferir no desktop e Poco C75 (vertical/paisagem) a posição de `Editar em lote`, ordenação compacta, todos os campos, bloqueios, prévia Antes → Depois, rolagem e fechamento. Registrar homologação específica. Depois disso, seguir na Etapa 10 com contrato read-only financeiro e testes PostgreSQL descartáveis antes de solicitar autorização separada para qualquer writer. Nova Receita permanece futura dentro da Etapa 10.


## Atualização pós-homologação: contrato canônico e PostgreSQL isolado (14/11/2026)

**Aprovação visual expressa:** usuário confirmou "validado, pode segui para o proximo passo" após o modal expandido. Ficam homologados o botão Editar em lote na barra da grade, a ordenação compacta no celular e o modal visual. A aprovação não habilita escritores, deploy produtivo ou merge.

**Descoberta decisiva:** a branch já continha `apps/api/src/modules/finance/batch-edit-preview-read.ts` e `batch-edit-preview-read.test.ts`, além do workflow `.github/workflows/meg-stage10-financial-readonly.yml`. Esta é a **única** implementação de prévia financeira Stage10 mantida. A implementação experimental paralela `stage10-batch-read-preview.ts` e seu teste foram retirados no commit `0ed5dbed1ee94fd46bd4df7c2dbe7d87fb8747f8`, para não duplicar a autoridade canônica. Os testes existentes receberam cenários adicionais de seleção mista, falta de proprietário, quantidade acima do limite e dia inválido.

**Contrato read-only já implementado, mas NÃO exposto na Web:** `previewBatchCardCycle` recebe snapshots do domínio confiável (compras, cartões, `dataOwnerId`, versões) e devolve, por registro, `before`, `after`, competência de fatura e vencimento calculado por `cardPurchaseStatementMonth` e `cardStatementDueDate`. Bloqueia origens sem suporte, benefício/Verocard, dívida de outras fontes, parcela paga/parcialmente paga, compra inativa, versão desatualizada, cartão de outro proprietário ou inativo, entradas incompletas, datas inválidas e alteração não suportada de número de parcelas. A resposta marca `canWrite:false`; não autentica por si só, não consulta o banco e não é endpoint. Apenas futura camada backend autenticada poderá adquirir snapshots. Nenhuma alteração visual foi feita após a homologação.

**Testes de banco descar­tável:** o workflow Stage10 já existente usa serviço PostgreSQL 17 efêmero, `DATABASE_URL` exclusivamente `127.0.0.1:5432/meg_stage10_sandbox`, variável de guarda `MEG_STAGE10_ISOLATED_PG=1`, `prisma db push` apenas dentro desse runner, e executa teste de caracterização com transações reais exclusivamente fictícias: atomicidade, rejeição de lote vinculado, rollback, versões concorrentes, idempotência/recibo e auditoria, além de criação parcelada de cartão. Não há conexão, importação, migração ou escrita em banco real. Esse teste **não** autoriza ligar o writer da Web.

**Pendências para integração real:** um adaptador de leitura autenticado com verificação de workspace e versão ainda não está publicado; prévia visual não consome resposta canônica da API; conversão FinancialEvent → compra de cartão e vencimento de Payable exigem contratos próprios; revalidação no instante do commit, idempotência e efeitos sobre saldos/limites/faturas precisam respeitar o domínio. A operação financeira coletiva real e a alteração de número de parcelas permanecem bloqueadas. O writer de eventos em lote já existente NÃO deve ser ligado sem autorização específica.

**Referências:** CI da caracterização anterior em Postgres descartável `43590703441` **SUCCESS**. Novo commit consolidado `0ed5dbed1ee94fd46bd4df7c2dbe7d87fb8747f8` está submetido aos gates. Registrar conclusão exata desses gates no checkpoint, sem antecipar resultado.


## 14/11/2026 | Pós-homologação visual: prévia canônica, Postgres isolado

- **Homologação visual:** o responsável declarou "validado, pode segui para o proximo passo" após avaliar a nova barra com Editar em lote e o modal expandido Prism. Visual homologado somente no QA `01e55459aa6fba813984dc047470383c80eb54ec`; não é autorização para writer real.
- **Autoridade consolidada:** `apps/api/src/modules/cards/purchase-cycle-canonical.ts` centraliza competência e distribuição de centavos, reutilizada em `cards/service.ts` (criação) e `cards/routes.ts` (PATCH de compra). Vencimento via `finance/card-statement-canonical.ts:cardStatementDueDate`. Preservado `firstStatementMonth` da auditoria.
- **Prévia interna, não exposta:** `apps/api/src/modules/finance/batch-edit-preview-read.ts` e testes correspondentes recebem snapshots do domínio (a serem fornecidos exclusivamente pelo futuro leitor autenticado), verificam origem, data, proprietário, versão, cartão ativo, pagamentos e integridade de parcelas. Em uma compra existente preservam IDs e quantias originais por parcela; projetam apenas competência/vencimento do cartão alvo. Todo retorno tem `canWrite:false`. Não foram criadas rotas nem chamadas de produção.
- **Duplicidade detectada e resolvida:** um commit paralelo criou `stage10-batch-read-preview.ts`, que projetava valores das parcelas a partir do total. Isto divergia da edição individual, que pode ter parcelas com valores específicos. O commit `0ed5dbed1ee94fd46bd4df7c2dbe7d87fb8747f8` removeu o módulo duplicado, fortaleceu os testes do contrato principal e preservou a semântica das parcelas registradas.
- **PostgreSQL real, porém efêmero:** `.github/workflows/meg-stage10-financial-readonly.yml` executa no serviço temporário `postgres:17` do GitHub Actions, URL estritamente local `127.0.0.1/meg_stage10_sandbox`, com `MEG_STAGE10_ISOLATED_PG=1`. O e2e `stage10-batch-isolated.e2e.test.ts` comprovou, no banco fictício, rollback de lote parcialmente inválido, versão obsoleta, concorrência serializável, idempotência/replay, recibos e auditoria, além de compra com parcelas e centavos na criação canônica. Nenhum banco real do MEG foi consultado.
- **Resultados confirmados na branch consolidada:** PostgreSQL e TypeScript [run 43591030695](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43591030695) **SUCCESS**. QA integrada Chrome e caracterização [run 43591035954](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43591035954) **SUCCESS**. O workflow de Chrome manteve os mesmos testes e passou a instalar Playwright em prefixo temporário para não re-resolver dependências transitivas do repositório. Teste público da versão do branch pode ocorrer sem novo deploy, mas isso não representa publicação da nova API.
- **Nenhum deploy nesta rodada:** Render QA permanece no deploy `dep-dbs3vijbc2fs73aggcn0`, versão visual previamente homologada. PR #688 permanece Draft e sem merge. Não alterados Android, banco/API de produção, writers públicos, Etapa 11 ou interfaces aprovadas. O gate histórico Stage09 do hash antigo da Home permanece como pendência separada.
- **Próximo passo exato:** construir adaptador de leitura **autenticado e com escopo de workspace** para fornecer snapshots autoritativos à prévia, incluindo links de origem, versões de registro e validação de cartão, ainda em branch isolada e sem endpoint produtivo; caracterizar os resultados antes de propor conexão à interface. Escritores reais seguem sem autorização.

