import assert from 'node:assert/strict';
import {
  resolveCanonicalFinancialStatus,
  isBenefitFinancialEvent,
  countsTowardMonetaryBalance,
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

console.log('MEG_STAGE10_FINANCIAL_MAPPING_TYPE_COLLISION_CHARACTERIZED PASS');
