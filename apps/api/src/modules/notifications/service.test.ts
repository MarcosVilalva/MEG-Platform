import assert from 'node:assert/strict';
import { automationSlot, buildNotificationDigest } from './service';

const transactions = [
  { type: 'expense', date: '2026-06-30', description: 'CONTA ARRASTADA', expenseAmount: 75, status: 'PENDING', paymentMethod: 'BOLETO' },
  { type: 'expense', date: '2026-07-11', description: 'FIBRA', expenseAmount: 79.90, status: 'PENDING', paymentMethod: 'DÉBITO AUTOMÁTICO', modality: 'À VISTA' },
  { type: 'expense', date: '2026-07-12', description: 'COMPRA 1', expenseAmount: 120, situation: 'PENDENTE', paymentMethod: 'CARTÃO ML', modality: 'CRÉDITO' },
  { type: 'expense', date: '2026-07-12', description: 'COMPRA 2', expenseAmount: 80, situation: 'PENDENTE', paymentMethod: 'CARTÃO ML', modality: 'CRÉDITO' },
  { type: 'expense', date: '2026-07-14', description: 'ENERGIA', expenseAmount: 150, situation: 'PENDENTE', paymentMethod: 'PIX' },
  { type: 'expense', date: '2026-08-10', description: 'IPTU', expenseAmount: 50, situation: 'PENDENTE', paymentMethod: 'BOLETO' },
  { type: 'expense', date: '2026-07-10', description: 'PAGA', expenseAmount: 50, status: 'PAID' },
  { type: 'income', date: '2026-07-10', description: 'SALÁRIO', amount: 1000, status: 'PENDING' },
];

const digest = buildNotificationDigest(transactions, new Date('2026-07-12T15:00:00Z'));
assert.equal(digest.totalCount, 4, 'pendência anterior deve acompanhar as contas próximas do mês atual');
assert.equal(digest.totalAmount, 504.9);
assert.equal(digest.openCount, 4);
assert.equal(digest.openAmount, 504.9);
assert.equal(digest.futureCount, 1);
assert.equal(digest.futureAmount, 50);
assert.equal(digest.maximumPriority.length, 1);
assert.equal(digest.maximumPriority[0].description, 'CONTA ARRASTADA');
assert.equal(digest.overdue.length, 1);
assert.equal(digest.today.length, 1);
assert.equal(digest.today[0].entries, 2);
assert.equal(digest.today[0].value, 200);
assert.match(digest.text, /FATURA CARTAO ML/);
assert.match(digest.text, /2 compras agrupadas/);
assert.match(digest.text, /PRIORIDADE MÁXIMA — PENDÊNCIAS DE MESES ANTERIORES/);
assert.match(digest.text, /PRIORIDADE CRÍTICA/);
assert.match(digest.text, /URGENTE — VENCE HOJE/);
assert.match(digest.text, /Total em aberto até o mês atual/);
assert.match(digest.text, /Compromissos após este mês/);
assert.doesNotMatch(digest.text, /PAGA/);

const dueNow = buildNotificationDigest(transactions, new Date('2026-07-12T15:00:00Z'), 'due-now');
assert.equal(dueNow.totalCount, 3, 'meio-dia e 19h incluem pendências anteriores, vencidas e vencendo hoje');
assert.equal(dueNow.openCount, 4, 'contas posteriores de julho continuam informadas no total geral');
assert.match(dueNow.text, /Itens em atenção:\* 3 item/);
assert.match(dueNow.text, /Total em aberto até o mês atual:\* R\$ 504,90 em 4 obrigação/);

const openSummary = buildNotificationDigest(transactions, new Date('2026-07-12T15:00:00Z'), 'open-summary');
assert.equal(openSummary.totalCount, 4, 'resumo inclui pendências anteriores e abertas do mês atual, sem antecipar meses futuros');
assert.equal(openSummary.openCount, 4);
assert.equal(openSummary.futureCount, 1);
assert.doesNotMatch(openSummary.text, /IPTU/);
assert.match(openSummary.text, /Raio-X das Contas em Aberto/);
assert.match(openSummary.text, /Total em aberto até o mês atual/);

const misleadingPreviousMessage = buildNotificationDigest([
  { type: 'expense', date: '2026-07-17', description: 'FATURA CARTÃO AZUL', expenseAmount: 17.68, status: 'PENDING', paymentMethod: 'CARTÃO AZUL', modality: 'CRÉDITO' },
  { type: 'expense', date: '2026-08-07', description: 'FAXINA', expenseAmount: 150, status: 'PENDING', paymentMethod: 'PIX' },
  { type: 'expense', date: '2026-09-10', description: 'UNIVIDAS', expenseAmount: 40, status: 'PENDING', paymentMethod: 'BOLETO' },
], new Date('2026-08-04T16:00:00Z'), 'due-now');
assert.equal(misleadingPreviousMessage.totalCount, 1);
assert.equal(misleadingPreviousMessage.totalAmount, 17.68);
assert.equal(misleadingPreviousMessage.openCount, 2);
assert.equal(misleadingPreviousMessage.openAmount, 167.68);
assert.equal(misleadingPreviousMessage.futureCount, 1);
assert.equal(misleadingPreviousMessage.futureAmount, 40);
assert.match(misleadingPreviousMessage.text, /Exigem atenção neste envio:\* R\$ 17,68/);
assert.match(misleadingPreviousMessage.text, /Total em aberto até o mês atual:\* R\$ 167,68 em 2 obrigação/);
assert.match(misleadingPreviousMessage.text, /Compromissos após este mês:\* R\$ 40,00 em 1 obrigação/);
assert.doesNotMatch(misleadingPreviousMessage.text, /Total que falta pagar/);

assert.equal(automationSlot(new Date('2026-07-12T09:05:00Z'))?.slot, '06:00');
assert.equal(automationSlot(new Date('2026-07-12T15:05:00Z'))?.mode, 'due-now');
assert.equal(automationSlot(new Date('2026-07-12T18:05:00Z')), null);
assert.equal(automationSlot(new Date('2026-07-12T18:05:00Z'), '19:00')?.slot, '19:00', 'o horário solicitado deve resistir a atrasos do agendador');
assert.equal(automationSlot(new Date('2026-07-12T18:05:00Z'), '19:00')?.mode, 'due-now');

const lateNightBrazil = buildNotificationDigest([
  { type: 'expense', date: '2026-07-16', description: 'FATURA TESTE', expenseAmount: 100, status: 'PENDING', paymentMethod: 'PIX' }
], new Date('2026-07-16T01:54:00Z'));
assert.equal(lateNightBrazil.today.length, 0, '22:54 em São Paulo ainda deve ser 15/07');
assert.equal(lateNightBrazil.tomorrow.length, 1, 'vencimento em 16/07 deve aparecer como amanhã');
assert.match(lateNightBrazil.text, /VENCE AMANH/);

console.log('MEG notification digest tests passed.');
