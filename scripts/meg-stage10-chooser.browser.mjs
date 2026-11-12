import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';

const dir='artifacts/meg-stage10-type-chooser';
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
const base=process.env.MEG_STAGE10_QA_URL||'http://127.0.0.1:4173';
const viewports=[[390,844],[768,1024],[1366,768],[1920,1080]];
const reports=[];
try{
 for(const [width,height] of viewports){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const mutationAttempts=[];
  await page.route('**/*',route=>{
   const url=route.request().url();
   const method=route.request().method();
   if(!['GET','HEAD','OPTIONS'].includes(method))mutationAttempts.push({method,url});
   if(url.startsWith(base)||url.startsWith('data:'))return route.continue();
   return route.abort();
  });
  await page.goto(base+'/meg-stage10-qa.html',{waitUntil:'domcontentloaded'});
  await page.locator('[data-stage10-chooser]').waitFor();
  const optionCount=await page.locator('.meg-stage10-choice').count();
  assert.equal(optionCount,4,'Quatro opções obrigatórias');
  const state=await page.evaluate(()=>{
   const modal=document.querySelector('.meg-stage10-modal');
   const backdrop=document.querySelector('.meg-stage10-backdrop');
   if(!modal||!backdrop)throw Error('MODAL_NOT_MOUNTED');
   const r=modal.getBoundingClientRect();
   const viewportWidth=document.documentElement.clientWidth;
   return {
    modal:{x:r.x,y:r.y,width:r.width,height:r.height},
    viewport:{width:innerWidth,height:innerHeight},
    documentOverflowX:document.documentElement.scrollWidth>viewportWidth+1,
    backdropOverflowX:backdrop.scrollWidth>backdrop.clientWidth+1,
    focusLabel:document.activeElement?.getAttribute('aria-label')||null,
    optionLabels:Array.from(document.querySelectorAll('.meg-stage10-choice-text strong')).map(x=>x.textContent),
   };
  });
  assert.equal(state.documentOverflowX,false,'Página não pode rolar horizontalmente');
  assert.equal(state.backdropOverflowX,false,'Máscara não pode rolar horizontalmente');
  assert.ok(state.modal.x>=-1&&state.modal.x+state.modal.width<=width+1,'Modal deve caber no viewport');
  assert.equal(state.focusLabel,'Fechar','Foco inicial do diálogo');
  assert.deepEqual(state.optionLabels,['Despesa','Receita','Transferência','Benefício']);
  await page.screenshot({path:`${dir}/chooser-${width}x${height}.png`,fullPage:true});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-stage10-chooser]').count(),0,'Escape fecha diálogo');
  await page.getByRole('button',{name:'Abrir seleção de tipo'}).click();
  await page.locator('[data-stage10-chooser]').waitFor();
  await page.getByRole('button',{name:/Despesa Saídas/}).click();
  assert.equal(await page.locator('[data-stage10-chooser]').count(),0,'Escolha fecha seletor para o próximo fluxo');
  assert.equal(mutationAttempts.length,0,'QA não pode executar requisições de escrita');
  reports.push({width,height,...state,mutations:mutationAttempts.length});
  await page.close();
 }
 writeFileSync(`${dir}/report.json`,JSON.stringify(reports,null,2));
}finally{await browser.close();}
