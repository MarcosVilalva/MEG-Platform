import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const base=process.env.MEG_PREVIEW_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const defaults=['Transferência','Pagar conta','Relatórios','Configurações'];
const extras=['Lançamentos','Cartões','Benefícios'];
let checks=0;
function assert(ok,message){if(!ok)throw Error(message);checks++}
const buttons=page=>page.locator('.pano-quick-rail .pano-quick-item');
const names=page=>page.locator('.pano-quick-item-label strong').allTextContents();
const controls=page=>page.locator('.pano-quick-carousel-controls');
const next=async page=>controls(page).getByRole('button',{name:'Ver próximos atalhos'}).click();
const previous=async page=>controls(page).getByRole('button',{name:'Ver atalhos anteriores'}).click();
const findAdd=async page=>{
 for(let i=0;i<10;i++){
  const add=page.getByRole('button',{name:'Adicionar atalho'});
  if(await add.count())return add;
  await next(page);
 }
 throw Error('Adicionar inacessível pela navegação circular');
};
const addItem=async(page,label)=>{
 const add=await findAdd(page);
 await add.click();
 await page.getByRole('dialog',{name:'Adicionar funcionalidade'}).getByRole('button',{name:'Adicionar '+label}).click();
};
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('meg.web.home.quick-actions.v1.demo')||'null'));
async function checkWindow(page,width,editing=false){
 const result=await page.locator('.pano-quick-rail').evaluate(el=>{
  const frame=el.getBoundingClientRect();
  const items=[...el.querySelectorAll('.pano-quick-item')].map(item=>{
   const rect=item.getBoundingClientRect();
   return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width};
  });
  const parent=el.closest('.pano-quick-viewport')?.getBoundingClientRect();
  return {n:items.length,items,frame:{left:frame.left,right:frame.right,top:frame.top,bottom:frame.bottom},
    parent:parent?{left:parent.left,right:parent.right}:null,
    documentWidth:document.documentElement.scrollWidth,viewportWidth:window.innerWidth,
    railScrollWidth:el.scrollWidth,railWidth:el.clientWidth,editCount:el.querySelectorAll('.pano-quick-inline-controls').length};
 });
 const sameRow=result.items.every(item=>Math.abs(item.top-result.items[0].top)<2);
 const complete=result.items.every(item=>item.left>=result.frame.left-2&&item.right<=result.frame.right+2&&item.width>60);
 assert(result.n>=1&&result.n<=4&&sameRow&&complete&&result.documentWidth<=result.viewportWidth+2,
  'janela circular deve mostrar cartões inteiros, uma linha e sem overflow: '+width+' '+JSON.stringify(result));
 assert(result.items.every(item=>item.left>=result.frame.left-2&&item.right<=result.frame.right+2),'cartão renderizado fora da janela: '+width);
 assert(result.editCount===(editing?result.items.filter((_,i)=>true).length-(await page.getByRole('button',{name:'Adicionar atalho'}).count()):0),
  'edição precisa ocorrer na mesma janela: '+width);
}
try{
 for(const width of [320,390,640,768,1024,1366,1920,2560]){
  const context=await browser.newContext({viewport:{width,height:Math.min(900,Math.max(640,width))},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(base+'/fluxo-integrado-08.html?tela=home',{waitUntil:'networkidle'});
  await page.waitForTimeout(180);
  assert(await page.locator('.pano-quick-rail').count()===1,'carrossel duplicado: '+width);
  assert(await page.locator('.meg-topbar-new').isVisible(),'Novo lançamento saiu do topo: '+width);
  assert(JSON.stringify(await names(page))===JSON.stringify(defaults.slice(0,(await buttons(page).count()))),
   'ordem inicial visível incorreta: '+width);
  await checkWindow(page,width);
  const dots=page.getByRole('group',{name:'Páginas de ações rápidas'}).getByRole('button');
  assert(await dots.count()>1,'indicadores não aparecem com mais de uma página: '+width);
  assert(await dots.first().getAttribute('aria-current')==='true','primeira pílula deveria estar ativa: '+width);
  await dots.last().click();
  assert(await dots.last().getAttribute('aria-current')==='true','pílula clicável não atualiza página: '+width);
  await dots.first().click();
  assert(await dots.first().getAttribute('aria-current')==='true','retorno à primeira pílula: '+width);
  if(width>=1024){
   const rows=await page.evaluate(()=>{
    const blocks=[...document.querySelectorAll('.pano-finance-block .pano-grid')];
    if(blocks.length!==2)return null;
    return blocks.map(block=>[...block.querySelectorAll('.meg-datagrid-table tbody tr:not(.meg-datagrid-group-row)')]
     .filter(el=>el.getBoundingClientRect().height>0)
     .map(el=>el.getBoundingClientRect().height));
   });
   assert(rows&&rows[0].length>=3&&rows[1].length>=1,'DataGrid sem linhas de prévia: '+width+' '+JSON.stringify(rows));
   const left=rows[0][0],right=rows[1][0];
   assert(Math.abs(left-right)<=3&&left<=65&&right<=65,
    'linhas dos dois DataGrids devem ter densidade equivalente: '+width+' '+JSON.stringify({left,right,rows}));
  }
  const initial=await names(page);
  await previous(page);
  assert((await names(page))[0]==='Adicionar','carrossel não volta circularmente ao fim: '+width);
  await next(page);
  assert(JSON.stringify(await names(page))===JSON.stringify(initial),'carrossel não volta ao início: '+width);
  for(let k=0;k<5;k++)await next(page);
  assert(JSON.stringify(await names(page))===JSON.stringify(initial),'volta circular após ciclo inteiro: '+width);

  const pencil=page.getByRole('button',{name:'Personalizar ações rápidas'});
  assert(await pencil.locator('svg').count()===1&&await pencil.innerText()==='','lápis deve ser apenas ícone: '+width);
  await pencil.click();
  await checkWindow(page,width,true);
  assert(await page.getByRole('button',{name:'Mover Transferência para direita'}).count()===1,'seta de ordenação ausente: '+width);
  const areas=await page.locator('.pano-quick-inline-controls button').evaluateAll(items=>items.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,aria:el.getAttribute('aria-label')})));
  assert(areas.every(item=>item.w>=44&&item.h>=44&&item.aria),'alvos de toque e rótulos dos controles: '+width);
  await page.getByRole('button',{name:'Mover Transferência para direita'}).click();
  assert(JSON.stringify((await stored(page)).slice(0,2))===JSON.stringify(['pendentes','transferencia']),'ordenação à direita: '+width);
  for(let k=0;k<10&&!await page.getByRole('button',{name:'Mover Transferência para esquerda'}).count();k++)await next(page);
  await page.getByRole('button',{name:'Mover Transferência para esquerda'}).click();
  assert(JSON.stringify((await stored(page)).slice(0,4))===JSON.stringify(['transferencia','pendentes','relatorios','metas']),'ordenação à esquerda: '+width);

  for(const extra of extras)await addItem(page,extra);
  assert((await stored(page)).length===7,'catálogo não aceita todos os sete destinos: '+width);
  await checkWindow(page,width,true);
  await (await findAdd(page)).click();
  assert((await page.locator('.pano-quick-status').innerText()).includes('Todos os ícones disponíveis já foram adicionados.'),
   'aviso de catálogo completo ausente: '+width);
  assert(await page.getByRole('dialog',{name:'Adicionar funcionalidade'}).count()===0,
   'não deve abrir catálogo vazio: '+width);
  await page.reload({waitUntil:'networkidle'});
  assert((await stored(page)).length===7,'adição não persistiu após recarga: '+width);
  await checkWindow(page,width);
  await page.getByRole('button',{name:'Personalizar ações rápidas'}).click();
  // Benefícios não precisa estar visível: rotação garante acesso.
  for(let n=0;n<10&&!await page.getByRole('button',{name:'Remover Benefícios'}).count();n++)await next(page);
  await page.getByRole('button',{name:'Remover Benefícios'}).click();
  assert((await stored(page)).length===6,'remoção falhou: '+width);
  await addItem(page,'Benefícios');
  assert((await stored(page)).length===7,'reinclusão falhou: '+width);
  await page.getByRole('button',{name:'Restaurar configuração padrão'}).click();
  assert(JSON.stringify(await stored(page))===JSON.stringify(['transferencia','pendentes','relatorios','metas']),
   'restaurar padrão falhou: '+width);
  await page.getByRole('button',{name:'Concluir personalização'}).click();
  await checkWindow(page,width);

  if(width>=1024){
   const nav=page.getByRole('button',{name:'Início'});
   const baseline=await nav.evaluate(el=>({
    border:getComputedStyle(el).borderTopColor,
    borderWidth:getComputedStyle(el).borderTopWidth,
    background:getComputedStyle(el).backgroundImage,
    circle:getComputedStyle(el,'::before').borderRadius,
    glow:getComputedStyle(el.querySelector('svg')).filter,
    haloOpacity:getComputedStyle(el,'::before').opacity
   }));
   assert(baseline.border==='rgba(0, 0, 0, 0)'||baseline.border==='transparent',
    'sidebar aberta: borda visível no ativo '+width+' '+JSON.stringify(baseline));
   assert(baseline.circle==='50%'&&baseline.glow.includes('drop-shadow')&&baseline.haloOpacity==='1',
    'sidebar aberta: halo circular ativo ausente '+width+' '+JSON.stringify(baseline));
   const other=page.getByRole('button',{name:'Lançamentos'});
   await other.hover();
   const onHover=await other.evaluate(el=>({
    opacity:getComputedStyle(el,'::before').opacity,
    glow:getComputedStyle(el.querySelector('svg')).filter,
    border:getComputedStyle(el).borderTopColor
   }));
   assert(onHover.opacity==='1'&&onHover.glow.includes('drop-shadow')&&
    (onHover.border==='transparent'||onHover.border==='rgba(0, 0, 0, 0)'),
    'sidebar aberta: hover deve iluminar sem contorno '+width+' '+JSON.stringify(onHover));
   await other.focus();
   await page.keyboard.press('Tab');
   const onFocus=await page.evaluate(()=>{
    const el=document.activeElement;
    if(!(el instanceof HTMLElement)||!el.classList.contains('meg-nav-item'))return null;
    const pseudo=getComputedStyle(el,'::before');
    return {opacity:pseudo.opacity,shadow:pseudo.boxShadow,outline:pseudo.outlineStyle};
   });
   assert(onFocus&&onFocus.opacity==='1'&&onFocus.shadow!=='none'&&onFocus.outline==='none',
    'sidebar aberta: Tab precisa de iluminação circular, sem contorno '+width+' '+JSON.stringify(onFocus));
  }
  if(width===1366){
   await page.getByRole('button',{name:'Recolher menu'}).click();
   mkdirSync('artifacts/meg-home-refino-06',{recursive:true});
   await page.screenshot({path:'artifacts/meg-home-refino-06/home-08-circular-sidebar-1366.png',fullPage:false});
  }else if(width>=1024)await page.getByRole('button',{name:'Recolher menu'}).click();

  if(width>=1024){
   const style=await page.evaluate(()=>{
    const active=document.querySelector('.meg-shell.is-sidebar-collapsed .meg-nav-item.is-active');
    const footer=document.querySelector('.meg-shell.is-sidebar-collapsed .meg-logout-button');
    if(!active||!footer)return null;
    return {border:getComputedStyle(active).borderTopColor,
      circle:getComputedStyle(active,'::before').borderRadius,
      glow:getComputedStyle(active.querySelector('svg')).filter,
      exitColor:getComputedStyle(footer).color};
   });
   assert(style&&style.circle==='50%'&&style.glow.includes('drop-shadow')&&style.exitColor.startsWith('rgb(255'),
    'halo circular ou Sair vermelho regressou: '+width+' '+JSON.stringify(style));
   const collapsedActive=await page.getByRole('button',{name:'Início'}).evaluate(el=>({
     border:getComputedStyle(el).borderTopColor,
     background:getComputedStyle(el).backgroundColor,
     halo:getComputedStyle(el,'::before').opacity
   }));
   assert((collapsedActive.border==='transparent'||collapsedActive.border==='rgba(0, 0, 0, 0)')&&collapsedActive.halo==='1',
    'sidebar recolhida: ativo deve iluminar sem borda '+width+' '+JSON.stringify(collapsedActive));
   const home=page.getByRole('button',{name:'Início'});
   await home.focus();
   const focus=await home.evaluate(el=>getComputedStyle(el,'::before').boxShadow);
   assert(focus!=='none','foco por Tab não ilumina ícone: '+width);
  }
  await context.close();
 }
 const context=await browser.newContext();
 await context.addInitScript(()=>localStorage.setItem('meg.web.home.quick-actions.v1.demo','["inexistente","transferencia"]'));
 const page=await context.newPage();
 await page.goto(base+'/fluxo-integrado-08.html?tela=home',{waitUntil:'networkidle'});
 assert(JSON.stringify(await names(page))===JSON.stringify(defaults.slice(0,await buttons(page).count())),'preferência inválida não restaurou padrão');
 await context.close();
 console.log('MEG Home Ações rápidas circular: '+checks+' verificações passaram; 8 viewports.');
}catch(error){console.error(error);process.exitCode=1}finally{await browser.close()}
