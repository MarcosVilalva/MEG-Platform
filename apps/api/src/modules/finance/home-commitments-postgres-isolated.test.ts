import assert from 'node:assert/strict';
import { prisma } from '@meg/database';
import { listCanonicalHomeCommitments } from './home-commitments-read';

/**
 * Somente PostgreSQL 17 descartável do GitHub Actions. Recusa todo banco remoto,
 * credencial diferente e banco pré-existente. Não usar contra o Supabase.
 * Dados e usuários são totalmente fictícios; nenhum writer financeiro é chamado.
 */
const SAFE_DATABASE_URL =
  'postgresql://meg_qa:meg_qa@127.0.0.1:5432/meg_home_p0_qa?schema=public';
assert.equal(process.env.DATABASE_URL, SAFE_DATABASE_URL,
  'BLOQUEADO: teste somente no PostgreSQL QA local e efêmero');

const day = (value: string) => new Date(value + 'T00:00:00.000Z');
const owner = 'p0-fixture-owner';
const otherOwner = 'p0-fixture-other';
const workspace = 'p0-fixture-workspace';
const otherWorkspace = 'p0-fixture-other-workspace';
const referenceDate = new Date('2026-11-11T15:00:00.000Z');
const event = (
  id: string, userId: string, workspaceId: string, date: string,
  extras: Record<string, unknown> = {},
) => ({
  id, userId, workspaceId, date: day(date), competence: date.slice(0, 7),
  description: 'Obrigação fictícia ' + id,
  type: 'expense', status: 'planned', amount: '43.20',
  signedAmount: '-43.20',
  ...extras,
});
const payable = (id: string, userId: string, date: string,
  extras: Record<string, unknown> = {}) => ({
  id, userId, dueDate: day(date), description: 'Conta fictícia ' + id,
  totalAmount: '50.17', openAmount: '50.17', status: 'open',
  ...extras,
});

try {
  assert.equal(await prisma.user.count(), 0,
    'BLOQUEADO: banco QA deve começar vazio');
  assert.equal(await prisma.financialEvent.count(), 0,
    'BLOQUEADO: banco QA já possui lançamentos');

  await prisma.user.createMany({ data: [
    { id: owner, name: 'Responsável fictício A', email: 'p0-a@example.invalid' },
    { id: otherOwner, name: 'Responsável fictício B', email: 'p0-b@example.invalid' },
  ] });
  await prisma.workspace.createMany({ data: [
    { id: workspace, name: 'Workspace fictício A', slug: 'p0-work-a', ownerId: owner },
    { id: otherWorkspace, name: 'Workspace fictício B', slug: 'p0-work-b', ownerId: otherOwner },
  ] });
  await prisma.workspaceMember.createMany({ data: [
    { id: 'p0-member-a', workspaceId: workspace, userId: owner,
      role: 'ADMIN', status: 'ACTIVE', isActive: true },
    { id: 'p0-member-b', workspaceId: otherWorkspace, userId: otherOwner,
      role: 'ADMIN', status: 'ACTIVE', isActive: true },
  ] });
  await prisma.paymentMethod.create({
    data: { id: 'p0-credit-method', userId: owner, name: 'Cartão fictício', type: 'credit' },
  });

  const bulkEvents = Array.from({ length: 2500 }, (_, i) => {
    const date = new Date(Date.UTC(2027, 0, 1 + i % 365))
      .toISOString().slice(0, 10);
    return event('p0-bulk-event-' + String(i).padStart(5, '0'),
      owner, workspace, date);
  });
  await prisma.financialEvent.createMany({ data: [
    ...bulkEvents,
    event('p0-old', owner, workspace, '2026-07-05'),
    event('p0-today', owner, workspace, '2026-11-11'),
    event('p0-same-a', owner, workspace, '2026-11-10'),
    event('p0-same-b', owner, workspace, '2026-11-10'),
    event('p0-future', owner, workspace, '2026-12-01'),
    event('p0-benefit', owner, workspace, '2026-09-01',
      { description: 'VEROCARD Alimentação fictícia' }),
    event('p0-credit', owner, workspace, '2026-09-02',
      { paymentMethodId: 'p0-credit-method' }),
    event('p0-archived', owner, workspace, '2026-07-03',
      { archivedAt: referenceDate }),
    event('p0-paid', owner, workspace, '2026-07-04',
      { status: 'paid' }),
    event('p0-linked-event', owner, workspace, '2026-09-03'),
    event('p0-secret-b', otherOwner, otherWorkspace, '2026-07-01'),
  ] });

  const bulkPayables = Array.from({ length: 1000 }, (_, i) => {
    const date = new Date(Date.UTC(2027, 0, 1 + i % 365))
      .toISOString().slice(0, 10);
    return payable('p0-bulk-payable-' + String(i).padStart(5, '0'), owner, date);
  });
  await prisma.payable.createMany({ data: [
    ...bulkPayables,
    payable('p0-partial', owner, '2026-11-11',
      { status: 'partial', totalAmount: '50.17', openAmount: '12.03' }),
    payable('p0-linked-payable', owner, '2026-10-01',
      { totalAmount: '28.07', openAmount: '27.07', status: 'partial' }),
    payable('p0-paid-payable', owner, '2026-07-02',
      { status: 'paid', openAmount: '0.00' }),
    payable('p0-cancelled-payable', owner, '2026-07-03',
      { status: 'cancelled' }),
    payable('p0-secret-payable-b', otherOwner, '2026-07-01'),
  ] });
  await prisma.payablePayment.create({
    data: { id: 'p0-payment-link', payableId: 'p0-linked-payable',
      financialEventId: 'p0-linked-event', amount: '1.00',
      paidAt: day('2026-09-03') },
  });

  const first = await listCanonicalHomeCommitments(owner, { limit: 16 }, referenceDate);
  const ids = first.items.map(item => item.id);
  for (const expected of [
    'financialEvent:p0-old', 'financialEvent:p0-today',
    'financialEvent:p0-same-a', 'financialEvent:p0-same-b',
    'payable:p0-partial', 'payable:p0-linked-payable',
    'financialEvent:p0-future',
  ]) assert.ok(ids.includes(expected), 'Compromisso elegível não retornado: ' + expected);

  for (const excluded of [
    'financialEvent:p0-benefit', 'financialEvent:p0-credit',
    'financialEvent:p0-archived', 'financialEvent:p0-paid',
    'financialEvent:p0-linked-event', 'financialEvent:p0-secret-b',
    'payable:p0-paid-payable', 'payable:p0-cancelled-payable',
    'payable:p0-secret-payable-b',
  ]) assert.ok(!ids.includes(excluded), 'Compromisso indevido: ' + excluded);

  assert.ok(first.hasMore && first.nextCursor, 'Paginação real deve ter cursor');
  const next = await listCanonicalHomeCommitments(
    owner, { limit: 16, cursor: first.nextCursor }, referenceDate);
  assert.equal(new Set([...ids, ...next.items.map(item => item.id)]).size,
    ids.length + next.items.length, 'Cursor não pode repetir registros');

  assert.equal(first.items.find(item => item.sourceId === 'p0-old')?.dueState,
    'overdue');
  assert.equal(first.items.find(item => item.sourceId === 'p0-today')?.dueState,
    'due_today');
  assert.equal(first.items.find(item => item.sourceId === 'p0-future')?.dueState,
    'upcoming');
  assert.equal(first.items.find(item => item.sourceId === 'p0-partial')?.amount,
    '12.03', 'Deve exibir apenas valor aberto, sem recalcular na UI');
  assert.equal(first.items.find(item => item.sourceId === 'p0-linked-payable')?.amount,
    '27.07', 'Pagamento vinculado não pode duplicar a obrigação');
  assert.ok(ids.includes('financialEvent:p0-same-a')
    && ids.includes('financialEvent:p0-same-b'),
    'Obrigações distintas com mesmo valor/data devem ser preservadas');

  const b = await listCanonicalHomeCommitments(
    otherOwner, { limit: 16 }, referenceDate);
  assert.deepEqual(b.items.map(item => item.id),
    ['financialEvent:p0-secret-b', 'payable:p0-secret-payable-b'],
    'Workspace B nunca deve receber dados do A');

  const explainQueries = [
    {
      name: 'FinancialEvent',
      sql: 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT "id" FROM "FinancialEvent" WHERE "userId" = \'p0-fixture-owner\' AND "archivedAt" IS NULL AND "status" = \'planned\' AND "type" = \'expense\' AND "signedAmount" < 0 ORDER BY "date" ASC, "id" ASC LIMIT 17',
    },
    {
      name: 'Payable',
      sql: 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT "id" FROM "Payable" WHERE "userId" = \'p0-fixture-owner\' AND "status" NOT IN (\'paid\',\'cancelled\') AND "openAmount" > 0 ORDER BY "dueDate" ASC, "id" ASC LIMIT 17',
    },
  ];
  const planReports = [];
  for (const query of explainQueries) {
    const result = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(query.sql);
    const parsed = result[0]?.['QUERY PLAN'];
    assert.ok(Array.isArray(parsed) && parsed.length > 0,
      'EXPLAIN precisa retornar plano JSON: ' + query.name);
    const details = parsed[0] as Record<string, unknown>;
    const plan = details['Plan'] as Record<string, unknown>;
    assert.ok(plan && typeof plan['Node Type'] === 'string');
    planReports.push({
      source: query.name,
      rootNode: plan['Node Type'],
      estimatedRows: plan['Plan Rows'],
      actualRows: plan['Actual Rows'],
      executionMs: details['Execution Time'],
    });
  }
  console.log('MEG P0 PostgreSQL 17 fictício: 2500 eventos, 1000 payables;');
  console.log('  isolamento de workspace, pendências antigas, duplicidade,');
  console.log('  fatura/benefício, centavos, paginação e planos EXPLAIN:');
  console.log(JSON.stringify(planReports, null, 2));
} finally {
  await prisma.$disconnect();
}
