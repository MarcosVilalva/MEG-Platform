import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const base=process.env.MEG_PREVIEW_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const user={id:'qa-p0-user',name:'Usuário Fictício',email:'qa@example.invalid',role:'VIEWER',status:'ACTIVE',isActive:true};
const session={user,accessToken:'qa-fictitious-token',refreshToken:'qa-fictitious-refresh',refreshExpiresAt:'2030-01-01T00:00:00.000Z'};
function commitment(source,sourceId,date,amount,status,dueState,description){
 return {id:source+':'+sourceId,source,sourceId,dueAt:date+'T00:00:00.000Z',
  dueDate:date,description,amount,status,dueState};
}
const items=[
 commitment('financialEvent','old-1','2026-07-05','43.20','planned','overdue','Compromisso antigo fictício'),
 commitment('payable','today-1','2026-11-11','50.17','partial','due_today','Pagamento parcial fictício'),
 commitment('financialEvent','future-1','2026-12-01','90.34','planned','upcoming','Compromisso futuro fictício'),
];
const json=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
const create=async(fail=false,viewport={width:1366,height:900})=>{
 const context=await browser.newContext({viewport});
 const page=await context.newPage();
 await page.addInitScript(value=>sessionStorage.setItem('meg.auth.session',JSON.stringify(value)),session);
 const visited=[];let commitmentCalls=0;
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),pathname=url.pathname;
  if(pathname==='/auth/me'){
   assert.equal(request.headers().authorization,'Bearer qa-fictitious-token','Sessão autenticada');
   return json(route,{user});
  }
  if(pathname==='/finance/home-commitments'){
   commitmentCalls++;
   visited.push(url.pathname+url.search);
   assert.equal(request.headers().authorization,'Bearer qa-fictitious-token','Endpoint somente autenticado');
   assert.equal(url.searchParams.get('limit'),'16');
   if(fail)return json(route,{error:'SERVICE_UNAVAILABLE'},503);
   if(!url.searchParams.get('cursor'))return json(route,{asOf:'2026-11-11',items:[],hasMore:true,nextCursor:'fictitious-cursor'});
   assert.equal(url.searchParams.get('cursor'),'fictitious-cursor');
   return json(route,{asOf:'2026-11-11',items,hasMore:false,nextCursor:null});
  }
  if(pathname.startsWith('/finance/')||pathname.startsWith('/cards')||pathname.startsWith('/payables/')){
   visited.push(url.pathname+url.search);
   if(pathname==='/finance/summary')return json(route,{month:'2026-11',income:0,expense:0,realizedResult:0,projectedResult:0,pendingCount:0,pendingAmount:0});
   if(pathname==='/finance/cashflow')return json(route,{month:'2026-11',days:[]});
   if(pathname==='/finance/benefit-summary')return json(route,{month:'2026-11',balance:0,credits:0,used:0});
   if(pathname==='/finance/home-available')return json(route,{date:'2026-11-11',available:0,scope:'monetary'});
   return json(route,[]);
  }
  return route.continue();
 });
 return {page,context,visited,get count(){return commitmentCalls}};
};
try{
 const success=await create();
 await success.page.goto(base+'/web-evolution.html',{waitUntil:'domcontentloaded'});
 const table=success.page.getByRole('table',{name:'Próximos compromissos'}).first();
 await table.getByText('Compromisso antigo fictício').first().waitFor({timeout:20000});
 const summaryHeaders=await table.locator('thead th').allTextContents();
 assert.equal(summaryHeaders.length,3,
  'Resumo precisa ter somente Vencimento, Descrição e Valor: '+JSON.stringify(summaryHeaders));
 assert.ok(summaryHeaders[0].includes('Vence em')
  && summaryHeaders[1].includes('Descrição')&&summaryHeaders[2].includes('Valor'),
  'O resumo deve priorizar data, descrição e valor');
 const compactViewport=success.page.locator('.pano-grid--commitments:not(.pano-commitments-dialog__grid) .meg-datagrid__viewport');
 const geometry=await compactViewport.evaluate(element=>({
  scroll:element.scrollWidth,available:element.clientWidth,
  right:element.getBoundingClientRect().right,
  lastValueRight:element.querySelector('tbody tr td:last-child strong')?.getBoundingClientRect().right||0,
 }));
 assert.ok(geometry.scroll<=geometry.available+2&&geometry.lastValueRight<=geometry.right+1,
  'DataGrid compacto não pode esconder o valor atrás da rolagem: '+JSON.stringify(geometry));
 assert.equal(success.count,2,'Uma página filtrada vazia não significa ausência de compromissos');
 await table.getByText('Pagamento parcial fictício').first().waitFor();
 await table.getByText('Compromisso futuro fictício').first().waitFor();
 const overdueDate=table.locator('.pano-due-date__urgency.is-overdue').first();
 await overdueDate.waitFor({timeout:20000});
 assert.ok(await overdueDate.isVisible(),'Vencido precisa aparecer visível na coluna Vencimento');
 assert.equal((await overdueDate.textContent())?.trim(),'Vencido','A urgência vencida deve ter texto, não apenas cor');
 assert.ok(await table.locator('.pano-due-date__urgency.is-upcoming').count()>0,
  'A vencer deve ser mostrado textualmente ao receber upcoming da API');
 assert.equal(await table.getByText('Parcial',{exact:true}).count(),0,
  'Situação não deve competir com o valor no resumo compacto');
 const due=success.page.locator('[aria-label*="vence hoje"],[aria-label*="Vence hoje"]');
 assert.ok(await due.count()>0,'A urgência hoje deve vir da API no mesmo DataGrid');
 assert.ok(await table.getByText('Vence hoje',{exact:true}).count()>0,'Vence hoje deve aparecer ao lado da data');
 const attention=success.page.locator('.pano-attention');
 await attention.waitFor({timeout:20000});
 assert.equal(await attention.locator('.pano-attention__item').count(),2,
  'Atenção deve destacar um vencido e um vencendo hoje da leitura canônica, sem contagem global');
 assert.ok(await attention.getByText('Destaques da consulta inicial').isVisible(),
  'Amostra parcial não pode ser apresentada como total');
 assert.ok(await attention.getByText('Compromisso antigo fictício').isVisible(),
  'Destaque vencido deve apresentar descrição real da API');
 assert.ok(await attention.getByText('Compromisso hoje fictício').isVisible(),
  'Destaque de hoje deve apresentar descrição real da API');
 assert.equal((await attention.innerText()).includes('Total de vencidos'),false,
  'Não inventar total financeiro com oito itens');
 assert.equal(success.visited.some(path=>path.startsWith('/payables/open')),false,'Não chamar payables/open redundante');
 assert.equal(success.visited.filter(path=>path.includes('/finance/events/month')).length,1,'Somente mês atual para movimentações');
 assert.equal(await success.page.locator('.pano-grid').count(),2,'Estrutura visual dos dois grids preservada');
 await attention.getByRole('button',{name:/Vencido: Compromisso antigo fictício/}).click();
 const dialog=success.page.getByRole('dialog',{name:'Todos os compromissos'});
 await dialog.getByText('3 compromissos carregados. Consulta concluída.',{exact:false}).waitFor({timeout:20000});
 const detailTable=dialog.getByRole('table',{name:'Todos os compromissos carregados'});
 await detailTable.locator('thead th').first().waitFor({timeout:20000});
 assert.equal(await detailTable.locator('thead th').count(),5,
  'A listagem integral preserva as cinco colunas');
 await detailTable.getByText('Parcial',{exact:true}).first().waitFor({timeout:20000});
 assert.ok(await dialog.getByText('Compromisso antigo fictício').filter({visible:true}).count()>0);
 assert.equal(success.count,4,'Resumo e diálogo devem percorrer páginas independentes');
 assert.equal(await dialog.getByRole('button',{name:'Carregar próximos compromissos'}).count(),0,
  'Não inventar continuação quando o backend confirmou fim de páginas');
 await dialog.getByRole('button',{name:'Fechar lista de compromissos'}).click();
 // Evidência de QA: sessão e dados 100% fictícios; não publicar como Home homologada.
 await mkdir('artifacts/meg-home-p0-qa',{recursive:true});
 await success.page.screenshot({path:'artifacts/meg-home-p0-qa/urgencia-desktop-1366.png',fullPage:true});
 await success.page.locator('.pano-grid').last().screenshot({
  path:'artifacts/meg-home-p0-qa/compromissos-desktop-1366.png',
 });
 await success.context.close();

 // Iniciar diretamente em 375px: redimensionar desktop com sidebar aberta
 // não representa a experiência mobile no primeiro acesso.
 const mobile=await create(false,{width:375,height:812});
 await mobile.page.goto(base+'/web-evolution.html',{waitUntil:'domcontentloaded'});
 await mobile.page.getByText('Compromisso antigo fictício').filter({visible:true}).first().waitFor({timeout:20000});
 await mobile.page.locator('.pano-grid').last().screenshot({
  path:'artifacts/meg-home-p0-qa/compromissos-mobile-375.png',
 });
 await mobile.page.screenshot({path:'artifacts/meg-home-p0-qa/urgencia-mobile-375.png',fullPage:true});
 const viewport=await mobile.page.evaluate(()=>({page:document.documentElement.scrollWidth,screen:window.innerWidth}));
 assert.ok(viewport.page<=viewport.screen,
  'Home P0 não pode causar rolagem horizontal no mobile: '+JSON.stringify(viewport));
 await mobile.context.close();

 const failure=await create(true);
 await failure.page.goto(base+'/web-evolution.html',{waitUntil:'domcontentloaded'});
 await failure.page.getByText('Não foi possível consultar as informações financeiras e compromissos abertos.',{exact:false}).waitFor({timeout:20000});
 assert.ok(await failure.page.getByRole('alert').count()>0,'Falha explícita precisa ter alerta');
 assert.equal(await failure.page.getByText('Nenhum compromisso cadastrado.',{exact:false}).count(),0,'Não transformar falha em estado vazio');
 assert.equal(await failure.page.locator('.pano-grid').count(),0,'Falha crítica não deve renderizar DataGrids vazios abaixo do alerta');
 assert.ok(await failure.page.getByRole('button',{name:/Tentar novamente/}).isVisible(),'Permitir repetição explícita após falha');
 await failure.context.close();
 console.log('Home P0 E2E fictício: sessão, vencido antigo, hoje, cursor vazio, falha fechada, sem Egress redundante.');
}catch(e){console.error(e);process.exitCode=1}finally{await browser.close()}
