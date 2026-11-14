import {cardPurchaseCyclePreview} from '../cards/purchase-cycle-canonical';

/**
 * Etapa 10, contrato interno de PRÉVIA READ-ONLY. Não é uma rota, não carrega
 * registros, não autoriza escrita e não confia em declarações feitas pelo cliente.
 * Apenas um leitor autenticado futuro poderá fornecer snapshots do domínio.
 */
export type Stage10PreviewSource='card-purchase'|'financial-event'|'payable'|'benefit'|'unknown';
export type Stage10PreviewBlocker=
 | 'SOURCE_NOT_VERIFIED'|'VERSION_NOT_VERIFIED'|'UNSUPPORTED_SOURCE'
 | 'BENEFIT_REQUIRES_OWN_WRITER'|'CARD_NOT_VERIFIED'|'CARD_INACTIVE'
 | 'PURCHASE_NOT_ACTIVE'|'INSTALLMENT_PAYMENT_EXISTS'
 | 'INVALID_CARD_CYCLE_INPUT'|'UNSUPPORTED_BATCH_OPERATION';

export type Stage10CardSnapshot={
 id:string; active:boolean; closingDay:number;dueDay:number;
};
export type Stage10PurchaseSnapshot={
 purchaseDate:string;totalAmount:number;installments:number;
 status:string;card:Stage10CardSnapshot;
 entries:readonly {number:number;status:string;partialPaidAmount:number}[];
};
export type Stage10BatchPreviewItem={
 id:string;source:Stage10PreviewSource;
 /** Apenas o backend autenticado pode atestar origem, permissão e versão. */
 verifiedSource:boolean;verifiedVersion:string|null;
 purchase?:Stage10PurchaseSnapshot;
};
export type Stage10BatchCardRequest={
 kind:'card-cycle';
 /** Cartão obtido do catálogo autorizado do domínio, não objeto enviado pelo browser. */
 destinationCard:Stage10CardSnapshot;
 purchaseDate?:string;
 /** Parcelamento permanece o original, pois refazer valor/parcelas exige writer e reconciliação próprios. */
};
export type Stage10BatchPreviewRow={
 id:string;source:Stage10PreviewSource;
 previewAvailable:boolean;writeAuthorized:false;
 blockers:Stage10PreviewBlocker[];
 before:ReturnType<typeof cardPurchaseCyclePreview>|null;
 after:ReturnType<typeof cardPurchaseCyclePreview>|null;
};

/** Validação da entrada do cálculo, que é pressuposta pelo writer canônico. */
function validDay(value:string):boolean{
 if(!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value))return false;
 const date=new Date(value+'T12:00:00.000Z');
 return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function validCycle(p:Stage10PurchaseSnapshot,date:string,card:Stage10CardSnapshot):boolean{
 return validDay(date)&&validDay(p.purchaseDate)
  &&Number.isSafeInteger(Math.round(p.totalAmount*100))
  &&p.totalAmount>0&&Number.isFinite(p.totalAmount)
  &&Number.isInteger(p.installments)&&p.installments>=1&&p.installments<=48
  &&Number.isInteger(card.closingDay)&&card.closingDay>=1&&card.closingDay<=31
  &&Number.isInteger(card.dueDay)&&card.dueDay>=1&&card.dueDay<=31
  &&p.entries.length===p.installments
  &&new Set(p.entries.map(e=>e.number)).size===p.installments
  &&p.entries.every(e=>Number.isInteger(e.number)&&e.number>=1&&e.number<=p.installments
    &&Number.isFinite(e.partialPaidAmount)&&e.partialPaidAmount>=0);
}
export function previewStage10BatchCardCycle(
 items:readonly Stage10BatchPreviewItem[],
 request:Stage10BatchCardRequest,
):{rows:Stage10BatchPreviewRow[];previewableCount:number;blockedCount:number;writeAuthorized:false}{
 const rows=items.map((item):Stage10BatchPreviewRow=>{
  const blockers:Stage10PreviewBlocker[]=[];
  if(!item.verifiedSource||!item.id.trim())blockers.push('SOURCE_NOT_VERIFIED');
  if(!item.verifiedVersion?.trim())blockers.push('VERSION_NOT_VERIFIED');
  if(item.source==='benefit')blockers.push('BENEFIT_REQUIRES_OWN_WRITER');
  else if(item.source!=='card-purchase')blockers.push('UNSUPPORTED_SOURCE');
  const p=item.purchase;
  if(item.source==='card-purchase'){
   if(!p||!p.card.id.trim()||!request.destinationCard.id.trim()||p.card.id!==p.card.id.trim())
    blockers.push('CARD_NOT_VERIFIED');
   if(!request.destinationCard.active||p?.card.active===false)blockers.push('CARD_INACTIVE');
   if(p&&p.status!=='active')blockers.push('PURCHASE_NOT_ACTIVE');
   if(p?.entries.some(e=>e.status!=='open'||e.partialPaidAmount>0))
    blockers.push('INSTALLMENT_PAYMENT_EXISTS');
   if(p&&!validCycle(p,request.purchaseDate??p.purchaseDate,request.destinationCard))
    blockers.push('INVALID_CARD_CYCLE_INPUT');
  }
  // A prévia nunca tenta inferir ligações, autorização ou permissões por nome/descrição.
  if(blockers.length||!p)
   return {id:item.id,source:item.source,previewAvailable:false,writeAuthorized:false,blockers,before:null,after:null};
  if(!validCycle(p,p.purchaseDate,p.card))
   return {id:item.id,source:item.source,previewAvailable:false,writeAuthorized:false,
    blockers:['INVALID_CARD_CYCLE_INPUT'],before:null,after:null};
  return {id:item.id,source:item.source,previewAvailable:true,writeAuthorized:false,blockers:[],
   before:cardPurchaseCyclePreview({
    purchaseDate:p.purchaseDate,totalAmount:p.totalAmount,installments:p.installments,
    closingDay:p.card.closingDay,dueDay:p.card.dueDay,
   }),
   after:cardPurchaseCyclePreview({
    purchaseDate:request.purchaseDate??p.purchaseDate,totalAmount:p.totalAmount,installments:p.installments,
    closingDay:request.destinationCard.closingDay,dueDay:request.destinationCard.dueDay,
   })};
 });
 return {rows,previewableCount:rows.filter(x=>x.previewAvailable).length,
  blockedCount:rows.filter(x=>!x.previewAvailable).length,writeAuthorized:false};
}
