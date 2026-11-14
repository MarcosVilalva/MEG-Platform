import assert from 'node:assert/strict';
import {Prisma,UserRole,UserStatus,prisma} from '@meg/database';
import {
 assertStage10DisposableHttpEnvironment,
 startStage10DisposablePreviewLoopback,
} from './stage10-qa-readonly-loopback';

const env={...process.env};
assert.throws(()=>assertStage10DisposableHttpEnvironment({
 ...env,MEG_STAGE10_QA_HTTP_ENABLED:'0',
}),/STAGE10_QA_DISPOSABLE_ONLY/);
assert.throws(()=>assertStage10DisposableHttpEnvironment({
 ...env,NODE_ENV:'production',
}),/STAGE10_QA_DISPOSABLE_ONLY/);
assert.throws(()=>assertStage10DisposableHttpEnvironment({
 ...env,DATABASE_URL:'postgresql://x:y@db.production.example:5432/meg_stage10_sandbox?schema=public',
}),/STAGE10_QA_DISPOSABLE_ONLY/);
assert.throws(()=>assertStage10DisposableHttpEnvironment({
 ...env,DATABASE_URL:'postgresql://x:y@127.0.0.1:5432/meg_production?schema=public',
}),/STAGE10_QA_DISPOSABLE_ONLY/);
assertStage10DisposableHttpEnvironment(env);
const stamp='qa-http-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const owner=await prisma.user.create({data:{
 name:'Owner QA HTTP',email:stamp+'-owner@meg.test',
 passwordHash:'CI-DISPOSABLE-ONLY',role:UserRole.ADMIN,
 status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date('2026-11-14T00:00:00Z'),
}});
const viewer=await prisma.user.create({data:{
 name:'Viewer QA HTTP',email:stamp+'-viewer@meg.test',
 passwordHash:'CI-DISPOSABLE-ONLY',role:UserRole.VIEWER,
 status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date('2026-11-14T00:00:00Z'),
}});
const foreign=await prisma.user.create({data:{
 name:'Foreign QA HTTP',email:stamp+'-foreign@meg.test',
 passwordHash:'CI-DISPOSABLE-ONLY',role:UserRole.VIEWER,
 status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date('2026-11-14T00:00:00Z'),
}});
const workspace=await prisma.workspace.create({data:{
 name:'Workspace QA HTTP',slug:stamp,ownerId:owner.id,
 members:{create:{userId:owner.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}},
}});
await prisma.workspaceMember.create({data:{
 workspaceId:workspace.id,userId:viewer.id,role:UserRole.VIEWER,
 status:UserStatus.ACTIVE,isActive:true,
}});
const sourceCard=await prisma.creditCard.create({data:{
 userId:owner.id,name:'Original QA HTTP',closingDay:25,dueDay:5,
 creditLimit:new Prisma.Decimal('1000.00'),isActive:true,
}});
const targetCard=await prisma.creditCard.create({data:{
 userId:owner.id,name:'Destino QA HTTP',closingDay:20,dueDay:10,
 creditLimit:new Prisma.Decimal('1000.00'),isActive:true,
}});
const purchase=await prisma.cardPurchase.create({data:{
 userId:owner.id,cardId:sourceCard.id,
 description:'HTTP QA fictícia',purchaseDate:new Date('2026-11-14T12:00:00.000Z'),
 totalAmount:new Prisma.Decimal('100.00'),installments:3,status:'active',
 entries:{create:[
  {number:1,amount:new Prisma.Decimal('33.34'),statementMonth:'2026-11'},
  {number:2,amount:new Prisma.Decimal('33.33'),statementMonth:'2026-12'},
  {number:3,amount:new Prisma.Decimal('33.33'),statementMonth:'2027-01'},
 ]},
}});
const before=await prisma.cardPurchase.findUniqueOrThrow({
 where:{id:purchase.id},include:{entries:{orderBy:{number:'asc'}}},
});
const beforeReceipt=await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id}});
const beforeAudit=await prisma.auditLog.count({where:{userId:owner.id}});
const {app,address}=await startStage10DisposablePreviewLoopback();
try{
 const api=new URL(address);
 assert.equal(api.hostname,'127.0.0.1');
 assert.ok(Number(api.port)>0);
 const endpoint=new URL('/finance/batch-edit/card-cycle/preview',address);
 const token=(sub:string,role:UserRole)=>app.jwt.sign({
  sub,role,email:'qa-only@meg.test',
 });
 const body={
  items:[{source:'card-purchase',id:purchase.id,expectedUpdatedAt:purchase.updatedAt.toISOString()}],
  changes:{cardId:targetCard.id,purchaseDateMode:'common',commonPurchaseDate:'2026-11-25'},
 };
 const post=(data:unknown,jwt?:string)=>fetch(endpoint,{
  method:'POST',headers:{
   'Content-Type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{}),
  },body:JSON.stringify(data),
 });
 const forbidden=await post(body);
 assert.equal(forbidden.status,401);
 const invalid=await post(body,'invalid-jwt');
 assert.equal(invalid.status,401);
 const readToken=token(viewer.id,UserRole.VIEWER);
 const approved=await post(body,readToken);
 assert.equal(approved.status,200);
 assert.equal(approved.headers.get('cache-control'),'no-store');
 assert.equal(approved.headers.get('vary'),'Authorization');
 assert.equal(approved.headers.get('x-content-type-options'),'nosniff');
 const json=await approved.json() as {
  canWrite:boolean;total:number;candidates:number;blocked:number;
  rows:{status:string;before?:{entries:{amount:string;dueDate:string}[]};
   after?:{entries:{amount:string;statementMonth:string;dueDate:string}[]}}[];
 };
 assert.equal(json.canWrite,false);
 assert.equal(json.total,1);
 assert.equal(json.candidates,1);
 assert.equal(json.blocked,0);
 assert.equal(json.rows[0].status,'candidate');
 assert.deepEqual(json.rows[0].after?.entries.map(e=>e.statementMonth),
  ['2026-12','2027-01','2027-02']);
 assert.deepEqual(json.rows[0].after?.entries.map(e=>e.amount),
  ['33.34','33.33','33.33']);
 assert.equal(json.rows[0].after?.entries[0].dueDate,'2027-01-11');
 const intruder=await post(body,token(foreign.id,UserRole.VIEWER));
 assert.equal(intruder.status,403);
 const badWorkspace=await post({...body,workspaceId:workspace.id},readToken);
 assert.equal(badWorkspace.status,400);
 const badDate=await post({
  ...body,changes:{...body.changes,commonPurchaseDate:'2026-02-30'},
 },readToken);
 assert.equal(badDate.status,400);
 const writeRoutes=[
  '/finance/events/bulk/update','/finance/events/bulk/archive',
  '/cards/purchases','/payables/settle',
 ];
 for(const path of writeRoutes){
  const result=await fetch(new URL(path,address),{
   method:'POST',headers:{Authorization:'Bearer '+readToken,'Content-Type':'application/json'},
   body:'{}',
  });
  assert.equal(result.status,404,'QA HTTP must never register financial writer: '+path);
 }
 const old=await prisma.cardPurchase.findUniqueOrThrow({
  where:{id:purchase.id},include:{entries:{orderBy:{number:'asc'}}},
 });
 assert.equal(old.cardId,before.cardId);
 assert.equal(old.updatedAt.toISOString(),before.updatedAt.toISOString());
 assert.equal(old.purchaseDate.toISOString(),before.purchaseDate.toISOString());
 assert.deepEqual(old.entries.map(e=>[e.id,e.amount.toString(),e.statementMonth]),
  before.entries.map(e=>[e.id,e.amount.toString(),e.statementMonth]));
 assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:workspace.id}}),beforeReceipt);
 assert.equal(await prisma.auditLog.count({where:{userId:owner.id}}),beforeAudit);
 console.log('MEG_STAGE10_QA_LOOPBACK_HTTP_POSTGRES_READONLY PASS');
}finally{
 await app.close();
 await prisma.$disconnect();
}
