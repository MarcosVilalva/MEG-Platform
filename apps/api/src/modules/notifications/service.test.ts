import assert from 'node:assert/strict';
import { alexaAutomationSlot, automationSlot, buildAlexaAnnouncement, buildAlexaFinancialPanorama, buildNotificationDigest } from './service';

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
assert.match(dueNow.text, /Total em aberto até o mês atual:\* R\$\s+504,90 em 4 obrigação/);

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
assert.match(misleadingPreviousMessage.text, /Exigem atenção neste envio:\* R\$\s+17,68/);
assert.match(misleadingPreviousMessage.text, /Total em aberto até o mês atual:\* R\$\s+167,68 em 2 obrigação/);
assert.match(misleadingPreviousMessage.text, /Compromissos após este mês:\* R\$\s+40,00 em 1 obrigação/);
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

const alexaWeekday = buildAlexaAnnouncement([
  { type: 'expense', date: '2026-07-13', description: 'ÁGUA', expenseAmount: 90, status: 'PENDING', paymentMethod: 'PIX' },
  { type: 'expense', date: '2026-07-14', description: 'ENERGIA', expenseAmount: 150, status: 'PENDING', paymentMethod: 'PIX' },
  { type: 'expense', date: '2026-07-13', description: 'PAGA', expenseAmount: 50, status: 'PAID', paymentMethod: 'PIX' }
], new Date('2026-07-13T09:20:00Z'), true);
assert.ok(alexaWeekday);
assert.match(alexaWeekday.text, /Vencem hoje/);
assert.match(alexaWeekday.text, /Vencem amanhã/);
assert.doesNotMatch(alexaWeekday.text, /PAGA/);
const alexaWeekend = buildAlexaAnnouncement(transactions, new Date('2026-07-12T15:00:00Z'), false);
assert.ok(alexaWeekend);
assert.doesNotMatch(alexaWeekend.text, /Vencem amanhã/);
assert.equal(alexaAutomationSlot(new Date('2026-07-13T09:20:00Z'), '06:20')?.includeTomorrow, true);
assert.equal(alexaAutomationSlot(new Date('2026-07-12T15:00:00Z'), '12:00')?.includeTomorrow, false);
assert.equal(alexaAutomationSlot(new Date('2026-07-12T15:00:00Z'), '18:00'), null);

const panorama = buildAlexaFinancialPanorama([
  { type: 'income', date: '2026-06-01', description: 'SALÁRIO', incomeAmount: 1000, status: 'paid' },
  { type: 'expense', date: '2026-06-10', description: 'ALUGUEL', expenseAmount: 300, status: 'paid', paymentMethod: 'PIX' },
  { type: 'income', date: '2026-07-01', description: 'SALÁRIO', incomeAmount: 2000, status: 'paid' },
  { type: 'expense', date: '2026-07-05', description: 'MERCADO', expenseAmount: 500, status: 'paid', paymentMethod: 'PIX' },
  { type: 'expense', date: '2026-07-20', description: 'ENERGIA', expenseAmount: 250, status: 'pending', paymentMethod: 'PIX' },
  { type: 'income', date: '2026-07-01', description: 'VEROCARD', incomeAmount: 600, status: 'paid', financialScope: 'benefit' },
  { type: 'expense', date: '2026-07-08', description: 'REFEIÇÃO', expenseAmount: 100, status: 'paid', financialScope: 'benefit' }
], new Date('2026-07-13T15:00:00Z'));
assert.equal(panorama.data.monetaryOpening, 700);
assert.equal(panorama.data.monetaryIncome, 2000);
assert.equal(panorama.data.monetaryPaidExpense, 500);
assert.equal(panorama.data.monetaryPendingExpense, 250);
assert.equal(panorama.data.monetaryAvailable, 2200);
assert.equal(panorama.data.projectedClosing, 1950);
assert.equal(panorama.data.benefitBalance, 500);
assert.match(panorama.speech, /Panorama MEG de julho de 2026/);
assert.match(panorama.speech, /projeção é de sobra/);
assert.match(buildAlexaFinancialPanorama([
  { type: 'income', date: '2026-07-01', description: 'SALÁRIO', incomeAmount: 100 },
  { type: 'expense', date: '2026-07-20', description: 'ENERGIA', expenseAmount: 150, status: 'pending' }
], new Date('2026-07-13T15:00:00Z'), 'balance').speech, /faltam R\$\s+50,00/);

console.log('MEG notification digest tests passed.');
