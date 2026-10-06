import assert from 'node:assert/strict';
import {
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

assert.equal(isBenefitFinancialEvent({ account: { type: 'benefit' } }), true);
assert.equal(isMonetaryAccountType('checking'), true);
assert.equal(paymentBalanceDecision(100, 100.01).allowed, false);

console.log('Política financeira canônica validada.');
