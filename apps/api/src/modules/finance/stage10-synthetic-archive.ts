/**
 * PT77 isolated characterization of an idempotent archive transaction.
 * NOT attached to a production route; no Android/API rollout is implied.
 * Reuses the existing archive semantics: archivedAt + ledger removal +
 * legacy AppState tombstone. Only paid ordinary monetary expense, cloned DB.
 */
import { prisma, UserRole, UserStatus } from '@meg/database';
import { stage10UnificationSyntheticMirrorEnabled } from '../app-state/stage10-qa-write-gate';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { isNormalizedPrimary } from '../app-state/normalization-migration';
import { writeBackNormalizedEventsToAppState } from '../app-state/normalized-primary-writeback';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit } from './audit';
import { isMonetaryAccountType } from './financial-policy';
import { serializableFinancialTransaction } from './monetary-protection';

export class Stage10SyntheticArchiveError extends Error {
  constructor(public readonly code:string){super(code);}
}
export type SyntheticArchiveInput={
 operationId:string;
 expectedUpdatedAt:string;
 expectedRevision:number;
};
const operationIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mutationType='STAGE10_SYNTHETIC_MONETARY_ARCHIVE_V2';
type ArchiveResponse={
 id:string;legacyTransactionId:string;archivedAt:string;
 revision:number;idempotentReplay:boolean;
};
function replayResponse(response:unknown):ArchiveResponse{
 if(!response||typeof response!=='object'||Array.isArray(response)||
   typeof (response as {id?:unknown}).id!=='string'||
   typeof (response as {legacyTransactionId?:unknown}).legacyTransactionId!=='string'||
   typeof (response as {archivedAt?:unknown}).archivedAt!=='string'||
   !Number.isSafeInteger((response as {revision?:unknown}).revision)){
  throw new Stage10SyntheticArchiveError('ARCHIVE_RECEIPT_INVALID');
 }
 const data=response as ArchiveResponse;
 return {id:data.id,legacyTransactionId:data.legacyTransactionId,
  archivedAt:data.archivedAt,revision:data.revision,idempotentReplay:true};
}
export async function archiveMonetaryExpenseInSyntheticQa(
 actorId:string,eventId:string,input:SyntheticArchiveInput,
){
 if(!stage10UnificationSyntheticMirrorEnabled()){
  throw new Stage10SyntheticArchiveError('SYNTHETIC_ARCHIVE_DB_REQUIRED');
 }
 if(!eventId||eventId.length>128||!operationIdPattern.test(input.operationId)||
    !Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||
    !Number.isFinite(Date.parse(input.expectedUpdatedAt))){
  throw new Stage10SyntheticArchiveError('INVALID_ARCHIVE_REQUEST');
 }
 const workspace=await resolveWorkspaceContext(actorId, {allowLegacyBootstrap:false});
 const workspaceId=workspace.workspaceId;
 const ownerId=workspace.workspace.ownerId;
 const requestHash=mutationRequestHash({eventId,
  expectedUpdatedAt:input.expectedUpdatedAt,expectedRevision:input.expectedRevision});
 const mutation=async()=>{
  return serializableFinancialTransaction(async(tx)=>{
   // Global JWT role is not a substitute for permissions in a shared workspace.
   // Recheck membership inside the transaction before reading receipts or
   // changing any finance records, including on an idempotent replay.
   const member=await tx.workspaceMember.findUnique({
    where:{workspaceId_userId:{workspaceId,userId:actorId}},
    select:{role:true,status:true,isActive:true},
   });
   if(!member?.isActive||member.status!==UserStatus.ACTIVE||
      (member.role!==UserRole.ADMIN&&member.role!==UserRole.MANAGER)){
    throw new Stage10SyntheticArchiveError('ARCHIVE_WORKSPACE_ROLE_REQUIRED');
   }
   const previous=await tx.cloudMutationReceipt.findUnique({where:{
    workspaceId_operationId:{workspaceId,operationId:input.operationId},
   }});
   if(previous){
    if(previous.requestHash!==requestHash){
     throw new Stage10SyntheticArchiveError('OPERATION_ID_REUSED');
    }
    return replayResponse(previous.response);
   }
   const existing=await tx.financialEvent.findFirst({
    where:{id:eventId,userId:ownerId,workspaceId,archivedAt:null},
    include:{
     account:true,paymentMethod:true,
     ledgerEntries:true,
     receipt:true,payablePayment:true,importedRow:true,
    },
   });
   if(!existing){
    throw new Stage10SyntheticArchiveError('ARCHIVE_EVENT_NOT_FOUND_OR_ARCHIVED');
   }
   if(existing.type!=='expense'||existing.status!=='paid'||
      !existing.account||!existing.accountId||
      !isMonetaryAccountType(existing.account.type)||
      existing.paymentMethod?.type==='credit'||
      String(existing.paymentMethod?.name||'').toUpperCase()==='VEROCARD'||
      existing.receipt||existing.payablePayment||existing.importedRow||
      !existing.legacyTransactionId){
    throw new Stage10SyntheticArchiveError('ARCHIVE_DOMAIN_NOT_ELIGIBLE');
   }
   const cents=Math.round(Number(existing.amount)*100);
   if(!Number.isSafeInteger(cents)||cents<=0||
      Math.round(Number(existing.signedAmount)*100)!==-cents||
      existing.ledgerEntries.length!==1||
      existing.ledgerEntries[0].accountId!==existing.accountId||
      Math.round(Number(existing.ledgerEntries[0].credit)*100)!==cents||
      Math.round(Number(existing.ledgerEntries[0].debit)*100)!==0){
    throw new Stage10SyntheticArchiveError('ARCHIVE_LEDGER_MISMATCH');
   }
   if(existing.updatedAt.toISOString()!==input.expectedUpdatedAt){
    throw new Stage10SyntheticArchiveError('ARCHIVE_STALE_EVENT_VERSION');
   }
   const appState=await tx.appState.findUnique({where:{workspaceId},
    select:{state:true,revision:true}});
   if(!appState||!isNormalizedPrimary(appState.state)||
      appState.revision!==input.expectedRevision){
    throw new Stage10SyntheticArchiveError('ARCHIVE_STALE_APPSTATE_REVISION');
   }
   const transactions=(appState.state as {transactions?:unknown[]}).transactions;
   if(!Array.isArray(transactions)||transactions.filter(line=>
    line&&typeof line==='object'&&!Array.isArray(line)&&
    (line as {id?:unknown}).id===existing.legacyTransactionId).length!==1){
    throw new Stage10SyntheticArchiveError('ARCHIVE_LEGACY_MIRROR_MISMATCH');
   }
   const changed=await tx.financialEvent.updateMany({
    where:{id:existing.id,userId:ownerId,workspaceId,
      archivedAt:null,updatedAt:existing.updatedAt},
    data:{status:'archived',archivedAt:new Date()},
   });
   if(changed.count!==1){
    throw new Stage10SyntheticArchiveError('ARCHIVE_CONCURRENT_EVENT_CHANGE');
   }
   await tx.ledgerEntry.deleteMany({where:{eventId:existing.id}});
   const mirror=await writeBackNormalizedEventsToAppState(
    tx,workspaceId,[],[existing.legacyTransactionId]);
   if(!mirror.active||!mirror.changed||mirror.revision!==appState.revision+1){
    throw new Stage10SyntheticArchiveError('ARCHIVE_MIRROR_NOT_UPDATED');
   }
   const after=await tx.financialEvent.findUniqueOrThrow({where:{id:existing.id}});
   await recordFinancialAudit(tx,{
    actorId,entity:'FinancialEvent',entityId:existing.id,
    action:'FINANCIAL_EVENT_ARCHIVED',before:existing,after,
    context:{workspaceId,operationId:input.operationId,
      legacyTransactionId:existing.legacyTransactionId,
      protocol:mutationType},
   });
   const response:ArchiveResponse={
    id:existing.id,
    legacyTransactionId:existing.legacyTransactionId,
    archivedAt:after.archivedAt!.toISOString(),
    revision:mirror.revision,
    idempotentReplay:false,
   };
   await tx.cloudMutationReceipt.create({data:receiptCreateData({
    workspaceId,operationId:input.operationId,
    requestHash,mutationType,revision:mirror.revision,response,
   })});
   return response;
  });
 };
 try {return await mutation();}
 catch(error){
  // Serializable write conflicts after the bounded central retries are
  // controlled business conflicts, never an unhandled HTTP 500.
  if(error&&typeof error==='object'&&'code'in error&&
      (error as {code?:string}).code==='P2034'){
   throw new Stage10SyntheticArchiveError('ARCHIVE_CONCURRENT_EVENT_CHANGE');
  }
  if(error&&typeof error==='object'&&'code'in error&&
      (error as {code?:string}).code==='P2002'){
   const previous=await prisma.cloudMutationReceipt.findUnique({where:{
    workspaceId_operationId:{workspaceId,operationId:input.operationId},
   }});
   if(previous){
    if(previous.requestHash!==requestHash){
     throw new Stage10SyntheticArchiveError('OPERATION_ID_REUSED');
    }
    return replayResponse(previous.response);
   }
  }
  throw error;
 }
}
