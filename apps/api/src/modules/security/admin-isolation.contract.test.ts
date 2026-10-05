import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

const auth = source('../auth/service.ts');
const workspaces = source('../workspaces/service.ts');
const integrationsRoutes = source('../integrations/routes.ts');
const integrations = source('../integrations/service.ts');
const platformRoutes = source('../platform-admin/routes.ts');
const platform = source('../platform-admin/service.ts');
const cards = source('../cards/management-routes.ts');

// Usuários e sessões não podem ser enumerados ou alterados fora do workspace do ator.
assert.match(
  auth,
  /listUsers[\s\S]*resolveWorkspaceContext\(actorId\)[\s\S]*workspaceMemberships:\s*\{\s*some:\s*\{\s*workspaceId:\s*context\.workspaceId/,
  'Listagem de usuários deve permanecer filtrada pelo workspace do ator.'
);

for (const fn of ['updateUserAccess', 'resetUserPassword', 'testUserEmail', 'deleteUserAccess']) {
  const start = auth.indexOf(`export async function ${fn}`);
  assert.ok(start >= 0, `${fn} deve existir.`);
  const next = auth.indexOf('export async function ', start + 1);
  const block = auth.slice(start, next >= 0 ? next : auth.length);
  assert.match(block, /assertSameWorkspace\(input\.actorId, input\.userId\)/, `${fn} deve validar o mesmo workspace.`);
}

assert.match(
  auth,
  /revokeAuthSession[\s\S]*resolveWorkspaceContext\(actorId\)[\s\S]*sameWorkspace[\s\S]*SESSION_NOT_FOUND/,
  'Revogação de sessão deve esconder sessões de outros workspaces.'
);

assert.match(
  workspaces,
  /assertSameWorkspace[\s\S]*workspaceId_userId:\s*\{\s*workspaceId:\s*actor\.workspaceId,\s*userId:\s*targetId/,
  'assertSameWorkspace deve usar a chave composta workspace + usuário.'
);

// Integrações são resolvidas pelo workspace autenticado, nunca por workspaceId vindo do request.
assert.doesNotMatch(
  integrationsRoutes,
  /workspaceId\s*:\s*z\./,
  'Rotas de integrações não devem aceitar workspaceId arbitrário do cliente.'
);
assert.match(
  integrations,
  /workspaceIntegrationForUser[\s\S]*resolveWorkspaceContext\(userId\)[\s\S]*workspaceId:\s*context\.workspaceId/,
  'Leitura de integração deve usar o workspace resolvido do usuário.'
);
assert.match(
  integrations,
  /saveWorkspaceIntegration[\s\S]*resolveWorkspaceContext\(userId\)[\s\S]*context\.membership\.role !== 'ADMIN'/,
  'Alteração de integração deve exigir ADMIN do workspace resolvido.'
);
assert.match(
  integrations,
  /evolutionApiKeyConfigured:\s*Boolean\(stored\?\.evolutionApiKeyEncrypted\)/,
  'API key da Evolution não pode ser devolvida ao frontend.'
);
assert.doesNotMatch(
  integrations,
  /return\s*\{[^}]*evolutionApiKeyEncrypted/s,
  'Material criptografado da API key não deve sair no DTO público.'
);

// Administração comercial é um domínio global e precisa de gate próprio, não apenas role ADMIN do workspace.
for (const route of [
  "app.get('/workspaces'",
  "app.post('/workspaces/:id/invoices'",
  "app.patch('/invoices/:id'",
  "app.patch('/workspaces/:id/license'",
]) {
  const line = platformRoutes.split('\n').find((value) => value.includes(route));
  assert.ok(line?.includes('preHandler: platformGuard'), `${route} deve permanecer atrás de platformGuard.`);
}
assert.match(
  platform,
  /updateCommercialLicense[\s\S]*assertPlatformAdministrator\(input\.actorId\)/,
  'Alteração de licença deve repetir a autorização no serviço.'
);

// IDs de cartão são sempre combinados com o proprietário financeiro do workspace.
// Isso impede um ID válido de outro tenant de virar acesso horizontal.
for (const fragment of [
  /creditCard\.findFirst\(\{\s*where:\s*\{\s*id:\s*params\.data\.id,\s*userId:\s*ownerId/,
]) {
  const matches = cards.match(new RegExp(fragment.source, 'g')) || [];
  assert.ok(matches.length >= 3, 'Mutação de cartão deve filtrar id + ownerId em update/deactivate/reactivate.');
}

console.log('Contrato anti-IDOR administrativo e isolamento entre workspaces validado.');
