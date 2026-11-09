/**
 * Caracterização preparatória Etapa 10: NÃO muda writers nem faz IO no banco.
 * Cada asserção executável usa a autoridade financeira atual da API.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 buildCanonicalCardStatement,cardStatementDueDate,cardInstallmentRemaining,
 canonicalCardStatementTotals,
} from '../apps/api/src/modules/finance/card-statement-canonical';
import {resolveCanonicalFinancialStatus,countsTowardMonetaryBalance,
 isBenefitFinancialEvent,paymentBalanceDecision} from '../apps/api/src/modules/finance/financial-policy';

const cards=readFileSync(new URL('../apps/api/src/modules/cards/routes.ts',import.meta.url),'utf8');
const service=readFileSync(new URL('../apps/api/src/modules/cards/service.ts',import.meta.url),'utf8');
const bulk=readFileSync(new URL('../apps/api/src/modules/finance/event-bulk-mutation.ts',import.meta.url),'utf8');
const bulkRoutes=readFileSync(new URL('../apps/api/src/modules/finance/event-bulk-routes.ts',import.meta.url),'utf8');
const purchase=cards.split("app.patch('/purchases/:id'")[1]?.split("app.patch('/installments/:id'")[0]||'';
const installment=cards.split("app.patch('/installments/:id'")[1]?.split("app.delete('/purchases/:id'")[0]||'';
assert.ok(purchase&&installment,'Escritores formais de compra e parcela precisam existir');

// Calendário de fatura: mês seguinte quando dueDay <= closingDay;
// usa último dia do mês e ajusta sábado/domingo para segunda.
for(const [month,close,due,expected] of [
 ['2026-09',28,3,'2026-10-05'],   // sábado vira segunda
 ['2026-09',28,4,'2026-10-05'],   // domingo vira segunda
 ['2026-09',28,5,'2026-10-05'],   // segunda permanece
 ['2026-01',28,31,'2026-02-02'], // vencimento 31/01 em sábado vai para 02/02
 ['2026-01',31,31,'2026-03-02'], // vencimento no mês seguinte, fevereiro comum (sábado)\n ['2028-01',31,31,'2028-02-29'], // vencimento no mês seguinte, fevereiro bissexto
 ['2026-12',28,3,'2027-01-04'],  // virada de ano, domingo vira segunda
 ['2026-11',15,30,'2026-11-30'], // vencimento na mesma competência
] as const){
 assert.equal(cardStatementDueDate(month,close,due),expected,`Fatura ${month} fechamento ${close} vencimento ${due}`);
}
// Compra no dia do fechamento não salta fatura; no dia seguinte salta.
assert.match(service,/purchaseDate\.getUTCDate\(\) > card\.closingDay \? 1 : 0/);
assert.match(purchase,/purchaseDate\.getUTCDate\(\) > card\.closingDay \? 1 : 0/);
// Reatribuir cartão formal recalcula competências; não destrói IDs de parcelas.
assert.match(purchase,/targetCardId !== before\.cardId/);
assert.match(purchase,/shouldRecalculateStatementMonths/);
assert.match(purchase,/preservedInstallmentIds/);
assert.match(cards,/CARD_PURCHASE_PAYMENT_EXISTS/);
assert.match(cards,/entry\.status === 'paid' \|\| Number\(entry\.partialPaidAmount \|\| 0\) > 0/);
// Edição unitária de parcela só permite parcela aberta sem pagamento parcial.
assert.match(installment,/CARD_INSTALLMENT_ALREADY_PAID/);
assert.match(installment,/CARD_INSTALLMENT_PARTIALLY_PAID/);
assert.match(installment,/singleInstallmentEdit:\s*true/);
assert.match(installment,/reconciledPurchaseTotal/);

// Fatura combina parcelas formais e eventos legados, sem duplicar purchaseId.
const statement=buildCanonicalCardStatement({
 month:'2026-11',closingDay:10,dueDay:20,aliases:['LATAM PASS','CARTÃO LATAM PASS'],
 purchases:[{id:'p1',description:'Compra parcelada',purchaseDate:'2026-10-09',installments:3,status:'active',
  entries:[
   {id:'p1-1',number:1,amount:33.34,partialPaidAmount:10,statementMonth:'2026-10',status:'open'},
   {id:'p1-2',number:2,amount:33.33,partialPaidAmount:0,statementMonth:'2026-11',status:'open'},
   {id:'p1-3',number:3,amount:33.33,partialPaidAmount:0,statementMonth:'2026-12',status:'open'},
  ]}],
 events:[
  {id:'shadow',description:'Cópia sincronizada',type:'expense',status:'planned',date:'2026-11-20',signedAmount:-33.33,
   sourcePayload:{paymentMethod:'CARTÃO LATAM PASS',modality:'CREDITO',purchaseId:'p1',date:'2026-11-20'}},
  {id:'legacy',description:'Compra histórica 4/5',type:'expense',status:'planned',date:'2026-11-20',signedAmount:-70,
   sourcePayload:{paymentMethod:'LATAM PASS',modality:'CREDITO',date:'2026-11-20'}},
  {id:'different',description:'Outra operadora',type:'expense',status:'planned',date:'2026-11-20',signedAmount:-200,
   sourcePayload:{paymentMethod:'RIACHUELO',modality:'CREDITO',date:'2026-11-20'}},
 ]
});
assert.equal(statement.lines.length,2);
assert.deepEqual(statement.lines.map(l=>l.source).sort(),['card-installment','financial-event']);
assert.equal(statement.charges,103.33);
assert.equal(statement.payableAmount,103.33);
assert.equal(statement.lines.find(l=>l.eventId==='legacy')?.installmentNo,4);
assert.equal(statement.lines.find(l=>l.eventId==='legacy')?.installmentQty,5);
const paid=buildCanonicalCardStatement({month:'2026-11',closingDay:10,dueDay:20,aliases:['LATAM PASS'],events:[],purchases:[
 {id:'p2',description:'Pago',purchaseDate:'2026-10-01',installments:1,status:'active',
  entries:[{id:'p2-1',number:1,amount:100,partialPaidAmount:100,statementMonth:'2026-11',status:'paid'}]},
]});
assert.equal(paid.netAmount,100);
assert.equal(paid.payableAmount,0);
assert.equal(paid.status,'paid');
assert.equal(cardInstallmentRemaining({amount:100,partialPaidAmount:20,status:'open'}),80);
assert.equal(cardInstallmentRemaining({amount:100,partialPaidAmount:20,status:'paid'}),0);
const refund=canonicalCardStatementTotals([
 {id:'credit',source:'financial-event',description:'Estorno',effect:-50,kind:'credit',
  purchaseDate:'2026-11-01',dueDate:'2026-11-20',statementMonth:'2026-11',
  installmentNo:1,installmentQty:1,isOpen:true,sourceStatus:'planned'}
]);
assert.equal(refund.payableAmount,0);
assert.equal(refund.creditBalance,50);

// Novo lançamento: status canônico, benefício fora do saldo monetário.
assert.equal(resolveCanonicalFinancialStatus({type:'income',requestedStatus:'planned'}),'paid');
assert.equal(resolveCanonicalFinancialStatus({type:'expense',requestedStatus:'paid',paymentMethod:{type:'credit'}}),'planned');
assert.equal(resolveCanonicalFinancialStatus({type:'expense',requestedStatus:'planned',category:{group:'FIXO'}}),'paid');
assert.equal(isBenefitFinancialEvent({account:{type:'benefit'},paymentMethod:{name:'Verocard'}}),true);
assert.equal(countsTowardMonetaryBalance({type:'expense',status:'paid',account:{type:'benefit'}}),false);
assert.deepEqual(paymentBalanceDecision(10,10.01),{allowed:false,available:10,requested:10.01,missing:0.01});

// Eventos legados e compra formal não podem ser tratados como um mesmo writer.
// O bulk genérico não possui cardId/statementMonth como campos de entidade formal.
assert.match(bulkRoutes,/\/events\/bulk\/update/);
assert.match(bulkRoutes,/max\(200\)/);
assert.match(bulk,/serializableFinancialTransaction/);
assert.match(bulk,/assertExpectedEventVersions/);
assert.match(bulk,/FINANCIAL_EVENT_LINKED_DOMAIN/);
assert.doesNotMatch(bulkRoutes.split('const updateSchema')[1]?.split('const archiveSchema')[0]||'',/cardId:\s*z\./);
assert.doesNotMatch(bulkRoutes.split('const updateSchema')[1]?.split('const archiveSchema')[0]||'',/statementMonth:\s*z\./);
assert.match(cards,/app\.patch\('\/installments\/:id'/);
assert.match(cards,/app\.patch\('\/purchases\/:id'/);
console.log('Etapa 09: caracterização preparatória cartão/parcelas/legado/status — OK. Sem writers executados.');
