import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const origin=process.env.MEG_STAGE08_QA_URL||'http://127.0.0.1:4175';
const output=resolve('artifacts/meg-stage08-lancamentos-icons');
mkdirSync(output,{recursive:true});
const expected=['projection3d','entry3d','exit3d','wallet3d'];
const browser=await chromium.launch({
 headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
 args:['--no-sandbox'],
});
try{
 for(const [width,height] of [[1366,768],[960,900],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[],external=[],financeRequests=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',req=>{
    const u=new URL(req.url());
    if(u.origin!==new URL(origin).origin && u.origin!=='https://images.unsplash.com')external.push(req.url());
    if(/^\/(auth|finance|cards|payables)(\/|$)/.test(u.pathname))financeRequests.push(req.url());
  });
  await page.addInitScript(()=>{
   localStorage.setItem('meg.web.home.quick-actions.v1.user.qa-stage08-user',
     JSON.stringify(['lancamentos','pendentes','relatorios']));
  });
  try{
   await page.goto(origin+'/stage08-funcional-qa.html',{waitUntil:'domcontentloaded'});
   await page.locator('.pano-root').waitFor({timeout:25000});
   const due=page.locator('.meg-due-alert-dialog');
   await due.waitFor({state:'visible',timeout:5000}).catch(()=>{});
   if(await due.isVisible())await page.getByRole('button',{name:'Entendi'}).click();
   await page.getByRole('region',{name:'Atalhos da Home'}).getByRole('button',{name:/Lançamentos/}).click();
   const root=page.locator('.meg-l09.is-operational');
   await root.waitFor({timeout:15000});
   await root.locator('.meg-l09-grid-summary').waitFor({timeout:30000});
   const stats=root.locator('.meg-l09-stat');
   assert.equal(await stats.count(),4,'Quatro indicadores canônicos devem permanecer');
   const icons=await stats.evaluateAll(items=>items.map(item=>item.querySelector('[data-launch-icon]')?.getAttribute('data-launch-icon')));
   assert.deepEqual(icons,expected,'Ícones MEG Prism não correspondem aos quatro KPIs');
   const families=await stats.evaluateAll(items=>items.map(item=>item.querySelector('svg')?.getAttribute('data-launch-pack')));
   assert.deepEqual(families,['meg-prism-3d','meg-prism-3d','meg-prism-3d','meg-prism-3d'],'Pack 3D ausente');
   const directions=await stats.evaluateAll(items=>items.map(item=>item.querySelector('[data-financial-flow]')?.getAttribute('data-financial-flow')||null));
   assert.deepEqual(directions,[null,'down','up',null],'Entradas devem descer e saídas devem subir');
   const depth=await stats.evaluateAll(items=>items.map(item=>({gradients:item.querySelectorAll('svg linearGradient').length,prism:item.querySelectorAll('svg [data-meg-surface="prism"]').length,iconWidth:item.querySelector('svg')?.getBoundingClientRect().width||0})));
   assert.ok(depth.every(v=>v.gradients>=1&&v.prism===1&&v.iconWidth>=(width<640?19:22)),'Glifos sem camadas de profundidade ou pequenos demais');
   const values=await stats.evaluateAll(items=>items.map(x=>x.querySelector('strong')?.textContent?.trim()));
   assert.ok(values.every(v=>Boolean(v)&&v!=='—'),'Valores canônicos desapareceram na revisão');
   const first=root.locator('button.meg-l09-row-view:visible').first();
   await first.waitFor({state:'visible',timeout:15000});
   assert.equal((await first.textContent())?.trim(),'','O botão ainda mostra texto');
   assert.equal(await first.locator('[data-launch-icon="details3d"][data-launch-pack="meg-prism-3d"]').count(),1,'Ação sem ícone MEG Prism de detalhes');
   assert.match(await first.getAttribute('aria-label')||'',/^Ver detalhes de /);
   assert.equal(await first.getAttribute('data-tooltip'),'Ver detalhes');
   assert.equal(await first.getAttribute('title'),'Ver detalhes do lançamento');
   assert.equal(await first.locator('svg linearGradient, svg radialGradient').count(),2,'Ícone de consulta sem dois acabamentos de luz e profundidade');
   const rect=await first.boundingBox();
   assert.ok(rect && rect.width>=(width<=639?43:34) && rect.height>=(width<=639?43:34),'Alvo de toque menor que o aprovado');
   if(width>639){
    await first.hover();
    const tooltip=await first.evaluate(el=>getComputedStyle(el,'::after').visibility);
    assert.equal(tooltip,'visible','Tooltip de hover não aparece');
    await first.focus();
    assert.equal(await first.evaluate(el=>getComputedStyle(el,'::after').visibility),'visible','Tooltip de teclado não aparece');
   }
   await page.screenshot({path:resolve(output,'lancamentos-icons-'+width+'x'+height+'.png'),fullPage:false});
   await first.click();
   const modal=page.getByRole('dialog',{name:/Teste|Seguro|Mercado|Energia|Crédito|Conta|Pagamento|Internet/i});
   await page.locator('.meg-l09-modal').waitFor({state:'visible',timeout:9000});
   assert.match(await page.locator('.meg-l09-modal').innerText(),/Somente leitura/);
   await page.getByRole('button',{name:'Fechar detalhes'}).click();
   assert.equal(await page.getByRole('dialog').count(),0,'Modal ficou aberto após Fechar');
   const after=await stats.evaluateAll(items=>items.map(x=>x.querySelector('strong')?.textContent?.trim()));
   assert.deepEqual(after,values,'Detalhamento alterou os valores canônicos');
   const overflow=await page.evaluate(()=>({
    document:document.documentElement.scrollWidth,
    viewport:document.documentElement.clientWidth,
   }));
   assert.ok(overflow.document<=overflow.viewport+2,'Rolagem horizontal global após a revisão');
   assert.deepEqual(financeRequests,[],'Revisão tentou acessar endpoints financeiros reais');
   assert.deepEqual(external,[],'Revisão tentou carregar recursos externos não permitidos');
   assert.deepEqual(errors,[],'Erro de JavaScript no fluxo de revisão');
   console.log('STAGE08_LAUNCH_ICONS '+width+'x'+height+' PASS (4 ícones, tooltip, ação, modal, KPIs e zero APIs reais)');
  }finally{await page.close();}
 }
}finally{await browser.close();}
