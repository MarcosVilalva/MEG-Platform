/** Local-only MEG Stage10 real-data preview gate. READ ONLY, no server.ts. */
import assert from 'node:assert/strict';

assert.equal(process.env.MEG_STAGE10_LOCAL_REAL_PREVIEW, '1', 'LOCAL_REAL_PREVIEW_FLAG_REQUIRED');
assert.equal(process.env.NODE_ENV, 'test', 'LOCAL_REAL_PREVIEW_TEST_ONLY');
const url = new URL(process.env.DATABASE_URL || 'postgresql://missing:missing@invalid/invalid');
assert.equal(url.protocol, 'postgresql:', 'POSTGRES_REQUIRED');
assert.equal(url.hostname, '127.0.0.1', 'LOOPBACK_REQUIRED');
assert.equal(url.port, '55448', 'PREVIEW_PORT_REQUIRED');
assert.equal(url.pathname, '/meg_stage10_local_preview', 'PREVIEW_DATABASE_REQUIRED');
assert.equal(decodeURIComponent(url.username), 'meg_stage10_preview_runtime', 'PREVIEW_ROLE_REQUIRED');
assert.ok(url.password.length >= 30, 'DEDICATED_PASSWORD_REQUIRED');
assert.ok(!url.searchParams.has('host') && !url.searchParams.has('sslmode'), 'NO_CONNECTION_OVERRIDES');

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
try {
  const identity = await prisma.$queryRaw<Array<{ db:string; role:string; port:string; host:string|null }>>`
    SELECT current_database() AS db,current_user AS role,
      current_setting('port') AS port,host(inet_server_addr()) AS host
  `;
  assert.equal(identity.length, 1);
  assert.equal(identity[0].db, 'meg_stage10_local_preview');
  assert.equal(identity[0].role, 'meg_stage10_preview_runtime');
  assert.equal(identity[0].port, '55448');
  assert.equal(identity[0].host, '127.0.0.1');
  console.log('PT49_DATABASE_IDENTITY=PASS');

  const access = await prisma.$queryRaw<Array<{
    superuser:boolean; bypassrls:boolean;
    finance_read:boolean;finance_insert:boolean;finance_update:boolean;finance_delete:boolean;
    session_insert:boolean;session_update:boolean;user_login_update:boolean;
  }>>`
    SELECT r.rolsuper AS superuser,r.rolbypassrls AS bypassrls,
      has_table_privilege(current_user,'public."FinancialEvent"','SELECT') AS finance_read,
      has_table_privilege(current_user,'public."FinancialEvent"','INSERT') AS finance_insert,
      has_table_privilege(current_user,'public."FinancialEvent"','UPDATE') AS finance_update,
      has_table_privilege(current_user,'public."FinancialEvent"','DELETE') AS finance_delete,
      has_table_privilege(current_user,'public."AuthSession"','INSERT') AS session_insert,
      has_table_privilege(current_user,'public."AuthSession"','UPDATE') AS session_update,
      has_column_privilege(current_user,'public."User"','lastLoginAt','UPDATE') AS user_login_update
    FROM pg_roles r WHERE r.rolname=current_user
  `;
  assert.equal(access.length, 1);
  assert.equal(access[0].superuser, false);
  assert.equal(access[0].bypassrls, false);
  assert.equal(access[0].finance_read, true);
  assert.equal(access[0].finance_insert, false);
  assert.equal(access[0].finance_update, false);
  assert.equal(access[0].finance_delete, false);
  assert.equal(access[0].session_insert, true);
  assert.equal(access[0].session_update, true);
  assert.equal(access[0].user_login_update, true);
  console.log('PT49_FINANCE_LEAST_PRIVILEGE=PASS');

  const [userCount,workspaceCount,accountCount,eventCount,ledgerCount] = await Promise.all([
    prisma.user.count(),prisma.workspace.count(),prisma.account.count(),
    prisma.financialEvent.count(),prisma.ledgerEntry.count()
  ]);
  assert.equal(userCount,2);
  assert.equal(workspaceCount,1);
  assert.equal(accountCount,2);
  assert.equal(eventCount,6576);
  assert.equal(ledgerCount,219);
  console.log('PT49_REAL_DATA_PRESENCE=PASS');
  console.log('PT49_COUNTS_USERS='+userCount+' WORKSPACES='+workspaceCount+' ACCOUNTS='+accountCount+' EVENTS='+eventCount+' LEDGER='+ledgerCount);
  console.log('PT49_READONLY_GATE=PASS');
} finally {
  await prisma.$disconnect();
}
