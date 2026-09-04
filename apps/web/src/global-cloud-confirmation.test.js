import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const persistence = read('./instant-persistence.js');
const guard = read('./cloud-mutation-guard.js');
const history = read('./activity-history.js');
const startupProtection = read('./startup-data-protection.js');
const apiRoutes = read('../../api/src/modules/app-state/routes.ts');

assert.match(persistence, /STATE_OUTBOX_KEY = 'meg-cloud-state-properties-outbox-v1'/);
assert.match(persistence, /persistStateOutbox/);
assert.match(persistence, /ensureStateOutboxConfirmed/);
assert.match(persistence, /cloudRequest\('\/app-state\/properties'/);
assert.match(persistence, /megCloudConfirmation=1/);
assert.match(persistence, /const confirmed = await readRemoteState\(\)/);
assert.match(persistence, /matchesStateProperties\(confirmed\.state, pending\.properties\)/);
assert.match(persistence, /changedStateProperties\(previousState, nextState\)/);
assert.match(persistence, /hasProtectedState/);

assert.match(apiRoutes, /app\.patch\('\/properties'/);
assert.match(apiRoutes, /operationId: z\.string\(\)\.uuid\(\)/);
assert.match(apiRoutes, /updateMany/);
assert.match(apiRoutes, /expectedRevision/);
assert.match(startupProtection, /app-state\\\/properties/);
assert.match(startupProtection, /durable-outbox-in-progress/);
assert.match(startupProtection, /cloudConfirmationRequest/);

assert.match(guard, /MUTATION_CONTROL_SELECTOR/);
assert.match(guard, /meg:cloud-action-started/);
assert.match(guard, /previous-operation-pending/);
assert.match(guard, /stopImmediatePropagation/);
assert.match(guard, /meg-cloud-mutation-pending/);

assert.match(history, /logicalItems = new Map/);
assert.match(history, /series:/);
assert.match(history, /Alterações repetidas do mesmo lançamento aparecem consolidadas/);
assert.match(history, /historyVisibleLimit/);

console.log('global cloud confirmation and consolidated history tests passed');
