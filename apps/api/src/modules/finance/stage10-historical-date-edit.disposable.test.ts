import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '@meg/database';
import {HistoricalTextEditError,updateHistoricalExpenseInIsolatedQa} from './stage10-historical-text-edit';

const uri=new URL(process.env.DATABASE_URL||'postgresql://x:x@invalid:123/x');
assert.equal(process.env.MEG_STAGE10_HISTORICAL_DISPOSABLE_WRITE_TEST,'1');
assert.equal(uri.hostname,'127.0.0.1');
assert.equal(uri.port,'55459');
assert.equal(uri.pathname,'/meg_stage10_pt63_disposable');
assert.equal(uri.username,'meg_stage10_pt63_writer');
try{
 const ws=await prisma.workspace.findFirst({select:{id:true,ownerId:true}});
 assert.ok(ws);
 const events=await prisma.financialEvent.findMany({
  where:{workspaceId:ws.id,userId:ws.ownerId,type:'expense',status:'paid',
   archivedAt:null,legacyTransactionId:{not:null},account:{type:'checking'}},
  include:{account:true,paymentMethod:true,receipt:true,payablePayment:true,importedRow:true},
  orderBy:{date:'desc'},take:450,
 });
 let item:typeof events[number]|null=null;
 let nextDate='';
 for(const e of events){
  if(e.receipt||e.payablePayment||e.importedRow||e.paymentMethod?.type==='credit')continue;
  if(e.description.toUpperCase().includes('VEROCARD')||Number(e.signedAmount)>=0)continue;
  const next=new Date(e.date.getTime()+86400000);
  if(next.getTime()>Date.now())continue;
  const ledger=await prisma.ledgerEntry.findMany({where:{eventId:e.id},take:2});
  if(ledger.length>1)continue;
  item=e;nextDate=next.toISOString().slice(0,10);break;
 }
 if(!item){
  console.log('PT72_DATE_ELIGIBLE_CANDIDATE=NONE');
  process.exitCode=3;
 }else{
  console.log('PT72_DATE_ELIGIBLE_CANDIDATE=PASS');
  const old=item;
  const rev=(await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id},select:{revision:true}})).revision;
  const beforeLedger=await prisma.ledgerEntry.findMany({where:{eventId:old.id},select:{id:true,accountId:true,date:true,debit:true,credit:true}});
  const beforeAudit=await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:old.id}});
  const beforeReceipt=await prisma.cloudMutationReceipt.count({where:{workspaceId:ws.id}});
  const input={operationId:randomUUID(),expectedUpdatedAt:old.updatedAt.toISOString(),
   expectedRevision:rev,description:old.description,notes:old.notes??'',date:nextDate};
  const response=await updateHistoricalExpenseInIsolatedQa(ws.ownerId,old.id,input);
  assert.equal(response.id,old.id);assert.equal(response.revision,rev+1);
  const after=await prisma.financialEvent.findUniqueOrThrow({where:{id:old.id}});
  assert.equal(after.date.toISOString().slice(0,10),nextDate);
  assert.equal(after.competence,nextDate.slice(0,7));
  assert.equal(after.accountId,old.accountId);
  assert.equal(after.categoryId,old.categoryId);
  assert.equal(after.paymentMethodId,old.paymentMethodId);
  assert.equal(after.status,old.status);
  assert.equal(after.amount.toString(),old.amount.toString());
  console.log('PT72_DATE_AND_COMPETENCE_CANONICAL=PASS');
  const app=await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id}});
  assert.equal(app.revision,rev+1);
  const rows=(app.state as {transactions?:unknown[]}).transactions??[];
  const matched=rows.filter(x=>x&&typeof x==='object'&&(x as {id?:unknown}).id===old.legacyTransactionId);
  assert.equal(matched.length,1);
  assert.equal((matched[0] as {date?:unknown}).date,nextDate);
  assert.equal((after.sourcePayload as {date?:unknown}).date,nextDate);
  console.log('PT72_DATE_LEGACY_MIRROR=PASS');
  const afterLedger=await prisma.ledgerEntry.findMany({where:{eventId:old.id},select:{id:true,accountId:true,date:true,debit:true,credit:true}});
  assert.equal(afterLedger.length,beforeLedger.length||(beforeLedger.length===0?1:0));
  for(const l of afterLedger){
   assert.equal(l.date.toISOString().slice(0,10),nextDate);
   assert.equal(l.accountId,old.accountId);
   assert.equal(l.debit.toString(),'0');
   assert.equal(l.credit.toString(),old.amount.toString());
  }
  assert.equal(await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:old.id}}),beforeAudit+1);
  assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:ws.id}}),beforeReceipt+1);
  console.log('PT72_DATE_LEDGER_AUDIT_RECEIPT=PASS');
  const replay=await updateHistoricalExpenseInIsolatedQa(ws.ownerId,old.id,input);
  assert.equal(replay.idempotentReplay,true);
  console.log('PT72_DATE_IDEMPOTENCY=PASS');
  try{
   await updateHistoricalExpenseInIsolatedQa(ws.ownerId,old.id,{...input,operationId:randomUUID()});
   assert.fail('STALE_REVISION_NOT_BLOCKED');
  }catch(e){assert.ok(e instanceof HistoricalTextEditError);assert.equal(e.code,'STALE_APPSTATE_REVISION')}
  console.log('PT72_DATE_STALE_REVISION_BLOCKED=PASS');
  console.log('PT72_ISOLATED_PAID_DATE_EDIT=PASS');
 }
}catch(e){
 console.log('PT72_FAILURE_CATEGORY='+(e instanceof HistoricalTextEditError?e.code:e instanceof Error?e.name:'UNKNOWN'));
 process.exitCode=1;
}finally{await prisma.$disconnect();}
