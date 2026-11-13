# MEG Web Evolution — Etapa 10 | Editar Lançamento: prontidão e bloqueios

Data: 12/11/2026. Escopo exclusivo da Etapa 10. Status: **prévia QA isolada, sem homologação visual do Editar e SEM writer habilitado**.

## Fontes verificadas

1. `MEG-WEB-CONTINUIDADE-OFICIAL.md` na branch `stage08/unified-qa-stage05-08-10-20261112`.
2. `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`, autoridade financeira canônica.
3. `docs/MEG-WEB-STAGE10-AUDITORIA-20261112.md` e `scripts/meg-stage10-write-contract-characterization.test.ts`, PR #675 Draft, **apenas regra/risco**, não padrão visual.
4. `apps/api/src/modules/finance/service.ts` (`updateFinancialEvent`), `financial-policy.ts`, `event-mutation.ts`, serviços de cartões/benefícios e `read-model.ts`.
5. Nova Despesa visualmente homologada da PR #678, incorporada à PR #688 Draft, com layout MEG Prism 2.0; seletor fotográfico aprovado em `89522ed5364383341be3bb99e0597ec99264855a`.

## Matriz de prontidão antes de editar dados reais

| Origem/domínio | Autoridade | Situação de edição |
| --- | --- | --- |
| `FinancialEvent` monetário genérico | `finance/service.ts:updateFinancialEvent` | **Bloqueado** até caracterizar transação, versão/idempotência, saldo e reclassificação de status. PATCH atual não oferece a mesma proteção da criação. |
| Compra com cartão, parcelas/fatura | `cards/service.ts`, `cards/routes.ts`, `card-statement-canonical.ts` | **Bloqueado** na prévia. Edição unitária não implica autorização de lote ou alteração de parcela paga/parcial. |
| Conta Benefício / Alimentação / Verocard | `benefit-event-mutation.ts` | **Bloqueado** na prévia. Não migrar para conta monetária, cartão de crédito ou writer genérico. |
| Pendência com baixa parcial/total | `payables/service.ts` | **Bloqueado** até teste transacional e origem de status. |
| Evento vinculado a domínio/recibo | Guarda `FINANCIAL_EVENT_LINKED_DOMAIN` | **Bloqueado** para edição genérica, não mascarar o vínculo. |
| Arquivamento/exclusão | `finance/routes.ts` + `finance/service.ts` | **Bloqueado**; depende de papéis, vínculos e confirmação. |

## Prévia de Editar Despesa

- Novo componente `apps/web/src/meg-web-evolution/stage10/EditExpensePreview.tsx`, CSS **exclusivo da edição** `EditExpensePreview.css`. Importa a folha existente `ExpenseForm.css` para manter a **mesma composição de três colunas da Nova Despesa aprovada**. Não modifica `ExpenseForm.tsx` nem seus estilos.
- Snapshot demonstrativo `QA_EDIT_EXPENSE_SNAPSHOT` explicitamente `source: financial-event`, `financialScope: monetary`, `type: expense`. As informações financeiras (valor, status, conta, categoria, data e método) são **somente leitura do registro fictício**, sem cálculos de saldo/status/fatura no navegador.
- Descrição e Observações podem ser digitadas em memória, com normalização de texto livre em MAIÚSCULAS. **Não são gravadas** e não representam permissão operacional já concedida pelo backend.
- Botão `Salvar alterações` permanentemente desabilitado. Nenhum `onSave`, `fetch`, POST, PATCH, DELETE, mutação ou integração financeira. Não há exclusão, confirmação de pagamento nem movimentação de cartão/benefício.
- Acesso **somente no preview QA unificado** via `meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=editar`. Não modifica ações da tabela homologada, nem introduz edição na aplicação real.
- A prévia **não está homologada visualmente**. Aprovações da Nova Despesa e do seletor continuam preservadas sem transferência automática de aceite ao Editar.

## Gates antes de converter prévia em funcionalidade real

1. Identificação autoritativa da origem e do tipo do registro no read-model, sem inferência por texto.
2. Testes de caracterização em PostgreSQL **descartável** para edição genérica, saldo, concorrência, versão/idempotência, rollback e efeito no ledger.
3. Testes específicos de cartões, parcelas, vencimentos, fatura, estornos e benefícios; edição unitária ou em massa somente por autoridade própria.
4. Contratos de autocomplete com IDs canônicos; proibição de copiar valor/data automaticamente; histórico legado sem ID deve permanecer sem vínculo automático.
5. Status, competência, fatura, total, saldo e rateios sempre produzidos pela camada financeira canônica, nunca pela tela.
6. Permissões/roles e vínculos em edição/arquivamento; política de Alimentação `Conta Benefício + Verocard + Pago` preservada.
7. CI técnico verde, Playwright responsivo e **homologação visual explícita**, em seguida autorização separada para integração de writes. Nenhum deploy produtivo ou merge no momento.

## Restrições

Preservar Android congelado, API, banco real, produção, Home, Lançamentos, Shell, DataGrid, Loading, Login, Cadastro, Recuperação, Nova Despesa e seletor fotográfico Prism homologados. Reutilizar QA rotativa `meg-stage08-alerta-prism-pr685`; não criar novos serviços Render, não excluir ambientes históricos sem auditoria/autorização. PR #688 permanece Draft.

**Próximo passo:** concluir CI isolado, publicar no mesmo Render QA somente após verde, disponibilizar link sem cache de `modal=editar` e solicitar homologação visual da nova prévia. Continuar contratos transacionais antes de habilitar edição real.
