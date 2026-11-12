/**
 * Etapa 10 | Caracterização de contratos financeiros EXISTENTES.
 * Não escreve no banco, não modifica regra, não executa endpoints.
 * Registra inclusive lacunas atuais. Não interpretar um contrato estático
 * como autorização para habilitar operações financeiras na interface.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  resolveCanonicalFinancialStatus,
  isBenefitPaymentMethod,
  isBenefitFinancialEvent,
  countsTowardMonetaryBalance,
  paymentBalanceDecision,
} from '../apps/api/src/modules/finance/financial-policy';

const src=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const events=src('apps/api/src/modules/finance/event-mutation.ts');
const eventRoutes=src('apps/api/src/modules/finance/routes.ts');
const eventService=src('apps/api/src/modules/finance/service.ts');
const benefit=src('apps/api/src/modules/finance/benefit-event-mutation.ts');
const benefitRoutes=src('apps/api/src/modules/finance/benefit-event-routes.ts');
const cards=src('apps/api/src/modules/cards/routes.ts');
const cardService=src('apps/api/src/modules/cards/service.ts');
const picker=src('apps/web/src/meg-web-evolution/launches/LaunchTypePicker.tsx');

// Receita/Fixo realizados; crédito tem prioridade sobre Fixo.
// Esta expectativa é da política central, NÃO um cálculo de tela.
assert.equal(resolveCanonicalFinancialStatus({type:'income',requestedStatus:'planned'}),'paid');
assert.equal(resolveCanonicalFinancialStatus({type:'expense',requestedStatus:'planned',category:{name:'Fixo'}}),'paid');
assert.equal(resolveCanonicalFinancialStatus({type:'expense',requestedStatus:'paid',category:{group:'Fixo'},paymentMethod:{type:'CREDIT'}}),'planned');
assert.equal(resolveCanonicalFinancialStatus({type:'expense',requestedStatus:'planned'}),'planned');
assert.deepEqual(paymentBalanceDecision(1,1.01),{allowed:false,available:1,requested:1.01,missing:0.01});

// O método Verocard e a conta tipo BENEFIT não devem tocar saldo monetário.
// O domínio de benefício tem seu PRÓPRIO writer com saldo e versão.
assert.equal(isBenefitPaymentMethod('Verocard'),true);
assert.equal(isBenefitPaymentMethod('Pix'),false);
assert.equal(isBenefitFinancialEvent({account:{type:'benefit'}}),true);
assert.equal(countsTowardMonetaryBalance({type:'expense',status:'paid',account:{type:'benefit'}}),false);
assert.ok(eventRoutes.includes("app.post('/events'"));
assert.ok(eventRoutes.includes('createFinancialEventProtected'));
assert.ok(eventRoutes.includes("app.patch('/events/:id'"));
assert.ok(eventRoutes.includes("app.delete('/events/:id'"));
assert.ok(eventRoutes.includes('authorize([...adminRoles])'));
assert.ok(benefitRoutes.includes("app.post('/benefit-events'"));
assert.ok(benefitRoutes.includes("app.patch('/benefit-events/:eventId'"));
assert.ok(benefit.includes('INSUFFICIENT_BENEFIT_BALANCE'));
assert.ok(benefit.includes('FINANCIAL_EVENT_STALE_VERSION'));
assert.ok(benefit.includes('serializableFinancialTransaction'));

// Criação genérica não recebe transferência/benefício, impede duplicidade,
// protege replay via operationId e decide status pelo domínio.
for(const mark of ['TRANSFER_CONTRACT_NOT_READY','BENEFIT_CONTRACT_REQUIRED',
 'POSSIBLE_DUPLICATE','OPERATION_ID_REUSED','serializableFinancialTransaction',
 'resolveCanonicalFinancialStatus','findRecentFinancialEventDuplicate']){
 assert.ok(events.includes(mark),'Contrato ausente no writer de criação: '+mark);
}

// LACUNAS CARACTERIZADAS, NÃO CORRIGIDAS:
// a criação monetária não chama diretamente a proteção de saldo disponível;
// a edição genérica não é writer serializável com versão/idempotência
// e não resolve novamente status pela política central.
const update=eventService.split('export async function updateFinancialEvent(')[1]
 ?.split('export async function deleteFinancialEvent(')[0]||'';
assert.ok(update.length>500,'Writer genérico de edição não localizado');
assert.equal(events.includes('monetaryAccountBalanceAt('),false);
assert.equal(events.includes('paymentBalanceDecision('),false);
assert.ok(update.includes('prisma.$transaction('));
assert.equal(update.includes('serializableFinancialTransaction('),false);
assert.equal(update.includes('resolveCanonicalFinancialStatus('),false);
assert.equal(update.includes('expectedUpdatedAt'),false);

// Compra formal/parcelas têm domínio próprio; parcelas pagas e parciais
// bloqueiam alteração da compra. Não há lote atômico de compras autorizado.
assert.ok(cards.includes("app.post('/purchases'"));
assert.ok(cards.includes("app.patch('/purchases/:id'"));
assert.ok(cards.includes("app.patch('/installments/:id'"));
assert.ok(cards.includes('CARD_PURCHASE_PAYMENT_EXISTS'));
assert.ok(cards.includes('CARD_INSTALLMENT_PARTIALLY_PAID'));
assert.ok(cardService.includes('createCardPurchaseProtected'));
assert.ok(cards.includes('serializableFinancialTransaction'));

// Seletor visual homologado deve continuar presente, inclusive benefícios
// genéricos, sem ativar transferência/benefício por um writer improvisado.
assert.ok(picker.includes("title: 'Despesa'"));
assert.ok(picker.includes("title: 'Receita'"));
assert.ok(picker.includes("title: 'Transferência'"));
assert.ok(picker.includes("title: 'Benefício'"));
assert.ok(picker.includes("enabled: false"));

console.log('Etapa 10: caracterização de writers/status/cartões/benefício — OK; lacunas mantidas sem mutação.');
