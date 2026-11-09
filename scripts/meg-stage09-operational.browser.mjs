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
 account:{id:'conta-1',name:'Conta Teste'},category:i===0?null:{id:'cat-1',name:'Saúde'},
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
 let mutation=false,historyRequests=0,snapshotRequests=0,syncChecks=0,nonGetRequests=0,logoutCalls=0;
 await page.addInitScript(value=>sessionStorage.setItem('meg.auth.session',JSON.stringify(value)),session);
 await page.route('**/auth/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user})}));
 await page.route('**/auth/logout',async route=>{
  logoutCalls++;
  const body=route.request().postDataJSON();
  if(body?.refreshToken!==session.refreshToken)issues.push('Logout sem token de revogação correto');
  return route.fulfill({status:width===960?503:204,contentType:'application/json',body:width===960?'{"error":"SERVICE_UNAVAILABLE"}':''});
 });
 await page.route('**/finance/**',async route=>{
  const req=route.request();
  if(req.method()!=='GET') nonGetRequests++;
  const url=new URL(req.url());
  const path=url.pathname.replace(/^\/functions\/v1\/meg-stage09-readonly-preview(?=\/)/,'');
  let body=null;
  if(path==='/finance/sync-status'){
   syncChecks++;
   body={token:mutation&&width===1366&&syncChecks%2===0?'simulated-updated-revision':'simulated-immutable-revision',
     changedAt:null,mutationType:null,
     ...(width!==960?{capabilities:{historySnapshotV1:true}}:{})};
  }
  else if(path==='/finance/summary')body={month:url.searchParams.get('month'),income:400,expense:240,projectedResult:160,realizedResult:125,pendingCount:0,pendingAmount:0};
  else if(path==='/finance/cashflow')body={month:period,days:[]};
  else if(path==='/finance/benefit-summary')body={month:period,balance:0,credits:0,used:0};
  else if(path==='/finance/events/month')body={items:[]};
  else if(path==='/finance/accounts')body=[{id:'conta-1',name:'Conta Teste',type:'checking',isActive:true,openingBalance:'0.00'}];
  else if(path==='/finance/categories')body=[{id:'cat-1',name:'Saúde',isActive:true}];
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
 // 960px: API publicada ainda sem capacidade nova. 390px: endpoint anunciado mas falha de transporte.
 await page.route('**/finance/events/history-snapshot',async route=>{
  if(route.request().method()!=='GET')nonGetRequests++;
  snapshotRequests++;
  await new Promise(resolve=>setTimeout(resolve,65));
  if(width===960)return route.fulfill({status:404,contentType:'application/json',body:'{"error":"NOT_FOUND"}'});
  if(width===390)return route.abort('failed');
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   kind:'complete',protocol:'financial-history-v1',consistency:'repeatable-read',total:records.length,items:records
  })});
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
    const footer=document.querySelector('.meg-sidebar-footer')?.getBoundingClientRect();
    const art=document.querySelector('.meg-sidebar .sidebar__art');
    return {spread:Math.max(...steps)-Math.min(...steps),
     coverage:(ys[ys.length-1]-ys[0])/nav.getBoundingClientRect().height,
     footerGap:footer?footer.top-ys[ys.length-1]:null,
     artHidden:art?getComputedStyle(art).display==='none':false};
   });
   if(spacing.spread>12||spacing.coverage<.75||spacing.artHidden!==true||
      spacing.footerGap===null||spacing.footerGap>165)
    issues.push('Ícones compactos não usam toda a altura útil: '+JSON.stringify(spacing));
  }
  await page.screenshot({path:resolve(output,'carregando-'+width+'x'+height+'.png'),fullPage:true});
  const sum=page.locator('.meg-l09-grid-summary');
  await sum.filter({hasText:`${totalText} de ${totalText} registros do histórico autorizado`}).waitFor({timeout:40000});
  if(snapshotRequests!==(width===960?0:1))
    issues.push('Snapshot consultado sem capacidade anunciada: '+snapshotRequests);
  const expectedPages=width===960||width===390?Math.ceil(records.length/100)*2:0;
  if(historyRequests!==expectedPages)issues.push('Caminho de leitura incorreto: páginas '+historyRequests+', esperado '+expectedPages);
  // Os quatro valores vêm exclusivamente do /finance/summary simulado:
  // jamais reconstruir totais a partir de eventos ou dos filtros.
  const banner=await page.evaluate(()=>{
   const root=document.querySelector('.meg-l09'),hero=root?.querySelector('.meg-l09-hero'),
    stats=root?.querySelector('.meg-l09-stats'),main=document.querySelector('.meg-main');
   if(!root||!hero||!stats||!main)return null;
   const bounds=hero.getBoundingClientRect(),metric=stats.getBoundingClientRect();
   return {
    inside:hero.contains(stats),count:stats.querySelectorAll('.meg-l09-stat').length,
    countInPage:root.querySelectorAll('.meg-l09-stats').length,
    values:[...stats.querySelectorAll('.meg-l09-stat strong')].map(el=>(el.textContent||'').replace(/\s/g,' ').trim()),
    height:bounds.height,metricsWithin:metric.top>=bounds.top&&metric.bottom<=bounds.bottom+1,
    documentWidth:document.documentElement.scrollWidth,
    mainScrollWidth:main.scrollWidth,mainClientWidth:main.clientWidth,
    ctaVisible:(()=>{const el=hero.querySelector('.meg-l09-add');return !!el&&el.getBoundingClientRect().width>50})(),
   };
  });
  if(!banner||!banner.inside||banner.count!==4||banner.countInPage!==1||
   !banner.metricsWithin||!banner.ctaVisible||banner.documentWidth>width+2||
   banner.mainScrollWidth>banner.mainClientWidth+2)
   issues.push('KPI duplicado/fora do banner ou layout com overflow: '+JSON.stringify(banner));
  const expectedMetrics=['R$ 160,00','R$ 400,00','R$ 240,00','R$ 125,00'];
  if(!banner||JSON.stringify(banner.values)!==JSON.stringify(expectedMetrics))
   issues.push('Indicadores não reproduzem os quatro valores canônicos da API: '+JSON.stringify(banner?.values));
  await page.screenshot({path:resolve(output,'banner-kpis-'+width+'x'+height+'.png'),fullPage:true});
  const verification=page.locator('.meg-l09-verification-details');
  if(!(await verification.count())||await verification.getAttribute('open')!==null)
   issues.push('Resumo financeiro precisa iniciar compacto');
  if(!(await page.getByRole('button',{name:'Atualizar consulta'}).isVisible()))
   issues.push('Atualizar consulta não está acessível no aviso compacto');
  await verification.locator('summary').click();
  if(!(await verification.getByText(/indicadores vêm da API/i).count()))
   issues.push('Detalhes omitiram a origem da autoridade financeira');
  await verification.locator('summary').click();
  if(!(await page.locator('.meg-l09-right.is-operational[hidden]').count()))
   issues.push('Gráfico complementar iniciou ocupando espaço da tabela');
  const distributionToggle=page.getByRole('button',{name:'Distribuição',exact:true});
  await distributionToggle.click();
  if(!(await page.locator('.meg-l09-right.is-operational').isVisible()))
   issues.push('Distribuição não abriu pelo controle da grade');
  await distributionToggle.click();
  if(await page.locator('.meg-l09-right.is-operational').isVisible())
   issues.push('Distribuição não devolveu espaço à grade');
  // Sticky local ao scroll de .meg-main, com máscara sólida e sem sombra do sistema.
  const sticky=await page.evaluate(()=>{
   const main=document.querySelector('.meg-main'),frame=document.querySelector('.meg-l09-hero-frame');
   if(!main||!frame)return null;
   main.scrollTop=240;
   const top=main.getBoundingClientRect().top;
   const frameRect=frame.getBoundingClientRect();
   const style=getComputedStyle(frame);
   return {top,frameTop:frameRect.top,scrolled:main.scrollTop,position:style.position,color:style.backgroundColor,
    element:document.elementFromPoint(frameRect.left+frameRect.width/2,frameRect.top+5)?.closest('.meg-l09-hero-frame')===frame};
  });
  if(!sticky||sticky.position!=='sticky'||sticky.color!=='rgb(2, 25, 30)'||
     (sticky.scrolled>15&&(Math.abs(sticky.frameTop-sticky.top)>3||!sticky.element)))
   issues.push('Cabeçalho sticky sem máscara opaca ou preso no topo incorreto: '+JSON.stringify(sticky));
  await page.locator('.meg-l09.is-header-compact').waitFor({timeout:10000});
  const compact=await page.evaluate(()=>{
   const root=document.querySelector('.meg-l09'),hero=root?.querySelector('.meg-l09-hero'),
    main=document.querySelector('.meg-main');
   if(!root||!hero||!main)return null;
   return {height:hero.getBoundingClientRect().height,scrollWidth:main.scrollWidth,
    width:main.clientWidth,subtitleVisible:getComputedStyle(hero.querySelector('.meg-l09-hero-intro p')).display!=='none',
    kpiCount:hero.querySelectorAll('.meg-l09-stat').length,
    values:[...hero.querySelectorAll('.meg-l09-stat strong')].map(e=>(e.textContent||'').replace(/\s/g,' ').trim()),
    ctaWidth:hero.querySelector('.meg-l09-add').getBoundingClientRect().width};
  });
  if(!compact||compact.height>=banner.height-12||compact.subtitleVisible||
    compact.kpiCount!==4||compact.scrollWidth>compact.width+2||compact.ctaWidth<65)
   issues.push('Banner compacto perdeu KPIs/CTA ou criou overflow: '+JSON.stringify(compact));
  await page.screenshot({path:resolve(output,'cabecalho-compacto-'+width+'x'+height+'.png'),fullPage:true});
  await page.locator('.meg-main').evaluate(main=>main.scrollTop=0);
  await page.locator('.meg-l09:not(.is-header-compact)').waitFor({timeout:10000});
  // Filtros superiores recolhidos por padrão; a grade mantém os controles.
  if(await page.locator('.meg-l09-filters').isVisible())
   issues.push('Filtros redundantes não iniciaram recolhidos');
  const toggleFilters=page.getByRole('button',{name:'Filtros gerais'});
  if(!(await toggleFilters.isVisible()))issues.push('Botão para revelar filtros superiores ausente');
  if(!(await page.getByRole('button',{name:/Filtros da grade \(0\)/}).isVisible()))
   issues.push('Filtros da grade indistintos dos filtros gerais');
  if(!(await page.getByRole('combobox',{name:'Selecionar filtro favorito'}).isVisible()))
   issues.push('Filtro favorito não está acessível dentro da grade');
  if(!(await page.locator('.meg-l09-grid-focus-toolbar').getByRole('button',{name:'Salvar filtros'}).isVisible()))
   issues.push('Salvar filtros não foi incorporado ao cabeçalho da grade');
  // Modo foco mantém navegação da shell e usa só a área interna da grade.
  const focusButton=page.getByRole('button',{name:'Maximizar tabela na área útil do sistema'});
  await focusButton.click();
  await page.locator('.meg-l09.is-grid-focus').waitFor();
  const focusMetrics=await page.evaluate(()=>{
   const main=document.querySelector('.meg-main'),grid=document.querySelector('.meg-l09-grid-panel'),
    topbar=document.querySelector('.meg-topbar'),stat=document.querySelector('.meg-l09-stats'),
    viewport=document.querySelector('.meg-l09-grid-panel .meg-datagrid__viewport');
   if(!main||!grid||!topbar||!viewport||!stat)return null;
   const area=main.getBoundingClientRect(),table=grid.getBoundingClientRect(),head=topbar.getBoundingClientRect();
   return {areaTop:area.top,areaBottom:area.bottom,tableTop:table.top,tableBottom:table.bottom,
    tableHeight:table.height,topbarBottom:head.bottom,mainOverflow:getComputedStyle(main).overflowY,
    summaryHidden:getComputedStyle(stat).display==='none',
    mainHeight:main.clientHeight,mainScrollHeight:main.scrollHeight,
    viewportHeight:viewport.clientHeight,viewportScrollHeight:viewport.scrollHeight,
    topbarHeight:head.height,
    gridScroll:getComputedStyle(viewport).overflowY};
  });
  if(!focusMetrics||focusMetrics.mainOverflow!=='hidden'||!focusMetrics.summaryHidden||
   focusMetrics.tableHeight<130||focusMetrics.tableBottom>focusMetrics.areaBottom+3||
   focusMetrics.tableTop<focusMetrics.areaTop-3||focusMetrics.topbarBottom>focusMetrics.areaTop+3||
   focusMetrics.mainScrollHeight>focusMetrics.mainHeight+3||
   focusMetrics.viewportScrollHeight<=focusMetrics.viewportHeight+5)
    issues.push('Modo foco não respeitou a área útil do MEG: '+JSON.stringify(focusMetrics));
  if(await page.locator('.meg-l09-filters').isVisible())issues.push('Modo foco deixou os filtros externos visíveis');
  const focusScroll=await page.locator('.meg-l09-grid-panel .meg-datagrid__viewport').evaluate(viewport=>{
   viewport.scrollTop=Math.min(160,viewport.scrollHeight-viewport.clientHeight);
   const main=document.querySelector('.meg-main');
   return {gridTop:viewport.scrollTop,mainTop:main?.scrollTop,mainOverflow:main?getComputedStyle(main).overflowY:''};
  });
  if(focusScroll.gridTop<=0||focusScroll.mainTop!==0||focusScroll.mainOverflow!=='hidden')
   issues.push('Modo foco permitiu rolagem externa ou bloqueou grade: '+JSON.stringify(focusScroll));
  if(!(await page.locator('.meg-l09-grid-panel [aria-label="Seletor de colunas"]').isVisible()))issues.push('Modo foco ocultou ações da grade');
  if(!(await page.getByRole('button',{name:'Restaurar tamanho da tabela'}).isVisible()))issues.push('Modo foco sem retorno visível');
  await page.screenshot({path:resolve(output,'tabela-maximizada-'+width+'x'+height+'.png'),fullPage:true});
  await page.keyboard.press('Escape');
  if(await page.locator('.meg-l09.is-grid-focus').count())issues.push('Modo foco não fechou por Escape');
  if(!(await page.locator('.meg-l09-stats').isVisible()))issues.push('Modo foco não restaurou os KPIs');
  await toggleFilters.click();
  if(!(await page.locator('.meg-l09-filters').isVisible()))issues.push('Filtro superior não abriu pelo botão');
  if(!(await page.getByRole('button',{name:'Ocultar filtros gerais'}).isVisible()))issues.push('Alternância de filtros falhou');

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
  // Favoritos: somente filtros, sem mudar dados financeiros nem executar writers.
  if(width===1366){
   const method=page.getByRole('combobox',{name:'Forma de pagamento'});
   await categoryFilter.selectOption('cat-1');
   await method.selectOption('Pagamento Teste');
   await sum.filter({hasText:`100 de ${totalText} registros do histórico autorizado`}).waitFor();
   await page.getByRole('button',{name:'Salvar filtros',exact:true}).click();
   await page.getByRole('textbox',{name:'Nome do filtro'}).fill('Cartão e categoria');
   await page.getByRole('button',{name:'Salvar favorito'}).click();
   await page.getByRole('status').filter({hasText:'Filtro favorito salvo'}).waitFor();
   const persisted=await page.evaluate(uid=>localStorage.getItem('meg-web-evolution:stage09:saved-filters:v1:'+uid),user.id);
   if(!persisted||!persisted.includes('Cartão e categoria')||!persisted.includes('Pagamento Teste'))
    issues.push('Filtro favorito não foi persistido para o usuário autenticado');
   await categoryFilter.selectOption('all');
   await method.selectOption('all');
   await sum.filter({hasText:`${totalText} de ${totalText} registros do histórico autorizado`}).waitFor();
   await page.getByRole('combobox',{name:'Selecionar filtro favorito'}).selectOption({label:'Cartão e categoria'});
   await sum.filter({hasText:`100 de ${totalText} registros do histórico autorizado`}).waitFor();
   if(await categoryFilter.inputValue()!=='cat-1'||await method.inputValue()!=='Pagamento Teste')
    issues.push('Favorito não restaurou categoria e forma de pagamento');
   await page.screenshot({path:resolve(output,'filtros-favoritos-1366x768.png'),fullPage:true});
   // O botão Limpar filtros zera TODOS os critérios e a seleção do favorito,
   // sem apagar o preset salvo. Isso evita exibir LATAM como ainda ativo.
   await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();
   if(await page.getByRole('combobox',{name:'Selecionar filtro favorito'}).inputValue()!=='')
    issues.push('Limpar filtros manteve o favorito visualmente selecionado');
   if(await categoryFilter.inputValue()!=='all'||await method.inputValue()!=='all')
    issues.push('Limpar filtros não restaurou critérios superiores');
   await sum.filter({hasText:`${totalText} de ${totalText} registros do histórico autorizado`}).waitFor();
   await page.getByRole('combobox',{name:'Selecionar filtro favorito'}).selectOption({label:'Cartão e categoria'});
   await sum.filter({hasText:`100 de ${totalText} registros do histórico autorizado`}).waitFor();

   await page.getByRole('button',{name:'Excluir favorito'}).click();
   await page.getByRole('button',{name:'Confirmar exclusão'}).click();
   if(await page.getByRole('combobox',{name:'Selecionar filtro favorito'}).locator('option').count()!==1)
    issues.push('Exclusão do favorito falhou');
   await categoryFilter.selectOption('all');
   await method.selectOption('all');
   await sum.filter({hasText:`${totalText} de ${totalText} registros do histórico autorizado`}).waitFor();
  }
  if(!(await page.locator('.meg-l09[data-icon-pack="phosphor"] .meg-l09-stat.is-income [data-launch-pack="phosphor"]').count()))issues.push('Phosphor nao foi adotado como padrao autenticado');
  if(!(await page.locator('.meg-l09-stat.is-income [data-launch-icon="trendUp"]').count()))issues.push('Entrada sem ícone de alta');
  if(!(await page.locator('.meg-l09-stat.is-expense [data-launch-icon="trendDown"]').count()))issues.push('Saída sem ícone de baixa');
  // Registros sintéticos com categoria Saúde devem ganhar tratamento visual
  // semanticamente reconhecível, enquanto rótulo legado desconhecido é neutro.
  const semanticHealth=page.locator('.meg-l09-grid-panel .meg-l09-category-chip[data-category-glyph="health"][data-category-tone="rose"]');
  if(!(await semanticHealth.count()))issues.push('Saúde sem ícone de coração e tom próprio');
  const genericVisual=page.locator('.meg-l09-grid-panel .meg-l09-category-chip[data-category-glyph="generic"][data-category-tone="neutral"]');
  if(!(await genericVisual.count()))issues.push('Categoria legada desconhecida perdeu fallback visual neutro');
  if((await semanticHealth.first().innerText()).trim()!=='Saúde')issues.push('Categoria foi renomeada no tratamento visual');
  await page.screenshot({path:resolve(output,'categorias-semanticas-'+width+'x'+height+'.png'),fullPage:true});

  if(await page.locator('.meg-l09-right.is-operational').isVisible())
   issues.push('Gráfico complementar voltou a ocupar espaço após recolher');
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
  await page.getByRole('status').filter({hasText:width===960?'Lendo os registros da primeira leitura':'Preparando histórico consistente na API'}).waitFor({timeout:12000});
  await sum.filter({hasText:`1 de ${totalText} registros do histórico autorizado`}).waitFor({timeout:40000});
  if(await query.inputValue()!=='Teste Operacional 101')issues.push('Filtro principal não foi preservado na atualização');
  // O refresh remonta a tela, que deliberadamente inicia filtros externos
  // recolhidos; reabrir antes de interagir com o campo.
  if(!(await query.isVisible()))await page.getByRole('button',{name:'Filtros gerais'}).click();
  await query.fill('');
  historyRequests=0;mutation=true;
  await page.getByRole('button',{name:'Atualizar consulta'}).click();
  await page.getByRole('status').filter({hasText:width===960?'Lendo os registros da primeira leitura':'Preparando histórico consistente na API'}).waitFor({timeout:12000});
  await page.getByRole('alert').filter({hasText:width===960||width===390?'O histórico mudou durante a verificação':'Os dados foram alterados durante a consulta'}).waitFor({timeout:40000});
  if(await page.locator('.meg-l09-grid-panel').count())issues.push('Histórico parcial foi publicado após a alteração concorrente');
  if(nonGetRequests)issues.push('Operação de escrita inesperada: '+nonGetRequests);
  await page.screenshot({path:resolve(output,'consistencia-'+width+'x'+height+'.png'),fullPage:true});
  if(width!==390){
   await page.getByRole('button',{name:'Sair',exact:true}).click();
   await page.locator('[data-meg-login="stage05"]').waitFor({timeout:12000});
   const sessionAfter=await page.evaluate(()=>sessionStorage.getItem('meg.auth.session'));
   if(sessionAfter!==null)issues.push('Logout deixou sessão autenticada no navegador');
   if(logoutCalls!==1)issues.push('Logout não revogou refreshToken exatamente uma vez');
   if(await page.locator('.meg-l09-grid-panel').count())issues.push('Logout deixou informações financeiras visíveis');
   if(width===960&&!(await page.getByRole('alert').filter({hasText:'Não foi possível confirmar a revogação no servidor'}).count()))
    issues.push('Falha remota do logout sem aviso de segurança');
   if(width===1366&&await page.getByRole('alert').filter({hasText:'revogação no servidor'}).count())
    issues.push('Logout bem-sucedido exibiu aviso de falha');
  }

 }catch(error){
  issues.push(String(error));
  issues.push('Diagnóstico: '+JSON.stringify({url:page.url(),historyRequests,mutation}));
  try{await page.screenshot({path:resolve(output,'falha-'+width+'x'+height+'.png'),fullPage:true})}catch{}
 }
 tests.push({width,height,historyRequests,snapshotRequests,nonGetRequests,issues});
 await page.close();
}
await browser.close();
writeFileSync(resolve(output,'resultados.json'),JSON.stringify(tests,null,2));
for(const test of tests)console.log(test.width+'x'+test.height+': '+(test.issues.length?test.issues.join(' | '):'OK'));
if(tests.some(test=>test.issues.length))process.exit(1);
