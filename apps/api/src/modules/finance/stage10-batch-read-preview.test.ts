import assert from 'node:assert/strict';
import {previewStage10BatchCardCycle,type Stage10BatchPreviewItem} from './stage10-batch-read-preview';

const card={id:'card-a',active:true,closingDay:25,dueDay:5};
const dest={id:'card-b',active:true,closingDay:10,dueDay:14};
const purchase={purchaseDate:'2026-11-26',totalAmount:100.01,installments:3,status:'active',card,
 entries:[1,2,3].map(number=>({number,status:'open',partialPaidAmount:0}))};
const item:Stage10BatchPreviewItem={id:'purchase-a',source:'card-purchase',
 verifiedSource:true,verifiedVersion:'v1',purchase};
const request={kind:'card-cycle' as const,destinationCard:dest,purchaseDate:'2026-11-09'};
const result=previewStage10BatchCardCycle([item],request);
assert.equal(result.previewableCount,1);
assert.equal(result.blockedCount,0);
assert.equal(result.writeAuthorized,false);
const row=result.rows[0];
assert.equal(row.previewAvailable,true);
assert.equal(row.writeAuthorized,false);
assert.deepEqual(row.before?.map(x=>x.amount),[33.34,33.34,33.33],'Centavos preservados pelo domínio');
assert.deepEqual(row.before?.map(x=>x.statementMonth),['2026-12','2027-01','2027-02']);
assert.deepEqual(row.after?.map(x=>x.statementMonth),['2026-11','2026-12','2027-01']);
assert.deepEqual(row.after?.map(x=>x.dueDate),['2026-11-16','2026-12-14','2027-01-14']);
assert.equal(row.after?.reduce((sum,x)=>sum+Math.round(x.amount*100),0),10001);

const paid={...item,id:'purchase-paid',purchase:{...purchase,
 entries:[{number:1,status:'paid',partialPaidAmount:0},...purchase.entries.slice(1)]}};
const partial={...item,id:'purchase-partial',purchase:{...purchase,
 entries:[{number:1,status:'open',partialPaidAmount:0.01},...purchase.entries.slice(1)]}};
const benefit:Stage10BatchPreviewItem={id:'meal',source:'benefit',verifiedSource:true,verifiedVersion:'v1'};
const unverified={...item,id:'unverified',verifiedSource:false};
const unknown={...item,id:'ambiguous',source:'financial-event' as const};
const mixed=previewStage10BatchCardCycle([item,paid,partial,benefit,unverified,unknown],request);
assert.equal(mixed.previewableCount,1);
assert.equal(mixed.blockedCount,5);
assert.ok(mixed.rows[1].blockers.includes('INSTALLMENT_PAYMENT_EXISTS'));
assert.ok(mixed.rows[2].blockers.includes('INSTALLMENT_PAYMENT_EXISTS'));
assert.ok(mixed.rows[3].blockers.includes('BENEFIT_REQUIRES_OWN_WRITER'));
assert.ok(mixed.rows[4].blockers.includes('SOURCE_NOT_VERIFIED'));
assert.ok(mixed.rows[5].blockers.includes('UNSUPPORTED_SOURCE'));
assert.equal(mixed.rows[3].after,null);
assert.equal(mixed.writeAuthorized,false);

const invalid=previewStage10BatchCardCycle([item],{...request,purchaseDate:'2026-02-30'});
assert.ok(invalid.rows[0].blockers.includes('INVALID_CARD_CYCLE_INPUT'));
assert.equal(invalid.rows[0].after,null);
const noVersion=previewStage10BatchCardCycle([{...item,verifiedVersion:null}],request);
assert.ok(noVersion.rows[0].blockers.includes('VERSION_NOT_VERIFIED'));
const wrongCard=previewStage10BatchCardCycle([item],{...request,destinationCard:{...dest,active:false}});
assert.ok(wrongCard.rows[0].blockers.includes('CARD_INACTIVE'));
// O snapshot de entrada é propriedade do chamador: projeção é pura, não o modifica.
assert.equal(purchase.purchaseDate,'2026-11-26');
assert.equal(purchase.entries[0].status,'open');
console.log('MEG_STAGE10_BATCH_READ_PREVIEW PASS');
