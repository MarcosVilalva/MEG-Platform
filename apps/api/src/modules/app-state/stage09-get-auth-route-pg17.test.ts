/**
 * Stage09 / issue #690: efetivamente exercita o GET /app-state do Fastify
 * com validação de autorização por workspace via banco sintético.
 * O preHandler de autenticação AQUI é simulado. Não é teste do JWT real.
 * PostgreSQL 17 descartável de CI; nenhum usuário, segredo ou dado produtivo.
 */
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { UserRole, UserStatus, prisma } from '@meg/database';
import { appStateRoutes } from './routes';

const DB = 'postgresql://ci:ci@127.0.0.1:5433/meg_stage09_egress_synthetic?schema=public';
assert.equal(process.env.CI, 'true');
assert.equal(process.env.MEG_STAGE09_SYNTHETIC_ONLY, 'YES');
assert.equal(process.env.MEG_STAGE09_PG17_WIRE_PROXY, 'YES');
assert.equal(process.env.DATABASE_URL, DB);

async function main() {
  const suffix = Date.now().toString();
  const makeUser = async (role: UserRole) => prisma.user.create({
    data: {
      name: 'STAGE09 USUARIO FICTICIO', email: `stage09-route-${suffix}-${role}-${Math.random().toString(16).slice(2)}@example.invalid`,
      passwordHash: 'NOT_A_REAL_CREDENTIAL', role, status: UserStatus.ACTIVE,
      isActive: true, approvedAt: new Date(),
    },
  });
  const ownerA = await makeUser(UserRole.ADMIN);
  const ownerB = await makeUser(UserRole.ADMIN);
  const viewer = await makeUser(UserRole.VIEWER);
  const createWorkspace = async (ownerId: string, label: string) => prisma.workspace.create({
    data: {
      name: 'Stage09 GET auth isolation ' + label,
      slug: 'stage09-get-auth-' + label + '-' + suffix,
      ownerId,
      members: { create: { userId: ownerId, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true } },
      appState: { create: {
        userId: ownerId, revision: 7,
        state: { transactions: [], budgets: {}, privateFixture: label, __megNormalization: { mode: 'normalized-primary' } },
      } },
    },
  });
  const a = await createWorkspace(ownerA.id, 'a');
  const b = await createWorkspace(ownerB.id, 'b');
  await prisma.workspaceMember.create({
    data: { workspaceId: a.id, userId: viewer.id, role: UserRole.VIEWER,
      status: UserStatus.ACTIVE, isActive: true },
  });
  const users = new Set([ownerA.id, ownerB.id, viewer.id]);

  const server = Fastify({ logger: false });
  // Simula SOMENTE a camada de autenticação para exercitar a rota real.
  server.decorate('authenticate', async (req, reply) => {
    const id = req.headers.authorization?.replace(/^Bearer /, '') || '';
    if (!users.has(id)) {
      reply.code(401).send({ error: 'TEST_UNAUTHORIZED' });
      return;
    }
    req.user = { sub: id, email: 'fixture@example.invalid',
      role: id === viewer.id ? UserRole.VIEWER : UserRole.ADMIN };
  });
  server.decorate('authorize', () => async (req, reply) => {
    await server.authenticate(req, reply);
  });
  await server.register(appStateRoutes, { prefix: '/app-state' });
  await server.ready();

  const get = async (id: string | null) => server.inject({
    method: 'GET', url: '/app-state/',
    headers: id ? { authorization: 'Bearer ' + id } : {},
  });
  const beforeFlag = process.env.MEG_STAGE09_GET_APPSTATE_CACHE;
  try {
    process.env.MEG_STAGE09_GET_APPSTATE_CACHE = 'enabled';

    const anonymous = await get(null);
    assert.equal(anonymous.statusCode, 401,
      'GET sem autenticação deve ser bloqueado antes de consultar workspace.');
    const fake = await get('usuario-nao-cadastrado');
    assert.equal(fake.statusCode, 401);

    const firstA = await get(ownerA.id);
    assert.equal(firstA.statusCode, 200);
    const jsonA = firstA.json();
    assert.equal(jsonA.workspace.id, a.id);
    assert.equal(jsonA.state.privateFixture, 'a');
    assert.equal(jsonA.shared, true);
    assert.equal(jsonA.integrity.reconciled, true);

    const secondA = await get(ownerA.id);
    assert.equal(secondA.statusCode, 200);
    assert.deepEqual(secondA.json(), jsonA,
      'GET com cache não muda contrato HTTP do proprietário.');

    const viewerA = await get(viewer.id);
    assert.equal(viewerA.statusCode, 200,
      'Membro VIEWER ativo pode ler dados do próprio workspace.');
    assert.deepEqual(viewerA.json(), jsonA,
      'Mesmo workspace deve produzir contrato idêntico ao proprietário.');

    const firstB = await get(ownerB.id);
    assert.equal(firstB.statusCode, 200);
    const jsonB = firstB.json();
    assert.equal(jsonB.workspace.id, b.id);
    assert.equal(jsonB.state.privateFixture, 'b');
    assert.notDeepEqual(jsonA.state, jsonB.state,
      'Um workspace não pode receber estado de outro.');

    const afterSwitchA = await get(ownerA.id);
    assert.equal(afterSwitchA.statusCode, 200);
    assert.deepEqual(afterSwitchA.json(), jsonA,
      'Troca de workspace não pode vazar cache ou estado do outro.');

    delete process.env.MEG_STAGE09_GET_APPSTATE_CACHE;
    const disabled = await get(ownerA.id);
    assert.equal(disabled.statusCode, 200);
    assert.deepEqual(disabled.json(), jsonA,
      'Flag ausente deve preservar resposta original integral.');
    console.log('STAGE09_AUTH_GET_ROUTE_SYNTHETIC=' + JSON.stringify({
      synthetic: true, actualFastifyGet: true, jwtAuthentication: 'mocked-only',
      realDatabaseWorkspaceResolution: true, statusAnonymous: 401,
      statusUnknownToken: 401, sameWorkspaceViewerAccess: true,
      differentWorkspaceIsolation: true, cacheEvictionSafe: true,
      disabledFlagResponseEqual: true, noProductionAccess: true,
    }));
  } finally {
    if (beforeFlag === undefined) delete process.env.MEG_STAGE09_GET_APPSTATE_CACHE;
    else process.env.MEG_STAGE09_GET_APPSTATE_CACHE = beforeFlag;
    await server.close();
    await prisma.$disconnect();
  }
}
main().catch(e => { console.error('STAGE09_AUTH_GET_ROUTE_FAILED', e); process.exitCode = 1; });
