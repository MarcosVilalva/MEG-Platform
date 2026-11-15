import type {ExpenseCatalogOption,ExpenseCatalogs,ExpenseDraft} from './ExpenseForm';

/** Identidade de categorias, sem cálculo financeiro ou inferência de saldos. */
function canonical(value:unknown):string{
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
}
export function isStage10FoodBenefitCategory(option?:Pick<ExpenseCatalogOption,'name'>&{group?:string}|null):boolean{
 return Boolean(option&&(canonical(option.name)==='ALIMENTACAO'||canonical(option.group)==='ALIMENTACAO'));
}
export function isStage10FixedCategory(option?:Pick<ExpenseCatalogOption,'name'>&{group?:string}|null):boolean{
 return Boolean(option&&(canonical(option.name)==='FIXO'||canonical(option.group)==='FIXO'));
}
export function stage10FoodBinding(catalogs:ExpenseCatalogs):{
 accountId:string;paymentMethodId:string;
}|null{
 const accounts=catalogs.accounts.filter(a=>a.active&&a.kind==='benefit');
 const named=accounts.filter(a=>canonical(a.name)==='CONTA BENEFICIO');
 // Sem nome único, apenas um cadastro de benefício ativo é inequívoco.
 const account=named.length===1?named[0]:named.length===0&&accounts.length===1?accounts[0]:null;
 const methods=catalogs.paymentMethods.filter(m=>m.active&&m.kind==='benefit'&&canonical(m.name)==='VEROCARD');
 if(!account||methods.length!==1)return null;
 return {accountId:account.id,paymentMethodId:methods[0].id};
}
/** Alimentação -> Conta Benefício + Verocard + Pago; Fixo -> Pago.
 * Os vínculos são IDs reais do catálogo ativo, sem criar cadastros fictícios.
 */
export function applyStage10ExpenseCategory(
 draft:ExpenseDraft,catalogs:ExpenseCatalogs,categoryId:string,
):ExpenseDraft{
 const nextCategory=catalogs.categories.find(c=>c.id===categoryId&&c.active);
 const previousCategory=catalogs.categories.find(c=>c.id===draft.categoryId&&c.active);
 const next={...draft,categoryId};
 if(isStage10FoodBenefitCategory(nextCategory)){
  const b=stage10FoodBinding(catalogs);
  return {...next,modality:'cash',requestedStatus:'paid',
   accountId:b?.accountId??'',paymentMethodId:b?.paymentMethodId??'',
   creditCardId:'',installmentsInput:'1',firstInstallmentDate:''};
 }
 if(isStage10FoodBenefitCategory(previousCategory)){
  if(catalogs.accounts.some(a=>a.id===next.accountId&&a.kind==='benefit'))next.accountId='';
  if(catalogs.paymentMethods.some(m=>m.id===next.paymentMethodId&&m.kind==='benefit'))next.paymentMethodId='';
 }
 if(isStage10FixedCategory(nextCategory))next.requestedStatus='paid';
 return next;
}
