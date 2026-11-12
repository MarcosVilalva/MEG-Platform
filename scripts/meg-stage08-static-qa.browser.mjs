import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const origin=process.env.MEG_STAGE08_QA_URL||'http://127.0.0.1:4175';
const browser=await chromium.launch({
  headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
  args:['--no-sandbox'],
});
try{
 for(const [width,height] of [[1366,768],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const external=[],networkFinancial=[],errors=[],consoleErrors=[],failedRequests=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
  page.on('requestfailed',request=>failedRequests.push({url:request.url(),reason:request.failure()?.errorText}));
  page.on('request',req=>{
    const u=new URL(req.url());
    // Apenas as fotografias de referência visual são recursos externos permitidos.
    if(u.origin!==new URL(origin).origin && u.origin!=='https://images.unsplash.com')external.push(req.url());
    if(/^\/(finance|auth|cards|payables)(\/|$)/.test(u.pathname))networkFinancial.push(req.url());
  });
  await page.addInitScript(()=>{
    localStorage.setItem('meg.web.home.quick-actions.v1.user.qa-stage08-user',
      JSON.stringify(['lancamentos','pendentes','relatorios']));
  });
  try{
   await page.goto(origin+'/stage08-funcional-qa.html',{waitUntil:'domcontentloaded'});
   try{await page.locator('.pano-root').waitFor({timeout:15000});}
   catch(error){
    const body=await page.locator('body').innerText().catch(()=>'<body unavailable>');
    const state=await page.evaluate(()=>({sessionIsPresent:Boolean(sessionStorage.getItem('meg.auth.session')),qaTrace:window.__MEG_STAGE08_QA_TRACE__||[],url:location.href}));
    throw new Error('QA_HOME_NOT_VISIBLE '+JSON.stringify({body:body.slice(0,2000),state,errors,consoleErrors,failedRequests,external,networkFinancial,cause:String(error)}));
   }
   assert.match(await page.locator('.meg-stage08-qa-stamp').innerText(),/Dados fictícios/);
   assert.equal(await page.locator('.meg-profile-name').innerText(),'Usuário fictício QA');
   // A Home aprovada exibe alerta canônico inicial na sessão, não o suprimir.
   // Fechá-lo pela interação normal antes de testar o carrossel.
   const dueDialog=page.locator('.meg-due-alert-dialog');
   if(await dueDialog.isVisible())await page.getByRole('button',{name:'Entendi'}).click();
   const quick=page.getByRole('region',{name:'Atalhos da Home'});
   await quick.getByRole('button',{name:/Lançamentos/}).click();
   await page.locator('.meg-l09.is-operational').waitFor({timeout:20000});
   await page.locator('.meg-l09-grid-summary').waitFor({timeout:20000});
   assert.equal(await page.locator('.meg-nav-item[aria-label="Lançamentos"].is-active').count(),1);
   if(width<1024)await page.getByRole('button',{name:'Abrir menu'}).click();
   await page.locator('.meg-sidebar .meg-nav-item[aria-label="Início"]').click();
   await page.locator('.pano-root').waitFor({timeout:10000});
   if(width<640)await page.getByRole('button',{name:'Ver próximos atalhos'}).click();
   await quick.getByRole('button',{name:/Pagar conta/}).click();
   await page.getByRole('status').filter({hasText:'Pendentes ainda não está disponível'}).waitFor();
   assert.equal(await page.locator('.meg-l09').count(),0);
   const preference=await page.evaluate(()=>localStorage.getItem('meg.web.home.quick-actions.v1.user.qa-stage08-user'));
   assert.deepEqual(JSON.parse(preference),['lancamentos','pendentes','relatorios']);
   const dims=await page.evaluate(()=>({
     doc:document.documentElement.scrollWidth,
     width:document.documentElement.clientWidth,
   }));
   assert.ok(dims.doc<=dims.width+2,'Rolagem horizontal inesperada');
   assert.deepEqual(external,[],'Prévia tentou carregar recurso de outro domínio');
   assert.deepEqual(networkFinancial,[],'Prévia tentou consultar API pela rede');
   assert.deepEqual(errors,[],'Erros JS na QA isolada');
   console.log('STAGE08_STATIC_QA '+width+'x'+height+' PASS (gateway original, navegação, fallback, zero rede externa e zero API)');
  }finally{await page.close();}
 }
}finally{await browser.close();}
