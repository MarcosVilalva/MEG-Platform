import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

/**
 * Contrato isolado: duas sessoes sinteticas sobre a mesma URL, sem API real.
 * Verifica que JWT, historico, preferencias e interface nao cruzam usuarios.
 */
const base=process.env.MEG_STAGE10_PRISM_TEST_BASE||'http://127.0.0.1:4175';
const users=[
 {id:'synthetic-scope-user-a',token:'ci-scope-jwt-a',name:'Titular A',description:'EVENTO EXCLUSIVO A'},
 {id:'synthetic-scope-user-b',token:'ci-scope-jwt-b',name:'Titular B',description:'EVENTO EXCLUSIVO B'},
];
const current=new Intl.DateTimeFormat('en-US',{
 timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',
}).formatToParts(new Date());
const year=current.find(i=>i.type==='year').value;
const month=current.find(i=>i.type==='month').value;
const key=year+'-'+month;
const financialEvent=(u)=>({
 id:'evt-'+u.id,description:u.description,type:'expense',status:'paid',
 date:key+'-10T12:00:00.000Z',competence:key,
 amount:'18.75',signedAmount:'-18.75',accountId:'acc-'+u.id,
 categoryId:'cat-'+u.id,paymentMethodId:'pay-'+u.id,
 account:{id:'acc-'+u.id,name:'Conta '+u.name,type:'checking'},
 category:{id:'cat-'+u.id,name:'Categoria '+u.name},
 paymentMethod:{id:'pay-'+u.id,name:'PIX',type:'instant'},
 sourcePayload:null,
});
const mock=(u,path)=>{
 if(path==='/auth/me')return {user:{id:u.id,name:u.name,email:u.id+'@local.invalid',role:'ADMIN',status:'ACTIVE',isActive:true}};
 if(path==='/finance/sync-status')return {token:'scope-revision-'+u.id,
  capabilities:{historySnapshotV1:true,filteredSummaryV1:true}};
 if(path==='/finance/events/month')return {
  items:[financialEvent(u)],total:1,page:1,pageSize:1,
 };
 if(path==='/finance/events/history-snapshot')return {
  kind:'complete',protocol:'financial-history-v1',consistency:'repeatable-read',
  total:1,items:[financialEvent(u)],
 };
 if(path==='/finance/events/filtered-summary')return {
  kind:'complete',protocol:'financial-filter-summary-v1',consistency:'repeatable-read',
  total:1,filteredCount:1,income:0,expense:18.75,
  projectedResult:-18.75,realizedResult:-18.75,
 };
 if(path==='/finance/summary')return {
  month:key,availableBalance:100,income:0,expense:18.75,projectedResult:-18.75,
  realizedIncome:0,realizedExpense:18.75,realizedResult:-18.75,
  eventCount:1,pendingCount:0,pendingAmount:0,topCategories:[],
 };
 if(path==='/finance/accounts')return [{id:'acc-'+u.id,name:'Conta '+u.name,
  type:'checking',openingBalance:'100',isActive:true}];
 if(path==='/finance/categories')return [{id:'cat-'+u.id,name:'Categoria '+u.name,
  type:'expense',group:'Consumo',isActive:true}];
 if(path==='/finance/payment-methods')return [{id:'pay-'+u.id,name:'PIX',type:'instant',isActive:true}];
 if(path==='/cards')return [];
 return undefined;
};
const browser=await chromium.launch({
 executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
 args:['--no-sandbox'],headless:true,
});
try{
 const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
 const session=u=>({
  user:{id:u.id,name:u.name,email:u.id+'@local.invalid',role:'ADMIN',status:'ACTIVE',isActive:true},
  accessToken:u.token,refreshToken:'only-synthetic',refreshExpiresAt:'2099-01-01T00:00:00Z',
 });
 const page=await context.newPage();
 const violations=[];
 const requests=[];
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.host!==new URL(base).host){violations.push('external '+url.host);await route.abort();return;}
  if(!/^\/(auth|finance|cards|payables)(\/|$)/.test(url.pathname)){await route.continue();return;}
  if(req.method()!=='GET'){violations.push('writer '+req.method());await route.fulfill({status:405,body:'{}'});return;}
  const token=(req.headers()['authorization']||'').replace(/^Bearer /,'');
  const user=users.find(u=>u.token===token);
  if(!user){violations.push('unknown token '+url.pathname);await route.fulfill({status:403,body:'{}'});return;}
  requests.push({user:user.id,path:url.pathname});
  const output=mock(user,url.pathname);
  if(output===undefined){violations.push('unexpected read '+url.pathname);await route.fulfill({status:404,body:'{}'});return;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(output),
   headers:{'Cache-Control':'no-store'}});
 });
 await page.goto(base+'/web-evolution.html?tela=lancamentos',{waitUntil:'domcontentloaded'});
 for(const [index,u] of users.entries()){
  await page.evaluate(s=>sessionStorage.setItem('meg.auth.session',JSON.stringify(s)),session(u));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:u.description}).first().waitFor({timeout:25000}).catch(async()=>{
   await page.locator('.meg-l09-open-row').filter({hasText:u.description}).first().waitFor({timeout:15000});
  });
  assert.ok(await page.getByText(u.description,{exact:true}).count()>0,'Authenticated event missing for '+u.id);
  const foreign=users[(index+1)%users.length];
  assert.equal(await page.getByText(foreign.description,{exact:true}).count(),0,'Cross-user event leaked');
  const selection=page.getByLabel('Abrangência do período');
  await selection.waitFor({state:'visible',timeout:20000});
  assert.equal(await selection.inputValue(),'month','Period preference leaked between users');
  await selection.selectOption('all');
  await page.getByText(u.description,{exact:true}).first().waitFor({state:'visible',timeout:20000});
  assert.equal(await page.getByText(foreign.description,{exact:true}).count(),0,'Cross-user history leaked');
  assert.ok(requests.some(r=>r.user===u.id&&r.path==='/finance/events/history-snapshot'),
   'Own user history snapshot not requested');
 }
 assert.deepEqual(violations,[],'Security contract failures');
 await context.close();
 console.log('MEG_STAGE10_SYNTHETIC_TENANT_ISOLATION_PASS');
}finally{await browser.close();}
