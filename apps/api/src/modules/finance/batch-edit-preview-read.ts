import {cardStatementDueDate} from './card-statement-canonical';
import {cardPurchaseStatementMonth} from '../cards/purchase-cycle-canonical';

/**
 * Contrato de prévia financeira READ-ONLY para a Etapa 10.
 * Esta função opera apenas com snapshots obtidos pela autoridade do servidor.
 * Não expõe endpoint, não consulta banco e nunca chama escritores financeiros.
 * A autenticação, o escopo do workspace e a consulta dos snapshots devem ser
 * realizados por um adaptador backend futuro, antes de qualquer exposição.
 */
export type BatchSource='card-purchase'|'financial-event'|'payable'|'benefit';
export type CardSnapshot={
 id:string;userId:string;isActive:boolean;closingDay:number;dueDay:number;
};
export type CardPurchaseSnapshot={
 id:string;userId:string;cardId:string;purchaseDate:string;status:string;updatedAt:string;
 entries:readonly {id:string;number:number;amount:string;statementMonth:string;status:string;partialPaidAmount:string}[];
};
export type BatchPreviewItem={source:BatchSource;id:string;expectedUpdatedAt:string};
export type BatchPreviewChanges={
 cardId?:string;
 purchaseDateMode:'preserve'|'common';
 commonPurchaseDate?:string;
 installments?:number; // ainda não suportado pelo PATCH da compra
};
export type BatchPreviewInput={
 dataOwnerId:string;
 items:readonly BatchPreviewItem[];
 changes:BatchPreviewChanges;
 snapshots:{cards:readonly CardSnapshot[];purchases:readonly CardPurchaseSnapshot[]};
};
export type CardPreviewEntry={
 id:string;number:number;amount:string;statementMonth:string;dueDate:string;
};
export type BatchPreviewRow={
 id:string;source:BatchSource;status:'candidate'|'blocked';reason:string;
 canWrite:false;before?:{cardId:string;purchaseDate:string;entries:CardPreviewEntry[]};
 after?:{cardId:string;purchaseDate:string;entries:CardPreviewEntry[]};
};
export type BatchPreviewResponse={
 kind:'stage10-card-purchase-cycle-readonly-v1';canWrite:false;
 total:number;candidates:number;blocked:number;rows:BatchPreviewRow[];
};

function validDay(value:string):boolean{
 if(!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(value))return false;
 const date=new Date(value+'T12:00:00.000Z');
 return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;
}
function monthValid(value:string):boolean{return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);}
function validCard(card:CardSnapshot|undefined,ownerId:string):card is CardSnapshot{
 return Boolean(card&&card.userId===ownerId&&card.isActive
  &&Number.isInteger(card.closingDay)&&card.closingDay>=1&&card.closingDay<=31
  &&Number.isInteger(card.dueDay)&&card.dueDay>=1&&card.dueDay<=31);
}
function entriesFor(purchase:CardPurchaseSnapshot,card:CardSnapshot):CardPreviewEntry[]{
 return purchase.entries.map(entry=>({
  id:entry.id,number:entry.number,amount:entry.amount,
  statementMonth:entry.statementMonth,
  dueDate:cardStatementDueDate(entry.statementMonth,card.closingDay,card.dueDay),
 }));
}
function blocked(item:BatchPreviewItem,reason:string):BatchPreviewRow{
 return {source:item.source,id:item.id,status:'blocked',reason,canWrite:false};
}

export function previewBatchCardCycle(input:BatchPreviewInput):BatchPreviewResponse{
 if(!input.dataOwnerId.trim())throw new Error('OWNER_REQUIRED');
 if(input.items.length===0||input.items.length>200)throw new Error('INVALID_BATCH_SIZE');
 const keys=input.items.map(item=>item.source+':'+item.id);
 if(new Set(keys).size!==keys.length)throw new Error('DUPLICATE_ITEMS');
 const cards=new Map(input.snapshots.cards.map(card=>[card.id,card]));
 const purchases=new Map(input.snapshots.purchases.map(p=>[p.id,p]));
 const changes=input.changes;
 const result:BatchPreviewRow[]=input.items.map(item=>{
  if(item.source==='benefit')return blocked(item,'BENEFIT_REQUIRES_EXCLUSIVE_WRITER');
  if(item.source==='payable')return blocked(item,'PAYABLE_DUE_DATE_REQUIRES_SOURCE_CONTRACT');
  if(item.source==='financial-event')return blocked(item,'EVENT_CARD_CONVERSION_REQUIRES_DOMAIN_CONTRACT');
  const purchase=purchases.get(item.id);
  if(!purchase||purchase.userId!==input.dataOwnerId)return blocked(item,'PURCHASE_NOT_IN_WORKSPACE');
  if(!item.expectedUpdatedAt||item.expectedUpdatedAt!==purchase.updatedAt)return blocked(item,'STALE_VERSION');
  const oldCard=cards.get(purchase.cardId);
  const newCard=cards.get(changes.cardId||purchase.cardId);
  if(!validCard(oldCard,input.dataOwnerId)||!validCard(newCard,input.dataOwnerId))
   return blocked(item,'CARD_NOT_ACTIVE_OR_NOT_OWNED');
  if(purchase.status!=='active')return blocked(item,'PURCHASE_NOT_ACTIVE');
  if(purchase.entries.length===0||purchase.entries.length!==new Set(purchase.entries.map(e=>e.number)).size
   ||purchase.entries.some(e=>!Number.isInteger(e.number)||e.number<1||!monthValid(e.statementMonth)))
   return blocked(item,'INCOMPLETE_INSTALLMENT_SNAPSHOT');
  if(purchase.entries.some(e=>e.status!=='open'||!Number.isFinite(Number(e.partialPaidAmount))||Number(e.partialPaidAmount)!==0))
   return blocked(item,'CARD_PURCHASE_PAYMENT_EXISTS');
  if(changes.installments!==undefined)return blocked(item,'INSTALLMENT_COUNT_EDIT_NOT_SUPPORTED');
  if(!validDay(purchase.purchaseDate))return blocked(item,'INVALID_ORIGINAL_PURCHASE_DATE');
  const nextDay=changes.purchaseDateMode==='common'?changes.commonPurchaseDate:purchase.purchaseDate;
  if(!nextDay||!validDay(nextDay))return blocked(item,'INVALID_PURCHASE_DATE');
  const nextCardId=changes.cardId||purchase.cardId;
  if(nextDay===purchase.purchaseDate&&nextCardId===purchase.cardId)return blocked(item,'NO_CHANGE');
  const before={cardId:purchase.cardId,purchaseDate:purchase.purchaseDate,entries:entriesFor(purchase,oldCard)};
  const after={cardId:nextCardId,purchaseDate:nextDay,entries:purchase.entries.map(e=>{
   const statementMonth=cardPurchaseStatementMonth(nextDay,newCard.closingDay,e.number);
   return {id:e.id,number:e.number,amount:e.amount,statementMonth,
    dueDate:cardStatementDueDate(statementMonth,newCard.closingDay,newCard.dueDay)};
  })};
  return {source:item.source,id:item.id,status:'candidate',reason:'READ_ONLY_PREVIEW_NOT_WRITE_AUTHORIZATION',
   canWrite:false,before,after};
 });
 return {kind:'stage10-card-purchase-cycle-readonly-v1',canWrite:false,
  total:result.length,candidates:result.filter(x=>x.status==='candidate').length,
  blocked:result.filter(x=>x.status==='blocked').length,rows:result};
}
