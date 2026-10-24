import assert from 'node:assert/strict';
import { test } from 'node:test';
import { basicLaunchInput, eligibleAccount, eligibleCategory, eligiblePaymentMethod, parsePositiveBRL, validISODate, autocompleteFromHistory, formatLaunchDateBR } from './new-launch';
import type { Account, Category, PaymentMethod } from '../../app/finance-client';

const accounts = [
  { id: 'checking', name: 'Conta principal', type: 'checking', isActive: true, openingBalance: '0' },
  { id: 'benefit', name: 'Benefício', type: 'benefit', isActive: true, openingBalance: '0' },
] satisfies Account[];
const categories = [
  { id: 'salary', name: 'Salário', type: 'income', isActive: true },
  { id: 'market', name: 'Mercado', type: 'expense', isActive: true },
  { id: 'fixed', name: 'Habitação', group: 'Fixo', type: 'expense', isActive: true },
] satisfies Category[];
const methods = [
  { id: 'pix', name: 'PIX', type: 'instant', isActive: true },
  { id: 'card', name: 'Cartão', type: 'credit', isActive: true },
  { id: 'verocard', name: 'Verocard', type: 'other', isActive: true },
] satisfies PaymentMethod[];

test('máscara brasileira converte centavos sem aceitar negativo, notação americana ou centavos extras', () => {
  assert.equal(parsePositiveBRL('1.234,50'), 1234.5);
  assert.equal(parsePositiveBRL('0,01'), .01);
  assert.equal(parsePositiveBRL('2'), 2);
  for (const v of ['-5,00', '0', '1.234.56', '1,234', '1e4', '100,001', '']) assert.equal(parsePositiveBRL(v), null);
});

test('validação do dia evita datas impossíveis', () => {
  assert.equal(validISODate('2026-02-28'), true);
  assert.equal(validISODate('2026-02-29'), false);
  assert.equal(validISODate('2024-02-29'), true);
  assert.equal(validISODate('2026-13-01'), false);
});

test('recorta catálogos ativos e exclui benefício, cartão, transferência e Fixo', () => {
  assert.equal(eligibleAccount(accounts[0]), true);
  assert.equal(eligibleAccount(accounts[1]), false);
  assert.equal(eligiblePaymentMethod(methods[0]), true);
  assert.equal(eligiblePaymentMethod(methods[1]), false);
  assert.equal(eligiblePaymentMethod(methods[2]), false);
  assert.equal(eligibleCategory(categories[2], 'expense'), false);
  assert.equal(eligibleCategory(categories[0], 'income'), true);
  assert.equal(eligibleCategory(categories[0], 'expense'), false);
});

test('cria payload de receita e despesa pendente usando apenas IDs oficiais', () => {
  const fields = { type: 'income' as const, description: ' Salário ', amount: '2.000,45', day: '2026-10-23', accountId: 'checking', categoryId: 'salary', paymentMethodId: 'pix', notes: '' };
  assert.deepEqual(basicLaunchInput(fields, accounts, categories, methods), {
    type: 'income', description: 'Salário', status: 'planned', amount: 2000.45, date: '2026-10-23',
    accountId: 'checking', categoryId: 'salary', paymentMethodId: 'pix', notes: ''
  });
  const expense = basicLaunchInput({ ...fields, type: 'expense', categoryId: 'market', amount: '10,00' }, accounts, categories, methods);
  assert.equal(expense.status, 'planned');
  assert.equal(expense.amount, 10);
  assert.throws(() => basicLaunchInput({ ...fields, type: 'expense', categoryId: 'fixed' }, accounts, categories, methods), /categoria válida/i);
  assert.throws(() => basicLaunchInput({ ...fields, accountId: 'benefit' }, accounts, categories, methods), /conta monetária/i);
});


test('autocomplete recupera apenas vínculos autorizados sem data e sem valor do histórico',()=>{
  const old = [{
    id:'item', description:' Salário ', type:'income', status:'paid', date:'2026-01-15', competence:'2026-01',
    amount:'98765', signedAmount:'98765', accountId:'checking', categoryId:'salary', paymentMethodId:'pix',
  }];
  const known = autocompleteFromHistory('salario', 'income', old as any, accounts, categories, methods);
  assert.deepEqual(known, { accountId:'checking', categoryId:'salary', paymentMethodId:'pix' });
  assert.equal(known && 'amount' in known, false);
  assert.equal(known && 'date' in known, false);
  assert.equal(autocompleteFromHistory('Salário','expense', old as any, accounts, categories, methods), null);
});

test('data resumida em pt-BR mantém exatamente o dia enviado, sem conversão de fuso', () => {
  assert.equal(formatLaunchDateBR('2026-10-23'), '23/10/2026');
  assert.equal(formatLaunchDateBR('2024-02-29'), '29/02/2024');
  assert.equal(formatLaunchDateBR('2026-02-29'), 'Não informada');
  assert.equal(formatLaunchDateBR(''), 'Não informada');
});
