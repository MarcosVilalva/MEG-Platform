import assert from 'node:assert/strict';
import {prisma,UserRole,UserStatus} from '@meg/database';
import {synchronizeNormalizedRows} from '../app-state/normalization-migration';

/** Apenas carateriza o risco atual. NUNCA executa em banco externo ou de producao. */
const url=new URL(process.env.DATABASE_URL||'http://invalid');
if(process.env.MEG_STAGE10_ISOLATED_PG!=='1'
 || !['127.0.0.1','localhost'].includes(url.hostname)
 || url.pathname!=='/meg_stage10_sandbox'
 || url.username!=='meg_stage10_ci')
 throw new Error('STAGE10_QA_DISPOSABLE_ONLY');

class ExpectedRollback extends Error {}
const stamp='stage10-sync-qa-'+Date.now()+'-'+Math.random().toString(36).slice(2);
async function test(){
 const user=await prisma.user.create({data:{
  email:stamp+'@meg.test',name:'Titular ficticio QA',passwordHash:'QA_ONLY',
  role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
 }});
 const workspace=await prisma.workspace.create({data:{
  name:'QA isolado de sincronizacao',slug:stamp,ownerId:user.id,
 }});
 const account=await prisma.account.create({data:{
  userId:user.id,name:'Conta QA',type:'checking',
 }});
 const category=await prisma.category.create({data:{
  userId:user.id,name:'Mercado',group:'CONTAS GERAIS',type:'expense',
 }});
 const method=await prisma.paymentMethod.create({data:{
  userId:user.id,name:'PIX',type:'instant',
 }});
 const legacyId='legacy-'+stamp;
 const payload={
  id:legacyId,description:'Despesa ficticia de QA',
  date:'2026-11-11',type:'expense',status:'paid',situation:'PAGO',
  amount:35.25,expenseAmount:35.25,
  financialAccountId:account.id,category:'Mercado',group:'Mercado',
  expenseClass:'CONTAS GERAIS',paymentMethod:'PIX',modality:'À VISTA',
 };
 const before=await prisma.financialEvent.create({data:{
  workspaceId:workspace.id,userId:user.id,legacyTransactionId:legacyId,
  description:payload.description,type:'expense',status:'paid',
  date:new Date('2026-11-11T12:00:00Z'),competence:'2026-11',
  amount:35.25,signedAmount:-35.25,accountId:account.id,
  categoryId:category.id,paymentMethodId:method.id,sourcePayload:payload,
 }});
 let riskObserved=false;
 try{
  await prisma.$transaction(async(tx)=>{
   const state={__megNormalization:{mode:'normalized-primary'},transactions:[payload]};
   const result=await synchronizeNormalizedRows(tx,state,{
    workspaceId:workspace.id,userId:user.id,revision:2,
   },[legacyId]);
   assert.equal(result.active,true);
   const after=await tx.financialEvent.findMany({where:{
    workspaceId:workspace.id,legacyTransactionId:legacyId,
   }});
   assert.equal(after.length,1);
   // Este e o risco que precisamos corrigir ANTES de qualquer saneamento real.
   assert.notEqual(after[0].id,before.id,'sincronizacao atual recria a identidade');
   assert.equal(after[0].categoryId,null,'sincronizacao atual perde categoryId');
   assert.equal(after[0].paymentMethodId,null,'sincronizacao atual perde paymentMethodId');
   assert.equal(after[0].amount.toString(),before.amount.toString());
   assert.equal(after[0].status,before.status);
   riskObserved=true;
   throw new ExpectedRollback();
  });
  throw new Error('QA_SYNC_EXPECTED_ROLLBACK_NOT_TRIGGERED');
 }catch(e){
  if(!(e instanceof ExpectedRollback))throw e;
 }
 assert.equal(riskObserved,true);
 const restored=await prisma.financialEvent.findUniqueOrThrow({where:{id:before.id}});
 assert.equal(restored.id,before.id);
 assert.equal(restored.categoryId,category.id);
 assert.equal(restored.paymentMethodId,method.id);
 assert.equal(await prisma.financialEvent.count({where:{
  workspaceId:workspace.id,legacyTransactionId:legacyId,
 }}),1);
 console.log('MEG_STAGE10_QA_SYNC_DESTRUCTIVE_RISK_REPRODUCED_AND_ROLLED_BACK PASS');
}
test().catch(e=>{console.error('MEG_STAGE10_QA_SYNC_CHARACTERIZATION_FAIL',e);process.exitCode=1;})
.finally(async()=>prisma.$disconnect());
