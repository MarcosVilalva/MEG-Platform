import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildExecutiveFinancialModel } from './executive-financial-report-core.js';
import { createExecutiveFinancialPdf, executivePdfInternals } from './executive-financial-report-pdf.js';

const state = {
  transactions: [
    { id: 'r1', date: '2026-06-05', description: 'Salário', type: 'income', incomeAmount: 7000, amount: 7000, status: 'paid', financialAccountId: 'bank' },
    { id: 'd1', date: '2026-06-10', description: 'Aluguel', type: 'expense', expenseAmount: 1800, amount: 1800, group: 'IMÓVEL', expenseClass: 'CONTAS GERAIS', status: 'paid', paymentMethod: 'PIX', financialAccountId: 'bank' },
    { id: 'r2', date: '2026-07-05', description: 'Salário', type: 'income', incomeAmount: 7000, amount: 7000, status: 'paid', financialAccountId: 'bank' },
    { id: 'd2', date: '2026-07-12', description: 'Supermercado', type: 'expense', expenseAmount: 1250, amount: 1250, group: 'SUPERMERCADO', expenseClass: 'CONTAS GERAIS', status: 'paid', paymentMethod: 'Cartão MEG', modality: 'CREDITO', financialAccountId: 'bank' },
    { id: 'r3', date: '2026-08-05', description: 'Salário', type: 'income', incomeAmount: 7000, amount: 7000, status: 'paid', financialAccountId: 'bank' },
    { id: 'd3', date: '2026-08-15', description: 'Fatura vencida', type: 'expense', expenseAmount: 2200, amount: 2200, group: 'LAZER', expenseClass: 'CONTAS GERAIS', status: 'pending', situation: 'PENDENTE', paymentMethod: 'Cartão MEG', modality: 'CREDITO', financialAccountId: 'bank' },
    { id: 'f1', date: '2026-09-15', description: 'Parcela futura', type: 'expense', expenseAmount: 5000, amount: 5000, group: 'ELETRO', expenseClass: 'CONTAS GERAIS', status: 'pending', situation: 'PENDENTE', paymentMethod: 'Cartão MEG', modality: 'CREDITO', financialAccountId: 'bank' },
    { id: 'b1', date: '2026-08-04', description: 'Verocard', type: 'income', incomeAmount: 500, amount: 500, status: 'paid', financialScope: 'benefit', financialAccountId: 'benefit' },
  ],
  budgets: { 'IMÓVEL': 1900, 'SUPERMERCADO': 1000, 'LAZER': 500 },
  catalogs: {
    accounts: [{ id: 'bank', name: 'Conta principal', type: 'MONETARY', openingBalance: 0, isActive: true }],
    cards: [{ paymentMethod: 'Cartão MEG', limit: 5000, isActive: true }],
  },
};

const options = {
  state,
  start: '2026-06-01',
  end: '2026-09-30',
  owner: 'Marcos de Andrade Vilalva',
  generatedAt: new Date(2026, 7, 21, 12, 0, 0),
};

const model = buildExecutiveFinancialModel(options);
assert.equal(model.metadata.referenceDate, '2026-08-21');
assert.equal(model.metrics.income, 21000);
assert.equal(model.metrics.expense, 3050, 'despesa futura ou pendente não pode virar gasto realizado');
assert.equal(model.metrics.operatingResult, 17950);
assert.equal(model.metrics.currentBalance, 17950);
assert.equal(model.metrics.averageIncome, 7000);
assert.equal(model.metrics.averageExpense, 1016.67);
assert.equal(model.metrics.healthyIncome, 1270.84);
assert.equal(model.metrics.monthlyGap, 0);
assert.equal(model.metrics.overdueCount, 1);
assert.equal(model.metrics.overdueValue, 2200);
assert.equal(model.metrics.futureCount, 1);
assert.equal(model.metrics.futureValue, 5000);
assert.equal(model.metrics.next30Value, 5000);
assert.equal(model.monthly.length, 3);
assert.equal(model.expenseTypes[0].type, 'CONTAS GERAIS');
assert.equal(model.expenseTypes[0].total, 3050);
assert.equal(model.cardRows[0].usage, 1.44);
assert.ok(model.recommendations.some((item) => item.title.includes('vencida')));
assert.ok(model.recommendations.every((item) => !item.title.includes('déficit projetado')));

const report = createExecutiveFinancialPdf(options);
assert.match(report.filename, /^relatorio-gerencial-meg-2026-08-21\.pdf$/);
assert.equal(report.mimeType, 'application/pdf');
assert.equal(new TextDecoder().decode(report.bytes.slice(0, 8)), '%PDF-1.4');
assert.ok(report.bytes.length > 10_000);
assert.equal(report.pageCount, 4, 'o relatório gerencial deve permanecer curto');

const pdfSource = new TextDecoder().decode(report.bytes);
assert.match(pdfSource, /MEG Financial Report/);
assert.match(pdfSource, /PAINEL FINANCEIRO GERENCIAL/);
assert.match(pdfSource, /QUANTO PRECISO TER DE RECEITA/);
assert.match(pdfSource, /PLANO GERENCIAL DE A/);
assert.doesNotMatch(pdfSource, /LAN\307AMENTOS DO HIST\323RICO/);
assert.match(pdfSource, /startxref/);
assert.match(pdfSource, /%%EOF/);
assert.equal((pdfSource.match(/\/Type \/Page \/Parent/g) || []).length, report.pageCount);
assert.match(executivePdfInternals.pdfText('Ação e saúde'), /\\347/);

const emptyReport = createExecutiveFinancialPdf({
  state: { transactions: [], budgets: {}, catalogs: { accounts: [], cards: [] } },
  owner: 'Teste de Qualidade',
  generatedAt: new Date(2026, 7, 21, 12, 0, 0),
});
assert.equal(emptyReport.pageCount, 4);
assert.equal(emptyReport.model.metrics.transactionCount, 0);
assert.equal(emptyReport.model.metrics.healthyIncome, 0);

const legacyAppSource = fs.readFileSync(new URL('./legacy-app.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainActivity = fs.readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/MainActivity.java', import.meta.url), 'utf8');
const exportBlock = legacyAppSource.slice(legacyAppSource.indexOf('async function exportFinancialPdfReport'), legacyAppSource.indexOf('function csvCell'));
assert.match(exportBlock, /const \{ min: start, max: end \} = availableDateBounds\(\)/);
assert.match(exportBlock, /createExecutiveFinancialPdf/);
assert.doesNotMatch(exportBlock, /periodLabel/);
assert.match(legacyAppSource, /els\.exportPdfReportBtn\.hidden = nativeMobile/);
assert.match(indexSource, /Relatório gerencial em PDF/);
assert.doesNotMatch(indexSource, /Super relatório financeiro em PDF/);
assert.doesNotMatch(mainActivity, /ReportExporterPlugin/);

console.log('executive financial PDF report tests passed');
