/**
 * MEG #699 - NOVO gate FOCAL, exclusivo QA Android WebView real.
 * Exige Fastify + JWT + PostgreSQL 17 ficticio + corte TCP REAL por proxy.
 * Usa codigo REAL do journal Phoenix localStorage + IndexedDB, gateway Phoenix e financeClient.
 * Nao substitui homologacao da UI Novo Lancamento, nem aprova APK708 instalada.
 * Guardas falham antes de qualquer operacao de banco.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcryptjs';
import {build} from 'esbuild';
import {prisma,UserRole,UserStatus,LicenseStatus} from '@meg/database';
import {isAllowedOrigin} from '../apps/api/src/cors.ts';
import {registerAuth} from '../apps/api/src/plugins/auth.ts';
import {authRoutes} from '../apps/api/src/modules/auth/routes.ts';
import {financeRoutes} from '../apps/api/src/modules/finance/routes.ts';
import {createLoopbackFaultProxy} from './meg-stage10-issue699-transport-fault-proxy.qa.mjs';

const db=new URL(process.env.DATABASE_URL||'https://invalid');
assert.ok(
  process.env.GITHUB_ACTIONS==='true'
  &&process.env.GITHUB_REPOSITORY==='MarcosVilalva/MEG-Platform'
  &&process.env.ANDROID_SERIAL==='emulator-5554'
  &&process.env.MEG_STAGE10_ISOLATED_PG==='1'
  &&process.env.MEG_STAGE10_G699_REAL_OFFLINE==='1'
  &&process.env.MEG_STAGE10_G699_REAL_PHOENIX==='1'
  &&process.env.MEG_STAGE10_WEB_WRITE_QA==='0'
  &&process.env.NODE_ENV==='test'
  &&db.protocol==='postgresql:'
  &&db.hostname==='127.0.0.1'
  &&db.port==='5432'
  &&db.pathname==='/meg_stage10_sandbox'
  &&db.username==='meg_stage10_ci',
 'G699_ONLY_GITHUB_EMULATOR_AND_DISPOSABLE_PG17'
);
assert.equal(isAllowedOrigin('https://localhost',[]),true);
const pkg='br.com.megfinancas.app.stage10qa';
const app=Fastify({logger:false});
let proxy,apiStarted=false,reverse=false,forward='',socket,requestId=0,qaDbName='';
function adb(...args){return execFileSync('adb',args,{encoding:'utf8',timeout:15000}).trim();}
async function until(fn,reason){
 for(let i=0;i<48;i++){try{const x=await fn();if(x)return x;}catch{}await delay(650);}
 throw Error('G699_TIMEOUT_'+reason);
}
async function disconnect(){
 try{socket?.close();}catch{}
 socket=undefined;
 if(forward){try{adb('forward','--remove','tcp:'+forward);}catch{}forward='';}
}
async function connect(){
 await disconnect();
 const pid=await until(()=>adb('shell','pidof',pkg),'QA_PROCESS');
 forward=adb('forward','tcp:0','localabstract:webview_devtools_remote_'+pid);
 const target=await until(async()=>{
  const r=await fetch('http://127.0.0.1:'+forward+'/json/list',{signal:AbortSignal.timeout(2000)});
  return (await r.json()).find(x=>x.url?.startsWith('https://localhost/'));
 },'QA_WEBVIEW');
 socket=new WebSocket(target.webSocketDebuggerUrl);await once(socket,'open');
 await until(()=>evaluate("(()=>{try{return location.origin==='https://localhost'&&document.readyState==='complete'}catch{return false}})()"),'QA_WEBVIEW_READY');
}
async function evaluate(expression){
 assert(socket,'G699_CDP_NOT_CONNECTED');
 const id=++requestId;
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>finish(Error('G699_CDP_TIMEOUT')),30000);
  const onMessage=({data})=>{
   const reply=JSON.parse(String(data));if(reply.id!==id)return;
   if(reply.error||reply.result?.exceptionDetails)
    return finish(Error('G699_CDP_EVAL_ERROR:'+JSON.stringify(reply.error||reply.result.exceptionDetails).slice(0,500)));
   finish(null,reply.result?.result?.value);
  };
  function finish(err,value){
   clearTimeout(timeout);socket.removeEventListener('message',onMessage);
   if(err)reject(err);else resolve(value);
  }
  socket.addEventListener('message',onMessage);
  socket.send(JSON.stringify({id,method:'Runtime.evaluate',
   params:{expression,awaitPromise:true,returnByValue:true}}));
 });
}
async function login(email,password,id){
 const hasToken=()=>evaluate(`(()=>{for(let i=0;i<sessionStorage.length;i++)
 {try{const p=JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
 if(p?.accessToken&&p?.user?.id===${JSON.stringify(id)})return true;}catch{}}return false;})()`);
 if(await hasToken())return;
 await until(()=>evaluate("Boolean(document.querySelector('input[autocomplete=current-password]'))"),'LOGIN_FORM');
 await evaluate(`(()=>{
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  for(const [name,v] of Object.entries({username:${JSON.stringify(email)},
    'current-password':${JSON.stringify(password)}})){
   const el=document.querySelector('input[autocomplete='+name+']');
   if(!el)throw Error('G699_LOGIN_INPUT_MISSING');
   setter.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));
  }
  const btn=document.querySelector('.px-preview-submit');
  if(!btn||btn.disabled)throw Error('G699_LOGIN_BUTTON_NOT_READY');
  btn.click();
 })()`);
 await until(hasToken,'JWT_SESSION');
}
const apiCall=(path,body)=>evaluate(`(async()=>{
 let token;for(let i=0;i<sessionStorage.length;i++){
  try{const s=JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
  if(s?.accessToken)token=s.accessToken;}catch{}
 }
 if(!token)throw Error('G699_NO_JWT');
 let res;
 try{
  res=await fetch('http://127.0.0.1:3333'+${JSON.stringify(path)},{
   method:'POST',
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',
    'X-MEG-Expected-Workspace-Id':${JSON.stringify(globalThis.__g699workspace||'')}},
   body:JSON.stringify(${JSON.stringify(body)}),cache:'no-store',
   signal:AbortSignal.timeout(8000)});
 }catch(e){return {networkError:true,error:String(e)};}
 const raw=await res.text();
 let parsed;
 try{parsed=JSON.parse(raw);}
 catch{throw Error('G699_NON_JSON_HTTP_RESPONSE_'+res.status);}
 return {networkError:false,status:res.status,data:parsed};
})()`);

const journalKey='meg.phoenix.create.attempt.v1';
const generationKey='meg.phoenix.create.generation.v1';
const bundleEntry=[
 "import {preparePhoenixSimpleEvent,runPhoenixSimpleEventWrite} from './apps/web/src/phoenix/data/phoenix-write-gateway.ts';",
 "import {withPhoenixCreateJournalLock,reservePhoenixCreate,findPhoenixCreatePending,",
 " notePhoenixCreateReceipt,finishPhoenixCreate,canExplicitlyReplayPhoenixCreate} from './apps/web/src/phoenix/data/phoenix-create-attempt-journal.ts';",
 "import {findPhoenixCanonicalEvent} from './apps/web/src/phoenix/data/phoenix-accepted-create-readback.ts';",
 "import {readDurableOutboxStrict} from './apps/web/src/durable-outbox-store.js';",
 "import {financeClient} from './apps/web/src/app/finance-client.ts';",
 "import {readSession} from './apps/web/src/app/auth-client.ts';",
 "globalThis.__g699Phoenix={preparePhoenixSimpleEvent,runPhoenixSimpleEventWrite,withPhoenixCreateJournalLock,",
 " reservePhoenixCreate,findPhoenixCreatePending,notePhoenixCreateReceipt,finishPhoenixCreate,",
 " canExplicitlyReplayPhoenixCreate,findPhoenixCanonicalEvent,readDurableOutboxStrict,financeClient,readSession};"
].join('\n');
const mocks=new Map([
 ['./load-phoenix-read-model',
  "export async function invalidatePhoenixReadModelMonth(){}\n"
  +"export async function loadPhoenixReadModel(){throw Error('G699_NO_UI_READ_MODEL');}\n"
  +"export function peekPhoenixReadModel(){return null;}\n"
  +"export function clearPhoenixReadModelCache(){}"],
 ['../../app/cards-client',"export const cardsClient={};"]
]);
const compiled=await build({
 stdin:{contents:bundleEntry,resolveDir:process.cwd(),sourcefile:'g699-journal-qa-entry.js',loader:'js'},
 bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',logLevel:'silent',
 define:{'import.meta.env':JSON.stringify({
  VITE_STAGE10_ANDROID_CONFIRMATION_QA:'true',
  VITE_API_URL:'http://127.0.0.1:3333',
  VITE_PHOENIX_SIMPLE_EVENT_WRITE:'enabled',
  VITE_PHOENIX_CARD_PURCHASE_WRITE:'disabled',
  VITE_PHOENIX_BENEFIT_WRITE:'disabled',
  VITE_PHOENIX_TRANSFER_WRITE:'disabled',
  VITE_PHOENIX_BULK_EVENT_WRITE:'disabled',
 })},
 plugins:[{name:'g699-nonfinancial-imports-only',setup(api){
  api.onResolve({filter:/.*/},a=>mocks.has(a.path)?{path:a.path,namespace:'g699-stub'}:undefined);
  api.onLoad({filter:/.*/,namespace:'g699-stub'},a=>({contents:mocks.get(a.path),loader:'js'}));
 }}]
});
const bundle=compiled.outputFiles[0].text;
for(const marker of ['PHOENIX_JOURNAL_STORES_DIVERGED','PHOENIX_CREATE_UNCONFIRMED','/finance/events']){
 assert.ok(bundle.includes(marker),'G699_REAL_BUNDLE_MISSING_'+marker);
}
console.log('G699_REAL_PHOENIX_JOURNAL_GATEWAY_FINANCE_CLIENT_BUNDLED=PASS');
const dataInput=String.raw`
const input={type:'expense',status:'paid',description:c.description,date:c.date,
 amount:c.amount,accountId:c.accountId,categoryId:c.categoryId,
 paymentMethodId:c.paymentMethodId};
const context={userId:c.userId,workspaceId:c.workspaceId,
 apiUrl:'http://127.0.0.1:3333',storage:localStorage};
`;
async function phoenixPhase(fragment,values){
 const expression='(async()=>{const c='+JSON.stringify(values)+';'+bundle+
   'const r=globalThis.__g699Phoenix;'+dataInput+fragment+'})()';
 return evaluate(expression);
}
const phaseReserve=String.raw`
if(r.findPhoenixCreatePending(localStorage))throw Error('G699_PRIOR_JOURNAL_PRESENT');
if(await r.readDurableOutboxStrict('phoenix-create-journal'))throw Error('G699_PRIOR_DURABLE_JOURNAL_PRESENT');
const prepared=r.preparePhoenixSimpleEvent(input);
const reserved=await r.withPhoenixCreateJournalLock(()=>
 r.reservePhoenixCreate(context,'monetary',prepared.payload,prepared.operationId));
if(reserved.status!=='new')throw Error('G699_JOURNAL_NEW_RESERVE_FAILED');
const durable=await r.readDurableOutboxStrict('phoenix-create-journal');
const local=JSON.parse(localStorage.getItem('meg.phoenix.create.attempt.v1')||'null');
if(!durable||JSON.stringify(durable)!==JSON.stringify(local)||
 local.operationId!==reserved.record.operationId)throw Error('G699_JOURNAL_DOUBLE_DURABILITY_FAILED');
return {operationId:local.operationId,durable:true};
`;
const phaseWrite=String.raw`
const prepared=r.preparePhoenixSimpleEvent(input,c.operationId);
const result=await r.runPhoenixSimpleEventWrite(prepared,'2026-11',undefined,undefined,c.workspaceId);
const pending=r.findPhoenixCreatePending(localStorage);
const durable=await r.readDurableOutboxStrict('phoenix-create-journal');
return {status:result.status,code:result.code,
 operationId:result.operationId,eventId:result.event?.id,
 idempotentReplay:result.event?.idempotentReplay===true,
 pending,durableOperationId:durable?.operationId};
`;
const phaseRestart=String.raw`
const original=c.operationId;
const durable=await r.readDurableOutboxStrict('phoenix-create-journal');
if(durable?.operationId!==original)throw Error('G699_REAL_IDB_LOST_AFTER_RESTART');
localStorage.removeItem('meg.phoenix.create.attempt.v1');
const prepared=r.preparePhoenixSimpleEvent(input);
const reservation=await r.withPhoenixCreateJournalLock(()=>
 r.reservePhoenixCreate(context,'monetary',prepared.payload,prepared.operationId));
if(reservation.status!=='same'||reservation.record.operationId!==original)
 throw Error('G699_REAL_JOURNAL_NOT_RECOVERED');
const local=JSON.parse(localStorage.getItem('meg.phoenix.create.attempt.v1')||'null');
if(local?.operationId!==original)throw Error('G699_REAL_JOURNAL_NOT_REHYDRATED');
const other=await r.withPhoenixCreateJournalLock(()=>
 r.reservePhoenixCreate(context,'monetary',{...prepared.payload,amount:99.99},
 'g699-different-operation-intent'));
if(other.status!=='blocked'||other.reason!=='DIFFERENT_INTENT')
 throw Error('G699_REAL_DIFFERENT_INTENT_NOT_BLOCKED');
if(!r.canExplicitlyReplayPhoenixCreate(reservation.record))
 throw Error('G699_REAL_RETRY_WINDOW_EXPIRED');
return {operationId:original,recovered:true,blocked:true};
`;
const phaseReplay=String.raw`
const existing=JSON.parse(localStorage.getItem('meg.phoenix.create.attempt.v1')||'null');
if(existing?.operationId!==c.operationId)throw Error('G699_REAL_ORIGINAL_ID_MISSING');
const prepared=r.preparePhoenixSimpleEvent(input,existing.operationId);
const result=await r.runPhoenixSimpleEventWrite(prepared,'2026-11',undefined,undefined,c.workspaceId);
if(result.status!=='accepted'||result.operationId!==existing.operationId||
 !result.event?.id||result.event?.idempotentReplay!==true)
 throw Error('G699_REAL_CANONICAL_REPLAY_NOT_ACCEPTED_'+result.status+'_'+result.code);
const recorded=await r.withPhoenixCreateJournalLock(()=>
 r.notePhoenixCreateReceipt(context,existing,result.event));
const proof=await r.findPhoenixCanonicalEvent({
 expectedUserId:c.userId,eventId:result.event.id,
 currentUserId:()=>r.readSession()?.user?.id,
 getHistory:(signal)=>r.financeClient.getHistorySnapshot(signal),
 listPage:(page,size,signal)=>r.financeClient.listEvents(page,size,'',signal),
 signal:new AbortController().signal,
});
if(proof.status!=='found'||proof.event.id!==result.event.id)
 throw Error('G699_CANONICAL_READBACK_NOT_FOUND_'+proof.status+'_'+proof.reason);
await r.withPhoenixCreateJournalLock(()=>
 r.finishPhoenixCreate(context,recorded,proof.event));
if(r.findPhoenixCreatePending(localStorage)||
 await r.readDurableOutboxStrict('phoenix-create-journal'))
 throw Error('G699_REAL_JOURNAL_NOT_CLEARED');
localStorage.removeItem('meg.phoenix.create.generation.v1');
const keys=[];
for(let i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
for(const key of keys)if(key.startsWith('meg.phoenix.create-qa.v1.'))localStorage.removeItem(key);
return {eventId:result.event.id,operationId:result.operationId,
 canonical:true,durableCleared:true,idempotentReplay:true};
`;

async function counts(ws,op){
 const events=await prisma.financialEvent.findMany({where:{workspaceId:ws}});
 const receipts=await prisma.cloudMutationReceipt.count({where:{workspaceId:ws,operationId:op}});
 const ledgers=await prisma.ledgerEntry.count({where:{eventId:{in:events.map(e=>e.id)}}});
 return {events,receipts,ledgers};
}
try{
 const token=randomUUID(),email='g699-'+token+'@example.invalid',password='g699-'+token;
 qaDbName='meg-g699-disposable-'+token;
 const owner=await prisma.user.create({data:{
  email,name:'G699 fictitious',passwordHash:await bcrypt.hash(password,8),
  role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date()
 }});
 const plan=await prisma.plan.create({data:{
  code:'G699-'+token,name:'G699 sandbox',monthlyPrice:0,maxMembers:2,features:[]
 }});
 const ws=await prisma.workspace.create({data:{
  ownerId:owner.id,slug:'g699-'+token,name:'G699 sandbox',
  members:{create:{userId:owner.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}},
  subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
  appState:{create:{userId:owner.id,revision:1,state:{transactions:[],budgets:{}}}}
 }});
 globalThis.__g699workspace=ws.id;
 const account=await prisma.account.create({data:{
  userId:owner.id,name:'G699 checking',type:'checking',openingBalance:500,isActive:true
 }});
 const category=await prisma.category.create({data:{
  userId:owner.id,name:'G699 category',type:'expense',group:'QA',isActive:true
 }});
 const method=await prisma.paymentMethod.create({data:{
  userId:owner.id,name:'G699 PIX',type:'instant',isActive:true
 }});
 await app.register(cors,{origin(origin,cb){cb(null,isAllowedOrigin(origin,[]));},credentials:true});
 await registerAuth(app);
 await app.register(authRoutes,{prefix:'/auth'});
 await app.register(financeRoutes,{prefix:'/finance'});
 await app.listen({host:'127.0.0.1',port:3334});apiStarted=true;
 proxy=await createLoopbackFaultProxy({targetPort:3334,listenPort:3333});
 adb('reverse','tcp:3333','tcp:3333');reverse=true;
 adb('shell','am','force-stop',pkg);
 adb('shell','am','start','-n',pkg+'/br.com.megfinancas.app.MainActivity');
 await connect();await login(owner.email,password,owner.id);

 const input={
  userId:owner.id,workspaceId:ws.id,
  description:'G699 Phoenix real journal canonical writer',
  type:'expense',status:'paid',date:'2026-11-24',amount:12.35,
  accountId:account.id,categoryId:category.id,paymentMethodId:method.id,
 };
 const initial=await phoenixPhase(phaseReserve,input);
 assert.equal(initial.durable,true);
 const op=initial.operationId;
 assert.match(op,/^[a-z0-9-]{6,128}$/i);
 console.log('G699_PHOENIX_REAL_JOURNAL_LOCAL_AND_INDEXEDDB=PASS');

 proxy.setMode('offline');
 const offline=await phoenixPhase(phaseWrite,{...input,operationId:op});
 assert.equal(offline.status,'error',JSON.stringify(offline));
 assert.equal(offline.code,'PHOENIX_CREATE_UNCONFIRMED');
 assert.equal(offline.pending,true);
 assert.equal(offline.durableOperationId,op);
 assert(proxy.metrics().blocked>=1);
 let c=await counts(ws.id,op);
 assert.equal(c.events.length,0);
 assert.equal(c.ledgers,0);
 assert.equal(c.receipts,0);
 console.log('G699_PHOENIX_REAL_OFFLINE_FAIL_CLOSED=PASS');

 proxy.setMode('lost-ack');
 const lost=await phoenixPhase(phaseWrite,{...input,operationId:op});
 assert.equal(lost.status,'error',JSON.stringify(lost));
 assert.equal(lost.code,'PHOENIX_CREATE_UNCONFIRMED');
 assert.equal(lost.pending,true);
 assert.equal(lost.durableOperationId,op);
 assert(proxy.metrics().droppedAck>=1);
 c=await counts(ws.id,op);
 assert.equal(c.events.length,1);
 assert.equal(c.ledgers,1);
 assert.equal(c.receipts,1);
 const eventId=c.events[0].id;
 console.log('G699_PHOENIX_REAL_LOST_ACK_SINGLE_COMMIT=PASS');

 await disconnect();
 adb('shell','am','force-stop',pkg);
 await delay(850);
 proxy.setMode('online');
 adb('shell','am','start','-n',pkg+'/br.com.megfinancas.app.MainActivity');
 await connect();
 await login(owner.email,password,owner.id);
 const recovery=await phoenixPhase(phaseRestart,{...input,operationId:op});
 assert.equal(recovery.recovered,true);
 assert.equal(recovery.blocked,true);
 c=await counts(ws.id,op);
 assert.equal(c.events.length,1);
 assert.equal(c.ledgers,1);
 assert.equal(c.receipts,1);
 console.log('G699_PHOENIX_REAL_RESTART_IDB_REHYDRATED_NO_AUTO_POST=PASS');

 const replay=await phoenixPhase(phaseReplay,{...input,operationId:op});
 assert.equal(replay.eventId,eventId);
 assert.equal(replay.operationId,op);
 assert.equal(replay.durableCleared,true);
 assert.equal(replay.canonical,true);
 c=await counts(ws.id,op);
 assert.equal(c.events.length,1);
 assert.equal(c.ledgers,1);
 assert.equal(c.receipts,1);
 console.log('G699_PHOENIX_REAL_EXPLICIT_REPLAY_CANONICAL_READBACK_AND_CLEAR=PASS');

 const changed=await apiCall('/finance/events',{
  ...input,userId:undefined,workspaceId:undefined,
  operationId:op,amount:99.99
 });
 assert.equal(changed.networkError,false,JSON.stringify(changed));
 assert.equal(changed.status,409);
 assert.equal(changed.data.error,'OPERATION_ID_REUSED');
 c=await counts(ws.id,op);
 assert.equal(c.events.length,1);
 assert.equal(c.ledgers,1);
 assert.equal(c.receipts,1);
 console.log('G699_PHOENIX_REAL_CHANGED_PAYLOAD_409_NO_DUPLICATE=PASS');

 console.log('G699_PHOENIX_JOURNAL_CANONICAL_WEBVIEW_JWT_PG17_GATE=PASS');
 console.log('G699_FULL_UI_VISUAL_ANDROID_STABLE=NOT_TESTED');

}finally{
 if(proxy)proxy.setMode('online');
 await disconnect();
 if(reverse)try{adb('reverse','--remove','tcp:3333');}catch{}
 await proxy?.close();
 if(apiStarted)await app.close();
 await prisma.$disconnect();
 console.log('G699_PHOENIX_QA_API_PROXY_ADB_CDP_CLEANUP_ATTEMPTED=TRUE');
}
