import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(currentDir, '..');
const modulesRoot = join(currentDir, 'modules');
const repoRoot = join(webRoot, '..', '..');

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const expectedReactFields = new Map([
  ['apps/web/src/modules/analytics/BudgetPanel.tsx', 1],
  ['apps/web/src/modules/payables/Payables.tsx', 2],
  ['apps/web/src/modules/receivables/Receivables.tsx', 2],
  ['apps/web/src/modules/cards/CreditCards.tsx', 2],
  ['apps/web/src/modules/catalogs/FinancialCatalogs.tsx', 1],
  ['apps/web/src/modules/transactions/PersistentTransactions.tsx', 1],
  ['apps/web/src/modules/transactions/TransactionModal.tsx', 1],
]);

let reactCurrencyFields = 0;
for (const [path, minimumCount] of expectedReactFields) {
  const source = read(path);
  const count = (source.match(/<MEGCurrencyInput\b/g) || []).length;
  assert.ok(count >= minimumCount, `${path} precisa usar MEGCurrencyInput em todos os valores monetários`);
  assert.match(source, /parseBRL|formatBRLValue/, `${path} precisa converter BRL antes de persistir ou preencher valores`);
  reactCurrencyFields += count;
}
assert.ok(reactCurrencyFields >= 10, `Esperados ao menos 10 campos monetários React, encontrados ${reactCurrencyFields}`);

for (const path of walk(modulesRoot).filter((item) => item.endsWith('.tsx'))) {
  const source = readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /<input[^>]*(?:inputMode="decimal"|step="0\.01")[^>]*>/g, `Campo monetário cru encontrado em ${path}`);
}

const maskSource = read('apps/web/src/currency-input-mask.js');
const legacyTargets = [
  'incomeAmountInput',
  'expenseAmountInput',
  'purchaseTotalInput',
  'newCardLimitInput',
  'newFinancialAccountOpeningBalanceInput',
  'reconciliationActualInput',
  'data-budget',
  'data-invoice-amount',
  'data-column-filter="income"',
  'data-column-filter="expense"',
];
legacyTargets.forEach((target) => assert.ok(maskSource.includes(target), `Máscara BRL ausente para ${target}`));
assert.match(maskSource, /allowNegative: true/);
assert.match(maskSource, /megCurrencyValueProxy/);
assert.match(maskSource, /MutationObserver/);

const indexSource = read('apps/web/index.html');
const legacyAppSource = read('apps/web/src/legacy-app.js');
[
  'incomeAmountInput',
  'expenseAmountInput',
  'purchaseTotalInput',
  'newCardLimitInput',
  'newFinancialAccountOpeningBalanceInput',
  'reconciliationActualInput',
].forEach((id) => assert.ok(indexSource.includes(`id="${id}"`), `Campo legado ${id} não encontrado para auditoria`));
assert.ok(legacyAppSource.includes('data-budget'));
assert.ok(legacyAppSource.includes('data-invoice-amount'));

console.log(`BRL money audit passed: ${reactCurrencyFields} React + ${legacyTargets.length} legacy monetary fields protected`);
