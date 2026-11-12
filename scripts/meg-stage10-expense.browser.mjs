import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const root='artifacts/meg-stage10-expense-qa';
mkdirSync(root,{recursive:true});
const host=process.env.MEG_STAGE10_QA_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||(existsSync('/usr/bin/google-chrome')?'/usr/bin/google-chrome':undefined),args:['--no-sandbox']});
const results=[];
try{
 for(const [width,height] of [[390,844],[640,900],[768,1024],[1024,768],[1366,768],[1920,1080]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const writes=[];
  await page.route('**/*',route=>{
   const url=route.request().url(),method=route.request().method();
   if(!['GET','HEAD','OPTIONS'].includes(method))writes.push({url,method});
   if(url.startsWith(host)||url.startsWith('data:'))return route.continue();
   return route.abort();
  });
  await page.addInitScript(()=>sessionStorage.setItem('meg-due-entry-alert:qa-dismissed','1'));
  await page.goto(host+'/meg-stage10-expense-qa.html',{waitUntil:'domcontentloaded'});
  const alertClose=page.getByRole('button',{name:'Fechar alerta de vencimentos'});
  if(await alertClose.isVisible().catch(()=>false))await alertClose.click();
  await page.getByRole('button',{name:'Abrir Nova Despesa (QA)'}).click();
  const modal=page.getByRole('dialog',{name:'Novo lançamento'});
  await modal.waitFor();
  const main=await page.evaluate(()=>({
   overflowX:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
   overflowY:document.documentElement.scrollHeight>document.documentElement.clientHeight+1,
   bounds:document.querySelector('.meg-t10-expense')?.getBoundingClientRect().toJSON(),
   innerScrolling:document.querySelector('.meg-t10-expense')?.scrollHeight>document.querySelector('.meg-t10-expense')?.clientHeight+1,
  }));
  assert.equal(main.overflowX,false,'Sem rolagem horizontal');
  assert.equal(main.overflowY,false,'Sem rolagem vertical na página');
  assert.equal(main.innerScrolling,false,'Janela do formulário sem rolagem');
  assert.ok(main.bounds.x>=-1&&main.bounds.x+main.bounds.width<=width+1,'Janela cabe na largura');
  assert.equal(await modal.getByRole('button',{name:'Salvar lançamento'}).isDisabled(),true);
  if(width<1024)await modal.getByRole('button',{name:'Dados'}).click();
  await modal.getByLabel('Descrição *').fill('compra de pão e maçã');
  assert.equal(await modal.getByLabel('Descrição *').inputValue(),'COMPRA DE PÃO E MAÇÃ');
  await modal.getByLabel('Categoria *').selectOption('qa-category-food');
  assert.equal(await modal.getByLabel('Conta *').inputValue(),'qa-account-benefit');
  assert.equal(await modal.getByLabel('Forma de pagamento *').inputValue(),'qa-method-benefit');
  assert.equal(await modal.getByLabel('Conta *').isDisabled(),true);
  assert.equal(await modal.getByRole('button',{name:/Alimentação/}).count()>0,true);
  await modal.getByLabel('Categoria *').selectOption('qa-category-house');
  await modal.getByLabel('Forma de pagamento *').selectOption('qa-method-credit');
  if(width<1024)await modal.getByRole('button',{name:'Pagamento'}).click();
  await modal.getByLabel('Observações (opcional)',{exact:true}).count().then(async count=>{if(count===0)await modal.getByRole('button',{name:/Observações/}).click();});
  await modal.getByLabel('Observações (opcional)').fill('estorno cartão');
  assert.equal(await modal.getByLabel('Observações (opcional)').inputValue(),'ESTORNO CARTÃO');
  const money=modal.getByLabel('Valor *');
  await money.focus();
  for(const digit of '100')await page.keyboard.press(digit);
  assert.equal(await money.inputValue(),'1,00','Digitação 100 => 1,00');
  await modal.getByRole('button',{name:'Alternar sinal para estorno'}).click();
  assert.equal(await money.inputValue(),'-1,00','Sinal de estorno preservado');
  await money.focus();await page.keyboard.press('Backspace');
  assert.equal(await money.inputValue(),'-0,10','Backspace remove centavo mais recente');
  assert.equal(await modal.getByRole('button',{name:'Mostrar parcelamento'}).isVisible(),true);
  await modal.getByRole('button',{name:'Mostrar parcelamento'}).click();
  assert.equal(await modal.getByRole('dialog',{name:'Mostrar parcelamento'}).isVisible(),true);
  assert.equal(await modal.getByText('Nenhuma parcela ou data será estimada pela tela.',{exact:false}).count()>0,true);
  await modal.getByRole('button',{name:'Fechar parcelamento'}).click();
  await modal.getByLabel('Categoria *').selectOption('qa-category-shopping').catch(()=>{});
  if(width<1024)await modal.getByRole('button',{name:'Dados'}).click();
  await modal.getByRole('button',{name:'Mais categorias'}).click();
  assert.equal(await modal.getByRole('dialog',{name:'Todas as categorias'}).isVisible(),true);
  await modal.getByRole('button',{name:'Fechar categorias'}).click();
  if(width<1024)await modal.getByRole('button',{name:'Resumo'}).click();
  await page.screenshot({path:root+'/expense-refactor-'+width+'x'+height+'.png'});
  assert.deepEqual(writes,[],'Nenhuma requisição de mutação');
  results.push({width,height,zeroScroll:!main.overflowX&&!main.overflowY&&!main.innerScrolling,amountNegative:true,scheduleModal:true,writes:writes.length});
  await modal.getByRole('button',{name:'Fechar formulário'}).click();
  assert.equal(await page.getByRole('dialog',{name:'Novo lançamento'}).count(),0);
  await page.close();
 }
 writeFileSync(root+'/report.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
