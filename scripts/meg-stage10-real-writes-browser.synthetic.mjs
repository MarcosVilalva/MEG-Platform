import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const base='https://127.0.0.1:4175';
const api='https://qa-auth.example.invalid';
const readonlyApi='https://qa-read.example.invalid';
const owner='stage10-synthetic-owner';
const workspace='stage10-synthetic-workspace';
const user={id:owner,name:'Usuario de teste sintetico',email:'stage10@example.invalid',role:'ADMIN',status:'ACTIVE',isActive:true};
const monthParts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date());
const month=(monthParts.find(p=>p.type==='year')?.value||'2026')+'-'+(monthParts.find(p=>p.type==='month')?.value||'11');
const summary={month,availableBalance:0,income:0,expense:12.50,projectedResult:-12.50,realizedIncome:0,realizedExpense:12.50,realizedResult:-12.50,eventCount:1,pendingCount:0,pendingAmount:0,nextDue:null,topCategories:[]};
const snapshot={
 kind:'stage10-financial-readonly-snapshot-v1',
 canWrite:false,consistency:'repeatable-read',actorId:owner,workspaceId:workspace,dataOwnerId:owner,total:1,
 events:[{
  id:'stage10-synthetic-event',userId:owner,workspaceId:workspace,
  description:'DESPESA SINTETICA PARA NAVEGADOR',type:'expense',status:'paid',
  date:month+'-10T12:00:00.000Z',competence:month,
  amount:'12.50',signedAmount:'-12.50',enteredAmount:12.5,accountId:'synthetic-account',
  categoryId:'synthetic-category',paymentMethodId:'synthetic-method',
  notes:'Dado ficticio, nunca exportado da base real',
 }],
 accounts:[{id:'synthetic-account',name:'Conta ficticia',type:'checking',isActive:true,openingBalance:'0'}],
 categories:[{id:'synthetic-category',name:'Categoria ficticia',type:'expense',isActive:true}],
 paymentMethods:[{id:'synthetic-method',name:'PIX ficticio',type:'ordinary',isActive:true}],
 cards:[],summary,cashflow:{month,openingBalance:0,projectedClosing:-12.5,realizedClosing:-12.5,totalIncome:0,totalExpense:12.5,days:[]},
};
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768},ignoreHTTPSErrors:true});
 await page.addInitScript(()=>{
  const original=window.fetch.bind(window);
  window.__MEG_SYNTHETIC_FETCH_TRACES__=[];
  window.fetch=(input,init)=>{
   window.__MEG_SYNTHETIC_FETCH_TRACES__.push({url:typeof input==='string'?input:String(input?.url||input),method:init?.method||'GET'});
   return original(input,init);
  };
 });
 const apiCalls=[];const errors=[];const requests=[];const failures=[];
 const writerCalls=[];
 let exceedHistoryLimit=false;
 let expireReadonlyTokenOnce=true;
 let exchangeCount=0;
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('request',r=>{const pathname=new URL(r.url()).pathname;if(pathname.startsWith('/auth/')||pathname.startsWith('/finance/'))requests.push(r.method()+' '+r.url());});
 page.on('requestfailed',r=>failures.push(r.url()+' '+(r.failure()?.errorText||'')));
 await page.route(readonlyApi+'/**',async route=>{
  const req=route.request();
  const url=new URL(req.url());
  apiCalls.push(url.origin+' '+req.method()+' '+url.pathname);
  const headers={
   'access-control-allow-origin':base,'access-control-allow-methods':'GET,OPTIONS',
   'access-control-allow-headers':'authorization',
   'content-type':'application/json','cache-control':'private, no-store',
  };
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  if(req.method()==='GET'&&url.pathname==='/finance/stage10-readonly/snapshot')
   assert.match(req.headers().authorization||'',/^Bearer synthetic\.qa\.\d+$/,
    'QA nao recebe JWT HMAC nem refresh token');
  if(req.method()==='GET'&&url.pathname==='/finance/stage10-readonly/snapshot'&&expireReadonlyTokenOnce){
   expireReadonlyTokenOnce=false;
   return route.fulfill({status:401,headers,body:JSON.stringify({error:'UNAUTHORIZED'})});
  }
  if(req.method()==='GET'&&url.pathname==='/finance/stage10-readonly/snapshot')
   return route.fulfill({status:200,headers,body:JSON.stringify(exceedHistoryLimit
    ? {kind:'stage10-financial-history-limit-v1',canWrite:false,limit:5000,total:5001}
    : snapshot)});
  return route.fulfill({status:503,headers,body:JSON.stringify({error:'READONLY_API_REJECTED_REQUEST'})});
 });
 await page.route(api+'/**',async route=>{
  const req=route.request();
  const url=new URL(req.url());
  apiCalls.push(url.origin+' '+req.method()+' '+url.pathname);
  const headers={
   'access-control-allow-origin':base,
   'access-control-allow-methods':'GET,POST,OPTIONS',
   'access-control-allow-headers':'authorization,content-type',
   'content-type':'application/json',
   'cache-control':'private, no-store',
  };
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
  if(req.method()==='POST'&&url.pathname==='/auth/login')
   return route.fulfill({status:200,headers,body:JSON.stringify({
    user,accessToken:'synthetic-access',refreshToken:'synthetic-refresh-token-valid',
    refreshExpiresAt:'2099-01-01T00:00:00.000Z',
   })});
  if(req.method()==='POST'&&url.pathname==='/auth/stage10-qa/exchange'){
   const body=JSON.parse(req.postData()||'{}');
   assert.ok(['synthetic-refresh-token-valid','synthetic-refreshed-token-valid'].includes(body.refreshToken));
   assert.ok((req.headers().authorization||'').startsWith('Bearer synthetic-'));
   exchangeCount++;
   return route.fulfill({status:200,headers,body:JSON.stringify({
    kind:'stage10-qa-read-token-v1',canWrite:false,actorId:owner,
    accessToken:'synthetic.qa.'+exchangeCount,expiresAt:Math.floor(Date.now()/1000)+120,
   })});
  }
  if(req.method()==='GET'&&url.pathname==='/auth/me')
   return route.fulfill({status:200,headers,body:JSON.stringify({user})});
  if(req.method()==='POST'&&url.pathname==='/auth/refresh')
   return route.fulfill({status:200,headers,body:JSON.stringify({
    user,accessToken:'synthetic-refreshed-access',refreshToken:'synthetic-refreshed-token-valid',
    refreshExpiresAt:'2099-01-01T00:00:00.000Z',
   })});
  if(req.method()==='POST'&&url.pathname==='/finance/events'){
   const body=JSON.parse(req.postData()||'{}');
   writerCalls.push({path:url.pathname,body});
   assert.equal(body.type,'expense');
   assert.equal(body.status,'paid');
   assert.equal(body.amount,125.49);
   assert.equal(body.accountId,'synthetic-account');
   assert.equal(body.categoryId,'synthetic-category');
   assert.equal(body.paymentMethodId,'synthetic-method');
   assert.match(body.operationId,/^[0-9a-f-]{36}$/);
   return route.fulfill({status:201,headers,body:JSON.stringify({
    id:'synthetic-created',...body,signedAmount:'-125.49',updatedAt:new Date().toISOString(),
   })});
  }
  return route.fulfill({status:503,headers,body:JSON.stringify({error:'UNEXPECTED_SYNTHETIC_API_REQUEST'})});
 });
 await page.goto(base+'/meg-unificado-qa.html?visual=prism&dados=reais&tela=lancamentos',{waitUntil:'domcontentloaded'});
 await page.locator('input[type=email]').fill('stage10@example.invalid');
 await page.locator('input[type=password]').fill('synthetic-passphrase-for-test');
 await page.getByRole('button',{name:'Entrar no MEG'}).click();
 try{
  await page.locator('[data-meg-unified-screen="launches"]').waitFor({state:'visible',timeout:20000});
 }catch(error){
  console.error('SYNTHETIC_BROWSER_SCREEN',await page.locator('body').innerText().catch(()=>'<unavailable>'));
  console.error('SYNTHETIC_BROWSER_API_CALLS',apiCalls);
  console.error('SYNTHETIC_BROWSER_REQUESTS',requests);
  console.error('SYNTHETIC_BROWSER_FAILURES',failures);
  console.error('SYNTHETIC_BROWSER_LOGIN_MODE',await page.locator('[data-meg-login]').getAttribute('data-meg-login').catch(()=>'<unknown>'));
  console.error('SYNTHETIC_BROWSER_BLOCKED',await page.evaluate(()=>window.__MEG_UNIFIED_QA_BLOCKED__||[]).catch(()=>[]));
  console.error('SYNTHETIC_BROWSER_FETCH_TRACES',await page.evaluate(()=>window.__MEG_SYNTHETIC_FETCH_TRACES__||[]).catch(()=>[]));
  console.error('SYNTHETIC_BROWSER_JS_ERRORS',errors);
  throw error;
 }
 await page.getByText('DESPESA SINTETICA PARA NAVEGADOR').first().waitFor({state:'visible',timeout:20000});
 assert.ok(apiCalls.includes(api+' POST /auth/login'));
 assert.ok(!apiCalls.includes(api+' GET /auth/me'), 'QA nao chama /auth/me canonico potencialmente mutante');
 assert.ok(apiCalls.includes(api+' POST /auth/refresh'));
 assert.equal(apiCalls.filter(call=>call===api+' POST /auth/stage10-qa/exchange').length,2,
  'token QA deve ser solicitado apos login e apos refresh');
 assert.equal(apiCalls.filter(call=>call===readonlyApi+' GET /finance/stage10-readonly/snapshot').length,2,
  'Somente duas tentativas no backend QA: token expirado e token renovado');
 assert.ok(apiCalls.includes(readonlyApi+' GET /finance/stage10-readonly/snapshot'));
 assert.ok(apiCalls.filter(call=>call.includes('/finance/')).every(call=>
  call===readonlyApi+' GET /finance/stage10-readonly/snapshot'));
 assert.ok(apiCalls.filter(call=>call.includes('/auth/')).every(call=>call.startsWith(api+' ')));
 assert.ok(!apiCalls.some(call=>call.includes('/auth/refresh')&&call.startsWith(readonlyApi)));
 assert.ok(!apiCalls.some(call=>call.includes('/exchange')&&call.startsWith(readonlyApi)));
 assert.ok(exchangeCount===2,'duas trocas de token no caso expirado');
 const traces=await page.evaluate(()=>window.__MEG_SYNTHETIC_FETCH_TRACES__||[]);
 assert.ok(!traces.some(t=>t.url.includes('accessToken=')||t.url.includes('refreshToken=')));
 assert.equal(await page.locator('.meg-unified-stamp').innerText().then(s=>s.includes('Gravacao canonica')),true);
 assert.deepEqual(errors,[],'Sem excecao no navegador');

 // Escrita real OPT-IN, mas somente com respostas interceptadas pelo Playwright.
 // A API QA financeira nao recebe POST; escritor fica exclusivamente no origin canonico.
 await page.getByRole('button',{name:'Novo lançamento'}).first().click();
 await page.getByRole('button',{name:'Escolher Despesa'}).click();
 const form=page.locator('.meg-t10-expense');
 await form.waitFor({state:'visible'});
 await form.locator('input[id$="description"]').fill('DESPESA QA SINTETICA');
 await form.locator('select[id$="category"]').selectOption('synthetic-category');
 await form.locator('select[id$="method"]').selectOption('synthetic-method');
 await form.locator('select[id$="account"]').selectOption('synthetic-account');
 await form.locator('.meg-t10-expense-date-entry input[type="text"]').fill('14/11/2026');
 await form.locator('.meg-t10-expense-date-entry input[type="text"]').press('Tab');
 await form.locator('input[id$="amount"]').fill('125,49');
 const save=form.getByRole('button',{name:'Salvar lançamento'});
 assert.equal(await save.isEnabled(),true);
 await save.click();
 await page.waitForFunction(()=>document.body.textContent?.includes('Lancamento criado pela API financeira.'),null,{timeout:20000});
 assert.equal(writerCalls.length,1,'Somente 1 POST idempotente de criacao');
 assert.ok(apiCalls.includes(api+' POST /finance/events'));
 assert.ok(!apiCalls.some(call=>call.startsWith(readonlyApi+' POST')),
  'backend QA deve continuar somente leitura');
 assert.deepEqual(errors,[],'Navegador sem excecoes');
 console.log('STAGE10_SYNTHETIC_BROWSER_OPTIN_CANONICAL_WRITE_ONLY_PASS');
}finally{await browser.close();}
