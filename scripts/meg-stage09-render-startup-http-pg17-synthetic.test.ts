/**
 * Etapa 09: caracteriza startup REAL do Fastify sobre PG17 efemero.
 * Executar APENAS no job GitHub Actions exclusivo, depois do fixture PG17
 * com dados ficticios. Proibido usar em hosts ou bases permanentes.
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { env, execPath } from 'node:process';

const DB = 'postgresql://stage09:stage09@127.0.0.1:65431/meg_stage09_ephemeral?schema=public';
const ADMIN = 'stage09-synthetic-admin@example.invalid';
const HTTP = 'http://127.0.0.1:65432';
const BLOCKED = [
  'RESEND_API_KEY', 'BREVO_API_KEY', 'EVOLUTION_API_KEY', 'EVOLUTION_API_URL',
  'NOTIFICATION_CRON_SECRET', 'NOTIFICATION_WATCHDOG_SECRET',
  'ALEXA_ANNOUNCEMENT_WEBHOOK_URL', 'ALEXA_SKILL_SECRET',
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY',
];
assert.equal(env.CI, 'true', 'GitHub Actions CI obrigatorio');
assert.equal(env.GITHUB_ACTIONS, 'true', 'Runner GitHub Actions obrigatorio');
assert.equal(env.NODE_ENV, 'test', 'Somente NODE_ENV=test');
assert.equal(env.DATABASE_URL, DB, 'DB deve ser exclusivamente PG17 efemero local');
assert.equal(env.ADMIN_EMAIL, ADMIN, 'Somente administrador ficticio');
for (const key of BLOCKED) assert.ok(!env[key], 'Variavel de integracao proibida: ' + key);

// Contract guard: o teste deve falhar se o bloco de startup ou seus timers mudar.
const serverSource = readFileSync(resolve('apps/api/src/server.ts'), 'utf8');
assert.match(serverSource, /await app\.listen\(\{ port: config\.port, host: config\.host \}\)/);
assert.match(serverSource, /await reconcilePrimaryAppStateFromNormalized\(workspace\.id\);[\s\S]*?await activateNormalizationPrimary\(workspace\.id, workspace\.ownerId, \{ automatic: true \}\)/);
assert.match(serverSource, /}, 6 \* 60 \* 60 \* 1000\)/);
assert.match(serverSource, /}, 15 \* 60 \* 1000\)/);
assert.match(serverSource, /if \(config\.runLegacyRepair\)/);

const { prisma } = await import('@meg/database');
const { activateNormalizationPrimary } = await import('../apps/api/src/modules/app-state/normalization-migration.ts');

type Started = { child: ChildProcessWithoutNullStreams; messages: string[]; exited: boolean };
const childEnvironment: NodeJS.ProcessEnv = {
  PATH: env.PATH,
  HOME: env.HOME,
  CI: 'true',
  GITHUB_ACTIONS: 'true',
  NODE_ENV: 'test',
  DATABASE_URL: DB,
  ADMIN_EMAIL: ADMIN,
  HOST: '127.0.0.1',
  PORT: '65432',
  LOG_LEVEL: 'info',
  JWT_SECRET: 'stage09-http-fixture-jwt-secret-is-only-for-testing',
  CORS_ORIGINS: HTTP,
  RUN_LEGACY_REPAIR: 'false',
  // Sem tokens, secrets externos, proxy ou credenciais herdadas.
};

async function waitUntil(predicate: () => Promise<boolean>, label: string, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { if (await predicate()) return; } catch { /* ainda inicializando */ }
    await delay(120);
  }
  throw new Error('STARTUP_TIMEOUT_' + label);
}

async function get(path: string) {
  return fetch(HTTP + path, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(1500),
  });
}

async function start(): Promise<Started> {
  const child = spawn(execPath, ['--import', 'tsx', 'apps/api/src/server.ts'], {
    cwd: process.cwd(),
    env: childEnvironment,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const p: Started = { child, messages: [], exited: false };
  const capture = (chunk: Buffer) => {
    // Saida do processo de teste: apenas logs da fixture, nao expor secrets.
    const output = chunk.toString('utf8');
    p.messages.push(output);
    if (p.messages.join('').length > 120000) p.messages.shift();
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  child.on('exit', () => { p.exited = true; });
  await waitUntil(async () => {
    if (p.exited) throw new Error('STARTUP_PROCESS_EXITED');
    const response = await get('/ready');
    if (response.status !== 200) return false;
    const data = await response.json() as { status?: string };
    return data.status === 'ready';
  }, 'READY');
  return p;
}

async function stop(p: Started) {
  if (p.exited) return;
  p.child.kill('SIGTERM');
  const deadline = Date.now() + 5000;
  while (!p.exited && Date.now() < deadline) await delay(60);
  if (!p.exited) p.child.kill('SIGKILL');
  await waitUntil(async () => p.exited, 'PROCESS_EXIT', 2000);
}

async function health() {
  const response = await get('/health');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json() as { status: string; financialReady: boolean };
  assert.equal(body.status, 'ok');
  return body.financialReady;
}

async function fingerprint(workspaceId: string) {
  const [state, events, budgets, payableCount, cardCount] = await Promise.all([
    prisma.appState.findUniqueOrThrow({ where: { workspaceId }, select: { state: true, revision: true } }),
    prisma.financialEvent.findMany({ where: { workspaceId }, orderBy: { id: 'asc' },
      select: { id: true, description: true, amount: true, signedAmount: true, status: true, archivedAt: true } }),
    prisma.budget.findMany({ orderBy: { id: 'asc' }, select: { id: true, amount: true } }),
    prisma.payable.count(), prisma.creditCard.count(),
  ]);
  return JSON.stringify({
    state: state.state, revision: state.revision,
    events: events.map(x => ({ ...x, amount: x.amount.toString(), signedAmount: x.signedAmount.toString() })),
    budgets: budgets.map(x => ({ id: x.id, amount: x.amount.toString() })),
    payableCount, cardCount,
  });
}

async function runCase(name: string, workspaceId: string, expected: {
  ready: boolean; log: string; noMutation: boolean;
}) {
  const before = await fingerprint(workspaceId);
  let process: Started | null = null;
  try {
    process = await start();
    // /ready responde antes das manutencoes do startup. Primeiro aguardar
    // o log terminal da cadeia assíncrona e somente depois conferir /health.
    await waitUntil(async () => process!.messages.join('').includes(expected.log), name + '_LOG');
    await waitUntil(async () => (await health()) === expected.ready, name + '_HEALTH');
    assert.equal(await health(), expected.ready, name + ' final health');
    const unauthorized = await get('/auth/me');
    assert.equal(unauthorized.status, 401, 'Sem autenticacao nao deve conceder sessao');
    // A API pode realizar manutencao comercial idempotente em paralelo,
    // mas estado/ledger/budget/cartao e payable devem permanecer intactos.
    await delay(300);
    if (expected.noMutation) {
      const after = await fingerprint(workspaceId);
      assert.equal(after, before, name + ' alterou dados protegidos');
    }
  } finally {
    if (process) await stop(process);
  }
}

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN } });
  assert.ok(admin && admin.name === 'SYNTHETIC_STAGE09_ONLY', 'Admin sintetico nao encontrado');
  assert.equal(await prisma.user.count(), 1, 'DB com usuarios inesperados');
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { ownerId: admin.id } });
  assert.equal(await prisma.workspace.count(), 1, 'Workspace nao sintetico');
  const row = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  const state = row.state as Record<string, unknown>;
  const metadata = state.__megNormalization as Record<string, unknown>;
  assert.equal(metadata?.mode, 'app-state-rollback', 'Fixture anterior deve terminar em rollback');

  // Real HTTP startup, rollback persistido: reconcile recusa e catch grava fallback.
  await runCase('rollback', workspace.id, {
    ready: false, log: 'Normalized financial source remained on AppState fallback', noMutation: true,
  });

  // LEGADO: somente alteracao deliberada de fixture efemera, com revision controlada.
  const { __megNormalization: _discard, ...legacy } = state;
  const legacyUpdated = await prisma.appState.updateMany({
    where: { id: row.id, revision: row.revision },
    data: { state: legacy, revision: { increment: 1 } },
  });
  assert.equal(legacyUpdated.count, 1);
  await runCase('legacy', workspace.id, {
    ready: false, log: 'Normalized financial source remained on AppState fallback', noMutation: true,
  });

  // NORMALIZADO: ativacao explicita apenas na fixture, servidor deve identificar
  // primaria reconciliada, concluir startup e preservar contagem/revision.
  const activated = await activateNormalizationPrimary(workspace.id, admin.id, { automatic: true });
  assert.equal(activated.primary, true);
  assert.equal(activated.reconciled, true);
  await runCase('normalized', workspace.id, {
    ready: true, log: 'Normalized financial source startup check completed', noMutation: true,
  });

  console.log(JSON.stringify({
    result: 'PG17_SYNTHETIC_REAL_HTTP_STARTUP_PASS',
    database: 'ephemeral_only', server_process: 'real_server_ts',
    rollback_runtime_fallback: true, legacy_runtime_fallback: true,
    normalized_runtime_ready: true, no_mutation_of_financial_fixture: true,
    http_ready_is_db_only: true, periodic_timers_registered_not_exercised: true,
    external_integrations: 'unset', real_data: false,
  }));
}
try {
  await main();
} finally {
  await prisma.$disconnect();
}
