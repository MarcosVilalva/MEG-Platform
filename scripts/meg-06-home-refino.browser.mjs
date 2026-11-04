import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const base=process.env.MEG_PREVIEW_URL||'http://127.0.0.1:4173';
const out=resolve('artifacts/meg-home-refino-06');
mkdirSync(out,{recursive:true});
const sizes=[[320,640],[360,800],[390,844],[640,900],[768,1024],[1024,768],[1366,768],[1672,941],[1920,1080],[2560,1440]];
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
    statRects:all('.pano-stat').map(rect),
    chart:one('.pano-chart')?rect(one('.pano-chart')):null,
    chartCanvasPresent:!!one('.pano-chart canvas'),
    benefitPanel:one('.pano-benefits')?rect(one('.pano-benefits')):null,
    tablePanels:all('.pano-tables>.pano-grid').map(rect),
    tableScroll:all('.pano-grid .meg-datagrid__viewport').map(x=>({
      width:x.clientWidth,scrollWidth:x.scrollWidth
    })),
    tableHeadings:all('.pano-grid .meg-datagrid-table th .meg-datagrid-sort-button>span:first-child')
      .map(x=>({label:x.textContent?.trim(),width:x.clientWidth,scroll:x.scrollWidth})),
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
    rootRect:root?rect(root):null,
    mainRect:main?rect(main):null,
    cardPanelRect:one('.pano-cards')?rect(one('.pano-cards')):null,
    actionsPanelRect:panel?rect(panel):null,
    financePanelRect:one('.pano-finance-block')?rect(one('.pano-finance-block')):null,
    descriptions:all('.pano-action small').map(el=>el.textContent?.trim()),
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
  if(!changed.chart || changed.chart.height<170 || !changed.chartCanvasPresent)
    problems.push('gráfico financeiro ilegível ou ausente');
  if(!changed.benefitPanel || changed.benefitPanel.height<150)
    problems.push('painel de benefícios comprimido');
  if(width>=1024 && changed.tablePanels.length===2){
    const [a,b]=changed.tablePanels;
    if(Math.abs(a.top-b.top)<3 && Math.min(a.width,b.width)<680)
      problems.push('tabelas lado a lado sem largura para cabeçalhos');
    for(const heading of changed.tableHeadings.filter(x=>['Vencimento','Situação'].includes(x.label))){
      if(heading.scroll>heading.width+2)
        problems.push('cabeçalho '+heading.label+' ainda truncado');
    }
  }

  if(width>=640 && changed.statRects.length===4){
    const [a,b,c,d]=changed.statRects;
    if(Math.abs(a.top-b.top)>3||Math.abs(c.top-d.top)>3||c.top<a.bottom+3)
      problems.push('quatro indicadores não estão distribuídos em 2x2');
  }
  const desired=['Transferência','Pagar conta','Relatórios','Configurações'];
  if(changed.actions.length!==4 || changed.actions.some(x=>!x.title||x.iconCount!==1))
    problems.push('quatro atalhos não preservados');
  if(changed.actions.map(x=>x.title).join('|')!==desired.join('|'))
    problems.push('atalhos não seguem imagem 01');
  if(changed.descriptions.length!==4 || changed.descriptions.some(x=>!x))
    problems.push('descrição de atalhos ausente');
  if(byName(baseline)!==byName(changed) || JSON.stringify(baseline.copy)!==JSON.stringify(changed.copy))
    problems.push('dados/rótulos financeiros mudaram durante refino CSS');
  if(changed.actions.some(x=>x.height<44))problems.push('area de toque menor que 44px');
  if(changed.actions.some(x=>x.width<45))problems.push('atalho muito estreito');
  if(!changed.topPlusVisible)problems.push('botão Novo Lançamento do topo oculto');
  if(changed.actions.some(x=>x.title==='Novo lançamento'))
    problems.push('Novo lançamento ainda duplicado nas ações');
  if(changed.cardPanelRect && changed.actionsPanelRect && changed.financePanelRect
    && !(changed.actionsPanelRect.top>=changed.cardPanelRect.bottom-2
      && changed.financePanelRect.top>=changed.actionsPanelRect.bottom-2))
    problems.push('Ações rápidas fora da ordem da imagem 01');
  if(width>=1672 && changed.rootRect && changed.mainRect){
    if(changed.rootRect.width>1535)problems.push('Home ainda esticada no wide');
    const left=changed.rootRect.left-changed.mainRect.left;
    const right=changed.mainRect.right-changed.rootRect.right;
    if(Math.abs(left-right)>36)problems.push('Home não centralizada no wide');
  }
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
  if(width>=1024 && changed.actions.length===4){
    const tops=changed.actions.map(x=>x.top);
    if(Math.max(...tops)-Math.min(...tops)>3)
      problems.push('quatro atalhos não estão na mesma linha no desktop');
  } else if(width>=640 && changed.actions.length===4){
    const [a,b,c,d]=changed.actions;
    if(Math.abs(a.top-b.top)>3||Math.abs(c.top-d.top)>3||c.top<=a.top+5)
      problems.push('tablet não está em grade 2x2');
  } else if(changed.actions.length===4){
    const [a,b,c,d]=changed.actions;
    if(!(b.top>a.top+5&&c.top>b.top+5&&d.top>c.top+5))
      problems.push('mobile não empilha os quatro atalhos');
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

 // Verificações complementares: altura reduzida e zoom visual (sem alterar
 // dados ou imprimir uma falsa aprovação da experiência de navegador).
 for(const [width,height,zoom] of [
   [390,667,1],[1366,600,1],[1920,650,1],[1366,768,1.25],[1920,1080,1.25]
 ]){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   await page.goto(base+'/fluxo-integrado-08.html?tela=home',{waitUntil:'networkidle'});
   await page.locator('.pano-actions').waitFor();
   if(zoom!==1)await page.evaluate(z=>{document.documentElement.style.zoom=String(z);},zoom);
   const m=await measure(page);
   const problems=[];
   if(m.documentWidth>width+2)problems.push('rolagem horizontal com altura/zoom');
   if(m.actions.length!==4)problems.push('atalhos desaparecem com altura/zoom');
   if(!m.topPlusVisible)problems.push('Novo lançamento do topo não visível');
   if(!m.chart||m.chart.height<165)problems.push('gráfico comprimido com altura/zoom');
   if(m.cardStage&&m.activeCard&&m.activeCard.bottom>m.cardStage.bottom+3)
     problems.push('cartão cortado com altura/zoom');
   results.push({screen:'home-altura-ou-zoom',width,height,zoom,metrics:m,problems});
   if(problems.length){errors++;console.error('Adicional '+width+'x'+height+' / '+zoom+': '+problems.join(', '));}
   await page.screenshot({path:resolve(out,'home-altura-zoom-'+width+'x'+height+'-z'+Math.round(zoom*100)+'.png'),fullPage:true});
   await page.close();
 }

 const page=await browser.newPage({viewport:{width:1366,height:768}});
 await page.goto(base+'/fluxo-integrado-08.html?tela=home',{waitUntil:'networkidle'});
 await page.locator('.pano-actions').waitFor();
 const before=await page.locator('.pano-credit-card').innerText();
 await page.locator('.pano-card-control.is-next').click();
 const after=await page.locator('.pano-credit-card').innerText();
 if(before===after)throw Error('carrossel nao navegou');
 // Novo Lançamento deve permanecer no cabeçalho, sem duplicação no painel.
 if(!(await page.locator('.meg-topbar-new').isVisible()))throw Error('Novo lançamento no topo não visível');
 if(await page.locator('.pano-action').filter({hasText:'Novo lançamento'}).count())
   throw Error('Novo lançamento duplicado nas ações');
 await page.locator('.meg-topbar-new').click();
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
