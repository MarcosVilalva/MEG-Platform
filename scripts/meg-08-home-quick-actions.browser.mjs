import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const base=process.env.MEG_PREVIEW_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const defaults=['Transferência','Pagar conta','Relatórios','Configurações'];
const catalog=['Lançamentos','Cartões','Benefícios'];
let checked=0;
function assert(ok,reason){if(!ok)throw new Error(reason);checked++}
const titles=page=>page.locator('.pano-quick-item:not(.pano-quick-add) .pano-quick-item-label strong').allTextContents();
const clickAdd=async(page,name)=>{
 const rail=page.locator('.pano-quick-rail');
 await rail.getByRole('button',{name:'Adicionar atalho'}).click();
 await page.getByRole('dialog',{name:'Adicionar funcionalidade'}).getByRole('button',{name:'Adicionar '+name}).click();
};
const verifyRail=async(page,width,editing)=>{
 const rail=page.locator('.pano-quick-rail');
 const data=await rail.evaluate(el=>{
  const rect=el.getBoundingClientRect();
  const cards=[...el.querySelectorAll('.pano-quick-item')].map(node=>node.getBoundingClientRect());
  return {height:rect.height,viewportWidth:rect.width,scrollWidth:el.scrollWidth,
   row:cards.every(r=>Math.abs(r.top-cards[0].top)<2),
   allContained:cards.every(r=>r.height<=rect.height+2),
   addLast:el.lastElementChild?.classList.contains('pano-quick-add'),
   bodyOverflow:document.documentElement.scrollWidth>window.innerWidth+2,
   editorExists:!!document.querySelector('.pano-quick-editor-list'),
   editButtons:el.querySelectorAll('.pano-quick-inline-controls').length
  };
 });
 assert(data.row&&data.allContained&&data.addLast&&!data.bodyOverflow&&!data.editorExists,
  'carrossel deve ocupar apenas uma linha, Adicionar no final, sem overflow da página: '+width+' '+JSON.stringify(data));
 assert(data.editButtons===(editing?await page.locator('.pano-quick-item:not(.pano-quick-add)').count():0),
  'modo edição precisa usar os mesmos cartões: '+width);
};
try{
 for(const width of [320,390,640,768,1024,1366,1920,2560]){
  const context=await browser.newContext({viewport:{width,height:Math.min(900,width)},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(base+'/fluxo-integrado-08.html?tela=home',{waitUntil:'networkidle'});
  assert(JSON.stringify(await titles(page))===JSON.stringify(defaults),'padrão original alterado: '+width);
  assert(await page.locator('.meg-topbar-new').isVisible(),'Novo lançamento não está no topo: '+width);
  assert(await page.locator('.pano-quick-rail').count()===1,'deve existir um único carrossel: '+width);
  await verifyRail(page,width,false);

  const edit=page.getByRole('button',{name:'Personalizar ações rápidas'});
  assert(await edit.locator('svg').count()===1&&await edit.innerText()==='','botão lápis não é icon-only: '+width);
  await edit.click();
  await verifyRail(page,width,true);
  assert(await page.getByRole('button',{name:'Mover Relatórios para esquerda'}).isVisible(),'mover esquerda ausente: '+width);
  assert(await page.getByRole('button',{name:'Mover Relatórios para direita'}).isVisible(),'mover direita ausente: '+width);
  assert(await page.getByRole('button',{name:'Remover Relatórios'}).isVisible(),'remover ausente: '+width);
  const activeButtons=await page.locator('.pano-quick-inline-controls button').evaluateAll(els=>els.map(el=>({label:el.getAttribute('aria-label'),tooltip:el.getAttribute('data-tooltip'),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
  assert(activeButtons.every(x=>!!x.label&&!!x.tooltip&&x.width>=44&&x.height>=44),'alvo 44px, tooltips e nomes acessíveis: '+width);
  await page.getByRole('button',{name:'Mover Relatórios para esquerda'}).click();
  assert(JSON.stringify(await titles(page))===JSON.stringify(['Transferência','Relatórios','Pagar conta','Configurações']),'reordenação esquerda: '+width);
  await page.getByRole('button',{name:'Mover Relatórios para direita'}).click();
  assert(JSON.stringify(await titles(page))===JSON.stringify(defaults),'reordenação direita: '+width);

  for(const name of catalog)await clickAdd(page,name);
  assert(JSON.stringify(await titles(page))===JSON.stringify([...defaults,...catalog]),'adição dos três extras: '+width);
  assert((await page.locator('.pano-quick-rail .pano-quick-item').count())===8,'sete itens + Adicionar: '+width);
  await verifyRail(page,width,true);
  await page.locator('.pano-quick-rail').getByRole('button',{name:'Adicionar atalho'}).click();
  assert((await page.locator('.pano-quick-status').innerText()).includes('Todos os ícones disponíveis já foram adicionados.'),
   'mensagem do catálogo completo: '+width);
  assert(await page.getByRole('dialog',{name:'Adicionar funcionalidade'}).count()===0,'catálogo vazio não deve abrir diálogo: '+width);
  await page.reload({waitUntil:'networkidle'});
  assert(JSON.stringify(await titles(page))===JSON.stringify([...defaults,...catalog]),'persistência dos sete itens: '+width);
  await verifyRail(page,width,false);

  await page.getByRole('button',{name:'Personalizar ações rápidas'}).click();
  await page.getByRole('button',{name:'Remover Benefícios'}).click();
  assert((await titles(page)).length===6,'remoção sem segundo trilho: '+width);
  assert(await page.locator('.pano-quick-add').count()===1,'Adicionar único após remoção: '+width);
  await clickAdd(page,'Benefícios');
  assert((await titles(page)).length===7,'recuperar atalho: '+width);
  await page.getByRole('button',{name:'Restaurar configuração padrão'}).click();
  assert(JSON.stringify(await titles(page))===JSON.stringify(defaults),'restauração padrão: '+width);
  await page.getByRole('button',{name:'Concluir personalização'}).click();
  await verifyRail(page,width,false);
  await page.reload({waitUntil:'networkidle'});
  assert(JSON.stringify(await titles(page))===JSON.stringify(defaults),'padrão restaurado persistente: '+width);

  if(width===1366){
   await page.getByRole('button',{name:'Personalizar ações rápidas'}).click();
   await page.getByRole('button',{name:'Recolher menu'}).click();
   mkdirSync('artifacts/meg-home-refino-06',{recursive:true});
   await page.screenshot({path:'artifacts/meg-home-refino-06/home-pt2-carrossel-1366.png',fullPage:false});
  }
  if(width>=1024){
   if(width!==1366)await page.getByRole('button',{name:'Recolher menu'}).click();
   const brand=await page.evaluate(()=>{
    const shell=document.querySelector('.meg-shell.is-sidebar-collapsed');
    const image=shell?.querySelector('.meg-brand-logo--collapsed');
    const stack=shell?.querySelector('.meg-brand-stack');
    const logout=shell?.querySelector('.meg-logout-button');
    const active=shell?.querySelector('.meg-nav-item.is-active');
    const expand=document.querySelector('.meg-sidebar-toggle-topbar');
    if(!stack||!image||!logout||!active||!expand)return null;
    const a=stack.getBoundingClientRect(),b=expand.getBoundingClientRect();
    return {center:Math.abs(a.left+a.width/2-36),top:Math.abs(a.top-b.top),
     logo:getComputedStyle(stack).borderTopWidth,
     exit:getComputedStyle(logout).color,
     activeGlow:getComputedStyle(active.querySelector('svg')).filter};
   });
   assert(brand&&brand.center<=2&&brand.top<=8&&brand.logo==='0px'&&brand.exit.startsWith('rgb(255')&&brand.activeGlow.includes('drop-shadow'),
    'sidebar desfigurada: '+width+' '+JSON.stringify(brand));
  }
  await context.close();
 }
 const context=await browser.newContext();
 await context.addInitScript(()=>localStorage.setItem('meg.web.home.quick-actions.v1.demo','["inexistente","transferencia"]'));
 const page=await context.newPage();
 await page.goto(base+'/fluxo-integrado-08.html?tela=home',{waitUntil:'networkidle'});
 assert(JSON.stringify(await titles(page))===JSON.stringify(defaults),'entrada inválida deve ser ignorada');
 await context.close();
 console.log('MEG Home Ações rápidas: '+checked+' verificações passaram; 8 viewports; carrossel único sem merge.');
}catch(error){console.error(error);process.exitCode=1}finally{await browser.close()}
