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
- Teste público pós-deploy `43587853875`: reexecução iniciada após LIVE, conclusão deve ser registrada somente depois de confirmada.
- Gate legado Stage09 `43588097006` continua **FAILURE** em comparação fixa do hash antigo de `HomeDashboard.tsx`. Falha já verificada antes deste incremento; não alterar hashes/guard para forçar resultado verde.
- Nenhum PATCH/DELETE, banco real, API de produção, Android, merge, deploy produtivo, criação de novo serviço Render ou Etapa 11.
- Não homologado visualmente: novo posicionamento do botão e modal ampliado. Não considerar verde técnico como aceite visual.

## Próximo passo exato

Confirmar smoke público após deploy; fornecer link sem cache; usuário conferir no desktop e Poco C75 (vertical/paisagem) a posição de `Editar em lote`, ordenação compacta, todos os campos, bloqueios, prévia Antes → Depois, rolagem e fechamento. Registrar homologação específica. Depois disso, seguir na Etapa 10 com contrato read-only financeiro e testes PostgreSQL descartáveis antes de solicitar autorização separada para qualquer writer. Nova Receita permanece futura dentro da Etapa 10.
