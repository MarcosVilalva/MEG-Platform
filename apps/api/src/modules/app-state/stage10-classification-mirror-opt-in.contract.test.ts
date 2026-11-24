import assert from 'node:assert/strict';
import {mirrorFinancialEventToLegacyTransaction} from './normalized-primary-writeback';

const original={
 id:'pt69-legacy',date:'2026-09-01',description:'Despesa histórica',type:'expense',
 status:'paid',expenseAmount:30,category:'Antiga',group:'Antigo grupo',
 expenseClass:'Essencial',paymentMethod:'PIX',financialAccountId:'account-original',
};
const event={
 id:'event-pt69',legacyTransactionId:'pt69-legacy',date:new Date('2026-09-01T12:00:00.000Z'),
 description:'Despesa histórica',type:'expense',status:'paid',amount:30,signedAmount:-30,
 notes:null,sourcePayload:original,accountId:'account-original',
 paymentMethod:{name:'PIX'},category:{name:'Nova',group:'Novo grupo'},
};
const unchanged=mirrorFinancialEventToLegacyTransaction(event);
assert.equal(unchanged.category,'Antiga');
assert.equal(unchanged.group,'Antigo grupo');
assert.equal(unchanged.expenseClass,'Essencial');
console.log('PT69_CLASSIFICATION_LEGACY_DEFAULT_PRESERVED=PASS');
const updated=mirrorFinancialEventToLegacyTransaction(event,{syncClassification:true});
assert.equal(updated.category,'Nova');
assert.equal(updated.group,'Novo grupo');
assert.equal(updated.expenseClass,'Essencial');
assert.equal(updated.financialAccountId,'account-original');
assert.equal(updated.paymentMethod,'PIX');
assert.equal(updated.expenseAmount,30);
console.log('PT69_CATEGORY_GROUP_OPT_IN_ONLY=PASS');
const withoutFields=mirrorFinancialEventToLegacyTransaction({...event,sourcePayload:{id:original.id,date:original.date}}, {syncClassification:true});
assert.equal(Object.hasOwn(withoutFields,'category'),false);
assert.equal(Object.hasOwn(withoutFields,'group'),false);
console.log('PT69_MISSING_LEGACY_FIELDS_NOT_INVENTED=PASS');
console.log('PT69_DATABASE_OR_API_WRITE=NONE');
