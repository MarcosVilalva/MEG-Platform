import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const origin=process.env.MEG_STAGE08_QA_URL || 'http://127.0.0.1:4175';
const out=resolve('artifacts/meg-stage08-prism-typography');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 for(const [width,height] of [[390,844],[960,900],[1366,768]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const api=[],errors=[],unwanted=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{
   const u=new URL(r.url());
   if(/^\/(finance|auth|cards|payables)(\/|$)/.test(u.pathname))api.push(r.url());
   if(u.origin!==new URL(origin).origin && !['https://images.unsplash.com','https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(u.origin))unwanted.push(r.url());
  });
  await page.addInitScript(()=>localStorage.setItem('meg.web.home.quick-actions.v1.user.qa-stage08-user',JSON.stringify(['lancamentos','pendentes','relatorios'])));
  try{
   const response=await page.goto(origin+'/stage08-funcional-qa.html?visual=prism',{waitUntil:'domcontentloaded'});
   try{
     await page.locator('.pano-root').waitFor({timeout:15000});
   }catch(error){
     const diagnostic={
       httpStatus:response?.status(),url:page.url(),title:await page.title().catch(()=>null),
       body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,1300),
       html:(await page.locator('body').innerHTML().catch(()=>'' )).slice(0,1300),
       pageErrors:errors,externalRequests:unwanted,financeRequests:api,
       scripts:await page.locator('script[src]').evaluateAll(items=>items.map(x=>x.getAttribute('src'))),
     };
     console.log('PRISM_QA_PUBLIC_DIAGNOSTIC '+JSON.stringify(diagnostic));
     throw error;
   }
   assert.equal(await page.locator('html').getAttribute('data-meg-typography-pilot'),'true');
   assert.equal(await page.locator('html').getAttribute('data-meg-prism-ui'),'true');
   assert.equal(await page.locator('style[data-meg-prism-style="inline-qa"]').count(),1,'CSS experimental Prism não está embutido no bundle');
   assert.ok(await page.locator('.meg-nav-item [data-meg-prism="micro-3d"]').count()>=5,'Shell não utiliza os ícones Prism');
   assert.ok(await page.locator('.pano-root [data-meg-prism="micro-3d"]').count()>=7,'Home não utiliza os ícones Prism');
   let font=await page.locator('.pano-root').evaluate(el=>getComputedStyle(el).fontFamily);
   assert.match(font,/Plus Jakarta Sans/);
   let heading=await page.locator('.pano-root h1').first().evaluate(el=>getComputedStyle(el).fontFamily);
   assert.match(heading,/Sora/);
   // A família estar no CSS não prova que o navegador baixou os glifos.
   await page.evaluate(()=>document.fonts.ready);
   const loaded=await page.evaluate(async()=>{
     const jobs=await Promise.all([
       document.fonts.load('600 16px "Sora"'),
       document.fonts.load('600 16px "Plus Jakarta Sans"'),
     ]);
     const fonts=Array.from(document.fonts).map(face=>({name:face.family,status:face.status}));
     return {jobs:jobs.map(faces=>faces.length),fonts};
   });
   assert.ok(loaded.jobs.every(count=>count>0),'O navegador não encontrou as fontes do piloto');
   assert.ok(loaded.fonts.some(face=>face.name==='Sora'&&face.status==='loaded'),'Sora não carregou');
   assert.ok(loaded.fonts.some(face=>face.name==='Plus Jakarta Sans'&&face.status==='loaded'),'Plus Jakarta Sans não carregou');
   const dialog=page.locator('.meg-due-alert-dialog');
   await dialog.waitFor({state:'visible',timeout:5000}).catch(()=>{});
   if(await dialog.isVisible())await page.getByRole('button',{name:'Entendi'}).click();
   await page.screenshot({path:resolve(out,'home-'+width+'.png'),fullPage:false});
   await page.getByRole('region',{name:'Atalhos da Home'}).getByRole('button',{name:/Lançamentos/}).click();
   const launches=page.locator('.meg-l09.is-operational');
   await launches.waitFor({timeout:20000});
   await launches.locator('.meg-l09-grid-summary').waitFor({timeout:25000});
   const stats=launches.locator('.meg-l09-stat');
   assert.equal(await stats.count(),4);
   const flow=await stats.evaluateAll(items=>items.map(item=>item.querySelector('[data-financial-flow]')?.getAttribute('data-financial-flow')||null));
   assert.deepEqual(flow,[null,'up','down',null]);
   assert.ok(await launches.locator('[data-launch-pack="meg-prism-enhanced"]').count()>0,'Categorias e controles de Lançamentos não receberam o acabamento Prism');
   assert.ok(await launches.locator('[data-payment-prism="true"]').count()>0,'Formas de pagamento não receberam acabamento Prism');
   const titleFont=await launches.locator('.meg-l09-hero h1').evaluate(el=>getComputedStyle(el).fontFamily);
   assert.match(titleFont,/Sora/);
   const kpiFont=await stats.first().locator('strong').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
   assert.ok(kpiFont>=16,'KPIs devem ter fonte legível');
   await page.screenshot({path:resolve(out,'lancamentos-'+width+'.png'),fullPage:false});
   const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
   assert.ok(dimensions.scroll<=dimensions.viewport+2,'overflow horizontal global');
   assert.deepEqual(api,[],'QA fez requisições financeiras reais');
   assert.deepEqual(unwanted,[],'recurso externo não autorizado');
   assert.deepEqual(errors,[],'erros JS');
   console.log('STAGE08_PRISM_TYPE '+width+'x'+height+' PASS (Home, lançamentos, contraste estrutural, sem rede financeira)');
  }finally{await page.close();}
 }
}finally{await browser.close();}
