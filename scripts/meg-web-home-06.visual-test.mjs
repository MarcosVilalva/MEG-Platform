import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const sizes = [
  ['desktop-oficial', 1672, 941],
  ['desktop-padrao', 1366, 768],
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
   if(width>=1024 && height>=768){
     const limits=await page.evaluate(()=>{
       const main=document.querySelector('.meg-main');
       const grid=document.querySelector('.meg-home-dash');
       const panels=[...document.querySelectorAll('.meg-home-dash>.meg-home-card')];
       const visible=panels.every(el=>{const r=el.getBoundingClientRect();return r.top>=main.getBoundingClientRect().top-1 && r.bottom<=main.getBoundingClientRect().bottom+1});
       return {clientHeight:main.clientHeight,scrollHeight:main.scrollHeight,gridBottom:grid.getBoundingClientRect().bottom,mainBottom:main.getBoundingClientRect().bottom,visible,scrollWidth:main.scrollWidth,clientWidth:main.clientWidth};
     });
     assert.ok(limits.scrollHeight<=limits.clientHeight+1,name+': rolagem vertical do painel: '+JSON.stringify(limits));
     assert.ok(limits.scrollWidth<=limits.clientWidth+1,name+': rolagem horizontal do painel: '+JSON.stringify(limits));
     assert.ok(limits.visible,name+': conteúdo fora do viewport '+JSON.stringify(limits));
   }
   if(width<1024){
     const views=['saldo','indicadores','operacoes','tabelas'];
     for (const view of views){
       const names={saldo:'Resumo',indicadores:'Contas',operacoes:'Ações',tabelas:'Listas'};
       await page.getByRole('button',{name:names[view],exact:true}).click();
       assert.equal(await page.locator('.meg-home').getAttribute('data-mobile-view'),view,'troca de painel '+name);
     }
     await page.getByRole('button',{name:'Resumo',exact:true}).click();
   }
   assert.equal(jsErrors.length,0,name+': console errors '+jsErrors.join(' | '));
   await page.screenshot({path:'artifacts/home-06/'+name+'.png',fullPage:true});
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
