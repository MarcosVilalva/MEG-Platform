/**
 * PT199: Chrome real + bridge/gateway reais + Fastify/JWT/PG17 descartavel.
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
  || u.port !== '55575' || u.pathname !== '/meg_stage10_pt199_sandbox'
  || u.username !== 'meg_stage10_ci'
  || process.env.MEG_STAGE10_PT199_SYNTHETIC !== '1'
  || process.env.MEG_STAGE10_ISOLATED_PG !== '1'
  || process.env.MEG_STAGE10_WEB_WRITE_QA === '1'
  || process.env.NODE_ENV !== 'test') {
  throw Error('PT199_LOCAL_SYNTHETIC_DB_ONLY');
}
const WEB_PORT=33355;
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
if (!existsSync(CHROME)) throw Error('PT199_CHROME_NOT_FOUND');
const app=fastify({logger:false});
let chrome: ReturnType<typeof spawn> | undefined;
let browserProfile: string | undefined;
let listenerStarted=false;
const held: Array<() => void>=[];
try {
  const stamp=randomUUID();
  const pass='PT199-fixture-'+stamp;
  const makeUser=async (who:string) => prisma.user.create({data:{
    email:'pt199-'+who+'-'+stamp+'@example.invalid',
    name:'PT199 Synthetic '+who,
    passwordHash:await bcrypt.hash(pass,8),
    role:UserRole.ADMIN,status:UserStatus.ACTIVE,isActive:true,approvedAt:new Date(),
  }});
  const owner=await makeUser('owner');
  const actor=await makeUser('operator');
  const plan=await prisma.plan.create({data:{
    code:'PT199-'+stamp,name:'PT199 Synthetic Plan',monthlyPrice:0,maxMembers:5,features:[],
  }});
  const workspace=await prisma.workspace.create({data:{
    ownerId:owner.id,name:'PT199 disposable',slug:'pt199-'+stamp,
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
    prisma.account.create({data:{userId:owner.id,name:'PT199 Conta Ficticia',
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
  app.get('/pt199',async(_req,reply)=>reply.header('Cache-Control','no-store')
    .type('text/html; charset=utf-8').send(html));
  app.get('/pt199/bridge.mjs',async(_req,reply)=>reply.header('Cache-Control','no-store')
    .type('text/javascript; charset=utf-8').send(browserBundle));
  app.get('/pt199/hold',async(_req,reply)=>{
    await new Promise<void>(resolve=>held.push(resolve));
    reply.header('Cache-Control','no-store').type('image/gif').send(Buffer.from(''));
  });
  app.get('/pt199/release',async(_req,reply)=>{
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
    payload:{operationId:randomUUID(),description:'PT199 Fixture base',type:'expense',
      status:'planned',date:'2026-11-22',amount:19.62,
      accountId:account.id,categoryId:category.id,paymentMethodId:method.id}});
  assert.equal(seed.statusCode,201,seed.body);
  const originalId=seed.json().id as string;
  console.log('PT199_REAL_POST_SEED_FICTITIOUS=PASS');
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
    "export async function loadPhoenixReadModel(){throw Error('PT199_REFRESH_NOT_ALLOWED');}",
    "export function peekPhoenixReadModel(){return null;}",
    "export function clearPhoenixReadModelCache(){}"
  ].join('\n');
  const stubMap=new Map<string,string>([
    ['../app/auth-client',apiAuth],['../../app/auth-client',apiAuth],
    ['../app/finance-client',apiFinance],['../../app/finance-client',apiFinance],
    ['../../app/cards-client','export const cardsClient={};'],
    ['../app/payables-client',"export const payablesClient={createRecurring:async()=>{throw Error('PT199_RECURRING_BLOCKED');}};"],
    ['./data/load-phoenix-read-model',readModel],['./load-phoenix-read-model',readModel],
    ['./data/phoenix-transfer-write-gateway',
      "export function preparePhoenixTransfer(){throw Error('PT199_TRANSFER_BLOCKED');}export async function runPhoenixTransferWrite(){throw Error('PT199_TRANSFER_BLOCKED');}"],
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
    plugins:[{name:'pt199-test-boundary',setup(plugin){
      plugin.onResolve({filter:/.*/},args=>{
        if(stubMap.has(args.path))return {path:args.path,namespace:'pt199-mocks'};
      });
      plugin.onLoad({filter:/.*/,namespace:'pt199-mocks'},args=>({
        contents:stubMap.get(args.path),loader:'ts'
      }));
    }}],
  });
  assert.equal(result.outputFiles.length,1);
  browserBundle=result.outputFiles[0].text;
  // EVIDENCIA: estas sao fontes reais, nao stubs.
  assert.ok(browserBundle.includes('PHOENIX_JOURNAL_WORKSPACE_UNAVAILABLE'));
  assert.ok(browserBundle.includes('POSSIBLE_DUPLICATE'));
  console.log('PT199_REAL_BRIDGE_AND_REAL_GATEWAY_BUNDLED=PASS');
  const browserConfig={
    userId:actor.id,workspaceId:workspace.id,token,
    accountId:account.id,categoryId:category.id,methodId:method.id,originalId,
  };
  html=[
    '<!doctype html><html><head><meta charset="utf-8"><title>PT199_PENDING</title></head><body>',
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
    '<pre id="report">PT199_PENDING</pre>',
    '<script>window.qa='+JSON.stringify(browserConfig)+';',
    'window.qa.loaded=false;window.qa.confirms=0;window.qa.http=[];',
    'window.confirm=()=>{window.qa.confirms++;return true;};',
    'window.qa.api=async(p,options={})=>{',
    'const method=options.method||"GET";',
    'const resp=await fetch(p,{...options,cache:"no-store",headers:{"Content-Type":"application/json",...options.headers,Authorization:"Bearer "+window.qa.token}});',
    'const data=await resp.json().catch(()=>({}));',
    'window.qa.http.push({url:p,method,status:resp.status,body:method==="POST"?JSON.parse(options.body):null,error:resp.ok?null:data.error,details:resp.ok?null:data.details});',
    'if(method==="POST"&&p==="/finance/events"&&resp.status===201&&!localStorage.getItem("pt199-fault-used")){',
    'localStorage.setItem("pt199-fault-used","1");throw new Error("PT199_ACK_LOST_AFTER_COMMIT");}',
    'if(!resp.ok){const err=Object.assign(new Error(data.error||"HTTP_ERROR"),data,{status:resp.status});throw err;}',
    'return data;};</script>',
    '<script type="module" src="/pt199/bridge.mjs"></script>',
    "<script>(async()=>{\nconst rows=[];const check=(name,ok)=>{if(!ok)throw Error(name);rows.push(name+'=PASS');};\nconst until=async(fn,ms=22000)=>{const start=Date.now();while(!fn()){\n if(Date.now()-start>ms)throw Error('WAIT_TIMEOUT '+(document.querySelector('[data-phoenix-writer-feedback]')?.textContent||''));await new Promise(r=>setTimeout(r,40));\n}};\nconst prior=localStorage.getItem('pt199-phase')==='second';\ntry {\n await until(()=>window.qa.loaded&&(prior?document.querySelector('.px-review-launch').textContent==='Verificar gravação':document.querySelector('.px-review-launch').textContent.includes('Salvar')));\n document.querySelector('.px-review-launch').click();\n if(!prior){\n   await until(()=>window.qa.http.some(x=>x.url==='/finance/events'&&x.method==='POST'&&x.status===201));\n   await until(()=>!!localStorage.getItem('meg.phoenix.create.attempt.v1'));\n   const posts=window.qa.http.filter(x=>x.method==='POST'&&x.url==='/finance/events');\n   const journal=JSON.parse(localStorage.getItem('meg.phoenix.create.attempt.v1'));\n   check('PT199_FIRST_HTTP201_BUT_RESPONSE_LOST',posts.length===1&&posts[0].status===201);\n   check('PT199_DURABLE_JOURNAL_SAME_OPERATION_ID',journal.operationId===posts[0].body.operationId);\n   check('PT199_POSTCOMMIT_ACK_LOST_INJECTED',localStorage.getItem('pt199-fault-used')==='1');\n   await until(()=>document.querySelector('.px-review-launch').textContent==='Verificar gravação');\n   check('PT199_NO_FALSE_CONFIRMATION_ON_LOST_ACK',!document.querySelector('.px-review-launch').textContent.includes('Fechar'));\n   localStorage.setItem('pt199-phase','second');\n   rows.push('PT199_FIRST_BROWSER_GATE=PASS');document.title='PT199_FIRST_PASS';\n }else{\n   await until(()=>document.querySelector('.px-review-launch').textContent==='Verificar gravação');\n   const postsBefore=window.qa.http.filter(x=>x.method==='POST'&&x.url==='/finance/events');\n   check('PT199_RESTART_FIRST_CLICK_NO_POST',postsBefore.length===0);\n   const journal=JSON.parse(localStorage.getItem('meg.phoenix.create.attempt.v1'));\n   const expectedOperationId=journal.operationId;\n   document.querySelector('.px-review-launch').click();\n   await new Promise(r=>setTimeout(r,400));\n   check('PT199_VERIFY_WITHOUT_EVENT_ID_NO_POST',window.qa.http.filter(x=>x.method==='POST'&&x.url==='/finance/events').length===0);\n   await until(()=>!!document.querySelector('.px-retry-unconfirmed'));\n   document.querySelector('.px-retry-unconfirmed').click();\n   await until(()=>document.querySelector('.px-review-launch').textContent==='Fechar lançamento');\n   const posts=window.qa.http.filter(x=>x.method==='POST'&&x.url==='/finance/events');\n   check('PT199_RECOVERY_REUSES_SAME_OPERATION',posts.length===1&&posts[0].body.operationId===expectedOperationId);\n   check('PT199_RECOVERY_CONFIRMED_CANONICAL_GET',window.qa.http.some(x=>x.url==='/finance/events/history-snapshot'&&x.status===200));\n   check('PT199_RECOVERY_JOURNAL_CLEARED_AFTER_GET',!localStorage.getItem('meg.phoenix.create.attempt.v1'));\n   rows.push('PT199_SECOND_BROWSER_GATE=PASS');document.title='PT199_SECOND_PASS';\n }\n}catch(e){rows.push('PT199_BROWSER_GATE=FAIL:'+String(e?.message||e));document.title='PT199_FAIL';}\ndocument.getElementById('report').textContent=rows.join('\\n');void fetch('/pt199/release');\n})();</script><img src=\"/pt199/hold\" hidden></body></html>",
  ].join('\n');
  await app.listen({host:'127.0.0.1',port:WEB_PORT});
  listenerStarted=true;
  console.log('PT199_FASTIFY_LOCALHOST_ONLY=PASS');
  browserProfile=await mkdtemp(path.join(tmpdir(),'meg-pt199-browser-'));
  const profile=path.join(browserProfile,'chrome-profile');
  async function runBrowserPhase(label: 'FIRST'|'SECOND') {
    chrome=spawn(CHROME,[
      '--headless=new','--disable-gpu','--no-first-run','--disable-extensions',
      '--disable-background-networking','--disable-sync','--disable-component-update',
      '--no-crash-upload','--user-data-dir='+profile,'--dump-dom','--virtual-time-budget=35000',
      'http://127.0.0.1:'+WEB_PORT+'/pt199'
    ],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    let output='';let errors='';
    chrome.stdout?.setEncoding('utf8');chrome.stderr?.setEncoding('utf8');
    chrome.stdout?.on('data',v=>output+=v);
    chrome.stderr?.on('data',v=>errors+=v);
    let timeout:ReturnType<typeof setTimeout>|undefined;
    const code=await Promise.race([
      new Promise<number>((resolve,reject)=>{chrome!.once('error',reject);chrome!.once('close',x=>resolve(x??-1));}),
      new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('PT199_CHROME_TIMEOUT')),65000);})
    ]).finally(()=>{if(timeout)clearTimeout(timeout);});
    assert.equal(code,0,'PT199_CHROME_EXIT '+code+' '+errors.slice(-300));
    const match=output.match(/<pre id=["']report["']>([\s\S]*?)<\/pre>/);
    assert.ok(match,'PT199_REPORT_NOT_FOUND '+output.slice(-650));
    const report=match[1].replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>');
    console.log(report);
    assert.ok(report.includes('PT199_'+label+'_BROWSER_GATE=PASS'),'PT199_'+label+'_BROWSER_GATE_FAILED');
    console.log('PT199_REAL_CHROME_'+label+'_PROCESS_CLOSED=PASS');
    chrome=undefined;
  }
  await runBrowserPhase('FIRST');
  const afterFirst=await prisma.financialEvent.findMany({
    where:{workspaceId:workspace.id,description:'Conta de luz'},select:{id:true}
  });
  assert.equal(afterFirst.length,1,'PT199_EXPECT_ONE_COMMIT_AFTER_RESPONSE_LOST');
  const receiptsFirst=await prisma.cloudMutationReceipt.count({
    where:{workspaceId:workspace.id,mutationType:'FINANCIAL_EVENT_CREATE'}
  });
  assert.equal(receiptsFirst,2,'PT199_ONE_SEED_AND_ONE_ACCEPTED_RECEIPT');
  console.log('PT199_POSTCOMMIT_ONE_EVENT_ONE_RECEIPT=PASS');
  await runBrowserPhase('SECOND');
  const afterRestart=await prisma.financialEvent.findMany({
    where:{workspaceId:workspace.id,description:'Conta de luz'},select:{id:true}
  });
  assert.equal(afterRestart.length,1);
  assert.equal(afterRestart[0].id,afterFirst[0].id);
  const receiptsRestart=await prisma.cloudMutationReceipt.count({
    where:{workspaceId:workspace.id,mutationType:'FINANCIAL_EVENT_CREATE'}
  });
  assert.equal(receiptsRestart,receiptsFirst);
  assert.equal(await prisma.ledgerEntry.count({where:{eventId:afterRestart[0].id}}),0);
  console.log('PT199_BROWSER_RESTART_NO_SECOND_CREATE_AND_LEDGER=PASS');
  console.log('PT199_INTEGRATED_LOST_ACK_CHROME_JWT_PG17_GATE=PASS');
} finally {
  if(chrome && chrome.exitCode===null)chrome.kill();
  held.splice(0).forEach(resolve=>resolve());
  await app.close();
  await prisma.$disconnect();
  if(browserProfile){await rm(browserProfile,{recursive:true,force:true});
    console.log('PT199_EPHEMERAL_BROWSER_PROFILE_REMOVED=PASS');}
}
