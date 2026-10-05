import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');

assert.match(
  service,
  /consumeRefreshSession[\s\S]*authSession\.updateMany\([\s\S]*revokedAt: null[\s\S]*expiresAt: \{ gt: now \}/,
  'Refresh token deve ser consumido por atualização condicional atômica.'
);

assert.match(
  service,
  /if \(consumed\.count !== 1\) return null/,
  'Reutilização concorrente do mesmo refresh token deve ser rejeitada.'
);

console.log('Contrato de sessão: refresh token de uso único validado.');
