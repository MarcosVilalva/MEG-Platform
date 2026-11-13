import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const base=process.env.MEG_STAGE08_UNIFIED_QA_URL||'http://127.0.0.1:4175';
const output=resolve('artifacts/meg-unified-prism');
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 for(const [width,height] of [[390,844],[640,900],[960,900],[1024,768],[1366,768]]){
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
   const picker=page.getByTestId('new-launch-types');
   await picker.waitFor({state:'visible'});
   assert.equal(await picker.locator('.meg-choice__option').count(),4,'Quatro cards fotográficos originais preservados');
   assert.equal(await picker.locator('.meg-choice__hero-photo').count(),1,'Hero original preservado');
   assert.equal(await picker.getByRole('heading',{name:/Mais controle/}).count(),1,'Texto editorial original preservado');
   assert.equal(await picker.locator('.meg-choice__feature').count(),3,'Três células inferiores preservadas');
   for(const [index,text] of ['01 · Escolha','02 · Preencha','03 · Confira'].entries()){
    assert.match(await picker.locator('.meg-choice__feature').nth(index).innerText(),new RegExp(text),'Etapas funcionais do lançamento');
   }
   assert.doesNotMatch(await picker.locator('.meg-choice__footer').innerText(),/Dimensionamento automático|Tipografia ampliada|Responsivo para Web/,'Remover anúncios de CSS do rodapé');
   assert.equal(await picker.locator('.meg-choice__option-photo').count(),4,'Quatro imagens por modalidade preservadas');
   assert.equal(await picker.locator('.meg-choice__option-next svg[data-meg-prism="icon-2"]').count(),4,'Ações com SVG Prism');
   assert.equal(await picker.locator('.meg-choice__feature-icon svg[data-meg-prism="icon-2"]').count(),3,'Rodapé com SVG Prism');
   assert.ok(await picker.locator('.meg-choice__tag-icon[data-meg-prism="icon-2"]').count()>=8,'Ícones semânticos nos chips');
   assert.equal(await page.locator('.meg-new-launch__close svg[data-meg-prism="icon-2"]').count(),1,'Fechar com SVG Prism');
   // Conjunto fotográfico original MEG Prism: quatro WebP reais, sem marcas
   // e sem a borda duplicada da arte antiga. Nenhum CSS homologado é editado.
   const cardAssets=[
    {kind:'expense',filename:'expense.webp',width:1672,height:230,bytes:38188},
    {kind:'income',filename:'income.webp',width:1672,height:227,bytes:29938},
    {kind:'transfer',filename:'transfer.webp',width:1672,height:230,bytes:35584},
    {kind:'benefit',filename:'benefit.webp',width:1672,height:244,bytes:41882},
   ];
   for(const art of cardAssets){
    const card=picker.locator('.meg-choice__option.is-'+art.kind);
    const img=card.locator('.meg-choice__option-photo');
    const cssUrl=await img.evaluate(el=>getComputedStyle(el).backgroundImage);
    const assetPath='/meg-assets/prism-cinematic-20261113/'+art.filename;
    assert.ok(cssUrl.includes(assetPath),'Imagem MEG Prism ausente em '+art.kind+': '+cssUrl);
    const box=await card.evaluate(el=>{
     const child=el.querySelector('.meg-choice__option-photo');
     const outer=el.getBoundingClientRect(),inner=child.getBoundingClientRect();
     const clip=getComputedStyle(el);
     return {cut:clip.overflowX==='hidden'&&clip.overflowY==='hidden',
      delta:[inner.left-outer.left,outer.right-inner.right,inner.top-outer.top,outer.bottom-inner.bottom],
      radius:clip.borderRadius};
    });
    assert.ok(box.cut&&box.delta.every(n=>n>=-2&&n<=3),
     'Arte deve estar DENTRO do contorno original: '+art.kind+' '+width+' '+JSON.stringify(box));
    if(width===390){
     const response=await page.request.get(base+assetPath);
     assert.equal(response.status(),200,'Imagem publicada acessível: '+art.kind);
     const buffer=await response.body();
     assert.equal(buffer.length,art.bytes,'Imagem aprovada deve manter bytes originais: '+art.kind);
     assert.equal(buffer.subarray(0,4).toString('ascii'),'RIFF','Header RIFF: '+art.kind);
     assert.equal(buffer.subarray(8,12).toString('ascii'),'WEBP','WebP válido: '+art.kind);
     assert.equal(buffer.readUInt16LE(26)&0x3fff,art.width,'Largura alta definição: '+art.kind);
     assert.equal(buffer.readUInt16LE(28)&0x3fff,art.height,'Altura esperada: '+art.kind);
    }
   }

   assert.equal(await picker.getByRole('button',{name:'Transferência indisponível'}).isDisabled(),true);
   assert.equal(await picker.getByRole('button',{name:'Benefício indisponível'}).isDisabled(),true);
   assert.equal(await picker.getByRole('button',{name:'Escolher Despesa'}).isEnabled(),true);
   assert.equal(await picker.getByRole('button',{name:'Escolher Receita'}).isEnabled(),true);
   const choiceBounds=await picker.evaluate(el=>{
    const cards=Array.from(el.querySelectorAll('.meg-choice__option')).map(c=>c.getBoundingClientRect());
    const rect=el.getBoundingClientRect();
    return {horizontal:el.scrollWidth>el.clientWidth+2,vertical:el.scrollHeight>el.clientHeight+2,
     rect:{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right},
     cards:cards.map(r=>({top:r.top,bottom:r.bottom,left:r.left,right:r.right}))};
   });
   assert.equal(choiceBounds.horizontal,false,'Seletor original com ícones Prism sem corte horizontal '+width);
   assert.equal(choiceBounds.vertical,false,'Seletor original com ícones Prism sem corte vertical '+width);
   assert.ok(choiceBounds.cards.every(c=>c.left>=choiceBounds.rect.left-2&&c.right<=choiceBounds.rect.right+2&&c.top>=choiceBounds.rect.top-2&&c.bottom<=choiceBounds.rect.bottom+2),'Cards inteiros visíveis '+width+': '+JSON.stringify(choiceBounds));
   await page.screenshot({path:resolve(output,'seletor-fotografico-prism-icons-'+width+'.png'),fullPage:false});
   await picker.getByRole('button',{name:'Escolher Despesa'}).click();
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
   await page.locator('.meg-t10-expense').getByRole('button',{name:'Crédito',exact:true}).click();
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
   // Atalho somente QA para inspeção direta da escolha, sem atravessar autenticação fictícia.
   await page.goto(base+'/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=novo',{waitUntil:'domcontentloaded'});
   await page.getByTestId('new-launch-types').waitFor({state:'visible'});
   assert.equal(await page.getByRole('dialog',{name:'Novo lançamento'}).count(),1,'Acesso direto ao modal Prism');

   // Etapa 10, Editar Despesa: rota isolada, dados fictícios e nenhum writer.
   await page.goto(base+'/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=editar',{waitUntil:'domcontentloaded'});
   const edit=page.getByTestId('stage10-edit-preview');
   await edit.waitFor({state:'visible'});
   assert.equal(await edit.getByRole('heading',{name:'Editar lançamento'}).count(),1);
   assert.equal(await edit.getByRole('button',{name:'Salvar alterações'}).isDisabled(),true,'Editar QA nunca grava');
   assert.equal(await edit.getByLabel('Valor original').isDisabled(),true,'Valor bloqueado até writer seguro');
   assert.equal(await edit.getByLabel('Categoria original').isDisabled(),true,'Categoria bloqueada até contrato');
   assert.equal(await edit.getByLabel('Data original').isDisabled(),true,'Data bloqueada até contrato');
   assert.equal(await edit.getByLabel('Conta original').isDisabled(),true,'Conta de origem bloqueada');
   assert.equal(await edit.getByLabel('Forma de pagamento original').isDisabled(),true,'Método bloqueado');
   assert.equal(await edit.getByLabel('Descrição da edição').inputValue(),'COMPRA DE MATERIAL PARA CASA');
   await edit.getByLabel('Descrição da edição').fill('observação de teste');
   assert.equal(await edit.getByLabel('Descrição da edição').inputValue(),'OBSERVAÇÃO DE TESTE','Descrição em maiúsculas');
   const editNotes=edit.getByRole('button',{name:/Observações/});
   assert.equal(await editNotes.getAttribute('aria-expanded'),expectedExpanded?'true':'false','Observações iniciam segundo tamanho da tela');
   if(!expectedExpanded)await editNotes.click();
   await edit.getByLabel('Observações da edição').fill('ajuste fictício');
   assert.equal(await edit.getByLabel('Observações da edição').inputValue(),'AJUSTE FICTÍCIO');
   if(width<=1024)await edit.getByRole('button',{name:'Resumo',exact:true}).click();
   assert.match(await edit.getByLabel('Resumo da edição').innerText(),/OBSERVAÇÃO DE TESTE/);
   const visibleOverflow=await edit.evaluate(el=>Array.from(el.querySelectorAll('.meg-t10-expense-panel'))
    .filter(p=>getComputedStyle(p).display!=='none')
    .map(p=>({label:p.getAttribute('aria-label'),excess:p.scrollHeight-p.clientHeight})));
   assert.ok(visibleOverflow.every(x=>x.excess<=2),'Editar sem conteúdo cortado '+width+': '+JSON.stringify(visibleOverflow));
   await page.screenshot({path:resolve(output,'editar-despesa-qa-'+width+'.png'),fullPage:false});
   await edit.getByRole('button',{name:'Fechar edição'}).click();
   assert.equal(await page.getByTestId('stage10-edit-preview').count(),0);

   assert.deepEqual(realApi,[],'QA atingiu API real');
   assert.deepEqual(errors,[],'Erro de JavaScript na QA');
   console.log('MEG_UNIFIED_PRISM '+width+'x'+height+' PASS');
  }finally{await page.close();}
 }

 // QA focada na correção de paisagem do Poco C75 e preservação do layout amplo.
 // O conjunto completo das cinco resoluções acima permanece intocado.
 for(const [width,height,compact] of [
  [820,360,true],      // Poco C75: 1640 x 720 pixels físicos, viewport CSS ~820 x 360
  [1024,450,true],     // captura horizontal enviada pelo usuário, perfil aproximado
  [1366,768,false],    // notebooks 15,6 polegadas
  [1920,1080,false],   // monitor wide 23 polegadas
  [1920,1200,false],   // notebook 16 polegadas 16:10
 ]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const pageErrors=[];
  page.on('pageerror',err=>pageErrors.push(String(err)));
  try{
   await page.goto(base+'/meg-unificado-qa.html?visual=prism&tela=lancamentos&modal=novo',
    {waitUntil:'domcontentloaded'});
   const dialog=page.getByRole('dialog',{name:'Novo lançamento'});
   const picker=page.getByTestId('new-launch-types');
   await picker.waitFor({state:'visible'});
   const facts=await dialog.evaluate(element=>{
    const photoCards=Array.from(element.querySelectorAll('.meg-choice__option')).map(card=>{
      const rect=card.getBoundingClientRect();
      const text=card.querySelector('.meg-choice__option-text')?.getBoundingClientRect();
      return {top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right,height:rect.height,
       textBottom:text?.bottom??0, textTop:text?.top??0};
    });
    const footer=element.querySelector('.meg-choice__footer').getBoundingClientRect();
    const host=element.getBoundingClientRect();
    const computed=getComputedStyle(element);
    const header=element.querySelector('.meg-new-launch__header');
    const headerBox=header.getBoundingClientRect();
    const scrollBody=element.querySelector('.meg-choice--photo');
    const scrollBox=scrollBody.getBoundingClientRect();
    return {hostTop:host.top,hostBottom:host.bottom,hostWidth:host.width,
     clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,
     clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,
     overflowY:computed.overflowY,photoCards,footerTop:footer.top,footerBottom:footer.bottom,
     headerTop:headerBox.top,headerBottom:headerBox.bottom,
     headerPosition:getComputedStyle(header).position,
     headerBackground:getComputedStyle(header).backgroundColor,
     scrollBodyTop:scrollBox.top,scrollBodyClientHeight:scrollBody.clientHeight,
     scrollBodyScrollHeight:scrollBody.scrollHeight,
     scrollBodyOverflowY:getComputedStyle(scrollBody).overflowY,
     documentWidth:document.documentElement.scrollWidth,
     documentViewportWidth:document.documentElement.clientWidth};
   });
   assert.equal(facts.photoCards.length,4,'Quatro cards preservados '+width+'x'+height);
   assert.ok(facts.scrollWidth<=facts.clientWidth+2,'Sem rolagem lateral da janela '+width+'x'+height);
   assert.ok(facts.documentWidth<=facts.documentViewportWidth+2,'Página sem rolagem horizontal '+width+'x'+height);
   assert.ok(facts.photoCards.every((card,index,arr)=>index===0||card.top>=arr[index-1].bottom-2),
    'Cards não podem se sobrepor '+width+'x'+height+JSON.stringify(facts.photoCards));
   if(compact){
    assert.equal(facts.overflowY,'hidden','Diálogo deve recortar conteúdo atrás do título '+width+'x'+height);
    assert.equal(facts.headerPosition,'relative','Cabeçalho fixo deve ficar fora do scrollport '+width+'x'+height);
    assert.equal(facts.headerBackground,'rgb(3, 27, 32)','Cabeçalho deve ser opaco '+width+'x'+height);
    assert.equal(facts.scrollBodyOverflowY,'auto','Somente corpo de cards deve rolar '+width+'x'+height);
    assert.ok(facts.scrollBodyTop>=facts.headerBottom-2,'Corpo deve começar após título '+width+'x'+height);
    assert.ok(facts.scrollBodyScrollHeight>facts.scrollBodyClientHeight+100,'Deve rolar sem achatar cards '+width+'x'+height);
    assert.ok(facts.photoCards.every(card=>card.height>=105),'Cards legíveis sem achatamento '+width+'x'+height+JSON.stringify(facts.photoCards));
    assert.ok(facts.photoCards.every(card=>card.textTop>=card.top-2 && card.textBottom<=card.bottom+2),
     'Texto dentro dos cards '+width+'x'+height+JSON.stringify(facts.photoCards));
    assert.ok(facts.footerTop>=facts.photoCards[3].bottom-3,'Rodapé não pode cobrir os cards');
    await page.screenshot({path:resolve(output,'prism-poco-landscape-top-'+width+'x'+height+'.png'),fullPage:false});
    const scroller=dialog.locator('.meg-choice--photo');
    await scroller.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    const afterScroll=await dialog.evaluate(el=>{
     const header=el.querySelector('.meg-new-launch__header');
     const hb=header.getBoundingClientRect();
     const scrollRegion=el.querySelector('.meg-choice--photo');
     const sb=scrollRegion.getBoundingClientRect();
     const first=el.querySelector('.meg-choice__option').getBoundingClientRect();
     const hit=document.elementFromPoint((hb.left+hb.right)/2,hb.bottom-3);
     return {scrollTop:scrollRegion.scrollTop,headerTop:hb.top,headerBottom:hb.bottom,
      scrollBodyTop:sb.top,firstCardTop:first.top,headerReceivesHit:header.contains(hit)};
    });
    assert.ok(afterScroll.scrollTop>50,'Rolagem interna precisa funcionar por toque '+width+'x'+height);
    assert.ok(Math.abs(afterScroll.headerTop-facts.headerTop)<=2&&Math.abs(afterScroll.headerBottom-facts.headerBottom)<=2,
     'Título não deve se mover na rolagem '+width+'x'+height);
    assert.ok(afterScroll.firstCardTop<afterScroll.scrollBodyTop-20,'Card deve sumir pela borda do corpo '+width+'x'+height);
    assert.ok(afterScroll.headerReceivesHit,'Card jamais pode interceptar clique sobre cabeçalho '+width+'x'+height);
    await page.screenshot({path:resolve(output,'prism-poco-landscape-bottom-'+width+'x'+height+'.png'),fullPage:false});
   }else{
    assert.ok(facts.photoCards.every(card=>card.height>=85),
     'Card de notebook/monitor não pode ser comprimido '+width+'x'+height+JSON.stringify(facts.photoCards));
    await page.screenshot({path:resolve(output,'prism-desktop-protegido-'+width+'x'+height+'.png'),fullPage:false});
   }
   assert.equal(await picker.getByRole('button',{name:'Transferência indisponível'}).isDisabled(),true);
   assert.equal(await picker.getByRole('button',{name:'Benefício indisponível'}).isDisabled(),true);
   assert.equal(await picker.getByRole('button',{name:'Escolher Despesa'}).isEnabled(),true);
   assert.deepEqual(pageErrors,[],'Sem erros JS '+width+'x'+height);
   console.log('MEG_PRISM_COMPACT_LANDSCAPE '+width+'x'+height+' PASS');
  }finally{await page.close();}
 }

}finally{await browser.close();}
