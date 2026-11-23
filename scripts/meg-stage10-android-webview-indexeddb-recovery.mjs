import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'esbuild';

// PT210: Android WebView real da APK .stage10qa, sem login, API ou valores reais.
// Usa IndexedDB existente com kinds TESTE prefixados e faz limpeza dos mesmos.
assert.equal(process.env.ANDROID_SERIAL,'emulator-5554');
assert.equal(process.env.GITHUB_ACTIONS,'true');
const pkg='br.com.megfinancas.app.stage10qa';
const activity=pkg+'/br.com.megfinancas.app.MainActivity';
const source=readFileSync('apps/web/src/instant-persistence.js','utf8');
function section(from,to){
  const a=source.indexOf(from),b=source.indexOf(to,a+from.length);
  assert.ok(a>=0 && b>a,'PT210_SOURCE_FUNCTION_NOT_FOUND: '+from);
  return source.slice(a,b);
}
const funcs=[
  section('function readStateOutboxConflict(', '\nasync function parkStateOutboxConflict('),
  section('async function parkStateOutboxConflict(', '\nfunction enqueueDurableWrite('),
  section('async function initializeDurableOutboxes(', '\nconst durableReadyPromise'),
].join('\n');
const compiled=await build({
  stdin:{
    contents:`import { readDurableOutbox, protectDurableOutbox, deleteDurableOutboxIfGeneration } from './apps/web/src/durable-outbox-store.js';
import {normalizeStateOutbox,reconcileTransactionOutboxes,reconcileStateOutboxes,emptyTransactionOutbox} from './apps/web/src/durable-outbox-core.js';
import {hasTransactionOperations} from './apps/web/src/cloud-write-ahead-core.js';
globalThis.__pt210_real={readDurableOutbox,protectDurableOutbox,deleteDurableOutboxIfGeneration,normalizeStateOutbox,reconcileTransactionOutboxes,reconcileStateOutboxes,emptyTransactionOutbox,hasTransactionOperations};`,
    resolveDir:process.cwd(),sourcefile:'pt210-source-bundle.js',loader:'js',
  },
  bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',logLevel:'silent',
});
assert.equal(compiled.outputFiles.length,1);
const bundle=compiled.outputFiles[0].text;
assert.ok(bundle.includes('meg-financas-durable-sync'));
assert.ok(bundle.includes('pending-outboxes'));

function adb(...args){return execFileSync('adb',args,{encoding:'utf8',timeout:15000}).trim();}
async function until(fn,label){
  for(let i=0;i<48;i++){
    try{const out=await fn();if(out)return out;}catch{}
    await delay(700);
  }
  throw Error('PT210_TIMEOUT: '+label);
}
let socket=null,forward=null,id=0;
async function disconnect(){
  try{socket?.close();}catch{}
  socket=null;
  if(forward){try{adb('forward','--remove','tcp:'+forward);}catch{}forward=null;}
}
async function connect(){
  const pid=await until(()=>adb('shell','pidof',pkg),'WebView QA PID');
  forward=adb('forward','tcp:0','localabstract:webview_devtools_remote_'+pid);
  const target=await until(async()=>{
    const r=await fetch('http://127.0.0.1:'+forward+'/json/list',{signal:AbortSignal.timeout(2000)});
    return (await r.json()).find(x=>x.url?.startsWith('https://localhost/'));
  },'WebView DevTools');
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await once(socket,'open');
}
async function evaluate(expression){
  const requestId=++id;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>done(Error('PT210_CDP_EVALUATION_TIMEOUT')),15000);
    const handler=({data})=>{
      const result=JSON.parse(data);
      if(result.id!==requestId)return;
      if(result.error || result.result?.exceptionDetails){
        return done(Error('PT210_EVALUATION_ERROR: '+JSON.stringify(result.error??result.result?.exceptionDetails).slice(0,450)));
      }
      done(null,result.result.result.value);
    };
    function done(error,result){
      clearTimeout(timer);
      socket.removeEventListener('message',handler);
      if(error)reject(error);else resolve(result);
    }
    socket.addEventListener('message',handler);
    socket.send(JSON.stringify({id:requestId,method:'Runtime.evaluate',
      params:{expression,returnByValue:true,awaitPromise:true}}));
  });
}
const prefix='pt210-synthetic-';
const guard=`const PFX=${JSON.stringify(prefix)};
const STATE_OUTBOX_KEY=PFX+'state-local';
const STATE_OUTBOX_CONFLICT_KEY=PFX+'conflict-local';
const STATE_OUTBOX_CONFLICT_KIND='state-properties-conflict';
const OUTBOX_KEY=PFX+'transactions-local';
const {readDurableOutbox:rawRead,protectDurableOutbox:rawProtect,
deleteDurableOutboxIfGeneration:rawDelete,normalizeStateOutbox,
reconcileTransactionOutboxes,reconcileStateOutboxes,emptyTransactionOutbox,
hasTransactionOperations}=globalThis.__pt210_real;
const readDurableOutbox=(kind)=>rawRead(PFX+kind);
const protectOutbox=(kind,v)=>rawProtect(PFX+kind,v);
const readOutbox=()=>emptyTransactionOutbox();
const readStateOutbox=()=>normalizeStateOutbox(JSON.parse(localStorage.getItem(STATE_OUTBOX_KEY)||'null'));
const hasStateOutbox=(value=readStateOutbox())=>Boolean(value.properties && Object.keys(value.properties).length);
const parseJson=(v)=>{try{return JSON.parse(v||'null')}catch{return null}};
const sameValue=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const setSyncStatus=()=>{},showPersistenceBlocker=()=>{},parkedOutboxMessage=()=>'',CustomEvent=globalThis.CustomEvent;
const window={MEG_APP:{},dispatchEvent(){}};
let unpersistedStateOutboxConflict=null,durableHydrationRunning=true;
${funcs}
`;
function code(phase){
  const body=phase===1?`
const pending={generation:210,operationId:'00000000-0000-4000-a000-000000000210',
properties:{qaPreference:{value:'pt210-private-emulator'}},updatedAt:'2026-11-23T15:00:00.000Z'};
localStorage.setItem(STATE_OUTBOX_KEY,JSON.stringify(pending));
const created=await protectOutbox('state-properties',pending);
await parkStateOutboxConflict(pending,'OPERATION_ID_REUSED');
const marker=await readDurableOutbox(STATE_OUTBOX_CONFLICT_KIND);
const state=await readDurableOutbox('state-properties');
return {protected:created.protected,markerCode:marker?.code,operationId:state?.operationId,
conflict:readStateOutboxConflict(pending)?.code};`
:`
localStorage.removeItem(STATE_OUTBOX_KEY);
localStorage.removeItem(STATE_OUTBOX_CONFLICT_KEY);
const stateBefore=await readDurableOutbox('state-properties');
const markerBefore=await readDurableOutbox(STATE_OUTBOX_CONFLICT_KIND);
await initializeDurableOutboxes();
const state=readStateOutbox(),marker=readStateOutboxConflict(state);
const localRestored=Boolean(localStorage.getItem(STATE_OUTBOX_KEY)&&localStorage.getItem(STATE_OUTBOX_CONFLICT_KEY));
localStorage.setItem(STATE_OUTBOX_CONFLICT_KEY,JSON.stringify({...marker,operationId:'conflicting-local-only'}));
await initializeDurableOutboxes();
const divergent=readStateOutboxConflict(readStateOutbox())?.code;
localStorage.removeItem(STATE_OUTBOX_KEY);
localStorage.removeItem(STATE_OUTBOX_CONFLICT_KEY);
const removedState=await rawDelete(PFX+'state-properties',210);
const removedMarker=await rawDelete(PFX+STATE_OUTBOX_CONFLICT_KIND,210);
const afterState=await readDurableOutbox('state-properties');
const afterMarker=await readDurableOutbox(STATE_OUTBOX_CONFLICT_KIND);
return {stateBefore:stateBefore?.operationId,markerBefore:markerBefore?.code,
state:state.operationId,marker:marker?.code,localRestored,divergent,
removedState,removedMarker,afterState:afterState===null,afterMarker:afterMarker===null};`;
  return '(async()=>{' + bundle + guard + body + '})()';
}
let firstSuccess=false,restartSuccess=false,clean=false;
try{
  adb('shell','am','start','-n',activity);
  await connect();
  await until(()=>evaluate("(()=>{try{return location.origin==='https://localhost' && document.readyState==='complete' && typeof localStorage.getItem==='function'}catch{return false}})()"),'STABLE_QA_WEBVIEW_ORIGIN_AND_STORAGE');
  const first=await evaluate(code(1));
  assert.deepEqual(first,{
    protected:true,markerCode:'OPERATION_ID_REUSED',
    operationId:'00000000-0000-4000-a000-000000000210',conflict:'OPERATION_ID_REUSED',
  });
  firstSuccess=true;
  console.log('PT210_ANDROID_WEBVIEW_REAL_INDEXEDDB_MARKER_PERSISTED=PASS');
  await disconnect();
  adb('shell','am','force-stop',pkg);
  await delay(900);
  adb('shell','am','start','-n',activity);
  await connect();
  await until(()=>evaluate("(()=>{try{return location.origin==='https://localhost' && document.readyState==='complete' && typeof localStorage.getItem==='function'}catch{return false}})()"),'STABLE_QA_WEBVIEW_ORIGIN_AND_STORAGE');
  const second=await evaluate(code(2));
  assert.equal(second.stateBefore,first.operationId);
  assert.equal(second.markerBefore,'OPERATION_ID_REUSED');
  assert.equal(second.state,first.operationId);
  assert.equal(second.marker,'OPERATION_ID_REUSED');
  assert.equal(second.localRestored,true);
  assert.equal(second.divergent,'STATE_OUTBOX_CONFLICT_STORES_DIVERGED');
  restartSuccess=true;
  console.log('PT210_ANDROID_WEBVIEW_PROCESS_RESTART_AND_LOCALSTORAGE_LOSS=PASS');
  console.log('PT210_ANDROID_WEBVIEW_CONFLICT_STORES_FAIL_CLOSED=PASS');
  assert.equal(second.removedState,true);
  assert.equal(second.removedMarker,true);
  assert.equal(second.afterState,true);
  assert.equal(second.afterMarker,true);
  clean=true;
  console.log('PT210_ANDROID_WEBVIEW_SYNTHETIC_STORAGE_CLEANED=PASS');
}finally{
  await disconnect();
}
assert.ok(firstSuccess&&restartSuccess&&clean);
console.log('PT210_ANDROID_WEBVIEW_INDEXEDDB_RECOVERY_GATE=PASS');
