import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma, Prisma, UserRole, UserStatus } from '@meg/database';
import {
  getCanonicalFinancialAnalytics,
  getCanonicalFinancialCashflow,
  getCanonicalFinancialSummary,
} from './read-model';
import { classifyStage10HistoricalLink } from './stage10-historical-mapping-review';

/**
 * ETAPA 10 / QA EXCLUSIVAMENTE DESCARTAVEL.
 * Integra os TRÊS read-models canônicos ao banco real do CI, mas usa
 * somente fixtures fictícias e descarte total no final.
 * Demonstra que saldos/fluxos podem ficar iguais enquanto facetas mudam.
 * Nenhuma função de migração, writer ou cliente legado é modificada.
 */
const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.MEG_STAGE10_ISOLATED_PG !== '1'
  || url.protocol !== 'postgresql:'
  || url.hostname !== '127.0.0.1'
  || url.username !== 'meg_stage10_ci'
  || url.pathname !== '/meg_stage10_sandbox'
  || url.searchParams.get('schema') !== 'public') {
  throw new Error('STAGE10_QA_DISPOSABLE_ONLY');
}

const stamp = randomUUID();
const email = 'qa-stage10-read-model-' + stamp + '@meg.test';
const marker = 'stage10-rm-' + stamp;
let ownerId: string | null = null;
let workspaceId: string | null = null;
let accountId: string | null = null;
const eventIds: string[] = [];
type FinancialCase = {
  type: 'expense' | 'income';
  status: 'paid' | 'planned';
  amount: string;
  signed: string;
  category: string;
  group: string;
  date: string;
};
const samples: FinancialCase[] = [
  {type:'expense',status:'paid',amount:'22.35',signed:'-22.35',
    category:'Mercado QA',group:'CONTAS GERAIS',date:'2026-11-02'},
  {type:'expense',status:'planned',amount:'5.05',signed:'-5.05',
    category:'Mercado QA',group:'CONTAS GERAIS',date:'2026-11-05'},
  {type:'income',status:'paid',amount:'100.00',signed:'100.00',
    category:'Salario QA',group:'RECEITAS',date:'2026-11-10'},
];

async function state() {
  assert.ok(ownerId && workspaceId);
  const [summary,cashflow,analytics,events,ledgerCount,purchases] = await Promise.all([
    getCanonicalFinancialSummary(ownerId,'2026-11'),
    getCanonicalFinancialCashflow(ownerId,'2026-11'),
    getCanonicalFinancialAnalytics(ownerId,'2026-11'),
    prisma.financialEvent.findMany({
      where:{workspaceId, userId:ownerId, archivedAt:null},
      orderBy:{description:'asc'},
      select:{
        id:true,legacyTransactionId:true,description:true,
        type:true,status:true,date:true,competence:true,
        amount:true,signedAmount:true,accountId:true,
        categoryId:true,paymentMethodId:true,sourcePayload:true,
      },
    }),
    prisma.ledgerEntry.count({where:{eventId:{in:eventIds}}}),
    prisma.cardPurchase.count({where:{userId:ownerId}}),
  ]);

  const invariant = {
    summary:{
      availableBalance:summary.availableBalance,
      income:summary.income,expense:summary.expense,
      projectedResult:summary.projectedResult,
      realizedIncome:summary.realizedIncome,
      realizedExpense:summary.realizedExpense,
      realizedResult:summary.realizedResult,
      eventCount:summary.eventCount,pendingCount:summary.pendingCount,
      pendingAmount:summary.pendingAmount,
      nextDue:summary.nextDue,
    },
    cashflow,
    analytics:{
      previous:analytics.previous,
      delta:analytics.delta,
      dailyAverageExpense:analytics.dailyAverageExpense,
      concentrationTop3:analytics.concentrationTop3,
      monthlyTrend:analytics.monthlyTrend,
    },
    eventSignatures:events.map(e=>({
      id:e.id,legacyTransactionId:e.legacyTransactionId,
      description:e.description,type:e.type,status:e.status,
      date:e.date.toISOString(),competence:e.competence,
      amount:e.amount.toString(),signedAmount:e.signedAmount.toString(),
      accountId:e.accountId,sourcePayload:JSON.stringify(e.sourcePayload),
    })),
    ledgerCount,purchases,
  };

  return {
    invariant,
    events,
    faceted:{
      topCategories:summary.topCategories,
      categoryBreakdown:analytics.categories,
      paymentMethods:analytics.paymentMethods,
    },
  };
}

try {
  const created = await prisma.$transaction(async tx=>{
    const user = await tx.user.create({data:{
      name:'Stage10 Read Model QA',email,passwordHash:'QA_ONLY',
      role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,
    }});
    const workspace = await tx.workspace.create({data:{
      ownerId:user.id,name:'Stage10 read-model QA',slug:marker,
    }});
    const account = await tx.account.create({data:{
      userId:user.id,name:'Conta de teste',type:'checking',
    }});
    const expenseCategory = await tx.category.create({data:{
      userId:user.id,name:'Mercado QA',group:'CONTAS GERAIS',type:'expense',
      isActive:true,
    }});
    const incomeCategory = await tx.category.create({data:{
      userId:user.id,name:'Salario QA',group:'RECEITAS',type:'income',
      isActive:true,
    }});
    const payment = await tx.paymentMethod.create({data:{
      userId:user.id,name:'PIX',type:'instant',isActive:true,
    }});
    const rows = [];
    for (const [i,sample] of samples.entries()) {
      rows.push(await tx.financialEvent.create({data:{
        userId:user.id,workspaceId:workspace.id,
        legacyTransactionId:marker+'-'+i,
        description:marker+'-event-'+i,type:sample.type,status:sample.status,
        date:new Date(sample.date+'T12:00:00Z'),competence:'2026-11',
        amount:new Prisma.Decimal(sample.amount),
        signedAmount:new Prisma.Decimal(sample.signed),
        accountId:account.id,sourcePayload:{
          category:sample.category,expenseClass:sample.group,
          paymentMethod:'PIX',financialScope:'monetary',modality:'à vista',
        },
      }}));
    }
    return {ownerId:user.id,workspaceId:workspace.id,accountId:account.id,
      expenseCategory,incomeCategory,payment,rows};
  },{maxWait:10_000,timeout:30_000});
  ownerId=created.ownerId;workspaceId=created.workspaceId;
  accountId=created.accountId;
  eventIds.push(...created.rows.map(e=>e.id));

  const before=await state();
  assert.equal(before.events.length,3);
  assert.equal(before.invariant.summary.income,100);
  assert.equal(before.invariant.summary.expense,27.4);
  assert.equal(before.invariant.summary.projectedResult,72.6);
  assert.equal(before.invariant.summary.realizedResult,77.65);
  assert.equal(before.invariant.summary.pendingCount,1);
  assert.equal(before.invariant.cashflow.projectedClosing,72.6);
  assert.equal(before.invariant.cashflow.realizedClosing,77.65);
  assert.ok(before.events.every(e=>!e.categoryId && !e.paymentMethodId));

  await prisma.$transaction(async tx=>{
    for (const row of created.rows) {
      const spec=samples[Number(row.legacyTransactionId?.split('-').at(-1))];
      assert.ok(spec);
      const category=spec.type==='expense'
        ? created.expenseCategory : created.incomeCategory;
      const proposal=classifyStage10HistoricalLink({
        event:{
          id:row.id,userId:row.userId,description:row.description,
          type:row.type,status:row.status,amount:Number(row.amount),
          signedAmount:Number(row.signedAmount),
          categoryId:row.categoryId,paymentMethodId:row.paymentMethodId,
          archivedAt:row.archivedAt,sourcePayload:row.sourcePayload,
          account:{id:created.accountId,userId:created.ownerId,
            type:'checking',isActive:true},
          hasLedger:false,hasReceipt:false,hasPayablePayment:false,
          hasImportedRow:false,
        },
        category,paymentMethod:created.payment,
        categoryMatchCount:1,paymentMatchCount:1,
      });
      assert.equal(proposal.classification,'eligible_for_explicit_review');
      assert.equal(proposal.writeAuthorized,false);
      await tx.financialEvent.update({where:{id:row.id},data:{
        categoryId:proposal.categoryId,paymentMethodId:proposal.paymentMethodId,
      }});
    }
  },{maxWait:10_000,timeout:30_000});

  const after=await state();
  assert.deepEqual(after.invariant,before.invariant,
    'Tres read-models, dinheiro, status e assinaturas devem ser invariantes');
  assert.equal(after.events.length,3);
  assert.ok(after.events.every(e=>e.categoryId && e.paymentMethodId));
  assert.notDeepEqual(after.faceted,before.faceted,
    'Facetas por nome nao sao invariantes, pois sao derivadas das FKs');
  assert.deepEqual(before.faceted.topCategories.map(x=>x.name),['Sem categoria']);
  assert.deepEqual(after.faceted.topCategories.map(x=>x.name),['Mercado QA']);
  assert.deepEqual(before.faceted.paymentMethods.map(x=>x.name),['Não informada']);
  assert.deepEqual(after.faceted.paymentMethods.map(x=>x.name),['PIX']);
  assert.equal(before.faceted.topCategories[0].amount,27.4);
  assert.equal(after.faceted.topCategories[0].amount,27.4);

  console.log('MEG_STAGE10_THREE_CANONICAL_READ_MODELS_NEUTRAL_PG17_PASS');
} finally {
  // O PostgreSQL 17 existe apenas durante este job. Mesmo se uma assercao
  // falhar, tentar descartar tudo sem afetar outras fixtures do mesmo banco.
  if (ownerId && workspaceId && accountId) {
    await prisma.$transaction(async tx=>{
      await tx.financialEvent.deleteMany({where:{id:{in:eventIds},workspaceId}});
      await tx.category.deleteMany({where:{userId:ownerId}});
      await tx.paymentMethod.deleteMany({where:{userId:ownerId}});
      await tx.account.deleteMany({where:{id:accountId,userId:ownerId}});
      await tx.workspace.delete({where:{id:workspaceId}});
      await tx.user.delete({where:{id:ownerId}});
    },{maxWait:10_000,timeout:30_000});
    assert.equal(await prisma.financialEvent.count({where:{id:{in:eventIds}}}),0);
    assert.equal(await prisma.user.count({where:{email}}),0);
  }
  await prisma.$disconnect();
}
