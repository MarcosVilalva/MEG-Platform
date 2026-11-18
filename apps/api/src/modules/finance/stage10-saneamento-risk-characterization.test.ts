import assert from 'node:assert/strict';
import {
 resolveCanonicalFinancialStatus,
 isBenefitFinancialEvent,
} from './financial-policy';

// Caracterizacao: vinculo historico por nome NAO aprova reexecucao de regra.
const historicalPaid=resolveCanonicalFinancialStatus({
 type:'expense',requestedStatus:'paid',
});
const creditPaid=resolveCanonicalFinancialStatus({
 type:'expense',requestedStatus:'paid',
 paymentMethod:{name:'CARTAO QA',type:'credit'},
});
assert.equal(historicalPaid,'paid');
assert.equal(creditPaid,'planned');
assert.notEqual(historicalPaid,creditPaid,
 'Um match de pagamento com tipo credit pode mudar a politica de status');

const historicalPlanned=resolveCanonicalFinancialStatus({
 type:'expense',requestedStatus:'planned',
});
const fixedPlanned=resolveCanonicalFinancialStatus({
 type:'expense',requestedStatus:'planned',
 category:{name:'Fixo',group:'Fixo'},
});
assert.equal(historicalPlanned,'planned');
assert.equal(fixedPlanned,'paid');
assert.notEqual(historicalPlanned,fixedPlanned,
 'Vincular categoria Fixo pode mudar a politica de status');

assert.equal(isBenefitFinancialEvent({account:{type:'benefit'}}),true);
assert.equal(isBenefitFinancialEvent({paymentMethod:{name:'VEROCARD'}}),true);
assert.equal(isBenefitFinancialEvent({account:{type:'checking'},paymentMethod:{name:'PIX'}}),false);

console.log('MEG_STAGE10_QA_FINANCIAL_POLICY_CHANGE_RISKS_CHARACTERIZED PASS');
