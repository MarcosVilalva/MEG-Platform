import assert from 'node:assert/strict';
import {prisma,UserRole,UserStatus} from '@meg/database';
import {createFinancialEventProtected} from './event-mutation';
import {updateFinancialEventsBulkProtected} from './event-bulk-mutation';
import {createBenefitEventProtected,updateBenefitEventProtected} from './benefit-event-mutation';

/** Caracterizacao, sem corrigir regras. POSTGRES 17 efemero do CI somente. */
const db=process.env.DATABASE_URL??'';
if(process.env.MEG_STAGE10_SYNTHETIC_DB!=='true'||
 !/^postgresql:\/\/meg_test:meg_test@127\.0\.0\.1:5439\/meg_stage10_test(?:\?|$)/.test(db))
 throw new Error('STAGE10_SYNTHETIC_DATABASE_REQUIRED');
const tag='stage10-money-precision-'+process.pid;
const user=await prisma.user.create({data:{
 name:'Synthetic monetary precision',email:tag+'@example.invalid',
 role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,
}});
const workspace=await prisma.workspace.create({data:{
 name:'Synthetic precision workspace',slug:tag,ownerId:user.id,
}});
await prisma.workspaceMember.create({data:{
 userId:user.id,workspaceId:workspace.id,role:UserRole.ADMIN,
 status:UserStatus.ACTIVE,isActive:true,
}});
await prisma.appState.create({data:{
 userId:user.id,workspaceId:workspace.id,state:{transactions:[]},revision:1,
}});
const bank=await prisma.account.create({data:{
 userId:user.id,name:'Synthetic checking',type:'checking',openingBalance:'1000.00',
}});
const benefit=await prisma.account.create({data:{
 userId:user.id,name:'Synthetic benefit',type:'benefit',openingBalance:'0.00',
}});
const expenseCategory=await prisma.category.create({data:{
 userId:user.id,name:'Synthetic household',type:'expense',
}});
const benefitCategory=await prisma.category.create({data:{
 userId:user.id,name:'Alimentação',type:'expense',group:'Benefícios',
}});
const incomeCategory=await prisma.category.create({data:{
 userId:user.id,name:'Synthetic recharges',type:'income',
}});
const pix=await prisma.paymentMethod.create({data:{
 userId:user.id,name:'PIX',type:'instant',
}});
const verocard=await prisma.paymentMethod.create({data:{
 userId:user.id,name:'Verocard',type:'benefit',
}});
try{
 const ordinary=await createFinancialEventProtected(user.id,{
  type:'expense',status:'paid',description:'Synthetic money precision 12549',
  amount:125.49,date:'2026-11-15',accountId:bank.id,
  categoryId:expenseCategory.id,paymentMethodId:pix.id,
  operationId:tag+'-money',
 });
 assert.ok(ordinary && typeof ordinary==='object' &&
  'id' in ordinary && typeof ordinary.id==='string',
  'Canonic writer must return a persisted event identifier');
 const money=await prisma.financialEvent.findUniqueOrThrow({
  where:{id:ordinary.id},include:{ledgerEntries:true},
 });
 assert.equal(money.amount.toString(),'125.49','Amount must persist exact cents');
 assert.equal(money.signedAmount.toString(),'-125.49','Signed amount exact cents');
 assert.equal(money.ledgerEntries.length,1);
 assert.equal(money.ledgerEntries[0].credit.toString(),'125.49','Ledger exact credit');
 assert.equal(money.ledgerEntries[0].debit.toString(),'0');
 const bulk=await updateFinancialEventsBulkProtected(user.id,{
  ids:[money.id],changes:{amount:99.99},
  expectedUpdatedAtById:{[money.id]:money.updatedAt.toISOString()},
  operationId:tag+'-money-edit',
 });
 assert.ok(bulk && typeof bulk==='object' && 'updated' in bulk,
  'Bulk writer must return an updated count');
 assert.equal(bulk.updated,1);
 const editedMoney=await prisma.financialEvent.findUniqueOrThrow({
  where:{id:money.id},include:{ledgerEntries:true},
 });
 assert.equal(editedMoney.amount.toString(),'99.99','Bulk monetary edit exact cents');
 assert.equal(editedMoney.signedAmount.toString(),'-99.99');
 assert.equal(editedMoney.ledgerEntries[0].credit.toString(),'99.99','Ledger rebuilt with exact cents');

 const recharge=await createBenefitEventProtected(user.id,{
  type:'income',date:'2026-11-15',description:'Synthetic benefit recharge',
  amount:99.99,accountId:benefit.id,categoryId:incomeCategory.id,
  paymentMethodId:verocard.id,operationId:tag+'-recharge',
 });
 const rechargeDb=await prisma.financialEvent.findUniqueOrThrow({
  where:{id:recharge.id},include:{ledgerEntries:true},
 });
 assert.equal(rechargeDb.amount.toString(),'99.99','Benefit recharge exact cents');
 assert.equal(rechargeDb.signedAmount.toString(),'99.99','Benefit signed recharge exact cents');
 assert.equal(rechargeDb.ledgerEntries[0].debit.toString(),'99.99');

 const consumption=await createBenefitEventProtected(user.id,{
  type:'expense',date:'2026-11-15',description:'Synthetic benefit consumption',
  amount:55.55,accountId:benefit.id,categoryId:benefitCategory.id,
  paymentMethodId:verocard.id,operationId:tag+'-consumption',
 });
 const consumptionDb=await prisma.financialEvent.findUniqueOrThrow({
  where:{id:consumption.id},include:{ledgerEntries:true},
 });
 assert.equal(consumptionDb.amount.toString(),'55.55','Benefit expense exact cents');
 assert.equal(consumptionDb.signedAmount.toString(),'-55.55');
 assert.equal(consumptionDb.ledgerEntries[0].credit.toString(),'55.55');
 const updatedBenefit=await updateBenefitEventProtected(user.id,consumption.id,{
  type:'expense',date:'2026-11-15',description:'Synthetic benefit consumption edited',
  amount:49.99,accountId:benefit.id,categoryId:benefitCategory.id,
  paymentMethodId:verocard.id,operationId:tag+'-consumption-edit',
  expectedUpdatedAt:consumptionDb.updatedAt.toISOString(),
 });
 assert.equal(updatedBenefit.id,consumption.id);
 const updatedBenefitDb=await prisma.financialEvent.findUniqueOrThrow({
  where:{id:consumption.id},include:{ledgerEntries:true},
 });
 assert.equal(updatedBenefitDb.amount.toString(),'49.99','Benefit update exact cents');
 assert.equal(updatedBenefitDb.signedAmount.toString(),'-49.99');
 assert.equal(updatedBenefitDb.ledgerEntries.length,1);
 assert.equal(updatedBenefitDb.ledgerEntries[0].credit.toString(),'49.99');
 console.log('STAGE10_MONEY_BENEFIT_PRECISION_PG17_EXACT_CENTS PASS');
 console.log('STAGE10_MONETARY_BULK_BENEFIT_EDIT_PRECISION_PG17 PASS');
}finally{
 await prisma.$disconnect();
}
