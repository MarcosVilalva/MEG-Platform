import type {ExpenseCatalogs,ExpenseDraft} from './ExpenseForm';
import type {FinancialEvent,FinancialEventInput,BulkEventChanges} from '../../app/finance-client';
import {isStage10FoodBenefitCategory} from './real-expense-category-policy';

/** Preparacao de entrada, NAO calculo financeiro. O saldo, o status
 * canonico e o sinal persistido sao decididos somente pela API.
 * Este modulo nunca consulta banco nem efetua writes.
 */
function fail():never{throw new Error('STAGE10_EXPENSE_MUTATION_NOT_AUTHORIZED');}
function strictDate(date:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const instant=new Date(date+'T12:00:00.000Z');
 return !Number.isNaN(instant.getTime())&&instant.toISOString().slice(0,10)===date;
}
function monetaryAmount(input:string):number{
 // O formulario entrega decimal textual exato em centavos, sem BRL pontuado.
 if(!/^-?(?:0|[1-9]\d{0,10})\.\d{2}$/.test(input))fail();
 const value=Number(input);
 if(!Number.isFinite(value)||value===0||!Number.isSafeInteger(Math.round(value*100)))fail();
 return value;
}
function references(draft:ExpenseDraft,catalogs:ExpenseCatalogs){
 if(draft.modality!=='cash'||draft.creditCardId||draft.description.trim().length<1||
    draft.description.trim().length>500||!strictDate(draft.date)||
    !['paid','planned'].includes(draft.requestedStatus))fail();
 const category=catalogs.categories.find(x=>x.id===draft.categoryId&&x.active);
 const method=catalogs.paymentMethods.find(x=>x.id===draft.paymentMethodId&&x.active&&x.kind==='ordinary');
 const account=draft.accountId?catalogs.accounts.find(x=>x.id===draft.accountId&&x.active&&x.kind==='monetary'):null;
 if(!category||isStage10FoodBenefitCategory(category)||!method||(draft.accountId&&!account)||
    (draft.requestedStatus==='paid'&&!account))fail();
 if(draft.notes.length>4000)fail();
 return {categoryId:category.id,paymentMethodId:method.id,
  accountId:account?.id,status:draft.requestedStatus};
}
export function prepareStage10ExpenseCreate(draft:ExpenseDraft,catalogs:ExpenseCatalogs):FinancialEventInput{
 const r=references(draft,catalogs);
 return {
  description:draft.description.trim(),type:'expense',status:r.status,
  date:draft.date,amount:monetaryAmount(draft.amountInput),
  categoryId:r.categoryId,paymentMethodId:r.paymentMethodId,
  ...(r.accountId?{accountId:r.accountId}:{}),notes:draft.notes.trim(),
 };
}
export function prepareStage10ExpenseUpdate(
 draft:ExpenseDraft,catalogs:ExpenseCatalogs,event:FinancialEvent,
):{ids:string[];changes:BulkEventChanges;expectedUpdatedAtById:Record<string,string>}{
 const r=references(draft,catalogs);
 if(!event||!event.id||event.type!=='expense'||
    !['paid','planned'].includes(event.status)||!event.updatedAt||
    !Number.isFinite(Date.parse(event.updatedAt))||
    Boolean(event.sourcePayload?.transferId)||Boolean(event.sourcePayload?.transferLeg))
  fail();
 return {
  ids:[event.id],expectedUpdatedAtById:{[event.id]:event.updatedAt},
  changes:{
   description:draft.description.trim(),type:'expense',
   status:r.status,date:draft.date,amount:monetaryAmount(draft.amountInput),
   categoryId:r.categoryId,paymentMethodId:r.paymentMethodId,
   accountId:r.accountId??null,notes:draft.notes.trim(),
  },
 };
}
export function prepareStage10ExpenseArchive(event:FinancialEvent):{
 ids:string[];expectedUpdatedAtById:Record<string,string>;
}{
 if(!event||!event.id||event.type!=='expense'||!event.updatedAt||
    !Number.isFinite(Date.parse(event.updatedAt))||
    Boolean(event.sourcePayload?.transferId))fail();
 return {ids:[event.id],expectedUpdatedAtById:{[event.id]:event.updatedAt}};
}
/** Todo modo real de escrita exige opt-in explicito, origens distintas e role ativa. */
export function stage10RealMutationGate(env:{
 enabled?:string;apiOrigin?:string;expectedApiOrigin?:string;readOrigin?:string;
},pageOrigin:string,userRole:string|undefined):boolean{
 const origin=(s?:string):string|null=>{
  if(!s)return null;
  try{const u=new URL(s);return u.protocol==='https:'&&u.href===u.origin+'/'&&
   !u.username&&!u.password&&!u.search&&!u.hash?u.origin:null;}catch{return null;}
 };
 const auth=origin(env.apiOrigin),expected=origin(env.expectedApiOrigin),
  read=origin(env.readOrigin),page=origin(pageOrigin+'/');
 return env.enabled==='true'&&Boolean(auth&&expected&&read&&page&&
  auth===expected&&auth!==read&&auth!==page&&read!==page&&
  ['ADMIN','MANAGER','OPERATOR'].includes(userRole||''));
}
