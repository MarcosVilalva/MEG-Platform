/**
 * PT197: Chrome real + bridge/gateway reais + Fastify/JWT/PG17 descartavel.
 * Nenhuma conexao remota, Android, banco persistente ou ambiente produtivo.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import fastify from 'fastify';
import bcrypt from 'bcryptjs';
import { build } from 'esbuild';
import { LicenseStatus, Prisma, UserRole, UserStatus, prisma } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { authRoutes } from '../auth/routes';
import { financeRoutes } from './routes';
import { appStateRoutes } from '../app-state/routes';

const u = new URL(process.env.DATABASE_URL || 'http://invalid');
if (u.protocol !== 'postgresql:' || u.hostname !== '127.0.0.1'
  || u.port !== '55571' || u.pathname !== '/meg_stage10_pt197_sandbox'
  || u.username !== 'meg_stage10_ci'
  || process.env.MEG_STAGE10_PT197_SYNTHETIC !== '1'
  || process.env.MEG_STAGE10_ISOLATED_PG !== '1'
  || process.env.MEG_STAGE10_WEB_WRITE_QA === '1'
  || process.env.NODE_ENV !== 'test') {
  throw Error('PT197_LOCAL_SYNTHETIC_DB_ONLY');
}
const WEB_PORT=33351;
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
if (!existsSync(CHROME)) throw Error('PT197_CHROME_NOT_FOUND');
const app=fastify({logger:false});
let chrome: ReturnType<typeof spawn> | undefined;
let browserProfile: string | undefined;
let listenerStarted=false;
const held: Array<() => void>=[];
try {
  const stamp=randomUUID();
  const pass='PT197-fixture-'+stamp;
  const makeUser=async (who:string) => prisma.user.create({data:{
    email:'pt197-'+who+'-'+stamp+'@example.invalid',
    name:'PT197 Synthetic '+who,
    passwordHash:await bcrypt.hash(pass,8),
    role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
  }});
  const owner=await makeUser('owner');
  const actor=await makeUser('operator');
  const plan=await prisma.plan.create({data:{
    code:'PT197-'+stamp,name:'PT197 Synthetic Plan',monthlyPrice:0,maxMembers:5,features:[],
  }});
  const workspace=await prisma.workspace.create({data:{
    ownerId:owner.id,name:'PT197 disposable',slug:'pt197-'+stamp,
    members:{create:[
      {userId:owner.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true},
      {userId:actor.id,role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true},
    ]},
    subscription:{create:{planId:plan.id,status:LicenseStatus.ACTIVE}},
    appState:{create:{userId:owner.id,revision:1,state:{
      transactions:[],budgets:{},__megNormalization:{mode:'normalized-primary'},
    } as Prisma.InputJsonValue}},
  }});
  const [account,category,method]=await Promise.all([
    prisma.account.create({data:{userId:owner.id,name:'PT197 Conta Ficticia',
      type:'checking',openingBalance:200,isActive:true}}),
    prisma.category.create({data:{userId:owner.id,name:'Casa',group:'CASA',type:'expense',isActive:true}}),
    prisma.paymentMethod.create({data:{userId:owner.id,name:'PIX',type:'other',isActive:true}}),
  ]);
  await registerAuth(app);
  await app.register(authRoutes,{prefix:'/auth'});
  await app.register(financeRoutes,{prefix:'/finance'});
  await app.register(appStateRoutes,{prefix:'/app-state'});
  let html='';
  let browserBundle='';
  app.get('/pt197',async(_req,reply)=>reply.header('Cache-Control','no-store')
    .type('text/html; charset=utf-8').send(html));
  app.get('/pt197/bridge.mjs',async(_req,reply)=>reply.header('Cache-Control','no-store')
    .type('text/javascript; charset=utf-8').send(browserBundle));
  app.get('/pt197/hold',async(_req,reply)=>{
    await new Promise<void>(resolve=>held.push(resolve));
    reply.header('Cache-Control','no-store').type('image/gif').send(Buffer.from(''));
  });
  app.get('/pt197/release',async(_req,reply)=>{
    held.splice(0).forEach(resolve=>resolve());
    reply.code(204).send();
  });
  await app.ready();
  const login=await app.inject({method:'POST',url:'/auth/login',
    payload:{email:actor.email,password:pass}});
  assert.equal(login.statusCode,200,login.body);
  const token=login.json().accessToken as string;
  assert.ok(token && token.length>30);
  const expectedHeader={'authorization':'Bearer '+token,
    'x-meg-expected-workspace-id':workspace.id};
  const seed=await app.inject({method:'POST',url:'/finance/events',
    headers:expectedHeader,
    payload:{operationId:randomUUID(),description:'Conta de luz',type:'expense',
      status:'planned',date:'2026-11-22',amount:19.62,
      accountId:account.id,categoryId:category.id,paymentMethodId:method.id}});
  assert.equal(seed.statusCode,201,seed.body);
  const originalId=seed.json().id as string;
  console.log('PT197_REAL_POST_SEED_FICTITIOUS=PASS');
  const apiAuth=[
    "export const readSession=()=>({user:{id:window.qa.userId}});",
    "export async function authenticatedRequest(p,options={}){return window.qa.api(p,options);}"
  ].join('\n');
  const apiFinance=[
    "export const financeClient={",
    " createEvent:(data,workspace)=>window.qa.api('/finance/events',{method:'POST',",
    "  headers:workspace?{'X-MEG-Expected-Workspace-Id':workspace}:{},body:JSON.stringify(data)}),",
    " getHistorySnapshot:(signal)=>window.qa.api('/finance/events/history-snapshot',{signal}),",
    " listEvents:(page,size,search,signal)=>window.qa.api('/finance/events?page='+page+'&pageSize='+size,{signal}),",
    "};"
  ].join('\n');
  const readModel=[
    "export async function invalidatePhoenixReadModelMonth(){}",
    "export async function loadPhoenixReadModel(){throw Error('PT197_REFRESH_NOT_ALLOWED');}",
    "export function peekPhoenixReadModel(){return null;}",
    "export function clearPhoenixReadModelCache(){}"
  ].join('\n');
  const stubMap=new Map<string,string>([
    ['../app/auth-client',apiAuth],['../../app/auth-client',apiAuth],
    ['../app/finance-client',apiFinance],['../../app/finance-client',apiFinance],
    ['../../app/cards-client','export const cardsClient={};'],
    ['../app/payables-client',"export const payablesClient={createRecurring:async()=>{throw Error('PT197_RECURRING_BLOCKED');}};"],
    ['./data/load-phoenix-read-model',readModel],['./load-phoenix-read-model',readModel],
    ['./data/phoenix-transfer-write-gateway',
      "export function preparePhoenixTransfer(){throw Error('PT197_TRANSFER_BLOCKED');}export async function runPhoenixTransferWrite(){throw Error('PT197_TRANSFER_BLOCKED');}"],
    ['./income-payment-methods',
      "export const PHOENIX_INCOME_PAYMENT_METHODS=['PIX'];export function canonicalPhoenixIncomePaymentMethod(v){return String(v).toUpperCase()==='PIX'?'PIX':null;}"],
  ]);
  const root=path.resolve(process.cwd());
  const result=await build({
    entryPoints:[path.join(root,'apps/web/src/phoenix/simple-event-form-bridge.ts')],
    bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',logLevel:'silent',
    define:{'import.meta.env':JSON.stringify({
      VITE_API_URL:'http://127.0.0.1:'+WEB_PORT,
      VITE_STAGE10_ANDROID_CONFIRMATION_QA:'false',
      VITE_PHOENIX_SIMPLE_EVENT_WRITE:'enabled',
      VITE_PHOENIX_BENEFIT_WRITE:'enabled',
    })},
    footer:{js:'window.qa.loaded=true;'},
    plugins:[{name:'pt197-test-boundary',setup(plugin){
      plugin.onResolve({filter:/.*/},args=>{
        if(stubMap.has(args.path))return {path:args.path,namespace:'pt197-mocks'};
      });
      plugin.onLoad({filter:/.*/,namespace:'pt197-mocks'},args=>({
        contents:stubMap.get(args.path),loader:'ts'
      }));
    }}],
  });
  assert.equal(result.outputFiles.length,1);
  browserBundle=result.outputFiles[0].text;
  // EVIDENCIA: estas sao fontes reais, nao stubs.
  assert.ok(browserBundle.includes('PHOENIX_JOURNAL_WORKSPACE_UNAVAILABLE'));
  assert.ok(browserBundle.includes('POSSIBLE_DUPLICATE'));
  console.log('PT197_REAL_BRIDGE_AND_REAL_GATEWAY_BUNDLED=PASS');
  const browserConfig={
    userId:actor.id,workspaceId:workspace.id,token,
    accountId:account.id,categoryId:category.id,methodId:method.id,originalId,
  };
  html=[
    '<!doctype html><html><head><meta charset="utf-8"><title>PT197_PENDING</title></head><body>',
    '<div class="px-launch-drawer"><div class="px-drawer-head"><button class="px-icon-btn">Fechar</button></div>',
    '<div class="px-segment"><button class="active">Despesa</button></div>',
    '<label class="px-field"><span>Descrição</span><input value="Conta de luz"></label>',
    '<label class="px-field"><span>Data do evento</span><input value="2026-11-22"></label>',
    '<label class="px-field"><span>Grupo</span><select><option value="'+category.id+'">Casa</option></select></label>',
    '<label class="px-field"><span>Conta de origem</span><select data-phoenix-account-select="source">',
    '<option value="'+account.id+'" data-account-type="checking">Conta QA</option></select></label>',
    '<label class="px-field"><span>Forma de pagamento</span><select data-phoenix-payment-method-select>',
    '<option value="'+method.id+'">PIX</option></select></label>',
    '<input class="px-money-mask" value="19,62">',
    '<div class="px-notice ok">Paridade do formulario validada</div>',
    '<button class="px-review-launch" type="button">Salvar lançamento</button></div>',
    '<pre id="report">PT197_PENDING</pre>',
    '<script>window.qa='+JSON.stringify(browserConfig)+';',
    'window.qa.loaded=false;window.qa.confirms=0;window.qa.http=[];',
    'window.confirm=()=>{window.qa.confirms++;return true;};',
    'window.qa.api=async(p,options={})=>{',
    'const method=options.method||"GET";',
    'const resp=await fetch(p,{...options,cache:"no-store",headers:{"Content-Type":"application/json",...options.headers,Authorization:"Bearer "+window.qa.token}});',
    'const data=await resp.json().catch(()=>({}));',
    'window.qa.http.push({url:p,method,status:resp.status,body:method==="POST"?JSON.parse(options.body):null,error:resp.ok?null:data.error,details:resp.ok?null:data.details});',
    'if(!resp.ok){const err=Object.assign(new Error(data.error||"HTTP_ERROR"),data,{status:resp.status});throw err;}',
    'return data;};</script>',
    '<script type="module" src="/pt197/bridge.mjs"></script>',
    '<script>(async()=>{',
    'const rows=[];const check=(name,ok)=>{if(!ok)throw Error(name);rows.push(name+"=PASS");};',
    'const until=async(fn,ms=22000)=>{const start=Date.now();while(!fn()){',
    'if(Date.now()-start>ms)throw Error("WAIT_TIMEOUT: "+(document.querySelector("[data-phoenix-writer-feedback]")?.textContent||"NO_FEEDBACK"));',
    'await new Promise(r=>setTimeout(r,30));}};',
    'try{await until(()=>window.qa.loaded&&document.querySelector(".px-review-launch").textContent.includes("Salvar"));',
    'document.querySelector(".px-review-launch").click();',
    'await until(()=>!!document.querySelector(".px-duplicate-check"));',
    'const first=window.qa.http.filter(x=>x.url==="/finance/events"&&x.method==="POST");',
    'check("PT197_REAL_HTTP_409_SINGLE_REJECTION",first.length===1&&first[0].status===409);',
    'check("PT197_NO_JOURNAL_AFTER_REAL_409",!localStorage.getItem("meg.phoenix.create.attempt.v1"));',
    'check("PT197_SECOND_CREATE_REQUIRES_CANONICAL_GET",document.querySelector(".px-duplicate-override").disabled);',
    'document.querySelector(".px-duplicate-check").click();',
    'await until(()=>!document.querySelector(".px-duplicate-override").disabled);',
    'check("PT197_ACTUAL_CANONICAL_HISTORY_CONFIRMED",window.qa.http.some(x=>x.url==="/finance/events/history-snapshot"&&x.status===200));',
    'document.querySelector(".px-duplicate-override").click();',
    'await until(()=>document.querySelector(".px-review-launch").textContent==="Fechar lançamento");',
    'const posts=window.qa.http.filter(x=>x.url==="/finance/events"&&x.method==="POST");',
    'check("PT197_EXPLICIT_SECOND_OPERATION_HTTP201",posts.length===2&&posts[1].status===201&&window.qa.confirms===1);',
    'check("PT197_SECOND_OPERATION_NEW_KEY",posts[0].body.operationId!==posts[1].body.operationId);',
    'check("PT197_OVERRIDE_ONLY_AFTER_REVIEW",posts[0].body.allowDuplicate!==true&&posts[1].body.allowDuplicate===true);',
    'check("PT197_CONFIRMED_AFTER_REAL_HISTORY_GET",window.qa.http.filter(x=>x.url==="/finance/events/history-snapshot"&&x.status===200).length>=2);',
    'check("PT197_JOURNAL_CLEARED_AFTER_VERIFICATION",!localStorage.getItem("meg.phoenix.create.attempt.v1"));',
    'check("PT197_STABLE_AUTH_AND_PINNED_CONTEXT",posts.every(x=>x.body.accountId===window.qa.accountId));',
    'rows.push("PT197_CHROME_BRIDGE_GATE=PASS");document.title="PT197_PASS";',
    '}catch(e){rows.push("PT197_CHROME_BRIDGE_GATE=FAIL:"+String(e?.message||e));',
    'rows.push("PT197_HTTP_OBS="+JSON.stringify(window.qa.http.map(x=>({method:x.method,url:x.url,status:x.status,error:x.error,details:x.details,body:x.status===400?x.body:null}))));document.title="PT197_FAIL";}',
    'document.getElementById("report").textContent=rows.join("\\n");void fetch("/pt197/release");',
    '})();</script><img src="/pt197/hold" hidden></body></html>'
  ].join('\n');
  await app.listen({host:'127.0.0.1',port:WEB_PORT});
  listenerStarted=true;
  console.log('PT197_FASTIFY_LOCALHOST_ONLY=PASS');
  browserProfile=await mkdtemp(path.join(tmpdir(),'meg-pt197-browser-'));
  const profile=path.join(browserProfile,'chrome-profile');
  chrome=spawn(CHROME,[
    '--headless=new','--disable-gpu','--no-first-run','--disable-extensions',
    '--disable-background-networking','--disable-sync','--disable-component-update',
    '--no-crash-upload','--user-data-dir='+profile,'--dump-dom','--virtual-time-budget=35000',
    'http://127.0.0.1:'+WEB_PORT+'/pt197'
  ],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output='';let errors='';
  chrome.stdout?.setEncoding('utf8');chrome.stderr?.setEncoding('utf8');
  chrome.stdout?.on('data',v=>output+=v);
  chrome.stderr?.on('data',v=>errors+=v);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const code=await Promise.race([
    new Promise<number>((resolve,reject)=>{chrome!.once('error',reject);chrome!.once('close',x=>resolve(x??-1));}),
    new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('PT197_CHROME_TIMEOUT')),65000);})
  ]).finally(()=>{if(timeout)clearTimeout(timeout);});
  assert.equal(code,0,'PT197_CHROME_EXIT '+code+' '+errors.slice(-300));
  const m=output.match(/<pre id=["']report["']>([\s\S]*?)<\/pre>/);
  assert.ok(m,'PT197_REPORT_NOT_FOUND '+output.slice(-900));
  const report=m[1].replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>');
  console.log(report);
  assert.ok(report.includes('PT197_CHROME_BRIDGE_GATE=PASS'),'PT197_CHROME_UI_NOT_CONFIRMED');
  console.log('PT197_CHROME_REAL_JWT_POST_AND_GET=PASS');
  const events=await prisma.financialEvent.findMany({where:{
    workspaceId:workspace.id,description:'Conta de luz'},select:{id:true}});
  assert.equal(events.length,2,'PT197_EXPECT_EXACTLY_TWO_FINANCIAL_EVENTS');
  assert.ok(events.some(item=>item.id===originalId));
  const receipts=await prisma.cloudMutationReceipt.count({where:{
    workspaceId:workspace.id,mutationType:'FINANCIAL_EVENT_CREATE'}});
  assert.equal(receipts,2,'PT197_EXPECT_EXACTLY_TWO_CONFIRMED_CREATE_RECEIPTS');
  const ledgerCount=await prisma.ledgerEntry.count({where:{eventId:{in:events.map(e=>e.id)}}});
  assert.equal(ledgerCount,0,'PT197_PLANNED_EVENTS_NEVER_POST_TO_LEDGER');
  console.log('PT197_PG17_TWO_EXPLICIT_EVENTS_TWO_RECEIPTS_NO_PLANNED_LEDGER=PASS');
  console.log('PT197_FINAL_INTEGRATED_CHROME_HTTP_JWT_PG17_GATE=PASS');
} finally {
  if(chrome && chrome.exitCode===null)chrome.kill();
  held.splice(0).forEach(resolve=>resolve());
  await app.close();
  await prisma.$disconnect();
  if(browserProfile){await rm(browserProfile,{recursive:true,force:true});
    console.log('PT197_EPHEMERAL_BROWSER_PROFILE_REMOVED=PASS');}
}
