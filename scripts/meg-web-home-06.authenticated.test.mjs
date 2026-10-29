import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Exercita a entrada REAL da nova Web e a fronteira HTTP autenticada.
// As respostas são inteiramente simuladas: este teste não acessa banco/produção.
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
const origin='http://127.0.0.1:4173';
const context=await browser.newContext({viewport:{width:1366,height:768}});
const apiCalls=[];
const now='2026-10-29';
const user={id:'browser-test',name:'Usuário de Teste',email:'teste@example.invalid',role:'ADMIN',status:'ACTIVE',isActive:true};
const session={user,accessToken:'session-test',refreshToken:'refresh-test',refreshExpiresAt:'2030-01-01T00:00:00Z'};
const reply=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
const selectedMonth=url=>url.searchParams.get('month')||'2026-10';
const fixture={
  accounts:[{id:'conta-teste',name:'Conta teste',type:'checking'}],
  categories:[{id:'alimentacao',name:'Alimentação'},{id:'utilidade',name:'Utilidades'}],
  events:[
    {id:'ev-1',description:'Supermercado teste',type:'expense',date:'2026-10-26',status:'paid',signedAmount:-45.10,amount:45.10,categoryId:'alimentacao',accountId:'conta-teste'},
    {id:'ev-2',description:'Internet teste',type:'expense',date:'2026-10-23',status:'paid',signedAmount:-59.90,amount:59.90,categoryId:'utilidade',accountId:'conta-teste'},
  ],
  payables:[
    {id:'p-1',description:'Internet próxima',dueDate:'2026-11-05',status:'open',openAmount:59.90,totalAmount:59.90,categoryId:'utilidade'},
    {id:'p-2',description:'Mercado futuro',dueDate:'2026-11-10',status:'open',openAmount:120.00,totalAmount:120.00,categoryId:'alimentacao'},
  ],
};
await context.addInitScript(value=>sessionStorage.setItem('meg.auth.session',JSON.stringify(value)),session);
await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin&&url.origin!=='http://localhost:3333')return route.continue();
  const p=url.pathname,month=selectedMonth(url);
  if(!p.startsWith('/auth/')&&!p.startsWith('/finance/')&&!p.startsWith('/payables')&&!p.startsWith('/cards'))return route.continue();
  apiCalls.push(p+url.search);
  if(p==='/auth/me')return reply(route,{user});
  if(p==='/auth/logout')return reply(route,{});
  if(p==='/finance/summary')return reply(route,{month,availableBalance:0,income:month==='2026-09'?1700:2000,expense:550,projectedResult:month==='2026-09'?1150:1450,realizedIncome:2000,realizedExpense:550,realizedResult:1450,pendingCount:2,pendingAmount:179.90,eventCount:2});
  if(p==='/finance/cashflow')return reply(route,{month,openingBalance:0,realizedClosing:999.99,totalIncome:2000,totalExpense:550,days:[{date:month+'-01',income:2000,expense:550,net:1450,realizedBalance:999.99}]});
  if(p==='/finance/analytics')return reply(route,{month,previous:{income:0,expense:0,result:0}});
  if(p==='/finance/benefit-summary')return reply(route,{month,balance:123.45,credits:200,used:76.55});
  if(p==='/finance/home-overview')return reply(route,{month,effectiveAt:now,available:999.99,payables:{openAmount:179.90,count:2},cards:{openAmount:0,count:0},paid:{count:1}});
  if(p==='/finance/events/month')return reply(route,fixture.events);
  if(p==='/payables/open')return reply(route,fixture.payables);
  if(p==='/cards')return reply(route,[]);
  if(p==='/finance/categories')return reply(route,fixture.categories);
  if(p==='/finance/accounts')return reply(route,fixture.accounts);
  return reply(route,{error:'UNMOCKED_ENDPOINT',path:p},404);
});
const errors=[];
try{
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  const response=await page.goto(origin+'/web-evolution.html',{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response?.status(),200);
  await page.locator('.meg-home-hero-balance').waitFor({state:'visible',timeout:30000});
  assert.match(await page.locator('.meg-home-hero-balance').innerText(),/999,99/,'saldo monetário da API');
  assert.match(await page.locator('.meg-home-benefit-balance').innerText(),/123,45/,'benefício separado da API');
  assert.equal(await page.locator('.meg-profile-name').innerText(),user.name,'perfil real da sessão');
  assert.ok(apiCalls.some(x=>x.startsWith('/finance/home-overview?')),'overview canônico');
  assert.equal(await page.locator('.meg-home-preview-warning').count(),0,'Home autenticada sem rótulo de preview');
  await page.getByRole('button',{name:'Selecionar período financeiro'}).click();
  await page.locator('#meg-period-input').fill('2026-09');
  await page.locator('.meg-home-flow-caption').getByText(/Setembro de 2026/i).waitFor({timeout:20000});
  assert.ok(apiCalls.some(x=>x.includes('/finance/summary?month=2026-09')),'troca de mês consultou API');
  await page.getByRole('textbox',{name:'Buscar movimentações e vencimentos da Home'}).fill('Internet');
  assert.ok(await page.locator('.meg-home .recent').getByText('Internet teste').count()>0,'busca de movimentação');
  assert.equal(await page.locator('.meg-home .recent').getByText('Supermercado teste').count(),0,'filtro remove itens sem correspondência');
  assert.ok(await page.locator('.meg-home .upcoming').getByText('Internet próxima').count()>0,'busca de vencimento');
  await page.getByRole('button',{name:'Ocultar saldos'}).click();
  assert.equal(await page.locator('.meg-home-hero-balance').innerText(),'R$ •••••');
  assert.equal(await page.locator('.meg-home-benefit-balance').innerText(),'R$ •••••');
  await page.getByRole('button',{name:'Mostrar saldos'}).click();
  await page.getByRole('button',{name:'Novo lançamento'}).first().click();
  assert.match(await page.getByRole('status').last().innerText(),/ainda não foi implementada/i,'rota futura não executa mutação');
  page.on('dialog',dialog=>void dialog.accept());
  await page.getByRole('button',{name:'Sair'}).click();
  await page.getByRole('button',{name:/Entrar|Acessar/i}).first().waitFor({timeout:20000});
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('meg.auth.session')),null,'logout apaga sessão');
  assert.equal(errors.length,0,'erros de JavaScript '+errors.join('|'));
  console.log('PASS Home autenticada: APIs canônicas, período, busca, privacidade, aviso de rota e logout');
}finally{
  await context.close();
  await browser.close();
}
