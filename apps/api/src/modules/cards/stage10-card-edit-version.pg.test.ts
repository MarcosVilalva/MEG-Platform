import assert from 'node:assert/strict';
import Fastify,{type FastifyRequest} from 'fastify';
import {prisma,UserRole,UserStatus} from '@meg/database';
import {cardRoutes} from './routes';

/** Integração transacional descartável. Recusa qualquer base não sintética. */
const url=process.env.DATABASE_URL||'';
if(process.env.MEG_STAGE10_SYNTHETIC_DB!=='true'||
 !/^postgresql:\/\/meg_test:meg_test@127\.0\.0\.1:5439\/meg_stage10_test(?:\?|$)/.test(url))
 throw new Error('STAGE10_SYNTHETIC_DATABASE_REQUIRED');
const tag='stage10-card-version-'+process.pid;
const user=await prisma.user.create({data:{
 name:'Stage10 synthetic card concurrency',email:tag+'@example.invalid',
 role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,
}});
const workspace=await prisma.workspace.create({data:{
 name:'Stage10 synthetic card version workspace',slug:tag,ownerId:user.id,
}});
await prisma.workspaceMember.create({data:{
 userId:user.id,workspaceId:workspace.id,role:UserRole.ADMIN,
 status:UserStatus.ACTIVE,isActive:true,
}});
const card=await prisma.creditCard.create({data:{
 userId:user.id,name:'Stage10 card synthetic',
 creditLimit:'3000.00',closingDay:10,dueDay:20,
}});
const purchase=await prisma.cardPurchase.create({data:{
 userId:user.id,cardId:card.id,description:'Original',
 totalAmount:'100.00',purchaseDate:new Date('2026-11-14T12:00:00.000Z'),
 installments:3,updatedAt:new Date('2026-01-01T00:00:00.000Z'),
 entries:{create:[
  {number:1,amount:'33.34',statementMonth:'2026-12'},
  {number:2,amount:'33.33',statementMonth:'2027-01'},
  {number:3,amount:'33.33',statementMonth:'2027-02'},
 ]},
 },include:{entries:true}});
const first=purchase.entries.find(x=>x.number===1);
assert.ok(first);
const app=Fastify({logger:false});
app.decorate('authorize',(_roles:UserRole[])=>
 async(request:FastifyRequest)=>{request.user={sub:user.id,role:UserRole.ADMIN,email:user.email};});
await app.register(cardRoutes,{prefix:'/cards'});
await app.ready();
const patch=(path:string,payload:Record<string,unknown>)=>
 app.inject({method:'PATCH',url:path,
  headers:{'content-type':'application/json'},payload});
try{
 const path='/cards/purchases/'+purchase.id;
 const old=purchase.updatedAt.toISOString();
 const stale=await patch(path,{description:'NÃO ALTERAR',
  expectedUpdatedAt:'2026-01-01T00:00:01.000Z',
  operationId:tag+'-stale-one'});
 assert.equal(stale.statusCode,409,stale.body);
 assert.equal(stale.json().error,'CARD_PURCHASE_STALE_VERSION');
 const still=await prisma.cardPurchase.findUniqueOrThrow({where:{id:purchase.id}});
 assert.equal(still.description,'Original');
 assert.equal(still.updatedAt.toISOString(),old);

 const validPayload={description:'Editado com versao correta',
  expectedUpdatedAt:old,operationId:tag+'-valid'};
 const valid=await patch(path,validPayload);
 assert.equal(valid.statusCode,200,valid.body);
 assert.equal(valid.json().idempotentReplay,false);
 const after=await prisma.cardPurchase.findUniqueOrThrow({where:{id:purchase.id}});
 assert.equal(after.description,'Editado com versao correta');
 assert.notEqual(after.updatedAt.toISOString(),old);
 const replay=await patch(path,validPayload);
 assert.equal(replay.statusCode,200,replay.body);
 assert.equal(replay.json().idempotentReplay,true);

 const staleAgain=await patch(path,{description:'VERSÃO ANTIGA',
  expectedUpdatedAt:old,operationId:tag+'-stale-two'});
 assert.equal(staleAgain.statusCode,409,staleAgain.body);
 assert.equal((await prisma.cardPurchase.findUniqueOrThrow({where:{id:purchase.id}})).description,
  'Editado com versao correta');

 const installmentPath='/cards/installments/'+first.id;
 const beforeInstallment=await prisma.cardInstallment.findUniqueOrThrow({where:{id:first.id}});
 const outdated=await patch(installmentPath,{amount:40,
  expectedPurchaseUpdatedAt:old,operationId:tag+'-installment-stale'});
 assert.equal(outdated.statusCode,409,outdated.body);
 assert.equal(outdated.json().error,'CARD_PURCHASE_STALE_VERSION');
 const stillInstallment=await prisma.cardInstallment.findUniqueOrThrow({where:{id:first.id}});
 assert.equal(stillInstallment.amount.toString(),beforeInstallment.amount.toString());

 const updated=await patch(installmentPath,{amount:40,
  expectedPurchaseUpdatedAt:after.updatedAt.toISOString(),
  operationId:tag+'-installment-valid'});
 assert.equal(updated.statusCode,200,updated.body);
 const final=await prisma.cardPurchase.findUniqueOrThrow({where:{id:purchase.id},
  include:{entries:true}});
 assert.equal(final.totalAmount.toString(),'106.66');
 assert.deepEqual(final.entries.sort((a,b)=>a.number-b.number).map(e=>e.id),
  [...purchase.entries].sort((a,b)=>a.number-b.number).map(e=>e.id),
  'Edição unitária preserva identidade das parcelas');

 const legacy=await patch(path,{description:'Cliente legado continua',
  operationId:tag+'-legacy'});
 assert.equal(legacy.statusCode,200,legacy.body);
 assert.equal((await prisma.cardPurchase.findUniqueOrThrow({where:{id:purchase.id}})).description,
  'Cliente legado continua');
 console.log('STAGE10_CARD_VERSION_PG17_STALE_REJECTED_LEGACY_PRESERVED PASS');
}finally{
 await app.close();
 await prisma.$disconnect();
}
