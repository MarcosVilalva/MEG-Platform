/** QA isolado dos modais Novo/Editar: sem API e sem dados reais. */
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve('artifacts/meg-stage10-visual');
mkdirSync(root,{recursive:true});
const browser=await chromium.launch({
 headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
 args:['--no-sandbox']
});
const results=[];
const base='http://127.0.0.1:4173/fluxo-integrado-08.html';
try{
 for(const [width,height] of [[320,740],[360,780],[390,844],[640,850],[768,850],[1024,768],[1366,768],[1920,1080],[2560,1440]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  let writes=0;
  await page.route('**/*',route=>{
   if(!['GET','HEAD'].includes(route.request().method()))writes++;
   return route.continue();
  });
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?tela=novo-despesa',{waitUntil:'networkidle'});
  await page.getByRole('dialog',{name:'Novo lançamento'}).waitFor();
  const body=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,kind:document.querySelector('[data-testid="stage10-visual-only"]')!==null}));
  assert.ok(body.kind,'Modal ausente em '+width);
  assert.ok(body.width<=body.viewport+2,'Rolagem horizontal em '+width+': '+JSON.stringify(body));
  await page.screenshot({path:resolve(root,'novo-'+width+'.png'),fullPage:true});
  await page.locator('#stage10-value').fill('83,40');
  await page.locator('#stage10-date').fill('2026-11-05');
  await page.locator('#stage10-description-field').fill('Conta de');
  await page.getByRole('option',{name:/Conta de energia/}).first().click();
  assert.equal(await page.locator('#stage10-value').inputValue(),'83,40','Autocomplete copiou valor');
  assert.equal(await page.locator('#stage10-date').inputValue(),'2026-11-05','Autocomplete copiou data');
  assert.equal(await page.locator('#stage10-category').inputValue(),'qa-home','Autocomplete não preencheu categoria');
  await page.locator('#stage10-category').selectOption('qa-food');
  assert.equal(await page.locator('#stage10-account').inputValue(),'qa-benefit');
  assert.equal(await page.locator('#stage10-method').inputValue(),'qa-verocard');
  assert.equal(await page.locator('#stage10-account').isDisabled(),true);
  assert.equal(await page.locator('#stage10-method').isDisabled(),true);
  await page.screenshot({path:resolve(root,'alimentacao-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Salvar lançamento'}).click();
  await page.getByText('Nenhum lançamento foi gravado, alterado ou excluído.').waitFor();
  assert.equal(writes,0,'Prévia tentou gravar dados');
  assert.deepEqual(errors,[],'Erros JS em '+width);
  results.push({width,height,scrollWidth:body.width,writes,jsErrors:errors.length});
  await page.close();
 }
 for(const width of [390,1366]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.goto(base+'?tela=editar-lancamento',{waitUntil:'networkidle'});
  await page.getByRole('dialog',{name:'Editar lançamento'}).waitFor();
  assert.equal(await page.locator('#stage10-category').inputValue(),'qa-home');
  assert.equal(await page.locator('#stage10-account').inputValue(),'qa-current');
  assert.equal(await page.locator('#stage10-method').inputValue(),'qa-pix');
  assert.ok(await page.getByRole('button',{name:'Excluir lançamento'}).isDisabled());
  await page.screenshot({path:resolve(root,'editar-'+width+'.png'),fullPage:true});
  await page.close();
 }
 writeFileSync(resolve(root,'result.json'),JSON.stringify(results,null,2));
 console.log('Etapa 10: 9 larguras, autocomplete sem valor/data, Alimentação bloqueada, Editar, zero writes: OK.');
}finally{await browser.close();}
