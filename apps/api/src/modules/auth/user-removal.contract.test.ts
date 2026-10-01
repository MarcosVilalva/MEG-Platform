import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');

assert.match(routes, /app\.delete\('\/users\/:id'/,
  'Administração deve manter rota explícita para remoção de usuário.');
assert.match(routes, /app\.authorize\(\['ADMIN'\]\)/,
  'Remoção de usuário deve permanecer restrita a ADMIN.');
assert.match(service, /PRIMARY_ADMIN_CANNOT_BE_DELETED/,
  'Administrador principal não pode ser removido.');
assert.match(service, /CANNOT_DELETE_OWN_ACCESS/,
  'Administrador não pode excluir a própria conta.');
assert.match(service, /USER_MUST_BE_INACTIVE_BEFORE_DELETE/,
  'Usuário ativo deve ser bloqueado ou rejeitado antes da exclusão definitiva.');
assert.match(service, /action:\s*'ACCESS_DELETED'/,
  'Remoção deve deixar trilha explícita de auditoria.');
assert.match(service, /financialEvent\.updateMany[\s\S]*userId:\s*null/,
  'Histórico financeiro deve ser desvinculado do usuário antes da exclusão, não apagado.');

console.log('Contrato de remoção administrativa de usuário validado.');
