# MEG Web Evolution — Autoridade Financeira Canônica

Checkpoint técnico da Etapa 1. Este arquivo define quais módulos podem ser tratados como autoridade pela nova Web e quais existem apenas por compatibilidade histórica.

## Autoridades canônicas

| Domínio | Autoridade | Regra |
|---|---|---|
| Política monetária/status | `apps/api/src/modules/finance/financial-policy.ts` | Classificação monetária, benefício, status realizado, Fixo, cartão pendente e decisão de saldo em centavos. |
| Saldo monetário | `apps/api/src/modules/finance/monetary-protection.ts` | Saldos por conta/data, proteção contra saldo insuficiente, transação serializável e duplicidade. |
| Saldo inicial | `apps/api/src/modules/finance/opening-balance.ts` | Evento auditável `OPENING_BALANCE`; campo da conta é fallback temporário de migração. |
| Resumo / fluxo / analytics | `apps/api/src/modules/finance/read-model.ts` | Fonte de leitura da nova Web para summary, cashflow e analytics. |
| Novo lançamento monetário | `apps/api/src/modules/finance/event-mutation.ts` | Writer protegido e idempotente. Benefício não pode passar por ele. |
| Benefício | `apps/api/src/modules/finance/benefit-event-mutation.ts` | Writer exclusivo para conta benefício, saldo e auditoria. |
| Transferência | `apps/api/src/modules/finance/transfer-service.ts` + `transfer-core.ts` | Operação conservativa de duas pernas, com saldo da origem e atomicidade. |
| Pendentes | `apps/api/src/modules/payables/service.ts` + `create-service.ts` | Criação, baixa total/parcial e recorrência. |
| Cartões / compras / faturas | `apps/api/src/modules/cards/service.ts`, `routes.ts`, `card-statement-canonical.ts` | Parcelas, competência, limite, pagamento total/parcial e saldo credor. |
| Baixa em lote | `apps/api/src/modules/finance/pending-batch-settlement.ts` | Writer atômico para seleção de pendências, eventos e faturas. |

## Compatibilidade, não autoridade da nova Web

- `apps/web/src/legacy-financial-accounts.js`: ponte para `financialScope`, `financialAccountId` e Verocard legado.
- `apps/web/src/legacy-finance.js`: cálculo histórico legado; não deve ser consumido por telas novas.
- `apps/api/src/modules/finance/phoenix-preview-read.ts`: leitura de compatibilidade; usa a política monetária canônica, mas não substitui `read-model.ts`.
- `apps/api/src/modules/payables/payment-mutation.ts`: writer alternativo não conectado à rota pública; não é autoridade.
- funções antigas `getFinancialSummary/getFinancialCashflow` em `apps/api/src/modules/finance/service.ts`: não roteadas; não usar.
- `packages/core/src/projections/cashflow.ts` e `packages/core/src/finance/financial-engine.ts`: projeções históricas sem a mesma política canônica da API; não usar na nova Web até eventual reconciliação formal.

## Decisões aprovadas em 06/10/2026

1. `OPENING_BALANCE` é a autoridade definitiva do saldo inicial.
2. Fatura aceita total e parcial (`Outro`). `Mínimo` só existe quando houver valor explícito no domínio/dado da fatura.
3. Edição unitária de parcela preserva as demais e reconcilia o total da compra.
4. Receita e Fixo entram realizados; cartão de crédito permanece pendente até a fatura; benefício segue writer próprio.
5. Crediário não faz parte da nova Web. Parcelamento de compra é cartão de crédito.
6. Capacitor pode ser atualizado somente para correção técnica de segurança, sem liberar mudança funcional/visual no Android.

## Regra para a nova Web

Nenhuma tela, modal, KPI, gráfico ou DataGrid pode recriar regra financeira localmente. A camada Web deve consumir exclusivamente as autoridades acima.
