import assert from 'node:assert/strict';
import {cardPurchaseInstallmentRows,cardPurchaseStatementMonth,cardPurchaseCyclePreview} from '../cards/purchase-cycle-canonical';
import {previewBatchCardCycle,type BatchPreviewInput} from './batch-edit-preview-read';

const receipt={id:'purchase-01',userId:'owner-1',cardId:'card-a',purchaseDate:'2026-11-14',status:'active',
 updatedAt:'2026-11-14T12:00:00.000Z',
 entries:[
  {id:'entry-1',number:1,amount:'33.34',statementMonth:'2026-11',status:'open',partialPaidAmount:'0'},
  {id:'entry-2',number:2,amount:'33.33',statementMonth:'2026-12',status:'open',partialPaidAmount:'0'},
  {id:'entry-3',number:3,amount:'33.33',statementMonth:'2027-01',status:'open',partialPaidAmount:'0'},
 ]} as const;
const base:BatchPreviewInput={
 dataOwnerId:'owner-1',
 items:[{source:'card-purchase',id:'purchase-01',expectedUpdatedAt:receipt.updatedAt}],
 changes:{cardId:'card-b',purchaseDateMode:'common',commonPurchaseDate:'2026-11-25'},
 snapshots:{cards:[
  {id:'card-a',userId:'owner-1',closingDay:25,dueDay:5,isActive:true},
  {id:'card-b',userId:'owner-1',closingDay:20,dueDay:10,isActive:true},
  {id:'benefit-prepaid',userId:'owner-1',closingDay:25,dueDay:5,isActive:false},
 ],purchases:[receipt]},
};
const source=structuredClone(base);
const answer=previewBatchCardCycle(base);
assert.deepEqual(base,source,'read only não deve mutar snapshots');
assert.deepEqual(answer,previewBatchCardCycle(base),'prévia determinística/idempotente, sem recibos escritos');
assert.equal(answer.kind,'stage10-card-purchase-cycle-readonly-v1');
assert.equal(answer.canWrite,false);
assert.equal(answer.candidates,1);
assert.equal(answer.blocked,0);
const row=answer.rows[0];
assert.equal(row.canWrite,false);
assert.equal(row.status,'candidate');
assert.equal(row.before?.entries[0].statementMonth,'2026-11');
assert.equal(row.before?.entries[0].dueDate,'2026-12-07','vencimento do cartão original ajustado para dia útil');
assert.deepEqual(row.after?.entries.map(e=>e.statementMonth),['2026-12','2027-01','2027-02']);
assert.deepEqual(row.after?.entries.map(e=>e.amount),['33.34','33.33','33.33'],'valores e IDs de parcelas imutáveis na prévia');
assert.deepEqual(row.after?.entries.map(e=>e.id),['entry-1','entry-2','entry-3']);
assert.equal(row.after?.entries[0].dueDate,'2027-01-11','fatura de dezembro vence em janeiro, com ajuste de domingo');

const beforeOrOnClosing=['2026-11-24','2026-11-25'].map(d=>cardPurchaseStatementMonth(d,25,1));
assert.deepEqual(beforeOrOnClosing,['2026-11','2026-11']);
assert.equal(cardPurchaseStatementMonth('2026-11-26',25,1),'2026-12');
assert.equal(cardPurchaseStatementMonth('2026-12-26',25,2),'2027-02');
assert.equal(cardPurchaseStatementMonth('2028-02-29',28,1),'2028-03','ano bissexto e dia após fechamento');
assert.equal(cardPurchaseStatementMonth('2026-01-31',31,1),'2026-01','fechamento dia 31 inclui compra do próprio dia');

const schedule=cardPurchaseInstallmentRows({purchaseDate:'2026-11-26',totalAmount:100,installments:3,closingDay:25});
assert.deepEqual(schedule.map(x=>x.statementMonth),['2026-12','2027-01','2027-02']);
assert.deepEqual(schedule.map(x=>x.amount),[33.34,33.33,33.33]);
assert.equal(schedule.reduce((sum,x)=>sum+Math.round(x.amount*100),0),10000);
const projected=cardPurchaseCyclePreview({purchaseDate:'2026-11-26',totalAmount:100,installments:3,closingDay:25,dueDay:5});
assert.equal(projected[0].dueDate,'2027-01-05');

const preserve=previewBatchCardCycle({...base,changes:{cardId:'card-b',purchaseDateMode:'preserve'}});
assert.equal(preserve.rows[0].after?.purchaseDate,'2026-11-14');
assert.equal(preserve.rows[0].after?.entries[0].statementMonth,'2026-11');
function reason(override:Partial<BatchPreviewInput>,expected:string){
 const result=previewBatchCardCycle({...base,...override});
 assert.equal(result.rows[0].status,'blocked');assert.equal(result.rows[0].reason,expected);
 assert.equal(result.rows[0].canWrite,false);assert.equal(result.rows[0].after,undefined);
}
reason({items:[{source:'benefit',id:'benefit-1',expectedUpdatedAt:'x'}]},'BENEFIT_REQUIRES_EXCLUSIVE_WRITER');
reason({items:[{source:'payable',id:'payable-1',expectedUpdatedAt:'x'}]},'PAYABLE_DUE_DATE_REQUIRES_SOURCE_CONTRACT');
reason({items:[{source:'financial-event',id:'event-1',expectedUpdatedAt:'x'}]},'EVENT_CARD_CONVERSION_REQUIRES_DOMAIN_CONTRACT');
reason({items:[{source:'card-purchase',id:'purchase-01',expectedUpdatedAt:'old'}]},'STALE_VERSION');
reason({changes:{purchaseDateMode:'preserve'}},'NO_CHANGE');
reason({changes:{cardId:'benefit-prepaid',purchaseDateMode:'preserve'}},'CARD_NOT_ACTIVE_OR_NOT_OWNED');
reason({changes:{cardId:'foreign',purchaseDateMode:'preserve'}},'CARD_NOT_ACTIVE_OR_NOT_OWNED');
reason({changes:{cardId:'card-b',purchaseDateMode:'common',commonPurchaseDate:'2026-02-30'}},'INVALID_PURCHASE_DATE');
reason({changes:{purchaseDateMode:'preserve',installments:2}},'INSTALLMENT_COUNT_EDIT_NOT_SUPPORTED');
reason({snapshots:{...base.snapshots,purchases:[{...receipt,entries:[{...receipt.entries[0],partialPaidAmount:'1.00'}]}]}},'CARD_PURCHASE_PAYMENT_EXISTS');
reason({snapshots:{...base.snapshots,purchases:[{...receipt,status:'cancelled'}]}},'PURCHASE_NOT_ACTIVE');
reason({snapshots:{...base.snapshots,purchases:[{...receipt,userId:'other'}]}},'PURCHASE_NOT_IN_WORKSPACE');
reason({snapshots:{...base.snapshots,purchases:[{...receipt,entries:[]}]}},'INCOMPLETE_INSTALLMENT_SNAPSHOT');
assert.throws(()=>previewBatchCardCycle({...base,items:[]}),/INVALID_BATCH_SIZE/);
assert.throws(()=>previewBatchCardCycle({...base,items:[base.items[0],base.items[0]]}),/DUPLICATE_ITEMS/);
console.log('MEG_STAGE10_CARD_BATCH_READONLY_PREVIEW PASS');
