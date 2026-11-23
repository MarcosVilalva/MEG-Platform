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
 const methods=await prisma.paymentMethod.findMany({
  where:{userId:ws.ownerId,isActive:true},select:{id:true,name:true,type:true},take:250
 });
 const ordinary=methods.filter(x=>x.type!=='credit'&&x.type!=='benefit'&&x.name.toUpperCase()!=='VEROCARD');
 const events=await prisma.financialEvent.findMany({
  where:{workspaceId:ws.id,userId:ws.ownerId,type:'expense',status:'paid',
   archivedAt:null,legacyTransactionId:{not:null},account:{type:'checking'}},
  include:{account:true,paymentMethod:true,receipt:true,payablePayment:true,importedRow:true,category:true},
  orderBy:{date:'desc'},take:550,
 });
 let item:typeof events[number]|null=null;
 let method:typeof ordinary[number]|null=null;
 for(const event of events){
  if(event.receipt||event.payablePayment||event.importedRow||event.paymentMethod?.type==='credit')continue;
  if(event.description.toUpperCase().includes('VEROCARD')||Number(event.signedAmount)>=0)continue;
  const raw=event.sourcePayload;
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Object.prototype.hasOwnProperty.call(raw,'paymentMethod'))continue;
  const candidate=ordinary.find(x=>x.id!==event.paymentMethodId);
  if(candidate){item=event;method=candidate;break;}
 }
 if(!item||!method){
  console.log('PT71_ORDINARY_METHOD_CANDIDATE=NONE');
  process.exitCode=3;
 }else{
  console.log('PT71_ORDINARY_METHOD_CANDIDATE=PASS');
  const old=item;
  const rev=(await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id},select:{revision:true}})).revision;
  const ledgerBefore=await prisma.ledgerEntry.findMany({where:{eventId:old.id},select:{id:true,accountId:true,date:true,debit:true,credit:true}});
  const auditBefore=await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:old.id}});
  const receiptsBefore=await prisma.cloudMutationReceipt.count({where:{workspaceId:ws.id}});
  const input={operationId:randomUUID(),expectedUpdatedAt:old.updatedAt.toISOString(),
   expectedRevision:rev,description:old.description,notes:old.notes??'',paymentMethodId:method.id};
  const response=await updateHistoricalExpenseInIsolatedQa(ws.ownerId,old.id,input);
  assert.equal(response.id,old.id);
  assert.equal(response.revision,rev+1);
  const after=await prisma.financialEvent.findUniqueOrThrow({where:{id:old.id}});
  assert.equal(after.paymentMethodId,method.id);
  assert.equal(after.categoryId,old.categoryId);
  assert.equal(after.accountId,old.accountId);
  assert.equal(after.date.toISOString(),old.date.toISOString());
  assert.equal(after.status,old.status);
  assert.equal(after.signedAmount.toString(),old.signedAmount.toString());
  console.log('PT71_PAYMENT_METHOD_CANONICAL_FK_UPDATED=PASS');
  const app=await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id}});
  assert.equal(app.revision,rev+1);
  const rows=(app.state as {transactions?:unknown[]}).transactions??[];
  const matched=rows.filter(x=>x&&typeof x==='object'&&(x as {id?:unknown}).id===old.legacyTransactionId);
  assert.equal(matched.length,1);
  assert.equal((matched[0] as {paymentMethod?:unknown}).paymentMethod,method.name);
  assert.equal((after.sourcePayload as {paymentMethod?:unknown}).paymentMethod,method.name);
  console.log('PT71_PAYMENT_METHOD_APPSTATE_MIRROR=PASS');
  const ledgerAfter=await prisma.ledgerEntry.findMany({where:{eventId:old.id},select:{id:true,accountId:true,date:true,debit:true,credit:true}});
  assert.deepEqual(ledgerAfter.map(x=>({...x,debit:x.debit.toString(),credit:x.credit.toString(),date:x.date.toISOString()})),
   ledgerBefore.map(x=>({...x,debit:x.debit.toString(),credit:x.credit.toString(),date:x.date.toISOString()})));
  assert.equal(await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:old.id}}),auditBefore+1);
  assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:ws.id}}),receiptsBefore+1);
  console.log('PT71_METHOD_LEDGER_AUDIT_RECEIPT=PASS');
  const replay=await updateHistoricalExpenseInIsolatedQa(ws.ownerId,old.id,input);
  assert.equal(replay.idempotentReplay,true);
  console.log('PT71_METHOD_IDEMPOTENCY=PASS');
  try{
   await updateHistoricalExpenseInIsolatedQa(ws.ownerId,old.id,{...input,operationId:randomUUID()});
   assert.fail('STALE_REVISION_NOT_BLOCKED');
  }catch(e){assert.ok(e instanceof HistoricalTextEditError);assert.equal(e.code,'STALE_APPSTATE_REVISION')}
  console.log('PT71_METHOD_STALE_REVISION_BLOCKED=PASS');
  console.log('PT71_ISOLATED_PAYMENT_METHOD_EDIT=PASS');
 }
}catch(e){
 console.log('PT71_FAILURE_CATEGORY='+(e instanceof HistoricalTextEditError?e.code:e instanceof Error?e.name:'UNKNOWN'));
 process.exitCode=1;
}finally{await prisma.$disconnect();}
