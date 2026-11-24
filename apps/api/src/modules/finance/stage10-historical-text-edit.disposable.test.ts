/**
 * PT63 disposable database tests. Prints only sanitized pass/fail metadata.
 * Never loads the real browser session and never writes to protected databases.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '@meg/database';
import {HistoricalTextEditError,updateHistoricalExpenseTextInDisposableClone} from './stage10-historical-text-edit';

const uri=new URL(process.env.DATABASE_URL||'postgresql://no:pass@invalid/invalid');
assert.equal(process.env.MEG_STAGE10_HISTORICAL_DISPOSABLE_WRITE_TEST,'1');
assert.equal(uri.hostname,'127.0.0.1');
assert.equal(uri.port,'55459');
assert.equal(uri.pathname,'/meg_stage10_pt63_disposable');
assert.equal(uri.username,'meg_stage10_pt63_writer');

const run=async()=>{
 const identity=await prisma.$queryRaw<Array<{db:string;role:string;port:string}>>`
 SELECT current_database()::text AS db,current_user::text AS role,
 current_setting('port')::text AS port`;
 assert.equal(identity[0]?.db,'meg_stage10_pt63_disposable');
 assert.equal(identity[0]?.role,'meg_stage10_pt63_writer');
 assert.equal(identity[0]?.port,'55459');
 console.log('PT63_DATABASE_IDENTITY=PASS');
 const ws=await prisma.workspace.findFirst({
  select:{id:true,ownerId:true},
 });
 assert.ok(ws);
 const items=await prisma.financialEvent.findMany({
  where:{workspaceId:ws.id,userId:ws.ownerId,type:'expense',
   status:'paid',archivedAt:null,legacyTransactionId:{not:null},
   account:{type:'checking'}},
  select:{id:true,description:true,notes:true,legacyTransactionId:true,
   updatedAt:true,accountId:true,categoryId:true,paymentMethodId:true,
   date:true,amount:true,signedAmount:true,sourcePayload:true},
  orderBy:{date:'desc'},take:150,
 });
 console.log('PT63_CANDIDATE_FETCH='+items.length);
 let selected:typeof items[number]|null=null;
 for(const item of items){
  if(item.description.length>140)continue;
  const related=await prisma.financialEvent.findFirst({
   where:{id:item.id},
   select:{receipt:{select:{id:true}},payablePayment:{select:{id:true}},
    importedRow:{select:{id:true}}},
  });
  if(!related?.receipt&&!related?.payablePayment&&!related?.importedRow){
   selected=item;break;
  }
 }
 assert.ok(selected,'HISTORICAL_MONETARY_CANDIDATE_NOT_FOUND');
 console.log('PT63_MONETARY_HISTORICAL_CANDIDATE=PASS');
 const before=selected;
 const stateBefore=await prisma.appState.findUniqueOrThrow({
  where:{workspaceId:ws.id},select:{revision:true},
 });
 const ledgerBefore=await prisma.ledgerEntry.findMany({
  where:{eventId:before.id},
  select:{id:true,date:true,accountId:true,debit:true,credit:true},
  orderBy:{id:'asc'},
 });
 const auditBefore=await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:before.id}});
 const receiptBefore=await prisma.cloudMutationReceipt.count({where:{workspaceId:ws.id}});
 const countBefore=await prisma.financialEvent.count();
 const nextDescription=before.description+' (QA PT63)';
 const input={
  operationId:randomUUID(),expectedUpdatedAt:before.updatedAt.toISOString(),
  expectedRevision:stateBefore.revision,
  description:nextDescription,notes:(before.notes||'')+' QA63',
 };
 const saved=await updateHistoricalExpenseTextInDisposableClone(ws.ownerId,before.id,input);
 assert.equal(saved.id,before.id);
 assert.equal(saved.legacyTransactionId,before.legacyTransactionId);
 assert.equal(saved.revision,stateBefore.revision+1);
 assert.equal(saved.idempotentReplay,false);
 console.log('PT63_HISTORICAL_TEXT_SAVE=PASS');
 const fresh=await prisma.financialEvent.findUniqueOrThrow({where:{id:before.id}});
 assert.equal(fresh.description,nextDescription);
 assert.equal(fresh.notes,input.notes.trim());
 assert.equal(fresh.legacyTransactionId,before.legacyTransactionId);
 assert.equal(fresh.accountId,before.accountId);
 assert.equal(fresh.categoryId,before.categoryId);
 assert.equal(fresh.paymentMethodId,before.paymentMethodId);
 assert.equal(fresh.date.toISOString(),before.date.toISOString());
 assert.equal(fresh.amount.toString(),before.amount.toString());
 assert.equal(fresh.signedAmount.toString(),before.signedAmount.toString());
 assert.equal(await prisma.financialEvent.count(),countBefore);
 console.log('PT63_FINANCIAL_ID_AMOUNT_ACCOUNT_DATE_UNCHANGED=PASS');
 const ledgerAfter=await prisma.ledgerEntry.findMany({
  where:{eventId:before.id},
  select:{id:true,date:true,accountId:true,debit:true,credit:true,memo:true},
  orderBy:{id:'asc'},
 });
 assert.equal(ledgerAfter.length,ledgerBefore.length);
 for(let i=0;i<ledgerAfter.length;i++){
  const a=ledgerAfter[i],b=ledgerBefore[i];
  assert.equal(a.id,b.id);
  assert.equal(a.date.toISOString(),b.date.toISOString());
  assert.equal(a.accountId,b.accountId);
  assert.equal(a.debit.toString(),b.debit.toString());
  assert.equal(a.credit.toString(),b.credit.toString());
  assert.equal(a.memo,nextDescription);
 }
 console.log('PT63_LEDGER_FINANCIAL_FIELDS_AND_ROW_IDS=PASS');
 const stateAfter=await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id}});
 assert.equal(stateAfter.revision,stateBefore.revision+1);
 const state=stateAfter.state as Record<string,unknown>;
 const legacyRows=Array.isArray(state.transactions)?state.transactions:[];
 const matches=legacyRows.filter(x=>x&&typeof x==='object'&&
  (x as Record<string,unknown>).id===before.legacyTransactionId);
 assert.equal(matches.length,1);
 assert.equal((matches[0] as Record<string,unknown>).description,nextDescription);
 console.log('PT63_APPSTATE_MIRROR_REVISION=PASS');
 assert.equal(await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:before.id}}),auditBefore+1);
 assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:ws.id}}),receiptBefore+1);
 console.log('PT63_AUDIT_AND_MUTATION_RECEIPT=PASS');
 const replay=await updateHistoricalExpenseTextInDisposableClone(ws.ownerId,before.id,input);
 assert.equal(replay.idempotentReplay,true);
 assert.equal(replay.revision,saved.revision);
 assert.equal(await prisma.auditLog.count({where:{entity:'FinancialEvent',entityId:before.id}}),auditBefore+1);
 console.log('PT63_IDEMPOTENT_REPLAY=PASS');
 try{
  await updateHistoricalExpenseTextInDisposableClone(ws.ownerId,before.id,
   {...input,description:input.description+' diverge'});
  assert.fail('OPERATION_ID_REUSE_NOT_BLOCKED');
 }catch(e){
  assert.ok(e instanceof HistoricalTextEditError);
  assert.equal(e.code,'OPERATION_ID_REUSED');
 }
 console.log('PT63_MUTATION_KEY_CONFLICT=PASS');
 try{
  await updateHistoricalExpenseTextInDisposableClone(ws.ownerId,before.id,
   {...input,operationId:randomUUID()});
  assert.fail('STALE_REVISION_NOT_BLOCKED');
 }catch(e){
  assert.ok(e instanceof HistoricalTextEditError);
  assert.equal(e.code,'STALE_APPSTATE_REVISION');
 }
 console.log('PT63_STALE_REVISION_BLOCKED=PASS');
 console.log('PT63_DISPOSABLE_HISTORICAL_TEXT_EDIT=PASS');
};
try{await run();}
catch(error){
 const kind=error instanceof HistoricalTextEditError?error.code:
   error&&typeof error==='object'&&'code'in error?String(error.code):
   error instanceof Error?error.name:'UNKNOWN';
 console.log('PT63_TEST_FAILURE_CATEGORY='+kind);
 process.exitCode=1;
}finally{await prisma.$disconnect();}
