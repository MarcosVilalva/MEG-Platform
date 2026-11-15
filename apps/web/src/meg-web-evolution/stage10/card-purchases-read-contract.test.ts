import assert from 'node:assert/strict';
import {validateStage10CardPurchasesRead,assertStage10CardPurchasesNotMergedWithEvents} from './card-purchases-read-contract';
const expectation={actorId:'user',workspaceId:'workspace',month:'2026-11'};
const p={id:'p1',cardId:'c1',categoryId:null,description:'Compra',
 totalAmount:'100.00',purchaseDate:'2026-11-14T12:00:00.000Z',installments:3,
 status:'active',createdAt:'2026-11-14T12:00:00.000Z',updatedAt:'2026-11-14T12:00:00.000Z',
 entries:[{id:'i1',number:1,amount:'33.34',partialPaidAmount:'0',
  statementMonth:'2026-12',status:'open',paidAt:null},
 {id:'i2',number:2,amount:'33.33',partialPaidAmount:'0',
  statementMonth:'2027-01',status:'open',paidAt:null},
 {id:'i3',number:3,amount:'33.33',partialPaidAmount:'0',
  statementMonth:'2027-02',status:'open',paidAt:null}]};
const ok={kind:'stage10-card-purchase-history-v1',canWrite:false,
 source:'canonical-card-purchases',actorId:'user',workspaceId:'workspace',
 dataOwnerId:'owner',month:'2026-11',total:1,purchases:[p]};
assert.equal(validateStage10CardPurchasesRead(ok,expectation).purchases[0].id,'p1');
assert.equal(assertStage10CardPurchasesNotMergedWithEvents(
 validateStage10CardPurchasesRead(ok,expectation),new Set(['financial-event-p1'])),false);
const deny=(edit:(d:any)=>void)=>{
 const d=structuredClone(ok);edit(d);
 assert.throws(()=>validateStage10CardPurchasesRead(d,expectation),
  /STAGE10_CARD_PURCHASE_READ_INVALID/);
};
deny(d=>{d.canWrite=true;});
deny(d=>{d.actorId='other';});
deny(d=>{d.workspaceId='other';});
deny(d=>{d.month='2026-12';});
deny(d=>{d.total=2;});
deny(d=>{d.purchases[0].status='cancelled';});
deny(d=>{d.purchases[0].id='';});
deny(d=>{d.purchases[0].installments=2;});
deny(d=>{d.purchases[0].entries[1].id='i1';});
deny(d=>{d.purchases[0].entries[1].number=1;});
deny(d=>{d.purchases[0].entries[1].statementMonth='2026-13';});
deny(d=>{d.purchases[0].entries[1].partialPaidAmount=-1;});
deny(d=>{d.purchases[0].entries[1].paidAt='not-a-date';});
deny(d=>{d.purchases.push(structuredClone(p));d.total=2;});
console.log('STAGE10_CARD_PURCHASE_READ_SEPARATE_CANONICAL_IDS PASS');
