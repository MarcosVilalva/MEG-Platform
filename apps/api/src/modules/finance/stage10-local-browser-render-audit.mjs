import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
assert.equal(process.env.MEG_STAGE10_LOCAL_REAL_PREVIEW,'1');
const dburl=new URL(process.env.DATABASE_URL||'postgresql://u:p@invalid/invalid');
assert.equal(dburl.hostname,'127.0.0.1');
assert.equal(dburl.port,'55448');
assert.equal(dburl.pathname,'/meg_stage10_local_preview');
assert.equal(dburl.username,'meg_stage10_preview_runtime');
const {PrismaClient}=await import('@prisma/client');
const prisma=new PrismaClient();
let browser=null,ws=null,dir=null;
try{
 const owner=await prisma.workspace.findFirst({select:{owner:{select:{id:true,name:true,email:true,role:true,status:true,isActive:true}}}});
 assert.ok(owner?.owner);
 const usr=owner.owner;
 const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const a=enc({alg:'HS256',typ:'JWT'});
 const b=enc({sub:usr.id,email:usr.email,role:usr.role,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600});
 const c=createHmac('sha256',process.env.JWT_SECRET).update(a+'.'+b).digest('base64url');
 const session={user:usr,accessToken:a+'.'+b+'.'+c,refreshToken:'ephemeral-readonly-preview',refreshExpiresAt:new Date(Date.now()+600000).toISOString()};
 const chrome='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
 dir=await mkdtemp(join(tmpdir(),'meg-stage10-browser-preview-'));
 browser=spawn(chrome,[
  '--headless=new','--no-first-run','--no-default-browser-check',
  '--disable-background-networking','--disable-extensions','--disable-sync',
  '--disable-features=MediaRouter',
  '--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',
  '--user-data-dir='+dir,'about:blank'
 ],{stdio:'ignore'});
 let port;
 for(let i=0;i<45;i++){
  try{
    const s=(await readFile(join(dir,'DevToolsActivePort'),'utf8')).trim().split(/\r?\n/);
    port=Number(s[0]);if(port)break;
  }catch{}
  await delay(200);
 }
 assert.ok(port,'CHROME_CDP_START_FAILED');
 const pages=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
 const page=pages.find(x=>x.type==='page');
 assert.ok(page,'CHROME_PAGE_NOT_FOUND');
 assert.ok(new URL(page.webSocketDebuggerUrl).hostname==='127.0.0.1'||new URL(page.webSocketDebuggerUrl).hostname==='localhost');
 ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 let seq=0;
 const pending=new Map();
 const frontendErrors=[];
 const fetchFailures=[];
 ws.addEventListener('message',e=>{
  let msg;try{msg=JSON.parse(e.data)}catch{return}
  if(msg.id&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result)}
  if(msg.method==='Runtime.exceptionThrown'){
    const desc=String(msg.params?.exceptionDetails?.text??'').slice(0,80);
    frontendErrors.push(desc.replace(/[\r\n]/g,' '));
  }
  if(msg.method==='Network.responseReceived'&&msg.params?.response?.status>=400){
    const url=msg.params.response.url;
    try{const u=new URL(url);fetchFailures.push({status:msg.params.response.status,path:u.pathname})}catch{}
  }
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq;pending.set(id,{resolve,reject});
  ws.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async(expr)=>{
  const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error('BROWSER_EVALUATION_ERROR');
  return r.result?.value;
 };
 const waitFor=async(expr,attempts=30)=>{
  for(let i=0;i<attempts;i++){
   const v=await evaluate(expr).catch(()=>null);
   if(v)return v;await delay(400);
  }
  return null;
 };
 await send('Page.enable');
 await send('Runtime.enable');
 await send('Network.enable');
 await send('Page.navigate',{url:'http://127.0.0.1:5173/web-evolution.html?stage10=headless-readonly'});
 const ready=await waitFor('document.readyState==="complete"');
 assert.ok(ready,'WEB_PAGE_NOT_READY');
 await evaluate('sessionStorage.setItem("meg.auth.session",'+JSON.stringify(JSON.stringify(session))+');true');
 await send('Page.reload',{ignoreCache:true});
 const home=await waitFor('!!document.getElementById("meg-web-evolution-root")&&!document.body?.innerText?.includes("Bem-vindo de volta.")&&document.querySelectorAll("button").length>10',50);
 const homeMeta=await evaluate('({root:!!document.getElementById("meg-web-evolution-root"), login:document.body?.innerText?.includes("Bem-vindo de volta."), buttons:document.querySelectorAll("button").length, body:document.body?.innerText?.length || 0})');
 console.log('PT54_BROWSER_HOME_AUTH_RENDER='+Boolean(home));
 console.log('PT54_BROWSER_ROOT='+homeMeta.root+' LOGIN_SCREEN='+homeMeta.login+' BUTTONS='+homeMeta.buttons+' TEXT_LENGTH='+homeMeta.body);
 // Use only the authenticated navigation, no form submit or mutations.
 const didClick=await evaluate('(()=>{const c=[...document.querySelectorAll("button,a")].find(el=>/Lançamentos/i.test(el.textContent||""));if(!c)return false;c.click();return true})()');
 console.log('PT54_BROWSER_LAUNCHES_NAV_CLICK='+didClick);
 if(didClick)await delay(4500);
 const launchesMeta=await evaluate('({body:document.body?.innerText?.length||0, loading:document.body?.innerText?.includes("Carregando")||false, login:document.body?.innerText?.includes("Bem-vindo de volta.")||false, grid:document.querySelectorAll("[role=grid],table").length, alerts:document.querySelectorAll("[role=alert]").length})');
 console.log('PT54_BROWSER_LAUNCHES_VIEW='+JSON.stringify(launchesMeta));
 const relevantFailures=fetchFailures.filter(f=>f.path.startsWith('/finance/')||f.path.startsWith('/auth/')||f.path.startsWith('/cards')||f.path.startsWith('/app-state/'));
 console.log('PT54_BROWSER_RELEVANT_HTTP_FAILURES='+JSON.stringify(relevantFailures.slice(0,12)));
 console.log('PT54_BROWSER_JS_EXCEPTION_COUNT='+frontendErrors.length);
 console.log('PT54_BROWSER_JS_EXCEPTIONS_TYPES='+JSON.stringify(frontendErrors.slice(0,6)));
 assert.ok(home,'AUTHENTICATED_HOME_NOT_VISIBLE');
 assert.equal(homeMeta.login,false,'LOGIN_SCREEN_STILL_VISIBLE');
 assert.equal(didClick,true,'LAUNCHES_NAVIGATION_MISSING');
 assert.ok(launchesMeta.grid>=1,'LAUNCHES_GRID_MISSING');
 assert.equal(launchesMeta.login,false,'LOGIN_SCREEN_REAPPEARED');
 assert.equal(relevantFailures.length,0,'API_HTTP_FAILURES');
 assert.equal(frontendErrors.length,0,'FRONTEND_EXCEPTIONS');
 console.log('PT54_BROWSER_RENDER_GATE=PASS');
 console.log('PT54_BROWSER_AUDIT_COMPLETED=YES');
}finally{
 if(ws){try{ws.close()}catch{}}
 if(browser){try{browser.kill()}catch{}}
 await prisma.$disconnect();
 if(dir){await delay(500);await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:250}).catch(()=>{});}
 console.log('PT54_TEMP_CHROME_PROFILE_CLEANUP_ATTEMPTED=YES');
}
