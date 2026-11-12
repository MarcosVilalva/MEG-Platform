import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';

const base=process.env.MEG_PREVIEW_URL||'http://127.0.0.1:4173';
const sizes=[[390,844],[768,1024],[1024,768],[1366,768],[1920,1080],[2560,1440],[1366,600],[390,667]];
const out=resolve('artifacts/meg-stage09-approved');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try {
 for(const [width,height] of sizes) {
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const api=[],writers=[],errors=[];
  page.on('request',request=>{
   const url=new URL(request.url()),path=url.pathname;
   if(/^\/(finance|auth|cards|payables|api)(\/|$)/.test(path))api.push(path);
   if(!['GET','HEAD'].includes(request.method()))writers.push(request.method()+' '+path);
  });
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/fluxo-integrado-08.html?tela=lancamentos&visualContrato=PR656',{waitUntil:'networkidle'});
  const launch=page.locator('.meg-l09.is-operational');
  await launch.waitFor();
  assert.equal(await page.locator('.meg-l09-hero .meg-l09-stat').count(),4,'Quatro KPIs integrados ao banner exigidos');
  assert.equal(await page.locator('.meg-l09-hero-frame.is-sticky').count(),1,'Banner operacional sticky ausente');
  assert.equal(await page.locator('.meg-l09-grid-focus-toolbar').count(),1,'Toolbar operacional da grade ausente');
  assert.equal(await page.locator('.meg-l09-grid-filter-toggle').count(),1,'Filtros gerais separados ausentes');
  assert.equal(await page.locator('.meg-l09-favorites-select').count(),1,'Filtros favoritos aprovados ausentes');
  assert.equal(await page.locator('.meg-l09-grid-focus-button').count(),1,'Maximização da grade aprovada ausente');
  assert.ok(await page.locator('.meg-l09-category-chip').count()>0,'Ícones/categorias semânticas aprovados ausentes');
  assert.ok(await page.locator('.meg-l09-payment-badge').count()>0,'Miniaturas de pagamentos aprovadas ausentes');
  assert.equal(await page.locator('.meg-l09-details').count(),0,'Painel legado não substitui modal operacional');
  assert.equal(await page.locator('.meg-shell.is-launches-operational').count(),1,'Shell operacional aprovado não foi ativado');
  assert.equal(await page.locator('.meg-l09-visual-only-marker').count(),0,'Não renderizar modo fictício como implementação nova');
  const metrics=await page.evaluate(()=>({viewport:window.innerWidth,document:document.documentElement.scrollWidth,main:document.querySelector('.meg-main')?.scrollWidth,client:document.querySelector('.meg-main')?.clientWidth}));
  assert.ok(metrics.document<=metrics.viewport+2,'Rolagem horizontal indevida do documento: '+JSON.stringify(metrics));
  assert.ok((metrics.main||0)<=(metrics.client||0)+2,'Rolagem horizontal indevida do main: '+JSON.stringify(metrics));
  assert.equal(await page.locator('.meg-p0-qa-label').count(),1,'Aviso de QA somente fictícia deve existir');
  await page.screenshot({path:resolve(out,'lancamentos-operacional-'+width+'x'+height+'.png'),fullPage:true});
  if(width===1366&&height===768){
   await page.getByRole('button',{name:'Filtros gerais'}).click();
   assert.ok(await page.getByPlaceholder('Buscar lançamentos...').isVisible(),'Filtros gerais não expandiram');
   await page.getByRole('button',{name:'Ocultar filtros gerais'}).click();
   await page.getByRole('button',{name:'Distribuição',exact:true}).click();
   assert.ok(await page.locator('#meg-l09-distribution-content').isVisible(),'Distribuição não expandiu');
   await page.getByRole('button',{name:'Distribuição',exact:true}).click();
   await page.getByRole('button',{name:'Maximizar tabela na área útil do sistema'}).click();
   assert.ok(await launch.evaluate(e=>e.classList.contains('is-grid-focus')),'Foco não ativou');
   await page.keyboard.press('Escape');
   assert.ok(!(await launch.evaluate(e=>e.classList.contains('is-grid-focus'))),'Esc não restaurou');
   await page.locator('.meg-l09-row-view:visible').first().click();
   await page.getByRole('dialog').waitFor();
   await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'Salvar filtros'}).click();
   await page.getByPlaceholder('Ex.: Cartão ML ou Saúde').fill('QA contrato visual');
   await page.getByRole('button',{name:'Salvar favorito'}).click();
   assert.ok(await page.getByRole('combobox',{name:'Selecionar filtro favorito'}).locator('option').count()>1,'Favorito não salvou em armazenamento somente local de QA');
   await page.locator('.meg-main').evaluate(el=>{el.scrollTop=260;});
   await page.waitForTimeout(110);
   assert.ok(await launch.evaluate(e=>e.classList.contains('is-header-compact')),'Cabeçalho compacto não ativou ao rolar');
   await page.locator('.meg-main').evaluate(el=>{el.scrollTop=0;});
   await page.waitForTimeout(110);
   assert.ok(!(await launch.evaluate(e=>e.classList.contains('is-header-compact'))),'Cabeçalho não restaurou ao topo');
  }
  assert.deepEqual(api,[],'Prévia visual não deve acessar API');
  assert.deepEqual(writers,[],'Prévia visual não deve gravar');
  assert.deepEqual(errors,[],'Erros JS: '+errors.join(';'));
  console.log('Visual aprovado PR656 / '+width+'x'+height+' : OK');
  await page.close();
 }
} finally {await browser.close()}
