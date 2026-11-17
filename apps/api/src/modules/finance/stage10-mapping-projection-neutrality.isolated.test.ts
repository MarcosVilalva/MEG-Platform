import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma, Prisma, UserRole, UserStatus } from '@meg/database';
import {
  monetaryAccountBalanceAt, monetaryBalanceAt,
} from './monetary-protection';
import {
  resolveCanonicalFinancialStatus, summarizeMonetaryEvents,
  type CanonicalFinancialStatus,
} from './financial-policy';
import { buildCanonicalCardStatement } from './card-statement-canonical';
import { classifyStage10HistoricalLink } from './stage10-historical-mapping-review';

/**
 * ETAPA 10 / PG17 DESCARTAVEL. Nenhuma rotina de migracao ou aprovacao real.
 * Distingue invariantes monetarios das facetas que MUDAM ao preencher FKs.
 * Todas as escritas ficticias sao revertidas intencionalmente no mesmo tx.
 */
const db = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.MEG_STAGE10_ISOLATED_PG !== '1'
  || db.hostname !== '127.0.0.1'
  || db.username !== 'meg_stage10_ci'
  || db.pathname !== '/meg_stage10_sandbox'
  || db.searchParams.get('schema') !== 'public') {
  throw new Error('STAGE10_QA_DISPOSABLE_ONLY');
}

const id = randomUUID();
const email = 'stage10-projections-' + id + '@meg.test';
const rollback = new Error('MEG_STAGE10_PROJECTION_TEST_ROLLBACK');
const recordedIds: string[] = [];
type Case = {
  description: string;
  type: 'expense' | 'income';
  status: 'paid' | 'planned';
  amount: string;
  signed: string;
  category: string;
  group: string;
};
const cases: Case[] = [
  {description:'Mercado QA pago',type:'expense',status:'paid',amount:'22.35',
    signed:'-22.35',category:'Mercado',group:'CONTAS GERAIS'},
  {description:'Mercado QA planejado',type:'expense',status:'planned',amount:'5.05',
    signed:'-5.05',category:'Mercado',group:'CONTAS GERAIS'},
  {description:'Receita QA paga',type:'income',status:'paid',amount:'100.00',
    signed:'100.00',category:'Salario QA',group:'RECEITAS'},
];

try {
  await prisma.$transaction(async tx => {
    const owner = await tx.user.create({data:{
      name:'Projecoes Stage10 QA',email,passwordHash:'QA_ONLY',
      role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,
    }});
    const workspace = await tx.workspace.create({data:{
      ownerId:owner.id,name:'Somente QA PG17',slug:'stage10-proj-'+id,
    }});
    const account = await tx.account.create({data:{
      userId:owner.id,name:'Conta QA ficticia',type:'checking',
    }});
    const expenseCategory = await tx.category.create({data:{
      userId:owner.id,name:'Mercado',group:'CONTAS GERAIS',
      type:'expense',isActive:true,
    }});
    const incomeCategory = await tx.category.create({data:{
      userId:owner.id,name:'Salario QA',group:'RECEITAS',
      type:'income',isActive:true,
    }});
    const method = await tx.paymentMethod.create({data:{
      userId:owner.id,name:'PIX',type:'instant',isActive:true,
    }});

    for (const [index, spec] of cases.entries()) {
      const payload = {
        category:spec.category,expenseClass:spec.group,
        paymentMethod:'PIX',financialScope:'monetary',modality:'à vista',
      };
      const row = await tx.financialEvent.create({data:{
        userId:owner.id,workspaceId:workspace.id,
        legacyTransactionId:'qa-proj-'+id+'-'+index,
        description:spec.description,type:spec.type,status:spec.status,
        date:new Date('2026-11-17T12:00:00Z'),competence:'2026-11',
        amount:new Prisma.Decimal(spec.amount),
        signedAmount:new Prisma.Decimal(spec.signed),
        accountId:account.id,sourcePayload:payload,
      }});
      recordedIds.push(row.id);
    }

    async function capture() {
      const events = await tx.financialEvent.findMany({
        where:{workspaceId:workspace.id,userId:owner.id,archivedAt:null},
        orderBy:{description:'asc'},
        include:{
          account:{select:{type:true}},
          category:{select:{name:true}},
          paymentMethod:{select:{name:true}},
        },
      });
      const summary = summarizeMonetaryEvents(events);
      const globalBalance = await monetaryBalanceAt(tx,owner.id,'2026-11-30');
      const accountBalance = await monetaryAccountBalanceAt(
        tx,owner.id,account,'2026-11-30');
      const statement = buildCanonicalCardStatement({
        month:'2026-11',closingDay:8,dueDay:16,
        aliases:['CARTAO FICTICIO QA'],events,purchases:[],
      });
      return {
        invariant: events.map(e=>({
          id:e.id,legacyTransactionId:e.legacyTransactionId,
          userId:e.userId,workspaceId:e.workspaceId,accountId:e.accountId,
          type:e.type,status:e.status,date:e.date.toISOString(),
          competence:e.competence,amount:e.amount.toString(),
          signedAmount:e.signedAmount.toString(),
          sourcePayload:JSON.stringify(e.sourcePayload),
        })),
        finance:{summary,globalBalance,accountBalance,
          statement:{
            netAmount:statement.netAmount,
            openNetAmount:statement.openNetAmount,
            creditBalance:statement.creditBalance,
            payableAmount:statement.payableAmount,
            lines:statement.lines.length,
          }},
        facets:events.map(e=>({
          id:e.id,category:e.category?.name || 'Sem categoria',
          paymentMethod:e.paymentMethod?.name || 'Não informada',
        })),
        relationIds:events.map(e=>({
          id:e.id,categoryId:e.categoryId,paymentMethodId:e.paymentMethodId,
        })),
        ledger:await tx.ledgerEntry.count({where:{eventId:{in:recordedIds}}}),
        cardPurchases:await tx.cardPurchase.count({where:{userId:owner.id}}),
      };
    }

    const before = await capture();
    assert.equal(before.invariant.length,3);
    assert.equal(before.finance.globalBalance,77.65);
    assert.equal(before.finance.accountBalance,77.65);
    assert.equal(before.finance.summary.projectedResult,72.6);
    assert.equal(before.finance.summary.realizedResult,77.65);
    assert.ok(before.relationIds.every(e=>!e.categoryId && !e.paymentMethodId));

    for (const rowId of recordedIds) {
      const row = await tx.financialEvent.findUniqueOrThrow({where:{id:rowId}});
      const spec = cases.find(c=>c.description===row.description);
      assert.ok(spec);
      const category = spec.type==='income' ? incomeCategory : expenseCategory;
      const proposal = classifyStage10HistoricalLink({
        event:{
          id:row.id,userId:row.userId,description:row.description,type:row.type,
          status:row.status,amount:Number(row.amount),
          signedAmount:Number(row.signedAmount),categoryId:row.categoryId,
          paymentMethodId:row.paymentMethodId,archivedAt:row.archivedAt,
          sourcePayload:row.sourcePayload,
          account:{id:account.id,userId:account.userId,
            type:account.type,isActive:account.isActive},
          hasLedger:false,hasReceipt:false,hasPayablePayment:false,
          hasImportedRow:false,
        },
        category,paymentMethod:method,
        categoryMatchCount:1,paymentMatchCount:1,
      });
      assert.equal(proposal.classification,'eligible_for_explicit_review');
      assert.equal(proposal.writeAuthorized,false);
      assert.equal(resolveCanonicalFinancialStatus({
        type:row.type,requestedStatus:row.status as CanonicalFinancialStatus,
        category,paymentMethod:method,
      }),row.status);
      await tx.financialEvent.update({
        where:{id:rowId},data:{
          categoryId:proposal.categoryId,paymentMethodId:proposal.paymentMethodId,
        },
      });
    }

    const after = await capture();
    assert.deepEqual(after.invariant,before.invariant,
      'IDs, dono, sinais, competencia, status e payload nao podem mudar');
    assert.deepEqual(after.finance,before.finance,
      'Resumo, saldo global/conta e fatura canonica nao podem mudar');
    assert.equal(after.ledger,before.ledger);
    assert.equal(after.cardPurchases,before.cardPurchases);
    assert.ok(after.relationIds.every(e=>e.categoryId && e.paymentMethodId));
    assert.notDeepEqual(after.facets,before.facets,
      'Detalhamento por categoria/metodo deve refletir FKs atribuidas; nao e invariante');
    assert.ok(after.facets.every(e=>e.paymentMethod==='PIX'));
    assert.equal(await tx.financialEvent.count({where:{
      workspaceId:workspace.id,legacyTransactionId:{startsWith:'qa-proj-'+id},
    }}),3,'Um evento por ID legado, sem duplicacao');
    throw rollback;
  },{maxWait:10_000,timeout:30_000});
  throw new Error('STAGE10_QA_ROLLBACK_REQUIRED');
} catch (error) {
  if (error !== rollback) throw error;
}
assert.equal(await prisma.financialEvent.count({where:{id:{in:recordedIds}}}),0);
assert.equal(await prisma.user.count({where:{email}}),0);
await prisma.$disconnect();
console.log('MEG_STAGE10_MAPPING_PROJECTIONS_NEUTRALITY_PG17_ROLLBACK_PASS');
