import assert from 'node:assert/strict';
import { automationSlot, buildNotificationDigest } from './service';

const transactions = [
  { type: 'expense', date: '2026-07-11', description: 'FIBRA', expenseAmount: 79.90, status: 'PENDING', paymentMethod: 'DÉBITO AUTOMÁTICO', modality: 'À VISTA' },
  { type: 'expense', date: '2026-07-12', description: 'COMPRA 1', expenseAmount: 120, situation: 'PENDENTE', paymentMethod: 'CARTÃO ML', modality: 'CRÉDITO' },
  { type: 'expense', date: '2026-07-12', description: 'COMPRA 2', expenseAmount: 80, situation: 'PENDENTE', paymentMethod: 'CARTÃO ML', modality: 'CRÉDITO' },
  { type: 'expense', date: '2026-07-14', description: 'ENERGIA', expenseAmount: 150, situation: 'PENDENTE', paymentMethod: 'PIX' },
  { type: 'expense', date: '2026-08-10', description: 'IPTU', expenseAmount: 50, situation: 'PENDENTE', paymentMethod: 'BOLETO' },
  { type: 'expense', date: '2026-07-10', description: 'PAGA', expenseAmount: 50, status: 'PAID' },
  { type: 'income', date: '2026-07-10', description: 'SALÁRIO', amount: 1000, status: 'PENDING' },
];

const digest = buildNotificationDigest(transactions, new Date('2026-07-12T15:00:00Z'));
assert.equal(digest.totalCount, 3, 'duas compras do mesmo cartão devem virar uma fatura');
assert.equal(digest.totalAmount, 429.9);
assert.equal(digest.overdue.length, 1);
assert.equal(digest.today.length, 1);
assert.equal(digest.today[0].entries, 2);
assert.equal(digest.today[0].value, 200);
assert.match(digest.text, /FATURA CARTAO ML/);
assert.match(digest.text, /2 compras agrupadas/);
assert.match(digest.text, /PRIORIDADE CRÍTICA/);
assert.match(digest.text, /URGENTE — VENCE HOJE/);
assert.doesNotMatch(digest.text, /PAGA/);

const dueNow = buildNotificationDigest(transactions, new Date('2026-07-12T15:00:00Z'), 'due-now');
assert.equal(dueNow.totalCount, 2, 'meio-dia e 19h enviam vencidas e vencendo hoje');

const openSummary = buildNotificationDigest(transactions, new Date('2026-07-12T15:00:00Z'), 'open-summary');
assert.equal(openSummary.totalCount, 4, 'resumo de cinco dias inclui todas as contas abertas');
assert.match(openSummary.text, /Raio-X das Contas em Aberto/);

assert.equal(automationSlot(new Date('2026-07-12T09:05:00Z'))?.slot, '06:00');
assert.equal(automationSlot(new Date('2026-07-12T15:05:00Z'))?.mode, 'due-now');
assert.equal(automationSlot(new Date('2026-07-12T18:05:00Z')), null);

console.log('MEG notification digest tests passed.');
