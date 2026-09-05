import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyBatchTransactionChanges, transactionIconKind, transactionIconMarkup } from './transaction-visual-core.js';

const transactions = [
  { id: '1', date: '2026-09-01', description: 'Supermercado', type: 'expense', paymentMethod: 'PIX', account: 'PIX', modality: 'À VISTA' },
  { id: '2', date: '2026-09-02', description: 'Salário', type: 'income', paymentMethod: 'CONTA', account: 'CONTA', modality: 'À VISTA' },
  { id: '3', date: '2026-09-03', description: 'Consulta médica', type: 'expense', paymentMethod: 'PIX', account: 'PIX', modality: 'À VISTA' },
];

const result = applyBatchTransactionChanges(transactions, {
  ids: ['1', '3'],
  date: '2026-10-10',
  paymentMethod: 'CARTÃO AZUL',
  resolveModality: () => 'CREDITO',
});
assert.equal(result.changed, 2);
assert.equal(result.transactions[0].date, '2026-10-10');
assert.equal(result.transactions[0].account, 'CARTÃO AZUL');
assert.equal(result.transactions[0].modality, 'CREDITO');
assert.strictEqual(result.transactions[1], transactions[1], 'lançamento não selecionado deve permanecer intocado');
assert.equal(result.transactions[2].paymentMethod, 'CARTÃO AZUL');

const noFields = applyBatchTransactionChanges(transactions, { ids: ['1'] });
assert.equal(noFields.changed, 0);
assert.strictEqual(noFields.transactions[0], transactions[0]);
assert.equal(transactionIconKind(transactions[0]), 'market');
assert.equal(transactionIconKind(transactions[1]), 'income');
assert.equal(transactionIconKind(transactions[2]), 'health');
assert.match(transactionIconMarkup('health'), /^<svg/);

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('./legacy-app.js', import.meta.url), 'utf8');
const entry = readFileSync(new URL('./legacy-entry.js', import.meta.url), 'utf8');
const loader = readFileSync(new URL('./native-app-update.js', import.meta.url), 'utf8');
const batch = readFileSync(new URL('./transaction-batch-editor.js', import.meta.url), 'utf8');
const theme = readFileSync(new URL('./appearance-theme.js', import.meta.url), 'utf8');
const themeCss = readFileSync(new URL('./appearance-theme.css', import.meta.url), 'utf8');
const modernCss = readFileSync(new URL('./global-modern-clarity.css', import.meta.url), 'utf8');
const lightLogo = readFileSync(new URL('../public/brand/meg-finance-system-lockup-light.svg', import.meta.url), 'utf8');

assert.match(html, /id="appearanceThemeToggle"/);
assert.match(html, /id="transactionSelectVisible"/);
assert.match(html, /id="transactionBatchApply"/);
assert.match(html, /<option value="">Não alterar<\/option>/);
assert.match(app, /async function applyTransactionBatch/);
assert.match(app, /await confirmTransactionPersistence\(\)/);
assert.match(app, /applyTransactionBatch,/);
assert.match(batch, /Os demais campos serão preservados/);
assert.match(batch, /meg:transaction-selection-change/);
assert.match(entry, /initializeAppearanceTheme\(\)/);
assert.match(theme, /meg-appearance-theme-v1/);
assert.match(themeCss, /data-meg-theme="light"/);
assert.match(loader, /transaction-batch-editor\.css/);
assert.match(theme, /import '\.\/appearance-theme\.css'/);
assert.match(theme, /import '\.\/global-modern-clarity\.css'/);
assert.match(theme, /=== 'dark' \? 'dark' : 'light'/, 'modo claro deve ser o padrão sem apagar a escolha salva');
assert.match(html, /Consulte todos os campos/);
assert.equal((html.match(/<th(?:\s|>)/g) || []).length >= 14, true, 'todos os campos da tabela devem continuar presentes');
assert.match(modernCss, /\.sidebar/);
assert.match(modernCss, /\.transactions-table/);
assert.match(modernCss, /dialog\.modal/);
assert.match(modernCss, /\.meg-mobile-transaction/);
assert.match(lightLogo, /para superfícies claras/);

console.log('transaction batch and appearance theme tests passed');
