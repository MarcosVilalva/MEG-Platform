import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const base='https://127.0.0.1:4175';
const api='https://qa-api.example.invalid';
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
  amount:'12.50',signedAmount:'-12.50',accountId:'synthetic-account',
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
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('request',r=>{const pathname=new URL(r.url()).pathname;if(pathname.startsWith('/auth/')||pathname.startsWith('/finance/'))requests.push(r.method()+' '+r.url());});
 page.on('requestfailed',r=>failures.push(r.url()+' '+(r.failure()?.errorText||'')));
 await page.route(api+'/**',async route=>{
  const req=route.request();
  const url=new URL(req.url());
  apiCalls.push(req.method()+' '+url.pathname);
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
  if(req.method()==='GET'&&url.pathname==='/auth/me')
   return route.fulfill({status:200,headers,body:JSON.stringify({user})});
  if(req.method()==='GET'&&url.pathname==='/finance/stage10-readonly/snapshot')
   return route.fulfill({status:200,headers,body:JSON.stringify(snapshot)});
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
 assert.ok(apiCalls.includes('POST /auth/login'));
 assert.ok(apiCalls.includes('GET /auth/me'));
 assert.ok(apiCalls.includes('GET /finance/stage10-readonly/snapshot'));
 assert.ok(apiCalls.filter(call=>call.includes('/finance/')).every(call=>call==='GET /finance/stage10-readonly/snapshot'));
 assert.equal(await page.locator('.meg-unified-stamp').innerText().then(s=>s.includes('Somente leitura')),true);
 assert.deepEqual(errors,[],'Sem excecao no navegador');
 console.log('STAGE10_SYNTHETIC_BROWSER_AUTHENTICATED_READ_PASS');
}finally{await browser.close();}
