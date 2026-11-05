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
 accountId:'conta-1',categoryId:i===0?null:'cat-1',paymentMethodId:i===0?null:'forma-1',
 account:{id:'conta-1',name:'Conta Teste'},category:i===0?null:{id:'cat-1',name:'Categoria Teste'},
 paymentMethod:i===0?null:{id:'forma-1',name:'Pagamento Teste'},
 sourcePayload:i===0?{
  category:'Categoria Original',paymentMethod:'Forma Original',
  'Tp Lançamento':'DESPESA', 'Classificação da Despesa':'FIXO',
  Grupo:'CASA',Situação:'REALIZADO',Modalidade:'À VISTA',
  'Dia Semana':'QUINTA',Observações:'OBSERVAÇÃO ORIGINAL',
 }:null,
 updatedAt:'2026-10-01T00:00:00.000Z'
}));
const tests=[];
for(const [width,height] of [[1366,768],[960,900],[390,844]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 page.setDefaultTimeout(20000);
 const issues=[];
 // Reprodução sintética do volume observado na conta real, sem dados privados.
 const records=width===960?[...entries,...Array.from({length:3630},(_,index)=>({
  ...entries[(index%100)+1],id:'volume-'+String(index),description:'Registro sintético de volume '+String(index+1)
 }))]:entries;
 const totalText=records.length.toLocaleString('pt-BR');
 let mutation=false,historyRequests=0,nonGetRequests=0;
 await page.addInitScript(value=>sessionStorage.setItem('meg.auth.session',JSON.stringify(value)),session);
 await page.route('**/auth/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user})}));
 await page.route('**/finance/**',async route=>{
  const req=route.request();
  if(req.method()!=='GET') nonGetRequests++;
  const url=new URL(req.url());
  const path=url.pathname.replace(/^\/functions\/v1\/meg-stage09-readonly-preview(?=\/)/,'');
  let body=null;
  if(path==='/finance/sync-status')body={token:'simulated-immutable-revision',changedAt:null,mutationType:null};
  else if(path==='/finance/summary')body={month:url.searchParams.get('month'),income:400,expense:240,projectedResult:160,realizedResult:125,pendingCount:0,pendingAmount:0};
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
  const items=records.slice((index-1)*size,index*size).map((row,j)=>
   mutation && historyRequests>=3 && index===1 && j===0
    ? {...row,description:'Alterado entre leituras'}
    : row);
  // Latência determinística mantém o estado de loading observável e impede
  // que o teste aceite o grid antigo como resposta da nova consulta.
  await new Promise(resolve=>setTimeout(resolve,40));
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items,total:records.length,page:index,pageSize:size})});
 });
 await page.route('**/cards?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.route('**/payables/open',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 try{
  await page.goto('http://127.0.0.1:4174/web-evolution.html',{waitUntil:'domcontentloaded'});
  await page.locator('.meg-sidebar .meg-nav-item[aria-label="Lançamentos"]').waitFor();
  if(!/Usuário de Teste/.test(await page.locator('.meg-profile-name').textContent()||''))issues.push('Perfil exibiu identidade fixa de demonstracao');
  if(width<640)await page.getByRole('button',{name:'Abrir menu'}).click();
  await page.locator('.meg-sidebar .meg-nav-item[aria-label="Lançamentos"]').click();
  const loading=page.locator('.meg-l09-loading-panel');
  await loading.waitFor({timeout:12000});
  if(!(await page.getByRole('progressbar',{name:'Conferência do histórico'}).count()))issues.push('Leitura integral sem barra de progresso');
  if(!(await page.locator('.meg-l09-loading-placeholders').count()))issues.push('Leitura integral sem estrutura visual provisória');
  if(await page.locator('.meg-l09-grid-panel').count())issues.push('Grade exibiu registros antes da segunda leitura');
  if(width===960){
   const spacing=await page.locator('.meg-sidebar .meg-nav').evaluate(nav=>{
    const links=[...nav.querySelectorAll('.meg-nav-item')];
    const ys=links.map(link=>{const r=link.getBoundingClientRect();return r.top+r.height/2});
    const steps=ys.slice(1).map((y,index)=>y-ys[index]);
    return {spread:Math.max(...steps)-Math.min(...steps),coverage:(ys[ys.length-1]-ys[0])/nav.getBoundingClientRect().height};
   });
   if(spacing.spread>12||spacing.coverage<.55)issues.push('Ícones da sidebar compacta não distribuídos uniformemente: '+JSON.stringify(spacing));
  }
  await page.screenshot({path:resolve(output,'carregando-'+width+'x'+height+'.png'),fullPage:true});
  const sum=page.locator('.meg-l09-grid-summary');
  await sum.filter({hasText:`${totalText} de ${totalText} registros do histórico autorizado`}).waitFor({timeout:40000});
  if(historyRequests!==Math.ceil(records.length/100)*2)issues.push('Histórico não completou as duas leituras: '+historyRequests);
  const expectedColumns=['Ações','Data','Descrição','Categoria','Conta / Cartão','Forma de pagamento','Valor','Tipo','Status','Competência'];
  const headings=await page.locator('.meg-l09-grid-panel .meg-datagrid-table thead').textContent()||'';
  for(const label of expectedColumns)if(!headings.includes(label))issues.push('Coluna obrigatória ausente: '+label);
  if(!(await page.locator('.meg-l09-grid-panel [aria-label="Seletor de colunas"]').count()))issues.push('Menu de visibilidade de colunas não disponível');
  for(const duplicate of ['Tipo original','Classificação original','Situação original','Observações originais']){
   const headers=await page.locator('.meg-l09-grid-panel .meg-datagrid-table thead').innerText();
   if(headers.includes(duplicate))issues.push('Campo de origem duplicado na grade: '+duplicate);
  }
  const viewButton=page.getByRole('button',{name:'Ver detalhes de Teste Operacional 001'});
  await viewButton.click();
  const dialog=page.getByRole('dialog',{name:'Teste Operacional 001'});
  await dialog.waitFor();
  if(await dialog.getAttribute('aria-modal')!=='true')issues.push('Modal sem aria-modal');
  if(!(await dialog.getByText('Categoria Original',{exact:true}).count()))issues.push('Categoria legada ausente na ficha');
  await dialog.getByText('Dados originais do histórico').click();
  const originalText=await dialog.innerText();
  for(const label of ['FIXO','CASA','REALIZADO','QUINTA','OBSERVAÇÃO ORIGINAL'])if(!originalText.includes(label))issues.push('Campo original não recuperado no modal: '+label);
  if(!originalText.includes('Edição, exclusão e baixa permanecem indisponíveis'))issues.push('Modal de leitura não informa o bloqueio de writers');
  await page.screenshot({path:resolve(output,'modal-'+width+'x'+height+'.png'),fullPage:true});
  await page.keyboard.press('Escape');
  if(await page.getByRole('dialog').count())issues.push('Modal não fecha com Escape');
  if(!(await viewButton.evaluate(el=>document.activeElement===el)))issues.push('Foco não retornou ao botão Ver');
  if(await page.getByRole('button',{name:'Expandir detalhes do lançamento'}).count())issues.push('Painel de detalhes permaneceu na rota autenticada');
  if(width>=1024){
   const view=page.locator('.meg-l09-grid-panel .meg-datagrid__viewport');
   const scroller=await view.evaluate(el=>({scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
   if(scroller.scrollWidth<=scroller.clientWidth+50)issues.push('Colunas adicionais sem rolagem horizontal interna');
   await view.evaluate(el=>el.scrollLeft=el.scrollWidth-el.clientWidth);
   const afterScroll=await view.evaluate(el=>el.scrollLeft);
   if(afterScroll<100)issues.push('Rolagem horizontal interna não alcançou as colunas adicionais');
  }
  if(!(await page.getByText('Categoria Original',{exact:true}).count()))issues.push('Categoria original não exibida');
  if(!(await page.getByText('Forma Original',{exact:true}).count()))issues.push('Forma original de pagamento não exibida');
  const categoryFilter=page.locator('.meg-l09-filters select').nth(1);
  await categoryFilter.selectOption('legacy:Categoria Original');
  await sum.filter({hasText:`1 de ${totalText} registros do histórico autorizado`}).waitFor();
  await categoryFilter.selectOption('all');
  await sum.filter({hasText:`${totalText} de ${totalText} registros do histórico autorizado`}).waitFor();
  if(!(await page.locator('.meg-l09[data-icon-pack="phosphor"] .meg-l09-stat.is-income [data-launch-pack="phosphor"]').count()))issues.push('Phosphor nao foi adotado como padrao autenticado');
  if(!(await page.locator('.meg-l09-stat.is-income [data-launch-icon="trendUp"]').count()))issues.push('Entrada sem ícone de alta');
  if(!(await page.locator('.meg-l09-stat.is-expense [data-launch-icon="trendDown"]').count()))issues.push('Saída sem ícone de baixa');
  if(!(await page.locator('.meg-l09-grid-panel .meg-l09-chip [data-launch-icon="generic"]').count()))issues.push('Categoria desconhecida sem ícone neutro');
  if(!(await page.getByRole('button',{name:'Expandir gráfico de distribuição'}).isVisible()))issues.push('Gráfico não iniciou recolhido');
  if(await page.getByRole('button',{name:'Expandir detalhes do lançamento'}).count())issues.push('Detalhes ainda ocupam painel lateral na leitura real');
  if(!(await page.locator('.meg-l09-add').isDisabled()))issues.push('Criação foi liberada sem writer autorizado');
  if(!/R\$/.test(await page.locator('.meg-l09-stats').innerText()))issues.push('Indicadores financeiros não exibidos');
  const dims=await page.evaluate(()=>({docWidth:document.documentElement.scrollWidth,mainWidth:document.querySelector('.meg-main')?.clientWidth,mainScroll:document.querySelector('.meg-main')?.scrollWidth}));
  if(dims.docWidth>width+2||dims.mainScroll>dims.mainWidth+2)issues.push('Rolagem horizontal fora do DataGrid');
  await page.screenshot({path:resolve(output,'operacional-'+width+'x'+height+'.png'),fullPage:true});
  const query=page.getByPlaceholder('Buscar lançamentos...');
  await query.fill('Teste Operacional 101');
  await sum.filter({hasText:`1 de ${totalText} registros do histórico autorizado`}).waitFor();
  await page.getByRole('button',{name:'Atualizar consulta'}).click();
  await page.getByRole('status').filter({hasText:'Lendo os registros da primeira leitura'}).waitFor({timeout:12000});
  await sum.filter({hasText:`1 de ${totalText} registros do histórico autorizado`}).waitFor({timeout:40000});
  if(await query.inputValue()!=='Teste Operacional 101')issues.push('Filtro principal não foi preservado na atualização');
  await query.fill('');
  historyRequests=0;mutation=true;
  await page.getByRole('button',{name:'Atualizar consulta'}).click();
  await page.getByRole('status').filter({hasText:'Lendo os registros da primeira leitura'}).waitFor({timeout:12000});
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
