/**
 * PT73. Run ONLY against a brand-new disposable PostgreSQL clone with
 * explicit short-lived role, teardown trap, and no reference DB writes.
 * The active app's source data and protected WebQA are out of scope.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '@meg/database';
import {
 HistoricalTextEditError,updateHistoricalExpenseInIsolatedQa,
} from './stage10-historical-text-edit';
import { monetaryAccountBalanceAt } from './monetary-protection';
import { FinancialEventMutationError,createFinancialEventProtected } from './event-mutation';
import { buildNormalizationPreview } from '../app-state/normalization-migration-core';

const uri = new URL(process.env.DATABASE_URL || 'postgresql://x:x@invalid:123/x');
assert.equal(process.env.MEG_STAGE10_HISTORICAL_DISPOSABLE_WRITE_TEST,'1');
assert.equal(uri.hostname,'127.0.0.1');
assert.equal(uri.port,'55459');
assert.equal(uri.pathname,'/meg_stage10_pt63_disposable');
assert.equal(uri.username,'meg_stage10_pt63_writer');

const day=(date:Date)=>date.toISOString().slice(0,10);
const shifted=(date:Date,delta:number)=>new Date(Date.parse(day(date))+delta*86400000);
const checkError=async (action:()=>Promise<unknown>,code:string)=>{
 await assert.rejects(action,(error:unknown)=>{
  assert.ok(error instanceof HistoricalTextEditError);
  assert.equal(error.code,code);
  return true;
 });
};

async function seedOnlyFreshSyntheticDatabase(){
 const existing=await prisma.workspace.count();
 if(existing!==0)return;
 assert.equal(await prisma.financialEvent.count(),0);
 const user=await prisma.user.create({data:{
  name:'Titular sintético PT73',email:'pt73-'+randomUUID()+'@example.invalid',
  passwordHash:'not-a-real-password',role:'ADMIN',status:'ACTIVE',isActive:true,
 }});
 const ws=await prisma.workspace.create({data:{
  ownerId:user.id,name:'PT73 workspace descartável',slug:'pt73-'+randomUUID(),
 }});
 await prisma.workspaceMember.create({data:{
  workspaceId:ws.id,userId:user.id,role:'ADMIN',status:'ACTIVE',isActive:true,
 }});
 const account=await prisma.account.create({data:{
  userId:user.id,name:'Origem fictícia PT73',type:'checking',
  openingBalance:1000,isActive:true,
 }});
 const category=await prisma.category.create({data:{
  userId:user.id,name:'TESTE PT73',group:'CONTAS GERAIS',type:'expense',isActive:true,
 }});
 const method=await prisma.paymentMethod.create({data:{
  userId:user.id,name:'PIX PT73',type:'instant',isActive:true,
 }});
 const date='2026-09-04';
 const legacyId='pt73-legacy-'+randomUUID();
 const line={
  id:legacyId,financialAccountId:account.id,description:'Despesa sintética PT73',
  type:'expense',date,expenseAmount:45.23,amount:45.23,
  status:'paid',category:category.name,group:category.group,paymentMethod:method.name,
  financialScope:'monetary',notes:'',
 };
 const sourcePreview=buildNormalizationPreview({transactions:[line]},{
  workspaceId:ws.id,userId:user.id,revision:1,
 });
 assert.equal(sourcePreview.summary.validCount,1);
 const normalized=sourcePreview.events[0];
 const event=await prisma.financialEvent.create({data:{
  workspaceId:ws.id,userId:user.id,legacyTransactionId:legacyId,
  description:normalized.description,type:normalized.type,status:normalized.status,
  date:normalized.date,competence:normalized.competence,
  amount:normalized.amount,signedAmount:normalized.signedAmount,accountId:account.id,
  categoryId:category.id,paymentMethodId:method.id,sourcePayload:line,
  sourceRevision:1,amountBehavior:normalized.amountBehavior,necessity:normalized.necessity,
  frequency:normalized.frequency,classificationConfidence:normalized.classificationConfidence,
  classificationSource:normalized.classificationSource,
 }});
 await prisma.ledgerEntry.create({data:{
  eventId:event.id,accountId:account.id,date:new Date(date+'T12:00:00.000Z'),
  debit:0,credit:45.23,memo:line.description,
 }});
 await prisma.appState.create({data:{
  workspaceId:ws.id,userId:user.id,revision:1,
  state:{transactions:[line],__megNormalization:{mode:'normalized-primary'}},
 }});
 console.log('PT73_SYNTHETIC_FIXTURE_SEEDED=PASS');
}

try{
 await seedOnlyFreshSyntheticDatabase();
 const ws=await prisma.workspace.findFirst({select:{id:true,ownerId:true}});
 assert.ok(ws,'PT73_WORKSPACE_MISSING');
 const events=await prisma.financialEvent.findMany({
  where:{workspaceId:ws.id,userId:ws.ownerId,type:'expense',status:'paid',
   archivedAt:null,legacyTransactionId:{not:null},account:{type:'checking'}},
  include:{account:true,paymentMethod:true,receipt:true,payablePayment:true,importedRow:true},
  orderBy:{date:'desc'},take:450,
 });
 const item=events.find(e=>{
  if(e.receipt||e.payablePayment||e.importedRow||
     e.paymentMethod?.type==='credit'||!e.account||!e.accountId||
     Math.round(Number(e.signedAmount)*100)!==-Math.round(Number(e.amount)*100)||
     !Number.isSafeInteger(Math.round(Number(e.amount)*100)))return false;
  const raw=e.sourcePayload;
  if(!raw||Array.isArray(raw)||typeof raw!=='object')return false;
  if((raw as Record<string,unknown>).financialAccountId!==e.accountId)return false;
  if(day(e.date)>day(shifted(new Date(),-2)))return false;
  return !e.description.toUpperCase().includes('VEROCARD');
 });
 if(!item||!item.account){throw new Error('PT73_NO_ELIGIBLE_SOURCE_EVENT');}
 const before=await prisma.appState.findUniqueOrThrow({
  where:{workspaceId:ws.id},select:{revision:true,state:true},
 });
 const previousLedger=await prisma.ledgerEntry.findMany({where:{eventId:item.id}});
 assert.ok(previousLedger.length<=1);
 const oldAccount=item.account;
 const oldBalance=await monetaryAccountBalanceAt(prisma,ws.ownerId,oldAccount,day(item.date));
 const largeValue=Number(item.amount)+101;
 const target=await prisma.account.create({data:{
  userId:ws.ownerId,name:'PT73-descartavel-'+randomUUID(),type:'checking',
  openingBalance:0,isActive:true,
 }});
 // Artificial income the day BEFORE the expense. This is necessary to
 // distinguish an allowed account move from a forbidden earlier date.
 const incomeDate=shifted(item.date,-1);
 const income=await prisma.financialEvent.create({data:{
  userId:ws.ownerId,workspaceId:ws.id,description:'PT73 renda ficticia',
  type:'income',status:'paid',date:incomeDate,competence:day(incomeDate).slice(0,7),
  amount:largeValue,signedAmount:largeValue,accountId:target.id,
 }});
 await prisma.ledgerEntry.create({data:{
  eventId:income.id,accountId:target.id,date:incomeDate,
  debit:largeValue,credit:0,memo:'PT73 renda ficticia',
 }});
 const afterIncomeBalance=await monetaryAccountBalanceAt(prisma,ws.ownerId,target,day(item.date));
 assert.ok(Math.round(afterIncomeBalance*100)>=Math.round(Number(item.amount)*100));
 const beforeAudit=await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:item.id}});
 const beforeReceipts=await prisma.cloudMutationReceipt.count({where:{workspaceId:ws.id}});
 const req={
  operationId:randomUUID(),expectedUpdatedAt:item.updatedAt.toISOString(),
  expectedRevision:before.revision,description:item.description,notes:item.notes??'',
  accountId:target.id,
 };
 const result=await updateHistoricalExpenseInIsolatedQa(ws.ownerId,item.id,req);
 assert.equal(result.revision,before.revision+1);
 assert.equal(result.idempotentReplay,false);
 const edited=await prisma.financialEvent.findUniqueOrThrow({where:{id:item.id}});
 assert.equal(edited.id,item.id);
 assert.equal(edited.legacyTransactionId,item.legacyTransactionId);
 assert.equal(edited.accountId,target.id);
 assert.equal(edited.date.toISOString(),item.date.toISOString());
 assert.equal(edited.status,item.status);
 assert.equal(edited.amount.toString(),item.amount.toString());
 const sourceBalance=await monetaryAccountBalanceAt(prisma,ws.ownerId,oldAccount,day(item.date));
 const destBalance=await monetaryAccountBalanceAt(prisma,ws.ownerId,target,day(item.date));
 assert.equal(Math.round((sourceBalance-oldBalance)*100),Math.round(Number(item.amount)*100));
 assert.equal(Math.round((afterIncomeBalance-destBalance)*100),Math.round(Number(item.amount)*100));
 console.log('PT73_BOTH_ACCOUNTS_BALANCE=PASS');
 const ledger=await prisma.ledgerEntry.findMany({where:{eventId:item.id}});
 assert.equal(ledger.length,1);
 assert.equal(ledger[0].accountId,target.id);
 assert.equal(day(ledger[0].date),day(item.date));
 assert.equal(Math.round(Number(ledger[0].credit)*100),Math.round(Number(item.amount)*100));
 const mirror=await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id}});
 assert.equal(mirror.revision,before.revision+1);
 const mirrored=(mirror.state as {transactions?:unknown[]}).transactions??[];
 const rows=mirrored.filter(x=>x&&typeof x==='object'&&
  (x as {id?:unknown}).id===item.legacyTransactionId);
 assert.equal(rows.length,1);
 assert.equal((rows[0] as {financialAccountId?:unknown}).financialAccountId,target.id);
 const payload=edited.sourcePayload as Record<string,unknown>;
 assert.equal(payload.financialAccountId,target.id);
 assert.equal(await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:item.id}}),beforeAudit+1);
 assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:ws.id}}),beforeReceipts+1);
 console.log('PT73_LEDGER_MIRROR_AUDIT_RECEIPT=PASS');
 const replay=await updateHistoricalExpenseInIsolatedQa(ws.ownerId,item.id,req);
 assert.equal(replay.idempotentReplay,true);
 await checkError(()=>updateHistoricalExpenseInIsolatedQa(ws.ownerId,item.id,{
  ...req,operationId:randomUUID(),
 }),'STALE_APPSTATE_REVISION');
 console.log('PT73_REPLAY_AND_STALE=PASS');
 const retry={
  operationId:randomUUID(),expectedUpdatedAt:edited.updatedAt.toISOString(),
  expectedRevision:mirror.revision,description:edited.description,notes:edited.notes??'',
 };
 // A move to the day before fictitious income would overdraft the target.
 await checkError(()=>updateHistoricalExpenseInIsolatedQa(ws.ownerId,item.id,{
  ...retry,date:day(shifted(item.date,-2)),
 }),'INSUFFICIENT_INTERMEDIATE_BALANCE');
 const afterReject=await prisma.financialEvent.findUniqueOrThrow({where:{id:item.id}});
 assert.equal(day(afterReject.date),day(item.date));
 assert.equal(afterReject.accountId,target.id);
 assert.equal((await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id}})).revision,mirror.revision);
 console.log('PT73_NEGATIVE_EARLY_DATE_ROLLBACK=PASS');
 const blocked=await prisma.account.create({data:{
  userId:ws.ownerId,name:'PT73-sem-saldo-'+randomUUID(),type:'checking',
  openingBalance:0,isActive:true,
 }});
 await checkError(()=>updateHistoricalExpenseInIsolatedQa(ws.ownerId,item.id,{
  ...retry,operationId:randomUUID(),accountId:blocked.id,
 }),'INSUFFICIENT_TARGET_ACCOUNT_BALANCE');
 assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:item.id}})).accountId,target.id);
 console.log('PT73_TARGET_OVERDRAFT_BLOCKED=PASS');
 console.log('PT73_DISPOSABLE_ACCOUNT_AND_DATE=PASS');
 // Separate unification finding: characterize the ACTIVE canonical create path
 // on this disposable fixture. This does not authorize policy changes.
 const creationDay='2026-11-20';
 const available=await monetaryAccountBalanceAt(prisma,ws.ownerId,oldAccount,creationDay);
 const overdrawAmount=Math.max(2000,Math.ceil(available)+1000);
 let createError:unknown=null;
 try{
  await createFinancialEventProtected(ws.ownerId,{
   operationId:randomUUID(),description:'PT73 fixture nova despesa sem saldo',
   type:'expense',status:'paid',date:creationDay,
   amount:overdrawAmount,accountId:oldAccount.id,
   ...(item.paymentMethodId?{paymentMethodId:item.paymentMethodId}:{}),
  });
 }catch(e){createError=e;}
 assert.ok(createError instanceof FinancialEventMutationError,'OVERDRAFT_CREATE_MUST_REJECT');
 assert.equal(createError.code,'INSUFFICIENT_ACCOUNT_BALANCE');
 assert.equal(Math.round((await monetaryAccountBalanceAt(prisma,ws.ownerId,oldAccount,creationDay))*100),
  Math.round(available*100));
 console.log('UNIFICATION_CREATE_OVERDRAFT_BLOCKED=PASS');

 const appBeforeCreate=await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id}});
 const createReq={
  operationId:randomUUID(),description:'PT73 nova despesa valida sintetica',
  type:'expense' as const,status:'paid' as const,date:creationDay,amount:10,
  accountId:oldAccount.id,
  ...(item.paymentMethodId?{paymentMethodId:item.paymentMethodId}:{}),
 };
 const validCreate=(await createFinancialEventProtected(ws.ownerId,createReq)) as {id:string;idempotentReplay:boolean};
 assert.ok(validCreate.id);
 assert.equal(validCreate.idempotentReplay,false);
 assert.equal(Math.round((await monetaryAccountBalanceAt(prisma,ws.ownerId,oldAccount,creationDay))*100),
  Math.round((available-10)*100));
 const createReplay=await createFinancialEventProtected(ws.ownerId,createReq);
 assert.equal((createReplay as {idempotentReplay?:unknown}).idempotentReplay,true);
 const validLedger=await prisma.ledgerEntry.findMany({where:{eventId:validCreate.id}});
 assert.equal(validLedger.length,1);
 assert.equal(Math.round(Number(validLedger[0].credit)*100),1000);
 console.log('UNIFICATION_CREATE_VALID_AND_IDEMPOTENT=PASS');
 const createdApp=await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id}});
 const createdEvent=await prisma.financialEvent.findUniqueOrThrow({where:{id:validCreate.id}});
 assert.equal(createdApp.revision,appBeforeCreate.revision+1);
 assert.equal(createdEvent.legacyTransactionId,validCreate.id);
 const createdState=createdApp.state as {transactions?:Array<{id?:string;financialAccountId?:string}>};
 const mirrorRows=(createdState.transactions??[]).filter(x=>x.id===validCreate.id);
 assert.equal(mirrorRows.length,1);
 assert.equal(mirrorRows[0].financialAccountId,oldAccount.id);
 assert.equal((createdEvent.sourcePayload as {id?:string}).id,validCreate.id);
 const stateAfterReplay=await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id}});
 assert.equal(stateAfterReplay.revision,createdApp.revision);
 console.log('UNIFICATION_CREATE_ANDROID_MIRROR=PASS');
 console.log('UNIFICATION_CREATE_REPLAY_NO_MIRROR_DUPLICATE=PASS');

}catch(e){
 const code=e instanceof HistoricalTextEditError?e.code:e instanceof Error&&/^[A-Z][A-Z0-9_]+$/.test(e.message)?e.message:e instanceof Error?e.name:'UNKNOWN';
 console.log('PT73_FAILURE_CATEGORY='+code);
 process.exitCode=1;
}finally{await prisma.$disconnect();}
