import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const delay=ms=>new Promise(done=>setTimeout(done,ms));
assert.equal(process.env.MEG_STAGE10_EDIT_WORKBENCH_WRITE,'1');
const db=new URL(process.env.DATABASE_URL||'postgresql://x:x@invalid/invalid');
assert.equal(db.port,'55460');
assert.equal(db.pathname,'/meg_stage10_edit_workbench');
assert.equal(db.username,'meg_stage10_workbench_runtime');
const {PrismaClient}=await import('@prisma/client');
const prisma=new PrismaClient();
let chrome,ws,dir;
try{
 const own=await prisma.workspace.findFirst({
  select:{owner:{select:{id:true,name:true,email:true,role:true,status:true,isActive:true}}},
 });
 assert.ok(own?.owner);
 const user=own.owner;
 const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const a=enc({alg:'HS256',typ:'JWT'});
 const b=enc({sub:user.id,email:user.email,role:user.role,
  iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600});
 const sig=createHmac('sha256',process.env.JWT_SECRET).update(a+'.'+b).digest('base64url');
 const session={user,accessToken:a+'.'+b+'.'+sig,
  refreshToken:'ephemeral-workbench-no-persistence',
  refreshExpiresAt:new Date(Date.now()+600000).toISOString()};
 dir=await mkdtemp(join(tmpdir(),'meg-stage10-edit-workbench-browser-'));
 chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
  '--headless=new','--no-first-run','--no-default-browser-check',
  '--disable-background-networking','--disable-extensions','--disable-sync',
  '--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',
  '--user-data-dir='+dir,'about:blank',
 ],{stdio:'ignore'});
 let port=0;
 for(let i=0;i<60;i++){
  try{port=Number((await readFile(join(dir,'DevToolsActivePort'),'utf8')).trim().split(/\r?\n/)[0]);if(port)break;}catch{}
  await delay(180);
 }
 assert.ok(port,'WORKBENCH_BROWSER_START_FAILED');
 const pages=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
 const pg=pages.find(x=>x.type==='page');
 assert.ok(pg);
 ws=new WebSocket(pg.webSocketDebuggerUrl);
 await new Promise((ok,fail)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',fail,{once:true});});
 let id=0;
 const waiters=new Map();
 const errors=[],failures=[];
 ws.addEventListener('message',e=>{
  let msg;try{msg=JSON.parse(e.data)}catch{return}
  if(msg.id&&waiters.has(msg.id)){
   const w=waiters.get(msg.id);waiters.delete(msg.id);
   msg.error?w.fail(new Error('CDP_COMMAND_FAILED')):w.ok(msg.result);
  }
  if(msg.method==='Runtime.exceptionThrown')errors.push('JS_EXCEPTION');
  if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400){
   try{const u=new URL(msg.params.response.url);
    if(u.pathname.startsWith('/auth/')||u.pathname.startsWith('/finance/')){
     failures.push({code:msg.params.response.status,path:u.pathname});}
   }catch{}
  }
 });
 const send=(method,params={})=>new Promise((ok,fail)=>{
  const key=++id;waiters.set(key,{ok,fail});ws.send(JSON.stringify({id:key,method,params}));
 });
 const evaluate=async(expr)=>{
  const out=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
  if(out.exceptionDetails)throw new Error('CDP_EVAL_FAILURE');
  return out.result?.value;
 };
 const until=async(expr,tries=45)=>{
  for(let i=0;i<tries;i++){const r=await evaluate(expr).catch(()=>null);if(r)return r;await delay(350);}
  return null;
 };
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Page.navigate',{url:'http://127.0.0.1:5174/web-evolution.html?qa=pt65-browser'});
 assert.ok(await until('document.readyState==="complete"'));
 await evaluate('sessionStorage.setItem("meg.auth.session",'+JSON.stringify(JSON.stringify(session))+');true');
 await send('Page.reload',{ignoreCache:true});
 const home=await until('document.querySelectorAll("button").length>10&&!document.body?.innerText?.includes("Bem-vindo de volta.")',55);
 assert.ok(home,'WORKBENCH_HOME_AUTH_FAILED');
 console.log('PT65_BROWSER_HOME_AUTH=PASS');
 await evaluate('(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent?.trim()==="Entendi");if(b)b.click();return true})()');
 const launch=await evaluate('(()=>{const b=[...document.querySelectorAll("button,a")].find(x=>/Lançamentos/i.test(x.textContent||""));if(!b)return false;b.click();return true})()');
 assert.equal(launch,true);
 const grid=await until('document.querySelectorAll("[role=grid],table").length>0',55);
 assert.ok(grid,'WORKBENCH_LAUNCHES_GRID_MISSING');
 console.log('PT65_BROWSER_LAUNCHES_GRID=PASS');
 const authorized=await until('document.querySelector("[data-meg-operational-prism]")?.getAttribute("data-meg-operational-prism")==="isolated-historical-expense-edit"',55);
 if(!authorized){
  const diag=await evaluate('(async()=>{try{const mode=document.querySelector("[data-meg-operational-prism]")?.getAttribute("data-meg-operational-prism")||"MISSING";const s=JSON.parse(sessionStorage.getItem("meg.auth.session")||"{}");const r=await fetch("http://127.0.0.1:3334/finance/stage10-historical-write-gate",{headers:{Authorization:"Bearer "+s.accessToken}});const b=await r.json().catch(()=>({}));return {mode,status:r.status,allowed:!!b.allowed,protocol:typeof b.protocol==="string"?b.protocol:"",grid:document.querySelectorAll("[role=grid],table").length}}catch{return {error:"BROWSER_GATE_FETCH_FAILED"}}})()');
  console.log('PT65_BROWSER_EDIT_GATE_DIAGNOSTIC='+JSON.stringify(diag));
  console.log('PT65_BROWSER_GATE_HTTP_FAILURES='+JSON.stringify(failures.slice(0,8)));
 }
 assert.ok(authorized,'WORKBENCH_FINANCIAL_WRITE_GATE_NOT_VISIBLE');
 console.log('PT65_BROWSER_HISTORY_EDIT_GATE=PASS');
 const triggers=await evaluate('document.querySelectorAll("button[aria-haspopup=menu]").length');
 console.log('PT65_BROWSER_ACTION_MENU_TRIGGERS='+triggers);
 assert.ok(triggers>0,'WORKBENCH_ACTION_BUTTONS_MISSING');
 let opened=false;
 for(let i=0;i<Math.min(triggers,30);i++){
  const clicked=await evaluate('(()=>{const a=[...document.querySelectorAll("button[aria-haspopup=menu]")];if(!a['+i+'])return false;a['+i+'].click();return true})()');
  if(!clicked)continue;
  await delay(200);
  const enabled=await evaluate('(()=>{const b=[...document.querySelectorAll(".meg-t10-qa-menu button[role=menuitem]")].find(x=>x.textContent?.includes("Editar lançamento"));return !!b&&!b.disabled})()');
  if(enabled){
   await evaluate('(()=>{const b=[...document.querySelectorAll(".meg-t10-qa-menu button[role=menuitem]")].find(x=>x.textContent?.includes("Editar lançamento"));if(b&&!b.disabled){b.click();return true}return false})()');
   opened=Boolean(await until('document.getElementById("meg-hist-edit-title")!==null',25));
   if(opened)break;
  }
  await evaluate('(()=>{const b=document.querySelector(".meg-t10-qa-menu");if(b){document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));return true}return false})()');
  await delay(120);
 }
 assert.ok(opened,'WORKBENCH_HISTORICAL_EDIT_MODAL_NOT_OPENED');
 const state=await evaluate('({dialog:!!document.querySelector(".meg-hist-edit-modal[role=dialog]"),save:[...document.querySelectorAll(".meg-hist-edit-buttons button")].some(x=>x.textContent?.includes("Salvar alterações")&&!x.disabled),field:!!document.querySelector(".meg-hist-edit-form input"),notice:!!document.querySelector(".meg-hist-edit-locked")})');
 assert.equal(state.dialog,true);assert.equal(state.save,true);
 assert.equal(state.field,true);assert.equal(state.notice,true);
 console.log('PT65_BROWSER_HISTORICAL_EDIT_MODAL=PASS');
 console.log('PT65_BROWSER_SAVE_ENABLED_WITHOUT_SUBMIT=PASS');
 assert.equal(errors.length,0,'FRONTEND_ERRORS');
 assert.equal(failures.length,0,'FINANCIAL_HTTP_ERRORS');
 console.log('PT65_BROWSER_JS_AND_HTTP_ERRORS=ZERO');
 console.log('PT65_BROWSER_WORKBENCH_GATE=PASS');
}finally{
 if(ws){try{ws.close()}catch{}}
 if(chrome){try{chrome.kill()}catch{}}
 await prisma.$disconnect();
 if(dir){await delay(450);await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});}
 console.log('PT65_BROWSER_TEMP_PROFILE_REMOVAL_ATTEMPTED=YES');
}
