import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';
import { buildExecutiveFinancialModel } from './executive-financial-report-core.js';
import { createExecutiveFinancialWorkbook, executiveWorkbookInternals, shareExecutiveFinancialWorkbook } from './executive-financial-report.js';

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
  periodLabel: 'Junho a agosto de 2026',
  generatedAt: new Date('2026-08-21T12:00:00.000Z'),
};

const model = buildExecutiveFinancialModel(options);
assert.equal(model.metrics.income, 21000);
assert.equal(model.metrics.expense, 5250);
assert.equal(model.metrics.pendingExpense, 2200);
assert.equal(model.metrics.pendingCount, 1);
assert.equal(model.metrics.overdueCount, 1);
assert.equal(model.monthly.length, 3);
assert.equal(model.categories[0].category, 'LAZER');
assert.equal(model.cardRows[0].pending, 2200);
assert.equal(model.cardRows[0].usage, 0.44);
assert.ok(model.metrics.healthScore >= 0 && model.metrics.healthScore <= 100);
assert.ok(model.recommendations.some((item) => item.title.includes('vencida')));

const report = createExecutiveFinancialWorkbook(options);
assert.match(report.filename, /^relatorio-executivo-meg-2026-08-21\.xlsx$/);
assert.equal(report.bytes[0], 0x50);
assert.equal(report.bytes[1], 0x4b);

const archive = unzipSync(report.bytes);
assert.equal(executiveWorkbookInternals.SHEETS.length, 8);
for (let index = 1; index <= 8; index += 1) {
  assert.ok(archive[`xl/worksheets/sheet${index}.xml`], `sheet${index}.xml deve existir`);
}
assert.ok(archive['xl/charts/chart1.xml']);
assert.ok(archive['xl/charts/chart2.xml']);
assert.ok(archive['xl/drawings/drawing1.xml']);

const workbookXml = strFromU8(archive['xl/workbook.xml']);
assert.match(workbookXml, /Resumo Executivo/);
assert.match(workbookXml, /Plano de Ação/);
assert.match(workbookXml, /Lançamentos/);

const summaryXml = strFromU8(archive['xl/worksheets/sheet1.xml']);
assert.match(summaryXml, /MEG FINANÇAS \| RELATÓRIO EXECUTIVO/);
assert.match(summaryXml, /<f>B16-C16<\/f>/);
assert.match(summaryXml, /PRÓXIMAS AÇÕES RECOMENDADAS/);

const transactionXml = strFromU8(archive['xl/worksheets/sheet7.xml']);
assert.match(transactionXml, /Fatura do cartão/);
assert.doesNotMatch(transactionXml, /Verocard/);

const stylesXml = strFromU8(archive['xl/styles.xml']);
assert.match(stylesXml, /cellXfs count="26"/);
assert.match(stylesXml, /R\$ #,##0\.00/);

const nativeShareCalls = [];
const nativeShared = await shareExecutiveFinancialWorkbook(report, {
  capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
  exporter: { share: async (payload) => nativeShareCalls.push(payload) },
});
assert.equal(nativeShared, true);
assert.equal(nativeShareCalls.length, 1);
assert.equal(nativeShareCalls[0].filename, report.filename);
assert.match(nativeShareCalls[0].base64, /^UEs/);

const browserShared = await shareExecutiveFinancialWorkbook(report, {
  capacitor: { getPlatform: () => 'web', isNativePlatform: () => false },
  exporter: { share: async () => assert.fail('não deve chamar o plugin no navegador') },
});
assert.equal(browserShared, false);

const emptyReport = createExecutiveFinancialWorkbook({
  state: { transactions: [], budgets: {}, catalogs: { accounts: [], cards: [] } },
  start: '2026-08-01',
  end: '2026-08-31',
  owner: 'Teste & Qualidade',
  periodLabel: 'Agosto <2026>',
  generatedAt: new Date('2026-08-21T12:00:00.000Z'),
});
const emptyArchive = unzipSync(emptyReport.bytes);
assert.match(strFromU8(emptyArchive['docProps/core.xml']), /Teste &amp; Qualidade/);
assert.match(strFromU8(emptyArchive['xl/worksheets/sheet5.xml']), /Nenhuma conta pendente/);
assert.doesNotMatch(strFromU8(emptyArchive['xl/charts/chart2.xml']), /\$G\$16:\$G\$15/);

console.log('executive financial Excel report tests passed');
