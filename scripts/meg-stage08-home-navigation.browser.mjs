import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const app='http://127.0.0.1:4174/web-evolution.html';
const identity={id:'stage08-home-nav-user',name:'Usuário QA Etapa 08',email:'stage08@example.invalid',role:'VIEWER',status:'ACTIVE',isActive:true};
const session={user:identity,accessToken:'stage08-readonly-token',refreshToken:'stage08-refresh-test',refreshExpiresAt:'2099-12-31T23:59:59.000Z'};
const now=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
const val=k=>now.find(x=>x.type===k)?.value||'00';
const month=val('year')+'-'+val('month'),asOf=month+'-'+val('day');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 for(const [width,height] of [[1366,768],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const failures=[],methods=[];
  page.on('pageerror',error=>failures.push(String(error)));
  await page.addInitScript(({session,userId})=>{
   sessionStorage.setItem('meg.auth.session',JSON.stringify(session));
   localStorage.setItem('meg.web.home.quick-actions.v1.user.'+encodeURIComponent(userId),JSON.stringify(['pendentes','lancamentos','cartoes']));
  },{session,userId:identity.id});
  await page.route('**/auth/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:identity})}));
  await page.route('**/finance/**',async route=>{
   const req=route.request(),url=new URL(req.url());
   methods.push({method:req.method(),path:url.pathname});
   const pathname=url.pathname;
   let response;
   if(pathname.endsWith('/finance/summary'))response={month,income:400,expense:240,projectedResult:160,realizedResult:125,pendingCount:0,pendingAmount:0};
   else if(pathname.endsWith('/finance/cashflow'))response={month,days:[]};
   else if(pathname.endsWith('/finance/benefit-summary'))response={month,balance:0,credits:0,used:0};
   else if(pathname.endsWith('/finance/events/month'))response={items:[]};
   else if(pathname.endsWith('/finance/home-commitments'))response={asOf,items:[],hasMore:false,nextCursor:null};
   else if(pathname.endsWith('/finance/sync-status'))response={token:'stage08-unchanged',changedAt:null,mutationType:null,capabilities:{historySnapshotV1:false,filteredSummaryV1:false}};
   else if(pathname.endsWith('/finance/events'))response={items:[],total:0,page:1,pageSize:100};
   else if(pathname.endsWith('/finance/accounts'))response=[];
   else if(pathname.endsWith('/finance/categories'))response=[];
   else if(pathname.endsWith('/finance/payment-methods'))response=[];
   else if(pathname.endsWith('/finance/home-available'))response=null;
   else response={items:[]};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
  });
  await page.route('**/cards?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/payables/open',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  try{
   await page.goto(app,{waitUntil:'domcontentloaded'});
   const quick=page.getByRole('region',{name:'Atalhos da Home'});
   await quick.waitFor({timeout:20000});
   await quick.getByRole('button',{name:/Pagar conta/}).click();
   await page.getByRole('status').filter({hasText:'Pendentes ainda não está disponível nesta etapa da Web.'}).waitFor();
   assert.equal(await page.locator('.meg-l09').count(),0,'Atalho não autorizado abriu tela nova');
   if(width<640)await page.getByRole('button',{name:'Ver próximos atalhos'}).click();
   await quick.getByRole('button',{name:/Lançamentos/}).click();
   await page.locator('.meg-l09').waitFor({timeout:12000});
   assert.equal(await page.locator('.meg-nav-item[aria-label="Lançamentos"].is-active').count(),1,'Seção ativa não mudou');
   assert.equal(await page.locator('.pano-root').count(),0,'Home e Lançamentos renderizados juntos');
   if(width<1024)await page.getByRole('button',{name:'Abrir menu'}).click();
   await page.locator('.meg-sidebar .meg-nav-item[aria-label="Início"]').click();
   await quick.waitFor({timeout:20000});
   assert.equal(await page.locator('.meg-nav-item[aria-label="Início"].is-active').count(),1,'Retorno à Home perdeu navegação');
   if(width<640)await page.getByRole('button',{name:'Ver próximos atalhos'}).click();
   assert.equal(await quick.getByRole('button',{name:/Lançamentos/}).count(),1,'Atalho do usuário não foi preservado');
   const saved=await page.evaluate(id=>localStorage.getItem('meg.web.home.quick-actions.v1.user.'+encodeURIComponent(id)),identity.id);
   assert.deepEqual(JSON.parse(saved),['pendentes','lancamentos','cartoes'],'Preferência de atalhos foi modificada');
   const dimensions=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
   assert.ok(dimensions.doc<=dimensions.viewport+2,'Rolagem horizontal na Home após voltar');
   assert.deepEqual(methods.filter(x=>x.method!=='GET'),[],'A navegação produziu escrita financeira');
   assert.deepEqual(failures,[],'Erros JS na navegação');
   console.log('STAGE08_HOME_NAVIGATION '+width+'x'+height+' PASS (atalho, fallback, retorno, persistência e zero writes)');
  }finally{await page.close()}
 }
}finally{await browser.close()}
