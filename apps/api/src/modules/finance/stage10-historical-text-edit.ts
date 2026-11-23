/**
 * Stage 10 HISTORICAL mutation characterization only.
 * Hard locked to a disposable PostgreSQL test database, NOT a public route.
 * Restricted to narrowly characterized edits of an existing monetary
 * expense with an existing normalized-primary legacy mirror.
 */
import { prisma } from '@meg/database';
import { mutationRequestHash,receiptCreateData } from '../app-state/mutation-receipt';
import { isNormalizedPrimary } from '../app-state/normalization-migration';
import { writeBackNormalizedEventsToAppState } from '../app-state/normalized-primary-writeback';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { isBenefitFinancialEvent,isMonetaryAccountType } from './financial-policy';
import { financialAmountValues } from './amount-sign';
import { activeAccountForUser,activeCategoryForUser,activePaymentMethodForUser } from './catalog-scope';
import { resolveCanonicalFinancialStatus } from './financial-policy';
import { monetaryAccountBalanceAt,monetaryAccountDebitWindow,serializableFinancialTransaction } from './monetary-protection';

const mutationType='STAGE10_HISTORICAL_TEXT_EDIT_TEST';
const protocol='stage10-historical-text-edit-v1';
export function assertIsolatedHistoricalWriteDestination(){
 let uri:URL;
 try {uri=new URL(process.env.DATABASE_URL||'');}
 catch {throw new HistoricalTextEditError('ISOLATED_DATABASE_URL_INVALID');}
 const test=process.env.MEG_STAGE10_HISTORICAL_DISPOSABLE_WRITE_TEST==='1'
   &&uri.port==='55459'&&uri.pathname==='/meg_stage10_pt63_disposable'
   &&decodeURIComponent(uri.username)==='meg_stage10_pt63_writer';
 const workbench=process.env.MEG_STAGE10_EDIT_WORKBENCH_WRITE==='1'
   &&process.env.MEG_STAGE10_HISTORICAL_DISPOSABLE_WRITE_TEST!=='1'
   &&uri.port==='55460'&&uri.pathname==='/meg_stage10_edit_workbench'
   &&decodeURIComponent(uri.username)==='meg_stage10_workbench_runtime';
 if(uri.protocol!=='postgresql:'||uri.hostname!=='127.0.0.1'||
  uri.password.length<30||uri.searchParams.has('host')||
  !(test||workbench)){
  throw new HistoricalTextEditError('ISOLATED_DATABASE_IDENTITY_REJECTED');
 }
}
export class HistoricalTextEditError extends Error {
 constructor(public readonly code:string){super(code);}
}
export type HistoricalTextEditInput={
 operationId:string;
 expectedUpdatedAt:string;
 expectedRevision:number;
 description:string;
 notes:string;
 /** Positive BRL amount, two decimal places; optional for text-only edits. */
 amount?:number;
 /** Active category explicitly selected by the user. */
 categoryId?:string;
 /** Ordinary monetary method, excluding cards and benefits. */
 paymentMethodId?:string;
 /** ISO calendar day; moving a historical paid expense must preserve balances. */
 date?:string;
 /** Paid monetary expense only, never card or benefit. */
 accountId?:string;
};
function responsePayload(v:unknown){
 const value=v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
 if(typeof value.id!=='string'||typeof value.updatedAt!=='string'||
   !Number.isSafeInteger(value.revision)||typeof value.legacyTransactionId!=='string'){
  throw new HistoricalTextEditError('IDEMPOTENCY_RECEIPT_INVALID');
 }
 return {id:value.id,updatedAt:value.updatedAt,
  legacyTransactionId:value.legacyTransactionId,revision:value.revision as number};
}
export async function updateHistoricalExpenseInIsolatedQa(
 actorId:string,eventId:string,input:HistoricalTextEditInput,
){
 assertIsolatedHistoricalWriteDestination();
 if(!/^[a-f\d-]{36}$/i.test(input.operationId) || !eventId ||
   !Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0 ||
   !Number.isFinite(Date.parse(input.expectedUpdatedAt))||
   input.description.trim().length<1||input.description.trim().length>160||
   input.notes.length>1000||
   (input.accountId!==undefined&&(!input.accountId||input.accountId.length>128))||
   (input.categoryId!==undefined&&(!input.categoryId||input.categoryId.length>128))||
   (input.paymentMethodId!==undefined&&(!input.paymentMethodId||input.paymentMethodId.length>128))||
   (input.date!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||
    !Number.isFinite(new Date(input.date+'T12:00:00.000Z').getTime())||
    new Date(input.date+'T12:00:00.000Z').toISOString().slice(0,10)!==input.date))||
   (input.amount!==undefined&&(!Number.isFinite(input.amount)||input.amount<=0||
     !Number.isSafeInteger(Math.round(input.amount*100))||
     Math.abs(input.amount*100-Math.round(input.amount*100))>0.00001))) {
  throw new HistoricalTextEditError('INVALID_HISTORICAL_EDIT_PAYLOAD');
 }
 const ws=await resolveWorkspaceContext(actorId);
 const ownerId=ws.workspace.ownerId,workspaceId=ws.workspaceId;
 const nextDescription=input.description.trim(),nextNotes=input.notes.trim();
 const requestHash=mutationRequestHash({
  protocol,eventId,description:nextDescription,notes:nextNotes,
  expectedUpdatedAt:input.expectedUpdatedAt,expectedRevision:input.expectedRevision,
  amount:input.amount,categoryId:input.categoryId,paymentMethodId:input.paymentMethodId,
  date:input.date,accountId:input.accountId
 });
 const work=async()=>{
  return serializableFinancialTransaction(async tx=>{
   const prior=await tx.cloudMutationReceipt.findUnique({
    where:{workspaceId_operationId:{workspaceId,operationId:input.operationId}},
   });
   if(prior){
    if(prior.mutationType!==mutationType||prior.requestHash!==requestHash){
     throw new HistoricalTextEditError('OPERATION_ID_REUSED');
    }
    return {...responsePayload(prior.response),idempotentReplay:true};
   }
   const state=await tx.appState.findUnique({
    where:{workspaceId},select:{revision:true,state:true},
   });
   if(!state||!isNormalizedPrimary(state.state)){
    throw new HistoricalTextEditError('NORMALIZED_PRIMARY_REQUIRED');
   }
   if(state.revision!==input.expectedRevision){
    throw new HistoricalTextEditError('STALE_APPSTATE_REVISION');
   }
   const current=await tx.financialEvent.findFirst({
    where:{id:eventId,workspaceId,userId:ownerId,archivedAt:null},
    include:{account:true,category:true,paymentMethod:true,receipt:{select:{id:true}},
     payablePayment:{select:{id:true}},importedRow:{select:{id:true}}},
   });
   if(!current)throw new HistoricalTextEditError('EVENT_NOT_FOUND');
   const payload=current.sourcePayload;
   if(!payload||typeof payload!=='object'||Array.isArray(payload)){
    throw new HistoricalTextEditError('LEGACY_PAYLOAD_MISSING');
   }
   const raw=payload as Record<string,unknown>;
   if(current.type!=='expense'||!['paid','planned'].includes(current.status)||
     !current.legacyTransactionId||!current.account||
     !isMonetaryAccountType(current.account.type)||
     current.receipt||current.payablePayment||current.importedRow||
     isBenefitFinancialEvent(current)||
     current.paymentMethod?.type==='credit'){
    throw new HistoricalTextEditError('HISTORICAL_DOMAIN_NOT_SUPPORTED');
   }
   if(current.updatedAt.toISOString()!==input.expectedUpdatedAt){
    throw new HistoricalTextEditError('STALE_EVENT_VERSION');
   }
   if(isBenefitFinancialEvent({
     description:nextDescription,account:current.account,paymentMethod:current.paymentMethod,
   }))throw new HistoricalTextEditError('BENEFIT_DOMAIN_REQUIRES_SEPARATE_WRITER');
   const oldCents=Math.round(Number(current.amount)*100);
   const newCents=input.amount===undefined?oldCents:Math.round(input.amount*100);
   const moneyChanged=newCents!==oldCents;
   const categoryChanged=input.categoryId!==undefined&&input.categoryId!==current.categoryId;
   const paymentChanged=input.paymentMethodId!==undefined&&input.paymentMethodId!==current.paymentMethodId;
   const accountChanged=input.accountId!==undefined&&input.accountId!==current.accountId;
   const dateChanged=input.date!==undefined&&input.date!==current.date.toISOString().slice(0,10);
   const targetDate=dateChanged?new Date(input.date+'T12:00:00.000Z'):current.date;
   if(dateChanged){
    if(current.status!=='paid'||moneyChanged||categoryChanged||paymentChanged||accountChanged){
     throw new HistoricalTextEditError('HISTORICAL_DATE_COMBINED_MUTATION_UNSUPPORTED');
    }
    if(targetDate.getTime()>Date.now()){
     throw new HistoricalTextEditError('FUTURE_PAID_DATE_NOT_ALLOWED');
    }
    const oldDay=current.date.toISOString().slice(0,10);
    const nextDay=targetDate.toISOString().slice(0,10);
    const days=Math.round((Date.parse(oldDay)-Date.parse(nextDay))/86400000);
    if(days>250){throw new HistoricalTextEditError('DATE_BALANCE_WINDOW_TOO_LARGE');}
    if(days>0){
     const cents=Math.round(Number(current.amount)*100);
     if(!Number.isSafeInteger(cents)||cents<=0||Number(current.signedAmount)!==-cents/100){
      throw new HistoricalTextEditError('HISTORICAL_DATE_SIGN_UNSUPPORTED');
     }
     for(let i=0;i<days;i++){
      const day=new Date(Date.parse(nextDay)+i*86400000).toISOString().slice(0,10);
      const balance=await monetaryAccountBalanceAt(tx,ownerId,current.account,day);
      if(Math.round(balance*100)-cents<0){
       throw new HistoricalTextEditError('INSUFFICIENT_INTERMEDIATE_BALANCE');
      }
     }
    }
   }
   let paymentForEdit:Awaited<ReturnType<typeof activePaymentMethodForUser>>=null;
   if(paymentChanged){
    paymentForEdit=await activePaymentMethodForUser(tx,ownerId,input.paymentMethodId!);
    if(!paymentForEdit||paymentForEdit.type==='credit'||paymentForEdit.type==='benefit'||
      isBenefitFinancialEvent({paymentMethod:paymentForEdit})){
     throw new HistoricalTextEditError('ORDINARY_PAYMENT_METHOD_REQUIRED');
    }
    if(!Object.prototype.hasOwnProperty.call(raw,'paymentMethod')){
     throw new HistoricalTextEditError('LEGACY_PAYMENT_LABEL_MISSING');
    }
    const nextPaymentStatus=resolveCanonicalFinancialStatus({
     type:current.type,requestedStatus:current.status as 'paid'|'planned',
     category:current.category,paymentMethod:paymentForEdit,
    });
    if(nextPaymentStatus!==current.status){
     throw new HistoricalTextEditError('PAYMENT_STATUS_REQUIRES_SPECIFIC_WRITER');
    }
   }
   let categoryForEdit:Awaited<ReturnType<typeof activeCategoryForUser>>=null;
   if(categoryChanged){
    categoryForEdit=await activeCategoryForUser(tx,ownerId,input.categoryId!);
    if(!categoryForEdit)throw new HistoricalTextEditError('INVALID_CATEGORY');
    // Do not silently change a pending item's canonical Fixo status.
    const nextStatus=resolveCanonicalFinancialStatus({
     type:current.type,requestedStatus:current.status as 'paid'|'planned',
     category:categoryForEdit,paymentMethod:current.paymentMethod,
    });
    if(nextStatus!==current.status)throw new HistoricalTextEditError('CATEGORY_STATUS_REQUIRES_SPECIFIC_WRITER');
    if(!Object.prototype.hasOwnProperty.call(raw,'category')){
     throw new HistoricalTextEditError('LEGACY_CATEGORY_LABEL_MISSING');
    }
   }
   let accountForEdit:Awaited<ReturnType<typeof activeAccountForUser>>=null;
   if(accountChanged){
    if(current.status!=='paid'||moneyChanged||categoryChanged||paymentChanged||dateChanged){
     throw new HistoricalTextEditError('HISTORICAL_ACCOUNT_COMBINED_MUTATION_UNSUPPORTED');
    }
    if(!Object.prototype.hasOwnProperty.call(raw,'financialAccountId')||
      raw.financialAccountId!==current.accountId){
     throw new HistoricalTextEditError('LEGACY_ACCOUNT_ID_MISMATCH');
    }
    if(!Number.isSafeInteger(oldCents)||oldCents<=0||
      Math.round(Number(current.signedAmount)*100)!==-oldCents){
     throw new HistoricalTextEditError('HISTORICAL_ACCOUNT_SIGN_UNSUPPORTED');
    }
    accountForEdit=await activeAccountForUser(tx,ownerId,input.accountId!);
    if(!accountForEdit||!isMonetaryAccountType(accountForEdit.type)){
     throw new HistoricalTextEditError('MONETARY_TARGET_ACCOUNT_REQUIRED');
    }
    // Removing a source debit increases its balance. Reuse the central
    // account-debit timeline for the new target, including future dates.
    let timeline:Awaited<ReturnType<typeof monetaryAccountDebitWindow>>;
    try{
     timeline=await monetaryAccountDebitWindow(
      tx,ownerId,accountForEdit,current.date.toISOString().slice(0,10),oldCents);
    }catch(error){
     if(error instanceof Error&&error.message==='ACCOUNT_BALANCE_WINDOW_TOO_LARGE'){
      throw new HistoricalTextEditError('ACCOUNT_BALANCE_WINDOW_TOO_LARGE');
     }
     throw error;
    }
    if(!timeline.allowed)throw new HistoricalTextEditError('INSUFFICIENT_TARGET_ACCOUNT_BALANCE');
   }
   if(moneyChanged){
    // Historic positive/zero signed expenses require their own legacy rule.
    if(!Number.isSafeInteger(oldCents)||oldCents<=0||
      Number(current.signedAmount)!==-oldCents/100){
      throw new HistoricalTextEditError('HISTORICAL_AMOUNT_SIGN_UNSUPPORTED');
    }
    if(current.status!=='paid')throw new HistoricalTextEditError('HISTORICAL_AMOUNT_STATUS_UNSUPPORTED');
    // Increasing a historical debit cannot make ANY future daily balance
    // negative. Protect all dates of posted events, including the edit day.
    if(newCents>oldCents){
     const dates=await tx.financialEvent.findMany({
      where:{userId:ownerId,accountId:current.accountId,
       archivedAt:null,status:{in:['paid','reconciled','confirmed']},
       date:{gte:current.date}},
      select:{date:true},orderBy:{date:'asc'},
     });
     const unique=[...new Set([current.date.toISOString().slice(0,10),
       ...dates.map(x=>x.date.toISOString().slice(0,10))])];
     if(unique.length>250)throw new HistoricalTextEditError('BALANCE_WINDOW_TOO_LARGE');
     for(const day of unique){
      const balance=await monetaryAccountBalanceAt(tx,ownerId,current.account,day);
      if(Math.round(balance*100)-(newCents-oldCents)<0){
       throw new HistoricalTextEditError('INSUFFICIENT_FUTURE_BALANCE');
      }
     }
    }
   }
   if(!moneyChanged&&!categoryChanged&&!paymentChanged&&!dateChanged&&!accountChanged&&current.description===nextDescription&&(current.notes||'')===nextNotes){
    throw new HistoricalTextEditError('NO_FINANCIAL_CHANGE');
   }
   const previousLedger=await tx.ledgerEntry.findMany({
    where:{eventId:current.id},select:{id:true,date:true,accountId:true,debit:true,credit:true},
   });
   if(previousLedger.length>1)throw new HistoricalTextEditError('MULTI_LEG_LEDGER_REQUIRES_SPECIFIC_WRITER');
   if(previousLedger.length===1){
    const ledger=previousLedger[0];
    if(ledger.accountId!==current.accountId||
       ledger.date.getTime()!==current.date.getTime()||
       Number(ledger.debit)!==0||
       Math.round(Number(ledger.credit)*100)!==oldCents){
      throw new HistoricalTextEditError('LEGACY_LEDGER_MISMATCH');
    }
   }
   if(current.status==='planned'&&previousLedger.length!==0){
    throw new HistoricalTextEditError('PLANNED_WITH_LEDGER_UNSUPPORTED');
   }
   const amounts=financialAmountValues('expense',newCents/100);
   const changed=await tx.financialEvent.updateMany({
    where:{id:current.id,userId:ownerId,workspaceId,
      archivedAt:null,updatedAt:current.updatedAt},
    data:{description:nextDescription,notes:nextNotes,
      ...(moneyChanged?{amount:amounts.amount,signedAmount:amounts.signedAmount}:{}),
      ...(categoryChanged?{categoryId:categoryForEdit!.id}:{}),
      ...(paymentChanged?{paymentMethodId:paymentForEdit!.id}:{}),
      ...(accountChanged?{accountId:accountForEdit!.id}:{}),
      ...(dateChanged?{date:targetDate,competence:targetDate.toISOString().slice(0,7)}:{})},
   });
   if(changed.count!==1)throw new HistoricalTextEditError('STALE_EVENT_VERSION');
   if(previousLedger.length===1){
    await tx.ledgerEntry.update({
     where:{id:previousLedger[0].id},
     data:{memo:nextDescription,...(moneyChanged?{debit:0,credit:amounts.amount}:{}),
      ...(dateChanged?{date:targetDate}:{}),
      ...(accountChanged?{accountId:accountForEdit!.id}:{})},
    });
   }else if((moneyChanged||accountChanged)&&current.status==='paid'){
    // Canonical syncLedger creates this exact one-leg entry for a posted
    // monetary expense; only the previously absent row is inserted.
    await tx.ledgerEntry.create({data:{
     eventId:current.id,date:targetDate,accountId:accountChanged?accountForEdit!.id:current.accountId!,
     debit:0,credit:amounts.amount,memo:nextDescription,
    }});
   }
   const updated=await tx.financialEvent.findUniqueOrThrow({
    where:{id:current.id},
    include:{account:true,category:true,paymentMethod:true,ledgerEntries:true},
   });
   const mirror=await writeBackNormalizedEventsToAppState(tx,workspaceId,[updated],[],
    {syncClassification:categoryChanged});
   if(!mirror.active||!mirror.changed||mirror.revision!==state.revision+1){
    throw new HistoricalTextEditError('LEGACY_MIRROR_NOT_CONFIRMED');
   }
   const check=await tx.appState.findUniqueOrThrow({
    where:{workspaceId},select:{revision:true,state:true},
   });
   const st=check.state as Record<string,unknown>;
   const transactions=Array.isArray(st.transactions)?st.transactions:[];
   const matched=transactions.filter(item=>item&&typeof item==='object'&&
     String((item as Record<string,unknown>).id)===current.legacyTransactionId);
   const reflected=matched[0] as Record<string,unknown>|undefined;
   if(check.revision!==mirror.revision||matched.length!==1||
     reflected?.description!==nextDescription||
     (moneyChanged&&Math.round(Number(reflected?.expenseAmount)*100)!==newCents)||
     (paymentChanged&&reflected?.paymentMethod!==paymentForEdit?.name)||
     (accountChanged&&reflected?.financialAccountId!==accountForEdit?.id)||
     (dateChanged&&reflected?.date!==targetDate.toISOString().slice(0,10))||
     (categoryChanged&&(reflected?.category!==categoryForEdit?.name||
      (Object.prototype.hasOwnProperty.call(raw,'group')&&reflected?.group!==(categoryForEdit?.group??''))))){
    throw new HistoricalTextEditError('LEGACY_MIRROR_VALIDATION_FAILED');
   }
   // Never alter identity, status or unrelated financial fields.
   if(Math.round(Number(updated.amount)*100)!==newCents||
    Math.round(Number(updated.signedAmount)*100)!==
      (moneyChanged?-newCents:Math.round(Number(current.signedAmount)*100))||
    updated.accountId!==(accountChanged?accountForEdit?.id:current.accountId)||
    updated.date.getTime()!==(dateChanged?targetDate.getTime():current.date.getTime())||
    updated.status!==current.status||
    updated.categoryId!==(categoryChanged?categoryForEdit?.id:current.categoryId)||
    updated.paymentMethodId!==(paymentChanged?paymentForEdit?.id:current.paymentMethodId)){
    throw new HistoricalTextEditError('FINANCIAL_FIELDS_CHANGED');
   }
   await recordFinancialAudit(tx,{
    actorId,entity:'FinancialEvent',entityId:current.id,
    action:'FINANCIAL_EVENT_UPDATED',before:current,after:updated,
    context:{protocol,operationId:input.operationId,workspaceId,
      expectedRevision:input.expectedRevision,resultingRevision:mirror.revision},
   });
   const response={id:updated.id,legacyTransactionId:updated.legacyTransactionId,
    updatedAt:updated.updatedAt.toISOString(),revision:mirror.revision,
    idempotentReplay:false};
   await tx.cloudMutationReceipt.create({data:receiptCreateData({
    workspaceId,operationId:input.operationId,requestHash,
    mutationType,revision:mirror.revision,response,
   })});
   return response;
  });
 };
 try{return await work();}
 catch(error){
  if(error&&typeof error==='object'&&'code'in error&&error.code==='P2002'){
   const prior=await prisma.cloudMutationReceipt.findUnique({
    where:{workspaceId_operationId:{workspaceId,operationId:input.operationId}},
   });
   if(prior){
    if(prior.mutationType!==mutationType||prior.requestHash!==requestHash){
     throw new HistoricalTextEditError('OPERATION_ID_REUSED');
    }
    return {...responsePayload(prior.response),idempotentReplay:true};
   }
  }
  throw error;
 }
}
/** Compatibility alias for already approved disposable tests PT63/PT64. */
export const updateHistoricalExpenseTextInDisposableClone = updateHistoricalExpenseInIsolatedQa;
