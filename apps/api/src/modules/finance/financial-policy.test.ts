import assert from 'node:assert/strict';
import {
  countsTowardMonetaryBalance,
  isBenefitFinancialEvent,
  isMonetaryAccountType,
  paymentBalanceDecision,
  resolveCanonicalFinancialStatus,
} from './financial-policy';

assert.equal(resolveCanonicalFinancialStatus({
  type: 'income',
  requestedStatus: 'planned',
}), 'paid', 'Receita deve entrar realizada/paga.');

assert.equal(resolveCanonicalFinancialStatus({
  type: 'expense',
  requestedStatus: 'planned',
  category: { name: 'Fixo', group: 'Moradia' },
}), 'paid', 'Categoria Fixo deve entrar realizada/paga.');

assert.equal(resolveCanonicalFinancialStatus({
  type: 'expense',
  requestedStatus: 'planned',
  category: { name: 'Aluguel', group: 'Fixo' },
}), 'paid', 'Grupo Fixo deve entrar realizado/pago.');

assert.equal(resolveCanonicalFinancialStatus({
  type: 'expense',
  requestedStatus: 'paid',
  category: { name: 'Mercado', group: 'Alimentação' },
  paymentMethod: { name: 'LATAM Pass', type: 'credit' },
}), 'planned', 'Cartão de crédito permanece pendente até a baixa da fatura.');

assert.equal(resolveCanonicalFinancialStatus({
  type: 'expense',
  requestedStatus: 'paid',
  category: { name: 'Fixo', group: 'Fixo' },
  paymentMethod: { name: 'LATAM Pass', type: 'credit' },
}), 'planned', 'Cartão de crédito prevalece sobre Fixo: a compra só realiza no pagamento da fatura.');

assert.equal(resolveCanonicalFinancialStatus({
  type: 'expense',
  requestedStatus: 'paid',
  category: { name: 'Mercado', group: 'Alimentação' },
  paymentMethod: { name: 'PIX', type: 'instant' },
}), 'paid', 'Despesa comum preserva o status solicitado.');

// Caracterização da política aprovada: o writer resolve status de receitas
// e despesas pendentes na API; a Web não deve recalcular estes estados.
// A competência temporal é aplicada pelas leituras/balanços canônicos,
// não por uma inferência da tela sobre o texto "Pago".
assert.equal(countsTowardMonetaryBalance({
  type: 'expense',
  status: resolveCanonicalFinancialStatus({
    type: 'expense',
    requestedStatus: 'planned',
    category: { name: 'Despesa de teste', group: 'Homologação' },
    paymentMethod: { name: 'Boleto de teste', type: 'bill' },
  }),
}), false, 'Despesa pendente/planejada não pode alterar o saldo monetário realizado.');

assert.equal(countsTowardMonetaryBalance({
  type: 'income',
  status: resolveCanonicalFinancialStatus({
    type: 'income',
    requestedStatus: 'planned',
    category: { name: 'Receita de teste', group: 'Homologação' },
  }),
}), true, 'Receita retorna realizada na política central, sem cálculo de status na Web.');

assert.equal(isBenefitFinancialEvent({ account: { type: 'benefit' } }), true);
assert.equal(isMonetaryAccountType('checking'), true);
assert.equal(paymentBalanceDecision(100, 100.01).allowed, false);

console.log('Política financeira canônica validada.');
