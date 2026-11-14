/**
 * Etapa 09: leitura Prisma real e medição de bytes no protocolo PostgreSQL.
 * Somente CI, PostgreSQL 17 EFÊMERO, dados inteiramente sintéticos.
 * A proteção é verificada ANTES de qualquer acesso ao banco.
 */
import assert from 'node:assert/strict';
import { Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { normalizationPreview } from './normalization-migration';
import { periodicNormalizationPreview } from './normalization-periodic-audit';
import { buildNormalizationPreview } from './normalization-migration-core';
import {
  NORMALIZED_LEGACY_MIRROR_SELECT,
  mirrorFinancialEventToLegacyTransaction,
  normalizedMirrorNeedsSourceRefresh,
  reconcilePrimaryAppStateFromNormalized,
} from './normalized-primary-writeback';

const DB_URL = 'postgresql://ci:ci@127.0.0.1:5433/meg_stage09_egress_synthetic?schema=public';
const MONITOR = 'http://127.0.0.1:5434';
const EVENT_COUNT = 3630;

function guardDisposable() {
  assert.equal(process.env.CI, 'true');
  assert.equal(process.env.MEG_STAGE09_SYNTHETIC_ONLY, 'YES');
  assert.equal(process.env.MEG_STAGE09_PG17_WIRE_PROXY, 'YES');
  assert.equal(process.env.DATABASE_URL, DB_URL);
}

function record(value: unknown): Record<string, unknown> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}

type Traffic = {
  serverToClientBytes: number;
  clientToServerBytes: number;
  connections: number;
};

async function resetWire() {
  const response = await fetch(`${MONITOR}/reset`, { method: 'POST', signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200);
}

async function wireStats(): Promise<Traffic> {
  const response = await fetch(`${MONITOR}/stats`, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200);
  return await response.json() as Traffic;
}

async function main() {
  guardDisposable();

  const suffix = `${Date.now()}-synthetic`;
  const user = await prisma.user.create({
    data: {
      name: 'MEG STAGE09 FICTICIO',
      email: `stage09-egress-${suffix}@example.invalid`,
      passwordHash: 'FICTIONAL-NOT-A-PASSWORD',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      approvedAt: new Date(),
    },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Stage09 Disposable PostgreSQL17',
      slug: `stage09-egress-${suffix}`,
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: UserRole.ADMIN, status: UserStatus.ACTIVE, isActive: true },
      },
      appState: {
        create: { userId: user.id, state: { transactions: [] }, revision: 20 },
      },
    },
  });
  const [method, account] = await Promise.all([
    prisma.paymentMethod.create({
      data: { userId: user.id, name: 'PIX SINTETICO', type: 'instant' },
    }),
    prisma.account.create({
      data: { userId: user.id, name: 'CONTA SINTETICA', type: 'CHECKING', openingBalance: 0 },
    }),
  ]);

  const payloads: Record<string, unknown>[] = [];
  const batch: Prisma.FinancialEventCreateManyInput[] = [];
  const insertedIds: string[] = [];

  for (let i = 0; i < EVENT_COUNT; i += 1) {
    const type = i % 7 === 0 ? 'income' : 'expense';
    const isRefund = type === 'expense' && i % 53 === 0;
    const amount = Number((((i % 870) + 100) / 100).toFixed(2));
    const signed = type === 'income' ? amount : isRefund ? amount : -amount;
    const entered = isRefund ? -amount : amount;
    const legacyTransactionId = `synthetic-legacy-${i.toString().padStart(4, '0')}`;
    const description = `LANCAMENTO FICTICIO ${i}`;
    const date = '2026-11-10';
    const payload = {
      id: legacyTransactionId,
      date,
      description,
      type,
      status: 'paid',
      situation: type === 'income' ? 'RECEBIDO' : 'PAGO',
      amount: entered,
      ...(type === 'income' ? { incomeAmount: amount } : { expenseAmount: amount }),
      financialAccountId: account.id,
      paymentMethod: method.name,
      notes: '',
      filler: 'S'.repeat(512),
    };
    const id = `stage09-synthetic-event-${i.toString().padStart(4, '0')}`;
    insertedIds.push(id);
    payloads.push(payload);
    batch.push({
      id,
      userId: user.id,
      workspaceId: workspace.id,
      legacyTransactionId,
      date: new Date('2026-11-10T12:00:00.000Z'),
      competence: '2026-11',
      description,
      type,
      status: 'paid',
      amount,
      signedAmount: signed,
      notes: null,
      sourcePayload: payload as Prisma.InputJsonValue,
      sourceRevision: 20,
      amountBehavior: 'NORMAL',
      necessity: 'ESSENTIAL',
      frequency: 'ONE_TIME',
      classificationConfidence: 0.95,
      classificationSource: 'SYNTHETIC_ONLY',
      accountId: account.id,
      paymentMethodId: method.id,
    });
  }
  const expectedPreview = buildNormalizationPreview(
    { transactions: payloads },
    { workspaceId: workspace.id, userId: user.id, revision: 20 },
  );
  assert.equal(expectedPreview.summary.validCount, EVENT_COUNT);
  assert.equal(expectedPreview.summary.invalidCount, 0);
  for (let i = 0; i < EVENT_COUNT; i += 1) {
    const normalized = expectedPreview.events[i];
    batch[i].amountBehavior = normalized.amountBehavior;
    batch[i].necessity = normalized.necessity;
    batch[i].frequency = normalized.frequency;
    batch[i].classificationConfidence = normalized.classificationConfidence;
    batch[i].classificationSource = normalized.classificationSource;
  }

  for (let start = 0; start < batch.length; start += 250) {
    const created = await prisma.financialEvent.createMany({ data: batch.slice(start, start + 250) });
    assert.equal(created.count, Math.min(250, batch.length - start));
  }

  const state = { transactions: payloads, budgets: {}, __megNormalization: { mode: 'normalized-primary' } };
  await prisma.appState.update({
    where: { workspaceId: workspace.id },
    data: { state: state as Prisma.InputJsonValue },
  });
  await prisma.ledgerEntry.createMany({
    data: [
      { eventId: insertedIds[0], accountId: account.id, date: new Date('2026-11-10T12:00:00.000Z'), debit: Number(batch[0].amount), credit: 0 },
      { eventId: insertedIds[1], accountId: account.id, date: new Date('2026-11-10T12:00:00.000Z'), debit: 0, credit: Number(batch[1].amount) },
    ],
  });
  const ledgerBefore = await prisma.ledgerEntry.findMany({
    where: { eventId: { in: insertedIds.slice(0, 2) } },
    orderBy: { id: 'asc' },
  });
  assert.equal(ledgerBefore.length, 2);

  const where = {
    workspaceId: workspace.id,
    legacyTransactionId: { not: null },
    archivedAt: null,
  };

  // Uma leitura completa e outra projetada, nos mesmos dados, com contador
  // de bytes efetivamente enviados pelo servidor PostgreSQL ao Prisma.
  await resetWire();
  const full = await prisma.financialEvent.findMany({
    where,
    include: { paymentMethod: { select: { name: true } } },
  });
  const fullWire = await wireStats();

  await resetWire();
  const projected = await prisma.financialEvent.findMany({
    where,
    select: NORMALIZED_LEGACY_MIRROR_SELECT,
  });
  const projectedWire = await wireStats();

  await resetWire();
  const periodicPreview = await normalizationPreview(workspace.id, user.id);
  const periodicWire = await wireStats();
  assert.equal(periodicPreview.reconciled, true, 'A auditoria periodica deve conciliar dados ficticios validos.');
  assert.equal(periodicPreview.normalized.count, EVENT_COUNT);
  assert.equal(periodicPreview.source.fingerprint, expectedPreview.summary.fingerprint);
  assert.ok(periodicWire.serverToClientBytes > projectedWire.serverToClientBytes,
    'Auditoria periodica busca AppState e todos os eventos com seu payload.');
  // Auditoria periódica experimental: 1ª leitura completa, 2ª sem
  // mudanças transmite somente os SHA-256 calculados no PG17.
  await resetWire();
  const initialPeriodic = await periodicNormalizationPreview(workspace.id, user.id, normalizationPreview);
  const initialPeriodicWire = await wireStats();
  assert.deepEqual(initialPeriodic, periodicPreview,
    'Primeira auditoria com digest preserva integralmente o preview original.');
  assert.ok(initialPeriodicWire.serverToClientBytes > 0,
    'Primeira auditoria deve de fato consultar o PostgreSQL.');

  await resetWire();
  const cachedPeriodic = await periodicNormalizationPreview(workspace.id, user.id, normalizationPreview);
  const cachedPeriodicWire = await wireStats();
  console.log('STAGE09_PERIODIC_DIGEST_WIRE_DIAG=' + JSON.stringify({ baseline: periodicWire.serverToClientBytes, initial: initialPeriodicWire.serverToClientBytes, unchanged: cachedPeriodicWire.serverToClientBytes }));
  assert.deepEqual(cachedPeriodic, periodicPreview,
    'Resumo completo e fingerprint devem ser identicos sem nenhuma mudança.');
  assert.ok(cachedPeriodicWire.serverToClientBytes > 0,
    'Consulta de digest precisa chegar ao banco, nunca confiar apenas no processo.');
  assert.ok(cachedPeriodicWire.serverToClientBytes < periodicWire.serverToClientBytes / 10,
    'Assinatura completa no servidor deve economizar mais de 90% dos bytes neste caso ficticio.');

  // Drift externo: editar diretamente coluna financeira, sem AppState/revision.
  await prisma.financialEvent.update({
    where: { id: insertedIds[2] },
    data: { notes: 'ALTERACAO EXTERNA SINTETICA' },
  });
  const externalDrift = await periodicNormalizationPreview(workspace.id, user.id, normalizationPreview);
  assert.equal(externalDrift.reconciled, false,
    'Alteracao externa em evento precisa invalidar cache e acionar auditoria completa.');
  assert.notEqual(externalDrift.source.fingerprint, externalDrift.normalized.fingerprint);
  await prisma.financialEvent.update({
    where: { id: insertedIds[2] },
    data: { notes: null },
  });
  const recoveredPeriodic = await periodicNormalizationPreview(workspace.id, user.id, normalizationPreview);
  assert.equal(recoveredPeriodic.reconciled, true, 'Restauracao sintetica exige nova conciliacao.');

  // Modificar campo que nao entra no fingerprint tambem invalida o cache.
  const extraState = { ...state, budgets: { alteredOutsideApi: true } };
  await prisma.appState.update({
    where: { workspaceId: workspace.id },
    data: { state: extraState as Prisma.InputJsonValue },
  });
  await resetWire();
  const changedNonFinancialState = await periodicNormalizationPreview(workspace.id, user.id, normalizationPreview);
  const changedNonFinancialWire = await wireStats();
  assert.equal(changedNonFinancialState.reconciled, true);
  assert.ok(changedNonFinancialWire.serverToClientBytes > cachedPeriodicWire.serverToClientBytes * 10,
    'Alteracao de state nao pode reutilizar fingerprint cacheado.');
  await prisma.appState.update({
    where: { workspaceId: workspace.id },
    data: { state: state as Prisma.InputJsonValue },
  });
  assert.equal((await periodicNormalizationPreview(workspace.id, user.id, normalizationPreview)).reconciled, true);


  assert.equal(full.length, EVENT_COUNT);
  assert.equal(projected.length, EVENT_COUNT);
  const fullByLegacy = new Map(full.map((event) => [event.legacyTransactionId, event]));
  const projectedByLegacy = new Map(projected.map((event) => [event.legacyTransactionId, event]));
  assert.deepEqual([...fullByLegacy.keys()].sort(), [...projectedByLegacy.keys()].sort());

  for (const [legacyId, original] of fullByLegacy) {
    const selected = projectedByLegacy.get(legacyId);
    assert.ok(selected, `Evento ficticio ausente: ${legacyId}`);
    const oldMirror = mirrorFinancialEventToLegacyTransaction(original);
    const newMirror = mirrorFinancialEventToLegacyTransaction(selected);
    assert.deepEqual(newMirror, oldMirror, 'Projecao deve reconstruir o mesmo evento legado');
    assert.equal(
      normalizedMirrorNeedsSourceRefresh(original, oldMirror),
      normalizedMirrorNeedsSourceRefresh(selected, newMirror),
      'O teste de integridade de payload nao pode mudar',
    );
  }

  const syntheticChange = record(projected[0].sourcePayload);
  const divergent = { ...projected[0], sourcePayload: { ...syntheticChange, status: 'pending' } };
  assert.equal(
    normalizedMirrorNeedsSourceRefresh(divergent, mirrorFinancialEventToLegacyTransaction(divergent)),
    true,
    'Alteracao ficticia nao pode ser ocultada pela projecao.',
  );

  assert.ok(fullWire.serverToClientBytes > 0);
  assert.ok(projectedWire.serverToClientBytes > 0);
  assert.ok(
    projectedWire.serverToClientBytes < fullWire.serverToClientBytes,
    'Select deve reduzir os bytes reais retornados pelo PostgreSQL nesta leitura.',
  );

  // Caracterização da rotina anterior continua após os ensaios de cache.
  // Idempotencia: estado original e rows ja conciliados nao devem mudar.
  const unchanged = await reconcilePrimaryAppStateFromNormalized(workspace.id, { expectedRevision: 20 });
  assert.equal(unchanged.active, true);
  assert.equal(unchanged.changed, false);
  assert.equal(unchanged.revision, 20);

  // Arquivado + orfao devem ser removidos. Eles NAO podem ser recriados.
  await prisma.financialEvent.update({
    where: { id: insertedIds[0] },
    data: { archivedAt: new Date('2026-11-11T12:00:00.000Z') },
  });
  const orphan = { ...payloads[0], id: 'synthetic-orphan-transaction' };
  await prisma.appState.update({
    where: { workspaceId: workspace.id },
    data: { state: { ...state, transactions: [...payloads, orphan] } as Prisma.InputJsonValue },
  });

  const archivedPeriodic = await periodicNormalizationPreview(workspace.id, user.id, normalizationPreview);
  assert.equal(archivedPeriodic.reconciled, false,
    'Evento arquivado externamente deve invalidar cache e exigir reconciliação completa.');

  const reconciled = await reconcilePrimaryAppStateFromNormalized(workspace.id, {
    expectedRevision: 20,
    actorId: user.id,
  });
  assert.equal(reconciled.active, true);
  assert.equal(reconciled.changed, true);
  assert.equal(reconciled.removedLegacyIds, 2);
  assert.equal(reconciled.revision, 21);

  const after = await prisma.appState.findUniqueOrThrow({
    where: { workspaceId: workspace.id },
    select: { revision: true, state: true },
  });
  const afterTransactions = record(after.state).transactions;
  assert.ok(Array.isArray(afterTransactions));
  assert.equal(afterTransactions.length, EVENT_COUNT - 1);
  assert.ok(!afterTransactions.some((tx) => tx && typeof tx === 'object'
    && ['synthetic-orphan-transaction', payloads[0].id].includes((tx as { id?: string }).id ?? '')));
  assert.equal(await prisma.auditLog.count({
    where: { userId: user.id, action: 'NORMALIZATION_PRIMARY_RECONCILED' },
  }), 1);

  await assert.rejects(
    reconcilePrimaryAppStateFromNormalized(workspace.id, { expectedRevision: 20 }),
    /NORMALIZATION_REVISION_CONFLICT/,
    'Revisao obsoleta deve ser recusada.',
  );

  // Transacao abortada: nenhuma mutacao ou revisao pode vazar.
  await assert.rejects(async () => {
    await prisma.$transaction(async (tx) => {
      await tx.appState.update({
        where: { workspaceId: workspace.id },
        data: { revision: { increment: 1 } },
      });
      throw new Error('SYNTHETIC_ROLLBACK');
    });
  }, /SYNTHETIC_ROLLBACK/);
  const rollbackState = await prisma.appState.findUniqueOrThrow({
    where: { workspaceId: workspace.id },
    select: { revision: true },
  });
  assert.equal(rollbackState.revision, 21, 'Rollback nao pode alterar a revisao.');
  const ledgerAfter = await prisma.ledgerEntry.findMany({
    where: { eventId: { in: insertedIds.slice(0, 2) } },
    orderBy: { id: 'asc' },
  });
  assert.deepEqual(ledgerAfter, ledgerBefore, 'Reconciliação nao pode alterar o Ledger.');

  // Escritas concorrentes sobre revisao fixa: apenas uma e vencedora.
  const afterRecord = record(after.state);
  const concurrentOrphan = { ...payloads[0], id: 'synthetic-concurrency-orphan' };
  await prisma.appState.update({
    where: { workspaceId: workspace.id },
    data: {
      state: { ...afterRecord, transactions: [...afterTransactions, concurrentOrphan] } as Prisma.InputJsonValue,
    },
  });
  const outcomes = await Promise.allSettled([
    reconcilePrimaryAppStateFromNormalized(workspace.id, { expectedRevision: 21 }),
    reconcilePrimaryAppStateFromNormalized(workspace.id, { expectedRevision: 21 }),
  ]);
  assert.equal(outcomes.filter((x) => x.status === 'fulfilled').length, 1,
    'Somente uma reconciliacao concorrente pode vencer na mesma revisao.');
  const finalState = await prisma.appState.findUniqueOrThrow({
    where: { workspaceId: workspace.id },
    select: { revision: true, state: true },
  });
  assert.equal(finalState.revision, 22);
  const finalTransactions = record(finalState.state).transactions;
  assert.ok(Array.isArray(finalTransactions));
  assert.equal(finalTransactions.length, EVENT_COUNT - 1);
  assert.equal(await prisma.auditLog.count({
    where: { userId: user.id, action: 'NORMALIZATION_PRIMARY_RECONCILED' },
  }), 1, 'Tentativa concorrente nao pode duplicar auditoria sem ator.');

  const reductionPercent = (1 - projectedWire.serverToClientBytes / fullWire.serverToClientBytes) * 100;
  console.log('STAGE09_EGRESS_PG17_SYNTHETIC_RESULT=' + JSON.stringify({
    synthetic: true,
    pgVersion: '17 via CI service',
    eventCount: EVENT_COUNT,
    fullServerToClientBytes: fullWire.serverToClientBytes,
    projectedServerToClientBytes: projectedWire.serverToClientBytes,
    periodicAuditServerToClientBytes: periodicWire.serverToClientBytes,
    cachedPeriodicAuditServerToClientBytes: cachedPeriodicWire.serverToClientBytes,
    initialDigestAuditServerToClientBytes: initialPeriodicWire.serverToClientBytes,
    unchangedPeriodicDigestBytesSavedPercent: Number(((1 - cachedPeriodicWire.serverToClientBytes / periodicWire.serverToClientBytes) * 100).toFixed(3)),
    externalDriftDetected: true,
    archiveDriftDetected: true,
    nonFinancialMutationInvalidates: true,
    periodicAudit96CallsProjectedBytes: periodicWire.serverToClientBytes * 96,
    reductionPercent: Number(reductionPercent.toFixed(3)),
    periodicReconciled: true,
    mirrorsEqual: true,
    refreshDetectionEqual: true,
    archivedAndOrphansRemoved: true,
    ledgerUnchanged: true,
    rollback: true,
    staleRevisionRejected: true,
    concurrentRevisionSingleWinner: true,
  }));
}

main()
  .catch((error) => {
    console.error('STAGE09_EGRESS_PG17_SYNTHETIC_FAILED', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
