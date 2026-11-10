import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const base=process.env.MEG_PREVIEW_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const defaults=['Transferência','Pagar conta','Relatórios','Configurações'];
let checked=0;
const assert=(ok,reason)=>{if(!ok)throw new Error(reason);checked++};
const titles=page=>page.locator('.pano-action strong').allTextContents();
try{
 for(const width of [320,390,640,768,1024,1366,1920,2560]){
  const context=await browser.newContext({viewport:{width,height:Math.min(900,width)},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(base+'/fluxo-integrado-08.html?tela=home',{waitUntil:'networkidle'});
  assert(JSON.stringify(await titles(page))===JSON.stringify(defaults),'padrão errado: '+width);
  assert(await page.locator('.meg-topbar-new').isVisible(),'Novo lançamento saiu do cabeçalho: '+width);
  await page.getByRole('button',{name:'Personalizar'}).click();
  assert(await page.getByRole('button',{name:'Mover Relatórios para cima'}).locator('svg').count()===1,'ícone SVG de subir ausente: '+width);
  assert(await page.getByRole('button',{name:'Mover Relatórios para baixo'}).locator('svg').count()===1,'ícone SVG de descer ausente: '+width);
  assert(await page.getByRole('button',{name:'Remover Relatórios'}).locator('svg').count()===1,'ícone SVG de remover ausente: '+width);
  const cards=await page.locator('.pano-quick-editor-card').evaluateAll(items=>items.map(el=>({x:el.getBoundingClientRect().left,y:el.getBoundingClientRect().top,width:el.getBoundingClientRect().width,buttons:[...el.querySelectorAll('.pano-quick-editor-controls button')].map(btn=>{const r=btn.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom}}),right:el.getBoundingClientRect().right,bottom:el.getBoundingClientRect().bottom})));
  assert(cards.length===4&&cards.every(card=>card.buttons.length===3&&card.buttons.every(btn=>btn.left>=card.x-1&&btn.right<=card.right+1&&btn.bottom<=card.bottom+1)),'ícones escaparam dos cartões da grade: '+width);
  if(width===1366){
   await page.getByRole('button',{name:'Recolher menu'}).click();
   await page.waitForTimeout(250);
   mkdirSync('artifacts/meg-home-refino-06',{recursive:true});
   await page.screenshot({path:'artifacts/meg-home-refino-06/home-pt2-editor-grade-1366.png',fullPage:false});
   await page.getByRole('button',{name:'Expandir menu'}).click();
   await page.waitForTimeout(250);
  }
  const buttons=await page.locator('.pano-quick-editor-controls button').evaluateAll(items=>items.map(el=>({text:el.textContent?.trim(),label:el.getAttribute('aria-label'),tooltip:el.getAttribute('data-tooltip'),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));
  assert(buttons.every(btn=>!btn.text&&btn.label&&btn.tooltip&&btn.width>=44&&btn.height>=44),'controles sem texto, com tooltip e alvo >=44px: '+width);
  await page.getByRole('button',{name:'Mover Relatórios para cima'}).focus();
  const tooltip=await page.getByRole('button',{name:'Mover Relatórios para cima'}).evaluate(el=>getComputedStyle(el,'::after').content);
  assert(tooltip.includes('Subir Relatórios'),'tooltip de ordenação ausente: '+width);
  await page.getByRole('button',{name:'Mover Relatórios para cima'}).click();
  assert(JSON.stringify(await titles(page))===JSON.stringify(['Transferência','Relatórios','Pagar conta','Configurações']),'reordenação: '+width);
  await page.getByRole('button',{name:'Remover Transferência'}).click();
  assert((await titles(page)).length===3,'remoção: '+width);
  await page.getByRole('button',{name:'Adicionar Transferência'}).click();
  assert((await titles(page)).length===4,'adição: '+width);
  await page.reload({waitUntil:'networkidle'});
  assert(JSON.stringify(await titles(page))===JSON.stringify(['Relatórios','Pagar conta','Configurações','Transferência']),'persistência: '+width);
  await page.getByRole('button',{name:'Personalizar'}).click();
  await page.getByRole('button',{name:'Restaurar configuração padrão'}).click();
  assert(JSON.stringify(await titles(page))===JSON.stringify(defaults),'restaurar: '+width);
  await page.reload({waitUntil:'networkidle'});
  assert(JSON.stringify(await titles(page))===JSON.stringify(defaults),'restaurar e persistir: '+width);
  const geometry=await page.evaluate(()=>{
   const root=document.querySelector('.pano-root')?.getBoundingClientRect();
   const actions=[...document.querySelectorAll('.pano-action')].map(el=>el.getBoundingClientRect());
   return {scroll:document.documentElement.scrollWidth,window:window.innerWidth,actions:actions.every(r=>r.left>=-2&&r.right<=window.innerWidth+2),root:root&&root.width>0};
  });
  assert(geometry.scroll<=geometry.window+2&&geometry.actions&&geometry.root,'overflow ou botão cortado: '+width);
  if(width>=1024){
   const toggle=page.getByRole('button',{name:'Recolher menu'});
   if(await toggle.count())await toggle.click();
   await page.waitForTimeout(260);
   const position=await page.evaluate(()=>{
    const brand=document.querySelector('.meg-shell.is-sidebar-collapsed .meg-brand-stack');
    const image=document.querySelector('.meg-shell.is-sidebar-collapsed .meg-brand-logo--collapsed');
    const expand=document.querySelector('.meg-sidebar-toggle-topbar');
    if(!brand||!image||!expand)return null;
    const a=brand.getBoundingClientRect(),b=expand.getBoundingClientRect();
    return {centerDiff:Math.abs(a.left+a.width/2-36),topDiff:Math.abs(a.top-b.top),logoWidth:image.getBoundingClientRect().width,bodyOverflow:document.documentElement.scrollWidth>window.innerWidth+2};
   });
   assert(position!==null&&!position.bodyOverflow,'sidebar recolhida ausente/overflow: '+width);
   const chrome=await page.evaluate(()=>{
    const brand=document.querySelector('.meg-shell.is-sidebar-collapsed .meg-brand-stack');
    const active=document.querySelector('.meg-shell.is-sidebar-collapsed .meg-nav-item.is-active');
    if(!brand||!active)return null;
    const image=document.querySelector('.meg-shell.is-sidebar-collapsed .meg-brand-logo--collapsed');
    const frame=brand.getBoundingClientRect(),icon=active.getBoundingClientRect();
    return {brandWidth:frame.width,logoWidth:image?.getBoundingClientRect().width,navWidth:icon.width,navBorder:getComputedStyle(active).borderTopWidth,brandBorder:getComputedStyle(brand).borderTopWidth};
   });
   assert(chrome&&chrome.brandWidth===56&&chrome.logoWidth===48&&chrome.navBorder!=='0px'&&chrome.brandBorder!=='0px','marca e frames premium: '+width+' '+JSON.stringify(chrome));
   assert(position.logoWidth>=44,'logo recolhida não aumentou: '+width);
   const visual=await page.evaluate(()=>{
    const shell=document.querySelector('.meg-shell.is-sidebar-collapsed');
    const brand=shell?.querySelector('.meg-brand-stack');
    const img=shell?.querySelector('.meg-brand-logo--collapsed');
    const logout=shell?.querySelector('.meg-logout-button');
    const idle=shell?.querySelector('.meg-nav-item:not(.is-active):not(.meg-logout-button)');
    if(!brand||!img||!logout||!idle)return null;
    const b=brand.getBoundingClientRect(),i=img.getBoundingClientRect(),l=getComputedStyle(logout),n=getComputedStyle(idle);
    return {logoContained:i.top>=b.top-1&&i.bottom<=b.bottom+1&&i.left>=b.left-1&&i.right<=b.right+1,logoutRed:l.color,logoutBorder:l.borderTopColor,idleBackground:n.backgroundColor};
   });
   assert(visual?.logoContained,'logo extrapola contorno: '+width+' '+JSON.stringify(visual));
   assert(visual?.logoutRed?.startsWith('rgb(255')&&visual?.logoutBorder?.startsWith('rgba(249'),'sair perdeu vermelho: '+width+' '+JSON.stringify(visual));
   assert(position.centerDiff<=2,'logo não está centrada nos 72px: '+width);
   assert(position.topDiff<=14,'marca não alinha com o botão expandir: '+width+' '+JSON.stringify(position));
  }
  await context.close();
 }
 // Preferência malformada não deve criar destinos nem causar erro.
 const context=await browser.newContext();
 await context.addInitScript(()=>localStorage.setItem('meg.web.home.quick-actions.v1.demo','["inexistente","transferencia"]'));
 const page=await context.newPage();
 await page.goto(base+'/fluxo-integrado-08.html?tela=home',{waitUntil:'networkidle'});
 assert(JSON.stringify(await titles(page))===JSON.stringify(defaults),'preferência inválida não caiu no padrão');
 await context.close();
 console.log('MEG Home Ações rápidas: '+checked+' verificações passaram; oito viewports; sem deploy.');
}catch(error){console.error(error);process.exitCode=1}finally{await browser.close()}
