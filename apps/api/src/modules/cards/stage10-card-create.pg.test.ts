import assert from 'node:assert/strict';
import Fastify,{type FastifyRequest} from 'fastify';
import {prisma,UserRole,UserStatus} from '@meg/database';
import {cardRoutes} from './routes';

/** Somente PostgreSQL17 descartavel do CI; nunca roda contra dados reais. */
const databaseUrl=process.env.DATABASE_URL??'';
if(process.env.MEG_STAGE10_SYNTHETIC_DB!=='true'||
 !/^postgresql:\/\/meg_test:meg_test@127\.0\.0\.1:5439\/meg_stage10_test(?:\?|$)/.test(databaseUrl))
 throw new Error('STAGE10_SYNTHETIC_DATABASE_REQUIRED');
const tag='stage10-card-create-'+process.pid;
async function fixtureUser(suffix:string){
 const user=await prisma.user.create({data:{
  name:'Synthetic Card Create '+suffix,email:tag+'-'+suffix+'@example.invalid',
  role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,
 }});
 const workspace=await prisma.workspace.create({data:{
  name:'Card Create '+suffix,slug:tag+'-'+suffix,ownerId:user.id,
 }});
 await prisma.workspaceMember.create({data:{
  userId:user.id,workspaceId:workspace.id,role:UserRole.ADMIN,
  status:UserStatus.ACTIVE,isActive:true,
 }});
 const card=await prisma.creditCard.create({data:{
  userId:user.id,name:'Synthetic Card '+suffix,creditLimit:'3000.00',
  closingDay:10,dueDay:20,
 }});
 const category=await prisma.category.create({data:{
  userId:user.id,name:'Synthetic Category '+suffix,type:'expense',
 }});
 return {user,card,category};
}
const owner=await fixtureUser('owner');
const outsider=await fixtureUser('outsider');
const app=Fastify({logger:false});
app.decorate('authorize',(_roles:UserRole[])=>
 async(request:FastifyRequest)=>{
  request.user={sub:owner.user.id,role:UserRole.ADMIN,email:owner.user.email};
 });
await app.register(cardRoutes,{prefix:'/cards'});
await app.ready();
const post=(payload:Record<string,unknown>)=>app.inject({
 method:'POST',url:'/cards/purchases',
 headers:{'content-type':'application/json'},payload,
});
try{
 const operationId=tag+'-create';
 const request={
  cardId:owner.card.id,categoryId:owner.category.id,
  description:'Compra de cartao exclusivamente sintetica',
  totalAmount:99.99,purchaseDate:'2026-11-15',installments:3,operationId,
 };
 const first=await post(request);
 assert.equal(first.statusCode,201,first.body);
 assert.equal(first.json().cardId,owner.card.id);
 assert.equal(first.json().installments,3);
 const id=first.json().id as string;
 const created=await prisma.cardPurchase.findUniqueOrThrow({
  where:{id},include:{entries:true},
 });
 assert.equal(created.totalAmount.toString(),'99.99');
 assert.equal(created.entries.length,3);
 assert.deepEqual(created.entries.map(e=>e.number).sort((a,b)=>a-b),[1,2,3]);
 // Competencia/parcelas calculadas somente pelo escritor canonico.
 assert.deepEqual(created.entries.sort((a,b)=>a.number-b.number)
  .map(e=>e.statementMonth),['2026-12','2027-01','2027-02']);
 assert.equal(created.entries.reduce((sum,e)=>sum+Math.round(Number(e.amount)*100),0),9999);

 const replay=await post(request);
 assert.equal(replay.statusCode,201,replay.body);
 assert.equal(replay.json().id,id,'Retry com mesmo operationId nao duplica compra');
 assert.equal(await prisma.cardPurchase.count({where:{
  userId:owner.user.id,cardId:owner.card.id,description:request.description,
 }}),1);

 const reused=await post({...request,description:'Payload divergente'});
 assert.equal(reused.statusCode,409,reused.body);
 assert.equal(reused.json().error,'OPERATION_ID_REUSED');

 const possibleDuplicate=await post({...request,operationId:tag+'-duplicate'});
 assert.equal(possibleDuplicate.statusCode,409,possibleDuplicate.body);
 assert.equal(possibleDuplicate.json().error,'POSSIBLE_DUPLICATE');

 const foreignCard=await post({...request,operationId:tag+'-foreign-card',
  cardId:outsider.card.id});
 assert.equal(foreignCard.statusCode,400,foreignCard.body);
 assert.equal(foreignCard.json().error,'INVALID_CARD');

 const foreignCategory=await post({...request,operationId:tag+'-foreign-category',
  categoryId:outsider.category.id});
 assert.equal(foreignCategory.statusCode,400,foreignCategory.body);
 assert.equal(foreignCategory.json().error,'INVALID_CATEGORY');

 const tooMany=await post({...request,operationId:tag+'-too-many',installments:49});
 assert.equal(tooMany.statusCode,400,tooMany.body);
 assert.equal(tooMany.json().error,'VALIDATION_ERROR');

 assert.equal(await prisma.cardPurchase.count({where:{userId:outsider.user.id}}),0,
  'Nao escrever em tenant alheio');
 assert.equal(await prisma.cardPurchase.count({where:{userId:owner.user.id}}),1,
  'Falhas e duplicatas nao criam nova compra');
 console.log('STAGE10_CARD_CREATE_PG17_IDEMPOTENCY_TENANT_CANONICAL_CYCLE PASS');
}finally{
 await app.close();
 await prisma.$disconnect();
}
