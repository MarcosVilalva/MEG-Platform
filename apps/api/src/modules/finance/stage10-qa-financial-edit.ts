import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { isNormalizedPrimary } from '../app-state/normalization-migration';
import { buildNormalizationPreview, normalizationFingerprint } from '../app-state/normalization-migration-core';
import { writeBackNormalizedEventsToAppState } from '../app-state/normalized-primary-writeback';
import { stage10QaWebWriteEnabled } from '../app-state/stage10-qa-write-gate';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { financialAmountValues } from './amount-sign';
import { activeAccountForUser, activeCategoryForUser, activePaymentMethodForUser } from './catalog-scope';
import { isBenefitFinancialEvent, isMonetaryAccountType, resolveCanonicalFinancialStatus } from './financial-policy';
import { monetaryAccountBalanceAt, serializableFinancialTransaction } from './monetary-protection';
import { syncLedger } from './service';

export class Stage10QaEditError extends Error {
  constructor(public code: string) { super(code); }
}
export type Stage10QaEditInput = {
  operationId:string;
  expectedUpdatedAt:string;
  expectedRevision:number;
  description:string;
  date:string;
  status:'planned'|'paid';
  amount:number;
  accountId:string;
  categoryId:string;
  paymentMethodId:string;
  notes:string;
};

const SOURCE='web-monetary-create-v1';
function payloadRecord(v:unknown):Record<string,unknown>{
  return v && typeof v==='object' && !Array.isArray(v) ? v as Record<string,unknown> : {};
}
function normalized(v:unknown){
  return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
}

/**
 * Edição apenas da despesa criada no QA Web com identidade e espelho comprovados.
 * Valores, ID, historico e FK nunca são recriados; transação única e serializável.
 */
export async function updateStage10QaMonetaryExpense(actorId:string,eventId:string,input:Stage10QaEditInput){
 if(!stage10QaWebWriteEnabled())throw new Stage10QaEditError('STAGE10_QA_WRITE_DISABLED');
 const context=await resolveWorkspaceContext(actorId);
 const ownerId=context.workspace.ownerId;
 const workspaceId=context.workspaceId;
 const requestHash=mutationRequestHash({protocol:'meg-stage10-qa-expense-edit-v1',eventId,...input,operationId:undefined});
 try{
  return await serializableFinancialTransaction(async tx=>{
   const receipt=await tx.cloudMutationReceipt.findUnique({
    where:{workspaceId_operationId:{workspaceId,operationId:input.operationId}},
   });
   if(receipt){
    if(receipt.requestHash!==requestHash||receipt.mutationType!=='STAGE10_QA_MONETARY_EDIT'){
      throw new Stage10QaEditError('OPERATION_ID_REUSED');
    }
    return {...payloadRecord(receipt.response),idempotentReplay:true};
   }
   const state=await tx.appState.findUnique({
    where:{workspaceId},select:{revision:true,state:true},
   });
   if(!state||!isNormalizedPrimary(state.state))throw new Stage10QaEditError('STAGE10_QA_PRIMARY_REQUIRED');
   if(state.revision!==input.expectedRevision)throw new Stage10QaEditError('STAGE10_QA_REVISION_CONFLICT');
   const current=await tx.financialEvent.findFirst({
    where:{id:eventId,userId:ownerId,workspaceId,archivedAt:null},
    include:{
      account:true,category:true,paymentMethod:true,ledgerEntries:true,
      receipt:{select:{id:true}},payablePayment:{select:{id:true}},
      importedRow:{select:{id:true}},
    },
   });
   if(!current)throw new Stage10QaEditError('STAGE10_QA_EVENT_NOT_FOUND');
   const raw=payloadRecord(current.sourcePayload);
   if(raw.__megStage10QaSource!==SOURCE||current.legacyTransactionId!==current.id
     ||raw.id!==current.id||current.type!=='expense'
     ||!['paid','planned'].includes(current.status)
     ||current.receipt||current.payablePayment||current.importedRow
     ||!current.account||!isMonetaryAccountType(current.account.type)
     ||isBenefitFinancialEvent(current)
     ||normalized(current.paymentMethod?.type)==='CREDIT') {
    throw new Stage10QaEditError('STAGE10_QA_EDIT_DOMAIN_UNSUPPORTED');
   }
   if(current.updatedAt.toISOString()!==input.expectedUpdatedAt)
      throw new Stage10QaEditError('STAGE10_QA_STALE_EVENT');
   // Mudanca de conta, data e situacao exige caracterizacao financeira de
   // saldos em varias competencias. Por ora apenas o writer deste recorte.
   if(input.accountId!==current.accountId
     ||input.date!==current.date.toISOString().slice(0,10)
     ||input.status!==current.status){
    throw new Stage10QaEditError('STAGE10_QA_SCOPE_ACCOUNT_DATE_STATUS_LOCKED');
   }
   const [account,category,method]=await Promise.all([
    activeAccountForUser(tx,ownerId,input.accountId),
    activeCategoryForUser(tx,ownerId,input.categoryId),
    activePaymentMethodForUser(tx,ownerId,input.paymentMethodId),
   ]);
   if(!account||!isMonetaryAccountType(account.type)||!category||!method
     ||(category.type && category.type!=='expense')
     ||normalized(method.type)==='CREDIT'
     ||/CREDITO|CARTAO|VEROCARD/.test(normalized(method.name))
     ||isBenefitFinancialEvent({description:input.description,paymentMethod:method,account})){
    throw new Stage10QaEditError('STAGE10_QA_CATALOG_DOMAIN_UNSUPPORTED');
   }
   const resolved=resolveCanonicalFinancialStatus({
    type:'expense',requestedStatus:input.status,category,paymentMethod:method,
   });
   if(resolved!==current.status)throw new Stage10QaEditError('STAGE10_QA_STATUS_POLICY_CONFLICT');
   const values=financialAmountValues('expense',input.amount);
   if(!Number.isFinite(values.signedAmount)||!Number.isFinite(values.amount)
     ||values.amount===0 ||Math.sign(values.signedAmount)!==Math.sign(Number(current.signedAmount))) {
    throw new Stage10QaEditError('STAGE10_QA_SIGN_CHANGE_REQUIRES_SPECIAL_WRITER');
   }
   if(input.description.trim().length<1||input.description.trim().length>160
     ||input.notes.length>1000)throw new Stage10QaEditError('STAGE10_QA_TEXT_INVALID');

   // A politica monetaria fica na API, nunca na tela. Em revisao de despesa
   // realizada, um aumento de debito afeta TODOS os saldos em datas futuras.
   if(current.status==='paid' && Number(values.signedAmount)<Number(current.signedAmount)){
    const dates=await tx.financialEvent.findMany({
     where:{userId:ownerId,accountId:account.id,archivedAt:null,
       date:{gte:current.date},status:{in:['paid','reconciled','confirmed']}},
     select:{date:true},orderBy:{date:'asc'},
    });
    const unique=[...new Set(dates.map(item=>item.date.toISOString().slice(0,10)))];
    if(unique.length>200)throw new Stage10QaEditError('STAGE10_QA_BALANCE_WINDOW_TOO_LARGE');
    const delta=Number(values.signedAmount)-Number(current.signedAmount);
    for(const day of unique){
     const balance=await monetaryAccountBalanceAt(tx,ownerId,account,day);
     if(Math.round((balance+delta)*100)<0){
       throw new Stage10QaEditError('STAGE10_QA_INSUFFICIENT_ACCOUNT_BALANCE');
     }
    }
   }
   const nextSource={
    ...raw,description:input.description.trim(),
    notes:input.notes.trim(),category:category.name,group:category.group||'',
    paymentMethod:method.name,amount:input.amount,expenseAmount:Math.abs(input.amount),
   };
   const beforeState=payloadRecord(state.state);
   const legacyRows=Array.isArray(beforeState.transactions)?beforeState.transactions:[];
   const replaced=legacyRows.map(row=>
     payloadRecord(row).id===current.id?nextSource:row
   );
   const candidate=buildNormalizationPreview({...beforeState,transactions:replaced},{
    workspaceId,userId:ownerId,revision:state.revision+1,
   });
   const projection=candidate.events.find(x=>x.legacyTransactionId===current.id);
   if(candidate.summary.invalidCount||!projection
     ||Number(projection.amount)!==Number(values.amount)
     ||Number(projection.signedAmount)!==Number(values.signedAmount)
     ||projection.status!==current.status){
    throw new Stage10QaEditError('STAGE10_QA_MIRROR_PROJECTION_MISMATCH');
   }
   const updated=await tx.financialEvent.updateMany({
    where:{id:current.id,userId:ownerId,workspaceId,archivedAt:null,
      updatedAt:current.updatedAt},
    data:{
      description:input.description.trim(),notes:input.notes.trim(),
      categoryId:category.id,paymentMethodId:method.id,
      amount:values.amount,signedAmount:values.signedAmount,
      sourcePayload:nextSource as Prisma.InputJsonValue,
      sourceRevision:state.revision+1,
      amountBehavior:projection.amountBehavior,
      necessity:projection.necessity,frequency:projection.frequency,
      classificationConfidence:projection.classificationConfidence,
      classificationSource:projection.classificationSource,
    },
   });
   if(updated.count!==1)throw new Stage10QaEditError('STAGE10_QA_STALE_EVENT');
   await syncLedger(tx,current.id);
   const updatedEvent=await tx.financialEvent.findUniqueOrThrow({
    where:{id:current.id},
    include:{account:true,category:true,paymentMethod:true,ledgerEntries:true},
   });
   const mirror=await writeBackNormalizedEventsToAppState(tx,workspaceId,[updatedEvent]);
   if(!mirror.active||!mirror.changed||mirror.revision!==state.revision+1){
     throw new Stage10QaEditError('STAGE10_QA_MIRROR_NOT_CONFIRMED');
   }
   const after=await tx.appState.findUniqueOrThrow({where:{workspaceId},select:{state:true}});
   const final=buildNormalizationPreview(after.state,{
    workspaceId,userId:ownerId,revision:mirror.revision,
   });
   const rows=await tx.financialEvent.findMany({
    where:{workspaceId,legacyTransactionId:{not:null},archivedAt:null},
    select:{
     legacyTransactionId:true,date:true,description:true,type:true,status:true,
     amount:true,signedAmount:true,notes:true,sourcePayload:true,amountBehavior:true,
     necessity:true,frequency:true,classificationConfidence:true,classificationSource:true,
    },
   });
   if(final.summary.invalidCount||final.summary.validCount!==rows.length
     ||final.summary.fingerprint!==normalizationFingerprint(rows)){
    throw new Stage10QaEditError('STAGE10_QA_MIRROR_FINGERPRINT_DIVERGENCE');
   }
   await recordFinancialAudit(tx,{
    actorId,entity:'FinancialEvent',entityId:current.id,
    action:'FINANCIAL_EVENT_UPDATED',before:current,after:updatedEvent,
    context:{
     contract:'meg-stage10-qa-expense-edit-v1',
     operationId:input.operationId,
     workspaceId,expectedRevision:input.expectedRevision,
     resultingRevision:mirror.revision,expectedUpdatedAt:input.expectedUpdatedAt,
    },
   });
   const response={
    id:updatedEvent.id,legacyTransactionId:updatedEvent.legacyTransactionId,
    updatedAt:updatedEvent.updatedAt.toISOString(),
    revision:mirror.revision,idempotentReplay:false,
   };
   await tx.cloudMutationReceipt.create({data:receiptCreateData({
    workspaceId,operationId:input.operationId,requestHash,
    mutationType:'STAGE10_QA_MONETARY_EDIT',
    revision:mirror.revision,response,
   })});
   return response;
  });
 }catch(error){
  if(error&&typeof error==='object'&&'code'in error
    &&(error as {code?:string}).code==='P2002'){
   const prior=await prisma.cloudMutationReceipt.findUnique({
    where:{workspaceId_operationId:{workspaceId,operationId:input.operationId}},
   });
   if(prior){
    if(prior.requestHash!==requestHash||prior.mutationType!=='STAGE10_QA_MONETARY_EDIT'){
     throw new Stage10QaEditError('OPERATION_ID_REUSED');
    }
    return {...payloadRecord(prior.response),idempotentReplay:true};
   }
  }
  throw error;
 }
}
