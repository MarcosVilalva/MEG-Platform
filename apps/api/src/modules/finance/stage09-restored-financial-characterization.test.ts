/**
 * Etapa 09 | Caracterizacao OFFLINE das regras em torno da restauracao de public.
 *
 * Todos os dados abaixo sao FICTICIOS. Nao importa Prisma, nao conecta a
 * PostgreSQL/Supabase, nao invoca os writers e nao recalcula valores reais.
 * Os asserts descrevem o comportamento atual. Nao sao homologacao de producao.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  legacyTransactionToFinancialEvent,
  financialEventToLegacyTransaction,
} from '../app-state/normalization-migration-core';
import {
  countsTowardMonetaryBalance,
  isBenefitFinancialEvent,
  paymentBalanceDecision,
  resolveCanonicalFinancialStatus,
  summarizeMonetaryEvents,
} from './financial-policy';
import { financialAmountValues } from './amount-sign';
import { createFinancialEventSchema } from './schemas';
import {
  buildCanonicalCardStatement,
  cardStatementEffectFromSignedAmount,
  cardInstallmentRemaining,
} from './card-statement-canonical';
import { buildTransferLegs } from './transfer-core';
import { addMonthsClamped, isFuturePaymentDay } from '../payables/core';

const context = { workspaceId: 'offline-workspace', userId: 'synthetic-user', revision: 1 };

// 1. Um estorno legado de despesa tem valor de entrada negativo, MAS
// signedAmount positivo. Nao "consertar" esse sinal por inspecao de dados.
const syntheticRefund = {
  id: 'synthetic-refund-001',
  date: '2026-09-15',
  description: 'Estorno ficticio',
  type: 'expense',
  status: 'paid',
  expenseAmount: 62,
  amount: -62,
  financialAccountId: 'account-01',
};
const refund = legacyTransactionToFinancialEvent(syntheticRefund, context);
assert.ok(refund);
assert.equal(refund.type, 'expense');
assert.equal(refund.amount, 62);
assert.equal(refund.signedAmount, 62);
assert.equal(refund.status, 'paid');
assert.equal(refund.legacyTransactionId, 'synthetic-refund-001');
assert.deepEqual(financialEventToLegacyTransaction(refund), syntheticRefund);
assert.deepEqual(financialAmountValues('expense', -62), { amount: 62, signedAmount: 62 });
assert.equal(countsTowardMonetaryBalance(refund), true);

// 2. A normalizacao legada preserva fracoes subcentavo; a politica publica
// arredonda o resultado agregado, nao necessariamente cada evento. Esta
// caracterizacao NAO aprova a precisao de todos os writers/servicos da API.
const tinyExpense = legacyTransactionToFinancialEvent({
  id: 'synthetic-tiny-expense',
  date: '2026-09-16',
  description: 'Despesa ficticia com mais de duas casas',
  type: 'expense',
  status: 'paid',
  expenseAmount: 19.00000002,
  financialAccountId: 'account-01',
}, context);
assert.ok(tinyExpense);
assert.equal(tinyExpense.amount, 19.00000002);
assert.equal(tinyExpense.signedAmount, -19.00000002);
const microRefund = legacyTransactionToFinancialEvent({
  id: 'synthetic-micro-refund',
  date: '2026-09-17',
  description: 'Estorno ficticio fracionario',
  type: 'expense',
  status: 'paid',
  amount: -2.0004,
  expenseAmount: 2.0004,
  financialAccountId: 'account-01',
}, context);
assert.ok(microRefund);
assert.equal(microRefund.signedAmount, 2.0004);
const sampleSummary = summarizeMonetaryEvents([
  { type: 'income', status: 'paid', signedAmount: 100, account: { type: 'checking' } },
  tinyExpense,
  microRefund,
]);
assert.equal(sampleSummary.realizedIncome, 100);
assert.equal(sampleSummary.realizedExpense, 17);
assert.equal(sampleSummary.realizedResult, 83);
assert.equal(sampleSummary.eventCount, 3);

// Diferenca OBSERVAVEL entre somar antes de arredondar e arredondar por evento.
// Registrar a diferenca; jamais usar estes numeros para corrigir dados reais.
const tinySum = summarizeMonetaryEvents([
  { type: 'expense', status: 'paid', signedAmount: -0.004 },
  { type: 'expense', status: 'paid', signedAmount: -0.004 },
]);
assert.equal(tinySum.realizedExpense, 0.01);
assert.notEqual(tinySum.realizedExpense, Math.round(0.004 * 100) / 100 * 2);

// 3. Beneficio/Verocard nao entra no caixa monetario, mesmo realizado.
const benefit = {
  type: 'expense',
  status: 'paid',
  signedAmount: -27.00000002,
  account: { type: 'benefit' },
  paymentMethod: { name: 'VEROCARD' },
};
assert.equal(isBenefitFinancialEvent(benefit), true);
assert.equal(countsTowardMonetaryBalance(benefit), false);
assert.equal(summarizeMonetaryEvents([benefit]).eventCount, 0);
assert.equal(resolveCanonicalFinancialStatus({
  type: 'expense',
  requestedStatus: 'paid',
  paymentMethod: { type: 'credit' },
}), 'planned');
assert.equal(resolveCanonicalFinancialStatus({
  type: 'income',
  requestedStatus: 'planned',
}), 'paid');

// 4. Competencia explicita pode diferir da data. A schema aceita o campo;
// o writer existente o prioriza. Isto nao prova legitimidade dos 5 casos reais.
const customCompetence = createFinancialEventSchema.safeParse({
  description: 'Receita de competencia anterior, ficticia',
  type: 'income',
  status: 'paid',
  date: '2026-10-02',
  competence: '2026-09',
  amount: 25,
});
assert.equal(customCompetence.success, true);
const writerCode = readFileSync(new URL('./event-mutation.ts', import.meta.url), 'utf8');
assert.match(writerCode, /competence:\s*input\.competence\s*\|\|\s*input\.date\.slice\(0,\s*7\)/);

// 5. Fatura canonica recebe credito assinado positivo como efeito negativo
// e identifica a competencia quando o evento e originado nesse dominio.
assert.equal(cardStatementEffectFromSignedAmount(62), -62);
const statement = buildCanonicalCardStatement({
  month: '2026-09',
  closingDay: 8,
  dueDay: 16,
  aliases: ['CARTAO TESTE'],
  purchases: [],
  events: [{
    id: 'synthetic-card-credit',
    description: 'Estorno ficticio de cartao',
    type: 'expense',
    status: 'paid',
    date: '2026-10-02',
    competence: '2026-09',
    signedAmount: 62,
    sourcePayload: { paymentMethod: 'CARTAO TESTE', modality: 'CREDITO' },
  }],
});
assert.equal(statement.credits, 62);
assert.equal(statement.netAmount, -62);
// O credito ja PAGO compoe o historico, mas nao e credito ABERTO de fatura.
assert.equal(statement.creditBalance, 0);
assert.equal(statement.payableAmount, 0);
const openCreditStatement = buildCanonicalCardStatement({
  month: '2026-09',
  closingDay: 8,
  dueDay: 16,
  aliases: ['CARTAO TESTE'],
  purchases: [],
  events: [{
    id: 'synthetic-card-credit-open',
    description: 'Credito ficticio de fatura pendente',
    type: 'expense',
    status: 'planned',
    date: '2026-10-02',
    competence: '2026-09',
    signedAmount: 62,
    sourcePayload: { paymentMethod: 'CARTAO TESTE', modality: 'CREDITO' },
  }],
});
assert.equal(openCreditStatement.credits, 62);
assert.equal(openCreditStatement.creditBalance, 62);
assert.equal(openCreditStatement.payableAmount, 0);
assert.equal(cardInstallmentRemaining({ amount: 100, partialPaidAmount: 25, status: 'open' }), 75);
assert.equal(cardInstallmentRemaining({ amount: 100, partialPaidAmount: 25, status: 'paid' }), 0);

// 6. Transferencia, mesmo com fracao informada, cria duas pernas simetricas,
// conserva valor, e nao admite duplicidade de conta ou quantia arredondada zero.
const [source, destination] = buildTransferLegs({
  transferId: 'synthetic-transfer-stage09',
  sourceAccountId: 'account-01',
  destinationAccountId: 'account-02',
  amount: 10.004,
  date: '2026-09-20',
  status: 'paid',
});
assert.equal(source.amount, 10);
assert.equal(source.signedAmount, -10);
assert.equal(destination.signedAmount, 10);
assert.equal(source.signedAmount + destination.signedAmount, 0);
assert.equal(source.sourcePayload.counterpartyAccountId, destination.accountId);
assert.equal(destination.sourcePayload.counterpartyAccountId, source.accountId);
assert.throws(() => buildTransferLegs({
  transferId: 'synthetic-transfer-duplicate',
  sourceAccountId: 'account-01',
  destinationAccountId: 'account-01',
  amount: 10,
  date: '2026-09-20',
}), /TRANSFER_ACCOUNTS_MUST_DIFFER/);
assert.throws(() => buildTransferLegs({
  transferId: 'synthetic-transfer-zero',
  sourceAccountId: 'account-01',
  destinationAccountId: 'account-02',
  amount: 0.004,
  date: '2026-09-20',
}), /INVALID_TRANSFER_AMOUNT/);

// 7. Baixa deve comparar em centavos e calendario deve respeitar fim de mes.
assert.deepEqual(paymentBalanceDecision(50.01, 50.02), {
  allowed: false, available: 50.01, requested: 50.02, missing: 0.01,
});
assert.equal(paymentBalanceDecision(50, 50).allowed, true);
assert.equal(addMonthsClamped('2026-01-31', 1, 31), '2026-02-28');
assert.equal(isFuturePaymentDay('2026-10-02', '2026-10-01'), true);

// 8. As protecoes de transacao/idempotencia dos writers permanecem verificadas
// pelos contract tests existentes; este teste NAO abre conexao para exerci-las.
console.log('Stage09 OFFLINE canonical financial characterization: PASS (synthetic only)');
