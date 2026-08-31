import assert from 'node:assert/strict';
import { buildAlexaFinancialAdvice } from './financial-advisor';

const transactions = [
  { type: 'income', date: '2026-07-01', description: 'SALÁRIO ANTERIOR', incomeAmount: 2000, status: 'paid' },
  { type: 'expense', date: '2026-07-10', description: 'DESPESA ANTERIOR', expenseAmount: 1000, status: 'paid', paymentMethod: 'PIX' },
  { type: 'income', date: '2026-08-01', description: 'SALÁRIO', incomeAmount: 10000, status: 'paid' },
  { type: 'expense', date: '2026-08-05', description: 'ALUGUEL', expenseAmount: 5000, status: 'paid', paymentMethod: 'PIX' },
  { type: 'expense', date: '2026-08-12', description: 'MERCADO', expenseAmount: 2500, status: 'paid', paymentMethod: 'PIX' },
  { type: 'expense', date: '2026-08-20', description: 'CARTÃO AZUL', expenseAmount: 1500, status: 'paid', paymentMethod: 'CARTÃO AZUL', modality: 'CRÉDITO' },
  { type: 'expense', date: '2026-09-01', description: 'ACORDO', expenseAmount: 600, status: 'pending', paymentMethod: 'PIX' }
];

const referenceDate = new Date('2026-08-30T15:00:00Z');
const analysis = buildAlexaFinancialAdvice(transactions, referenceDate, 'financial-analysis');
assert.equal(analysis.data.available, 2000);
assert.equal(analysis.data.paidToIncomeRatio, 0.9);
assert.equal(analysis.data.next30DaysTotal, 600);
assert.equal(analysis.data.marginAfter30Days, 1400);
assert.equal(analysis.data.riskLevel, 'atenção');
assert.equal(analysis.data.topExpenses[0]?.label, 'Aluguel');
assert.equal(analysis.data.topExpenses[0]?.value, 5000);
assert.match(analysis.speech, /Análise financeira de agosto de 2026/);
assert.match(analysis.speech, /90,0%/);
assert.match(analysis.speech, /nível de atenção/);
assert.match(analysis.speech, /Aluguel/);

const risk = buildAlexaFinancialAdvice(transactions, referenceDate, 'financial-risk');
assert.match(risk.speech, /nível de atenção financeira está atenção/);
assert.match(risk.speech, /90,0%/);

const savings = buildAlexaFinancialAdvice(transactions, referenceDate, 'savings-opportunities');
assert.match(savings.speech, /maiores despesas pagas/);
assert.match(savings.speech, /Aluguel/);
assert.match(savings.speech, /revisando os itens recorrentes ou ajustáveis/);

const spending = buildAlexaFinancialAdvice(transactions, referenceDate, 'spending-analysis');
assert.match(spending.speech, /R\$\s*9\.000,00/);
assert.match(spending.speech, /90,0%/);

const margin = buildAlexaFinancialAdvice(transactions, referenceDate, 'cash-margin');
assert.match(margin.speech, /R\$\s*1\.400,00/);
assert.match(margin.speech, /não considera novas receitas nem despesas/i);

const scenario = buildAlexaFinancialAdvice(transactions, referenceDate, 'scenario-by-date', { date: '2026-09-01' });
assert.equal(scenario.data.scenarioCommitments, 600);
assert.equal(scenario.data.scenarioBalance, 1400);
assert.match(scenario.speech, /1 de setembro de 2026/);
assert.match(scenario.speech, /restariam R\$\s*1\.400,00/);

const critical = buildAlexaFinancialAdvice([
  ...transactions,
  { type: 'expense', date: '2026-08-29', description: 'ATRASADA', expenseAmount: 300, status: 'pending', paymentMethod: 'PIX' }
], referenceDate, 'financial-risk');
assert.equal(critical.data.riskLevel, 'crítico');
assert.equal(critical.data.overdueTotal, 300);
assert.match(critical.speech, /R\$\s*300,00 em compromissos vencidos/);

console.log('MEG Alexa financial advisor tests passed.');
