import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const origin=process.env.MEG_STAGE08_QA_URL||'http://127.0.0.1:4175';
const output=resolve('artifacts/meg-prism-design-system');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({
 headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox'],
});
try{
 for(const [width,height] of [[1366,768],[960,900],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[],external=[],financeRequests=[],fontFailures=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',req=>{
   const u=new URL(req.url());
   if(u.origin!==new URL(origin).origin&&u.origin!=='https://images.unsplash.com')external.push(req.url());
   if(/^\/(auth|finance|cards|payables)(\/|$)/.test(u.pathname))financeRequests.push(req.url());
  });
  page.on('response',res=>{
   if(res.url().includes('/meg-web-evolution/fonts/MEG-')&&!res.ok())fontFailures.push([res.status(),res.url()]);
  });
  await page.addInitScript(()=>{
   localStorage.setItem('meg.web.home.quick-actions.v1.user.qa-stage08-user',
    JSON.stringify(['lancamentos','pendentes','relatorios']));
  });
  try{
   await page.goto(origin+'/stage08-funcional-qa.html',{waitUntil:'domcontentloaded'});
   await page.locator('.pano-root').waitFor({timeout:22000});
   const fontLoad=await page.evaluate(async()=>{
    const [manrope,sora]=await Promise.all([
     document.fonts.load('600 18px "MEG Manrope"'),
     document.fonts.load('700 22px "MEG Sora"'),
    ]);
    return {manrope:manrope.filter(f=>f.status==='loaded').length,sora:sora.filter(f=>f.status==='loaded').length};
   });
   assert.ok(fontLoad.manrope>=1&&fontLoad.sora>=1,'Fontes Sora/Manrope self-hosted não carregaram');
   assert.deepEqual(fontFailures,[],'Arquivo de fonte local ausente');
   const root=page.locator('.pano-root');
   assert.match(await root.evaluate(el=>getComputedStyle(el).fontFamily),/MEG Manrope/,'Home não usa a família principal');
   const title=root.locator('.pano-panel-title h2:visible').first();
   const typography=await title.evaluate(el=>({font:getComputedStyle(el).fontFamily,size:parseFloat(getComputedStyle(el).fontSize)}));
   assert.match(typography.font,/MEG Sora/,'Título sem Sora');
   assert.ok(typography.size>=15,'Título inferior a 15px');
   assert.ok((await page.locator('.meg-nav [data-meg-icon-pack="meg-prism-system"]').count())>=7,'Shell sem o pack unificado');
   assert.ok((await root.locator('[data-meg-icon-pack="meg-prism-system"]').count())>=8,'Home sem pack unificado');
   const flows=await root.locator('[data-financial-flow]').evaluateAll(els=>els.map(el=>el.getAttribute('data-financial-flow')));
   assert.ok(flows.includes('down')&&flows.includes('up'),'Setas Home de entrada/saída incorretas');
   await page.screenshot({path:resolve(output,'home-'+width+'x'+height+'.png'),fullPage:false});
   const due=page.locator('.meg-due-alert-dialog');
   await due.waitFor({state:'visible',timeout:4000}).catch(()=>{});
   if(await due.isVisible())await page.getByRole('button',{name:'Entendi'}).click();
   await page.getByRole('region',{name:'Atalhos da Home'}).getByRole('button',{name:/Lançamentos/}).click();
   const launches=page.locator('.meg-l09.is-operational');
   await launches.waitFor({timeout:18000});
   await launches.locator('.meg-l09-grid-summary').waitFor({timeout:20000});
   assert.match(await launches.locator('.meg-l09-hero h1').evaluate(el=>getComputedStyle(el).fontFamily),/MEG Sora/);
   const summaries=await launches.locator('.meg-l09-stat').evaluateAll(els=>els.map(el=>({
     text:el.querySelector('strong')?.textContent?.trim(),
     label:parseFloat(getComputedStyle(el.querySelector('h2')).fontSize),
     value:parseFloat(getComputedStyle(el.querySelector('strong')).fontSize),
   })));
   assert.equal(summaries.length,4,'Quatro indicadores não preservados');
   assert.ok(summaries.every(x=>x.text&&x.label>=11&&x.value>=14),'KPI continua ilegível');
   assert.deepEqual(await launches.locator('[data-financial-flow]').evaluateAll(els=>els.map(el=>el.getAttribute('data-financial-flow'))),['down','up'],'Semântica invertida');
   await page.screenshot({path:resolve(output,'launches-'+width+'x'+height+'.png'),fullPage:false});
   const horizontal=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
   assert.ok(horizontal.doc<=horizontal.viewport+2,'Fonte criou rolagem horizontal global');
   assert.deepEqual(errors,[],'Erro JavaScript');
   assert.deepEqual(external,[],'Acesso externo não autorizado');
   assert.deepEqual(financeRequests,[],'Acesso financeiro real');
   console.log('MEG_PRISM_SYSTEM '+width+'x'+height+' PASS (fontes locais, ícones, responsivo, zero writes)');
  }finally{await page.close()}
 }
}finally{await browser.close()}
