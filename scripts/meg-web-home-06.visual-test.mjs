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
   assert.equal(await page.locator('.meg-home-wallet-photo').count(),1,'carteira oficial da referencia 02 '+name);
   assert.equal(await page.locator('.meg-home-balance-graph').count(),0,'sem grafico SVG decorativo no saldo '+name);
   const balanceSize=await page.locator('.meg-home-hero-balance').evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize));
   assert.ok(balanceSize>=31,'saldo visualmente protagonista '+name+': '+balanceSize);
   assert.equal(await page.locator('.meg-home-quick-action').count(),5,'5 ações da imagem oficial 02 '+name);
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
   assert.equal(await page.locator('.meg-home img').count(),2,'wallet e arte do beneficio '+name);
   const loaded=await page.locator('.meg-home img').evaluateAll(images=>images.every(img=>img.complete && img.naturalWidth>0));
   assert.ok(loaded,'assets oficiais carregados '+name);
   const stats=await page.evaluate(()=>({
     viewport:window.innerWidth,
     documentWidth:document.documentElement.scrollWidth,
     documentHeight:document.documentElement.scrollHeight,
     viewportHeight:window.innerHeight,
     shell:document.querySelector('.meg-shell')?.getBoundingClientRect().toJSON(),
     grid:document.querySelector('.meg-home-dash')?.getBoundingClientRect().toJSON(),
   }));
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
