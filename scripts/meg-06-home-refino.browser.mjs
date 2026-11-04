import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const base=process.env.MEG_PREVIEW_URL||'http://127.0.0.1:4173';
const out=resolve('artifacts/meg-home-refino-06');
mkdirSync(out,{recursive:true});
const sizes=[[320,640],[360,800],[390,844],[640,900],[768,1024],[1024,768],[1366,768],[1672,941],[1920,1080]];
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
  args:['--no-sandbox']
});
const results=[];
let errors=0;
const round=x=>Math.round(x*100)/100;

async function measure(page){
 return await page.evaluate(()=>{
  const one=s=>document.querySelector(s);
  const all=s=>[...document.querySelectorAll(s)];
  const rect=e=>{
    const r=e.getBoundingClientRect();
    return {x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right};
  };
  const buttons=all('.pano-action');
  const stage=one('.pano-card-stage');
  const summary=one('.pano-card-summary');
  const summaryName=one('.pano-card-summary-copy strong');
  const topPlus=one('.meg-topbar-new');
  const summaryCard=one('.pano-card-amount');
  const active=one('.pano-credit-card');
  const main=one('.meg-main');
  const panel=one('.pano-actions');
  const root=one('.pano-root');
  return {
    viewport:window.innerWidth,
    documentWidth:document.documentElement.scrollWidth,
    mainScrollWidth:main?.scrollWidth||0,
    mainWidth:main?.clientWidth||0,
    titleCount:root?.querySelectorAll('h1').length||0,
    kpis:all('.pano-stat').length,
    grids:all('.pano-grid .meg-datagrid').length,
    actions:buttons.map(b=>({
      title:b.querySelector('strong')?.textContent?.trim(),
      iconCount:b.querySelectorAll('.pano-action-icon svg').length,
      ...rect(b)
    })),
    actionGap:panel?getComputedStyle(one('.pano-action-list')).gap:null,
    cardStage:stage?rect(stage):null,
    activeCard:active?rect(active):null,
    cardCount:all('.pano-credit-card').length,
    cardButtons:all('.pano-card-control').length,
    summary:summary?rect(summary):null,
    summaryName:summaryName?.textContent?.trim(),
    summaryValue:summaryCard?.querySelector('strong')?.textContent?.trim(),
    summaryText:summaryCard?.querySelector('span')?.textContent?.trim(),
    topPlusVisible:!!topPlus&&getComputedStyle(topPlus).display!=='none',

    copy:all('.pano-stat strong').map(e=>e.textContent?.trim()),
    previewStatus:one('.pano-preview-banner')?.textContent?.trim()
  };
 });
}
const byName=(m)=>m.actions.map(x=>x.title).join('|');
try {
 for(const [width,height] of sizes){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const api=[];
  page.on('request',r=>{if(/\/api\//.test(new URL(r.url()).pathname))api.push(r.url());});
  await page.goto(base+'/fluxo-integrado-08.html?tela=home',{waitUntil:'networkidle'});
  await page.locator('.pano-actions').waitFor();
  // Baseline uses EXACTLY the same real DOM/fixtures and disables only the
  // candidate Home styling. The approved Novo Lançamento CSS is untouched.
  await page.locator('.meg-integrated-preview').evaluate(el=>el.setAttribute('data-preview-view','home-baseline'));
  const baseline=await measure(page);
  await page.screenshot({path:resolve(out,'home-baseline-'+width+'x'+height+'.png'),fullPage:true});
  await page.locator('.meg-integrated-preview').evaluate(el=>el.setAttribute('data-preview-view','home'));
  const changed=await measure(page);
  await page.screenshot({path:resolve(out,'home-candidate-'+width+'x'+height+'.png'),fullPage:true});
  if([390,768,1366,1920].includes(width)){
    await page.evaluate(()=>{const main=document.querySelector('.meg-main');if(main)main.scrollTop=main.scrollHeight});
    await page.screenshot({path:resolve(out,'home-candidate-bottom-'+width+'x'+height+'.png'),fullPage:true});
  }
  const problems=[];
  if(changed.documentWidth>width+1)problems.push('rolagem horizontal da pagina');
  if(changed.mainScrollWidth>changed.mainWidth+2)problems.push('rolagem horizontal indevida na Home');
  if(changed.titleCount!==1||changed.kpis!==4||changed.grids!==2)
    problems.push('estrutura obrigatoria: 1 titulo, 4 KPIs, 2 DataGrids');
  if(changed.actions.length!==5 || changed.actions.some(x=>!x.title||x.iconCount!==1))
    problems.push('atalhos não preservados');
  if(byName(baseline)!==byName(changed) || JSON.stringify(baseline.copy)!==JSON.stringify(changed.copy))
    problems.push('dados/rótulos financeiros mudaram durante refino CSS');
  if(changed.actions.some(x=>x.height<44))problems.push('area de toque menor que 44px');
  if(changed.actions.some(x=>x.width<45))problems.push('atalho muito estreito');
  if(changed.topPlusVisible)problems.push('botao Novo Lancamento duplicado no cabeçalho');
  if(!changed.summary||!changed.summaryName||changed.summaryText!=='Fatura em aberto')
    problems.push('rodape do cartao sem resumo canonico');
  if(changed.summary?.right>width+2)problems.push('resumo do cartao transborda a tela');
  if(changed.cardStage&&changed.summary && changed.summary.top<changed.cardStage.bottom-3)
    problems.push('resumo e palco de cartoes sobrepostos');

  if(!changed.activeCard||changed.cardCount!==1||changed.cardButtons!==2)problems.push('carrossel alterado');
  if(changed.cardStage && changed.activeCard &&
      (changed.activeCard.top<changed.cardStage.top-2 ||
      changed.activeCard.bottom>changed.cardStage.bottom+2))
    problems.push('cartão central cortado no palco');
  if(api.length)problems.push('requisições API em modo visual');
  if(width>=1024 && changed.actions.length===5){
    const [a,b,c,d,e]=changed.actions;
    if(Math.abs(a.top-b.top)>3||Math.abs(b.top-c.top)>3 ||
      Math.abs(d.top-e.top)>3|| d.top<=a.top+7)
      problems.push('grade de acesso rápido 3+2 perdida');
  }
  // O novo tamanho do cartão foi aprovado como proposta visual, mas
  // nunca pode cortar controles ou deslocar os KPIs/DataGrids.
  if(baseline.activeCard && changed.activeCard
    && changed.activeCard.width<baseline.activeCard.width-2)
    problems.push('cartão principal diminuiu em vez de ganhar destaque');
  if(changed.summary?.height<44)problems.push('faixa de resumo excessivamente comprimida');
  results.push({screen:'home',width,height,baseline,changed,problems});
  if(problems.length){errors++;console.error('Home '+width+'x'+height+': '+problems.join(', '));}
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 await page.goto(base+'/fluxo-integrado-08.html?tela=home',{waitUntil:'networkidle'});
 await page.locator('.pano-actions').waitFor();
 const before=await page.locator('.pano-credit-card').innerText();
 await page.locator('.pano-card-control.is-next').click();
 const after=await page.locator('.pano-credit-card').innerText();
 if(before===after)throw Error('carrossel nao navegou');
 // Cabeçalho escondido apenas na Home: atalho central continua navegável.
 if(await page.locator('.meg-topbar-new').isVisible())throw Error('Topo duplicado na Home');
 await page.locator('.pano-action').filter({hasText:'Novo lançamento'}).click();
 await page.locator('[data-testid="new-launch-types"]').waitFor();
 if(await page.locator('.meg-choice__option').count()!==4)throw Error('Novo Lançamento mudou');
 await page.screenshot({path:resolve(out,'novo-lancamento-protegido.png'),fullPage:true});
 await page.getByRole('button',{name:'Voltar à Home'}).click();
 if(await page.locator('[data-testid="new-launch-types"]').count())throw Error('Voltar nao fechou');
 results.push({screen:'carrossel-e-fluxo-home-novo',ok:true});
 await page.close();
} catch(e){errors++;console.error(e);}
finally{await browser.close();}
writeFileSync(resolve(out,'resultados.json'),JSON.stringify({errors,results},null,2));
console.log('MEG Home 06 visual QA: '+results.length+' cenarios, '+errors+' falhas');
if(errors)process.exitCode=1;
