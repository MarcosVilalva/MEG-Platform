import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildExecutiveFinancialModel, buildMonthlyExpenseModel } from './executive-financial-report-core.js';
import { createExecutiveFinancialPdf, createMonthlyExpensePdf, executivePdfInternals } from './executive-financial-report-pdf.js';

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
assert.equal(model.managerialGroups[0].group, 'ESSENCIAIS');
assert.equal(model.scoreComponents.reduce((sum, item) => sum + item.score, 0), model.metrics.healthScore);
assert.equal(model.cardRows[0].usage, 1.44);
assert.ok(model.recommendations.some((item) => item.title.includes('vencida')));
assert.ok(model.recommendations.every((item) => !item.title.includes('déficit projetado')));

const report = createExecutiveFinancialPdf(options);
const strainedModel = buildExecutiveFinancialModel({
  state: {
    transactions: [
      { date: '2026-06-05', description: 'Receita', type: 'income', amount: 5000, status: 'paid' },
      { date: '2026-06-10', description: 'Despesas', type: 'expense', amount: 4500, group: 'LAZER', status: 'paid' },
      { date: '2026-07-05', description: 'Receita', type: 'income', amount: 5000, status: 'paid' },
      { date: '2026-07-10', description: 'Despesas', type: 'expense', amount: 4500, group: 'LAZER', status: 'paid' },
      { date: '2026-08-05', description: 'Receita', type: 'income', amount: 5000, status: 'paid' },
      { date: '2026-08-10', description: 'Despesas', type: 'expense', amount: 4500, group: 'LAZER', status: 'paid' },
    ],
    budgets: { LAZER: 3000 },
    catalogs: { accounts: [], cards: [] },
  },
  start: '2026-06-01',
  end: '2026-08-21',
  generatedAt: new Date(2026, 7, 21, 12, 0, 0),
});
assert.equal(strainedModel.metrics.averageIncome, 5000);
assert.equal(strainedModel.metrics.averageExpense, 4500);
assert.equal(strainedModel.metrics.healthyIncome, 5625);
assert.equal(strainedModel.metrics.incomeIncreaseRequired, 625);
assert.equal(strainedModel.metrics.expenseReductionRequired, 500);
assert.equal(strainedModel.metrics.hybridIncomeIncrease, 300);
assert.equal(strainedModel.metrics.hybridExpenseReduction, 260);
assert.equal(strainedModel.metrics.hybridSavingsRate, 0.2);
assert.equal(strainedModel.managerialGroups[0].group, 'ESTILO DE VIDA');
assert.equal(strainedModel.budgetOpportunities[0].variance, 1500);
assert.match(strainedModel.recommendations[0].action, /R\$ 300,00.*R\$ 260,00/);
assert.doesNotMatch(strainedModel.recommendations[0].action, /mesmo valor/);

assert.match(report.filename, /^relatorio-financeiro-premium-meg-2026-08-21\.pdf$/);
assert.equal(report.mimeType, 'application/pdf');
assert.equal(new TextDecoder().decode(report.bytes.slice(0, 8)), '%PDF-1.4');
assert.ok(report.bytes.length > 10_000);
assert.equal(report.pageCount, 4, 'o relatório gerencial deve permanecer curto');

const pdfSource = new TextDecoder().decode(report.bytes);
assert.match(pdfSource, /MEG Premium Financial Report/);
assert.match(pdfSource, /MEG FINANCE SYSTEM/);
assert.equal((pdfSource.match(/\(MEG\) Tj ET/g) || []).length, report.pageCount, 'o monograma MEG deve aparecer em todas as páginas');
assert.match(pdfSource, /PAINEL FINANCEIRO PREMIUM/);
assert.match(pdfSource, /TR\\312S CAMINHOS PARA A META/);
assert.match(pdfSource, /AN\\301LISE INTELIGENTE/);
assert.match(pdfSource, /PROJE\\307\\303O E RISCO/);
assert.match(pdfSource, /PLANO DE A\\307\\303O EM 90 DIAS/);
assert.doesNotMatch(pdfSource, /LAN\\307AMENTOS DO HIST\\323RICO/);
assert.match(pdfSource, /startxref/);
assert.match(pdfSource, /%%EOF/);
assert.match(pdfSource, /\/FontFile2/);
assert.match(pdfSource, /MEGREG\+Inter-Regular/);
assert.match(pdfSource, /MEGBLD\+Inter-SemiBold/);
assert.doesNotMatch(pdfSource, /\/BaseFont \/Helvetica/);
assert.equal((pdfSource.match(/\/Type \/Page \/Parent/g) || []).length, report.pageCount);
assert.match(executivePdfInternals.pdfText('Ação e saúde'), /\\347/);
assert.ok(executivePdfInternals.measureTextWidth('MEG Finanças', 12, 'bold') > executivePdfInternals.measureTextWidth('MEG', 12, 'bold'));

const emptyReport = createExecutiveFinancialPdf({
  state: { transactions: [], budgets: {}, catalogs: { accounts: [], cards: [] } },
  owner: 'Teste de Qualidade',
  generatedAt: new Date(2026, 7, 21, 12, 0, 0),
});
assert.equal(emptyReport.pageCount, 4);
assert.equal(emptyReport.model.metrics.transactionCount, 0);
assert.equal(emptyReport.model.metrics.healthyIncome, 0);

const monthlyState = {
  transactions: [
    { id: 'pm1', date: '2026-07-04', description: 'Aluguel anterior', type: 'expense', amount: 1800, group: 'IMÓVEL', status: 'paid' },
    { id: 'pm2', date: '2026-07-11', description: 'Mercado anterior', type: 'expense', amount: 1200, group: 'SUPERMERCADO', status: 'paid' },
    { id: 'pm3', date: '2026-07-19', description: 'Lazer anterior', type: 'expense', amount: 900, group: 'LAZER', status: 'paid' },
    { id: 'mr1', date: '2026-08-02', description: 'Receita mensal', type: 'income', amount: 8000, status: 'paid' },
    { id: 'mp1', date: '2026-08-05', description: 'Aluguel', type: 'expense', amount: 1800, group: 'IMÓVEL', status: 'paid', paymentMethod: 'PIX' },
    { id: 'mp2', date: '2026-08-09', description: 'Supermercado', type: 'expense', amount: 1200, group: 'SUPERMERCADO', status: 'paid', paymentMethod: 'Cartão MEG' },
    { id: 'mp3', date: '2026-08-12', description: 'Restaurantes', type: 'expense', amount: 900, group: 'FAST FOOD', status: 'paid', paymentMethod: 'Cartão MEG' },
    { id: 'mp4', date: '2026-08-14', description: 'Combustível', type: 'expense', amount: 500, group: 'TRANSPORTE', status: 'paid', paymentMethod: 'PIX' },
    { id: 'mp5', date: '2026-08-17', description: 'Curso', type: 'expense', amount: 350, group: 'CURSOS', status: 'paid', paymentMethod: 'Boleto' },
    { id: 'mo1', date: '2026-08-18', description: 'Fatura de lazer', type: 'expense', amount: 1100, group: 'LAZER', status: 'pending', situation: 'PENDENTE', paymentMethod: 'Cartão MEG' },
    { id: 'mo2', date: '2026-08-25', description: 'Conta de telefone', type: 'expense', amount: 300, group: 'COMUNICAÇÃO', status: 'pending', situation: 'PENDENTE', paymentMethod: 'Débito' },
    { id: 'mf1', date: '2026-09-05', description: 'Fora do mês', type: 'expense', amount: 9000, group: 'ELETRO', status: 'pending' },
  ],
  budgets: { 'IMÓVEL': 1800, 'SUPERMERCADO': 1000, 'FAST FOOD': 600, 'TRANSPORTE': 600, 'LAZER': 800, 'COMUNICAÇÃO': 300 },
  catalogs: { accounts: [], cards: [] },
};
const monthlyOptions = {
  state: monthlyState,
  start: '2026-08-01',
  end: '2026-08-31',
  owner: 'Marcos de Andrade Vilalva',
  generatedAt: new Date(2026, 7, 21, 12, 0, 0),
};
const monthlyModel = buildMonthlyExpenseModel(monthlyOptions);
assert.equal(monthlyModel.metadata.month, '2026-08');
assert.equal(monthlyModel.metrics.income, 8000);
assert.equal(monthlyModel.metrics.paidExpense, 4750);
assert.equal(monthlyModel.metrics.pendingValue, 1400);
assert.equal(monthlyModel.metrics.committedExpense, 6150);
assert.equal(monthlyModel.metrics.variablePaidExpense, 900);
assert.equal(monthlyModel.metrics.paceProjection, 6578.57);
assert.equal(monthlyModel.metrics.projectedExpense, 6578.57);
assert.equal(monthlyModel.metrics.projectedClosing, 1421.43);
assert.equal(monthlyModel.metrics.healthyExpenseCeiling, 6400);
assert.equal(monthlyModel.metrics.requiredHealthyIncome, 8223.21);
assert.equal(monthlyModel.metrics.incomeIncreaseRequired, 223.21);
assert.equal(monthlyModel.metrics.expenseReductionRequired, 178.57);
assert.equal(monthlyModel.metrics.previousExpense, 3900);
assert.equal(monthlyModel.metrics.overdueCount, 1);
assert.equal(monthlyModel.metrics.overdueValue, 1100);
assert.equal(monthlyModel.categories[0].category, 'IMÓVEL');
assert.equal(monthlyModel.managerialGroups[0].group, 'ESSENCIAIS');
assert.equal(monthlyModel.savingsOpportunities.reduce((sum, item) => sum + item.saving, 0), 178.57);
assert.ok(monthlyModel.recommendations.some((item) => item.title.includes('vencido')));
assert.ok(monthlyModel.recommendations.some((item) => item.title.includes('fechamento')));
assert.equal(monthlyModel.topExpenses.at(-1)?.description, 'Conta de telefone');

const monthlyReport = createMonthlyExpensePdf(monthlyOptions);
assert.equal(monthlyReport.filename, 'relatorio-mensal-despesas-meg-2026-08.pdf');
assert.equal(monthlyReport.mimeType, 'application/pdf');
assert.equal(monthlyReport.pageCount, 4);
assert.ok(monthlyReport.bytes.length > 10_000);
const monthlyPdfSource = new TextDecoder().decode(monthlyReport.bytes);
assert.match(monthlyPdfSource, /PAINEL DE DESPESAS DO M\\312S/);
assert.match(monthlyPdfSource, /O QUE MAIS IMPACTOU/);
assert.match(monthlyPdfSource, /EM ABERTO E PROJE\\307\\325ES/);
assert.match(monthlyPdfSource, /PLANO DE MELHORIA/);
assert.equal((monthlyPdfSource.match(/\(MEG\) Tj ET/g) || []).length, monthlyReport.pageCount);
assert.match(monthlyPdfSource, /MEG FINANCE SYSTEM/);
assert.match(monthlyPdfSource, /MEGREG\+Inter-Regular/);
assert.match(monthlyPdfSource, /MEGBLD\+Inter-SemiBold/);
assert.equal((monthlyPdfSource.match(/\/Type \/Page \/Parent/g) || []).length, monthlyReport.pageCount);

const legacyAppSource = fs.readFileSync(new URL('./legacy-app.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainActivity = fs.readFileSync(new URL('../../../android/app/src/main/java/br/com/megfinancas/app/MainActivity.java', import.meta.url), 'utf8');
const exportBlock = legacyAppSource.slice(legacyAppSource.indexOf('async function exportFinancialPdfReport'), legacyAppSource.indexOf('function csvCell'));
assert.match(exportBlock, /const \{ min: start, max: end \} = availableDateBounds\(\)/);
assert.match(exportBlock, /createExecutiveFinancialPdf/);
assert.doesNotMatch(exportBlock, /periodLabel/);
assert.match(legacyAppSource, /els\.exportPdfReportBtn\.hidden = nativeMobile/);
assert.match(legacyAppSource, /createMonthlyExpensePdf/);
assert.match(legacyAppSource, /els\.exportMonthlyExpensePdfBtn\.hidden = nativeMobile/);
assert.match(indexSource, /Relatório financeiro premium em PDF/);
assert.match(indexSource, /Relatório mensal de despesas em PDF/);
assert.doesNotMatch(indexSource, /Super relatório financeiro em PDF/);
assert.doesNotMatch(mainActivity, /ReportExporterPlugin/);

console.log('executive financial PDF report tests passed');
