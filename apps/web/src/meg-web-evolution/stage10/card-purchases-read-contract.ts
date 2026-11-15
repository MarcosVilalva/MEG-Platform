/**
 * Etapa 10. Adaptador ESTRITAMENTE consultivo de CardPurchase/CardInstallment.
 * Nunca converte o agregado em FinancialEvent nem calcula saldos/faturas.
 * A identidade canônica de cada parcela é preservada para futura edição.
 */
export type Stage10CardInstallmentRead={
 id:string;number:number;amount:string|number;partialPaidAmount:string|number;
 statementMonth:string;status:string;paidAt:string|null;
};
export type Stage10CardPurchaseRead={
 id:string;cardId:string;categoryId:string|null;description:string;
 totalAmount:string|number;purchaseDate:string;installments:number;
 status:string;createdAt:string;updatedAt:string;entries:readonly Stage10CardInstallmentRead[];
};
export type Stage10CardPurchasesRead={
 kind:'stage10-card-purchase-history-v1';canWrite:false;
 source:'canonical-card-purchases';actorId:string;workspaceId:string;
 dataOwnerId:string;month:string;total:number;
 purchases:readonly Stage10CardPurchaseRead[];
};
export type Stage10CardPurchasesLimit={
 kind:'stage10-card-purchase-history-limit-v1';canWrite:false;
 limit:5000;total:number;
};
function record(value:unknown):value is Record<string,unknown>{
 return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
function id(value:unknown):value is string{
 return typeof value==='string'&&value.length>0&&value.length<=256;
}
function isoDate(value:unknown):value is string{
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)&&
  !Number.isNaN(Date.parse(value));
}
function month(value:unknown):value is string{
 return typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
function amount(value:unknown):value is string|number{
 return typeof value==='string'?/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value):
  typeof value==='number'&&Number.isFinite(value)&&value>=0;
}
function deny():never{throw new Error('STAGE10_CARD_PURCHASE_READ_INVALID');}

/**
 * Exige envelope, owner, workspace, período e IDs únicos.
 * A filtragem por mês e a autorização são responsabilidades da API QA.
 * A Web NÃO deduz equivalência com FinancialEvent por descrição/valor/data.
 */
export function validateStage10CardPurchasesRead(
 raw:unknown,expected:{actorId:string;workspaceId:string;month:string},
):Stage10CardPurchasesRead{
 if(!record(raw)||raw.kind!=='stage10-card-purchase-history-v1'||
  raw.canWrite!==false||raw.source!=='canonical-card-purchases'||
  !id(expected.actorId)||!id(expected.workspaceId)||!month(expected.month)||
  raw.actorId!==expected.actorId||raw.workspaceId!==expected.workspaceId||
  !id(raw.dataOwnerId)||raw.month!==expected.month||
  !Number.isSafeInteger(raw.total)||(raw.total as number)<0||
  (raw.total as number)>5000||!Array.isArray(raw.purchases)||
  raw.purchases.length!==raw.total)deny();
 const purchaseIds=new Set<string>();
 const installmentIds=new Set<string>();
 for(const p of raw.purchases){
  if(!record(p)||!id(p.id)||purchaseIds.has(p.id)||
   !id(p.cardId)||!(p.categoryId===null||id(p.categoryId))||
   typeof p.description!=='string'||p.description.length>500||
   !amount(p.totalAmount)||!isoDate(p.purchaseDate)||
   !Number.isSafeInteger(p.installments)||(p.installments as number)<1||
   (p.installments as number)>48||p.status!=='active'||
   !isoDate(p.createdAt)||!isoDate(p.updatedAt)||
   !Array.isArray(p.entries)||p.entries.length!==p.installments)deny();
  purchaseIds.add(p.id);
  const count=p.installments as number;
  const seq=new Set<number>();
  for(const entry of p.entries){
   if(!record(entry)||!id(entry.id)||installmentIds.has(entry.id)||
    !Number.isSafeInteger(entry.number)||(entry.number as number)<1||
    (entry.number as number)>count||seq.has(entry.number as number)||
    !amount(entry.amount)||!amount(entry.partialPaidAmount)||
    !month(entry.statementMonth)||!id(entry.status)||
    !(entry.paidAt===null||isoDate(entry.paidAt)))deny();
   installmentIds.add(entry.id);seq.add(entry.number as number);
  }
  if(seq.size!==count)deny();
 }
 return raw as unknown as Stage10CardPurchasesRead;
}
export function assertStage10CardPurchasesNotMergedWithEvents(
 _purchases:Stage10CardPurchasesRead,
 _financialEventIds:ReadonlySet<string>,
):false{
 // A fonte canônica não fornece chave de equivalência com eventos históricos.
 // Nenhum heurístico por data/descrição/valor cria uma junção confiável.
 return false;
}
