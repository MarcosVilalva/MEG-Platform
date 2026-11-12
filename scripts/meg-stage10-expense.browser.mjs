import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const root='artifacts/meg-stage10-expense-qa';
mkdirSync(root,{recursive:true});
const host=process.env.MEG_STAGE10_QA_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||(existsSync('/usr/bin/google-chrome')?'/usr/bin/google-chrome':undefined),args:['--no-sandbox']});
const reports=[];
try{
 for(const [width,height] of [[390,844],[768,1024],[1366,768],[1920,1080]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const writes=[];
  await page.route('**/*',route=>{
   const url=route.request().url(),method=route.request().method();
   if(!['GET','HEAD','OPTIONS'].includes(method))writes.push({url,method});
   if(url.startsWith(host)||url.startsWith('data:'))return route.continue();
   return route.abort();
  });
  await page.addInitScript(()=>{
   const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
   const get=k=>parts.find(x=>x.type===k)?.value||'00';
   sessionStorage.setItem('meg-due-entry-alert:qa-preview:'+get('year')+get('month')+get('day'),'1');
  });
  await page.goto(host+'/meg-stage10-expense-qa.html',{waitUntil:'domcontentloaded'});
  const alertClose=page.getByRole('button',{name:'Fechar alerta de vencimentos'});
  if(await alertClose.isVisible().catch(()=>false))await alertClose.click();
  await page.getByRole('button',{name:'Abrir Nova Despesa (QA)'}).click();
  await page.getByRole('dialog',{name:'Novo lançamento'}).waitFor();
  const overflow=await page.evaluate(()=>({
   document:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
   modal:document.querySelector('.meg-t10-expense')?.getBoundingClientRect().toJSON(),
  }));
  assert.equal(overflow.document,false,'Sem rolagem horizontal global');
  assert.ok(overflow.modal?.x>=-1&&overflow.modal.x+overflow.modal.width<=width+1,'Modal dentro da largura do viewport');
  assert.equal(await page.getByRole('button',{name:/Salvar lançamento/}).isDisabled(),true,'Salvar fica desabilitado');
  await page.getByLabel('Descrição *').fill('Mercado fictício para teste');
  assert.equal(await page.getByLabel('Descrição *').inputValue(),'MERCADO FICTÍCIO PARA TESTE','Entrada em caixa alta');
  await page.getByLabel('Observações (opcional)').fill('pão e maçã');
  assert.equal(await page.getByLabel('Observações (opcional)').inputValue(),'PÃO E MAÇÃ','Acentos preservados na caixa alta');
  assert.equal(await page.getByRole('group',{name:'Classificação da conta *'}).count(),1,'Classificação própria, distinta do tipo');
  assert.equal(await page.getByRole('group',{name:'Tipo de conta *'}).count(),1,'Tipo próprio, distinto da classificação');
  await page.getByLabel('Categoria *').selectOption('qa-category-food');
  assert.equal(await page.getByLabel('Conta *').inputValue(),'qa-account-benefit','Conta Benefício automática');
  assert.equal(await page.getByLabel('Forma de pagamento *').inputValue(),'qa-method-benefit','Verocard automático');
  assert.equal(await page.getByLabel('Conta *').isDisabled(),true,'Conta benefício travada');
  assert.equal(await page.getByLabel('Forma de pagamento *').isDisabled(),true,'Forma benefício travada');
  await page.screenshot({path:root+'/expense-'+width+'x'+height+'.png',fullPage:true});
  await page.getByLabel('Categoria *').selectOption('qa-category-house');
  await page.getByLabel('Forma de pagamento *').selectOption('qa-method-credit');
  assert.equal(await page.getByRole('dialog',{name:'Novo lançamento'}).getByLabel('Cartão',{exact:true}).isVisible(),true,'Cartão aparece só na forma crédito');
  assert.equal(await page.getByLabel('Número de parcelas').isVisible(),true,'Parcelas condicionais');
  assert.equal(await page.getByRole('button',{name:/Salvar lançamento/}).isDisabled(),true);
  assert.deepEqual(writes,[],'Nenhum POST/PATCH/DELETE no QA');
  reports.push({width,height,overflowX:overflow.document,saveDisabled:true,benefitLocked:true,creditConditional:true,writes:writes.length});
  await page.getByRole('button',{name:'Fechar formulário'}).click();
  assert.equal(await page.getByRole('dialog',{name:'Novo lançamento'}).count(),0,'Fecha corretamente');
  await page.close();
 }
 writeFileSync(root+'/report.json',JSON.stringify(reports,null,2));
}finally{await browser.close();}
