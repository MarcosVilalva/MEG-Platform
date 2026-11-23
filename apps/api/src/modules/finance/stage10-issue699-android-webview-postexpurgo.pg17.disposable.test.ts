/**
 * Issue #699 | Android QA WebView REAL + Fastify JWT + PG17 descartavel.
 * Prova cinco cenarios, incluindo reuso operationId depois do expurgo fisico.
 * Nao usa Android instalado, producao, APIs remotas ou dados reais.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcryptjs';
import {prisma,Prisma,LicenseStatus,UserRole,UserStatus} from '@meg/database';
import {isAllowedOrigin} from '../../cors';
import {registerAuth} from '../../plugins/auth';
import {authRoutes} from '../auth/routes';
import {appStateRoutes} from '../app-state/routes';
import {decideLegacyOutboxRejection} from '../../../../web/src/cloud-outbox-conflict-policy.js';

const db=new URL(process.env.DATABASE_URL || 'https://invalid');
assert.ok(process.env.GITHUB_ACTIONS==='true'
  && process.env.GITHUB_REPOSITORY==='MarcosVilalva/MEG-Platform'
  && process.env.ANDROID_SERIAL==='emulator-5554'
  && process.env.MEG_STAGE10_ISOLATED_PG==='1'
  && process.env.MEG_STAGE10_ISSUE699_SYNTHETIC==='1'
  && process.env.MEG_STAGE10_LEGACY_RESTORE_QA==='1'
  && process.env.MEG_STAGE10_WEB_WRITE_QA==='0'
  && process.env.NODE_ENV==='test'
  && db.protocol==='postgresql:' && db.hostname==='127.0.0.1'
  && db.port==='5432' && db.pathname==='/meg_stage10_sandbox'
  && db.username==='meg_stage10_ci',
  'ISSUE699_ANDROID_ONLY_ISOLATED_GITHUB_EMULATOR_PG17');
const t=await prisma.$queryRaw<Array<{count:bigint}>>`
  SELECT count(*)::bigint AS count FROM pg_trigger
  WHERE tgname = 'meg_stage10_receipt_purge_guard' AND NOT tgisinternal
`;
assert.equal(Number(t[0]?.count),1,'ISSUE699_ANDROID_PURGE_GUARD_MISSING');
assert.equal(isAllowedOrigin('https://localhost',[]),true);
const pkg='br.com.megfinancas.app.stage10qa';
const app=Fastify({logger:false});
let ws:WebSocket | undefined;
let forward='';
let reverse=false;
let started=false;
let nextId=0;
function adb(...args:string[]){return execFileSync('adb',args,{encoding:'utf8',timeout:15000}).trim();}
async function until<T>(fn:()=>T|Promise<T>,tag:string):Promise<T>{
  for(let i=0;i<50;i++){try{const x=await fn();if(x)return x;}catch{}await delay(700);}
  throw Error('ISSUE699_ANDROID_TIMEOUT_'+tag);
}
async function cdp(method:string,params:Record<string,unknown>={}):Promise<any>{
  assert.ok(ws,'ISSUE699_NO_DEVTOOLS');
  const id=++nextId;
  return new Promise<any>((resolve,reject)=>{
    const timer=setTimeout(()=>done(new Error('ISSUE699_CDP_TIMEOUT_'+method)),30000);
    const onMessage=({data}:MessageEvent)=>{
      let v:any;try{v=JSON.parse(String(data));}catch{return;}
      if(v.id!==id)return;
      if(v.error||v.result?.exceptionDetails)
        return done(new Error('ISSUE699_CDP_ERROR_'+JSON.stringify(v.error||v.result.exceptionDetails).slice(0,500)));
      done(null,v.result);
    };
    function done(error:Error|null,val?:unknown){
      clearTimeout(timer);ws?.removeEventListener('message',onMessage);
      if(error)reject(error);else resolve(val);
    }
    ws!.addEventListener('message',onMessage);
    ws!.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(js:string):Promise<any>{
  const result=await cdp('Runtime.evaluate',{expression:js,awaitPromise:true,returnByValue:true});
  return result?.result?.value;
}
function detach(){
  ws?.close();ws=undefined;
  if(forward){try{adb('forward','--remove','tcp:'+forward);}catch{}forward='';}
}
async function attach(){
  adb('shell','am','start','-n',pkg+'/br.com.megfinancas.app.MainActivity');
  const pid=await until(()=>adb('shell','pidof',pkg),'APP_PID');
  forward=adb('forward','tcp:0','localabstract:webview_devtools_remote_'+pid);
  const page=await until(async()=>{
    const response=await fetch('http://127.0.0.1:'+forward+'/json/list',{signal:AbortSignal.timeout(2000)});
    return (await response.json() as Array<{url:string;webSocketDebuggerUrl:string}>)
      .find(item=>item.url.startsWith('https://localhost/'));
  },'WEBVIEW_ORIGIN');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await once(ws,'open');
  assert.equal(await evaluate('location.origin'),'https://localhost');
}
async function loginUI(email:string,password:string,ownerId:string){
  const hasSession=async()=>Boolean(await evaluate(`(()=>{
    for(let i=0;i<sessionStorage.length;i++){
      try{const x=JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
        if(x?.accessToken && x?.user?.id===${JSON.stringify(ownerId)})return true;
      }catch{}
    }return false;})()`));
  if(await hasSession())return;
  await until(()=>evaluate("Boolean(document.querySelector('input[autocomplete=current-password]'))"),'LOGIN_FORM');
  await evaluate(`(()=>{
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    for(const [type,value] of Object.entries({username:${JSON.stringify(email)},
      'current-password':${JSON.stringify(password)}})){
      const el=document.querySelector('input[autocomplete='+type+']');
      if(!el)throw Error('ISSUE699_LOGIN_FIELD_'+type);
      setter.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));
    }
    const button=document.querySelector('.px-preview-submit');
    if(!button||button.disabled)throw Error('ISSUE699_LOGIN_BUTTON_NOT_READY');
    button.click();
  })()`);
  await until(hasSession,'JWT_FROM_REAL_LOGIN');
}
function webCall(path:string,method:string,body?:Record<string,unknown>){
  return evaluate(`(async()=>{
    let token;for(let i=0;i<sessionStorage.length;i++){
      try{const session=JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
        if(session?.accessToken)token=session.accessToken;}catch{}
    }
    if(!token)throw Error('ISSUE699_JWT_MISSING');
    const response=await fetch('http://127.0.0.1:3333'+${JSON.stringify(path)},
      {method:${JSON.stringify(method)},
       headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
       cache:'no-store',
       ${body===undefined?'': 'body:JSON.stringify('+JSON.stringify(body)+'),'}
      });
    return {status:response.status,body:await response.json()};
  })()`);
}

try{
  const stamp=randomUUID();
  const password='issue699qa-'+stamp;
  const owner=await prisma.user.create({data:{
    email:'issue699qa-'+stamp+'@example.invalid',name:'issue699 fictitious QA',
    passwordHash:await bcrypt.hash(password,8),role:UserRole.ADMIN,
    status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
  }});
  const plan=await prisma.plan.create({data:{
    code:'ISSUE699QA-'+stamp,name:'issue699 isolated QA',monthlyPrice:0,maxMembers:2,features:[],
  }});
  const work=await prisma.workspace.create({data:{
    ownerId:owner.id,name:'issue699 android synthetic',slug:'issue699qa-'+stamp,
    members:{create:[{userId:owner.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true}]},
    subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
    appState:{create:{userId:owner.id,revision:1,state:{
      transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'},
    } as Prisma.InputJsonValue}},
  }});
  const account=await prisma.account.create({data:{
    userId:owner.id,name:'issue699 qa checking',type:'checking',openingBalance:300,isActive:true,
  }});
  await app.register(cors,{origin(origin,cb){cb(null,isAllowedOrigin(origin,[]));},credentials:true});
  await registerAuth(app);
  await app.register(authRoutes,{prefix:'/auth'});
  await app.register(appStateRoutes,{prefix:'/app-state'});
  await app.listen({host:'127.0.0.1',port:3333});
  started=true;
  adb('reverse','tcp:3333','tcp:3333');reverse=true;
  adb('shell','am','force-stop',pkg);
  await attach();
  await loginUI(owner.email,password,owner.id);
  console.log('ISSUE699_ANDROID_REAL_WEBVIEW_JWT_LOGIN=PASS');
  const op=randomUUID(),legacyId='issue699-legacy-'+stamp;
  const tx={id:legacyId,date:'2026-11-23',description:'QA Android fictitious expense',
    type:'expense',amount:6.25,expenseAmount:6.25,status:'planned',situation:'PENDENTE',
    financialAccountId:account.id,paymentMethod:'PIX',modality:'À VISTA'};
  const original={operationId:op,expectedRevision:1,upserts:[tx],deletes:[]};

  // Real Android WebView IndexedDB keeps pending command through process death.
  await evaluate(`(async()=>{
    const payload=${JSON.stringify(original)};
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open('meg-issue699-disposable',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('outbox');
      request.onerror=()=>reject(Error('IDB_OPEN'));
      request.onsuccess=()=>{
        const db=request.result, transaction=db.transaction('outbox','readwrite');
        transaction.objectStore('outbox').put(payload,'pending');
        transaction.oncomplete=()=>{db.close();resolve(true)};
        transaction.onerror=()=>reject(Error('IDB_WRITE'));
      };
    });
  })()`);
  await cdp('Network.enable');
  await cdp('Network.emulateNetworkConditions',{
    offline:true,latency:0,downloadThroughput:0,uploadThroughput:0,
  });
  const offline=await evaluate(`(async()=>{
    try{await fetch('http://127.0.0.1:3333/app-state',{cache:'no-store'});
      return false;
    }catch{return true;}
  })()`);
  assert.equal(offline,true,'ISSUE699_WEBVIEW_NETWORK_OFFLINE_NOT_ENFORCED');
  assert.equal((await prisma.appState.findUniqueOrThrow({where:{workspaceId:work.id}})).revision,1);
  console.log('ISSUE699_ANDROID_REAL_WEBVIEW_OFFLINE_PENDING_NOT_SENT=PASS');
  await cdp('Network.emulateNetworkConditions',{
    offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1,
  });

  // Force-stop and relaunch REAL installed QA package, never Android stable.
  detach();
  adb('shell','am','force-stop',pkg);
  await attach();
  await loginUI(owner.email,password,owner.id);
  const saved=await evaluate(`(async()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('meg-issue699-disposable',1);
    request.onerror=()=>reject(Error('IDB_REOPEN'));
    request.onsuccess=()=>{
      const db=request.result,t=db.transaction('outbox','readonly'),
        q=t.objectStore('outbox').get('pending');
      q.onsuccess=()=>{db.close();resolve(q.result||null)};
      q.onerror=()=>reject(Error('IDB_READ'));
    };
  }))()`);
  assert.deepEqual(saved,original);
  console.log('ISSUE699_ANDROID_APP_RESTART_PENDING_SAME_OPERATION_ID=PASS');

  const first=await webCall('/app-state/transactions','PATCH',saved);
  assert.equal(first.status,200,JSON.stringify(first));
  const event=await prisma.financialEvent.findFirstOrThrow({
    where:{workspaceId:work.id,legacyTransactionId:legacyId},
  });
  const replay=await webCall('/app-state/transactions','PATCH',saved);
  assert.equal(replay.status,200);
  assert.equal(replay.body.replayed,true);
  const bad=await webCall('/app-state/transactions','PATCH',{
    ...saved,expectedRevision:2,upserts:[{...tx,description:'different intent'}],
  });
  assert.equal(bad.status,409);
  assert.equal(bad.body.error,'OPERATION_ID_REUSED');
  assert.equal(decideLegacyOutboxRejection(409,bad.body).action,'manual-resolution-required');
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:work.id}}),1);
  console.log('ISSUE699_ANDROID_REAL_JWT_DUPLICATE_REPLAY_PERMANENT_409=PASS');

  // Explicit delete followed by stale upsert cannot resurrect the event.
  const archived=await webCall('/app-state/transactions','PATCH',{
    operationId:randomUUID(),expectedRevision:2,upserts:[],deletes:[legacyId],
  });
  assert.equal(archived.status,200,JSON.stringify(archived));
  assert.ok((await prisma.financialEvent.findUniqueOrThrow({where:{id:event.id}})).archivedAt);
  const stale=await webCall('/app-state/transactions','PATCH',{
    operationId:randomUUID(),expectedRevision:3,upserts:[tx],deletes:[],
  });
  assert.equal(stale.status,409,JSON.stringify(stale));
  assert.equal(stale.body.error,'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE');
  assert.equal(stale.body.retryable,false);
  assert.equal(decideLegacyOutboxRejection(409,stale.body).action,'manual-resolution-required');
  assert.equal((await prisma.appState.findUniqueOrThrow({where:{workspaceId:work.id}})).revision,3);
  console.log('ISSUE699_ANDROID_ARCHIVE_STALE_REINTRODUCTION_409=PASS');

  const preview=await webCall('/app-state/legacy-restore/'+encodeURIComponent(legacyId),'GET');
  assert.equal(preview.status,200,JSON.stringify(preview));
  assert.equal(preview.body.eligible,true,JSON.stringify(preview.body));
  const restored=await webCall('/app-state/legacy-restore/'+encodeURIComponent(legacyId),'POST',{
    operationId:randomUUID(),eventId:event.id,expectedRevision:preview.body.expectedRevision,
    expectedArchivedAt:preview.body.expectedArchivedAt,
    expectedUpdatedAt:preview.body.expectedUpdatedAt,
    confirmation:'CONFIRMAR_RESTAURACAO_EXPLICITA',
  });
  assert.equal(restored.status,200,JSON.stringify(restored));
  assert.equal(restored.body.id,event.id);
  assert.equal((await prisma.financialEvent.findUniqueOrThrow({where:{id:event.id}})).archivedAt,null);
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:work.id}}),1);
  console.log('ISSUE699_ANDROID_EXPLICIT_AUTH_RESTORE_SAME_EVENT_ID=PASS');

  // Expurgo FISICO do recibo inicial em PG17: marcador impede ate cross-writer.
  const didDelete=await prisma.$executeRaw`
    DELETE FROM "CloudMutationReceipt"
    WHERE "workspaceId"=${work.id} AND "operationId"=${op}
  `;
  assert.equal(didDelete,1);
  const marker=await prisma.cloudMutationReceipt.findUniqueOrThrow({where:{
    workspaceId_operationId:{workspaceId:work.id,operationId:op},
  }});
  assert.equal(marker.requestHash,'__MEG_PURGED_OPERATION_ID__');
  assert.deepEqual(marker.response,{});
  const afterPurge=await webCall('/app-state/transactions','PATCH',{
    ...saved,expectedRevision:(await prisma.appState.findUniqueOrThrow({where:{workspaceId:work.id}})).revision,
    upserts:[{...tx,id:'issue699-forbidden-new-'+stamp}],
  });
  assert.equal(afterPurge.status,409,JSON.stringify(afterPurge));
  assert.equal(afterPurge.body.error,'OPERATION_ID_REUSED');
  assert.equal(await prisma.financialEvent.count({where:{workspaceId:work.id}}),1);
  console.log('ISSUE699_ANDROID_OPERATION_ID_REUSE_AFTER_PURGE_BLOCKED=PASS');

  await evaluate(`(async()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('meg-issue699-disposable',1);
    request.onerror=()=>reject(Error('IDB_CLEAN_OPEN'));
    request.onsuccess=()=>{
      const db=request.result,t=db.transaction('outbox','readwrite');
      t.objectStore('outbox').delete('pending');
      t.oncomplete=()=>{db.close();resolve(true)};
      t.onerror=()=>reject(Error('IDB_CLEAN'));
    };
  }))()`);
  console.log('ISSUE699_ANDROID_QA_SYNTHETIC_PENDING_CLEANED=PASS');
  console.log('ISSUE699_ANDROID_REAL_WEBVIEW_FIVE_SCENARIOS_AND_POST_PURGE=PASS');
}finally{
  detach();
  if(reverse){try{adb('reverse','--remove','tcp:3333');}catch{}}
  if(started)await app.close();
  await prisma.$disconnect();
  console.log('ISSUE699_ANDROID_API_ADB_CDP_RELEASED=PASS');
}
