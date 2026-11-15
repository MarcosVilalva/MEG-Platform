import assert from 'node:assert/strict';
import type {ExpenseCatalogs,ExpenseDraft} from './ExpenseForm';
import {applyStage10ExpenseCategory,isStage10FoodBenefitCategory,isStage10FixedCategory,stage10FoodBinding} from './real-expense-category-policy';

const catalogs:ExpenseCatalogs={
 categories:[{id:'food',name:'Alimentação',active:true,group:'Benefícios'},
  {id:'fixed',name:'Energia',active:true,group:'Fixo'},
  {id:'general',name:'Casa',active:true}],
 accounts:[{id:'bank',name:'Conta corrente',kind:'monetary',active:true},
  {id:'benefit',name:'Conta Benefício',kind:'benefit',active:true},
  {id:'closed',name:'Outra conta beneficio',kind:'benefit',active:false}],
 paymentMethods:[{id:'pix',name:'PIX',kind:'ordinary',active:true},
  {id:'verocard',name:'Verocard',kind:'benefit',active:true},
  {id:'credit',name:'Crédito',kind:'credit',active:true}],
 creditCards:[{id:'card',name:'Cartão crédito',active:true,closingDay:8,dueDay:15}],
};
const draft:ExpenseDraft={
 description:'ALMOÇO',categoryId:'general',accountId:'bank',paymentMethodId:'pix',
 modality:'credit',creditCardId:'card',installmentsInput:'3',firstInstallmentDate:'2026-11-14',
 requestedStatus:'planned',date:'2026-11-14',amountInput:'20.00',notes:'',
};
assert.equal(isStage10FoodBenefitCategory(catalogs.categories[0]),true);
assert.equal(isStage10FixedCategory(catalogs.categories[1]),true);
assert.deepEqual(stage10FoodBinding(catalogs),{accountId:'benefit',paymentMethodId:'verocard'});
const selected=applyStage10ExpenseCategory(draft,catalogs,'food');
assert.deepEqual([selected.accountId,selected.paymentMethodId,selected.requestedStatus,
 selected.modality,selected.creditCardId,selected.installmentsInput],
 ['benefit','verocard','paid','cash','','1']);
assert.equal(selected.amountInput,draft.amountInput,'Categoria nao copia nem modifica valor');
assert.equal(selected.date,draft.date,'Categoria nao copia nem modifica data');
const leaving=applyStage10ExpenseCategory(selected,catalogs,'general');
assert.equal(leaving.accountId,'','Conta beneficio nao pode vazar para despesa monetaria');
assert.equal(leaving.paymentMethodId,'','Verocard nao pode vazar para despesa monetaria');
const restored=applyStage10ExpenseCategory({...selected,accountId:'bank',paymentMethodId:'pix'},catalogs,'general');
assert.equal(restored.accountId,'bank','Autocomplete com conta monetaria ativa deve preservar ID historico');
assert.equal(restored.paymentMethodId,'pix','Autocomplete com forma ordinaria ativa deve preservar ID historico');
const fixed=applyStage10ExpenseCategory(draft,catalogs,'fixed');
assert.equal(fixed.requestedStatus,'paid');
assert.equal(applyStage10ExpenseCategory({...draft,modality:'credit'},catalogs,'fixed').requestedStatus,'planned',
 'No cartao o planejamento tem precedencia conforme financial-policy canonica');
const noMethod:ExpenseCatalogs={...catalogs,paymentMethods:catalogs.paymentMethods.filter(x=>x.id!=='verocard')};
assert.equal(stage10FoodBinding(noMethod),null);
const forcedWithoutMethod=applyStage10ExpenseCategory(draft,noMethod,'food');
assert.equal(forcedWithoutMethod.accountId,'');
assert.equal(forcedWithoutMethod.paymentMethodId,'');
const ambiguous:ExpenseCatalogs={...catalogs,accounts:[
 {id:'b1',name:'Benefício 1',kind:'benefit',active:true},
 {id:'b2',name:'Benefício 2',kind:'benefit',active:true},
]};
assert.equal(stage10FoodBinding(ambiguous),null,'Nao presumir entre duas contas beneficio');
const caseInsensitive={...catalogs,categories:[{id:'f',name:'ALIMENTAÇÃO',active:true}],
 paymentMethods:[{id:'v',name:'VEROCARD',kind:'benefit' as const,active:true}]};
assert.equal(isStage10FoodBenefitCategory(caseInsensitive.categories[0]),true);
assert.equal(stage10FoodBinding(caseInsensitive)?.paymentMethodId,'v');
console.log('STAGE10_CATEGORY_BENEFIT_FIXED_AUTOCOMPLETE_POLICY_SYNTHETIC PASS');
