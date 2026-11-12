import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const base=process.env.MEG_STAGE08_UNIFIED_QA_URL||'http://127.0.0.1:4175';
const output=resolve('artifacts/meg-unified-prism');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 for(const [width,height] of [[390,844],[960,900],[1366,768]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const realApi=[],errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{
   if(/^\/(auth|finance|cards|payables)(\/|$)/.test(new URL(r.url()).pathname))realApi.push(r.url());
  });
  const open=async(tela)=>page.goto(base+'/meg-unificado-qa.html?visual=prism&tela='+tela,{waitUntil:'domcontentloaded'});
  try{
   await open('login');
   await page.locator('[data-meg-unified-screen="login"]').waitFor({state:'visible'});
   await page.getByRole('button',{name:'Entrar na demonstração sem autenticação'}).click();
   await page.locator('[data-meg-unified-screen="home"]').waitFor({state:'visible',timeout:12000});
   assert.ok(await page.locator('.pano-root').count()>0,'Home oficial indisponível');
   await page.screenshot({path:resolve(output,'home-'+width+'.png'),fullPage:false});
   const dueDialog=page.locator('.meg-due-alert-dialog');
   if(await dueDialog.isVisible())await dueDialog.getByRole('button',{name:'Entendi'}).click();
   if(width<640)await page.getByRole('button',{name:'Abrir menu'}).click();
   await page.getByRole('button',{name:'Lançamentos',exact:true}).first().click();
   await page.locator('[data-meg-unified-screen="launches"]').waitFor({state:'visible'});
   assert.ok(await page.locator('.meg-l09').count()>0,'Lançamentos indisponíveis');
   await page.screenshot({path:resolve(output,'lancamentos-'+width+'.png'),fullPage:false});
   await page.getByRole('button',{name:'Novo lançamento'}).first().click();
   await page.getByTestId('new-launch-types').waitFor({state:'visible'});
   await page.getByRole('button',{name:'Escolher Despesa'}).click();
   await page.locator('.meg-t10-expense[role="dialog"]').waitFor({state:'visible'});
   assert.equal(await page.getByRole('button',{name:'Salvar lançamento'}).first().isDisabled(),true,'Gravação habilitada na QA');
   // Contrato visual homologado da PR #678 deve chegar integralmente à QA unificada.
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.megPrismUi),'true','Prism ativo na QA integrada');
   const dateField=page.getByLabel('Data do lançamento *');
   await dateField.fill('30032026');
   assert.equal(await dateField.inputValue(),'30/03/2026','Máscara em tempo real DD/MM/AAAA');
   await dateField.fill('3003');
   await dateField.press('Tab');
   const year=await page.evaluate(()=>new Date().getFullYear());
   assert.equal(await dateField.inputValue(),'30/03/'+year,'Dia e mês + Tab completam ano');
   assert.equal(await page.locator('.meg-t10-expense-date-calendar > svg').count(),1,'Calendário apenas com ícone');
   const notes=page.getByRole('button',{name:/Observações/});
   const expectedExpanded=width>1024&&height>=760;
   assert.equal(await notes.getAttribute('aria-expanded'),expectedExpanded?'true':'false','Observações usam tamanho da tela, não modalidade');
   if(!expectedExpanded)await notes.click();
   await page.getByLabel('Observações (opcional)').fill('texto fictício');
   assert.equal(await page.getByLabel('Observações (opcional)').inputValue(),'TEXTO FICTÍCIO');
   await page.getByRole('button',{name:/Crédito/}).click();
   assert.equal(await page.getByLabel('Observações (opcional)').inputValue(),'TEXTO FICTÍCIO','Texto preservado entre modalidades');
   const panel=await page.locator('.meg-t10-expense-primary').evaluate(el=>({height:el.clientHeight,scrollHeight:el.scrollHeight}));
   assert.ok(panel.scrollHeight<=panel.height+2,'Dados não pode cortar Observações: '+JSON.stringify(panel));

   await page.screenshot({path:resolve(output,'nova-despesa-'+width+'.png'),fullPage:false});
   const dims=await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:document.documentElement.clientWidth}));
   assert.ok(dims.w<=dims.v+2,'Rolagem horizontal inesperada em '+width);
   await open('cadastro');
   await page.getByRole('form',{name:'Formulário de cadastro'}).waitFor({state:'visible'});
   await open('recuperar-senha');
   await page.locator('[data-meg-unified-screen="recover"]').waitFor({state:'visible'});
   await open('carregamento');
   await page.locator('[data-meg-unified-screen="loading-entry"]').waitFor({state:'visible'});
   await page.locator('[data-meg-unified-screen="login"]').waitFor({state:'visible',timeout:12000});
   assert.deepEqual(realApi,[],'QA atingiu API real');
   assert.deepEqual(errors,[],'Erro de JavaScript na QA');
   console.log('MEG_UNIFIED_PRISM '+width+'x'+height+' PASS');
  }finally{await page.close();}
 }
}finally{await browser.close();}
