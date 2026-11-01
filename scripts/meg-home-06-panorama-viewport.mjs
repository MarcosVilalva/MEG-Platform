import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const origin='http://127.0.0.1:4173/home-06-panorama.html';
const viewports=[
 {name:'desktop-1920',width:1920,height:1080},
 {name:'desktop-1672',width:1672,height:941},
 {name:'desktop-1366',width:1366,height:768},
 {name:'tablet-1024',width:1024,height:768},
 {name:'tablet-768',width:768,height:1024},
 {name:'mobile-640',width:640,height:930},
 {name:'mobile-390',width:390,height:844},
 {name:'mobile-360',width:360,height:760},
 {name:'mobile-320',width:320,height:700}
];
const dir='artifacts/home-06-panorama';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
let failed=false;
try{
 for(const {name,width,height} of viewports){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.pano-hero').waitFor({state:'visible',timeout:15000});
  await page.locator('.pano-stat').first().waitFor({state:'visible'});
  await page.waitForTimeout(900);
  const result=await page.evaluate(()=>{
   const root=document.querySelector('.pano-root');
   const amountElements=[...document.querySelectorAll('.pano-balance>strong,.pano-stat strong,.pano-card-amount strong')];
   const wrappedAmounts=amountElements.filter(el=>{
    const s=getComputedStyle(el),line=parseFloat(s.lineHeight),rect=el.getBoundingClientRect();
    return Number.isFinite(line)&&rect.height>line*1.45;
   }).map(el=>el.textContent?.trim());
   const shellMain=document.querySelector('.meg-main');
   const mainOverflow=Boolean(shellMain&&shellMain.scrollWidth>shellMain.clientWidth+1);
   const mainCanScroll=Boolean(shellMain&&shellMain.scrollHeight>shellMain.clientHeight+30);
   const shellBody=document.querySelector('.meg-shell-body');
   const scrollerGeometry=Boolean(shellBody&&shellMain&&shellMain.getBoundingClientRect().bottom<=innerHeight+2);

   const mid=document.querySelector('.pano-mid');
   const midR=mid?.getBoundingClientRect();
   const midStyle=mid?getComputedStyle(mid):null;
   const midPanels=[...document.querySelectorAll('.pano-mid>.pano-panel')].map(node=>node.getBoundingClientRect());
   const gridCols=midStyle?.display==='grid'
     ?midStyle.gridTemplateColumns.trim().split(/\s+/).map(parseFloat).filter(n=>Number.isFinite(n)&&n>1).length:1;
   const gap=midStyle?parseFloat(midStyle.columnGap)||0:0;
   const minPanelWidth=midR?(midR.width-Math.max(0,gridCols-1)*gap)/gridCols:0;
   const midFillsColumns=Boolean(midR&&midPanels.length===2&&midPanels.every(p=>
      p.width>=minPanelWidth-3&&p.left>=midR.left-2&&p.right<=midR.right+2));
   const actionButtons=[...document.querySelectorAll('.pano-action-list>.pano-action')].map(x=>x.getBoundingClientRect());
   const actionsLegible=actionButtons.length===5&&actionButtons.every(r=>r.width>=88&&r.height>=60);
   const graph=document.querySelector('.pano-flow');
   const hero=document.querySelector('.pano-hero');
   const charts=document.querySelectorAll('.pano-chart canvas').length;
   const panels=document.querySelectorAll('.pano-stat').length;
   const flowHeader=document.querySelector('.pano-flow-head h2')?.getBoundingClientRect();
   const flowButton=document.querySelector('.pano-flow-head .pano-flow-open')?.getBoundingClientRect();
   const chartHeaderOverlap=Boolean(flowHeader&&flowButton&&flowHeader.top<flowButton.bottom&&flowButton.top<flowHeader.bottom&&flowHeader.right>flowButton.left+1);
   const datagridViewports=[...document.querySelectorAll('.pano-grid .meg-datagrid__viewport')].map(v=>({height:v.getBoundingClientRect().height,rows:v.querySelectorAll('tbody tr, .meg-datagrid-card-row').length}));
   const rootR=root?.getBoundingClientRect();
   const chartR=graph?.getBoundingClientRect();
   const heroR=hero?.getBoundingClientRect();
   return {overflow:document.documentElement.scrollWidth-innerWidth,panels,charts,datagridViewports,
    heroWidth:heroR?.width,chartWidth:chartR?.width,rootWidth:rootR?.width,chartHeaderOverlap,mainOverflow,mainCanScroll,scrollerGeometry,wrappedAmounts,midFillsColumns,actionsLegible,midPanelWidths:midPanels.map(p=>Math.round(p.width)),
    clip:Math.round(Math.max(0,(rootR?.right||0)-innerWidth))};
  });
  const layout=await page.evaluate(()=>{
   const rect=(s)=>document.querySelector(s)?.getBoundingClientRect();
   const spotlight=rect('.pano-spotlight'),hero=rect('.pano-hero'),cards=rect('.pano-cards');
   const kpis=[...document.querySelectorAll('.pano-stat')];
   const valueInsideRight=kpis.every(el=>{
    const icon=el.querySelector('.pano-stat-icon')?.getBoundingClientRect();
    const amount=el.querySelector('strong')?.getBoundingClientRect();
    return Boolean(icon&&amount&&amount.left>=icon.right-1);
   });
   const financialColumn=document.querySelector('.pano-financial-column')?.getBoundingClientRect();
   const spotlightEl=document.querySelector('.pano-spotlight');
   // auto-fit pode expor trilhas colapsadas "0px": não são colunas visuais.
   const tracks=spotlightEl?getComputedStyle(spotlightEl).gridTemplateColumns.trim().split(/\s+/).map(s=>parseFloat(s)).filter(n=>Number.isFinite(n)&&n>1).length:0;
   const isStacked=tracks===1;
   const tightCards=Boolean(cards&&hero&&financialColumn&&(isStacked
    ? cards.top>=financialColumn.bottom-2&&cards.top-financialColumn.bottom<=32&&Math.abs(cards.left-financialColumn.left)<=3
    : tracks===2&&Math.abs(cards.top-financialColumn.top)<=3&&cards.left>=financialColumn.right-2));
   const center=rect('.pano-credit-card'),stage=rect('.pano-card-stage');
   const centered=Boolean(center&&stage&&Math.abs((center.left+center.width/2)-(stage.left+stage.width/2))<=3);
   const peeks=[...document.querySelectorAll('.pano-card-peek')].map(x=>x.getBoundingClientRect());
   const attached=Boolean(center&&stage&&peeks.every(p=>Math.min(center.right,p.right)-Math.max(center.left,p.left)>0));
   const cardNotClipped=Boolean(center&&stage&&center.top>=stage.top+1&&center.bottom<=stage.bottom-1&&center.left>=stage.left-1&&center.right<=stage.right+1);
   const physicalNeighbors=peeks.every(p=>Math.abs(p.width/p.height-1.72)<.12);
   const cardRelative=Boolean(center&&stage&&center.width>=stage.width*.44&&center.width<=stage.width*.66);
   const touchControls=[...document.querySelectorAll('.pano-card-nav>button,.pano-card-indicator button,.pano-balance-top button')].every(el=>{const b=el.getBoundingClientRect();return b.width>=42&&b.height>=42});
   return {valueInsideRight,tightCards,centered,attached,cardNotClipped,physicalNeighbors,cardRelative,touchControls,spotlightWidth:spotlight?.width,heroHeight:hero?.height,cardsHeight:cards?.height};
  });
  if(!layout.valueInsideRight||!layout.tightCards||!layout.centered||!layout.attached||!layout.cardNotClipped||!layout.physicalNeighbors||!layout.cardRelative||!layout.touchControls)failed=true;
  console.log(name+' COMPOSITION',JSON.stringify(layout));
  await page.screenshot({path:join(dir,name+'.png'),fullPage:true});
  await page.locator('.meg-main').evaluate((element)=>{element.scrollTop=element.scrollHeight});
  await page.waitForTimeout(250);
  const scroll=await page.locator('.meg-main').evaluate(element=>({top:element.scrollTop,client:element.clientHeight,content:element.scrollHeight}));
  console.log(name+' vertical-scroll',JSON.stringify(scroll));
  if(width<=639 && (scroll.content<=scroll.client+120 || scroll.top<100))failed=true;
  await page.screenshot({path:join(dir,name+'-bottom.png')});
  await page.locator('.meg-main').evaluate((element)=>{element.scrollTop=0});
  const safe=result.overflow<=1&&result.clip<=1&&!result.mainOverflow&&(width>639||result.mainCanScroll)&&result.scrollerGeometry&&!result.chartHeaderOverlap&&result.wrappedAmounts.length===0&&result.midFillsColumns&&result.actionsLegible&&result.panels===4&&result.charts>=1&&result.heroWidth>0&&result.chartWidth>0&&result.datagridViewports.length===2&&result.datagridViewports.every(x=>x.height>=100&&x.rows>0)&&errors.length===0;
  console.log(name,JSON.stringify({...result,errors,pass:safe}));
  if(!safe)failed=true;
  if(name==='desktop-1672'){
   const filterButton=page.getByRole('button',{name:'Mostrar filtros das movimentações'});
   const initiallyHidden=await page.locator('.pano-grid').first().locator('.meg-datagrid-toolbar').evaluate(el=>getComputedStyle(el).display==='none');
   await filterButton.click();
   const filterOpen=await page.locator('.pano-grid').first().locator('.meg-datagrid-toolbar').evaluate(el=>getComputedStyle(el).display!=='none');
   await page.getByRole('button',{name:'Ocultar filtros das movimentações'}).click();
   const filterClosed=await page.locator('.pano-grid').first().locator('.meg-datagrid-toolbar').evaluate(el=>getComputedStyle(el).display==='none');
   const heroOffsetBefore=await page.locator('.pano-hero').evaluate(el=>el.offsetTop);
   await page.getByRole('button',{name:'Abrir relatórios financeiros'}).click();
   const noticeVisible=await page.locator('.pano-notice').isVisible();
   const heroOffsetAfter=await page.locator('.pano-hero').evaluate(el=>el.offsetTop);
   const noLayoutShift=heroOffsetBefore===heroOffsetAfter;
   await page.getByRole('button',{name:'Fechar aviso'}).click();
   const nextCardPreview=await page.locator('.pano-card-peek.is-next .pano-card-peek-name').textContent();
   const itemBefore=await page.locator('.pano-credit-card-name').textContent();
   const schemeBefore=await page.locator('.pano-credit-card .pano-scheme').getAttribute('aria-label');
   await page.locator('.pano-card-nav').getByRole('button',{name:'Próximo cartão'}).click();
   const itemAfter=await page.locator('.pano-credit-card-name').textContent();
   const schemeAfter=await page.locator('.pano-credit-card .pano-scheme').getAttribute('aria-label');
   await page.locator('.pano-credit-card').click();
   const details=await page.getByRole('region',{name:'Detalhes do cartão'}).isVisible();
   // Loop real: último > primeiro e primeiro > último; os previews também acompanham.
   const firstName=itemBefore;
   await page.getByRole('button',{name:'Próximo cartão',exact:true}).click();
   const lastName=await page.locator('.pano-credit-card-name').textContent();
   const lastNextPreview=await page.locator('.pano-card-peek.is-next .pano-card-peek-name').textContent();
   const lastNavEnabled=await page.getByRole('button',{name:'Próximo cartão',exact:true}).isEnabled();
   await page.getByRole('button',{name:'Próximo cartão',exact:true}).click();
   const afterWrapName=await page.locator('.pano-credit-card-name').textContent();
   const firstPrevPreview=await page.locator('.pano-card-peek.is-prev .pano-card-peek-name').textContent();
   await page.getByRole('button',{name:'Cartão anterior',exact:true}).click();
   const afterReverseWrapName=await page.locator('.pano-credit-card-name').textContent();
   const firstPrevEnabled=await page.getByRole('button',{name:'Cartão anterior',exact:true}).isEnabled();
   const circularLoop=lastNextPreview===firstName&&lastNavEnabled&&afterWrapName===firstName&&firstPrevPreview===lastName&&afterReverseWrapName===lastName&&firstPrevEnabled;
   const geometry=await page.locator('.pano-stat').evaluateAll(nodes=>nodes.map(node=>{
    const icon=node.querySelector('.pano-stat-icon')?.getBoundingClientRect();
    const value=node.querySelector('strong')?.getBoundingClientRect();
    const box=node.getBoundingClientRect();
    return {height:box.height,aligned:icon&&value?value.left>=icon.right-1:false};
   }));
   const compactKpis=geometry.every(g=>g.aligned&&g.height<=125);
   await page.locator('.pano-stat.is-income').click();
   const incomeFocused=await page.getByText('Últimas receitas').isVisible();
   await page.getByRole('button',{name:'Limpar seleção'}).click();
   const restored=await page.getByText('Últimas movimentações').isVisible();
   const passed=initiallyHidden&&filterOpen&&filterClosed&&nextCardPreview===itemAfter&&noticeVisible&&noLayoutShift&&itemBefore!==itemAfter&&schemeBefore==='Visa'&&schemeAfter==='Mastercard'&&details&&circularLoop&&compactKpis&&incomeFocused&&restored;
   console.log('INTERACTIONS',JSON.stringify({initiallyHidden,filterOpen,filterClosed,itemBefore,itemAfter,schemeBefore,schemeAfter,nextCardPreview,noticeVisible,noLayoutShift,details,circularLoop,compactKpis,geometry,incomeFocused,restored,passed}));
   if(!passed)failed=true;
  }
  if(name==='mobile-390'){
   await page.getByRole('button',{name:'Ocultar valores'}).click();
   const privacy=await page.locator('.pano-chart-placeholder').count()===1;
   console.log('privacy',privacy);
   if(!privacy)failed=true;
  }
  await page.close();
 }
}finally{await browser.close()}
if(failed)process.exitCode=1;
