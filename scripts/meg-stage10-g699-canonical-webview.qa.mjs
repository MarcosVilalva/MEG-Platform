/**
 * MEG #699 - NOVO gate FOCAL, exclusivo QA Android WebView real.
 * Exige Fastify + JWT + PostgreSQL 17 ficticio + corte TCP REAL por proxy.
 * Usa IndexedDB REAL com envelope de fixture, NAO o journal Phoenix da UI.
 * Nao concede homologacao funcional nem visual da tela.
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
async function savePending(payload){
 return evaluate(`(async()=>{
 const name=${JSON.stringify(qaDbName)};
 const db=await new Promise((resolve,reject)=>{
  const r=indexedDB.open(name,1);
  r.onupgradeneeded=()=>r.result.createObjectStore('pending');
  r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result);
 });
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('pending','readwrite');
  tx.objectStore('pending').put(${JSON.stringify(payload)},'intent');
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);
 });}finally{db.close();}
 })()`);
}
async function readPending(){
 return evaluate(`(async()=>{
 const db=await new Promise((resolve,reject)=>{
  const r=indexedDB.open(${JSON.stringify(qaDbName)},1);
  r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result);
 });
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('pending','readonly');
  const r=tx.objectStore('pending').get('intent');
  r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);
 });}finally{db.close();}
 })()`);
}
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
 const operationId=randomUUID();
 const payload={
  operationId,description:'G699 isolated real canonical writer',type:'expense',
  status:'paid',date:'2026-11-24',competence:'2026-11',
  amount:12.35,accountId:account.id,categoryId:category.id,paymentMethodId:method.id
 };
 assert.equal(await savePending(payload),true);
 assert.equal((await readPending())?.operationId,operationId);

 proxy.setMode('offline');
 const offline=await apiCall('/finance/events',payload);
 assert.equal(offline.networkError,true,'G699_OFFLINE_HTTP_RESPONSE_RECEIVED');
 assert(proxy.metrics().blocked>=1,'G699_PROXY_NEVER_BLOCKED');
 let c=await counts(ws.id,operationId);
 assert.equal(c.events.length,0);assert.equal(c.ledgers,0);assert.equal(c.receipts,0);
 console.log('G699_ANDROID_WEBVIEW_REAL_OFFLINE_NO_CANONICAL_WRITE=PASS');

 proxy.setMode('lost-ack');
 const lost=await apiCall('/finance/events',payload);
 assert.equal(lost.networkError,true,'G699_LOST_ACK_RETURNED_HTTP_SUCCESS');
 assert(proxy.metrics().droppedAck>=1,'G699_ACK_WAS_NOT_DROPPED');
 c=await counts(ws.id,operationId);
 assert.equal(c.events.length,1);assert.equal(c.ledgers,1);assert.equal(c.receipts,1);
 const firstId=c.events[0].id;
 console.log('G699_ANDROID_WEBVIEW_LOST_ACK_AFTER_CANONICAL_COMMIT=PASS');

 await disconnect();adb('shell','am','force-stop',pkg);await delay(800);
 proxy.setMode('online');
 adb('shell','am','start','-n',pkg+'/br.com.megfinancas.app.MainActivity');
 await connect();await login(owner.email,password,owner.id);
 const recovered=await readPending();
 assert.deepEqual(recovered,payload,'G699_OPERATION_INTENT_LOST_AFTER_RESTART');
 const replay=await apiCall('/finance/events',recovered);
 assert.equal(replay.networkError,false,JSON.stringify(replay));
 assert.equal(replay.status,201,JSON.stringify(replay));
 assert.equal(replay.data.id,firstId);
 assert.equal(replay.data.idempotentReplay,true);
 c=await counts(ws.id,operationId);
 assert.equal(c.events.length,1);assert.equal(c.ledgers,1);assert.equal(c.receipts,1);
 console.log('G699_ANDROID_WEBVIEW_RESTART_SAME_OPERATION_CANONICAL_REPLAY=PASS');

 const changed=await apiCall('/finance/events',{...payload,amount:99.99});
 assert.equal(changed.status,409);assert.equal(changed.data.error,'OPERATION_ID_REUSED');
 c=await counts(ws.id,operationId);
 assert.equal(c.events.length,1);assert.equal(c.ledgers,1);assert.equal(c.receipts,1);
 console.log('G699_ANDROID_WEBVIEW_CHANGED_PAYLOAD_409_NO_DUPLICATE=PASS');

 await evaluate(`(async()=>new Promise((resolve,reject)=>{
  const r=indexedDB.deleteDatabase(${JSON.stringify(qaDbName)});
  r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error);
 }))()`);
 qaDbName='';
 console.log('G699_WEBVIEW_CANONICAL_API_TRANSPORT_FIXTURE_GATE=PASS');
 console.log('G699_PHOENIX_APP_JOURNAL_AND_UI_HOMOLOGATION=NOT_TESTED');
}finally{
 if(proxy)proxy.setMode('online');
 if(qaDbName&&socket){
  try{await evaluate(`(async()=>new Promise((resolve,reject)=>{
   const r=indexedDB.deleteDatabase(${JSON.stringify(qaDbName)});
   r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error);
  }))()`);}catch{console.log('G699_QA_INDEXEDDB_CLEANUP_UNVERIFIED');}
 }
 await disconnect();
 if(reverse)try{adb('reverse','--remove','tcp:3333');}catch{}
 await proxy?.close();
 if(apiStarted)await app.close();
 await prisma.$disconnect();
 console.log('G699_API_PROXY_ADB_CDP_CLEANUP_ATTEMPTED=TRUE');
}
