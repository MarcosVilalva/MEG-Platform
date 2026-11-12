import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from '@playwright/test';

const dir='artifacts/meg-stage10-type-chooser';
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||(existsSync('/usr/bin/google-chrome')?'/usr/bin/google-chrome':undefined),args:['--no-sandbox']});
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
  // QA visual do seletor: o alerta canônico da Home já foi apresentado
  // nesta sessão sintética. Não altera a lógica real de notificações.
  await page.addInitScript(()=>{
   const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
   const get=(k)=>parts.find(p=>p.type===k)?.value||'00';
   sessionStorage.setItem('meg-due-entry-alert:qa-preview:'+get('year')+get('month')+get('day'),'1');
  });
  await page.goto(base+'/meg-stage10-qa.html',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Abrir seleção de tipo'}).click();
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
  const heading=await page.locator('.meg-stage10-intro h3').innerText();
  assert.match(heading,/Mais controle\s+para o seu\s+dia a dia/,'Título deve preservar separação entre palavras em qualquer viewport');
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
 // O aviso canônico da Home tem prioridade até o usuário fechá-lo.
 // Só então o seletor Novo pode ser aberto: jamais duas capturas de foco simultâneas.
 const competing=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await competing.route('**/*',route=>{
  const url=route.request().url();
  if(url.startsWith(base)||url.startsWith('data:'))return route.continue();
  return route.abort();
 });
 await competing.goto(base+'/meg-stage10-qa.html',{waitUntil:'domcontentloaded'});
 const alertClose=competing.getByRole('button',{name:'Fechar alerta de vencimentos'});
 await alertClose.waitFor({state:'visible'});
 await alertClose.click();
 await competing.getByRole('button',{name:'Abrir seleção de tipo'}).click();
 await competing.locator('[data-stage10-chooser]').waitFor();
 const sequence=await competing.evaluate(()=>({
  focus:document.activeElement?.getAttribute('aria-label'),
  modal:document.querySelector('[data-stage10-chooser]')!==null,
 }));
 assert.equal(sequence.modal,true,'Novo deve abrir após fechar aviso da Home');
 assert.equal(sequence.focus,'Fechar','Foco inicial correto sem dois dialogs simultâneos');
 reports.push({scenario:'home-alert-dismiss-then-chooser',...sequence});
 await competing.close();
 writeFileSync(`${dir}/report.json`,JSON.stringify(reports,null,2));
}finally{await browser.close();}
