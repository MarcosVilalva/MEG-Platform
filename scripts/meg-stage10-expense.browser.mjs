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
  if(width<=1024)await modal.getByRole('button',{name:'Dados'}).click();
  async function captureStep(step){
   const geometry=await page.evaluate(()=>{
    const sections=Array.from(document.querySelectorAll('.meg-t10-expense-panel')).filter(e=>getComputedStyle(e).display!=='none');
    return sections.map(e=>({scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}));
   });
   for(const panel of geometry){
    assert.ok(panel.scrollHeight<=panel.clientHeight+2,step+' '+width+'x'+height+' sem conteúdo cortado na vertical: '+JSON.stringify(panel));
    assert.ok(panel.scrollWidth<=panel.clientWidth+2,step+' sem conteúdo cortado na horizontal: '+JSON.stringify(panel));
   }
   await page.screenshot({path:root+'/expense-'+step+'-'+width+'x'+height+'.png'});
  }
  await captureStep('dados');
  // Dia e mês + Tab completam ano local; ano explícito não é substituído.
  const dateField=modal.getByLabel('Data do lançamento *');
  await dateField.fill('30/03');
  await dateField.press('Tab');
  const currentYear=await page.evaluate(()=>new Date().getFullYear());
  assert.equal(await dateField.inputValue(),'30/03/'+currentYear);
  await dateField.fill('15/08/2024');
  await dateField.press('Tab');
  assert.equal(await dateField.inputValue(),'15/08/2024');
  await dateField.fill('31/02');
  await dateField.press('Tab');
  assert.equal(await dateField.getAttribute('aria-invalid'),'true','Data inexistente não é aceita');
  await dateField.fill('29/02/2024');
  await dateField.press('Tab');
  assert.equal(await dateField.getAttribute('aria-invalid'),'false','Ano bissexto válido');
  await dateField.fill('30/03');
  await dateField.press('Tab');
  assert.equal(await dateField.inputValue(),'30/03/'+currentYear);
  await modal.getByLabel('Descrição *').fill('compra de pão e maçã');
  assert.equal(await modal.getByLabel('Descrição *').inputValue(),'COMPRA DE PÃO E MAÇÃ');
  const method=modal.getByLabel('Forma de pagamento *');
  const options=()=>method.locator('option').allTextContents();
  assert.equal(await modal.getByRole('button',{name:/À vista/}).getAttribute('aria-pressed'),'true');
  assert.ok((await options()).some(x=>x.includes('PIX')));
  assert.ok(!(await options()).some(x=>x.includes('Crédito')));
  assert.equal(await modal.getByText('Conta benefício').count(),0);
  await modal.getByLabel('Categoria *').selectOption('qa-category-food');
  await method.selectOption('qa-method-pix');
  if(width<=1024)await modal.getByRole('button',{name:'Pagamento'}).click();
  const paidButton=modal.locator('.meg-t10-expense-status button').nth(0);
  const plannedButton=modal.locator('.meg-t10-expense-status button').nth(1);
  assert.equal(await paidButton.getAttribute('aria-pressed'),'true');
  assert.equal(await plannedButton.isDisabled(),false);
  assert.equal(await modal.getByLabel('Conta de saída do recurso *').inputValue(),'qa-account-money','Conta única preenchida automaticamente em Paga');
  await plannedButton.click();
  assert.equal(await plannedButton.getAttribute('aria-pressed'),'true');
  assert.equal(await modal.getByLabel('Conta de saída do recurso *').count(),0,'Pendente não exibe conta');
  await paidButton.click();
  assert.equal(await modal.getByLabel('Conta de saída do recurso *').inputValue(),'qa-account-money','Retornar a Paga repõe conta única');
  if(width<=1024)await modal.getByRole('button',{name:'Dados'}).click();
  await modal.getByRole('button',{name:/Crédito/}).click();
  assert.equal(await modal.getByLabel('Forma de pagamento *').count(),0,'Crédito não exibe meio de pagamento');
  if(width<=1024)await modal.getByRole('button',{name:'Pagamento'}).click();
  assert.equal(await plannedButton.getAttribute('aria-pressed'),'true');
  assert.equal(await paidButton.isDisabled(),true);
  assert.equal(await plannedButton.isDisabled(),true);
  assert.equal(await modal.getByLabel('Conta de saída do recurso *').count(),0,'Crédito não exibe conta');
  await modal.getByLabel('Cartão',{exact:true}).selectOption('qa-creditcard-1');
  assert.equal(await modal.getByLabel('Identificação do cartão selecionado').isVisible(),true);
  assert.ok(await modal.getByText('•••• 4587').count()>0);
  assert.ok(await modal.getByText('Fechamento: dia 25').count()>0);
  assert.ok(await modal.getByText('Vencimento: dia 5').count()>0);
  await modal.getByLabel('Cartão',{exact:true}).selectOption('qa-creditcard-2');
  assert.ok(await modal.getByText('Fechamento: dia 12').count()>0);
  assert.ok(await modal.getByText('Vencimento: dia 20').count()>0);
  if(width<=1024)await modal.getByRole('button',{name:'Pagamento'}).click();
  await captureStep('pagamento');
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
  if(width<=1024)await modal.getByRole('button',{name:'Dados'}).click();
  await modal.getByRole('button',{name:'Mais categorias'}).click();
  assert.equal(await modal.getByRole('dialog',{name:'Todas as categorias'}).isVisible(),true);
  await modal.getByRole('button',{name:'Fechar categorias'}).click();
  if(width<=1024)await modal.getByRole('button',{name:'Resumo'}).click();
  await captureStep('resumo');
  assert.deepEqual(writes,[],'Nenhuma requisição de mutação');
  results.push({width,height,zeroScroll:!main.overflowX&&!main.overflowY&&!main.innerScrolling,amountNegative:true,scheduleModal:true,writes:writes.length});
  await modal.getByRole('button',{name:'Fechar formulário'}).click();
  assert.equal(await page.getByRole('dialog',{name:'Novo lançamento'}).count(),0);
  await page.close();
 }
 // Caracterização adicional: nenhuma conta e múltiplas contas jamais são escolhidas por suposição.
 for(const [query,expectedCount] of [['0',0],['2',2]]){
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  await page.goto(host+'/meg-stage10-expense-qa.html?accounts='+query,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Abrir Nova Despesa (QA)'}).click();
  const modal=page.getByRole('dialog',{name:'Novo lançamento'});
  const account=modal.getByLabel('Conta de saída do recurso *');
  assert.equal(await account.isVisible(),true,'Paga exige conta em ambas configurações');
  assert.equal(await account.locator('option').count(),expectedCount+1);
  assert.equal(await account.inputValue(),'','Não selecionar conta quando há '+expectedCount+' contas');
  if(query==='2'){
   await account.selectOption('qa-account-money-second');
   assert.equal(await account.inputValue(),'qa-account-money-second','Usuário escolhe segunda conta');
  }else{
   assert.ok(await modal.getByText('Nenhuma conta monetária ativa disponível.').isVisible());
  }
  await modal.locator('.meg-t10-expense-status button').nth(1).click();
  assert.equal(await account.count(),0,'Pendente dispensa conta');
  await modal.locator('.meg-t10-expense-status button').nth(0).click();
  assert.equal(await account.inputValue(),'','Ao rebaixar para Paga com múltiplas contas, requer escolha novamente');
  await page.close();
 }
 writeFileSync(root+'/report.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
