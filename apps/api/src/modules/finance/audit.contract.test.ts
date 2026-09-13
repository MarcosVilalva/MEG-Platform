import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const audit = readFileSync(new URL('./audit.ts', import.meta.url), 'utf8');
const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const financeService = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');
const payablesService = readFileSync(new URL('../payables/service.ts', import.meta.url), 'utf8');
const cardsService = readFileSync(new URL('../cards/service.ts', import.meta.url), 'utf8');

assert.match(routes, /app\.get\('\/audit'/,
  'API financeira deve expor a trilha normalizada em rota somente leitura.');
assert.match(audit, /schemaVersion:\s*1/,
  'Metadata de auditoria deve possuir versão explícita.');
assert.match(audit, /before:/);
assert.match(audit, /after:/);
assert.match(audit, /resolveWorkspaceContext/,
  'Consulta de auditoria deve respeitar o workspace do ator.');
assert.match(financeService, /FINANCIAL_EVENT_CREATED/);
assert.match(financeService, /FINANCIAL_EVENT_UPDATED/);
assert.match(financeService, /FINANCIAL_EVENT_ARCHIVED/);
assert.match(financeService, /recordFinancialAudit/);
assert.match(payablesService, /PAYABLE_PAYMENT_CREATED/);
assert.match(payablesService, /RECURRING_EXPENSE_CREATED/);
assert.match(cardsService, /CARD_STATEMENT_PAID/);

const updateStart = financeService.indexOf('export async function updateFinancialEvent');
const deleteStart = financeService.indexOf('export async function deleteFinancialEvent');
assert.ok(updateStart >= 0 && deleteStart > updateStart);
const updateBlock = financeService.slice(updateStart, deleteStart);
assert.match(updateBlock, /before:\s*current/);
assert.match(updateBlock, /after:\s*result/);

console.log('Contrato de auditoria financeira normalizada validado.');
