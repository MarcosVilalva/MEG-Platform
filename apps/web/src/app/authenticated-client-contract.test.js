import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const auth = readFileSync(new URL('./auth-client.ts', import.meta.url), 'utf8');
assert.match(auth, /refreshInFlight/);
assert.match(auth, /\/auth\/refresh/);
assert.match(auth, /response\.status === 401/);
assert.match(auth, /AbortSignal\.timeout\(45_000\)/);

assert.match(auth, /method === 'GET' && init\?\.cache !== 'no-store'/,
  'GET de confirmação com no-store não pode ler cache autenticado.');
assert.match(auth, /if \(cacheKey\)[\s\S]*responseCache\.set\(cacheKey/,
  'GET com no-store também não pode popular o cache autenticado.');

for (const file of ['./app-state-client.ts', './cards-client.ts', './finance-client.ts', './payables-client.ts', './receivables-client.ts']) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  assert.match(source, /authenticatedRequest/);
  assert.doesNotMatch(source, /Authorization:\s*`Bearer/);
}

console.log('Clientes autenticados renovam a sessão de forma centralizada.');
