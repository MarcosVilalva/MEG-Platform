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
 if(home==='home-p0'&&width===1366){
  await page.clock.install({time:new Date('2026-11-11T18:00:00.000Z')});
 }
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
   assert.ok(['Vence em','Descrição','Valor'].every((label,i)=>titles[i].includes(label)),
    'As colunas essenciais precisam preservar a ordem e seus rótulos');
   if(width>=1024){
    if(await compactTable.isVisible()){
     const viewport=commitments.locator('.meg-datagrid__viewport');
     const dimensions=await viewport.evaluate(element=>({
      available:element.clientWidth,scroll:element.scrollWidth,
      right:element.getBoundingClientRect().right,
      valueRight:element.querySelector('tbody tr td:last-child strong')?.getBoundingClientRect().right||0,
      tableWidth:element.querySelector('table')?.getBoundingClientRect().width||0,
     }));
     assert.ok(dimensions.scroll<=dimensions.available+2&&dimensions.valueRight<=dimensions.right+1,
       'Tabela compacta não pode esconder valor e vencimento: '+JSON.stringify(dimensions));
    }else{
     const cards=commitments.locator('.meg-datagrid-cards');
     assert.ok(await cards.isVisible(),'Painel estreito deve apresentar cards estruturais');
     assert.ok(await cards.getByText('Valor',{exact:true}).count()>0,
       'Valor precisa ser encontrado sem rolagem lateral');
     assert.ok(await cards.locator('.pano-due-date__urgency[aria-label="Vencido"]').count()>0,
       'Urgência precisa estar visível junto à data');
    }
   }
  }
  if(home==='home-p0'){
   const alert=page.getByRole('dialog',{name:'Atenção aos seus vencimentos'});
   await alert.waitFor({timeout:20000});
   const closeButton=alert.getByRole('button',{name:'Fechar alerta de vencimentos'});
   const closeVisual=await closeButton.evaluate(el=>({
    radius:getComputedStyle(el).borderRadius,
    width:el.getBoundingClientRect().width,
    height:el.getBoundingClientRect().height,
    svg:el.querySelectorAll('svg').length,
   }));
   const closeSurface=await closeButton.evaluate(el=>({
    border:getComputedStyle(el).borderTopWidth,background:getComputedStyle(el).backgroundColor
   }));
   assert.ok(closeSurface.border==='0px'&&closeSurface.background==='rgba(0, 0, 0, 0)',
    'Fechar sem moldura permanente, com superfície transparente: '+JSON.stringify(closeSurface));
   assert.ok(closeVisual.radius==='50%'&&closeVisual.width>=44&&closeVisual.height>=44&&closeVisual.svg===1,
    'Fechar precisa ser controle circular SVG com alvo adequado: '+JSON.stringify(closeVisual));
   assert.ok(await alert.locator('.meg-due-alert-item.is-overdue .meg-due-alert-item__symbol svg').count()>0,
    'Vencido precisa exibir sirene SVG');
   const modalGlyphs=await alert.locator('.meg-due-alert-item__symbol').evaluateAll(nodes=>nodes.map(el=>({
    color:getComputedStyle(el).color,
    svg:el.querySelector('svg')?.innerHTML??''
   })));
   assert.ok(modalGlyphs.some(x=>x.color==='rgb(239, 68, 68)'&&x.svg.includes('circle')),
    'Vencido tem SVG de alerta circular vermelho');
   assert.ok(modalGlyphs.some(x=>x.color==='rgb(245, 158, 11)'&&x.svg.includes('polyline')),
    'Vence hoje tem SVG de relógio circular âmbar');
   assert.ok(await alert.locator('.meg-due-alert-item.is-due-today .meg-due-alert-item__symbol svg').count()>0,
    'Vence hoje precisa exibir ícone amarelo SVG');
   assert.ok(await alert.getByText('Obrigação fictícia vencida').isVisible(),
    'Modal inicial deve mostrar vencido fictício');
   assert.ok(await alert.getByText('Obrigação fictícia que vence hoje').isVisible(),
    'Modal inicial deve mostrar obrigação de hoje');
   assert.ok((await alert.innerText()).includes('Outros compromissos podem existir'),
    'Não inventar que a janela contém todas as pendências');
   assert.equal(await page.locator('.pano-attention').count(),0,
    'Faixa fixa rejeitada deve desaparecer da Home');
   await alert.screenshot({
    path:'artifacts/meg-home-navigation-qa/'+home+'-'+width+'-alerta-modal.png',
    animations:'disabled'
   });
   await alert.getByRole('button',{name:'Entendi'}).click();
   const bell=page.getByRole('button',{name:'Notificações'});
   assert.equal(await bell.locator('.meg-notification-dot').count(),1,
    'Marcador do sino deve persistir após fechar o modal');
   await bell.click();
   const notifications=page.getByRole('region',{name:'Notificações financeiras'});
   await notifications.waitFor({timeout:10000});
   assert.ok(await notifications.getByText('Obrigação fictícia vencida').isVisible());
   await notifications.getByRole('button',{name:'Ver todos os compromissos'}).click();
   const full=page.getByRole('dialog',{name:'Todos os compromissos'});
   await full.waitFor({timeout:10000});
   assert.match(await full.locator('.pano-commitments-dialog__summary').innerText(),
    /8 compromissos carregados/,'O sino abre o modal integral com 8 registros fictícios');
   assert.equal(await full.getByRole('table',{name:'Todos os compromissos carregados',includeHidden:true})
    .locator('thead th').count(),5,'Lista integral mantém cinco colunas');
   await full.getByRole('button',{name:'Fechar lista de compromissos'}).click();
   if(width===1366){
    await page.clock.fastForward(3601000);
    const reminder=page.locator('.meg-due-reminder');
    await reminder.waitFor({timeout:15000});
    assert.ok(await reminder.getByText('Lembrete de vencimento').isVisible(),
     'Uma hora depois, lembrete discreto deve surgir sem reabrir modal');
    assert.equal(await page.getByRole('dialog',{name:'Atenção aos seus vencimentos'}).count(),0,
     'Lembrete de hora em hora não pode interromper com modal bloqueante');
    await reminder.getByRole('button',{name:'Dispensar lembrete'}).click();
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
  const contextControls=page.locator('.pano-finance-block .pano-icon-action');
  assert.ok(await contextControls.count()>=3,'Ações financeiras precisam usar SVG');
  const controls=await contextControls.evaluateAll(buttons=>buttons.map(b=>({
   svg:b.querySelectorAll('svg').length,
   text:b.textContent?.trim()??'',
   title:b.getAttribute('title'),
   aria:b.getAttribute('aria-label'),
   height:b.getBoundingClientRect().height,
  })));
  assert.ok(controls.every(c=>c.svg===1&&c.text===''&&c.title&&c.aria&&c.height>=44),
   'Ações visuais devem manter acessibilidade e alvo: '+JSON.stringify(controls));
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
 for(const width of [375,640,1024,1366]){
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
