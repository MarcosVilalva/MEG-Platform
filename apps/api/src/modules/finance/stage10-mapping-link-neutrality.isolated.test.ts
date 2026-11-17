import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma, Prisma, UserRole, UserStatus } from '@meg/database';
import { classifyStage10HistoricalLink } from './stage10-historical-mapping-review';

const db = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.MEG_STAGE10_ISOLATED_PG !== '1'
  || db.hostname !== '127.0.0.1'
  || db.username !== 'meg_stage10_ci'
  || db.pathname !== '/meg_stage10_sandbox'
  || db.searchParams.get('schema') !== 'public') {
  throw new Error('STAGE10_QA_DISPOSABLE_ONLY');
}

const stamp = 'stage10-review-'+randomUUID();
const rollback = new Error('MEG_STAGE10_QA_EXPECTED_ROLLBACK');
let eventId = '';
try {
  await prisma.$transaction(async tx => {
    const user = await tx.user.create({data: {
      name:'Stage10 QA',email:stamp+'@meg.test',
      passwordHash:'QA_ONLY',role:UserRole.ADMIN,
      status:UserStatus.ACTIVE,isActive:true,
    }});
    const workspace = await tx.workspace.create({data: {
      ownerId:user.id,name:'Stage10 QA',
      slug:stamp,
    }});
    const account = await tx.account.create({data: {
      userId:user.id,name:'Conta ficticia',type:'checking',
    }});
    const category = await tx.category.create({data: {
      userId:user.id,name:'Mercado',group:'CONTAS GERAIS',type:'expense',isActive:true,
    }});
    const method = await tx.paymentMethod.create({data: {
      userId:user.id,name:'PIX',type:'instant',isActive:true,
    }});
    const payload = {
      category:'Mercado',expenseClass:'CONTAS GERAIS',
      paymentMethod:'PIX',financialScope:'monetary',modality:'à vista',
    };
    const row = await tx.financialEvent.create({data:{
      userId:user.id,workspaceId:workspace.id,
      legacyTransactionId:'qa-'+stamp,
      description:'Mercado ficticio',type:'expense',status:'paid',
      date:new Date('2026-11-17T12:00:00Z'),competence:'2026-11',
      amount:new Prisma.Decimal('22.35'),signedAmount:new Prisma.Decimal('-22.35'),
      accountId:account.id,sourcePayload:payload,
    }});
    eventId=row.id;
    const proposal = classifyStage10HistoricalLink({
      event:{
        id:row.id,userId:row.userId,type:row.type,status:row.status,
        amount:Number(row.amount),signedAmount:Number(row.signedAmount),
        categoryId:row.categoryId,paymentMethodId:row.paymentMethodId,
        archivedAt:row.archivedAt,sourcePayload:row.sourcePayload,
        account:{id:account.id,userId:account.userId,type:account.type,isActive:account.isActive},
        hasLedger:false,hasReceipt:false,hasPayablePayment:false,hasImportedRow:false,
      },
      category, paymentMethod:method,categoryMatchCount:1,paymentMatchCount:1,
    });
    assert.equal(proposal.classification,'eligible_for_explicit_review');
    assert.equal(proposal.writeAuthorized,false,
      'É somente um teste que simula aprovação de uma fixture; jamais aprova produção.');

    // Cenário fictício aprovado apenas pela fixture QA. A transação inteira
    // será abortada intencionalmente antes de persistir qualquer registro.
    const before = await tx.financialEvent.findUniqueOrThrow({where:{id:row.id}});
    const beforeLedger = await tx.ledgerEntry.count({where:{eventId:row.id}});
    const after = await tx.financialEvent.update({where:{id:row.id},data:{
      categoryId:proposal.categoryId,paymentMethodId:proposal.paymentMethodId,
    }});
    assert.equal(after.id,before.id);
    assert.equal(after.legacyTransactionId,before.legacyTransactionId);
    assert.equal(after.userId,before.userId);
    assert.equal(after.workspaceId,before.workspaceId);
    assert.equal(after.accountId,before.accountId);
    assert.equal(after.description,before.description);
    assert.equal(after.status,before.status);
    assert.equal(after.type,before.type);
    assert.equal(after.amount.toString(),before.amount.toString());
    assert.equal(after.signedAmount.toString(),before.signedAmount.toString());
    assert.equal(after.competence,before.competence);
    assert.equal(after.date.toISOString(),before.date.toISOString());
    assert.equal(JSON.stringify(after.sourcePayload),JSON.stringify(before.sourcePayload));
    assert.equal(await tx.ledgerEntry.count({where:{eventId:row.id}}),beforeLedger);
    assert.equal(after.categoryId,category.id);
    assert.equal(after.paymentMethodId,method.id);
    assert.equal(await tx.financialEvent.count({where:{
      workspaceId:workspace.id,legacyTransactionId:row.legacyTransactionId,
    }}),1);
    throw rollback;
  },{maxWait:10_000,timeout:30_000});
  throw new Error('STAGE10_QA_TRANSACTION_MUST_ROLL_BACK');
} catch (e) {
  if (e !== rollback) throw e;
}
assert.equal(await prisma.financialEvent.count({where:{id:eventId}}),0);
assert.equal(await prisma.user.count({where:{email:stamp+'@meg.test'}}),0);
console.log('MEG_STAGE10_MAPPING_LINK_NEUTRALITY_PG17_ROLLBACK_PASS');
await prisma.$disconnect();
