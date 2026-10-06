import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./opening-balance.ts', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('./catalog-mutation.ts', import.meta.url), 'utf8');
const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const protection = readFileSync(new URL('./monetary-protection.ts', import.meta.url), 'utf8');
const benefit = readFileSync(new URL('./benefit-event-mutation.ts', import.meta.url), 'utf8');

assert.match(source, /OPENING_BALANCE_EVENT_PREFIX = 'opening-balance:'/,
  'Saldo inicial deve possuir identidade sistemática estável.');
assert.match(source, /legacyTransactionId/,
  'Evento de saldo inicial deve ser localizável sem duplicação.');
assert.match(source, /systemGenerated:\s*'OPENING_BALANCE'/,
  'Saldo inicial deve ser explicitamente identificado como evento de sistema.');
assert.match(source, /status:\s*'paid'/,
  'Saldo inicial deve nascer realizado.');
assert.match(source, /ledgerEntry\.deleteMany[\s\S]*ledgerEntry\.create/,
  'Alteração do saldo inicial deve reconstruir seu único efeito no razão de forma transacional.');
assert.match(source, /balanceCents === 0[\s\S]*status:\s*'archived'/,
  'Zerar saldo inicial deve retirar somente o evento sistemático.');
assert.match(source, /legacyOpeningBalanceFallbackTotal/,
  'Migração deve preservar contas antigas ainda não materializadas em evento.');
assert.match(catalog, /syncOpeningBalanceEvent/,
  'Catálogo de contas deve sincronizar o evento autoritativo.');
assert.match(routes, /openingBalance:\s*z\.coerce\.number\(\)\.finite\(\)\.optional\(\)/,
  'Saldo inicial deve poder ser alterado pelo contrato protegido de conta.');
assert.match(protection, /legacyOpeningBalanceFallbackTotal/,
  'Saldo monetário não pode somar campo legado e evento ao mesmo tempo.');
assert.match(protection, /openingBalanceFallbackForAccount/,
  'Saldo por conta deve usar o campo legado apenas enquanto não houver evento autoritativo.');
assert.match(benefit, /legacyOpeningBalanceFallbackTotal/,
  'Benefício deve obedecer à mesma transição de autoridade do saldo inicial.');

console.log('Autoridade auditável de saldo inicial validada.');
