import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Prisma, prisma } from '@meg/database';
import { readStage10HistoricalReview } from './stage10-historical-review-report';

/** Etapa 10: QA PG17 descartavel, SEM acesso a Supabase real e sem dados pessoais. */
const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.MEG_STAGE10_ISOLATED_PG !== '1'
  || process.env.MEG_STAGE10_QA_LOCAL_ONLY !== '1'
  || url.hostname !== '127.0.0.1' || url.port !== '5432'
  || url.pathname !== '/meg_stage10_sandbox' || url.username !== 'meg_stage10_ci') {
  throw new Error('STAGE10_RECONCILIATION_REQUIRES_DISPOSABLE_PG17');
}
const sql = readFileSync('scripts/meg-stage10-reconciliation-map.readonly.sql', 'utf8').trim();
assert.match(sql, /WITH events AS/);
assert.doesNotMatch(sql, /\b(?:UPDATE|DELETE|INSERT|ALTER|CREATE|DROP|TRUNCATE)\s+(?:[\w".]+\s+)?(?:SET|FROM|INTO|TABLE|SCHEMA)/i);
const manifestSql = sql.replace(/;\s*$/, '');
const tag = 'stage10-map-' + randomUUID().slice(0, 12);
let userId: string | undefined;
let workspaceId: string | undefined;
let planId: string | undefined;
type Row = {
  event_id: string; event_type: string; grupo_financeiro: string;
  category_matches: number; payment_matches: number;
  category_proposed_id: string | null; payment_proposed_id: string | null;
  confianca: string; evidencia: string; escrita_autorizada: boolean;
  has_ledger: boolean; legacy_expense_class: string;
};
const fixtureDate = new Date('2026-06-01T12:00:00.000Z');
async function main() {
 try {
  const user = await prisma.user.create({ data: { email: tag + '@example.invalid', name: 'Titular sintetico QA' } });
  userId = user.id;
  const plan = await prisma.plan.create({ data: { code: tag, name: 'Plano QA', features: [], monthlyPrice: 0 } });
  planId = plan.id;
  const workspace = await prisma.workspace.create({ data: {
    name: 'Workspace sintetico QA', slug: tag, ownerId: user.id,
    appState: { create: { userId: user.id, revision: 1, state: { transactions: [], __megNormalization: { mode: 'normalized-primary' } } as Prisma.InputJsonValue } },
  } });
  workspaceId = workspace.id;
  const account = await prisma.account.create({ data: { userId: user.id, name: 'Conta QA', type: 'checking', openingBalance: 100 } });
  const benefitAccount = await prisma.account.create({ data: { userId: user.id, name: 'Beneficio QA', type: 'benefit', openingBalance: 0 } });
  const moto = await prisma.category.create({ data: { userId: user.id, name: 'MOTO', group: 'CONTAS GERAIS', type: 'expense' } });
  await prisma.category.create({ data: { userId: user.id, name: 'Receitas', group: 'SEM CLASSIFICAÇÃO', type: 'income' } });
  await prisma.category.createMany({ data: [
    { userId: user.id, name: 'OUTROS', group: 'CONTAS GERAIS', type: 'expense' },
    { userId: user.id, name: 'OUTROS', group: 'CONTAS GERAIS', type: 'expense' },
    { userId: user.id, name: 'FAST FOOD', group: 'SEM CLASSIFICAÇÃO', type: 'expense' },
  ] });
  const boleto = await prisma.paymentMethod.create({ data: { userId: user.id, name: 'BOLETO', type: 'bill' } });
  await prisma.paymentMethod.createMany({ data: [
    { userId: user.id, name: 'PIX', type: 'instant' },
    { userId: user.id, name: 'CARTÃO ML', type: 'credit' },
    { userId: user.id, name: 'VEROCARD', type: 'other' },
  ] });

  async function event(kind: string, type: 'income' | 'expense', group: string, expenseClass: string,
    method: string, modality: string, accountId: string, frequency: string, amount: number, status: string,
    scope: string = 'monetary') {
    return prisma.financialEvent.create({ data: {
      workspaceId: workspace.id, userId: user.id,
      legacyTransactionId: tag + '-' + kind,
      description: 'Somente QA ' + kind, type, status, date: fixtureDate, competence: '2026-06',
      amount, signedAmount: type === 'expense' ? -amount : amount, accountId, frequency,
      sourcePayload: {
        category: group, expenseClass, paymentMethod: method, modality, financialScope: scope,
      } as Prisma.InputJsonValue,
    } });
  }
  const simple = await event('SIMPLES','expense','MOTO','CONTAS GERAIS','BOLETO','À VISTA',account.id,'ONE_OFF',10.54,'planned');
  const income = await event('RECEITA','income','Receitas','SEM CLASSIFICAÇÃO','Não informado','-',account.id,'ONE_OFF',16,'paid');
  const recurring = await event('RECORRENTE','expense','MOTO','CONTAS GERAIS','BOLETO','À VISTA',account.id,'RECURRING',25,'planned');
  const card = await event('CARTAO','expense','FAST FOOD','SEM CLASSIFICAÇÃO','CARTÃO ML','CREDITO',account.id,'ONE_OFF',40.01,'planned');
  const benefit = await event('VEROCARD','income','Receitas','SEM CLASSIFICAÇÃO','VEROCARD','ALIMENTAÇÃO',benefitAccount.id,'ONE_OFF',30,'paid','benefit');
  const ambiguous = await event('AMBIGUO','expense','OUTROS','CONTAS GERAIS','BOLETO','À VISTA',account.id,'ONE_OFF',5,'planned');
  const linked = await event('LEDGER','expense','MOTO','CONTAS GERAIS','BOLETO','À VISTA',account.id,'ONE_OFF',3,'paid');
  await prisma.ledgerEntry.create({ data: {
    eventId: linked.id, accountId: account.id, date: fixtureDate, debit: 3, credit: 0,
  } });

  const rows = await prisma.$queryRawUnsafe<Row[]>(manifestSql);
  const ours = rows.filter(r => [simple.id,income.id,recurring.id,card.id,benefit.id,ambiguous.id,linked.id].includes(r.event_id));
  assert.equal(ours.length, 7, 'uma linha por ID; sem multiplicacao por catalogo');
  assert.equal(new Set(ours.map(r=>r.event_id)).size, ours.length);
  const byId = (id: string) => { const row = ours.find(r=>r.event_id===id); assert.ok(row); return row; };
  const candidate = byId(simple.id);
  assert.equal(candidate.grupo_financeiro, 'DESPESA_COMUM');
  assert.equal(candidate.confianca, 'ALTA_PARA_REVISAO');
  assert.equal(candidate.category_proposed_id, moto.id);
  assert.equal(candidate.payment_proposed_id, boleto.id);
  assert.equal(candidate.escrita_autorizada, false);
  assert.equal(byId(income.id).grupo_financeiro,'RECEITA');
  assert.equal(byId(income.id).category_proposed_id,null);
  assert.equal(byId(income.id).confianca,'SEM_ALTERACAO_DE_CLASSIFICACAO_DE_DESPESA');
  assert.equal(byId(recurring.id).grupo_financeiro,'DESPESA_RECORRENTE');
  assert.equal(byId(recurring.id).category_proposed_id,null);
  assert.equal(byId(card.id).grupo_financeiro,'CARTAO_CREDITO');
  assert.equal(byId(card.id).payment_proposed_id,null);
  assert.equal(byId(benefit.id).grupo_financeiro,'BENEFICIO_VEROCARD');
  assert.equal(byId(benefit.id).category_proposed_id,null);
  assert.equal(byId(ambiguous.id).category_matches,2);
  assert.equal(byId(ambiguous.id).category_proposed_id,null);
  assert.equal(byId(linked.id).has_ledger,true);
  assert.equal(byId(linked.id).category_proposed_id,null);
  console.log('MEG_STAGE10_MAP_QA_SEVEN_DOMAINS_AND_AMBIGUITY=PASS');

  const reviews = await readStage10HistoricalReview(workspace.id);
  const classifier = reviews.find(r=>r.eventId===simple.id);
  assert.equal(classifier?.classification,'eligible_for_explicit_review');
  assert.equal(classifier?.categoryId,moto.id);
  assert.equal(classifier?.paymentMethodId,boleto.id);
  console.log('MEG_STAGE10_MAP_QA_CANONICAL_REVIEW_PARITY=PASS');

  const beforeRows = await prisma.financialEvent.findMany({ where: { workspaceId: workspace.id }, orderBy: { id: 'asc' } });
  const beforeLedgers = await prisma.ledgerEntry.findMany({ where: { event: { workspaceId: workspace.id } }, orderBy: { id: 'asc' } });
  const baseline = {
    ids: beforeRows.map(x=>x.id),
    cents: beforeRows.reduce((sum,x)=>sum+Math.round(Number(x.signedAmount)*100),0),
    status: beforeRows.map(x=>x.status),
    ledgerIds: beforeLedgers.map(x=>x.id),
    ledgerDebitCents: beforeLedgers.reduce((sum,x)=>sum+Math.round(Number(x.debit)*100),0),
  };
  const original = await prisma.financialEvent.findUniqueOrThrow({ where: { id: simple.id } });
  let rollbackWasTriggered = false;
  try {
    await prisma.$transaction(async tx => {
      const updated = await tx.financialEvent.updateMany({
        where: { id: simple.id, workspaceId: workspace.id, userId: user.id, archivedAt: null,
          updatedAt: original.updatedAt, categoryId: null, paymentMethodId: null },
        data: { categoryId: candidate.category_proposed_id, paymentMethodId: candidate.payment_proposed_id },
      });
      assert.equal(updated.count,1);
      const staged = await tx.financialEvent.findUniqueOrThrow({ where: { id: simple.id } });
      assert.equal(staged.categoryId,moto.id);
      assert.equal(staged.paymentMethodId,boleto.id);
      assert.equal(staged.id,original.id);
      assert.equal(staged.status,original.status);
      assert.equal(staged.amount.toString(),original.amount.toString());
      throw new Error('STAGE10_EXPECTED_QA_ROLLBACK');
    });
  } catch(error) {
    assert.equal((error as Error).message,'STAGE10_EXPECTED_QA_ROLLBACK');
    rollbackWasTriggered = true;
  }
  assert.equal(rollbackWasTriggered,true);
  const rolled = await prisma.financialEvent.findUniqueOrThrow({ where: { id: simple.id } });
  assert.equal(rolled.categoryId,null);
  assert.equal(rolled.paymentMethodId,null);
  assert.equal(rolled.updatedAt.toISOString(),original.updatedAt.toISOString());
  console.log('MEG_STAGE10_MAP_QA_TRANSACTION_ROLLBACK=PASS');

  // Aplicacao controlada SOMENTE em banco descartavel; reenvio deve ser no-op.
  const change = await prisma.financialEvent.updateMany({
    where: { id: simple.id, workspaceId: workspace.id, userId: user.id, archivedAt: null,
      updatedAt: original.updatedAt, categoryId: null, paymentMethodId: null },
    data: { categoryId: moto.id, paymentMethodId: boleto.id },
  });
  assert.equal(change.count,1);
  const replay = await prisma.financialEvent.updateMany({
    where: { id: simple.id, workspaceId: workspace.id, userId: user.id, archivedAt: null,
      categoryId: null, paymentMethodId: null },
    data: { categoryId: moto.id, paymentMethodId: boleto.id },
  });
  assert.equal(replay.count,0);
  const afterRows = await prisma.financialEvent.findMany({ where: { workspaceId: workspace.id }, orderBy: { id: 'asc' } });
  const afterLedgers = await prisma.ledgerEntry.findMany({ where: { event: { workspaceId: workspace.id } }, orderBy: { id: 'asc' } });
  assert.deepEqual(afterRows.map(x=>x.id),baseline.ids);
  assert.deepEqual(afterRows.map(x=>x.status),baseline.status);
  assert.equal(afterRows.reduce((sum,x)=>sum+Math.round(Number(x.signedAmount)*100),0),baseline.cents);
  assert.deepEqual(afterLedgers.map(x=>x.id),baseline.ledgerIds);
  assert.equal(afterLedgers.reduce((sum,x)=>sum+Math.round(Number(x.debit)*100),0),baseline.ledgerDebitCents);
  assert.equal(afterRows.find(x=>x.id===simple.id)?.categoryId,moto.id);
  assert.equal(afterRows.find(x=>x.id===simple.id)?.paymentMethodId,boleto.id);
  assert.equal(afterRows.find(x=>x.id===linked.id)?.categoryId,null);
  assert.equal(afterRows.find(x=>x.id===income.id)?.categoryId,null);
  console.log('MEG_STAGE10_MAP_QA_IDEMPOTENCE_IDS_BALANCE_LEDGER=PASS');

  await assert.rejects(prisma.financialEvent.create({ data: {
    workspaceId: workspace.id,userId: user.id,legacyTransactionId: simple.legacyTransactionId,
    description: 'Duplicata indevida QA',type:'expense',status:'planned',date:fixtureDate,
    competence:'2026-06',amount:10.54,signedAmount:-10.54,accountId:account.id,
  } }), (e: unknown)=>e instanceof Prisma.PrismaClientKnownRequestError && e.code==='P2002');
  assert.equal(await prisma.financialEvent.count({ where: { workspaceId: workspace.id } }),7);
  console.log('MEG_STAGE10_MAP_QA_DUPLICATE_LEGACY_ID_BLOCKED=PASS');
 } finally {
  if (workspaceId) {
    await prisma.ledgerEntry.deleteMany({ where: { event: { workspaceId } } });
    await prisma.workspace.delete({ where: { id: workspaceId } });
  }
  if (planId) await prisma.plan.delete({ where: { id: planId } });
  if (userId) await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
 }
}
main().catch(error=>{console.error('MEG_STAGE10_MAP_QA_FAILED',error);process.exitCode=1;});
