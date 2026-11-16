import assert from 'node:assert/strict';
import type {ExpenseCatalogs,ExpenseDraft} from './ExpenseForm';
import {prepareStage10CardPurchaseCreate} from './real-card-expense-mutation';
const catalogs:ExpenseCatalogs={
 categories:[
  {id:'regular',name:'Casa',active:true},
  {id:'food',name:'Alimentação',active:true},
 ],
 accounts:[{id:'bank',name:'Conta corrente',kind:'monetary',active:true}],
 paymentMethods:[{id:'pix',name:'PIX',kind:'ordinary',active:true}],
 creditCards:[{id:'card',name:'Cartão QA',active:true,closingDay:9,dueDay:17}],
};
const draft:ExpenseDraft={
 description:'Compra sintética',categoryId:'regular',
 accountId:'',paymentMethodId:'',modality:'credit',creditCardId:'card',
 date:'2026-11-15',amountInput:'125.49',requestedStatus:'planned',
 notes:'',installmentsInput:'3',firstInstallmentDate:'',
};
const command=prepareStage10CardPurchaseCreate(draft,catalogs);
assert.deepEqual(command,{
 cardId:'card',categoryId:'regular',description:'Compra sintética',
 purchaseDate:'2026-11-15',totalAmount:125.49,installments:3,
});
assert.equal('status' in command,false,'Status e decidido pelo dominio');
assert.equal('notes' in command,false,'Campo sem suporte nunca e enviado silenciosamente');
assert.equal('amount' in command,false,'CardPurchase tem totalAmount distinto de FinancialEvent');
assert.equal('statementMonth' in command,false,'Competencia calculada no backend');
assert.equal('entries' in command,false,'Parcelas geradas exclusivamente no backend');
assert.equal(prepareStage10CardPurchaseCreate({...draft,installmentsInput:'1'},catalogs).installments,1);
assert.equal(prepareStage10CardPurchaseCreate({...draft,installmentsInput:'48'},catalogs).installments,48);
assert.equal(prepareStage10CardPurchaseCreate({...draft,amountInput:'0.01'},catalogs).totalAmount,.01);
for(const patch of [
 {modality:'cash' as const},{requestedStatus:'paid' as const},
 {accountId:'bank'},{paymentMethodId:'pix'}, {notes:'NAO PERDER NOTA'},
 {firstInstallmentDate:'2026-12-01'}, {date:'2026-02-30'},
 {date:'2026/11/15'}, {description:'x'}, {description:''},
 {amountInput:'0.00'}, {amountInput:'-1.00'},{amountInput:'1,00'},
 {amountInput:'1.1'}, {amountInput:'100000000000.00'},
 {installmentsInput:'0'},{installmentsInput:'49'},
 {installmentsInput:'1.5'},{installmentsInput:'03'},
 {categoryId:'food'},{categoryId:'unknown'}, {creditCardId:'wrong'},
] as Partial<ExpenseDraft>[]){
 assert.throws(()=>prepareStage10CardPurchaseCreate({...draft,...patch},catalogs),
  /STAGE10_CARD_PURCHASE_CONTRACT_REQUIRED/,JSON.stringify(patch));
}
assert.throws(()=>prepareStage10CardPurchaseCreate(draft,{...catalogs,creditCards:[]}),
 /STAGE10_CARD_PURCHASE_CONTRACT_REQUIRED/);
assert.throws(()=>prepareStage10CardPurchaseCreate(draft,{...catalogs,
 creditCards:[{id:'card',name:'Outro',active:false,closingDay:9,dueDay:17}]}),
 /STAGE10_CARD_PURCHASE_CONTRACT_REQUIRED/);
assert.throws(()=>prepareStage10CardPurchaseCreate(draft,{...catalogs,
 creditCards:[{id:'card',name:'Outro',active:true,closingDay:0,dueDay:17}]}),
 /STAGE10_CARD_PURCHASE_CONTRACT_REQUIRED/);
console.log('STAGE10_CARD_PURCHASE_WRITER_ADAPTER_SYNTHETIC PASS');
