/**
 * Etapa 09: caracteriza interpretacao da flag RUN_LEGACY_REPAIR
 * com config.ts e server.ts REAIS, exclusivamente PG17 GitHub Actions.
 * NAO altera config.ts nem repair.ts. Todos os registros sao ficticios.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { execPath, env } from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const DB = 'postgresql://stage09:stage09@127.0.0.1:65431/meg_stage09_ephemeral?schema=public';
const ADMIN = 'stage09-synthetic-admin@example.invalid';
const PORT = 65434;
assert.equal(env.CI, 'true');
assert.equal(env.GITHUB_ACTIONS, 'true');
assert.equal(env.NODE_ENV, 'test');
assert.equal(env.DATABASE_URL, DB);
assert.equal(env.ADMIN_EMAIL, ADMIN);
assert.ok(!env.RUN_LEGACY_REPAIR, 'O workflow nao pode ativar reparo legado');
for (const key of [
  'RESEND_API_KEY','BREVO_API_KEY','EVOLUTION_API_KEY','EVOLUTION_API_URL',
  'NOTIFICATION_CRON_SECRET','NOTIFICATION_WATCHDOG_SECRET',
  'ALEXA_ANNOUNCEMENT_WEBHOOK_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY',
]) assert.ok(!env[key], 'Integracao externa presente: ' + key);

const baseEnv: NodeJS.ProcessEnv = {
  PATH: env.PATH, HOME: env.HOME, CI: 'true', GITHUB_ACTIONS: 'true',
  NODE_ENV: 'test', DATABASE_URL: DB, ADMIN_EMAIL: ADMIN,
  HOST: '127.0.0.1', PORT: String(PORT), LOG_LEVEL: 'info',
  CORS_ORIGINS: 'http://127.0.0.1:65434',
  JWT_SECRET: 'stage09-synthetic-flag-configuration-characterization',
  DOTENV_CONFIG_PATH: '/dev/null',
};
const childEnv = (flag: string | undefined): NodeJS.ProcessEnv =>
  flag === undefined ? { ...baseEnv } : { ...baseEnv, RUN_LEGACY_REPAIR: flag };

function parseActualConfig(flag: string | undefined): boolean {
  const src = 'import { config } from "./apps/api/src/config.ts"; process.stdout.write(JSON.stringify({ flag: config.runLegacyRepair }));';
  const output = execFileSync(execPath, ['--import', 'tsx', '--input-type=module', '-e', src], {
    cwd: process.cwd(), env: childEnv(flag), encoding: 'utf8',
    timeout: 12000, maxBuffer: 4096,
  });
  return (JSON.parse(output) as { flag: boolean }).flag;
}

async function waitUntil(check: () => Promise<boolean> | boolean, label: string, ms = 12000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try { if (await check()) return; } catch { /* processo iniciando */ }
    await delay(80);
  }
  throw new Error('TIMEOUT_' + label);
}

type Child = { process: ChildProcessWithoutNullStreams; exited: boolean; logs: string[] };
async function start(flag: string | undefined, expectedLog: string): Promise<Child> {
  const process = spawn(execPath, ['--import', 'tsx', 'apps/api/src/server.ts'], {
    cwd: globalThis.process.cwd(), env: childEnv(flag), stdio: ['pipe','pipe','pipe'],
  });
  const child: Child = { process, exited: false, logs: [] };
  const capture = (s: Buffer) => {
    child.logs.push(s.toString('utf8'));
    if (child.logs.join('').length > 100000) child.logs.shift();
  };
  process.stdout.on('data', capture);
  process.stderr.on('data', capture);
  process.on('exit', () => { child.exited = true; });
  await waitUntil(async () => {
    if (child.exited) throw Error('PROCESS_EXITED');
    const ready = await fetch('http://127.0.0.1:' + PORT + '/ready', { signal: AbortSignal.timeout(1200) });
    return ready.status === 200;
  }, 'HTTP_READY');
  await waitUntil(() => child.logs.join('').includes(expectedLog), 'LEGACY_REPAIR_LOG');
  return child;
}

async function stop(c: Child) {
  if (c.exited) return;
  c.process.kill('SIGTERM');
  const deadline = Date.now() + 5000;
  while (!c.exited && Date.now() < deadline) await delay(80);
  if (!c.exited) c.process.kill('SIGKILL');
  await waitUntil(() => c.exited, 'STOP', 2000);
}

const { prisma } = await import('@meg/database');

async function main() {
  assert.equal(parseActualConfig(undefined), false, 'Sem flag deve ser desligado');
  assert.equal(parseActualConfig('true'), true);
  assert.equal(parseActualConfig('false'), true, 'Caracterizacao da coerce atual: string false vira true');
  assert.equal(parseActualConfig('0'), true, 'Caracterizacao da coerce atual: string 0 vira true');
  // Nao executar server quando flag true ou 0. Apenas o literal false ja
  // basta para caracterizar o risco de reparo nao solicitado.

  assert.equal(await prisma.user.count(), 1);
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN } });
  assert.equal(admin.name, 'SYNTHETIC_STAGE09_ONLY');
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { ownerId: admin.id } });
  assert.equal(await prisma.workspace.count(), 1);
  assert.equal(await prisma.importedRow.count(), 0, 'Banco fora do estado esperado');
  const event = await prisma.financialEvent.create({ data: {
    workspaceId: workspace.id, userId: admin.id,
    description: 'SYNTHETIC FLAG BEFORE',
    type: 'expense', status: 'planned',
    date: new Date('2026-11-01T00:00:00.000Z'),
    competence: '2026-11', amount: '9.99', signedAmount: '-9.99',
  } });
  const batch = await prisma.importBatch.create({ data: {
    userId: admin.id, fileName: 'synthetic-stage09-only.csv',
    fileHash: 'stage09-fixture-flag-unique-not-a-real-file',
    rowCount: 1, status: 'completed',
  } });
  await prisma.importedRow.create({ data: {
    batchId: batch.id, rowNumber: 1, eventId: event.id, status: 'imported',
    rawData: {
      DATA: '45800', DiaSemana: 'SEG', 'TP LANÇAMENTO': 'DESPESA',
      'DESCRIÇÃO': 'SYNTHETIC FLAG AFTER',
      'RECEITA($)': '', 'CLASSIFIÇÃO DA DESPESA': 'SYNTHETIC',
      GRUPO: 'SYNTHETIC',
      'DESPESA (R$)': '19,75',
      'FORMA DE PAGAMENTO': 'NAO INFORMADO',
      'SITUAÇÃO': 'PAGO',
    },
  } });

  // Start 1: flag realmente ausente, reparador desligado.
  let first: Child | null = null;
  try {
    first = await start(undefined, 'Legacy import repair disabled; simple cloud state is authoritative');
    const before = await prisma.financialEvent.findUniqueOrThrow({ where: { id: event.id } });
    assert.equal(before.amount.toFixed(2), '9.99');
    assert.equal(before.signedAmount.toFixed(2), '-9.99');
    assert.equal(before.description, 'SYNTHETIC FLAG BEFORE');
    assert.equal(before.status, 'planned');
  } finally { if (first) await stop(first); }

  // Start 2: literal "false" habilita o reparador no codigo real.
  let second: Child | null = null;
  try {
    second = await start('false', 'Optional legacy import repair completed');
    const after = await prisma.financialEvent.findUniqueOrThrow({ where: { id: event.id } });
    assert.equal(after.description, 'SYNTHETIC FLAG AFTER');
    assert.equal(after.amount.toFixed(2), '19.75');
    assert.equal(after.signedAmount.toFixed(2), '-19.75');
    assert.equal(after.status, 'paid');
    assert.notEqual(after.amount.toFixed(2), '9.99');
    assert.equal(second.logs.join('').includes('Legacy import repair disabled'), false);
  } finally { if (second) await stop(second); }

  assert.equal(await prisma.importedRow.count(), 1);
  assert.equal(await prisma.importBatch.count(), 1);
  console.log(JSON.stringify({
    result: 'PG17_LEGACY_REPAIR_FALSE_ACTIVATES_REAL_WRITER_CONFIRMED',
    config_undefined: false, config_false_string: true, config_zero_string: true,
    real_server_false_string_repair_executed: true,
    synthetic_event_mutated: true, original_amount: '9.99',
    repaired_amount: '19.75', real_data: false,
    production_not_checked: true, code_financial_unchanged: true,
  }));
}
try { await main(); }
finally { await prisma.$disconnect(); }
