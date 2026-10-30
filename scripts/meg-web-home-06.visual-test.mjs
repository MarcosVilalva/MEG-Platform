import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const sizes = [
  ['desktop-oficial', 1672, 941],
  ['desktop-padrao', 1366, 768],
  ['desktop-limite', 1024, 768],
  ['desktop-baixo', 1366, 600],
  ['tablet', 768, 1024],
  ['mobile', 390, 844],
  ['mobile-estreito', 320, 700],
  ['ultrawide', 2560, 1440],
];
const browser = await chromium.launch({
  headless:true,
  executablePath:process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage'],
});
let errors = 0;
await mkdir('artifacts/home-06', {recursive:true});
try {
 for(const [name,width,height] of sizes){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage();
  const jsErrors=[];
  page.on('pageerror',error=>jsErrors.push(String(error)));
  const response=await page.goto('http://127.0.0.1:4173/home-visual.html',{waitUntil:'networkidle',timeout:45000});
  try{
   assert.equal(response?.status(),200,'HTTP '+name);
   await page.locator('.meg-home .balance').waitFor({state:'visible',timeout:20000});
   assert.equal(await page.locator('.meg-home-kpi').count(),4,'KPIs '+name);
   assert.equal(await page.locator('.meg-home-flow-stat').count(),2,'dois indicadores separados no fluxo '+name);
   assert.equal(await page.locator('.meg-home-kpi-arrow').count(),4,'setas de acesso dos quatro KPIs '+name);
   assert.equal(await page.locator('.meg-topbar-home-context').count(),1,'saudação exclusiva da Home '+name);
   assert.equal((await page.locator('.meg-profile-name').textContent())?.trim(),'Marcos de Andrade Vilalva','identificação demonstrativa do print oficial '+name);
   assert.equal(await page.locator('.meg-home-flow-distribution').count(),1,'fluxo visual com totais da autoridade '+name);
   assert.match(await page.locator('.meg-home-flow-result').innerText(),/Resultado projetado/i,'projectedResult nunca identificado como saldo '+name);
   assert.equal(await page.locator('.meg-home-reference-screen').count(),1,'Home orientada à imagem enviada '+name);
   assert.equal(await page.locator('.meg-home-flow-chart').count(),1,'gráfico de fluxo com fonte canônica '+name);
   assert.equal(await page.locator('.meg-home-hero-visual').count(),1,'imagem real dedicada ao saldo '+name);
   assert.equal(await page.locator('.meg-home-vero-card').count(),1,'cartão visual sem números fictícios '+name);
   assert.equal(await page.locator('.meg-home img').count(),0,'dados e ícones não embutidos em imagens rasterizadas '+name);
   assert.equal(await page.locator('.meg-home-wallet-photo,.meg-home-balance-art,.meg-home-benefit-card').count(),0,'artes anteriores não reutilizadas '+name);
   const balanceSize=await page.locator('.meg-home-hero-balance').evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize));
   assert.ok(balanceSize>=31,'saldo visualmente protagonista '+name+': '+balanceSize);
   assert.equal(await page.locator('.meg-home-quick-action').count(),5,'5 ações funcionais '+name);
   const balanceToggle=page.getByRole('button',{name:'Ocultar saldos'});
   await balanceToggle.click();
   assert.equal(await page.locator('.meg-home-hero-balance').innerText(),'R$ •••••');
   assert.equal(await page.locator('.meg-home-benefit-balance').innerText(),'R$ •••••','prévia não deve inventar saldo de benefício: '+name);
   assert.equal(await page.locator('.meg-home-benefit-finances-label').innerText(),'Saldo do benefício');
   await page.getByRole('button',{name:'Mostrar saldos'}).click();
   assert.equal(await page.getByRole('button',{name:'Ocultar saldos'}).getAttribute('aria-pressed'),'false');
   assert.match(await page.locator('.meg-home-benefit-balance').innerText(),/1\.890,32/,'benefício da fonte mock '+name);
   const btns=await page.locator('.meg-home-quick-action').evaluateAll(nodes=>nodes.map(el=>({height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width})));
   assert.ok(Math.max(...btns.map(x=>x.height))-Math.min(...btns.map(x=>x.height))<2,'botões com mesma altura '+name);
   if(width>=1024) assert.ok(Math.max(...btns.map(x=>x.width))-Math.min(...btns.map(x=>x.width))<2,'botões com mesma largura '+name);
   assert.equal(await page.locator('.meg-home-grid-slot').count(),2,'DataGrids '+name);
   assert.equal(await page.locator('.meg-home-welcome').count(),0,'sem cabeçalho redundante '+name);
   assert.ok(await page.locator('.meg-home-category-icon').count()>=5,'SVGs financeiros nas movimentações '+name);
   assert.ok(await page.locator('.meg-home-category-pill').count()>=5,'categorias semânticas no DataGrid '+name);
   const dueFirst=await page.locator('.meg-home .upcoming .meg-datagrid-table tbody tr').first().innerText();
   assert.match(dueFirst,/28\/10\/2026/,'vencimentos devem iniciar em ordem cronológica sem sort persistido '+name);
   assert.ok(await page.locator('.meg-home .upcoming .meg-home-payable-status').count()>=4,'status do contrato canônico disponível sem conta fictícia '+name);
   const stats=await page.evaluate(()=>({
     viewport:window.innerWidth,
     documentWidth:document.documentElement.scrollWidth,
     documentHeight:document.documentElement.scrollHeight,
     viewportHeight:window.innerHeight,
     shell:document.querySelector('.meg-shell')?.getBoundingClientRect().toJSON(),
     grid:document.querySelector('.meg-home-dash')?.getBoundingClientRect().toJSON(),
   }));
   // Contrato visual da imagem atual: Saldo 7/12 e Fluxo 5/12,
   // KPIs em quatro colunas, Benefícios/Ações e duas tabelas 6/6.
   const layout=await page.evaluate(()=>{
     const bounds=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
     return {balance:bounds('.meg-home .balance'),flow:bounds('.meg-home .flow'),benefits:bounds('.meg-home .benefits'),quick:bounds('.meg-home .quick'),recent:bounds('.meg-home .recent'),upcoming:bounds('.meg-home .upcoming'),kpi:[...document.querySelectorAll('.meg-home-kpi')].map(x=>{const r=x.getBoundingClientRect();return {top:r.top,left:r.left,bottom:r.bottom,height:r.height};})};
   });
   if(width>=1024){
     assert.ok(Math.abs(layout.balance.top-layout.flow.top)<=2,name+': Saldo e Fluxo não compartilham a primeira linha');
     assert.ok(layout.flow.left>=layout.balance.right-1,name+': Saldo e Fluxo colidem');
     const ratio=layout.balance.width/layout.flow.width;
     assert.ok(ratio>=1.15&&ratio<=1.65,name+': proporção principal 7/5 incorreta '+ratio);
     assert.ok(Math.max(...layout.kpi.map(x=>x.top))-Math.min(...layout.kpi.map(x=>x.top))<=2,name+': KPIs não estão na mesma linha');
     if(width>=1280){
       assert.ok(Math.abs(layout.benefits.top-layout.quick.top)<=2,name+': faixa Verocard/Ações desalinhada');
       assert.ok(Math.abs(layout.recent.top-layout.upcoming.top)<=2,name+': DataGrids não compartilham a última linha');
     }
   }else{
     assert.ok(layout.flow.top>=layout.balance.bottom-1,name+': Saldo/Fluxo se sobrepõem no tablet/mobile');
     assert.ok(layout.upcoming.top>=layout.recent.bottom-1,name+': DataGrids se sobrepõem no tablet/mobile');
   }
   assert.ok(stats.documentWidth<=stats.viewport+1,name+': rolagem horizontal: '+JSON.stringify(stats));
   assert.ok(stats.documentHeight<=stats.viewportHeight+1,name+': overflow externo: '+JSON.stringify(stats));
   // Rolagem vertical natural é permitida, mas nenhum painel pode
   // mascarar linhas, controles ou colunas para caber na janela.
   const geometry=await page.evaluate(()=>{
     const main=document.querySelector('.meg-main');
     const home=document.querySelector('.meg-home');
     const panels=[...document.querySelectorAll('.meg-home-dash>.meg-home-card')];
     const cards=panels.map(el=>{
       const r=el.getBoundingClientRect(),style=getComputedStyle(el);
       return {kind:el.className,top:r.top,bottom:r.bottom,height:r.height,overflow:style.overflowY};
     });
     const tables=[...document.querySelectorAll('.meg-home .meg-datagrid-table')].map(table=>{
       const parent=table.closest('.meg-home-card');
       const panel=parent.getBoundingClientRect();
       const rect=table.getBoundingClientRect();
       const rows=[...table.querySelectorAll('tbody tr')];
       const last=rows.slice(0,5).at(-1)?.getBoundingClientRect();
       return {count:rows.length,right:rect.right,panelRight:panel.right,lastBottom:last?.bottom??null,panelBottom:panel.bottom};
     });
     return {
       mainClientHeight:main.clientHeight,mainScrollHeight:main.scrollHeight,
       mainClientWidth:main.clientWidth,mainScrollWidth:main.scrollWidth,
       homeScrollWidth:home.scrollWidth,homeClientWidth:home.clientWidth,
       cards,tables,
     };
   });
   assert.ok(geometry.mainScrollWidth<=geometry.mainClientWidth+1,
     name+': rolagem horizontal no Shell '+JSON.stringify(geometry));
   assert.ok(geometry.homeScrollWidth<=geometry.homeClientWidth+1,
     name+': rolagem horizontal da Home '+JSON.stringify(geometry));
   assert.ok(geometry.cards.every(c=>c.height>=95),
     name+': card espremido '+JSON.stringify(geometry.cards));
   if(width>=1024){
     if(width>=1366){
       const contextVisible=await page.locator('.meg-topbar-home-context').isVisible();
       assert.ok(contextVisible,'saudação visível no desktop largo '+name);
     }
     assert.equal(geometry.tables.length,2,name+': duas tabelas reais');
     assert.ok(geometry.tables.every(t=>t.right<=t.panelRight+1),
       name+': coluna cortada '+JSON.stringify(geometry.tables));
     assert.ok(geometry.tables.every(t=>t.lastBottom===null||t.lastBottom<=t.panelBottom+1),
       name+': linha cortada '+JSON.stringify(geometry.tables));
     assert.ok(geometry.tables[0].count>=5,'cinco movimentações da fixture '+name);
     assert.ok(geometry.tables[1].count>=4,'vencimentos da fixture '+name);
     const kpiHeights=await page.locator('.meg-home-kpi').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height));
     assert.ok(Math.max(...kpiHeights)-Math.min(...kpiHeights)<2,
       name+': KPIs assimétricos');
   }else{
     if(width<640){
       const touchTargets=await page.locator('.meg-home-privacy, .meg-home-grid-tools, .meg-home-see-all').evaluateAll(nodes=>nodes.map(node=>({name:node.className,height:node.getBoundingClientRect().height,width:node.getBoundingClientRect().width})));
       assert.ok(touchTargets.every(item=>item.height>=47.5&&item.width>=47.5),'alvos de toque >=48px: '+name+' '+JSON.stringify(touchTargets));
     }
     // Não se exige que tudo seja exibido simultaneamente em 320px.
     // Todos os quatro grupos permanecem no fluxo normal e acessíveis.
     assert.equal(await page.locator('.meg-home-mobile-tabs').count(),0,
       name+': abas antigas não aprovadas');
     assert.ok(geometry.cards.every(c=>c.height>0),
       name+': painel escondido em mobile');
     await page.locator('.meg-home .upcoming').scrollIntoViewIfNeeded();
     assert.ok(await page.locator('.meg-home .upcoming').isVisible(),
       name+': vencimentos devem permanecer acessíveis no mobile');
   }
   assert.equal(jsErrors.length,0,name+': console errors '+jsErrors.join(' | '));
   // Evidência confiável: centralizar o primeiro/último painel no viewport,
   // em vez de alterar scrollTop de um elemento que pode não ser o scroller final.
   await page.locator('.meg-home .balance').scrollIntoViewIfNeeded();
   await page.screenshot({path:'artifacts/home-06/'+name+'.png'});
   await page.locator('.meg-home .upcoming').scrollIntoViewIfNeeded();
   await page.screenshot({path:'artifacts/home-06/'+name+'-parte-inferior.png'});
   console.log('PASS',name,width+'×'+height,JSON.stringify(stats));
  }catch(error){
   errors++;
   console.error('FAIL',name,error);
   await page.screenshot({path:'artifacts/home-06/'+name+'-error.png',fullPage:true}).catch(()=>{});
  }
  await context.close();
 }
}finally{await browser.close();}
if(errors)process.exitCode=1;
