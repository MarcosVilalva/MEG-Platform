import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {build} from 'esbuild';

// PT211: fonte Phoenix REAL no Android WebView, API exclusivamente simulada.
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.GITHUB_REPOSITORY,'MarcosVilalva/MEG-Platform');
assert.equal(process.env.ANDROID_SERIAL,'emulator-5554');
const pkg='br.com.megfinancas.app.stage10qa';
const activity=pkg+'/br.com.megfinancas.app.MainActivity';
const data={userId:'pt211-fictitious-user',workspaceId:'pt211-fictitious-workspace',
  amount:19.62,description:'PT211 fictitious supermarket',date:'2026-11-23',
  accountId:'pt211-synthetic-account',categoryId:'pt211-synthetic-category',
  paymentMethodId:'pt211-synthetic-method'};
const journalKey='meg.phoenix.create.attempt.v1';
const generationKey='meg.phoenix.create.generation.v1';
const testKey='pt211-original-operation-id';
const mocks=new Map([
 ['../../app/auth-client',
  "export const readSession=()=>({user:{id:globalThis.__pt211Fake.userId}});\n"
  +"export async function authenticatedRequest(){throw Error('PT211_NO_REAL_AUTH_ALLOWED');}"],
 ['../../app/finance-client',
  "export const financeClient={createEvent:async(data,scope)=>globalThis.__pt211Fake.remote(data,scope)};"],
 ['../../app/cards-client',"export const cardsClient={};"],
 ['./load-phoenix-read-model',
  "export async function invalidatePhoenixReadModelMonth(){}\n"
  +"export async function loadPhoenixReadModel(){throw Error('PT211_NO_READ_MODEL');}\n"
  +"export function peekPhoenixReadModel(){return null;}\n"
  +"export function clearPhoenixReadModelCache(){}"],
]);
const entry=[
 "import {preparePhoenixSimpleEvent,runPhoenixSimpleEventWrite} from './apps/web/src/phoenix/data/phoenix-write-gateway.ts';",
 "import {withPhoenixCreateJournalLock,reservePhoenixCreate,findPhoenixCreatePending,",
 " notePhoenixCreateReceipt,finishPhoenixCreate,canExplicitlyReplayPhoenixCreate",
 "} from './apps/web/src/phoenix/data/phoenix-create-attempt-journal.ts';",
 "import {findPhoenixCanonicalEvent} from './apps/web/src/phoenix/data/phoenix-accepted-create-readback.ts';",
 "globalThis.__pt211Real={preparePhoenixSimpleEvent,runPhoenixSimpleEventWrite,",
 " withPhoenixCreateJournalLock,reservePhoenixCreate,findPhoenixCreatePending,",
 " notePhoenixCreateReceipt,finishPhoenixCreate,canExplicitlyReplayPhoenixCreate,findPhoenixCanonicalEvent};"
].join('\n');
const compiled=await build({
 stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'pt211-isolated-entry.js',loader:'js'},
 bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',logLevel:'silent',
 define:{'import.meta.env':JSON.stringify({
   VITE_STAGE10_ANDROID_CONFIRMATION_QA:'true',
   VITE_API_URL:'http://127.0.0.1:3333',
   VITE_PHOENIX_SIMPLE_EVENT_WRITE:'enabled'
 })},
 plugins:[{name:'pt211-mocked-remote-boundary',setup(api){
   api.onResolve({filter:/.*/},a=>mocks.has(a.path)?{path:a.path,namespace:'pt211-stub'}:undefined);
   api.onLoad({filter:/.*/,namespace:'pt211-stub'},a=>({contents:mocks.get(a.path),loader:'js'}));
 }}]
});
const bundle=compiled.outputFiles[0].text;
assert.ok(bundle.includes('PHOENIX_CREATE_UNCONFIRMED'));
assert.ok(bundle.includes('PHOENIX_JOURNAL_STORAGE_UNAVAILABLE'));
console.log('PT211_REAL_FINANCIAL_WRITER_AND_JOURNAL_BUNDLED=PASS');

function adb(...args){return execFileSync('adb',args,{encoding:'utf8',timeout:15000}).trim();}
async function until(fn,name){
 for(let i=0;i<48;i++){try{const value=await fn();if(value)return value;}catch{} await delay(700);}
 throw Error('PT211_TIMEOUT_'+name);
}
let socket=null,forward=null,nextId=0;
async function disconnect(){
 try{socket?.close();}catch{} socket=null;
 if(forward){try{adb('forward','--remove','tcp:'+forward);}catch{}forward=null;}
}
async function connect(){
 const pid=await until(()=>adb('shell','pidof',pkg),'QA_APP_PROCESS');
 forward=adb('forward','tcp:0','localabstract:webview_devtools_remote_'+pid);
 const target=await until(async()=>{
   const r=await fetch('http://127.0.0.1:'+forward+'/json/list',{signal:AbortSignal.timeout(2000)});
   return (await r.json()).find(x=>x.url?.startsWith('https://localhost/'));
 },'QA_WEBVIEW_TARGET');
 socket=new WebSocket(target.webSocketDebuggerUrl);
 await once(socket,'open');
}
async function evaluate(expression){
 const id=++nextId;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>done(Error('PT211_CDP_TIMEOUT')),25000);
  const handler=({data})=>{
   const msg=JSON.parse(data);
   if(msg.id!==id)return;
   if(msg.error||msg.result?.exceptionDetails)
     return done(Error('PT211_CDP_EVALUATION_ERROR:'+JSON.stringify(msg.error??msg.result?.exceptionDetails).slice(0,700)));
   done(null,msg.result.result.value);
  };
  function done(error,value){
   clearTimeout(timer);socket.removeEventListener('message',handler);
   if(error)reject(error);else resolve(value);
  }
  socket.addEventListener('message',handler);
  socket.send(JSON.stringify({id,method:'Runtime.evaluate',
   params:{expression,returnByValue:true,awaitPromise:true}}));
 });
}
const inputCode="const input={type:'expense',status:'paid',description:c.description,date:c.date,amount:c.amount,"
 +"accountId:c.accountId,categoryId:c.categoryId,paymentMethodId:c.paymentMethodId};";
const ctxCode="const context={userId:c.userId,workspaceId:c.workspaceId,"
 +"apiUrl:'http://127.0.0.1:3333',storage:localStorage};";
const one=[
 "if(localStorage.getItem("+JSON.stringify(journalKey)+")||localStorage.getItem("+JSON.stringify(testKey)+"))throw Error('PT211_JOURNAL_NOT_EMPTY');",
 inputCode,ctxCode,
 "const prepared=r.preparePhoenixSimpleEvent(input);",
 "const reserved=await r.withPhoenixCreateJournalLock(()=>r.reservePhoenixCreate(context,'monetary',prepared.payload,prepared.operationId));",
 "if(reserved.status!=='new')throw Error('PT211_FIRST_RESERVATION_FAILED');",
 "f.mode='lost';",
 "const result=await r.runPhoenixSimpleEventWrite(prepared,'2026-11',undefined,undefined,c.workspaceId);",
 "const saved=JSON.parse(localStorage.getItem("+JSON.stringify(journalKey)+")||'null');",
 "if(result.status!=='error'||result.code!=='PHOENIX_CREATE_UNCONFIRMED'||!saved)throw Error('PT211_ACK_LOSS_NOT_BLOCKED');",
 "if(f.requests.length!==1||f.requests[0].operationId!==saved.operationId)throw Error('PT211_FIRST_OPERATION_CHANGED');",
 "const diff=await r.withPhoenixCreateJournalLock(()=>r.reservePhoenixCreate(context,'monetary',{...prepared.payload,amount:99.99},'new-different-operation'));",
 "if(diff.status!=='blocked'||diff.reason!=='DIFFERENT_INTENT'||f.requests.length!==1)throw Error('PT211_NEW_INTENT_NOT_BLOCKED');",
 "if(!r.findPhoenixCreatePending(localStorage))throw Error('PT211_JOURNAL_NOT_PENDING');",
 "localStorage.setItem("+JSON.stringify(testKey)+",saved.operationId);",
 "return {loss:true,guard:true,operationId:saved.operationId,requests:f.requests.length};"
].join('\n');
const two=[
 inputCode,ctxCode,
 "const original=c.expectedOriginalOperationId;",
 "const persisted=JSON.parse(localStorage.getItem("+JSON.stringify(journalKey)+")||'null');",
 "if(!persisted)throw Error('PT211_FINANCIAL_JOURNAL_MISSING_AFTER_RESTART');",
 "if(persisted.operationId!==original)throw Error('PT211_FINANCIAL_JOURNAL_OPERATION_CHANGED');",
 "const prepared=r.preparePhoenixSimpleEvent(input,'pt211-different-operation-id');",
 "const reused=await r.withPhoenixCreateJournalLock(()=>r.reservePhoenixCreate(context,'monetary',prepared.payload,prepared.operationId));",
 "if(reused.status!=='same'||reused.record.operationId!==original)throw Error('PT211_RESTART_JOURNAL_CHANGED');",
 "if(!r.canExplicitlyReplayPhoenixCreate(reused.record))throw Error('PT211_EXPLICIT_RETRY_EXPIRED');",
 "if(f.requests.length!==0)throw Error('PT211_RESTART_AUTO_SENT');",
 "prepared.operationId=reused.record.operationId;f.mode='replay';",
 "const result=await r.runPhoenixSimpleEventWrite(prepared,'2026-11',undefined,undefined,c.workspaceId);",
 "if(result.status!=='accepted'||f.requests.length!==1||f.requests[0].operationId!==original||result.event.id!=='pt211-synthetic-event')throw Error('PT211_MANUAL_REPLAY_IDENTITY');",
 "const receipt=await r.withPhoenixCreateJournalLock(()=>r.notePhoenixCreateReceipt(context,reused.record,result.event));",
 "const readback=await r.findPhoenixCanonicalEvent({expectedUserId:c.userId,eventId:result.event.id,"
 +"currentUserId:()=>c.userId,getHistory:async()=>({kind:'complete',items:[result.event],total:1}),"
 +"listPage:async()=>{throw Error('PT211_PAGINATION_FORBIDDEN')},signal:new AbortController().signal});",
 "if(readback.status!=='found')throw Error('PT211_CANONICAL_READBACK_MISSING');",
 "await r.withPhoenixCreateJournalLock(()=>r.finishPhoenixCreate(context,receipt,readback.event));",
 "if(r.findPhoenixCreatePending(localStorage))throw Error('PT211_JOURNAL_NOT_CLEARED');",
 "localStorage.removeItem("+JSON.stringify(testKey)+");",
 "localStorage.removeItem("+JSON.stringify(generationKey)+");",
 "const keys=[];for(let i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));",
 "for(const key of keys){if(key?.startsWith('meg.phoenix.create-qa.v1.'))localStorage.removeItem(key);}",
 "const clean=!localStorage.getItem("+JSON.stringify(journalKey)+")&&!localStorage.getItem("+JSON.stringify(testKey)+")&&!localStorage.getItem("+JSON.stringify(generationKey)+");",
 "return {replayed:true,readback:true,clean,operationId:original,requests:f.requests.length};"
].join('\n');
const fake=[
 "globalThis.__pt211Fake={userId:c.userId,mode:'',requests:[],",
 "async remote(payload,scope){",
 "if(scope!==c.workspaceId)throw Error('PT211_WORKSPACE_CHANGED');",
 "this.requests.push({...payload});",
 "if(this.mode==='lost')throw Error('PT211_SYNTHETIC_ACK_LOSS_AFTER_FAKE_COMMIT');",
 "if(this.mode==='replay')return {...payload,id:'pt211-synthetic-event'};",
 "throw Error('PT211_UNEXPECTED_REMOTE_ACCESS');",
 "}};"
].join('\n');
function phase(n,expectedOriginalOperationId=''){
 return ['(async()=>{','const c='+JSON.stringify({...data,expectedOriginalOperationId})+';',fake,bundle,
  'const r=globalThis.__pt211Real,f=globalThis.__pt211Fake;',
  n===1?one:two,'})()'].join('\n');
}
let firstPassed=false,lastPassed=false;
try{
 adb('shell','am','start','-n',activity);
 await connect();
  await until(()=>evaluate("(()=>{try{return location.origin==='https://localhost' && document.readyState==='complete' && typeof localStorage.getItem==='function'}catch{return false}})()"),'STABLE_QA_WEBVIEW_ORIGIN_AND_STORAGE');
 const first=await evaluate(phase(1));
 assert.equal(first.loss,true);assert.equal(first.guard,true);assert.equal(first.requests,1);
 firstPassed=true;
 console.log('PT211_ANDROID_WEBVIEW_ACK_LOSS_JOURNAL_PERSISTED=PASS');
 console.log('PT211_ANDROID_WEBVIEW_DIFFERENT_INTENT_FAIL_CLOSED=PASS');
 await disconnect();
 adb('shell','am','force-stop',pkg);
 await delay(1000);
 adb('shell','am','start','-n',activity);
 await connect();
  await until(()=>evaluate("(()=>{try{return location.origin==='https://localhost' && document.readyState==='complete' && typeof localStorage.getItem==='function'}catch{return false}})()"),'STABLE_QA_WEBVIEW_ORIGIN_AND_STORAGE');
 const second=await evaluate(phase(2,first.operationId));
 assert.equal(second.replayed,true);assert.equal(second.readback,true);
 assert.equal(second.clean,true);assert.equal(second.requests,1);
 assert.equal(second.operationId,first.operationId);
 lastPassed=true;
 console.log('PT211_ANDROID_WEBVIEW_RESTART_SAME_OPERATION_EXPLICIT_REPLAY=PASS');
 console.log('PT211_ANDROID_WEBVIEW_CANONICAL_SYNTHETIC_READBACK=PASS');
 console.log('PT211_ANDROID_WEBVIEW_TEST_STORAGE_CLEANED=PASS');
}finally{await disconnect();}
assert.ok(firstPassed&&lastPassed);
console.log('PT211_ANDROID_WEBVIEW_PHOENIX_FINANCIAL_SYNTHETIC_GATE=PASS');
