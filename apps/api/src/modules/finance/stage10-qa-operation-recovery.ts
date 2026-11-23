/**
 * PT90: consulta somente leitura do recibo de criação QA descartável.
 * Nenhum POST, replay ou liberação por ausência de recibo.
 * O vínculo ao ator original é verificado no audit log da mesma transação.
 */
import {prisma} from '@meg/database';
import {resolveWorkspaceContext} from '../workspaces/service';

export type Stage10QaOperationReadback =
  | {status:'found';operationId:string;eventId:string;date:string}
  | {status:'pending';reason:'RECEIPT_NOT_FOUND_OR_EXPIRED'}
  | {status:'blocked';reason:'RECEIPT_EVENT_INCONSISTENT'};

export async function readStage10QaCreateByOperation(
  actorId:string,operationId:string,month:string,
):Promise<Stage10QaOperationReadback>{
  const context=await resolveWorkspaceContext(actorId,{allowLegacyBootstrap:false});
  const receipt=await prisma.cloudMutationReceipt.findUnique({
    where:{workspaceId_operationId:{workspaceId:context.workspaceId,operationId}},
  });
  if(!receipt||receipt.expiresAt<=new Date()) {
    return {status:'pending',reason:'RECEIPT_NOT_FOUND_OR_EXPIRED'};
  }
  if(receipt.mutationType!=='FINANCIAL_EVENT_CREATE'
    ||!receipt.response||typeof receipt.response!=='object'||Array.isArray(receipt.response)){
    return {status:'blocked',reason:'RECEIPT_EVENT_INCONSISTENT'};
  }
  const payload=receipt.response as Record<string,unknown>;
  if(typeof payload.id!=='string'||!payload.id
    ||payload.legacyTransactionId!==payload.id){
    return {status:'blocked',reason:'RECEIPT_EVENT_INCONSISTENT'};
  }
  const event=await prisma.financialEvent.findFirst({
    where:{
      id:payload.id,workspaceId:context.workspaceId,
      userId:context.workspace.ownerId,type:'expense',archivedAt:null,
    },
    select:{id:true,date:true,legacyTransactionId:true},
  });
  if(!event||event.legacyTransactionId!==event.id
    ||event.date.toISOString().slice(0,7)!==month
    ||String(payload.date).slice(0,10)!==event.date.toISOString().slice(0,10)){
    return {status:'blocked',reason:'RECEIPT_EVENT_INCONSISTENT'};
  }
  // O mesmo workspace pode conter outros membros: a identidade do ator é obrigatória.
  const audits=await prisma.auditLog.findMany({
    where:{
      userId:actorId,entity:'FinancialEvent',entityId:event.id,
      action:'FINANCIAL_EVENT_CREATED',
    },
    select:{metadata:true},take:10,orderBy:{createdAt:'desc'},
  });
  const actorVerified=audits.some(row=>{
    try {
      const parsed=JSON.parse(row.metadata??'') as {
        context?:{operationId?:unknown;workspaceId?:unknown};
      };
      return parsed.context?.operationId===operationId
        &&parsed.context?.workspaceId===context.workspaceId;
    }catch{return false;}
  });
  if(!actorVerified)return {status:'blocked',reason:'RECEIPT_EVENT_INCONSISTENT'};
  return {status:'found',operationId,eventId:event.id,date:event.date.toISOString().slice(0,10)};
}
