import assert from 'node:assert/strict';
import { buildNotificationDigest } from './service';

const digest = buildNotificationDigest([
  { type: 'expense', date: '2026-07-11', description: 'FIBRA', expenseAmount: 79.90, status: 'PENDING', paymentMethod: 'DÉBITO AUTOMÁTICO' },
  { type: 'expense', date: '2026-07-14', description: 'ENERGIA', expenseAmount: 120, situation: 'PENDENTE', paymentMethod: 'PIX' },
  { type: 'expense', date: '2026-07-10', description: 'PAGA', expenseAmount: 50, status: 'PAID' },
  { type: 'income', date: '2026-07-10', description: 'SALÁRIO', amount: 1000, status: 'PENDING' },
], new Date('2026-07-12T15:00:00Z'));

assert.equal(digest.totalCount, 2);
assert.equal(digest.totalAmount, 199.9);
assert.equal(digest.overdue.length, 1);
assert.equal(digest.upcoming.length, 1);
assert.match(digest.text, /MEG Finanças — Alerta de Vencimento/);
assert.match(digest.text, /JÁ VENCIDAS/);
assert.match(digest.text, /PRÓXIMOS 3 DIAS/);
assert.match(digest.text, /DÉBITO AUTOMÁTICO/);
assert.doesNotMatch(digest.text, /PAGA/);

console.log('MEG notification digest tests passed.');
