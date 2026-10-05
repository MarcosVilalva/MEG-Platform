import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');
const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

assert.match(
  service,
  /if \(!user\) \{[\s\S]*bcrypt\.compare\(password, INVALID_LOGIN_HASH\)[\s\S]*INVALID_CREDENTIALS/,
  'Login de e-mail inexistente deve executar bcrypt e retornar credencial inválida.'
);

assert.doesNotMatch(
  routes,
  /result\.error === 'ACCOUNT_NOT_FOUND'/,
  'Rota de login não deve revelar ACCOUNT_NOT_FOUND por status HTTP.'
);

assert.match(
  routes,
  /result\.error === 'ACCESS_PENDING' \? 403 : 401/,
  'Estados administrativos podem permanecer explícitos, mas falhas de credencial devem convergir em 401.'
);

console.log('Contrato anti-enumeração do login validado.');
