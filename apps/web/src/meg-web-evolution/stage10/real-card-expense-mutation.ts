import type {ExpenseCatalogs,ExpenseDraft} from './ExpenseForm';
import {isStage10FoodBenefitCategory} from './real-expense-category-policy';

/**
 * Adaptador de entrada do formulario para o writer canonico CardPurchase.
 *
 * O frontend nao determina competencia, vencimento, parcelas ou saldo;
 * esses dados sao da API cards/service.ts e purchase-cycle-canonical.ts.
 * Esta funcao nao executa HTTP nem escreve em banco.
 */
export type Stage10CardPurchaseCreate={
 cardId:string;categoryId:string;description:string;
 totalAmount:number;purchaseDate:string;installments:number;
};
function deny():never{throw new Error('STAGE10_CARD_PURCHASE_CONTRACT_REQUIRED');}
function validDate(value:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const test=new Date(value+'T12:00:00.000Z');
 return Number.isFinite(test.getTime())&&test.toISOString().slice(0,10)===value;
}
function exactPositiveAmount(value:string):number{
 if(!/^(?:0|[1-9]\d{0,10})\.\d{2}$/.test(value))deny();
 const cents=BigInt(value.replace('.',''));
 if(cents<1n||cents>BigInt(Number.MAX_SAFE_INTEGER))deny();
 const amount=Number(value);
 if(!Number.isFinite(amount)||amount<=0)deny();
 return amount;
}
export function prepareStage10CardPurchaseCreate(
 draft:ExpenseDraft,catalogs:ExpenseCatalogs,
):Stage10CardPurchaseCreate{
 // O contrato do CardPurchase nao possui notes, status ou conta monetaria.
 // Nao apagar observacoes do usuario silenciosamente.
 if(draft.modality!=='credit'||draft.requestedStatus!=='planned'||
    draft.accountId!==''||draft.paymentMethodId!==''||
    Boolean(draft.notes.trim())||Boolean(draft.firstInstallmentDate)||
    !validDate(draft.date)||draft.description.trim().length<2||
    draft.description.trim().length>160)deny();
 const card=catalogs.creditCards?.find(c=>c.active&&c.id===draft.creditCardId);
 const category=catalogs.categories.find(c=>c.active&&c.id===draft.categoryId);
 if(!card||!category||isStage10FoodBenefitCategory(category)||
    !Number.isInteger(card.closingDay)||!Number.isInteger(card.dueDay)||
    (card.closingDay??0)<1||(card.closingDay??0)>31||
    (card.dueDay??0)<1||(card.dueDay??0)>31)deny();
 if(!/^(?:[1-9]|[1-3]\d|4[0-8])$/.test(draft.installmentsInput))deny();
 return {
  cardId:card.id,categoryId:category.id,description:draft.description.trim(),
  purchaseDate:draft.date,
  totalAmount:exactPositiveAmount(draft.amountInput),
  installments:Number(draft.installmentsInput),
 };
}
