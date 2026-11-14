import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {prisma,UserRole,UserStatus} from '@meg/database';
import {registerAuth} from '../../plugins/auth';
import {registerStage10ReadOnlyRoutes} from './stage10-readonly-routes';
import {withStage10ReadOnlyWorkspace} from './stage10-readonly-workspace';

/**
 * HTTP/JWT/PostgreSQL 17 descartavel da Etapa 10.
 * Nunca executar com DATABASE_URL de producao.
 * O workflow injeta uma URL exclusiva local e nao exporta dados reais.
 */
const dbUrl=process.env.DATABASE_URL||'';
if(process.env.MEG_STAGE10_SYNTHETIC_DB!=='true'
 || !/^postgresql:\/\/meg_test:meg_test@127\.0\.0\.1:5439\/meg_stage10_test(?:\?|$)/.test(dbUrl))
 throw new Error('STAGE10_SYNTHETIC_DATABASE_REQUIRED');

const server=Fastify({logger:false});
const suffix='stage10-'+process.pid;
const accountId='acct-'+suffix;
const secondAccountId='acct-b-'+suffix;
let ownerId='',otherId='',workspaceId='',otherWorkspaceId='';
try{
 await registerAuth(server);
 await server.register(registerStage10ReadOnlyRoutes,{prefix:'/finance'});
 await server.ready();

 const owner=await prisma.user.create({data:{
  name:'Fixture Owner A',email:suffix+'-a@example.invalid',
  role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,
 }});
 const other=await prisma.user.create({data:{
  name:'Fixture Owner B',email:suffix+'-b@example.invalid',
  role:UserRole.VIEWER,status:UserStatus.ACTIVE,isActive:true,
 }});
 ownerId=owner.id;otherId=other.id;
 const workspace=await prisma.workspace.create({data:{
  name:'Fixture Workspace A',slug:suffix+'-a',ownerId,
 }});
 const otherWorkspace=await prisma.workspace.create({data:{
  name:'Fixture Workspace B',slug:suffix+'-b',ownerId:otherId,
 }});
 workspaceId=workspace.id;otherWorkspaceId=otherWorkspace.id;
 await prisma.workspaceMember.createMany({data:[
  {workspaceId,userId:ownerId,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true},
  {workspaceId:otherWorkspaceId,userId:otherId,role:UserRole.VIEWER,status:UserStatus.ACTIVE,isActive:true},
 ]});
 const account=await prisma.account.create({data:{
  id:accountId,userId:ownerId,name:'Fixture Conta A',type:'checking',openingBalance:'0',
 }});
 const category=await prisma.category.create({data:{
  userId:ownerId,name:'Fixture Categoria A',type:'expense',
 }});
 const method=await prisma.paymentMethod.create({data:{
  userId:ownerId,name:'Fixture PIX A',type:'ordinary',
 }});
 const original=await prisma.financialEvent.create({data:{
  userId:ownerId,workspaceId,description:'Despesa sintetica A',
  type:'expense',status:'paid',date:new Date('2026-11-10T12:00:00Z'),
  competence:'2026-11',amount:'10.50',signedAmount:'-10.50',
  accountId:account.id,categoryId:category.id,paymentMethodId:method.id,
 }});
 const foreign=await prisma.financialEvent.create({data:{
  userId:otherId,workspaceId:otherWorkspaceId,description:'Despesa sintetica B',
  type:'expense',status:'planned',date:new Date('2026-11-11T12:00:00Z'),
  competence:'2026-11',amount:'20',signedAmount:'-20',
 }});
 const tokenA=server.jwt.sign({sub:ownerId,role:'ADMIN',email:owner.email});
 const tokenB=server.jwt.sign({sub:otherId,role:'VIEWER',email:other.email});
 const endpoint='/finance/stage10-readonly/snapshot?month=2026-11';
 const get=(token?:string,url=endpoint)=>server.inject({
  method:'GET',url,headers:token?{authorization:'Bearer '+token}:{},
 });

 const unauthenticated=await get();
 assert.equal(unauthenticated.statusCode,401,'sem JWT deve ser recusado');
 const invalidMonth=await get(tokenA,'/finance/stage10-readonly/snapshot?month=2026-13');
 assert.equal(invalidMonth.statusCode,400,'periodo invalido deve ser recusado');
 const response=await get(tokenA);
 assert.equal(response.statusCode,200,response.body.slice(0,500));
 const payload=response.json();
 assert.equal(payload.kind,'stage10-financial-readonly-snapshot-v1');
 assert.equal(payload.canWrite,false);
 assert.equal(payload.consistency,'repeatable-read');
 assert.equal(payload.actorId,ownerId);
 assert.equal(payload.workspaceId,workspaceId);
 assert.equal(payload.dataOwnerId,ownerId);
 assert.equal(payload.total,1);
 assert.deepEqual(payload.events.map((e:{id:string})=>e.id),[original.id]);
 assert.equal(payload.events[0].paymentMethod.name,'Fixture PIX A');
 assert.equal(payload.summary.month,'2026-11');
 assert.equal(payload.cashflow.month,'2026-11');
 assert.equal(response.headers['cache-control'],'private, no-store');
 assert.ok(!response.body.includes('Despesa sintetica B'));

 const foreignResponse=await get(tokenB);
 assert.equal(foreignResponse.statusCode,200,foreignResponse.body.slice(0,500));
 const foreignPayload=foreignResponse.json();
 assert.equal(foreignPayload.workspaceId,otherWorkspaceId);
 assert.equal(foreignPayload.total,1);
 assert.equal(foreignPayload.events[0].id,foreign.id);
 assert.ok(!foreignResponse.body.includes('Despesa sintetica A'));

 await assert.rejects(
  withStage10ReadOnlyWorkspace(ownerId,async tx=>{
   await tx.account.create({data:{
    userId:ownerId,name:'Prohibited insert',type:'checking',
   }});
  }),
  'PostgreSQL deve recusar a tentativa de INSERT em transacao READ ONLY',
 );
 assert.equal(await prisma.account.count({where:{name:'Prohibited insert'}}),0);
 assert.equal(await prisma.financialEvent.count({where:{workspaceId}}),1);

 const inactive=await prisma.user.create({data:{
  name:'Fixture Inactive',email:suffix+'-inactive@example.invalid',
  role:UserRole.VIEWER,status:UserStatus.ACTIVE,isActive:false,
 }});
 const denied=await get(server.jwt.sign({sub:inactive.id,role:'VIEWER',email:inactive.email}));
 assert.equal(denied.statusCode,403,'ator inativo nao pode acessar dados');
 assert.ok(!denied.body.includes('Despesa sintetica A'));

 // Um evento com ownership divergente jamais pode ser agregado ao
 // resumo financeiro canonico que ainda opera pelo userId.
 const misplaced=await prisma.financialEvent.create({data:{
  userId:ownerId,workspaceId:otherWorkspaceId,
  description:'Fixture de escopo divergente',type:'expense',status:'planned',
  date:new Date('2026-11-12T12:00:00Z'),competence:'2026-11',
  amount:'30',signedAmount:'-30',
 }});
 const mixed=await get(tokenA);
 assert.equal(mixed.statusCode,409,'escopo misto deve falhar fechado');
 assert.equal(mixed.json().error,'STAGE10_WORKSPACE_FINANCIAL_SCOPE_NOT_EXCLUSIVE');
 assert.ok(!mixed.body.includes('Despesa sintetica A'));
 await prisma.financialEvent.delete({where:{id:misplaced.id}});

 console.log('STAGE10_POSTGRES_JWT_HTTP_READ_ONLY_ISOLATION PASS');
}finally{
 await server.close();
 await prisma.$disconnect();
}
