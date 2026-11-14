/**
 * Etapa 09: cold starts concorrentes e callbacks periodicos REAIS da API.
 * Exclusivo do runner GitHub Actions, PG17 novo com fixtures ficticias.
 * Nao executa contra producao, Supabase/Render ou localhost do operador.
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env, execPath } from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

const DB = 'postgresql://stage09:stage09@127.0.0.1:65431/meg_stage09_ephemeral?schema=public';
const ADMIN = 'stage09-synthetic-admin@example.invalid';
assert.equal(env.CI, 'true');
assert.equal(env.GITHUB_ACTIONS, 'true');
assert.equal(env.NODE_ENV, 'test');
assert.equal(env.DATABASE_URL, DB);
assert.equal(env.ADMIN_EMAIL, ADMIN);
for (const key of ['RESEND_API_KEY', 'BREVO_API_KEY', 'EVOLUTION_API_KEY',
  'EVOLUTION_API_URL', 'NOTIFICATION_CRON_SECRET', 'NOTIFICATION_WATCHDOG_SECRET',
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALEXA_ANNOUNCEMENT_WEBHOOK_URL']) {
  assert.ok(!env[key], 'Integracao externa inesperada');
}

const source = readFileSync(resolve('apps/api/src/server.ts'), 'utf8');
assert.match(source, /void runFinancialMaintenance\('startup'\)/);
assert.match(source, /runFinancialMaintenance\('periodic'\)/);
assert.match(source, /}, 6 \* 60 \* 60 \* 1000\)/);
assert.match(source, /const preview = await normalizationPreview\(workspace\.id, workspace\.ownerId\)/);
assert.match(source, /}, 15 \* 60 \* 1000\)/);
assert.match(source, /normalizationAuditRunning = true/);
assert.match(source, /financialMaintenanceRunning = true/);
const { prisma } = await import('@meg/database');

type EventMessage = { stage09: string; ms: number; seq?: number };
type Runner = {
  port: number;
  child: ChildProcessWithoutNullStreams;
  logs: string[];
  messages: EventMessage[];
  exited: boolean;
};

const timerProbe = resolve('scripts/meg-stage09-startup-timer-probe.mjs');
const envFor = (port: number): NodeJS.ProcessEnv => ({
  PATH: env.PATH, HOME: env.HOME,
  CI: 'true', GITHUB_ACTIONS: 'true', NODE_ENV: 'test',
  DATABASE_URL: DB, ADMIN_EMAIL: ADMIN, HOST: '127.0.0.1',
  PORT: String(port), LOG_LEVEL: 'info',
  CORS_ORIGINS: 'http://127.0.0.1:65432',
  JWT_SECRET: 'stage09-fixture-only-jwt-secret-for-concurrent-timers',
  RUN_LEGACY_REPAIR: 'false', STAGE09_TIMER_PROBE_ONLY: 'true',
});

async function until(check: () => Promise<boolean> | boolean, tag: string, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if (await check()) return; } catch { /* aguarda disponibilidade */ }
    await sleep(90);
  }
  throw new Error('STAGE09_TIMEOUT_' + tag);
}

async function get(port: number, path: string) {
  return fetch('http://127.0.0.1:' + port + path, {
    method: 'GET',
    signal: AbortSignal.timeout(1500),
  });
}
async function healthy(port: number) {
  const response = await get(port, '/health');
  assert.equal(response.status, 200);
  return (await response.json() as { financialReady: boolean }).financialReady;
}
async function start(port: number): Promise<Runner> {
  const child = spawn(execPath,
    ['--import', timerProbe, '--import', 'tsx', 'apps/api/src/server.ts'],
    { cwd: process.cwd(), env: envFor(port), stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
  );
  const runner: Runner = { port, child, logs: [], messages: [], exited: false };
  const add = (chunk: Buffer) => {
    runner.logs.push(chunk.toString('utf8'));
    if (runner.logs.join('').length > 120000) runner.logs.shift();
  };
  child.stdout.on('data', add);
  child.stderr.on('data', add);
  child.on('message', (x: EventMessage) => {
    if (x?.stage09) runner.messages.push(x);
  });
  child.on('exit', () => { runner.exited = true; });
  await until(async () => {
    if (runner.exited) throw Error('PROCESS_EXITED');
    const resp = await get(port, '/ready');
    return resp.status === 200;
  }, 'READY_' + port);
  await until(() => runner.messages.filter(x => x.stage09 === 'registered').length === 2,
    'TIMERS_REGISTERED_' + port);
  await until(() => runner.logs.join('').includes('Normalized financial source startup check completed'),
    'STARTUP_NORMALIZED_' + port);
  await until(async () => (await healthy(port)) === true, 'HEALTH_NORMALIZED_' + port);
  return runner;
}

async function stop(r: Runner) {
  if (r.exited) return;
  r.child.kill('SIGTERM');
  const untilAt = Date.now() + 5000;
  while (!r.exited && Date.now() < untilAt) await sleep(65);
  if (!r.exited) r.child.kill('SIGKILL');
  await until(() => r.exited, 'SHUTDOWN_' + r.port, 2500);
}

let sequence = 0;
async function fire(r: Runner, ms: number) {
  const seq = ++sequence;
  r.child.send({ stage09: 'fire', ms, seq });
  await until(() => r.messages.some(x => x.seq === seq && x.stage09 === 'dispatched'), 'FIRE_' + r.port + '_' + ms);
  assert.equal(r.messages.some(x => x.seq === seq && x.stage09 === 'callback_sync_failure'), false);
}

async function stateFingerprint(workspaceId: string) {
  const [state, events, budgets, payables, cards, invoices] = await Promise.all([
    prisma.appState.findUniqueOrThrow({ where: { workspaceId }, select: { state: true, revision: true } }),
    prisma.financialEvent.findMany({ where: { workspaceId }, orderBy: { id: 'asc' },
      select: { id: true, amount: true, signedAmount: true, status: true, description: true, sourcePayload: true, archivedAt: true } }),
    prisma.budget.findMany({ orderBy: { id: 'asc' }, select: { id: true, amount: true } }),
    prisma.payable.findMany({ orderBy: { id: 'asc' },
      select: { id: true, openAmount: true, totalAmount: true, recurrenceId: true, status: true } }),
    prisma.creditCard.findMany({ orderBy: { id: 'asc' }, select: { id: true, creditLimit: true } }),
    prisma.workspaceInvoice.findMany({ orderBy: { id: 'asc' }, select: { id: true, amount: true, status: true } }),
  ]);
  return JSON.stringify({
    state,
    events: events.map(x => ({ ...x, amount: x.amount.toString(), signedAmount: x.signedAmount.toString() })),
    budgets: budgets.map(x => ({ ...x, amount: x.amount.toString() })),
    payables: payables.map(x => ({ ...x, openAmount: x.openAmount.toString(), totalAmount: x.totalAmount.toString() })),
    cards: cards.map(x => ({ ...x, creditLimit: x.creditLimit.toString() })),
    invoices: invoices.map(x => ({ ...x, amount: x.amount.toString() })),
  });
}

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN } });
  assert.ok(admin && admin.name === 'SYNTHETIC_STAGE09_ONLY');
  assert.equal(await prisma.user.count(), 1);
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { ownerId: admin.id } });
  assert.equal(await prisma.workspace.count(), 1);
  const state = await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
  assert.equal((state.state as Record<string, any>).__megNormalization?.mode, 'normalized-primary');
  const baseline = await stateFingerprint(workspace.id);

  const processes: Runner[] = [];
  try {
    // Duas instancias Fastify reais, mesmos dados sinteticos, portas privadas
    // separadas; disparo simultaneo de seus cold starts.
    const both = await Promise.allSettled([start(65432), start(65433)]);
    for (const v of both) if (v.status === 'fulfilled') processes.push(v.value);
    for (const v of both) if (v.status === 'rejected') throw v.reason;
    const [first, second] = processes;
    assert.equal(await healthy(first.port), true);
    assert.equal(await healthy(second.port), true);
    assert.equal(await stateFingerprint(workspace.id), baseline,
      'Cold starts concorrentes alteraram estado financeiro sintético');

    // Auditoria periodica de 15min: divergir intencionalmente uma
    // FinancialEvent APENAS no banco efemero e observar fallback.
    const event = await prisma.financialEvent.findFirstOrThrow({
      where: { workspaceId: workspace.id, legacyTransactionId: { not: null }, archivedAt: null },
    });
    const original = { amount: event.amount.toString(), signedAmount: event.signedAmount.toString() };
    const driftAmount = (Number(event.amount) + 1).toFixed(2);
    const driftSigned = (Number(event.signedAmount) - 1).toFixed(2);
    await prisma.financialEvent.update({
      where: { id: event.id }, data: { amount: driftAmount, signedAmount: driftSigned },
    });
    await fire(first, 900000);
    await until(() => first.logs.join('').includes('Periodic normalized financial source audit detected a divergence'),
      'PERIODIC_DIVERGENCE');
    await until(async () => (await healthy(first.port)) === false, 'HEALTH_FALLBACK');
    assert.equal(await healthy(second.port), true,
      'Status runtime entre instancias nao deve ser compartilhado implicitamente');
    const drifted = await prisma.financialEvent.findUniqueOrThrow({ where: { id: event.id } });
    assert.equal(drifted.amount.toString(), driftAmount, 'Auditoria nao pode reparar automaticamente a fonte normalizada');
    await prisma.financialEvent.update({ where: { id: event.id }, data: original });
    await fire(first, 900000);
    await until(async () => (await healthy(first.port)) === true, 'HEALTH_RECOVERY');
    assert.equal(await stateFingerprint(workspace.id), baseline,
      'Auditoria periodica nao pode alterar estado depois da restauracao ficticia');

    // Manutencao de 6h: criar template APOS ambos os startups para provar
    // a periodicidade, sem esperar seis horas. Duas callbacks simultaneas
    // nao podem gerar duas parcelas com a mesma recorrencia/data.
    const recurring = await prisma.recurringExpense.create({ data: {
      userId: admin.id, description: 'SYNTHETIC PERIODIC CONCURRENCY ONLY',
      amount: '43.27', frequency: 'monthly',
      nextDueDate: new Date('2025-01-03T00:00:00.000Z'),
      endDate: new Date('2025-01-05T00:00:00.000Z'),
    } });
    assert.equal(await prisma.payable.count({ where: { recurrenceId: recurring.id } }), 0);
    await Promise.all([fire(first, 21600000), fire(second, 21600000)]);
    await until(async () => (await prisma.payable.count({ where: { recurrenceId: recurring.id } })) >= 1,
      'PERIODIC_RECURRENCE_CREATED');
    await sleep(1700); // permite concluir a segunda transacao concorrente
    const matching = await prisma.payable.findMany({ where: { recurrenceId: recurring.id } });
    assert.equal(matching.length, 1, 'Recorrencia periodica duplicada sob concorrencia');
    assert.equal(matching[0].totalAmount.toFixed(2), '43.27');
    assert.equal(matching[0].openAmount.toFixed(2), '43.27');
    assert.equal(processes.some(p => p.logs.join('').includes('Financial compatibility periodic maintenance failed')),
      false, 'Erro de manutencao concorrente registrado no startup');
    await fire(first, 21600000);
    await sleep(400);
    assert.equal(await prisma.payable.count({ where: { recurrenceId: recurring.id } }), 1);
    assert.equal(await prisma.financialEvent.count({ where: { workspaceId: workspace.id } }), 2);
    assert.equal(await prisma.budget.count(), 1);
    assert.equal((await prisma.appState.findUniqueOrThrow({ where: { workspaceId: workspace.id } })).revision, state.revision);

    console.log(JSON.stringify({
      result: 'PG17_REAL_HTTP_CONCURRENT_AND_TIMERS_PASS', isolated: true,
      real_http_instances: 2, ports: [65432, 65433],
      normalized_startup_shared_database: true, financial_snapshot_preserved_before_fixture_change: true,
      periodic_normalization_drift_detected: true, runtime_status_per_process: true,
      periodic_normalization_recovery: true, periodic_recurrence_parallel_dispatches: 2,
      recurring_payables_created: matching.length, duplicated: false,
      real_time_elapsed_six_hours: false, real_data: false,
    }));
  } finally {
    await Promise.all(processes.map(stop));
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
