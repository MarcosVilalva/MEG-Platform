import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const auth = readFileSync(new URL('./auth-client.ts', import.meta.url), 'utf8');
assert.match(auth, /refreshInFlight/);
assert.match(auth, /\/auth\/refresh/);
assert.match(auth, /response\.status === 401/);
assert.match(auth, /AbortSignal\.timeout\(45_000\)/);

for (const file of ['./app-state-client.ts', './cards-client.ts', './finance-client.ts', './payables-client.ts', './receivables-client.ts']) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  assert.match(source, /authenticatedRequest/);
  assert.doesNotMatch(source, /Authorization:\s*`Bearer/);
}

console.log('Clientes autenticados renovam a sessão de forma centralizada.');
