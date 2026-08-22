import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildExecutiveFinancialModel } from './executive-financial-report-core.js';
import { createExecutiveFinancialPdf, executivePdfInternals } from './executive-financial-report-pdf.js';

const state = {
  transactions: [
    { id: 'r1', date: '2026-06-05', description: 'Salário', type: 'income', incomeAmount: 7000, amount: 7000, status: 'paid', financialScope: 'monetary', financialAccountId: 'bank' },
    { id: 'd1', date: '2026-06-10', description: 'Aluguel', type: 'expense', expenseAmount: 1800, amount: 1800, group: 'IMÓVEL', status: 'paid', paymentMethod: 'PIX', financialScope: 'monetary', financialAccountId: 'bank' },
    { id: 'r2', date: '2026-07-05', description: 'Salário', type: 'income', incomeAmount: 7000, amount: 7000, status: 'paid', financialScope: 'monetary', financialAccountId: 'bank' },
    { id: 'd2', date: '2026-07-12', description: 'Supermercado', type: 'expense', expenseAmount: 1250, amount: 1250, group: 'SUPERMERCADO', status: 'paid', paymentMethod: 'Cartão MEG', modality: 'CREDITO', financialScope: 'monetary', financialAccountId: 'bank' },
    { id: 'r3', date: '2026-08-05', description: 'Salário', type: 'income', incomeAmount: 7000, amount: 7000, status: 'paid', financialScope: 'monetary', financialAccountId: 'bank' },
    { id: 'd3', date: '2026-08-15', description: 'Fatura do cartão', type: 'expense', expenseAmount: 2200, amount: 2200, group: 'LAZER', status: 'pending', situation: 'PENDENTE', paymentMethod: 'Cartão MEG', modality: 'CREDITO', financialScope: 'monetary', financialAccountId: 'bank' },
    { id: 'b1', date: '2026-08-04', description: 'Verocard', type: 'income', incomeAmount: 500, amount: 500, status: 'paid', financialScope: 'benefit', financialAccountId: 'benefit' },
  ],
  budgets: { 'IMÓVEL': 1900, 'SUPERMERCADO': 1000, 'LAZER': 500 },
  catalogs: {
    accounts: [{ id: 'bank', name: 'Conta principal', type: 'MONETARY', subtype: 'CHECKING', openingBalance: 0, isActive: true }],
    cards: [{ paymentMethod: 'Cartão MEG', issuer: 'Banco MEG', brand: 'VISA', lastFour: '1234', limit: 5000, closingDay: 10, dueDay: 17, isActive: true }],
  },
};

const options = {
  state,
  start: '2026-06-01',
  end: '2026-08-31',
  owner: 'Marcos de Andrade Vilalva',
  periodLabel: 'Histórico completo, 01/06/2026 a 31/08/2026',
  generatedAt: new Date('2026-08-21T12:00:00.000Z'),
};

const model = buildExecutiveFinancialModel(options);
assert.equal(model.metrics.income, 21000);
assert.equal(model.metrics.expense, 5250);
assert.equal(model.metrics.pendingExpense, 2200);
assert.equal(model.metrics.pendingCount, 1);
assert.equal(model.metrics.overdueCount, 1);
assert.equal(model.monthly.length, 3);
assert.equal(model.cardRows[0].usage, 0.44);
assert.ok(model.recommendations.some((item) => item.title.includes('vencida')));
assert.ok(model.recommendations.some((item) => item.reason.includes('R$ 2.200,00')));

const report = createExecutiveFinancialPdf(options);
assert.match(report.filename, /^super-relatorio-financeiro-meg-2026-08-21\.pdf$/);
assert.equal(report.mimeType, 'application/pdf');
assert.equal(new TextDecoder().decode(report.bytes.slice(0, 8)), '%PDF-1.4');
assert.ok(report.bytes.length > 10_000);
assert.ok(report.pageCount >= 6);

const pdfSource = new TextDecoder().decode(report.bytes);
assert.match(pdfSource, /MEG Financial Report/);
assert.match(pdfSource, /RELAT/);
assert.match(pdfSource, /PLANO DE A/);
assert.match(pdfSource, /startxref/);
assert.match(pdfSource, /%%EOF/);
assert.equal((pdfSource.match(/\/Type \/Page \/Parent/g) || []).length, report.pageCount);
assert.match(executivePdfInternals.pdfText('Ação e saúde'), /\\347/);

const emptyReport = createExecutiveFinancialPdf({
  state: { transactions: [], budgets: {}, catalogs: { accounts: [], cards: [] } },
  start: '2026-08-01',
  end: '2026-08-31',
  owner: 'Teste de Qualidade',
  periodLabel: 'Agosto de 2026',
  generatedAt: new Date('2026-08-21T12:00:00.000Z'),
});
assert.ok(emptyReport.pageCount >= 4);
assert.equal(emptyReport.model.metrics.transactionCount, 0);

const legacyAppSource = fs.readFileSync(new URL('./legacy-app.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainActivity = fs.readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/MainActivity.java', import.meta.url), 'utf8');
const exportBlock = legacyAppSource.slice(legacyAppSource.indexOf('async function exportFinancialPdfReport'), legacyAppSource.indexOf('function csvCell'));
assert.match(exportBlock, /const \{ min: start, max: end \} = availableDateBounds\(\)/);
assert.match(exportBlock, /createExecutiveFinancialPdf/);
assert.doesNotMatch(exportBlock, /dateRangeForSelectedPeriod\(\)/);
assert.match(legacyAppSource, /els\.exportPdfReportBtn\.hidden = nativeMobile/);
assert.match(indexSource, /Super relatório financeiro em PDF/);
assert.doesNotMatch(indexSource, /Super relatório financeiro em Excel/);
assert.doesNotMatch(mainActivity, /ReportExporterPlugin/);

console.log('executive financial PDF report tests passed');
