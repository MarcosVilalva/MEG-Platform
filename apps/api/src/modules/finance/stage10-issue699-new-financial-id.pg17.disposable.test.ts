/**
 * Issue #699: real HTTP/JWT/PG17, lost HTTP response AFTER server commit,
 * remote GET, NEW financial event id on retry with refreshed revision, both PATCH and PUT.
 * Characterization ONLY. All fixtures synthetic.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer, type Server as HttpServer} from 'node:http';
import Fastify from 'fastify';
import bcrypt from 'bcryptjs';
import {prisma, Prisma, LicenseStatus, UserRole, UserStatus} from '@meg/database';
import {registerAuth} from '../../plugins/auth';
import {authRoutes} from '../auth/routes';
import {appStateRoutes} from '../app-state/routes';

const db=new URL(process.env.DATABASE_URL||'https://invalid');
assert.ok(process.env.GITHUB_ACTIONS==='true'
 && process.env.GITHUB_REPOSITORY==='MarcosVilalva/MEG-Platform'
 && process.env.MEG_STAGE10_ISOLATED_PG==='1'
 && process.env.MEG_STAGE10_QA_LOCAL_ONLY==='1'
 && process.env.MEG_STAGE10_ISSUE699_SYNTHETIC==='1'
 && process.env.MEG_STAGE10_WEB_WRITE_QA==='0'
 && process.env.NODE_ENV==='test'
 && db.protocol==='postgresql:' && db.hostname==='127.0.0.1'
 && db.port==='5432' && db.pathname==='/meg_stage10_sandbox'
 && db.username==='meg_stage10_ci',
 'ISSUE699_ONLY_DISPOSABLE_PG17_ALLOWED');
const stamp=randomUUID();
const pass='qa-'+stamp;
const user=await prisma.user.create({data:{
 email:'issue699-refresh-'+stamp+'@example.invalid',
 name:'synthetic-only',passwordHash:await bcrypt.hash(pass,8),
 role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
}});
const plan=await prisma.plan.create({data:{
 code:'REFRESH-'+stamp,name:'synthetic',monthlyPrice:0,maxMembers:2,features:[],
}});
const account=await prisma.account.create({data:{
 userId:user.id,name:'synthetic account',type:'checking',openingBalance:500,isActive:true,
}});
const api=Fastify({logger:false});
let proxy:HttpServer|null=null;
let started=false;
try {
 await registerAuth(api);
 await api.register(authRoutes,{prefix:'/auth'});
 await api.register(appStateRoutes,{prefix:'/app-state'});
 await api.listen({host:'127.0.0.1',port:0});
 started=true;
 const addr=api.server.address();
 assert.ok(addr && typeof addr!=='string');
 const upstream='http://127.0.0.1:'+addr.port;
 let swallowed=false,firstCommitted=false,firstStatus=0;
 const awaitFirst=()=>new Promise<void>((resolve,reject)=>{
  const start=Date.now();
  const poll=()=>{
   if(firstCommitted)return resolve();
   if(Date.now()-start>10000)return reject(new Error('ISSUE699_FIRST_COMMIT_NOT_SEEN'));
   setTimeout(poll,15);
  };
  poll();
 });
 // Transparent local-only HTTP fault proxy. The upstream PATCH/PUT is
 // completely processed and response received; response to caller is DROPPED.
 proxy=createServer(async(req,res)=>{
  try{
   const chunks:Buffer[]=[];
   for await(const chunk of req)chunks.push(Buffer.from(chunk));
   const method=req.method||'GET';
   const target=new URL(req.url||'/',upstream);
   const upstreamResponse=await fetch(target,{method,
    headers:{'Content-Type':String(req.headers['content-type']||'application/json'),
      ...(req.headers.authorization?{Authorization:String(req.headers.authorization)}:{})},
    ...(method==='GET'||method==='HEAD'?{}:{body:Buffer.concat(chunks)})});
   const payload=Buffer.from(await upstreamResponse.arrayBuffer());
   if(!swallowed && (method==='PATCH'||method==='PUT')
     && (target.pathname==='/app-state/transactions'||target.pathname==='/app-state')){
    swallowed=true;firstStatus=upstreamResponse.status;firstCommitted=true;
    // Intentionally NEVER respond. The caller's AbortSignal.timeout fires
    // after the upstream transaction committed and returned HTTP 200.
    res.on('close',()=>undefined);
    return;
   }
   res.writeHead(upstreamResponse.status,{'Content-Type':'application/json'});
   res.end(payload);
  }catch(error){
   if(!res.destroyed){res.statusCode=502;res.end(JSON.stringify({error:String(error)}));}
  }
 });
 await new Promise<void>(resolve=>proxy!.listen(0,'127.0.0.1',resolve));
 const proxyAddr=proxy.address();
 assert.ok(proxyAddr&&typeof proxyAddr!=='string');
 const endpoint='http://127.0.0.1:'+proxyAddr.port;
 const login=await fetch(endpoint+'/auth/login',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:user.email,password:pass}),
 });
 assert.equal(login.status,200,await login.clone().text());
 const jwt=(await login.json() as {accessToken:string}).accessToken;
 const headers={Authorization:'Bearer '+jwt,'Content-Type':'application/json'};
 const request=async(path:string,method:string,body?:unknown,signal?:AbortSignal)=>{
  const response=await fetch(endpoint+path,{method,headers,
   ...(body===undefined?{}:{body:JSON.stringify(body)}),signal});
  return {status:response.status,body:await response.json() as Record<string,any>};
 };
 const get=()=>request('/app-state','GET');
 for(const kind of ['PATCH','PUT'] as const){
  const workspace=await prisma.workspace.create({data:{
   ownerId:user.id,name:'synthetic-'+kind,slug:kind.toLowerCase()+'-'+stamp,
   members:{create:[{userId:user.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}]},
   subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
   appState:{create:{userId:user.id,revision:1,
    state:{transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'}}}},
  }});
  const id='original-financial-id-'+kind+'-'+stamp;
  const retryId='new-financial-id-'+kind+'-'+stamp;
  const event={
   id,date:'2026-11-24',description:'Synthetic stable identity',type:'expense',
   status:'planned',situation:'PENDENTE',amount:12.35,expenseAmount:12.35,
   financialAccountId:account.id,category:'QA',group:'QA',
   expenseClass:'QA',paymentMethod:'PIX',modality:'À VISTA',
  };
  const path=kind==='PATCH'?'/app-state/transactions':'/app-state';
  const initial=kind==='PATCH'
   ?{expectedRevision:1,upserts:[event],deletes:[]}
   :{expectedRevision:1,state:{transactions:[event],budgets:{}}};
  assert.equal('operationId' in initial,false);
  swallowed=false;firstCommitted=false;firstStatus=0;
  let aborted=false;
  try{
   await request(path,kind,initial,AbortSignal.timeout(900));
  }catch(err){
   aborted=true;
   assert.ok(err instanceof Error);
  }
  await awaitFirst();
  assert.equal(aborted,true,'CLIENT_RECEIVED_FIRST_RESPONSE');
  assert.equal(firstStatus,200,'FIRST_BACKEND_WRITE_NOT_COMMITTED');
  const prior=await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}});
  assert.equal(prior.revision,2);
  const refreshed=await get();
  assert.equal(refreshed.status,200);
  assert.equal(refreshed.body.revision,2);
  const newEvent={...event,id:retryId};
  const retry=kind==='PATCH'
   ?{...initial,expectedRevision:refreshed.body.revision,upserts:[newEvent]}
   :{...initial,expectedRevision:refreshed.body.revision,
     state:{transactions:[event,newEvent],budgets:{}}};
  const second=await request(path,kind,retry);
  const state=await prisma.appState.findUniqueOrThrow({where:{workspaceId:workspace.id}});
  const events=await prisma.financialEvent.findMany({where:{workspaceId:workspace.id}});
  const receipts=await prisma.cloudMutationReceipt.findMany({where:{workspaceId:workspace.id}});
  const entries=await prisma.ledgerEntry.findMany({
   where:{accountId:account.id,event:{workspaceId:workspace.id}},orderBy:{createdAt:'asc'},
   select:{id:true,eventId:true,accountId:true,debit:true,credit:true},
  });
  const originalEvent=events.find(x=>x.legacyTransactionId===id);
  const retriedEvent=events.find(x=>x.legacyTransactionId===retryId);
  const ledgerDebit=entries.reduce((sum,x)=>sum+Number(x.debit),0);
  const ledgerCredit=entries.reduce((sum,x)=>sum+Number(x.credit),0);
  const opening=Number(account.openingBalance);
  const ledgerBalance=opening+ledgerCredit-ledgerDebit;
  // Separate projection from actual ledger, never call projection an accounting balance.
  const normalizedSigned=events.reduce((sum,x)=>sum+Number(x.signedAmount),0);
  const projectedBalance=opening+normalizedSigned;
  const receiptSummary=receipts.map(x=>({
   operationId:x.operationId,requestHash:x.requestHash,mutationType:x.mutationType,
   revision:x.revision,responseRevision:(x.response as any)?.revision??null,
  }));
  console.log('ISSUE699_NEW_ID_'+kind+'_EVENTS='+JSON.stringify(events.map(x=>({
   id:x.id,legacyTransactionId:x.legacyTransactionId,
   amount:Number(x.amount),signedAmount:Number(x.signedAmount),
   accountId:x.accountId,status:x.status,archivedAt:x.archivedAt,
  }))));
  console.log('ISSUE699_NEW_ID_'+kind+'_LEDGER='+JSON.stringify({
   entries:entries.map(x=>({id:x.id,eventId:x.eventId,accountId:x.accountId,
    debit:Number(x.debit),credit:Number(x.credit)})),count:entries.length,
   debitTotal:ledgerDebit,creditTotal:ledgerCredit,
  }));
  console.log('ISSUE699_NEW_ID_'+kind+'_BALANCES='+JSON.stringify({
   openingBalance:opening,
   ledgerBalanceBefore:opening,ledgerBalanceAfter:ledgerBalance,
   normalizedProjectedBefore:opening,normalizedProjectedAfter:projectedBalance,
   normalizedSignedTotal:normalizedSigned,
  }));
  console.log('ISSUE699_NEW_ID_'+kind+'_RECEIPTS='+JSON.stringify({
   count:receipts.length,receipts:receiptSummary,
  }));
  console.log('ISSUE699_NEW_ID_'+kind+'_RESULT='+JSON.stringify({
   firstUpstreamStatus:firstStatus,clientFirstResponse:'ABORT_TIMEOUT',
   remoteRevisionAfterFirst:refreshed.body.revision,
   secondStatus:second.status,secondError:second.body.error||null,
   finalRevision:state.revision,financialEventCount:events.length,
   originalEventPresent:Boolean(originalEvent),newEventPresent:Boolean(retriedEvent),
   ledgerCount:entries.length,
   sameFinancialIntention:true,distinctFinancialIds:true,
  }));
  assert.equal(second.status,200,'REFRESHED_RETRY_NOT_ACCEPTED');
  assert.equal(state.revision,3,'REFRESHED_RETRY_REVISION_DIFFERENT');
  assert.ok(originalEvent&&retriedEvent,'BOTH_FINANCIAL_IDS_NOT_PERSISTED');
  assert.notEqual(originalEvent.id,retriedEvent.id,'FINANCIAL_EVENTS_NOT_DISTINCT');
  assert.equal(events.length,2,'TWO_FINANCIAL_EVENTS_EXPECTED');
  assert.equal(receipts.length,kind==='PATCH'?2:0,'RECEIPT_COUNT_UNEXPECTED');
  if(kind==='PATCH')assert.notEqual(receipts[0].operationId,receipts[1].operationId);
  await prisma.workspace.delete({where:{id:workspace.id}});
 }
 console.log('ISSUE699_NEW_ID_PATCH_PUT_REAL_TIMEOUT_CHARACTERIZED=PASS');
}finally{
 if(proxy)await new Promise<void>(resolve=>proxy!.close(()=>resolve()));
 if(started)await api.close();
 await prisma.$disconnect();
 console.log('ISSUE699_NEW_ID_API_CLOSED=PASS');
}
