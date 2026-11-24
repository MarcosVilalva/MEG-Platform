/**
 * Issue #699, original APK708 real WebView, no APK modification.
 * All API traffic routed through Chrome DevTools Protocol to an in-runner,
 * fictitious loopback HTTP server. The emulator egress MUST be blocked before
 * app launch by the matching workflow. No real accounts or protected databases.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';

assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.GITHUB_REPOSITORY,'MarcosVilalva/MEG-Platform');
assert.equal(process.env.ANDROID_SERIAL,'emulator-5554');
assert.equal(process.env.MEG_APK708_ORIGINAL_EGRESS_BLOCKED,'1');

const user={id:'issue699-fictitious-user',email:'issue699@example.invalid',name:'QA sintética',role:'ADMIN',status:'ACTIVE',isActive:true};
const workspace={id:'issue699-workspace',name:'QA fictícia',ownerId:user.id,slug:'issue699-qa'};
const account={id:'issue699-account',userId:user.id,name:'Conta QA',type:'checking',openingBalance:500,isActive:true};
const category={id:'issue699-category',userId:user.id,name:'Alimentação QA',group:'Pessoal',type:'expense',isActive:true};
const paymentMethod={id:'issue699-payment',userId:user.id,name:'PIX QA',type:'debit',isActive:true};
const apiRequests=[];
const context={mode:'success',receivedWrites:0};
const baseHeaders={
 'access-control-allow-origin':'https://localhost',
 'access-control-allow-headers':'authorization,content-type,accept',
 'access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS',
 'content-type':'application/json',
 'cache-control':'no-store',
};
const httpServer=createServer(async(req,res)=>{
 const bodyChunks=[];
 for await(const x of req)bodyChunks.push(x);
 const text=Buffer.concat(bodyChunks).toString('utf8');
 const url=new URL(req.url||'/', 'http://127.0.0.1:3333');
 const method=req.method||'GET';
 const record={method,path:url.pathname,query:url.search,headers:{
  contentType:req.headers['content-type']||null,
  authorizationScheme:(req.headers.authorization||'').split(' ')[0]||null,
  origin:req.headers.origin||null,
 },body:null};
 try{if(text)record.body=JSON.parse(text);}catch{record.body='NON_JSON';}
 apiRequests.push(record);
 let status=200;
 let out={};
 if(method==='OPTIONS'){status=204;out=undefined;}
 else if(url.pathname==='/health'){out={status:'ok',ok:true};}
 else if(url.pathname==='/auth/login'||url.pathname==='/auth/refresh'){
  out={user,accessToken:'QA_FICTITIOUS_JWT',refreshToken:'QA_FICTITIOUS_REFRESH_TOKEN',refreshExpiresAt:'2027-01-01T00:00:00.000Z'};
 } else if(url.pathname==='/auth/me'||url.pathname==='/auth/session'){
  out={user,workspace};
 } else if(url.pathname==='/auth/workspace'||url.pathname==='/workspaces/current'){out=workspace;}
 else if(url.pathname==='/app-state'){out={revision:1,state:{transactions:[],activities:[],budgets:{},settings:{},profileAvatars:{}},workspace};}
 else if(url.pathname==='/app-state/normalization-preview'){out={primary:true,reconciled:true,revision:1,count:0,normalized:{count:0,items:[]}};}
 else if(url.pathname==='/finance/accounts'){out=[account];}
 else if(url.pathname==='/finance/categories'){out=[category];}
 else if(url.pathname==='/finance/payment-methods'){out=[paymentMethod];}
 else if(url.pathname==='/finance/phoenix-preview/events'){out={items:[],total:0,page:1,pageSize:0};}
 else if(url.pathname==='/finance/phoenix-preview'){const month=url.searchParams.get('month')||'2026-11';out={
  month,summary:{month,availableBalance:500,income:0,expense:0,projectedResult:0,realizedIncome:0,realizedExpense:0,realizedResult:0,eventCount:0,pendingCount:0,pendingAmount:0,nextDue:null,topCategories:[]},
  analytics:{month,summary:{availableBalance:500,income:0,expense:0,projectedResult:0},previous:{month:'2026-10',income:0,expense:0,result:0},delta:{income:0,expense:0,result:0},dailyAverageExpense:0,concentrationTop3:0,categories:[],monthlyTrend:[],paymentMethods:[]},
  cashflow:{month,openingBalance:500,projectedClosing:500,realizedClosing:500,totalIncome:0,totalExpense:0,days:[]},
  accounts:[account],categories:[category],paymentMethods:[paymentMethod],cards:[],payables:[],events:{items:[],total:0,page:1,pageSize:0},financialAudit:{items:[],total:0,page:1,pageSize:50},
 };}
 else if(url.pathname==='/finance/events/month'){out={month:url.searchParams.get('month'),items:[],total:0,page:1,pageSize:50};}
 else if(url.pathname==='/finance/events'){out={items:[],total:0,page:1,pageSize:50};}
 else if(url.pathname==='/finance/summary'){out={month:url.searchParams.get('month'),totalIncome:0,totalExpenses:0,balance:500,availableBalance:500,closingBalance:500,currentBalance:500,projectedBalance:500};}
 else if(url.pathname==='/finance/analytics'){out={month:url.searchParams.get('month'),categories:[],groups:[],income:0,expenses:0,items:[],incomeByCategory:[],expenseByCategory:[]};}
 else if(url.pathname==='/finance/cashflow'){out={month:url.searchParams.get('month'),items:[],daily:[],totalIncome:0,totalExpenses:0,openingBalance:500,closingBalance:500};}
 else if(url.pathname==='/finance/budgets'){out=[];}
 else if(url.pathname==='/finance/benefit-summary'){out={balance:0,availableBalance:0,transactions:[],items:[]};}
 else if(url.pathname==='/cards'){out=[];}
 else if(url.pathname.startsWith('/cards/')){out={items:[],status:'empty'};}
 else if(url.pathname==='/payables'){out=[];}
 else if(url.pathname==='/receivables/customers'){out=[];}
 else if(url.pathname==='/receivables'){out=[];}
 else if(url.pathname==='/finance/audit'){out={items:[],total:0};}
 else if(url.pathname==='/auth/users'){out=[];}
 else if(url.pathname==='/finance/events/history-snapshot'){out={items:[],total:0};}
 else if(method!=='GET'){
  context.receivedWrites++;
  if(context.mode==='409'){status=409;out={error:'STATE_CONFLICT',message:'QA_409_SYNTHETIC'};}
  else if(context.mode==='422'){status=422;out={error:'QA_SYNTHETIC_REJECTION',message:'QA_422_SYNTHETIC'};}
  else {out={id:'issue699-remote-created',status:'planned',date:'2026-11-24',amount:12.35};status=201;}
 } else {out={items:[],total:0,active:true,ready:true};}
 res.writeHead(status,baseHeaders);
 res.end(status===204?'':JSON.stringify(out));
});
await new Promise(resolve=>httpServer.listen(3333,'127.0.0.1',resolve));
const runErrors=[];
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8',timeout:12000}).trim();
const sleep=ms=>delay(ms);
const until=async (fn,label,ms=22000)=>{
 const start=Date.now();while(Date.now()-start<ms){try{const x=await fn();if(x)return x}catch{}await sleep(450)}
 throw new Error('ISSUE699_ORIGINAL_WEBVIEW_TIMEOUT_'+label);
};
const pid=adb('shell','pidof','br.com.megfinancas.app');
assert.ok(pid);
const forward=adb('forward','tcp:0','localabstract:webview_devtools_remote_'+pid);
let socket=null;
let nextId=0;
const pending=new Map();
let intercepted=0;
const interceptedUrls=new Map();
async function cdp(method,params={},timeout=15000){
 const id=++nextId;
 const promise=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(new Error('ISSUE699_CDP_TIMEOUT_'+method));},timeout);
  pending.set(id,{resolve,reject,timer});
 });
 socket.send(JSON.stringify({id,method,params}));
 return promise;
}
async function handlePaused(event){
 const {requestId,request}=event.params;
 const url=new URL(request.url);
 intercepted++;interceptedUrls.set(url.pathname,(interceptedUrls.get(url.pathname)||0)+1);
 try{
  const method=request.method||'GET';
  const headers={...(request.headers||{})};
  delete headers.Host;delete headers.host;delete headers['Content-Length'];delete headers['content-length'];
  const reqBody=request.postData;
  const response=await fetch('http://127.0.0.1:3333'+url.pathname+url.search,{
   method,headers:{...headers,'x-issue699-local-probe':'1'},
   ...(method==='GET'||method==='HEAD'||reqBody==null?{}:{body:reqBody}),
   signal:AbortSignal.timeout(4000),
  });
  const bytes=Buffer.from(await response.arrayBuffer());
  await cdp('Fetch.fulfillRequest',{
   requestId,responseCode:response.status,
   responseHeaders:Object.entries(baseHeaders).map(([name,value])=>({name,value})),
   body:bytes.toString('base64'),
  });
 }catch(error){
  runErrors.push('INTERCEPT:'+String(error.message||error));
  try{await cdp('Fetch.failRequest',{requestId,errorReason:'Failed'});}catch{}
 }
}
async function evalUI(expression,timeout=20000){
 const v=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},timeout);
 if(v?.exceptionDetails)throw new Error('ISSUE699_EVAL_EXCEPTION:'+JSON.stringify(v.exceptionDetails).slice(0,500));
 return v?.result?.value;
}
try{
 const target=await until(async()=>{
  const r=await fetch('http://127.0.0.1:'+forward+'/json/list',{signal:AbortSignal.timeout(2000)});
  return (await r.json()).find(x=>x.url?.startsWith('https://localhost/'));
 },'TARGET');
 socket=new WebSocket(target.webSocketDebuggerUrl);
 await once(socket,'open');
 socket.addEventListener('message',({data})=>{
  const msg=JSON.parse(data);
  if(msg.id&&pending.has(msg.id)){
   const p=pending.get(msg.id);pending.delete(msg.id);clearTimeout(p.timer);
   msg.error?p.reject(new Error(JSON.stringify(msg.error))):p.resolve(msg.result);
  } else if(msg.method==='Fetch.requestPaused'){void handlePaused(msg);}
 });
 await cdp('Page.enable');
 await cdp('Runtime.enable');
 await cdp('Fetch.enable',{patterns:[{urlPattern:'*meg-platform-api.onrender.com*',requestStage:'Request'}]});
 await cdp('Page.reload',{ignoreCache:true});
 await until(()=>evalUI("Boolean(document.querySelector('input[autocomplete=username]') || document.querySelector('input[type=email]'))"),'LOGIN_FORM',30000);
 console.log('ISSUE699_APK708_ORIGINAL_LOGIN_UI_VISIBLE=PASS');
 const loginForm=await evalUI(`(()=>({
  inputs:[...document.querySelectorAll('input')].map(x=>({type:x.type,placeholder:x.placeholder,autocomplete:x.autocomplete})),
  buttons:[...document.querySelectorAll('button')].map(x=>x.innerText.trim()).filter(Boolean).slice(0,20)
 }))()`);
 console.log('ISSUE699_APK708_ORIGINAL_LOGIN_FORM='+JSON.stringify(loginForm));
 // The published APK enables CapacitorHttp: it replaces window.fetch with
 // Android-native network transport, which CDP Fetch cannot intercept.
 // In THIS disposable WebView only, restore the original browser fetch
 // saved by Capacitor. CDN/prod egress remains blocked by emulator iptables.
 const browserFetchRestored=await evalUI(`(()=>{
  if(typeof window.CapacitorWebFetch!=='function')return false;
  window.fetch=window.CapacitorWebFetch.bind(window);
  return true;
 })()`);
 console.log('ISSUE699_APK708_ORIGINAL_BROWSER_FETCH_QA_SHIM='+browserFetchRestored);
 assert.equal(browserFetchRestored,true,'ORIGINAL_CAPACITOR_BROWSER_FETCH_MISSING');
 await evalUI(`(()=>{
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  const email=document.querySelector('input[autocomplete=username],input[type=email]');
  const pass=document.querySelector('input[autocomplete=current-password],input[type=password]');
  for(const [el,val] of [[email,'issue699@example.invalid'],[pass,'QA_SYNTHETIC_PASSWORD']]){
   if(!el)throw new Error('MISSING_INPUT');
   setter.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}));
  }
  const button=document.querySelector('.px-preview-submit') ||
   [...document.querySelectorAll('button')].find(x=>/entrar|acessar/i.test(x.innerText));
  if(!button)throw new Error('NO_SUBMIT_BUTTON');
  button.click();
 })()`);
 await sleep(4500);
 const postLogin=await evalUI(`(()=>({
  currentLocation:location.pathname,
  loginStillVisible:Boolean(document.querySelector('.px-preview-submit')),
  bodyText:document.body.innerText.slice(0,1100),
  buttons:[...document.querySelectorAll('button,a,[role=button]')].map(x=>({tag:x.tagName,text:x.innerText.trim().slice(0,75),title:x.title||''})).filter(x=>x.text||x.title).slice(0,90),
 }))()`);
 console.log('ISSUE699_APK708_ORIGINAL_AFTER_LOGIN='+JSON.stringify(postLogin));
 const opened=await evalUI(`(()=>{
  const controls=[...document.querySelectorAll('button,a,[role=button]')];
  const target=controls.find(x=>/novo lançamento|novo lancamento/i.test(x.innerText||x.title||'')) ||
   controls.find(x=>/novo lançamento|novo lancamento/i.test(x.getAttribute('aria-label')||''));
  if(!target)return false;
  target.click();return true;
 })()`);
 console.log('ISSUE699_APK708_ORIGINAL_NEW_LAUNCH_CONTROL_FOUND='+opened);
 if(opened){
  await sleep(1400);
  const form=await evalUI(`(()=>({
   bodyText:document.body.innerText.slice(-1900),
   inputs:[...document.querySelectorAll('input,textarea,select')].map(x=>({
    tag:x.tagName,type:x.type||'',placeholder:x.placeholder||'',
    name:x.name||'',ariaLabel:x.getAttribute('aria-label')||'',
    value:x.type==='password'?'[REDACTED]':x.value,
   })).slice(-65),
   buttons:[...document.querySelectorAll('button')].map(x=>({text:x.innerText.trim().slice(0,100),disabled:x.disabled})).filter(x=>x.text).slice(-70),
  }))()`);
  console.log('ISSUE699_APK708_ORIGINAL_LAUNCH_FORM_PROBE='+JSON.stringify(form));
 }
 console.log('ISSUE699_APK708_ORIGINAL_API_PATHS='+JSON.stringify([...interceptedUrls]));
 console.log('ISSUE699_APK708_ORIGINAL_LOCAL_API_REQUESTS='+JSON.stringify(apiRequests.map(r=>({method:r.method,path:r.path,query:r.query})).slice(0,120)));
 console.log('ISSUE699_APK708_ORIGINAL_REMOTE_FETCH_INTERCEPTED='+intercepted);
 console.log('ISSUE699_APK708_ORIGINAL_LOCAL_UI_PROBE_COMPLETED=PASS');
}finally{
 console.log('ISSUE699_APK708_ORIGINAL_PROBE_ERRORS='+JSON.stringify(runErrors));
 for(const [id,p] of pending){clearTimeout(p.timer);p.reject(new Error('CLOSED'));}
 socket?.close();
 try{adb('forward','--remove','tcp:'+forward)}catch{}
 httpServer.closeAllConnections();await new Promise(resolve=>httpServer.close(resolve));
}
