import {Prisma, prisma, UserStatus} from '@meg/database';
import {
 previewBatchCardCycle,
 type BatchPreviewChanges,
 type BatchPreviewInput,
 type BatchPreviewItem,
 type BatchPreviewResponse,
} from './batch-edit-preview-read';

/**
 * Etapa 10: adaptador INTERNO de leitura, sem rota/handler, writes ou fallback legado.
 * actorId deve ser proveniente da sessão autenticada pelo servidor, nunca do body.
 * A permissão é revalidada no banco a cada chamada.
 */
export type AuthenticatedBatchPreviewRequest={
 items:readonly BatchPreviewItem[];
 changes:BatchPreviewChanges;
};

export class BatchPreviewAccessError extends Error {
 constructor(public readonly code:
  'BATCH_PREVIEW_ACCESS_DENIED'|'BATCH_PREVIEW_INVALID_SELECTION'){
  super(code);
  this.name='BatchPreviewAccessError';
 }
}

function assertSelection(request:AuthenticatedBatchPreviewRequest):void{
 if(!request||!Array.isArray(request.items)||request.items.length<1||request.items.length>200
  ||!request.changes||typeof request.changes!=='object')
  throw new BatchPreviewAccessError('BATCH_PREVIEW_INVALID_SELECTION');
 const keys=new Set<string>();
 for(const item of request.items){
  if(!item||!['card-purchase','financial-event','payable','benefit'].includes(item.source)
   ||typeof item.id!=='string'||!item.id.trim()
   ||typeof item.expectedUpdatedAt!=='string')
   throw new BatchPreviewAccessError('BATCH_PREVIEW_INVALID_SELECTION');
  const key=item.source+':'+item.id;
  if(keys.has(key))throw new BatchPreviewAccessError('BATCH_PREVIEW_INVALID_SELECTION');
  keys.add(key);
 }
 if(!['common','preserve'].includes(request.changes.purchaseDateMode)
  ||(request.changes.cardId!==undefined
    &&(typeof request.changes.cardId!=='string'||!request.changes.cardId.trim())))
  throw new BatchPreviewAccessError('BATCH_PREVIEW_INVALID_SELECTION');
}

export async function previewBatchCardCycleForActor(
 actorId:string,
 request:AuthenticatedBatchPreviewRequest,
):Promise<BatchPreviewResponse>{
 if(typeof actorId!=='string'||!actorId.trim())
  throw new BatchPreviewAccessError('BATCH_PREVIEW_ACCESS_DENIED');
 assertSelection(request);
 return prisma.$transaction(async tx=>{
  const actor=await tx.user.findUnique({
   where:{id:actorId},select:{id:true,isActive:true,status:true},
  });
  if(!actor?.isActive||actor.status!==UserStatus.ACTIVE)
   throw new BatchPreviewAccessError('BATCH_PREVIEW_ACCESS_DENIED');

  // A seleção de workspace reproduz a precedência do contexto oficial,
  // mas NUNCA chama ensurePrimaryWorkspace (que poderia escrever na leitura).
  const membershipWhere={
   userId:actorId,isActive:true,status:UserStatus.ACTIVE,
   workspace:{isActive:true},
  } as const;
  const owned=await tx.workspaceMember.findFirst({
   where:{...membershipWhere,workspace:{isActive:true,ownerId:actorId}},
   include:{workspace:true},orderBy:{createdAt:'asc'},
  });
  const membership=owned??await tx.workspaceMember.findFirst({
   where:membershipWhere,include:{workspace:true},orderBy:{createdAt:'asc'},
  });
  if(!membership||!membership.workspace.isActive)
   throw new BatchPreviewAccessError('BATCH_PREVIEW_ACCESS_DENIED');

  const ownerId=membership.workspace.ownerId;
  const ids=request.items.filter(item=>item.source==='card-purchase').map(item=>item.id);
  const purchases=ids.length?await tx.cardPurchase.findMany({
   where:{id:{in:ids},userId:ownerId},
   select:{
    id:true,userId:true,cardId:true,purchaseDate:true,status:true,
    updatedAt:true,installments:true,
    entries:{select:{
     id:true,number:true,amount:true,statementMonth:true,
     status:true,partialPaidAmount:true,
    },orderBy:{number:'asc'}},
   },
  }):[];
  const cardIds=[...new Set([
   ...purchases.map(p=>p.cardId),
   ...(request.changes.cardId?[request.changes.cardId]:[]),
  ])];
  const cards=cardIds.length?await tx.creditCard.findMany({
   where:{id:{in:cardIds},userId:ownerId},
   select:{id:true,userId:true,isActive:true,closingDay:true,dueDay:true},
  }):[];
  const snapshots:BatchPreviewInput['snapshots']={
   cards:cards.map(card=>({
    id:card.id,userId:card.userId,isActive:card.isActive,
    closingDay:card.closingDay,dueDay:card.dueDay,
   })),
   purchases:purchases.map(purchase=>({
    id:purchase.id,userId:purchase.userId,cardId:purchase.cardId,
    purchaseDate:purchase.purchaseDate.toISOString().slice(0,10),
    status:purchase.status,updatedAt:purchase.updatedAt.toISOString(),
    installments:purchase.installments,
    entries:purchase.entries.map(entry=>({
     id:entry.id,number:entry.number,amount:entry.amount.toString(),
     statementMonth:entry.statementMonth,status:entry.status,
     partialPaidAmount:entry.partialPaidAmount.toString(),
    })),
   })),
  };
  return previewBatchCardCycle({
   dataOwnerId:ownerId,items:request.items,changes:request.changes,snapshots,
  });
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:10000});
}
