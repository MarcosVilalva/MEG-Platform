/**
 * Stage 10: explicit MANUAL GitHub Actions disposable PG17 only.
 * Administrative Prisma Client creates fake tenant fixtures.
 * The real Fastify app.inject HTTP handlers use the separate SELECT-only runtime role.
 * No import of server.ts, no automatic startup/reconcile/activate, no real user data.
 * Requires 403 with no bootstrap on AppState reads for a user without a workspace;
 * all failures stop the isolated gate instead of being accepted as expected.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fastify from 'fastify';
import {
  assertStage10ManualRunner,
  assertStage10Database
} from '../../../../../scripts/meg-stage10-runtime-disposable-guard.mjs';

assertStage10ManualRunner();
assertStage10Database(process.env.DATABASE_URL, 'meg_stage10_ci_runtime');
assertStage10Database(process.env.MEG_STAGE10_ADMIN_DATABASE_URL, 'meg_stage10_ci_admin');

const { PrismaClient, UserRole, UserStatus, prisma } = await import('@meg/database');
const { registerAuth } = await import('../../plugins/auth');
const { appStateRoutes } = await import('./routes');

const admin = new PrismaClient({
  datasources: { db: { url: process.env.MEG_STAGE10_ADMIN_DATABASE_URL! } }
});
const app = fastify({ logger: false });
const tag = 'stage10-runtime-' + randomUUID().slice(0, 12);

async function main() {
  try {
    const fixture = await admin.$transaction(async (tx) => {
      const createUser = (label: string) => tx.user.create({
        data: {
          name: 'Pessoa ficticia ' + label,
          email: tag + '-' + label + '@example.invalid',
          passwordHash: 'no-login-fixture',
          role: UserRole.VIEWER,
          status: UserStatus.ACTIVE,
          isActive: true
        }
      });
      const [a, b, isolated] = await Promise.all([
        createUser('a'), createUser('b'), createUser('sem-workspace')
      ]);
      const createWorkspace = (ownerId: string, label: string, revision: number) =>
        tx.workspace.create({
          data: {
            name: 'Workspace ficticio ' + label,
            slug: tag + '-' + label,
            ownerId,
            members: {
              create: {
                userId: ownerId,
                role: UserRole.VIEWER,
                status: UserStatus.ACTIVE,
                isActive: true
              }
            },
            appState: {
              create: {
                userId: ownerId,
                revision,
                state: { transactions: [] }
              }
            }
          }
        });
      // Avoid Promise.all in transaction for dependent mutations.
      const wa = await createWorkspace(a.id, 'a', 11);
      const wb = await createWorkspace(b.id, 'b', 29);
      return { a, b, isolated, wa, wb };
    });

    await registerAuth(app);
    await app.register(appStateRoutes, { prefix: '/app-state' });
    await app.ready();

    const fixtureEmailById = new Map([
      [fixture.a.id, fixture.a.email],
      [fixture.b.id, fixture.b.email],
      [fixture.isolated.id, fixture.isolated.email],
    ]);
    const get = async (sub?: string, url = '/app-state/revision') => {
      const email = sub ? fixtureEmailById.get(sub) : undefined;
      if (sub) assert.ok(email, 'STAGE10_UNKNOWN_FIXTURE_USER');
      return app.inject({
        method: 'GET',
        url,
        headers: sub
          ? { authorization: 'Bearer ' + app.jwt.sign({ sub, email: email!, role: UserRole.VIEWER }) }
          : undefined
      });
    };

    const anonymous = await get();
    assert.equal(anonymous.statusCode, 401, 'Missing JWT must be rejected');
    const badJwt = await app.inject({
      method: 'GET',
      url: '/app-state/revision',
      headers: { authorization: 'Bearer invalid.invalid.invalid' }
    });
    assert.equal(badJwt.statusCode, 401, 'Invalid JWT must be rejected');
    console.log('MEG_STAGE10_RUNTIME_AUTH_INVALID=PASS');

    const aa = await get(fixture.a.id);
    const bb = await get(fixture.b.id);
    assert.equal(aa.statusCode, 200, 'Tenant A must be readable');
    assert.equal(bb.statusCode, 200, 'Tenant B must be readable');
    const stateA = aa.json();
    const stateB = bb.json();
    assert.equal(stateA.revision, 11);
    assert.equal(stateB.revision, 29);
    assert.equal(stateA.workspace.id, fixture.wa.id);
    assert.equal(stateB.workspace.id, fixture.wb.id);
    assert.notEqual(stateA.workspace.id, stateB.workspace.id);
    console.log('MEG_STAGE10_RUNTIME_TENANT_SCOPED_READS=PASS');

    const counts = async () => Promise.all([
      admin.user.count(),
      admin.workspace.count(),
      admin.workspaceMember.count(),
      admin.appState.count()
    ]);
    const beforeReads = await counts();
    for (const path of ['/app-state/revision', '/app-state/', '/app-state/normalization-preview']) {
      const noContext = await get(fixture.isolated.id, path);
      assert.equal(
        noContext.statusCode, 403,
        'Authenticated user without workspace must be denied with 403 at ' + path
      );
      assert.equal(noContext.json().error, 'WORKSPACE_ACCESS_REQUIRED');
      assert.ok(
        !noContext.body.includes(fixture.wa.id) && !noContext.body.includes(fixture.wb.id),
        'No workspace identity may be disclosed to contextless user'
      );
    }
    console.log('MEG_STAGE10_RUNTIME_NO_CONTEXT_DENY=PASS');

    const sideEffectCount = await admin.workspaceMember.count({
      where: { userId: fixture.isolated.id }
    });
    assert.equal(sideEffectCount, 0, 'Read must not bootstrap user workspace');
    assert.deepEqual(await counts(), beforeReads, 'Read must not create or delete users, workspaces, members or states');
    console.log('MEG_STAGE10_RUNTIME_NO_CONTEXT_NO_MEMBERSHIP_SIDE_EFFECT=PASS');

    const privileges = await admin.$queryRawUnsafe<Array<{ has_select: boolean; has_insert: boolean; has_event_select: boolean }>>(
      'SELECT has_table_privilege(\'meg_stage10_ci_runtime\', \'public."AppState"\', \'SELECT\') AS has_select, ' +
      'has_table_privilege(\'meg_stage10_ci_runtime\', \'public."AppState"\', \'INSERT\') AS has_insert, ' +
      'has_table_privilege(\'meg_stage10_ci_runtime\', \'public."FinancialEvent"\', \'SELECT\') AS has_event_select'
    );
    assert.equal(privileges[0]?.has_select, true);
    assert.equal(privileges[0]?.has_insert, false);
    assert.equal(privileges[0]?.has_event_select, false);
    console.log('MEG_STAGE10_RUNTIME_LEAST_PRIVILEGE=PASS');
  } finally {
    await app.close();
    await Promise.allSettled([admin.$disconnect(), prisma.$disconnect()]);
  }
}
main().catch((error) => {
  console.error('MEG_STAGE10_RUNTIME_TENANT_GATE=FAIL', error instanceof Error ? error.message : 'UNKNOWN');
  process.exitCode = 1;
});
