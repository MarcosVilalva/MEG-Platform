import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '@meg/database';
import {HistoricalTextEditError,updateHistoricalExpenseInIsolatedQa} from './stage10-historical-text-edit';

const u=new URL(process.env.DATABASE_URL||'postgresql://x:x@invalid:123/no');
assert.equal(process.env.MEG_STAGE10_HISTORICAL_DISPOSABLE_WRITE_TEST,'1');
assert.equal(u.hostname,'127.0.0.1');
assert.equal(u.port,'55459');
assert.equal(u.pathname,'/meg_stage10_pt63_disposable');
assert.equal(u.username,'meg_stage10_pt63_writer');
try{
 const ws=await prisma.workspace.findFirst({select:{id:true,ownerId:true}});
 assert.ok(ws);
 const categories=await prisma.category.findMany({where:{userId:ws.ownerId,isActive:true},select:{id:true,name:true,group:true,type:true},take:200});
 const items=await prisma.financialEvent.findMany({
  where:{userId:ws.ownerId,workspaceId:ws.id,archivedAt:null,legacyTransactionId:{not:null},
   type:'expense',status:'paid',account:{type:'checking'}},
  include:{account:true,paymentMethod:true,receipt:true,payablePayment:true,importedRow:true},
  orderBy:{date:'desc'},take:450
 });
 let picked:typeof items[number]|null=null;
 let next:typeof categories[number]|null=null;
 for(const e of items){
  if(e.receipt||e.payablePayment||e.importedRow||e.paymentMethod?.type==='credit')continue;
  const raw=e.sourcePayload;
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Object.prototype.hasOwnProperty.call(raw,'category'))continue;
  if(e.description.toUpperCase().includes('VEROCARD')||Number(e.signedAmount)>=0)continue;
  const candidate=categories.find(c=>c.id!==e.categoryId&&c.name!==((raw as Record<string,unknown>).category)
    &&(!e.categoryId||c.type===null||c.type==='expense'));
  if(candidate){picked=e;next=candidate;break;}
 }
 if(!picked||!next){
  console.log('PT70_CATEGORY_ELIGIBLE_CANDIDATE=NONE');
  process.exitCode=3;
 }else{
  console.log('PT70_CATEGORY_ELIGIBLE_CANDIDATE=PASS');
  const old=picked;
  const beforeRev=(await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id},select:{revision:true}})).revision;
  const oldLedger=await prisma.ledgerEntry.findMany({where:{eventId:old.id},select:{id:true,debit:true,credit:true,accountId:true,date:true}});
  const oldAudit=await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:old.id}});
  const oldReceipt=await prisma.cloudMutationReceipt.count({where:{workspaceId:ws.id}});
  const input={operationId:randomUUID(),expectedUpdatedAt:old.updatedAt.toISOString(),expectedRevision:beforeRev,
   description:old.description,notes:old.notes??'',categoryId:next.id};
  const response=await updateHistoricalExpenseInIsolatedQa(ws.ownerId,old.id,input);
  assert.equal(response.id,old.id);
  assert.equal(response.revision,beforeRev+1);
  const after=await prisma.financialEvent.findUniqueOrThrow({where:{id:old.id}});
  assert.equal(after.categoryId,next.id);
  assert.equal(after.accountId,old.accountId);
  assert.equal(after.paymentMethodId,old.paymentMethodId);
  assert.equal(after.date.toISOString(),old.date.toISOString());
  assert.equal(after.amount.toString(),old.amount.toString());
  assert.equal(after.signedAmount.toString(),old.signedAmount.toString());
  console.log('PT70_CATEGORY_CANONICAL_FK_UPDATED=PASS');
  const app=await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id}});
  assert.equal(app.revision,beforeRev+1);
  const rows=(app.state as {transactions?:unknown[]}).transactions??[];
  const matched=rows.filter(x=>x&&typeof x==='object'&&(x as {id?:unknown}).id===old.legacyTransactionId);
  assert.equal(matched.length,1);
  const mirror=matched[0] as {category?:unknown;group?:unknown};
  assert.equal(mirror.category,next.name);
  if(Object.prototype.hasOwnProperty.call(old.sourcePayload,'group'))assert.equal(mirror.group,next.group??'');
  assert.equal((after.sourcePayload as {category?:unknown}).category,next.name);
  console.log('PT70_CATEGORY_LEGACY_MIRROR_CONSISTENT=PASS');
  const afterLedger=await prisma.ledgerEntry.findMany({where:{eventId:old.id},select:{id:true,debit:true,credit:true,accountId:true,date:true}});
  assert.equal(afterLedger.length,oldLedger.length);
  for(let i=0;i<oldLedger.length;i++){
   assert.equal(afterLedger[i].id,oldLedger[i].id);
   assert.equal(afterLedger[i].debit.toString(),oldLedger[i].debit.toString());
   assert.equal(afterLedger[i].credit.toString(),oldLedger[i].credit.toString());
   assert.equal(afterLedger[i].accountId,oldLedger[i].accountId);
   assert.equal(afterLedger[i].date.toISOString(),oldLedger[i].date.toISOString());
  }
  assert.equal(await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:old.id}}),oldAudit+1);
  assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:ws.id}}),oldReceipt+1);
  console.log('PT70_CATEGORY_LEDGER_AUDIT_RECEIPT=PASS');
  const replay=await updateHistoricalExpenseInIsolatedQa(ws.ownerId,old.id,input);
  assert.equal(replay.idempotentReplay,true);
  console.log('PT70_CATEGORY_IDEMPOTENCY=PASS');
  try{
   await updateHistoricalExpenseInIsolatedQa(ws.ownerId,old.id,{...input,operationId:randomUUID()});
   assert.fail('STALE_REVISION_NOT_BLOCKED');
  }catch(e){assert.ok(e instanceof HistoricalTextEditError);assert.equal(e.code,'STALE_APPSTATE_REVISION')}
  console.log('PT70_CATEGORY_STALE_REVISION_BLOCKED=PASS');
  console.log('PT70_ISOLATED_CATEGORY_EDIT=PASS');
 }
}catch(e){
 const category=e instanceof HistoricalTextEditError?e.code:e instanceof Error?e.name:'UNKNOWN';
 console.log('PT70_FAILURE_CATEGORY='+category);
 process.exitCode=1;
}finally{await prisma.$disconnect();}
