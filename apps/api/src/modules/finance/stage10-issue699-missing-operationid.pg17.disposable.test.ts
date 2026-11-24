/**
 * Issue #699: characterization ONLY, no production changes.
 * Two identical PATCH requests without operationId: sequential, concurrent,
 * and lost-response retry. Real HTTP/JWT and disposable PostgreSQL 17.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, LicenseStatus, UserRole, UserStatus } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { appStateRoutes } from '../app-state/routes';

const db=new URL(process.env.DATABASE_URL||'https://invalid');
assert.ok(
 process.env.GITHUB_ACTIONS==='true'
 && process.env.GITHUB_REPOSITORY==='MarcosVilalva/MEG-Platform'
 && process.env.MEG_STAGE10_ISOLATED_PG==='1'
 && process.env.MEG_STAGE10_QA_LOCAL_ONLY==='1'
 && process.env.MEG_STAGE10_ISSUE699_SYNTHETIC==='1'
 && process.env.NODE_ENV==='test'
 && db.protocol==='postgresql:' && db.hostname==='127.0.0.1'
 && db.port==='5432' && db.pathname==='/meg_stage10_sandbox'
 && db.username==='meg_stage10_ci',
 'ISSUE699_MISSING_OPERATION_ID_REQUIRES_DISPOSABLE_PG17'
);
const id=randomUUID(),pass='qa-'+id;
const user=await prisma.user.create({data:{
 email:'missing-operation-'+id+'@example.invalid',name:'QA fictitious only',
 passwordHash:await bcrypt.hash(pass,8),role:UserRole.ADMIN,status:UserStatus.ACTIVE,
 isActive:true,approvedAt:new Date(),
}});
const plan=await prisma.plan.create({data:{
 code:'MISSING-OP-'+id,name:'QA plan',monthlyPrice:0,maxMembers:5,features:[],
}});
const account=await prisma.account.create({data:{
 userId:user.id,name:'QA checking',type:'checking',openingBalance:500,isActive:true,
}});
const api=Fastify({logger:false});
let started=false;
try {
 await registerAuth(api);
 await api.register(authRoutes,{prefix:'/auth'});
 await api.register(appStateRoutes,{prefix:'/app-state'});
 await api.listen({host:'127.0.0.1',port:0});
 started=true;
 const address=api.server.address();
 assert.ok(address && typeof address!=='string');
 const base='http://127.0.0.1:'+address.port;
 const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:user.email,password:pass})});
 assert.equal(login.status,200,await login.clone().text());
 const jwt=(await login.json() as {accessToken:string}).accessToken;
 const headers={Authorization:'Bearer '+jwt,'Content-Type':'application/json'};
 const patch=async (payload:unknown)=> {
  const response=await fetch(base+'/app-state/transactions',{method:'PATCH',headers,body:JSON.stringify(payload)});
  return {status:response.status,body:await response.json() as Record<string,any>};
 };
 async function cohort(label:string){
  const workspace=await prisma.workspace.create({data:{
   ownerId:user.id,name:label+' QA workspace',slug:label+'-'+id,
   members:{create:[{userId:user.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}]},
   subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
   appState:{create:{userId:user.id,revision:1,state:{
    transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'},
   } as Prisma.InputJsonValue}},
  }});
  // A real login token resolves a selected workspace from memberships.
  // One workspace per user is necessary to avoid relying on selection order.
  return workspace;
 }
 // Use a fresh user/workspace for each case via deletion of previous membership.
 async function runCase(label:string,kind:'sequential'|'concurrent'|'lost-response'){
  const workspace=await cohort(label);
  const eventId='qa-'+label+'-'+id;
  const item={
   id:eventId,date:'2026-11-24',description:'Only synthetic '+label,
   type:'expense',status:'planned',situation:'PENDENTE',amount:12.35,
   expenseAmount:12.35,financialAccountId:account.id,
   category:'QA',group:'QA',expenseClass:'QA',paymentMethod:'PIX',modality:'À VISTA',
  };
  const body={expectedRevision:1,upserts:[item],deletes:[]}; // NO operationId
  assert.equal('operationId' in body,false);
  let responses:{status:number,body:Record<string,any>}[];
  if(kind==='concurrent'){
   responses=await Promise.all([patch(body),patch(body)]);
  } else {
   const first=await patch(body);
   // lost-response: deliberately discard the first successful HTTP response
   // client retries the identical body without seeing the server receipt.
   responses=[first,await patch(body)];
  }
  const statuses=responses.map(r=>r.status).sort();
  const state=await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}});
  const events=await prisma.financialEvent.findMany({where:{workspaceId:workspace.id}});
  const receipts=await prisma.cloudMutationReceipt.findMany({where:{workspaceId:workspace.id}});
  const receiptIds=receipts.map(r=>r.operationId);
  assert.deepEqual(statuses,[200,409],label+' unexpected HTTP statuses');
  assert.equal(responses.find(r=>r.status===409)?.body.error,'STATE_CONFLICT',label+' not revision conflict');
  assert.equal(state.revision,2,label+' revision advanced more than once');
  assert.equal(events.filter(e=>e.legacyTransactionId===eventId).length,1,label+' duplicated event');
  assert.equal(receipts.length,1,label+' unexpected receipt count');
  assert.equal(new Set(receiptIds).size,1);
  console.log('ISSUE699_MISSING_ID_'+label.toUpperCase().replace('-','_')+'='+JSON.stringify({
   statuses,revision:state.revision,eventCount:events.length,
   receiptCount:receipts.length,receiptOperationIds:receiptIds,
   secondError:responses.find(r=>r.status===409)?.body.error,
   distinctOperationIdsPersisted:receiptIds.length,
   note:'Rejected request UUID cannot be observed in receipts',
  }));
  // Delete the test workspace to ensure subsequent JWT resolves only one.
  await prisma.workspace.delete({where:{id:workspace.id}});
 }
 await runCase('sequential','sequential');
 await runCase('concurrent','concurrent');
 await runCase('lost-response','lost-response');
 console.log('ISSUE699_MISSING_OPERATION_ID_PG17_HTTP_JWT_CHARACTERIZATION=PASS');
} finally {
 if(started)await api.close();
 await prisma.$disconnect();
 console.log('ISSUE699_MISSING_OPERATION_ID_SERVER_CLOSED=PASS');
}
