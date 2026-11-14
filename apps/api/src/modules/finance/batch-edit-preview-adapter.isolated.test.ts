import assert from 'node:assert/strict';
import {Prisma,UserRole,UserStatus,prisma} from '@meg/database';
import {previewBatchCardCycleForActor,BatchPreviewAccessError} from './batch-edit-preview-adapter';

/**
 * Nenhuma fixture real: somente runner PostgreSQL 17 descartável.
 * Bloqueio obrigatório antes de qualquer acesso ao banco.
 */
const url=new URL(process.env.DATABASE_URL||'http://invalid');
if(process.env.MEG_STAGE10_ISOLATED_PG!=='1'
 || !['localhost','127.0.0.1'].includes(url.hostname)
 || url.pathname!=='/meg_stage10_sandbox'){
 throw new Error('ISOLATED_POSTGRES_ONLY');
}
async function main(){
 const stamp='stage10-preview-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const makeUser=async (label:string,role:UserRole)=>prisma.user.create({data:{
  name:label,email:stamp+'-'+label.toLowerCase()+'@meg.test',
  passwordHash:'CI-ISOLATED-ONLY',role,status:UserStatus.ACTIVE,isActive:true,
  approvedAt:new Date('2026-11-14T00:00:00Z'),
 }});
 const [owner,viewer,outsider,other]=await Promise.all([
  makeUser('OWNER',UserRole.ADMIN),makeUser('VIEWER',UserRole.VIEWER),
  makeUser('OUTSIDER',UserRole.VIEWER),makeUser('FOREIGN',UserRole.ADMIN),
 ]);
 const workspace=await prisma.workspace.create({data:{
  name:'Stage10 Read Only',slug:stamp,ownerId:owner.id,
  members:{create:{userId:owner.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}},
 }});
 await prisma.workspaceMember.create({data:{
  workspaceId:workspace.id,userId:viewer.id,role:UserRole.VIEWER,
  status:UserStatus.ACTIVE,isActive:true,
 }});
 const foreign=await prisma.workspace.create({data:{
  name:'Other Workspace',slug:stamp+'-foreign',ownerId:other.id,
  members:{create:{userId:other.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}},
 }});
 assert.notEqual(workspace.id,foreign.id);
 const origin=await prisma.creditCard.create({data:{
  userId:owner.id,name:'Original',closingDay:25,dueDay:5,
  creditLimit:new Prisma.Decimal('1000.00'),isActive:true,
 }});
 const destination=await prisma.creditCard.create({data:{
  userId:owner.id,name:'Destino',closingDay:20,dueDay:10,
  creditLimit:new Prisma.Decimal('1000.00'),isActive:true,
 }});
 const forbiddenCard=await prisma.creditCard.create({data:{
  userId:other.id,name:'Outro cliente',closingDay:15,dueDay:20,
  creditLimit:new Prisma.Decimal('1000.00'),isActive:true,
 }});
 const purchase=await prisma.cardPurchase.create({data:{
  userId:owner.id,cardId:origin.id,description:'Compra teste somente leitura',
  purchaseDate:new Date('2026-11-14T12:00:00Z'),
  totalAmount:new Prisma.Decimal('100.00'),installments:3,status:'active',
  entries:{create:[
   {number:1,amount:new Prisma.Decimal('33.34'),statementMonth:'2026-11'},
   {number:2,amount:new Prisma.Decimal('33.33'),statementMonth:'2026-12'},
   {number:3,amount:new Prisma.Decimal('33.33'),statementMonth:'2027-01'},
  ]},
 }});
 const input={items:[{source:'card-purchase' as const,id:purchase.id,
  expectedUpdatedAt:purchase.updatedAt.toISOString()}],
  changes:{cardId:destination.id,purchaseDateMode:'common' as const,commonPurchaseDate:'2026-11-25'},
 };
 const original=await prisma.cardPurchase.findUniqueOrThrow({where:{id:purchase.id},
  include:{entries:{orderBy:{number:'asc'}}}});
 const beforeReceipts=await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id}});
 const beforeAudits=await prisma.auditLog.count({where:{userId:owner.id}});
 const preview=await previewBatchCardCycleForActor(owner.id,input);
 assert.equal(preview.canWrite,false);
 assert.equal(preview.candidates,1);
 assert.equal(preview.rows[0].status,'candidate');
 assert.equal(preview.rows[0].before?.entries[0].dueDate,'2026-12-07');
 assert.deepEqual(preview.rows[0].after?.entries.map(e=>e.statementMonth),
  ['2026-12','2027-01','2027-02']);
 assert.equal(preview.rows[0].after?.entries[0].dueDate,'2027-01-11');
 assert.deepEqual(preview.rows[0].after?.entries.map(e=>e.amount),['33.34','33.33','33.33']);
 // VIEWER habilitado pode consultar somente o workspace compartilhado.
 assert.deepEqual(await previewBatchCardCycleForActor(viewer.id,input),preview);
 // O leitor devolve bloqueios genéricos para IDs que não pertencem ao escopo.
 const unknown=await previewBatchCardCycleForActor(owner.id,{...input,items:[
  {...input.items[0],id:'foreign-opaque-id'},
 ]});
 assert.equal(unknown.blocked,1);
 assert.equal(unknown.rows[0].reason,'PURCHASE_NOT_IN_WORKSPACE');
 const noCard=await previewBatchCardCycleForActor(owner.id,{
  ...input,changes:{...input.changes,cardId:forbiddenCard.id},
 });
 assert.equal(noCard.rows[0].reason,'CARD_NOT_ACTIVE_OR_NOT_OWNED');
 const mixed=await previewBatchCardCycleForActor(viewer.id,{...input,items:[
  ...input.items,{source:'benefit',id:'benefit-no-read',expectedUpdatedAt:'none'},
  {source:'payable',id:'payable-no-read',expectedUpdatedAt:'none'},
 ]});
 assert.equal(mixed.total,3);assert.equal(mixed.candidates,1);assert.equal(mixed.blocked,2);
 assert.deepEqual(mixed.rows.slice(1).map(r=>r.reason),[
  'BENEFIT_REQUIRES_EXCLUSIVE_WRITER','PAYABLE_DUE_DATE_REQUIRES_SOURCE_CONTRACT',
 ]);
 const stale=await previewBatchCardCycleForActor(owner.id,{...input,items:[
  {...input.items[0],expectedUpdatedAt:'2026-01-01T00:00:00.000Z'},
 ]});
 assert.equal(stale.rows[0].reason,'STALE_VERSION');
 const active=await prisma.cardInstallment.findFirstOrThrow({
  where:{purchaseId:purchase.id,number:1},
 });
 await prisma.cardInstallment.update({where:{id:active.id},data:{
  partialPaidAmount:new Prisma.Decimal('1.00'),
 }});
 const paid=await previewBatchCardCycleForActor(owner.id,input);
 assert.equal(paid.rows[0].reason,'CARD_PURCHASE_PAYMENT_EXISTS');
 await prisma.cardInstallment.update({where:{id:active.id},data:{
  partialPaidAmount:new Prisma.Decimal('0'),
 }});
 // Ator fora do workspace e membro revogado não podem acessar ou descobrir dados.
 await assert.rejects(()=>previewBatchCardCycleForActor(outsider.id,input),
  (e:unknown)=>e instanceof BatchPreviewAccessError&&e.code==='BATCH_PREVIEW_ACCESS_DENIED');
 await prisma.workspaceMember.update({where:{workspaceId_userId:{
  workspaceId:workspace.id,userId:viewer.id,
 }},data:{isActive:false}});
 await assert.rejects(()=>previewBatchCardCycleForActor(viewer.id,input),
  (e:unknown)=>e instanceof BatchPreviewAccessError&&e.code==='BATCH_PREVIEW_ACCESS_DENIED');
 await prisma.user.update({where:{id:owner.id},data:{status:UserStatus.BLOCKED}});
 await assert.rejects(()=>previewBatchCardCycleForActor(owner.id,input),
  (e:unknown)=>e instanceof BatchPreviewAccessError&&e.code==='BATCH_PREVIEW_ACCESS_DENIED');
 await assert.rejects(()=>previewBatchCardCycleForActor('',input),
  (e:unknown)=>e instanceof BatchPreviewAccessError&&e.code==='BATCH_PREVIEW_ACCESS_DENIED');
 await assert.rejects(()=>previewBatchCardCycleForActor(other.id,{...input,items:[]}),
  (e:unknown)=>e instanceof BatchPreviewAccessError&&e.code==='BATCH_PREVIEW_INVALID_SELECTION');
 // Invariantes de ZERO write financeiro durante todas as consultas do adaptador.
 const after=await prisma.cardPurchase.findUniqueOrThrow({where:{id:purchase.id},
  include:{entries:{orderBy:{number:'asc'}}}});
 assert.equal(after.updatedAt.toISOString(),original.updatedAt.toISOString());
 assert.equal(after.cardId,original.cardId);
 assert.equal(after.purchaseDate.toISOString(),original.purchaseDate.toISOString());
 assert.deepEqual(after.entries.map(e=>[e.id,e.number,e.amount.toString(),e.statementMonth]),
  original.entries.map(e=>[e.id,e.number,e.amount.toString(),e.statementMonth]));
 assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id}}),beforeReceipts);
 assert.equal(await prisma.auditLog.count({where:{userId:owner.id}}),beforeAudits);
 console.log('MEG_STAGE10_AUTHENTICATED_BATCH_READ_ADAPTER_POSTGRES PASS');
}
main().catch(error=>{console.error('MEG_STAGE10_AUTHENTICATED_BATCH_READ_ADAPTER FAIL',error);process.exitCode=1;})
 .finally(async()=>{await prisma.$disconnect();});
