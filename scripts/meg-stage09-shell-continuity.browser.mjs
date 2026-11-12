import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from '@playwright/test';

// O Shell pertence à plataforma inteira, nunca a uma tela. Este contrato
// compara estilos computados de Home e Lançamentos e bloqueia overrides locais.
const launchCss=readFileSync(new URL('../apps/web/src/meg-web-evolution/launches/launches-stage09.css',import.meta.url),'utf8');
const bellCss=readFileSync(new URL('../apps/web/src/meg-web-evolution/home/home-due-alerts.css',import.meta.url),'utf8');
const shellCss=readFileSync(new URL('../apps/web/src/meg-web-evolution/shell/shell.css',import.meta.url),'utf8');
assert.doesNotMatch(launchCss,/\.meg-integrated-preview\[data-preview-view="launches"\]\s+\.meg-(nav|topbar|brand|notification)/,'Tela não pode sobrescrever o Shell');
assert.doesNotMatch(launchCss,/\.meg-shell\.is-launches-operational\.is-sidebar-collapsed\s+\.meg-nav/,'Sidebar não pode variar por tela');
assert.doesNotMatch(shellCss,/:not\(\.is-launches-operational\)/,'Shell não pode excluir Lançamentos do padrão Home');
assert.doesNotMatch(bellCss,/:has\(\.pano-root\)\s+\.meg-due-bell-button/,'Sino não pode depender da Home montada');

const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const base=process.env.MEG_PREVIEW_URL||'http://127.0.0.1:4173';
const viewports=[[390,844],[768,1024],[1024,768],[1366,768],[1366,600],[1920,1080]];
const pick=(el)=>{const style=getComputedStyle(el),r=el.getBoundingClientRect();return{
 display:style.display,visibility:style.visibility,width:Math.round(r.width),height:Math.round(r.height),
 borderStyle:style.borderStyle,borderWidth:style.borderWidth,borderRadius:style.borderRadius,
 borderColor:style.borderColor,background:style.backgroundColor,backgroundImage:style.backgroundImage,
 boxShadow:style.boxShadow,opacity:style.opacity
}};
async function snapshot(page){
 return page.evaluate(()=>{
  const el=(selector)=>{const value=document.querySelector(selector);if(!value)throw Error('Missing Shell: '+selector);return value;};
  const css=(element)=>{const s=getComputedStyle(element),r=element.getBoundingClientRect();return{
    display:s.display,visibility:s.visibility,width:Math.round(r.width),height:Math.round(r.height),
    borderStyle:s.borderStyle,borderWidth:s.borderWidth,borderRadius:s.borderRadius,
    borderColor:s.borderColor,background:s.backgroundColor,backgroundImage:s.backgroundImage,
    boxShadow:s.boxShadow,opacity:s.opacity
  }};
  const position=(selector)=>{const r=el(selector).getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}};
  return {
   collapsed:el('.meg-shell').classList.contains('is-sidebar-collapsed'),
   logo:css(el('.meg-brand-stack')), logoImage:css(el('.meg-brand-logo--collapsed')),
   nav:css(el('.meg-nav')), inactive:css(el('.meg-nav-item[aria-label="Cartões"]')),
   toggle:css(el('.meg-sidebar-toggle-topbar')), newButton:css(el('.meg-topbar-new')),
   bell:css(el('.meg-due-bell-button')),
   topbar:position('.meg-topbar'), sidebar:position('.meg-sidebar'),
   search:position('.meg-search'),period:position('.meg-period'),
   inactiveBefore:getComputedStyle(el('.meg-nav-item[aria-label="Cartões"]'),'::before').backgroundImage,
   brandBefore:getComputedStyle(el('.meg-brand-stack'),'::before').content,
   brandAfter:getComputedStyle(el('.meg-brand-stack'),'::after').content,
   pageWidth:document.documentElement.scrollWidth,viewport:window.innerWidth,
  };
 });
}
for(const [width,height] of viewports){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.setDefaultTimeout(10000);
  const network=[],errors=[];
  page.on('request',r=>{const u=new URL(r.url());if(/^\/(api|finance|auth|cards|payables)(\/|$)/.test(u.pathname)||!['GET','HEAD'].includes(r.method()))network.push(r.method()+' '+u.pathname)});
  page.on('pageerror',error=>errors.push(String(error)));
  await page.addInitScript(()=>window.localStorage.setItem('meg-web-evolution:sidebar-collapsed','true'));
  await page.goto(base+'/fluxo-integrado-08.html?tela=home-p0&shell=home-authority',{waitUntil:'networkidle'});
  await page.locator('[data-preview-view="home-p0"]').waitFor();
  if(await page.locator('.meg-due-alert-dialog').count())await page.getByRole('button',{name:'Entendi'}).click();
  await page.mouse.move(width-5,height-5);
  const home=await snapshot(page);
  assert.ok(home.pageWidth<=width+2,'Home com rolagem horizontal');
  const button=page.getByRole('button',{name:'Lançamentos',exact:true});
  if(width<1024)await page.getByRole('button',{name:'Abrir menu'}).click();
  await button.click();
  await page.locator('.meg-l09.is-operational').waitFor();
  await page.mouse.move(width-5,height-5);
  await page.evaluate(()=>document.activeElement instanceof HTMLElement&&document.activeElement.blur());
  const launches=await snapshot(page);
  for(const field of ['collapsed','logo','logoImage','nav','inactive','toggle','newButton','bell','topbar','sidebar','search','period','inactiveBefore','brandBefore','brandAfter']){
    assert.deepEqual(launches[field],home[field],width+'x'+height+': Shell mudou em '+field);
  }
  assert.ok(launches.pageWidth<=width+2,'Lançamentos com rolagem horizontal');
  assert.equal(await page.getByRole('button',{name:'Lançamentos',exact:true}).getAttribute('aria-current'),'page','Menu não destaca a seção');
  if(width>=1024){
    assert.ok(home.newButton.width>0,'O + padrão da Home deve estar disponível em todas as telas desktop');
    assert.equal(home.logo.borderWidth,'0px','Marca da Home deve permanecer sem moldura');
    const active=page.locator('.meg-nav-item.is-active');
    assert.equal(await active.getAttribute('aria-label'),'Lançamentos');
  }
  if(width<1024)await page.getByRole('button',{name:'Abrir menu'}).click();
  await page.getByRole('button',{name:'Início',exact:true}).click();
  await page.locator('[data-preview-view="home-p0"]').waitFor();
  const returned=await snapshot(page);
  for(const field of ['collapsed','logo','logoImage','nav','inactive','toggle','newButton','bell','topbar','sidebar','search','period']){
    assert.deepEqual(returned[field],home[field],width+'x'+height+': Shell não foi restaurado em '+field);
  }
  assert.deepEqual(network,[],'O QA estático não pode acessar API ou gravar');
  assert.deepEqual(errors,[],'Erro JS na transição');
  await page.close();
  console.log('Contrato visual global Shell Home ⇄ Lançamentos '+width+'x'+height+': OK');
}
await browser.close();
