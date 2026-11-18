import assert from 'node:assert/strict';
import {
  resolveCanonicalFinancialStatus,
  isBenefitFinancialEvent,
  countsTowardMonetaryBalance,
  summarizeMonetaryEvents,
} from './financial-policy';

/**
 * ETAPA 10 / CARACTERIZAÇÃO. Nenhuma regra de negócio é alterada.
 * Reproduz em dados FICTÍCIOS o impacto potencial das categorias reais
 * de cadastro identificadas em consulta SELECT: credit/other, Verocard/credit.
 * Os contadores são evidência de auditoria, não dados de fixture financeira.
 */
const ordinary = {type:'expense',requestedStatus:'paid'} as const;

const historicalCreditCataloguedAsOther = resolveCanonicalFinancialStatus({
  ...ordinary,
  paymentMethod:{name:'Cartão fictício QA',type:'other'},
});
assert.equal(historicalCreditCataloguedAsOther,'paid',
  'Método type=other não determina o adiamento de uma despesa para fatura');

const properlyTypedCredit = resolveCanonicalFinancialStatus({
  ...ordinary,
  paymentMethod:{name:'Cartão fictício QA',type:'credit'},
});
assert.equal(properlyTypedCredit,'planned',
  'O tipo credit adia a despesa pelo contrato financeiro existente');
assert.notEqual(historicalCreditCataloguedAsOther,properlyTypedCredit,
  'Tipo do método altera resultado canônico; IDs históricos exigem homologação');

const verocardCataloguedAsCredit = resolveCanonicalFinancialStatus({
  ...ordinary,
  paymentMethod:{name:'Verocard',type:'credit'},
});
assert.equal(verocardCataloguedAsCredit,'planned',
  'O writer monetário genérico não deve gerir benefícios Verocard');

const benefitEvent = {
  type:'expense',status:'paid',description:'Alimentação sintética QA',
  paymentMethod:{name:'Verocard',type:'credit'},account:{type:'benefit'},
};
assert.equal(isBenefitFinancialEvent(benefitEvent),true);
assert.equal(countsTowardMonetaryBalance(benefitEvent),false,
  'Benefício não deve ser debitado novamente do saldo monetário');
assert.equal(resolveCanonicalFinancialStatus({
  ...ordinary,
  paymentMethod:{name:'PIX',type:'instant'},
}),'paid');

// Cenário puramente hipotético: benefício legado com conta cadastrada como
// monetária, sem marca Verocard na descrição e com method FK originalmente NULL.
// A função canônica não lê financialScope do payload; um vínculo por nome
// pode RETIRAR esse valor do saldo, mesmo sem mudar o signedAmount/status.
const unlinkedBenefitLike = {
  description:'Consumo alimentacao QA', type:'expense', status:'paid',
  signedAmount:-35.17, account:{type:'checking'},
};
const incorrectlyLinkedToCreditVerocard = {
  ...unlinkedBenefitLike, paymentMethod:{name:'Verocard',type:'credit'},
};
assert.equal(countsTowardMonetaryBalance(unlinkedBenefitLike),true);
assert.equal(countsTowardMonetaryBalance(incorrectlyLinkedToCreditVerocard),false);
assert.equal(summarizeMonetaryEvents([unlinkedBenefitLike]).realizedResult,-35.17);
assert.equal(summarizeMonetaryEvents([incorrectlyLinkedToCreditVerocard]).realizedResult,0,
  'FK Verocard pode mudar o saldo projetado pela classificacao, sem mudar a linha');
assert.equal(isBenefitFinancialEvent(unlinkedBenefitLike),false);
assert.equal(isBenefitFinancialEvent(incorrectlyLinkedToCreditVerocard),true);

// Com Account.type=benefit corretamente identificado, a exclusao ja ocorre
// antes do preenchimento do metodo. Isto NAO prova que a base real esteja errada.
assert.equal(countsTowardMonetaryBalance({
  ...unlinkedBenefitLike,account:{type:'benefit'},
}),false);
assert.equal(countsTowardMonetaryBalance({
  ...incorrectlyLinkedToCreditVerocard,account:{type:'benefit'},
}),false);

console.log('MEG_STAGE10_FINANCIAL_MAPPING_TYPE_COLLISION_CHARACTERIZED PASS');
