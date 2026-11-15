import assert from 'node:assert/strict';
import type {ExpenseDraft,ExpenseCatalogs} from './ExpenseForm';
import type {FinancialEvent} from '../../app/finance-client';
import {prepareStage10ExpenseCreate,prepareStage10ExpenseUpdate,
 prepareStage10ExpenseArchive,stage10RealMutationGate} from './real-expense-mutation';

const catalogs:ExpenseCatalogs={
 categories:[{id:'cat',name:'Casa',active:true},{id:'food',name:'Alimentação',active:true}],
 accounts:[{id:'account',name:'Conta',kind:'monetary',active:true},
  {id:'benefit',name:'Alimentacao',kind:'benefit',active:true}],
 paymentMethods:[{id:'pix',name:'PIX',kind:'ordinary',active:true},
  {id:'verocard',name:'Verocard',kind:'benefit',active:true}],
 creditCards:[],
};
const draft:ExpenseDraft={
 description:'Compra de teste',categoryId:'cat',accountId:'account',paymentMethodId:'pix',
 modality:'cash',date:'2026-11-14',amountInput:'125.49',requestedStatus:'paid',
 creditCardId:'',notes:'Teste',installmentsInput:'1',firstInstallmentDate:'',
};
const created=prepareStage10ExpenseCreate(draft,catalogs);
assert.equal(created.type,'expense');
assert.equal(created.amount,125.49);
assert.equal(created.status,'paid');
assert.equal(created.accountId,'account');
assert.equal(created.paymentMethodId,'pix');
const planned=prepareStage10ExpenseCreate({...draft,requestedStatus:'planned',accountId:''},catalogs);
assert.equal(planned.status,'planned');
assert.equal(planned.accountId,undefined,'pendente pode nao possuir conta de baixa');
const refund=prepareStage10ExpenseCreate({...draft,amountInput:'-125.49'},catalogs);
assert.equal(refund.amount,-125.49,'sinal original do estorno preservado');
const event={id:'evt-001',type:'expense',status:'paid',
 updatedAt:'2026-11-14T12:00:00.000Z'} as FinancialEvent;
const updated=prepareStage10ExpenseUpdate(draft,catalogs,event);
assert.deepEqual(updated.ids,['evt-001']);
assert.deepEqual(updated.expectedUpdatedAtById,{'evt-001':event.updatedAt});
assert.equal(updated.changes.amount,125.49);
assert.equal(updated.changes.paymentMethodId,'pix');
assert.deepEqual(prepareStage10ExpenseArchive(event).ids,['evt-001']);
const deny=(change:(x:ExpenseDraft)=>ExpenseDraft)=>assert.throws(
 ()=>prepareStage10ExpenseCreate(change(draft),catalogs),
 /STAGE10_EXPENSE_MUTATION_NOT_AUTHORIZED/);
deny(x=>({...x,modality:'credit',creditCardId:'card'}));
deny(x=>({...x,paymentMethodId:'verocard'}));
deny(x=>({...x,categoryId:'food'}));
deny(x=>({...x,accountId:'benefit'}));
deny(x=>({...x,date:'2026-02-30'}));
deny(x=>({...x,date:''}));
deny(x=>({...x,amountInput:'0.00'}));
deny(x=>({...x,amountInput:'9999'}));
deny(x=>({...x,categoryId:'unknown'}));
deny(x=>({...x,requestedStatus:'paid',accountId:''}));
assert.throws(()=>prepareStage10ExpenseUpdate(draft,catalogs,{
 ...event,updatedAt:undefined
}),/STAGE10_EXPENSE_MUTATION_NOT_AUTHORIZED/);
assert.throws(()=>prepareStage10ExpenseUpdate(draft,catalogs,{
 ...event,sourcePayload:{transferId:'tx-linked'}
}),/STAGE10_EXPENSE_MUTATION_NOT_AUTHORIZED/);
assert.throws(()=>prepareStage10ExpenseArchive({...event,updatedAt:undefined}),
 /STAGE10_EXPENSE_MUTATION_NOT_AUTHORIZED/);
const gate={enabled:'true',apiOrigin:'https://qa-auth.example.invalid/',
 expectedApiOrigin:'https://qa-auth.example.invalid/',
 readOrigin:'https://qa-read.example.invalid/'};
assert.equal(stage10RealMutationGate(gate,'https://preview.example.invalid','ADMIN'),true);
assert.equal(stage10RealMutationGate(gate,'https://preview.example.invalid','VIEWER'),false);
assert.equal(stage10RealMutationGate({...gate,enabled:'false'},'https://preview.example.invalid','ADMIN'),false);
assert.equal(stage10RealMutationGate({...gate,expectedApiOrigin:'https://other.invalid/'},'https://preview.example.invalid','ADMIN'),false);
assert.equal(stage10RealMutationGate({...gate,readOrigin:'http://localhost:3333/'},'https://preview.example.invalid','ADMIN'),false);
console.log('STAGE10_REAL_EXPENSE_MUTATION_CONTRACT_SYNTHETIC PASS');
