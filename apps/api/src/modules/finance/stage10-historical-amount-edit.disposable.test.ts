/**
 * PT64: monetary edit on disposable clone only, never personal browser.
 * Test a legacy expense with/without existing ledger, preserving all IDs.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '@meg/database';
import {HistoricalTextEditError,updateHistoricalExpenseTextInDisposableClone} from './stage10-historical-text-edit';
import {monetaryAccountBalanceAt} from './monetary-protection';

const u=new URL(process.env.DATABASE_URL||'postgresql://x:x@invalid/invalid');
assert.equal(process.env.MEG_STAGE10_HISTORICAL_DISPOSABLE_WRITE_TEST,'1');
assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55459');
assert.equal(u.pathname,'/meg_stage10_pt63_disposable');
assert.equal(u.username,'meg_stage10_pt63_writer');
const run=async()=>{
 const ws=await prisma.workspace.findFirst({select:{id:true,ownerId:true}});
 assert.ok(ws);
 const candidates=await prisma.financialEvent.findMany({
  where:{workspaceId:ws.id,userId:ws.ownerId,type:'expense',status:'paid',
   archivedAt:null,legacyTransactionId:{not:null},
   account:{type:'checking'},signedAmount:{lt:0},amount:{gt:0.01}},
  include:{account:true,paymentMethod:true,receipt:true,payablePayment:true,
   importedRow:true,ledgerEntries:true},
  take:650,orderBy:{date:'desc'},
 });
 const rows=candidates.filter(e=>!e.receipt&&!e.payablePayment&&!e.importedRow&&
  e.description.length<=155&&!e.description.toUpperCase().includes('VEROCARD')&&
  e.ledgerEntries.length<=1);
 console.log('PT64_SUITABLE_HISTORICAL_ROWS='+rows.length);
 assert.ok(rows.length>0);
 const one=rows.find(e=>e.ledgerEntries.length===1)||rows.find(e=>e.ledgerEntries.length===0);
 assert.ok(one);
 const state=await prisma.appState.findUniqueOrThrow({
  where:{workspaceId:ws.id},select:{revision:true},
 });
 const day=one.date.toISOString().slice(0,10);
 const beforeBalance=await monetaryAccountBalanceAt(prisma,ws.ownerId,one.account!,day);
 const ledgerBefore=one.ledgerEntries.map(l=>({
  id:l.id,accountId:l.accountId,date:l.date.toISOString(),
  debit:l.debit.toString(),credit:l.credit.toString(),
 }));
 const moneyBefore=Math.round(Number(one.amount)*100);
 assert.ok(moneyBefore>=2);
 const input={
  operationId:randomUUID(),expectedUpdatedAt:one.updatedAt.toISOString(),
  expectedRevision:state.revision,description:one.description,
  notes:one.notes||'',amount:(moneyBefore-1)/100,
 };
 const saved=await updateHistoricalExpenseTextInDisposableClone(ws.ownerId,one.id,input);
 assert.equal(saved.id,one.id);assert.equal(saved.revision,state.revision+1);
 console.log('PT64_AMOUNT_DOWN_ONE_CENT_SAVE=PASS');
 const after=await prisma.financialEvent.findUniqueOrThrow({
  where:{id:one.id},include:{ledgerEntries:true},
 });
 assert.equal(after.id,one.id);
 assert.equal(after.legacyTransactionId,one.legacyTransactionId);
 assert.equal(after.accountId,one.accountId);
 assert.equal(after.categoryId,one.categoryId);
 assert.equal(after.paymentMethodId,one.paymentMethodId);
 assert.equal(after.date.toISOString(),one.date.toISOString());
 assert.equal(after.status,one.status);
 assert.equal(Math.round(Number(after.amount)*100),moneyBefore-1);
 assert.equal(Math.round(Number(after.signedAmount)*100),-moneyBefore+1);
 console.log('PT64_CANONICAL_AMOUNT_AND_IDS=PASS');
 assert.equal(after.ledgerEntries.length,1);
 const ledger=after.ledgerEntries[0];
 assert.equal(ledger.accountId,one.accountId);
 assert.equal(Math.round(Number(ledger.debit)*100),0);
 assert.equal(Math.round(Number(ledger.credit)*100),moneyBefore-1);
 if(ledgerBefore.length){
  assert.equal(ledger.id,ledgerBefore[0].id);
  console.log('PT64_LEDGER_EXISTING_ID_PRESERVED=PASS');
 }else{
  console.log('PT64_MISSING_LEGACY_LEDGER_RECONCILED=PASS');
 }
 const afterBalance=await monetaryAccountBalanceAt(prisma,ws.ownerId,one.account!,day);
 assert.equal(Math.round((afterBalance-beforeBalance)*100),1);
 console.log('PT64_CANONICAL_BALANCE_DELTA_ONE_CENT=PASS');
 const app=await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id}});
 assert.equal(app.revision,state.revision+1);
 const raw=app.state as Record<string,unknown>;
 const entries=Array.isArray(raw.transactions)?raw.transactions:[];
 const same=entries.filter(x=>x&&typeof x==='object'&&
  String((x as Record<string,unknown>).id)===one.legacyTransactionId);
 assert.equal(same.length,1);
 assert.equal(Math.round(Number((same[0] as Record<string,unknown>).expenseAmount)*100),moneyBefore-1);
 console.log('PT64_APPSTATE_LEGACY_AMOUNT_MIRROR=PASS');
 const replay=await updateHistoricalExpenseTextInDisposableClone(ws.ownerId,one.id,input);
 assert.equal(replay.idempotentReplay,true);
 console.log('PT64_AMOUNT_IDEMPOTENCY=PASS');
 const futureRevision=await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id},select:{revision:true}});
 try{
  await updateHistoricalExpenseTextInDisposableClone(ws.ownerId,one.id,{
   ...input,operationId:randomUUID(),expectedUpdatedAt:after.updatedAt.toISOString(),
   expectedRevision:futureRevision.revision,amount:Number(after.amount)+1_000_000_000,
  });
  assert.fail('UNSAFE_LARGE_EXPENSE_NOT_REJECTED');
 }catch(e){
  assert.ok(e instanceof HistoricalTextEditError);
  assert.ok(['INSUFFICIENT_FUTURE_BALANCE','BALANCE_WINDOW_TOO_LARGE'].includes(e.code));
 }
 const last=await prisma.appState.findUniqueOrThrow({where:{workspaceId:ws.id},select:{revision:true}});
 assert.equal(last.revision,state.revision+1);
 console.log('PT64_LARGE_DEBIT_REFUSED_NO_EXTRA_REVISION=PASS');
 console.log('PT64_HISTORICAL_MONETARY_EDIT=PASS');
};
try{await run();}
catch(err){
 const type=err instanceof HistoricalTextEditError?err.code:
  err&&typeof err==='object'&&'code'in err?String(err.code):
  err instanceof Error?err.name:'UNKNOWN';
 console.log('PT64_FAILURE_CATEGORY='+type);
 process.exitCode=1;
}finally{await prisma.$disconnect();}
