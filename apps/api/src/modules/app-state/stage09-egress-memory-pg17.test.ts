/**
 * Etapa 09: perfil de memoria do processo Node sob cgroup de 512 MiB,
 * em PostgreSQL 17 efemero da CI. Apenas SELECT sobre fixtures ficticias.
 */
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { prisma } from '@meg/database';
import { completeDatabaseSignature } from './normalization-periodic-audit';
import { normalizationPreview } from './normalization-migration';

const DB = 'postgresql://ci:ci@127.0.0.1:5433/meg_stage09_egress_synthetic?schema=public';
assert.equal(process.env.CI, 'true');
assert.equal(process.env.MEG_STAGE09_SYNTHETIC_ONLY, 'YES');
assert.equal(process.env.MEG_STAGE09_PG17_WIRE_PROXY, 'YES');
assert.equal(process.env.DATABASE_URL, DB);
assert.equal(process.env.MEG_STAGE09_MEMORY_LIMITED, '512MB');

async function main() {
  const expected = Number(process.env.MEG_STAGE09_EXPECT_EVENTS);
  assert.ok([3630, 24000].includes(expected));
  const workspace = await prisma.workspace.findFirstOrThrow({
    where: { slug: { startsWith: 'stage09-egress-' } },
    orderBy: { createdAt: 'desc' },
  });
  assert.equal(workspace.name, 'Stage09 Disposable PostgreSQL17');
  const count = await prisma.financialEvent.count({ where: { workspaceId: workspace.id } });
  assert.equal(count, expected);
  global.gc?.();
  const initialRss = process.memoryUsage().rss;
  const t1 = performance.now();
  const digest = await completeDatabaseSignature(workspace.id);
  const hashMs = Number((performance.now() - t1).toFixed(2));
  assert.match(digest || '', /^[0-9a-f]{64}:[0-9a-f]{64}$/);
  global.gc?.();
  const afterHashRss = process.memoryUsage().rss;
  const t2 = performance.now();
  const result = await normalizationPreview(workspace.id, workspace.ownerId);
  const previewMs = Number((performance.now() - t2).toFixed(2));
  assert.equal(result.normalized.count, expected);
  if (expected === 3630) assert.equal(result.reconciled, true);
  const rss = process.memoryUsage().rss;
  console.log('STAGE09_MEMORY_CGROUP_512_RESULT=' + JSON.stringify({
    syntheticOnly: true,
    expected,
    hashMs,
    previewMs,
    reconciled: result.reconciled,
    initialRssMiB: Number((initialRss/1048576).toFixed(2)),
    afterHashRssMiB: Number((afterHashRss/1048576).toFixed(2)),
    afterPreviewRssMiB: Number((rss/1048576).toFixed(2)),
    maxRssMiB: Number((process.resourceUsage().maxRSS / 1024).toFixed(2)),
    externalDatabase: false,
  }));
}
main().catch(e => {
  console.error('STAGE09_MEMORY_CGROUP_512_FAILURE', e);
  process.exitCode = 1;
}).finally(async()=>{await prisma.$disconnect();});
