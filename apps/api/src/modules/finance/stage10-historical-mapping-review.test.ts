import assert from 'node:assert/strict';
import { classifyStage10HistoricalLink } from './stage10-historical-mapping-review';

type Proposal = Parameters<typeof classifyStage10HistoricalLink>[0];
const base: Proposal = {
  event: {
    id:'synthetic-event',userId:'qa-owner',type:'expense',status:'paid',
    amount:22.35,signedAmount:-22.35,categoryId:null,paymentMethodId:null,
    archivedAt:null,
    sourcePayload:{
      category:'Mercado',expenseClass:'CONTAS GERAIS',paymentMethod:'PIX',
      modality:'à vista',financialScope:'monetary',
    },
    account:{id:'qa-account',userId:'qa-owner',type:'checking',isActive:true},hasLedger:false,hasReceipt:false,
    hasPayablePayment:false,hasImportedRow:false,
  },
  category: {
    id:'qa-category',userId:'qa-owner',name:'Mercado',
    group:'CONTAS GERAIS',type:'expense',isActive:true,
  },
  paymentMethod: {
    id:'qa-method',userId:'qa-owner',name:'PIX',type:'instant',isActive:true,
  },
  categoryMatchCount:1,paymentMatchCount:1,
};
function scenario(changes: Partial<Proposal>, event:Partial<Proposal['event']> = {}) {
  return classifyStage10HistoricalLink({
    ...base,...changes,event:{...base.event,...(changes.event ?? {}),...event},
  });
}
function blocked(label:string, input:ReturnType<typeof classifyStage10HistoricalLink>,reason:string) {
  assert.equal(input.classification,'blocked',label);
  assert.ok(input.reasons.includes(reason),label+' expected '+reason+' got '+input.reasons.join(','));
  assert.equal(input.writeAuthorized,false);
  assert.equal(input.paymentMethodId,null);
  assert.equal(input.categoryId,null);
}
const eligible = scenario({});
assert.equal(eligible.classification,'eligible_for_explicit_review');
assert.equal(eligible.writeAuthorized,false);
assert.equal(eligible.categoryId,'qa-category');
assert.equal(eligible.paymentMethodId,'qa-method');
assert.deepEqual(eligible.reasons,[]);

const planned = scenario({}, {status:'planned'});
assert.equal(planned.classification,'eligible_for_explicit_review');
assert.equal(planned.writeAuthorized,false);

const paidIncome = scenario({
  category:{...base.category!,type:'income'},
}, {type:'income',signedAmount:22.35,status:'paid'});
assert.equal(paidIncome.classification,'eligible_for_explicit_review');
assert.equal(paidIncome.writeAuthorized,false);

// Cenário fiscal/financeiro em QA: o nome exato sozinho NÃO significa que
// Verocard possa passar pelo writer de crédito monetário.
blocked('verocard credit',scenario({
  paymentMethod:{...base.paymentMethod!,name:'Verocard',type:'credit'},
  event:{...base.event,account:{id:'qa-account',userId:'qa-owner',type:'benefit',isActive:true},sourcePayload:{
    category:'Mercado',expenseClass:'CONTAS GERAIS',paymentMethod:'Verocard',
    modality:'alimentação',financialScope:'benefit',
  }},
}),'FINANCIAL_DOMAIN_SPECIALIST_REQUIRED');

blocked('credito other',scenario({
  paymentMethod:{...base.paymentMethod!,name:'Cartão Azul',type:'other'},
  event:{...base.event,sourcePayload:{
    category:'Mercado',expenseClass:'CONTAS GERAIS',paymentMethod:'Cartão Azul',
    modality:'credito',financialScope:'monetary',
  }},
}),'FINANCIAL_DOMAIN_SPECIALIST_REQUIRED');

blocked('credito mislabeled pix',scenario({
  event:{...base.event,sourcePayload:{
    category:'Mercado',expenseClass:'CONTAS GERAIS',paymentMethod:'PIX',
    modality:'credito',financialScope:'monetary',
  }},
}),'FINANCIAL_DOMAIN_SPECIALIST_REQUIRED');
blocked('debit card still specialist',scenario({
  paymentMethod:{...base.paymentMethod!,name:'Cartão Débito'},
  event:{...base.event,sourcePayload:{
    category:'Mercado',expenseClass:'CONTAS GERAIS',paymentMethod:'Cartão Débito',
    modality:'à vista',financialScope:'monetary',
  }},
}),'FINANCIAL_DOMAIN_SPECIALIST_REQUIRED');

blocked('category sentinel',scenario({
  category:{...base.category!,name:'Sem categoria'},
  event:{...base.event,sourcePayload:{
    ...base.event.sourcePayload as Record<string,unknown>,category:'Sem categoria',
  }},
}),'LEGACY_SENTINEL_VALUE');
blocked('informado sentinel',scenario({
  paymentMethod:{...base.paymentMethod!,name:'Não informado'},
  event:{...base.event,sourcePayload:{
    ...base.event.sourcePayload as Record<string,unknown>,paymentMethod:'Não informado',
  }},
}),'LEGACY_SENTINEL_VALUE');

blocked('ambiguous category',scenario({categoryMatchCount:2}),'NO_UNAMBIGUOUS_CATALOG_MATCH');
blocked('unknown payment',scenario({paymentMethod:null,paymentMatchCount:0}),'NO_UNAMBIGUOUS_CATALOG_MATCH');
blocked('wrong owner',scenario({paymentMethod:{...base.paymentMethod!,userId:'other-tenant'}}),'PAYMENT_SCOPE_OR_LABEL_MISMATCH');
blocked('wrong group',scenario({category:{...base.category!,group:'OUTRA'}}),'CATEGORY_SCOPE_OR_LABEL_MISMATCH');
blocked('account benefit',scenario({event:{...base.event,account:{id:'qa-account',userId:'qa-owner',type:'benefit',isActive:true}}}),'FINANCIAL_DOMAIN_SPECIALIST_REQUIRED');
blocked('account wrong owner',scenario({event:{...base.event,account:{...base.event.account!,userId:'other'}}}),'MONETARY_ACCOUNT_SCOPE_OR_STATUS_INVALID');
blocked('account inactive',scenario({event:{...base.event,account:{...base.event.account!,isActive:false}}}),'MONETARY_ACCOUNT_SCOPE_OR_STATUS_INVALID');
blocked('old category linked',scenario({}, {categoryId:'already-linked'}),'ALREADY_CANONICALLY_LINKED');
blocked('archived',scenario({}, {archivedAt:new Date('2026-11-17')}),'EVENT_NOT_ACTIVE_OR_OWNED');
blocked('ledger',scenario({}, {hasLedger:true}),'LINKED_FINANCIAL_DOMAIN_REQUIRES_CANONICAL_WRITER');
blocked('receipt',scenario({}, {hasReceipt:true}),'LINKED_FINANCIAL_DOMAIN_REQUIRES_CANONICAL_WRITER');
blocked('payable payment',scenario({}, {hasPayablePayment:true}),'LINKED_FINANCIAL_DOMAIN_REQUIRES_CANONICAL_WRITER');
blocked('imported row',scenario({}, {hasImportedRow:true}),'LINKED_FINANCIAL_DOMAIN_REQUIRES_CANONICAL_WRITER');
blocked('positive expense adjustment',scenario({}, {signedAmount:22.35}),'SIGNED_AMOUNT_REQUIRES_FINANCIAL_REVIEW');
blocked('fixed category',scenario({
  category:{...base.category!,name:'Fixo'},
  event:{...base.event,sourcePayload:{...base.event.sourcePayload as Record<string,unknown>,category:'Fixo'}},
}),'FIXED_CATEGORY_STATUS_REQUIRES_REVIEW');
blocked('credit method regardless of label',scenario({
  paymentMethod:{...base.paymentMethod!,type:'credit'},
}),'CREDIT_METHOD_REQUIRES_CARD_AUTHORITY');
blocked('planned income changes status',scenario({
  category:{...base.category!,type:'income'},
}, {type:'income',signedAmount:22.35,status:'planned'}),'CANONICAL_STATUS_WOULD_CHANGE');
blocked('no legacy payload',scenario({}, {sourcePayload:null}),'CATEGORY_SCOPE_OR_LABEL_MISMATCH');

console.log('MEG_STAGE10_HISTORICAL_MAPPING_FAIL_CLOSED_TEST_MATRIX PASS');
