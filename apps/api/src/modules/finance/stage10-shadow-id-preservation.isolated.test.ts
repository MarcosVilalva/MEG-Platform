import assert from 'node:assert/strict';
import { Prisma, prisma, UserRole, UserStatus } from '@meg/database';
import { applyNormalizationShadow } from '../app-state/normalization-migration';

const url = new URL(process.env.DATABASE_URL || 'http://invalid');
if (process.env.MEG_STAGE10_ISOLATED_PG !== '1'
 || !['127.0.0.1','localhost'].includes(url.hostname)
 || url.pathname !== '/meg_stage10_sandbox'
 || url.username !== 'meg_stage10_ci') {
 throw new Error('STAGE10_QA_DISPOSABLE_ONLY');
}
const stamp = 'stage10-shadow-' + Date.now() + '-' + Math.random().toString(36).slice(2);
const userIds: string[] = [];
const workspaceIds: string[] = [];
const ledgerIds: string[] = [];
function payload(id: string, accountId: string) {
 return {
  id, type:'expense', status:'paid', situation:'PAGO',
  date:'2026-11-11', description:'Lançamento fictício shadow',
  amount:23.41, expenseAmount:23.41, financialAccountId:accountId,
  category:'Mercado', expenseClass:'CONTAS GERAIS',
  paymentMethod:'PIX', modality:'À VISTA',
 };
}
async function makeWorkspace(suffix: string) {
 const user = await prisma.user.create({data:{
  email:stamp+'-'+suffix+'@meg.test',name:'QA Stage10',passwordHash:'QA_ONLY',
  role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
 }});
 userIds.push(user.id);
 const workspace = await prisma.workspace.create({data:{
  name:'QA shadow '+suffix,slug:stamp+'-'+suffix,ownerId:user.id,
 }});
 workspaceIds.push(workspace.id);
 const account = await prisma.account.create({data:{
  userId:user.id,name:'Conta QA '+suffix,type:'checking',
 }});
 const p=payload('legacy-'+stamp+'-'+suffix,account.id);
 await prisma.appState.create({data:{
  userId:user.id,workspaceId:workspace.id,revision:1,
  state:{transactions:[p],budgets:{}} as Prisma.InputJsonValue,
 }});
 return {user,workspace,account,p};
}
async function test() {
 try {
  const existing = await makeWorkspace('existing');
  const category = await prisma.category.create({data:{
   userId:existing.user.id,name:'Mercado',group:'CONTAS GERAIS',type:'expense',
  }});
  const method = await prisma.paymentMethod.create({data:{
   userId:existing.user.id,name:'PIX',type:'instant',
  }});
  const financial = await prisma.financialEvent.create({data:{
   userId:existing.user.id,workspaceId:existing.workspace.id,
   legacyTransactionId:existing.p.id,
   description:existing.p.description,type:'expense',status:'paid',
   date:new Date('2026-11-11T12:00:00Z'),competence:'2026-11',
   amount:23.41,signedAmount:-23.41,
   accountId:existing.account.id,categoryId:category.id,paymentMethodId:method.id,
   sourcePayload:existing.p,
  }});
  const ledger = await prisma.ledgerEntry.create({data:{
   eventId:financial.id,date:financial.date,accountId:existing.account.id,
   debit:0,credit:23.41,memo:'Somente QA',
  }});
  ledgerIds.push(ledger.id);
  await assert.rejects(
   () => applyNormalizationShadow(existing.workspace.id,existing.user.id,1),
   /NORMALIZATION_SHADOW_REBUILD_REQUIRES_CANONICAL_MIGRATION/,
  );
  const after = await prisma.financialEvent.findUniqueOrThrow({where:{id:financial.id}});
  assert.equal(after.id,financial.id);
  assert.equal(after.categoryId,category.id);
  assert.equal(after.paymentMethodId,method.id);
  assert.equal(after.amount.toString(),'23.41');
  assert.equal(await prisma.ledgerEntry.count({where:{eventId:financial.id}}),1);
  assert.equal(await prisma.financialEvent.count({where:{
   workspaceId:existing.workspace.id,legacyTransactionId:existing.p.id,
  }}),1);

  // Sem nenhum evento legado anterior, o semeio inicial ainda e permitido.
  const fresh = await makeWorkspace('fresh');
  const outcome = await applyNormalizationShadow(fresh.workspace.id,fresh.user.id,1);
  assert.equal(outcome.reconciled,true);
  const rows = await prisma.financialEvent.findMany({where:{
   workspaceId:fresh.workspace.id,legacyTransactionId:fresh.p.id,
  }});
  assert.equal(rows.length,1);
  assert.equal(rows[0].description,fresh.p.description);
  assert.equal(rows[0].amount.toString(),'23.41');

  // Segundo replay shadow nao pode substituir o ID criado pelo primeiro.
  await assert.rejects(
   () => applyNormalizationShadow(fresh.workspace.id,fresh.user.id,1),
   /NORMALIZATION_SHADOW_REBUILD_REQUIRES_CANONICAL_MIGRATION/,
  );
  assert.equal((await prisma.financialEvent.findFirstOrThrow({where:{
   workspaceId:fresh.workspace.id,legacyTransactionId:fresh.p.id,
  }})).id,rows[0].id);
  console.log('MEG_STAGE10_QA_SHADOW_SEED_ONLY_ID_AND_LEDGER_SAFE PASS');
 } finally {
  if(ledgerIds.length) await prisma.ledgerEntry.deleteMany({where:{id:{in:ledgerIds}}});
  for (const id of workspaceIds.reverse()) await prisma.workspace.delete({where:{id}});
  for (const id of userIds.reverse()) await prisma.user.delete({where:{id}});
  await prisma.$disconnect();
 }
}
test().catch(error => {console.error('MEG_STAGE10_QA_SHADOW_ID_FAIL',error);process.exitCode=1;});
