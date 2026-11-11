import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const base=process.env.MEG_PREVIEW_URL||'http://127.0.0.1:4176';
assert.match(base,/^http:\/\/127\.0\.0\.1:\d+$/,'QA de navegação só pode apontar para localhost');
const browser=await chromium.launch({
 headless:true,
 executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
 args:['--no-sandbox'],
});
const results=[];
await mkdir('artifacts/meg-home-navigation-qa',{recursive:true});

async function runCase({width,home,expectedPeriod,expectedCommitment}){
 const height=width<640?812:900;
 const context=await browser.newContext({
  viewport:{width,height},reducedMotion:'reduce',locale:'pt-BR',
 });
 const page=await context.newPage();
 const errors=[],financialRequests=[];
 page.on('pageerror',err=>errors.push(String(err)));
 page.on('request',request=>{
  const path=new URL(request.url()).pathname;
  if(/^\/(finance|auth|cards|payables)\//.test(path))financialRequests.push(path);
 });
 const entry=base+'/fluxo-integrado-08.html?tela='+home+'&v=qa-navigation';
 const expectedView=home;
 try{
  await page.goto(entry,{waitUntil:'networkidle'});
  const period=page.locator('.meg-period');
  const commitments=page.locator('.pano-grid--commitments');
  await commitments.getByText(expectedCommitment,{exact:false}).filter({visible:true}).first().waitFor({timeout:20000});
  if(home==='home-p0'){
   const compactTable=commitments.getByRole('table',{name:'Próximos compromissos',includeHidden:true});
   const titles=await compactTable.locator('thead th').allTextContents();
   assert.equal(titles.length,3,'Resumo visual precisa ter 3 colunas: '+JSON.stringify(titles));
   assert.ok(['Vencimento','Descrição','Valor'].every((label,i)=>titles[i].includes(label)),
    'As colunas essenciais precisam preservar a ordem e seus rótulos');
   if(width>=1024){
    const viewport=commitments.locator('.meg-datagrid__viewport');
    const dimensions=await viewport.evaluate(element=>({
     available:element.clientWidth,scroll:element.scrollWidth,
     right:element.getBoundingClientRect().right,
     valueRight:element.querySelector('tbody tr td:last-child strong')?.getBoundingClientRect().right||0,
     tableWidth:element.querySelector('table')?.getBoundingClientRect().width||0,
     tableMinWidth:element.querySelector('table')?.style.minWidth||'',
     tableComputedWidth:element.querySelector('table')?getComputedStyle(element.querySelector('table')).width:'',
     colWidths:[...element.querySelectorAll('table col')].map(col=>col.getBoundingClientRect().width),
     thWidths:[...element.querySelectorAll('table thead th')].map(th=>th.getBoundingClientRect().width),
    }));
    assert.ok(dimensions.scroll<=dimensions.available+2&&dimensions.valueRight<=dimensions.right+1,
      'Tabela compacta não pode esconder valor e vencimento: '+JSON.stringify(dimensions));
   }
  }
  assert.match(await period.innerText(),new RegExp(expectedPeriod),'Período inicial incorreto');
  assert.equal(await page.locator('.meg-integrated-preview').getAttribute('data-preview-view'),
   expectedView,'Versão inicial da Home incorreta');
  const originalCount=await commitments.locator('.meg-datagrid-table tbody tr:not(.meg-datagrid-group-row)').count();
  const initialGridText=await commitments.locator('.meg-datagrid').innerText();
  const newButton=page.locator('.meg-topbar-new');
  assert.ok(await newButton.isVisible(),'Ação de novo lançamento indisponível');
  // Abrir e voltar pelo botão da esquerda.
  await newButton.click();
  const dialog=page.getByRole('dialog',{name:'Novo lançamento'});
  await dialog.waitFor({timeout:10000});
  assert.equal(await page.locator('.meg-integrated-preview').getAttribute('data-preview-view'),
   'new-launch','Modal não abriu');
  assert.match(await period.innerText(),new RegExp(expectedPeriod),
   'O mês mudou atrás do modal antes de fechar');
  assert.ok(await commitments.getByText(expectedCommitment,{exact:false}).filter({visible:true}).first().count()>0,
   'Os lançamentos mudaram atrás do modal');
  assert.equal(await commitments.locator('.meg-datagrid-table tbody tr:not(.meg-datagrid-group-row)').count(),
   originalCount,'A estrutura mudou atrás do modal');
  await dialog.getByRole('button',{name:'Voltar à Home'}).click();
  assert.equal(await page.locator('.meg-integrated-preview').getAttribute('data-preview-view'),
   expectedView,'Voltar perdeu a versão da Home de origem');
  assert.match(await period.innerText(),new RegExp(expectedPeriod),
   'Voltar alterou o período da Home');
  assert.ok(await commitments.getByText(expectedCommitment,{exact:false}).filter({visible:true}).first().isVisible(),
   'Voltar perdeu o registro original');
  // Segunda entrada, fechamento no X.
  await newButton.click();
  await dialog.getByRole('button',{name:'Fechar novo lançamento'}).click();
  assert.equal(await page.locator('.meg-integrated-preview').getAttribute('data-preview-view'),
   expectedView,'Fechar perdeu a versão da Home de origem');
  assert.match(await period.innerText(),new RegExp(expectedPeriod),
   'Fechar alterou o período da Home');
  assert.equal(await commitments.locator('.meg-datagrid').innerText(),initialGridText,
   'Fechar alterou os dados fictícios mostrados na Home');
  assert.equal(await page.getByRole('dialog',{name:'Novo lançamento'}).count(),0,
   'Modal de Novo lançamento continuou aberto');
  if(home==='home-p0'){
   assert.equal(await page.getByText('QA visual P0 · Dados fictícios · Sem conexão com API').count(),1,
    'Prévia P0 perdeu sua identificação');
   await page.getByRole('button',{name:'Ver todos os compromissos'}).click();
   const full=page.getByRole('dialog',{name:'Todos os compromissos'});
   await full.waitFor({timeout:10000});
   assert.match(await full.locator('.pano-commitments-dialog__summary').innerText(),
    /8 compromissos carregados/,'Modal de compromissos perdeu os 8 itens fictícios');
   const fullTable=full.getByRole('table',{name:'Todos os compromissos carregados',includeHidden:true});
   assert.equal(await fullTable.locator('thead th').count(),5,
    'O modal deve preservar as 5 colunas canônicas da consulta integral');
   await full.getByRole('button',{name:'Fechar lista de compromissos'}).click();
  }
  const dimensions=await page.evaluate(()=>({
   scroll:document.documentElement.scrollWidth,
   inner:window.innerWidth,
  }));
  assert.ok(dimensions.scroll<=dimensions.inner+2,
   'A página criou scroll horizontal: '+JSON.stringify(dimensions));
  assert.deepEqual(financialRequests,[],'Prévia visual não pode chamar API financeira');
  assert.deepEqual(errors,[],'Erro de execução JS no browser');
  await page.screenshot({
   path:'artifacts/meg-home-navigation-qa/'+home+'-'+width+'-apos-voltar.png',
   fullPage:true,animations:'disabled',
  });
  results.push({home,width,returnBack:'PASS',returnClose:'PASS',samePeriod:true,
   sameFixture:true,noApi:true,noHorizontalOverflow:true});
 }finally{
  await context.close();
 }
}

try{
 for(const width of [375,1366]){
  await runCase({width,home:'home-p0',expectedPeriod:'Novembro de 2026',
   expectedCommitment:'Obrigação fictícia vencida'});
  await runCase({width,home:'home',expectedPeriod:'Outubro de 2026',
   expectedCommitment:'Condomínio'});
 }
 console.log(JSON.stringify({test:'MEG Home preview: preserve navigation context',result:'PASS',results}));
}catch(e){
 console.error('MEG_HOME_PREVIEW_NAVIGATION_FAILED',e);
 process.exitCode=1;
}finally{
 await browser.close();
}
