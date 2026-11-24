/**
 * A17 review/counterentry acceptance, real Fastify HTTP/JWT/PG17 ONLY.
 * Guard ensures this test never contacts a protected database.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Fastify from 'fastify';
import bcrypt from 'bcryptjs';
import {prisma,Prisma,UserRole,UserStatus,LicenseStatus} from '@meg/database';
import {registerAuth} from '../../plugins/auth';
import {authRoutes} from '../auth/routes';
import {financeRoutes} from './routes';

const db=new URL(process.env.DATABASE_URL||'https://invalid');
assert.ok(process.env.GITHUB_ACTIONS==='true'
 &&process.env.GITHUB_REPOSITORY==='MarcosVilalva/MEG-Platform'
 &&process.env.MEG_STAGE10_ISOLATED_PG==='1'
 &&process.env.MEG_STAGE10_ISSUE699_A17_REVIEW_ENABLED==='1'
 &&process.env.NODE_ENV==='test'
 &&db.protocol==='postgresql:'&&db.hostname==='127.0.0.1'&&db.port==='5432'
 &&db.pathname==='/meg_stage10_a17_sandbox'&&db.username==='meg_stage10_ci',
 'A17_PROTECTED_DATABASE_FORBIDDEN');

const suffix=randomUUID().slice(0,12);
const password='fake-a17-'+suffix;
const make=async(name:string)=>{
 const user=await prisma.user.create({data:{
  email:('a17-'+name+'-'+suffix+'@example.invalid').toLowerCase(),name:'Fictitious '+name,
  passwordHash:await bcrypt.hash(password,8),role:UserRole.ADMIN,status:UserStatus.ACTIVE,
  isActive:true,approvedAt:new Date(),
 }});
 const plan=await prisma.plan.create({data:{code:'A17-'+name+'-'+suffix,
  name:'A17 synthetic',monthlyPrice:0,maxMembers:5,features:[]}});
 const workspace=await prisma.workspace.create({data:{
  ownerId:user.id,slug:'a17-'+name+'-'+suffix,name:'A17 '+name,
  members:{create:{userId:user.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}},
  subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
  appState:{create:{userId:user.id,revision:1,
    state:{transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'}} as Prisma.InputJsonValue}},
 }});
 const account=await prisma.account.create({data:{userId:user.id,name:'A17 Conta QA',
  type:'checking',openingBalance:5000,isActive:true}});
 const category=await prisma.category.create({data:{userId:user.id,name:'A17 Categoria QA',
  type:'expense',group:'QA',isActive:true}});
 const method=await prisma.paymentMethod.create({data:{userId:user.id,name:'A17 PIX QA',
  type:'instant',isActive:true}});
 return {user,workspace,account,category,method};
};

const app=Fastify({logger:false});
let listening=false;
let trigger=false;
try{
 const a=await make('A'),b=await make('B');
 const viewer=await prisma.user.create({data:{email:'a17-viewer-'+suffix+'@example.invalid',
  name:'A17 viewer',passwordHash:await bcrypt.hash(password,8),
  role:UserRole.VIEWER,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date()}});
 await prisma.workspaceMember.create({data:{
  userId:viewer.id,workspaceId:a.workspace.id,role:UserRole.VIEWER,
  status:UserStatus.ACTIVE,isActive:true}});
 await registerAuth(app);
 await app.register(authRoutes,{prefix:'/auth'});
 await app.register(financeRoutes,{prefix:'/finance'});
 await app.listen({host:'127.0.0.1',port:33517});
 listening=true;
 const base='http://127.0.0.1:33517';
 const json=async(r:Response)=>({status:r.status,data:await r.json() as any});
 const login=async(email:string)=>{
  const r=await json(await fetch(base+'/auth/login',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}));
  assert.equal(r.status,200,JSON.stringify(r));
  return String(r.data.accessToken);
 };
 const jwt=await login(a.user.email),jwtB=await login(b.user.email);
 const jwtViewer=await login(viewer.email);
 const headers=(token=jwt)=>({Authorization:'Bearer '+token,'Content-Type':'application/json',
  'X-MEG-Expected-Workspace-Id':a.workspace.id});
 const send=async(path:string,body:any,token=jwt,method='POST')=>
  json(await fetch(base+path,{method,headers:headers(token),body:JSON.stringify(body)}));
 const read=async(path:string,token=jwt)=>
  json(await fetch(base+path,{headers:headers(token)}));
 const create=async(label:string,operationId=randomUUID())=>send('/finance/events',{
  operationId,description:label,type:'expense',status:'paid',
  date:'2026-11-24',competence:'2026-11',amount:12.35,
  accountId:a.account.id,categoryId:a.category.id,paymentMethodId:a.method.id,
  notes:'A17 QA SIN TETICO',
 });
 const pair=async(label:string)=>{
  const one=await create(label),two=await create(label);
  assert.equal(one.status,201,JSON.stringify(one));
  assert.equal(two.status,201,JSON.stringify(two));
  assert.notEqual(one.data.id,two.data.id);
  const view=await read('/finance/events/suspected-duplicates?pageSize=100');
  assert.equal(view.status,200);
  const match=view.data.items.find((x:any)=>x.event.id===two.data.id&&x.peer?.id===one.data.id);
  assert.ok(match,'A17_TWO_SIDED_SUSPECTS_REQUIRED');
  return {one:one.data.id as string,two:two.data.id as string,group:match.suspicionGroupId as string};
 };
 const postResolve=async(p:Awaited<ReturnType<typeof pair>>,payload:any,token=jwt)=>
  send('/finance/events/'+p.one+'/resolve',{peerEventId:p.two,suspicionGroupId:p.group,
    reason:'Decisao humana ficticia e justificada para QA',...payload},token);
 const postUndo=async(p:Awaited<ReturnType<typeof pair>>,resolutionAuditId:string,op:string,token=jwt)=>
  send('/finance/events/'+p.one+'/resolve/undo',{peerEventId:p.two,suspicionGroupId:p.group,
    resolutionAuditId,operationId:op,
    reason:'Desfazer decisao incorreta registrada para auditoria'},token);
 const count=()=>prisma.financialEvent.count({where:{workspaceId:a.workspace.id}});
 const logs=(eventId:string)=>prisma.auditLog.findMany({where:{
  entity:'FinancialEvent',entityId:eventId,
  action:{in:['FINANCIAL_EVENT_SUSPICION_RESOLVED','FINANCIAL_EVENT_SUSPICION_REVERSED']} },
  orderBy:{createdAt:'asc'}});
 const status=async(p:Awaited<ReturnType<typeof pair>>)=>{
  const r=await read('/finance/events/suspected-duplicates?pageSize=100');
  assert.equal(r.status,200);
  const item=r.data.items.find((x:any)=>x.suspicionGroupId===p.group&&x.event.id===p.one);
  assert.ok(item);
  return item;
 };
 const sameBalance=async(ids:string[])=>{
  const events=await prisma.financialEvent.findMany({where:{id:{in:ids}}});
  return events.reduce((sum,x)=>sum.plus(x.signedAmount),new Prisma.Decimal(0));
 };

 // Human decision "two legitimate", no effect on original money.
 const legit=await pair('A17 LEGITIMATE DISTINCT PAIR');
 const beforeLegit=await count();
 const legitOp=randomUUID();
 const decision=await postResolve(legit,{decision:'RESOLVED_LEGITIMATE',operationId:legitOp});
 assert.equal(decision.status,201,JSON.stringify(decision));
 assert.equal(decision.data.reviewStatus,'RESOLVED_LEGITIMATE');
 assert.equal(decision.data.compensationEventId,null);
 assert.equal(await count(),beforeLegit);
 assert.equal((await status(legit)).reviewStatus,'RESOLVED_LEGITIMATE');
 const legitAudit=(await logs([legit.one,legit.two].sort()[0])).find(x=>x.id===decision.data.resolutionAuditId);
 assert.ok(legitAudit);
 assert.ok(legitAudit.createdAt);
 assert.equal(legitAudit.userId,a.user.id);
 const metadata=JSON.parse(legitAudit.metadata||'{}');
 assert.equal(metadata.context.reason,'Decisao humana ficticia e justificada para QA');
 assert.equal(metadata.context.decision,'RESOLVED_LEGITIMATE');
 const replay=await postResolve(legit,{decision:'RESOLVED_LEGITIMATE',operationId:legitOp});
 assert.equal(replay.status,201);
 assert.equal(replay.data.idempotentReplay,true);
 const changed=await postResolve(legit,{decision:'RESOLVED_DUPLICATE',
  correctionTargetEventId:legit.two,effectiveDate:'2026-11-24',operationId:legitOp});
 assert.equal(changed.status,409);
 const undoneLegit=await postUndo(legit,decision.data.resolutionAuditId,randomUUID());
 assert.equal(undoneLegit.status,201,JSON.stringify(undoneLegit));
 assert.equal(undoneLegit.data.inverseEventId,null);
 assert.equal(await count(),beforeLegit);
 assert.equal((await status(legit)).reviewStatus,'SUSPECTED');
 console.log('ISSUE699_A17_LEGITIMATE_AND_UNDO=PASS');

 // Duplicate human decision: new contra-expense, not income nor deletion.
 const dup=await pair('A17 REAL COUNTERENTRY PAIR');
 const originals=await prisma.financialEvent.findMany({where:{id:{in:[dup.one,dup.two]}},
  include:{ledgerEntries:true}});
 assert.equal(originals.length,2);
 const ledgerOriginalIds=originals.flatMap(x=>x.ledgerEntries.map(e=>e.id)).sort();
 const before=await count();
 const op=randomUUID();
 const resolved=await postResolve(dup,{decision:'RESOLVED_DUPLICATE',
  correctionTargetEventId:dup.two,effectiveDate:'2026-11-24',operationId:op});
 assert.equal(resolved.status,201,JSON.stringify(resolved));
 const compensationId=resolved.data.compensationEventId as string;
 assert.ok(compensationId);
 assert.equal(await count(),before+1);
 const compensation=await prisma.financialEvent.findUnique({where:{id:compensationId},
  include:{ledgerEntries:true}});
 assert.ok(compensation);
 assert.equal(compensation.type,'expense');
 assert.equal(compensation.signedAmount.toString(),'12.35');
 assert.equal(compensation.amount.toString(),'12.35');
 assert.equal(compensation.ledgerEntries.length,1);
 assert.equal(compensation.ledgerEntries[0].debit.toString(),'12.35');
 const originalAfter=await prisma.financialEvent.findMany({where:{id:{in:[dup.one,dup.two]}},
  include:{ledgerEntries:true}});
 assert.deepEqual(originalAfter.flatMap(x=>x.ledgerEntries.map(e=>e.id)).sort(),ledgerOriginalIds);
 assert.ok(originalAfter.every(x=>x.signedAmount.toString()==='-12.35'&&!x.archivedAt));
 assert.equal((await sameBalance([dup.one,dup.two,compensationId])).toString(),'-12.35');
 assert.equal((await status(dup)).reviewStatus,'RESOLVED_DUPLICATE');
 assert.equal((await postResolve(dup,{decision:'RESOLVED_DUPLICATE',
  correctionTargetEventId:dup.two,effectiveDate:'2026-11-24',operationId:op})).data.idempotentReplay,true);
 assert.equal(await count(),before+1);
 console.log('ISSUE699_A17_CANONICAL_CONTRA_EXPENSE=PASS');

 // Generic PATCH/DELETE cannot bypass protected source/correction.
 const patch=await send('/finance/events/'+dup.two,{description:'BYPASS ATTEMPT'},jwt,'PATCH');
 assert.equal(patch.status,409,JSON.stringify(patch));
 const archive=await json(await fetch(base+'/finance/events/'+dup.two,{method:'DELETE',headers:headers()}));
 assert.equal(archive.status,409,JSON.stringify(archive));
 const archiveComp=await json(await fetch(base+'/finance/events/'+compensationId,{method:'DELETE',headers:headers()}));
 assert.equal(archiveComp.status,409,JSON.stringify(archiveComp));
 const unauthorized=await postResolve(dup,{decision:'RESOLVED_LEGITIMATE',operationId:randomUUID()},jwtViewer);
 assert.equal(unauthorized.status,403);
 const cross=await postResolve(dup,{decision:'RESOLVED_LEGITIMATE',operationId:randomUUID()},jwtB);
 assert.ok([403,404].includes(cross.status),JSON.stringify(cross));
 console.log('ISSUE699_A17_CANONICAL_BYPASS_AND_ISOLATION=PASS');

 // Undo wrong human decision by a new inverse entry, same day, same account.
 const undoOp=randomUUID();
 const undo=await postUndo(dup,resolved.data.resolutionAuditId,undoOp);
 assert.equal(undo.status,201,JSON.stringify(undo));
 const inverseId=undo.data.inverseEventId as string;
 assert.ok(inverseId);
 const inverse=await prisma.financialEvent.findUnique({where:{id:inverseId},
  include:{ledgerEntries:true}});
 assert.ok(inverse);
 assert.equal(inverse.signedAmount.toString(),'-12.35');
 assert.equal(inverse.ledgerEntries.length,1);
 assert.equal(inverse.ledgerEntries[0].credit.toString(),'12.35');
 assert.equal((await sameBalance([dup.one,dup.two,compensationId,inverseId])).toFixed(2),'-24.70');
 assert.equal((await status(dup)).reviewStatus,'SUSPECTED');
 const retryUndo=await postUndo(dup,resolved.data.resolutionAuditId,undoOp);
 assert.equal(retryUndo.status,201);
 assert.equal(retryUndo.data.idempotentReplay,true);
 const stale=await postUndo(dup,resolved.data.resolutionAuditId,randomUUID());
 assert.equal(stale.status,409);
 assert.equal(await count(),before+2);
 const reviewAudit=await logs([dup.one,dup.two].sort()[0]);
 assert.equal(reviewAudit.filter(x=>x.action==='FINANCIAL_EVENT_SUSPICION_RESOLVED').length,1);
 assert.equal(reviewAudit.filter(x=>x.action==='FINANCIAL_EVENT_SUSPICION_REVERSED').length,1);
 console.log('ISSUE699_A17_INVERSE_COMPENSATION_AND_AUDIT=PASS');

 // A deliberately failed audit must rollback event, ledger and operation receipt.
 const faulty=await pair('A17 ATOMIC ROLLBACK PAIR');
 const countBefore=await count();
 await prisma.$executeRawUnsafe("CREATE FUNCTION meg_a17_abort_review() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='FINANCIAL_EVENT_SUSPICION_RESOLVED' THEN RAISE EXCEPTION 'A17_SYNTHETIC_ABORT'; END IF; RETURN NEW; END; $$");
 await prisma.$executeRawUnsafe('CREATE TRIGGER meg_a17_abort_review BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION meg_a17_abort_review()');
 trigger=true;
 const faultOp=randomUUID();
 const reject=await postResolve(faulty,{decision:'RESOLVED_DUPLICATE',
  correctionTargetEventId:faulty.two,effectiveDate:'2026-11-24',operationId:faultOp});
 assert.ok(reject.status>=500,JSON.stringify(reject));
 await prisma.$executeRawUnsafe('DROP TRIGGER meg_a17_abort_review ON "AuditLog"');
 await prisma.$executeRawUnsafe('DROP FUNCTION meg_a17_abort_review()');
 trigger=false;
 assert.equal(await count(),countBefore);
 assert.equal(await prisma.cloudMutationReceipt.count({where:{workspaceId:a.workspace.id,
  operationId:faultOp}}),0);
 assert.equal((await status(faulty)).reviewStatus,'SUSPECTED');
 console.log('ISSUE699_A17_ATOMIC_FAULT_ROLLBACK=PASS');

 // Competing human resolutions: never both win or create double compensation.
 const competing=await pair('A17 CONCURRENT DECISIONS');
 const competingBefore=await count();
 const two=await Promise.all([postResolve(competing,{
  decision:'RESOLVED_DUPLICATE',correctionTargetEventId:competing.two,
  effectiveDate:'2026-11-24',operationId:randomUUID(),
 }),postResolve(competing,{decision:'RESOLVED_LEGITIMATE',operationId:randomUUID()})]);
 assert.deepEqual(two.map(x=>x.status).sort(),[201,409],JSON.stringify(two));
 assert.ok((await status(competing)).reviewStatus.startsWith('RESOLVED_'));
 assert.ok((await count())<=competingBefore+1);
 console.log('ISSUE699_A17_CONCURRENT_REVIEW_SINGLE_WINNER=PASS');
 console.log('ISSUE699_A17_MANUAL_REVERSIBLE_REVIEW=PASS');
}finally{
 if(trigger){
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS meg_a17_abort_review ON "AuditLog"').catch(()=>{});
  await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS meg_a17_abort_review()').catch(()=>{});
 }
 if(listening)await app.close();
 await prisma.$disconnect();
}
