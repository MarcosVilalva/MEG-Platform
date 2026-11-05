import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const output=resolve('artifacts/meg-stage09-operational');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({
 headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
 args:['--no-sandbox']
});
const month=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'})
 .formatToParts(new Date());
const pick=(name)=>month.find(x=>x.type===name)?.value||'00';
const period=pick('year')+'-'+pick('month');
const user={id:'user-stage09-test',name:'Usuário de Teste',email:'tester@meg.invalid',role:'VIEWER',status:'ACTIVE',isActive:true};
const session={user,accessToken:'read-only-test-token',refreshToken:'read-only-test-refresh',refreshExpiresAt:'2099-12-31T23:59:59.000Z'};
const entries=Array.from({length:101},(_,i)=>({
 id:'t'+String(i+1).padStart(3,'0'),
 date:period+'-05T12:00:00.000Z',competence:period,
 description:'Teste Operacional '+String(i+1).padStart(3,'0'),
 type:'expense',status:'paid',
 amount:'12.34',signedAmount:'-12.34',notes:'Registro criado apenas no teste',
 accountId:'conta-1',categoryId:'cat-1',paymentMethodId:'forma-1',
 account:{id:'conta-1',name:'Conta Teste'},category:{id:'cat-1',name:'Categoria Teste'},
 paymentMethod:{id:'forma-1',name:'Pagamento Teste'},
 updatedAt:'2026-10-01T00:00:00.000Z'
}));
const tests=[];
for(const [width,height] of [[1366,768],[390,844]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 page.setDefaultTimeout(20000);
 const issues=[];
 let mutation=false,historyRequests=0,nonGetRequests=0;
 await page.addInitScript(value=>sessionStorage.setItem('meg.auth.session',JSON.stringify(value)),session);
 await page.route('**/auth/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user})}));
 await page.route('**/finance/**',async route=>{
  const req=route.request();
  if(req.method()!=='GET') nonGetRequests++;
  const url=new URL(req.url());
  const path=url.pathname;
  let body=null;
  if(path==='/finance/summary')body={month:url.searchParams.get('month'),income:400,expense:240,projectedResult:160,realizedResult:125,pendingCount:0,pendingAmount:0};
  else if(path==='/finance/cashflow')body={month:period,days:[]};
  else if(path==='/finance/benefit-summary')body={month:period,balance:0,credits:0,used:0};
  else if(path==='/finance/events/month')body={items:[]};
  else if(path==='/finance/accounts')body=[{id:'conta-1',name:'Conta Teste',type:'checking',isActive:true,openingBalance:'0.00'}];
  else if(path==='/finance/categories')body=[{id:'cat-1',name:'Categoria Teste',isActive:true}];
  else if(path==='/finance/payment-methods')body=[{id:'forma-1',name:'Pagamento Teste',isActive:true}];
  else if(path==='/finance/home-available')body=null;
  else body={items:[]};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.route('**/finance/events?*',async route=>{
  const req=route.request();
  if(req.method()!=='GET')nonGetRequests++;
  historyRequests++;
  const query=new URL(req.url()).searchParams;
  const index=Number(query.get('page')||1),size=Number(query.get('pageSize')||50);
  const items=entries.slice((index-1)*size,index*size).map((row,j)=>
   mutation && historyRequests>=3 && index===1 && j===0
    ? {...row,description:'Alterado entre leituras'}
    : row);
  // Latência determinística mantém o estado de loading observável e impede
  // que o teste aceite o grid antigo como resposta da nova consulta.
  await new Promise(resolve=>setTimeout(resolve,40));
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items,total:entries.length,page:index,pageSize:size})});
 });
 await page.route('**/cards?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.route('**/payables/open',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 try{
  await page.goto('http://127.0.0.1:4174/web-evolution.html',{waitUntil:'domcontentloaded'});
  await page.locator('.meg-sidebar .meg-nav-item[aria-label="Lançamentos"]').waitFor();
  if(!/Usuário de Teste/.test(await page.locator('.meg-profile-name').textContent()||''))issues.push('Perfil exibiu identidade fixa de demonstracao');
  if(width<640)await page.getByRole('button',{name:'Abrir menu'}).click();
  await page.locator('.meg-sidebar .meg-nav-item[aria-label="Lançamentos"]').click();
  const sum=page.locator('.meg-l09-grid-summary');
  await sum.filter({hasText:'101 de 101 registros do histórico autorizado'}).waitFor({timeout:40000});
  if(historyRequests!==4)issues.push('Histórico não lido duas vezes em duas páginas: '+historyRequests);
  if(!(await page.locator('.meg-l09[data-icon-pack="phosphor"] .meg-l09-stat.is-income [data-launch-pack="phosphor"]').count()))issues.push('Phosphor nao foi adotado como padrao autenticado');
  if(!(await page.locator('.meg-l09-stat.is-income [data-launch-icon="trendUp"]').count()))issues.push('Entrada sem ícone de alta');
  if(!(await page.locator('.meg-l09-stat.is-expense [data-launch-icon="trendDown"]').count()))issues.push('Saída sem ícone de baixa');
  if(!(await page.locator('.meg-l09-grid-panel .meg-l09-chip [data-launch-icon="generic"]').count()))issues.push('Categoria desconhecida sem ícone neutro');
  if(!(await page.getByRole('button',{name:'Expandir gráfico de distribuição'}).isVisible()))issues.push('Gráfico não iniciou recolhido');
  if(!(await page.getByRole('button',{name:'Expandir detalhes do lançamento'}).isVisible()))issues.push('Detalhes não iniciaram recolhidos');
  if(!(await page.locator('.meg-l09-add').isDisabled()))issues.push('Criação foi liberada sem writer autorizado');
  if(!/R\$/.test(await page.locator('.meg-l09-stats').innerText()))issues.push('Indicadores financeiros não exibidos');
  const dims=await page.evaluate(()=>({docWidth:document.documentElement.scrollWidth,mainWidth:document.querySelector('.meg-main')?.clientWidth,mainScroll:document.querySelector('.meg-main')?.scrollWidth}));
  if(dims.docWidth>width+2||dims.mainScroll>dims.mainWidth+2)issues.push('Rolagem horizontal fora do DataGrid');
  await page.screenshot({path:resolve(output,'operacional-'+width+'x'+height+'.png'),fullPage:true});
  const query=page.getByPlaceholder('Buscar lançamentos...');
  await query.fill('Teste Operacional 101');
  await sum.filter({hasText:'1 de 101 registros do histórico autorizado'}).waitFor();
  await page.getByRole('button',{name:'Atualizar consulta'}).click();
  await page.getByRole('status').filter({hasText:'Consultando histórico autorizado'}).waitFor({timeout:12000});
  await sum.filter({hasText:'1 de 101 registros do histórico autorizado'}).waitFor({timeout:40000});
  if(await query.inputValue()!=='Teste Operacional 101')issues.push('Filtro principal não foi preservado na atualização');
  await query.fill('');
  historyRequests=0;mutation=true;
  await page.getByRole('button',{name:'Atualizar consulta'}).click();
  await page.getByRole('status').filter({hasText:'Consultando histórico autorizado'}).waitFor({timeout:12000});
  await page.getByRole('alert').filter({hasText:'O histórico mudou durante a verificação'}).waitFor({timeout:40000});
  if(await page.locator('.meg-l09-grid-panel').count())issues.push('Histórico parcial foi publicado após a alteração concorrente');
  if(nonGetRequests)issues.push('Operação de escrita inesperada: '+nonGetRequests);
  await page.screenshot({path:resolve(output,'consistencia-'+width+'x'+height+'.png'),fullPage:true});
 }catch(error){
  issues.push(String(error));
  issues.push('Diagnóstico: '+JSON.stringify({url:page.url(),historyRequests,mutation}));
  try{await page.screenshot({path:resolve(output,'falha-'+width+'x'+height+'.png'),fullPage:true})}catch{}
 }
 tests.push({width,height,historyRequests,nonGetRequests,issues});
 await page.close();
}
await browser.close();
writeFileSync(resolve(output,'resultados.json'),JSON.stringify(tests,null,2));
for(const test of tests)console.log(test.width+'x'+test.height+': '+(test.issues.length?test.issues.join(' | '):'OK'));
if(tests.some(test=>test.issues.length))process.exit(1);
