import assert from 'node:assert/strict';
import type {ExpenseCatalogs,ExpenseDraft} from './ExpenseForm';
import type {FinancialEvent} from '../../app/finance-client';
import {prepareStage10BenefitExpenseCreate,prepareStage10BenefitExpenseUpdate} from './real-benefit-expense-mutation';
const catalogs:ExpenseCatalogs={
 categories:[{id:'food',name:'Alimentação',group:'Benefícios',active:true},
  {id:'home',name:'Casa',active:true}],
 accounts:[{id:'benefit',name:'Conta Benefício',kind:'benefit',active:true},
  {id:'bank',name:'Banco',kind:'monetary',active:true}],
 paymentMethods:[{id:'v',name:'Verocard',kind:'benefit',active:true},
  {id:'pix',name:'PIX',kind:'ordinary',active:true}],creditCards:[],
};
const draft:ExpenseDraft={
 description:'SUPERMERCADO',categoryId:'food',accountId:'benefit',paymentMethodId:'v',
 modality:'cash',date:'2026-11-14',amountInput:'125.49',requestedStatus:'paid',
 creditCardId:'',notes:'',installmentsInput:'1',firstInstallmentDate:'',
};
const created=prepareStage10BenefitExpenseCreate(draft,catalogs);
assert.deepEqual(created,{description:'SUPERMERCADO',type:'expense',date:'2026-11-14',
 amount:125.49,accountId:'benefit',categoryId:'food',paymentMethodId:'v',notes:''});
assert.equal('status' in created,false,'Saldo/status pertencem ao writer de beneficio');
const event={id:'benefit-event',type:'expense',status:'paid',
 updatedAt:'2026-11-14T12:00:00.000Z',accountId:'benefit',paymentMethodId:'v'} as FinancialEvent;
assert.equal(prepareStage10BenefitExpenseUpdate(draft,catalogs,event).expectedUpdatedAt,event.updatedAt);
const deny=(patch:Partial<ExpenseDraft>)=>assert.throws(
 ()=>prepareStage10BenefitExpenseCreate({...draft,...patch},catalogs),
 /STAGE10_BENEFIT_CONTRACT_REQUIRED/);
deny({categoryId:'home'});
deny({accountId:'bank'});
deny({paymentMethodId:'pix'});
deny({requestedStatus:'planned'});
deny({modality:'credit',creditCardId:'card'});
deny({amountInput:'-125.49'});
deny({amountInput:'0.00'});
deny({amountInput:'10'});
deny({date:'2026-02-30'});
deny({installmentsInput:'2'});
const insufficientCatalog:ExpenseCatalogs={...catalogs,accounts:catalogs.accounts.filter(a=>a.id!=='benefit')};
assert.throws(()=>prepareStage10BenefitExpenseCreate(draft,insufficientCatalog),/STAGE10_BENEFIT_CONTRACT_REQUIRED/);
assert.throws(()=>prepareStage10BenefitExpenseUpdate(draft,catalogs,{...event,updatedAt:''}),/STAGE10_BENEFIT_CONTRACT_REQUIRED/);
assert.throws(()=>prepareStage10BenefitExpenseUpdate(draft,catalogs,{...event,accountId:'bank'}),/STAGE10_BENEFIT_CONTRACT_REQUIRED/);
assert.throws(()=>prepareStage10BenefitExpenseUpdate(draft,catalogs,{...event,sourcePayload:{transferId:'transfer'}}),/STAGE10_BENEFIT_CONTRACT_REQUIRED/);
console.log('STAGE10_BENEFIT_EXPENSE_CANONICAL_WRITER_CONTRACT_SYNTHETIC PASS');
