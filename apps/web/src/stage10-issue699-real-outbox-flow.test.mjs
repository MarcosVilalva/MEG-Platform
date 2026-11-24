/**
 * #699 | Testa o bundle REAL de instant-persistence.js, iniciado por
 * Storage.prototype.setItem, sem extrair/copiar ensureOutboxConfirmed().
 * Rede e DOM ficticios, sem Android, PG17 ou ambientes protegidos.
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const {outputFiles} = await build({
  entryPoints: [new URL('./instant-persistence.js', import.meta.url).pathname],
  bundle:true,write:false,format:'iife',platform:'browser',
  define:{'import.meta.env':'{}'},
  logLevel:'silent'
});
const actions=new Map();
const calls=[];
const sent=[];
const confirmations=[];
let failure=true;
let remote={revision:1,state:{transactions:[],budgets:{},activityLog:[]}};
const stateKey='meg-financas-state-v4-paid-fixes';
const revisionKey='meg-cloud-revision-v1';
class Storage {
  constructor(){this.data=new Map();}
  setItem(k,v){this.data.set(String(k),String(v));}
  getItem(k){return this.data.has(String(k))?this.data.get(String(k)):null;}
  removeItem(k){this.data.delete(String(k));}
}
const localStorage=new Storage(), sessionStorage=new Storage();
sessionStorage.setItem('meg-access-token','fake-jwt-only');
localStorage.setItem(revisionKey,'1');
const initial={transactions:[],budgets:{},activityLog:[]};
const entry={id:'stage10-real-flow-qa-1',description:'fictitious expense',amount:12.34,type:'expense'};
const changed={...initial,transactions:[entry]};
localStorage.setItem(stateKey,JSON.stringify(initial));
let activeState=initial;
const listeners=new Map();
const listenersFor=n=>listeners.get(n)||[];
const document={
  readyState:'loading',
  head:{appendChild(){}},
  body:null,
  addEventListener(){},
  getElementById(){return null;},
  querySelector(){return null;},
  createElement(){return {style:{},setAttribute(){},classList:{toggle(){}}};}
};
const mockFetch=async (url,options={})=>{
  const route=new URL(url).pathname;
  const method=options.method||'GET';
  calls.push(method+' '+route);
  if(route==='/app-state' && method==='GET'){
    return {ok:true,status:200,json:async()=>structuredClone(remote)};
  }
  if(route==='/app-state/transactions' && method==='PATCH'){
    const payload=JSON.parse(options.body);
    sent.push(payload.operationId);
    if(failure)throw new TypeError('ISSUE699_SYNTHETIC_RESPONSE_LOST');
    remote={revision:2,state:{...remote.state,transactions:structuredClone(payload.upserts),
      activityLog:structuredClone(payload.activities||[])}};
    return {ok:true,status:200,json:async()=>({
      revision:remote.revision,
      confirmation:{committed:true,operationId:payload.operationId,
        upserts:payload.upserts,deletes:payload.deletes,activities:payload.activities}
    })};
  }
  throw Error('UNEXPECTED_NETWORK_ROUTE '+method+' '+route);
};
const root={
  Storage,localStorage,sessionStorage,document,
  navigator:{onLine:true},
  location:{href:'https://localhost/'},
  URL,Request,Headers,AbortController,structuredClone,Date,Math,JSON,
  crypto:{randomUUID:()=> '00000000-0000-4000-a000-000000006999'},
  fetch:mockFetch,
  setTimeout(fn,ms){const id=actions.size+1;actions.set(id,{fn,ms});return id;},
  clearTimeout(id){actions.delete(id);},
  queueMicrotask,CustomEvent:class CustomEvent{constructor(type,opts){this.type=type;this.detail=opts?.detail;}},
  addEventListener(name,handler){listeners.set(name,[...listenersFor(name),handler]);},
  dispatchEvent(){},
  MEG_APP:{getStateRef:()=>activeState,replaceState(){},showToast(){}},
  MEG_CLOUD:{apiUrl:'http://127.0.0.1:3333',user:{id:'qa'},saveNow:async()=>undefined,
    acceptConfirmedState(value){confirmations.push(structuredClone(value));}},
};
root.window=root;
const context=vm.createContext(root);
vm.runInContext(outputFiles[0].text,context,{filename:'instant-persistence.real-bundle.js',timeout:5000});
assert.equal(root.__MEG_INSTANT_PERSISTENCE_INSTALLED__,true,'BRIDGE_NOT_INSTALLED');
activeState=changed;
localStorage.setItem(stateKey,JSON.stringify(changed));
async function settle(){
  for(let i=0;i<35;i++)await new Promise(resolve=>setImmediate(resolve));
}
await settle();
const pending=root.MEG_INSTANT_PERSISTENCE.outbox();
assert.equal(pending.upserts.length,1,'REAL_STORAGE_WRITE_NOT_CAPTURED');
assert.equal(sent.length,1,'REAL_ENSURE_OUTBOX_NOT_INVOKED');
assert.equal(confirmations.length,0,'UNCONFIRMED_REVISION_ACCEPTED');
assert.equal(localStorage.getItem(revisionKey),'1','LOCAL_REVISION_ADVANCED_ON_FAILURE');
assert.equal(root.MEG_INSTANT_PERSISTENCE.pending(),true,'OUTBOX_LOST_ON_FAILURE');
console.log('ISSUE699_REAL_STORAGE_TO_ENSURE_OUTBOX_FAILURE=PASS');
console.log('ISSUE699_REAL_OUTBOX_RETAINED_ON_RESPONSE_FAILURE=PASS');
console.log('ISSUE699_REAL_ACCEPT_CONFIRMED_BLOCKED=PASS');
failure=false;
for(const callback of listenersFor('online'))callback();
await settle();
assert.deepEqual(sent,[pending.operationId,pending.operationId],'RETRY_USED_DIFFERENT_OPERATION_ID');
assert.equal(confirmations.length,1,'SUCCESS_CONFIRMATION_NOT_EXACTLY_ONCE');
assert.equal(confirmations[0].revision,2,'CONFIRMED_REVISION_INCORRECT');
assert.equal(localStorage.getItem(revisionKey),'2','LOCAL_REVISION_NOT_CONFIRMED');
assert.equal(root.MEG_INSTANT_PERSISTENCE.outbox().upserts.length,0,'OUTBOX_NOT_CLEARED');
console.log('ISSUE699_REAL_RETRY_SAME_OPERATION_ID=PASS');
console.log('ISSUE699_REAL_REVISION_ADVANCED_ONLY_AFTER_RECEIPT=PASS');
console.log('ISSUE699_REAL_APPLICATION_GUARD_END_TO_END=PASS');
