import type {FinancialEvent} from '../../app/finance-client';
import type {ExpenseCatalogs,ExpenseDraft} from './ExpenseForm';
import {isStage10FoodBenefitCategory,stage10FoodBinding} from './real-expense-category-policy';

/** Encaminha Alimentação exclusivamente à autoridade benefit-event-mutation.
 * O servidor decide saldo e baixa em transação serializável. A Web valida só
 * formato de entrada e identidade dos catálogos ativos, sem calcular saldo.
 */
export type Stage10BenefitExpenseCommand={
 description:string;type:'expense';date:string;amount:number;
 accountId:string;categoryId:string;paymentMethodId:string;notes:string;
};
export type Stage10BenefitExpenseUpdate=Stage10BenefitExpenseCommand&{
 expectedUpdatedAt:string;
};
function fail():never{throw new Error('STAGE10_BENEFIT_CONTRACT_REQUIRED');}
function strictDate(value:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T12:00:00.000Z');
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
}
function amountOf(input:string):number{
 const match=/^([0-9]{1,11})\.([0-9]{2})$/.exec(input);
 if(!match)fail();
 const cents=BigInt(match[1])*100n+BigInt(match[2]);
 if(cents<1n||cents>BigInt(Number.MAX_SAFE_INTEGER))fail();
 const amount=Number(input);
 if(!Number.isFinite(amount)||amount<=0)fail();
 return amount;
}
export function prepareStage10BenefitExpenseCreate(
 draft:ExpenseDraft,catalogs:ExpenseCatalogs,
):Stage10BenefitExpenseCommand{
 const category=catalogs.categories.find(c=>c.active&&c.id===draft.categoryId);
 const binding=stage10FoodBinding(catalogs);
 if(!category||!isStage10FoodBenefitCategory(category)||!binding||
  draft.modality!=='cash'||draft.requestedStatus!=='paid'||
  draft.accountId!==binding.accountId||draft.paymentMethodId!==binding.paymentMethodId||
  Boolean(draft.creditCardId)||draft.installmentsInput!=='1'||
  !strictDate(draft.date)||!draft.description.trim()||
  draft.description.trim().length>160||draft.notes.length>1000)fail();
 return {description:draft.description.trim(),type:'expense',date:draft.date,
  amount:amountOf(draft.amountInput),accountId:binding.accountId,
  categoryId:category.id,paymentMethodId:binding.paymentMethodId,
  notes:draft.notes.trim()};
}
export function prepareStage10BenefitExpenseUpdate(
 draft:ExpenseDraft,catalogs:ExpenseCatalogs,event:FinancialEvent,
):Stage10BenefitExpenseUpdate{
 const input=prepareStage10BenefitExpenseCreate(draft,catalogs);
 if(!event||!event.id||event.type!=='expense'||event.status!=='paid'||
  !event.updatedAt||!Number.isFinite(Date.parse(event.updatedAt))||
  event.accountId!==input.accountId||event.paymentMethodId!==input.paymentMethodId||
  Boolean(event.sourcePayload?.transferId)||Boolean(event.sourcePayload?.transferLeg))
  fail();
 return {...input,expectedUpdatedAt:event.updatedAt};
}
