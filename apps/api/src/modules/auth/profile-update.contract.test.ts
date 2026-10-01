import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('./service.ts', import.meta.url), 'utf8');

assert.match(routes, /app\.patch\('\/me\/profile'/,
  'Usuário autenticado deve possuir rota própria para atualizar o perfil.');
assert.match(routes, /preHandler:\s*app\.authenticate/,
  'Edição do próprio perfil deve exigir autenticação.');
assert.match(routes, /ownProfileSchema/,
  'Nome e telefone devem passar por validação explícita.');
assert.doesNotMatch(routes, /ownProfileSchema[\s\S]{0,500}email:/,
  'E-mail não deve ser alterado pelo editor simples de perfil.');
assert.match(service, /export async function updateOwnProfile/,
  'Serviço deve isolar a edição do próprio cadastro.');
assert.match(service, /action:\s*'PROFILE_UPDATED'/,
  'Mudança de nome ou telefone deve gerar auditoria.');
assert.match(service, /before:\s*\{ name: current\.name, phone: current\.phone/,
  'Auditoria deve preservar os valores anteriores.');
assert.match(service, /after:\s*\{ name: user\.name, phone: user\.phone/,
  'Auditoria deve registrar os novos valores.');
assert.match(service, /select:\s*\{ id: true, name: true, email: true, phone: true/,
  '/auth/me deve devolver telefone junto ao restante do perfil.');

console.log('Contrato de atualização do próprio perfil validado.');
