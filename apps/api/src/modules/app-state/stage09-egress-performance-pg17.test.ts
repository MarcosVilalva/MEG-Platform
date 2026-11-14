/**
 * Stage09: benchmark de CPU/tempo/buffers/escala em PostgreSQL 17 descartável.
 * Lê somente uma fixture sintética criada no mesmo job de CI. Nenhum dado real.
 * O tempo "Execution Time" do EXPLAIN ANALYZE é tempo de execução do servidor,
 * NÃO percentual de CPU; RSS medido é do processo Node, NÃO do PostgreSQL.
 */
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { Prisma, prisma } from '@meg/database';
import { completeDatabaseSignature } from './normalization-periodic-audit';
import { normalizationPreview } from './normalization-migration';

const LOCAL = 'postgresql://ci:ci@127.0.0.1:5433/meg_stage09_egress_synthetic?schema=public';
assert.equal(process.env.CI, 'true', 'Apenas GitHub CI');
assert.equal(process.env.MEG_STAGE09_SYNTHETIC_ONLY, 'YES');
assert.equal(process.env.MEG_STAGE09_PG17_WIRE_PROXY, 'YES');
assert.equal(process.env.DATABASE_URL, LOCAL);

const MONITOR = 'http://127.0.0.1:5434';
const payloadFiller = 'P'.repeat(512);
const originalDigestQuery = (workspaceId: string) => Prisma.sql`
  SELECT
    (SELECT encode(sha256(convert_to(to_jsonb(a)::text, 'UTF8')), 'hex')
     FROM "AppState" a WHERE a."workspaceId" = ${workspaceId}) AS "stateDigest",
    encode(sha256(convert_to(COALESCE((
      SELECT jsonb_agg(to_jsonb(e) ORDER BY e."id")::text
      FROM "FinancialEvent" e WHERE e."workspaceId" = ${workspaceId}
    ), '[]'), 'UTF8')), 'hex') AS "eventDigest"
`;

// Variante adotada na branch experimental após a medição inicial.
// Agrega hashes de tamanho fixo em vez de formar JSONB grande.
// A execução é restrita ao mesmo PostgreSQL 17 descartável.
const streamedDigestQuery = (workspaceId: string) => Prisma.sql`
  SELECT
    (SELECT encode(sha256(convert_to(to_jsonb(a)::text, 'UTF8')), 'hex')
     FROM "AppState" a WHERE a."workspaceId" = ${workspaceId}) AS "stateDigest",
    encode(sha256(convert_to(COALESCE((
      SELECT string_agg(
        encode(sha256(convert_to(to_jsonb(e)::text, 'UTF8')), 'hex'),
        '' ORDER BY e."id"
      )
      FROM "FinancialEvent" e WHERE e."workspaceId" = ${workspaceId}
    ), ''), 'UTF8')), 'hex') AS "eventDigest"
`;

type DbDigest = { stateDigest: string | null; eventDigest: string };
type Plan = { 'QUERY PLAN': Array<{ Plan: Record<string, unknown>; 'Execution Time': number; 'Planning Time': number }> };
function obj(v: unknown): Record<string, unknown> {
  assert.ok(v && typeof v === 'object' && !Array.isArray(v));
  return v as Record<string, unknown>;
}
async function wireReset() {
  const x = await fetch(MONITOR + '/reset', { method: 'POST' });
  assert.equal(x.status, 200);
}
async function wireBytes() {
  const x = await fetch(MONITOR + '/stats');
  assert.equal(x.status, 200);
  const v = await x.json() as { serverToClientBytes: number };
  return v.serverToClientBytes;
}
const median = (a: number[]) => {
  const s = [...a].sort((a, b) => a - b);
  return Number(s[Math.floor(s.length / 2)].toFixed(3));
};
function planTotals(node: Record<string, unknown>) {
  let sharedHit = 0;
  let sharedRead = 0;
  let tempRead = 0;
  let tempWritten = 0;
  const walk = (v: Record<string, unknown>) => {
    sharedHit = Math.max(sharedHit, Number(v['Shared Hit Blocks'] || 0));
    sharedRead = Math.max(sharedRead, Number(v['Shared Read Blocks'] || 0));
    tempRead = Math.max(tempRead, Number(v['Temp Read Blocks'] || 0));
    tempWritten = Math.max(tempWritten, Number(v['Temp Written Blocks'] || 0));
    for (const c of (v.Plans || []) as Record<string, unknown>[]) walk(c);
  };
  walk(node);
  return { sharedHit, sharedRead, tempRead, tempWritten };
}
async function explainSample(query: Prisma.Sql) {
  const rows = await prisma.$queryRaw<Plan[]>(Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
  const plan = rows[0]?.['QUERY PLAN']?.[0];
  assert.ok(plan);
  return { ms: Number(plan['Execution Time']), ...planTotals(plan.Plan) };
}
async function digestWire(query: Prisma.Sql) {
  await wireReset();
  const rows = await prisma.$queryRaw<DbDigest[]>(query);
  assert.equal(rows.length, 1);
  assert.match(rows[0].eventDigest, /^[0-9a-f]{64}$/);
  return { digest: rows[0], bytes: await wireBytes() };
}
async function extendFixture(workspaceId: string, userId: string, target: number) {
  const currentCount = await prisma.financialEvent.count({ where: { workspaceId } });
  assert.ok(currentCount <= target);
  if (currentCount === target) return;
  const stored = await prisma.appState.findUniqueOrThrow({ where: { workspaceId } });
  const state = obj(stored.state);
  const txns = Array.isArray(state.transactions) ? [...state.transactions] : [];
  const base = new Date('2026-11-10T12:00:00.000Z');
  const buffer: Prisma.FinancialEventCreateManyInput[] = [];
  const flush = async () => {
    if (!buffer.length) return;
    const out = await prisma.financialEvent.createMany({ data: buffer, skipDuplicates: false });
    assert.equal(out.count, buffer.length);
    buffer.length = 0;
  };
  for (let i = currentCount; i < target; i += 1) {
    const id = 'stage09-perf-event-' + i.toString().padStart(6, '0');
    const legacyId = 'stage09-perf-legacy-' + i.toString().padStart(6, '0');
    const payload = {
      id: legacyId, date: '2026-11-10', description: 'CARGA FICTICIA ' + i,
      type: 'expense', amount: 2.37, expenseAmount: 2.37, status: 'paid',
      situation: 'PAGO', filler: payloadFiller,
    };
    txns.push(payload);
    buffer.push({
      id, workspaceId, userId, legacyTransactionId: legacyId,
      date: base, competence: '2026-11', description: payload.description,
      type: 'expense', status: 'paid', amount: 2.37, signedAmount: -2.37,
      sourcePayload: payload as Prisma.InputJsonValue,
      sourceRevision: stored.revision,
    });
    if (buffer.length >= 300) await flush();
  }
  await flush();
  await prisma.appState.update({
    where: { workspaceId },
    data: { state: { ...state, transactions: txns } as Prisma.InputJsonValue },
  });
  assert.equal(await prisma.financialEvent.count({ where: { workspaceId } }), target);
}
async function main() {
  const workspace = await prisma.workspace.findFirstOrThrow({
    where: { slug: { startsWith: 'stage09-egress-' } },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(workspace.name.includes('Stage09 Disposable'));
  const results = [];
  for (const target of [3630, 12000, 24000]) {
    await extendFixture(workspace.id, workspace.ownerId, target);
    const originalSql = originalDigestQuery(workspace.id);
    const streamedSql = streamedDigestQuery(workspace.id);

    const originalWire = await digestWire(originalSql);
    const streamedWire = await digestWire(streamedSql);
    assert.equal(originalWire.digest.stateDigest, streamedWire.digest.stateDigest,
      'Ambas representam a mesma linha AppState.');
    const actual = await completeDatabaseSignature(workspace.id);
    assert.equal(actual, streamedWire.digest.stateDigest + ':' + streamedWire.digest.eventDigest,
      'A consulta SHA por linha medida deve corresponder à função adotada no código experimental.');

    // Warmup para não comparar tempo de inicialização do Node/Prisma.
    await explainSample(originalSql);
    await explainSample(streamedSql);
    const originalPlans = [];
    const streamPlans = [];
    for (let i = 0; i < 3; i += 1) {
      originalPlans.push(await explainSample(originalSql));
      streamPlans.push(await explainSample(streamedSql));
    }
    await wireReset();
    const t0 = performance.now();
    await normalizationPreview(workspace.id, workspace.ownerId);
    const fullPreviewMs = Number((performance.now() - t0).toFixed(3));
    const fullPreviewBytes = await wireBytes();
    assert.ok(fullPreviewBytes > originalWire.bytes);

    const tConcurrent = performance.now();
    await Promise.all(Array.from({ length: 4 }, () => completeDatabaseSignature(workspace.id)));
    const concurrentFourWallMs = Number((performance.now() - tConcurrent).toFixed(3));

    results.push({
      totalSyntheticRows: target,
      originalDigest: {
        medianServerExecutionMs: median(originalPlans.map(x => x.ms)),
        maxTempWrittenBlocks: Math.max(...originalPlans.map(x=>x.tempWritten)),
        maxTempReadBlocks: Math.max(...originalPlans.map(x=>x.tempRead)),
        bytesServerToClient: originalWire.bytes,
      },
      rowHashedDigestCandidate: {
        medianServerExecutionMs: median(streamPlans.map(x => x.ms)),
        maxTempWrittenBlocks: Math.max(...streamPlans.map(x=>x.tempWritten)),
        maxTempReadBlocks: Math.max(...streamPlans.map(x=>x.tempRead)),
        bytesServerToClient: streamedWire.bytes,
      },
      fullPreview: { totalClientWallMs: fullPreviewMs, bytesServerToClient: fullPreviewBytes },
      fourParallelCurrentDigestsWallMs: concurrentFourWallMs,
      nodeRssMiB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    });
    console.log('STAGE09_PERFORMANCE_PHASE=' + JSON.stringify(results[results.length - 1]));
  }

  // A assinatura deve mudar após edição de qualquer campo, mesmo não financeiro.
  const id = 'stage09-perf-event-023999';
  const unchanged = await completeDatabaseSignature(workspace.id);
  await prisma.financialEvent.update({ where: { id }, data: { notes: 'EDITADO SOMENTE NA CI' } });
  const changed = await completeDatabaseSignature(workspace.id);
  assert.notEqual(changed, unchanged);
  console.log('STAGE09_PERFORMANCE_RESULT=' + JSON.stringify({
    syntheticOnly: true,
    targets: results.map(x => x.totalSyntheticRows),
    results,
    mutatedFieldDetected: true,
    pg17Ephemeral: true,
    noProductionAccess: true,
  }));
}
main().catch(e => {
  console.error('STAGE09_PERFORMANCE_FAILED', e);
  process.exitCode = 1;
}).finally(async()=>{ await prisma.$disconnect(); });
