import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

/** Entirely synthetic browser characterization, never touches Supabase or real API. */
const base=process.env.MEG_STAGE10_PRISM_TEST_BASE||'http://127.0.0.1:4175';
const baseHost=new URL(base).host;
const evidence=resolve('artifacts/meg-stage10-prism-real-read-optin');
mkdirSync(evidence,{recursive:true});
const month=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'})
 .formatToParts(new Date());
const year=month.find(x=>x.type==='year').value;
const mon=month.find(x=>x.type==='month').value;
const monthKey=year+'-'+mon;
const day=monthKey+'-12';
const item={
 id:'ci-contract-event-e1',
 description:'MERCADO DO CONTRATO E2E',
 type:'expense',status:'paid',date:day+'T12:00:00.000Z',
 competence:monthKey,amount:'123.45',signedAmount:'-123.45',
 notes:'SOMENTE TESTE SINTETICO',accountId:'acc-checking',categoryId:'cat-food',
 paymentMethodId:'pay-instant',sourcePayload:null,
 account:{id:'acc-checking',name:'Conta teste',type:'checking'},
 category:{id:'cat-food',name:'Alimentação',group:'Consumo'},
 paymentMethod:{id:'pay-instant',name:'PIX',type:'instant'}
};
const sessionUser={
 id:'ci-user-1',name:'Usuário CI',email:'ci@local.invalid',
 role:'ADMIN',status:'ACTIVE',isActive:true
};
const session={
 user:sessionUser,accessToken:'synthetic-ci-only',
 refreshToken:'synthetic-ci-refresh-only',refreshExpiresAt:'2099-01-01T00:00:00Z'
};
const priorHistory={...item,id:'ci-prior-month-event',description:'MERCADO ANTERIOR',date:'2026-10-08T12:00:00.000Z',competence:'2026-10',amount:'89.00',signedAmount:'-89.00'};
const priorYearHistory={...item,id:'ci-prior-year-event',description:'MERCADO OUTRO ANO',date:'2025-12-19T12:00:00.000Z',competence:'2025-12',amount:'49.01',signedAmount:'-49.01'};
const endpoints=(path,monthAsked=monthKey,search='',rawFilter='')=>{
 if(path==='/auth/me')return {user:sessionUser};
 if(path==='/finance/sync-status')return {
  token:'synthetic-consistent-version-v1',
  capabilities:{historySnapshotV1:true,filteredSummaryV1:true}
 };
 if(path==='/finance/events/month'){const rows=monthAsked===monthKey?[item]:monthAsked==='2026-10'?[priorHistory]:monthAsked==='2025-12'?[priorYearHistory]:[];return {items:rows,total:rows.length,page:1,pageSize:rows.length};}
 if(path==='/finance/events'&&search.trim())return {items:[priorHistory],total:1,page:1,pageSize:100};
 if(path==='/finance/events/history-snapshot')return {
  protocol:'financial-history-v1',kind:'complete',
  consistency:'repeatable-read',total:3,items:[item,priorHistory,priorYearHistory]
 };
 if(path==='/finance/events/filtered-summary'){
  const filters=JSON.parse(rawFilter);
  const c=filters.criteria;
  const relevant=[item,priorHistory,priorYearHistory].filter(row=>{
   const day=row.date.slice(0,10);
   return (!c.start||day>=c.start)&&(!c.end||day<=c.end)&&
    (c.kind==='all'||row.type===c.kind)&&
    (c.category==='all'||row.categoryId===c.category)&&
    (c.account==='all'||row.accountId===c.account)&&
    (c.paymentMethod==='all'||row.paymentMethod?.name===c.paymentMethod)&&
    (!c.search||row.description.toLocaleLowerCase('pt-BR').includes(c.search.toLocaleLowerCase('pt-BR')));
  });
  const expense=relevant.reduce((sum,row)=>sum+Number(row.amount),0);
  return {kind:'complete',protocol:'financial-filter-summary-v1',consistency:'repeatable-read',
   total:3,filteredCount:relevant.length,income:0,expense,
   projectedResult:-expense,realizedResult:-expense};
 }
 if(path==='/finance/summary')return {
  month:monthAsked,availableBalance:900,income:0,expense:monthAsked===monthKey?123.45:0,
  projectedResult:-123.45,realizedIncome:0,realizedExpense:123.45,
  realizedResult:-123.45,eventCount:1,pendingCount:0,pendingAmount:0,
  nextDue:null,topCategories:[]
 };
 if(path==='/finance/accounts')return [
  {id:'acc-checking',name:'Conta teste',type:'checking',isActive:true,openingBalance:'1000.00'},
  {id:'acc-benefit',name:'Benefício teste',type:'benefit',isActive:true,openingBalance:'100.00'}
 ];
 if(path==='/finance/cashflow')return {month:monthAsked,days:[]};
 if(path==='/finance/benefit-summary')return {month:monthAsked,balance:100,credits:20,used:5};
 if(path==='/finance/categories')return [
  {id:'cat-food',name:'Alimentação',group:'Consumo',isActive:true}
 ];
 if(path==='/finance/payment-methods')return [
  {id:'pay-instant',name:'PIX',type:'instant',isActive:true}
 ];
 if(path==='/cards')return [
  {id:'ci-card-1',name:'Cartão CI',isActive:true,closingDay:25,dueDay:5}
 ];
 return undefined;
};
const browser=await chromium.launch({
 headless:true,executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome',
 args:['--no-sandbox'],
});
const viewports=[[320,700],[390,844],[640,900],[960,900],[1024,768],[1366,768],[820,360],[1024,450],[1920,1080],[2560,1440]];
try{
 for(const [width,height] of viewports){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await context.addInitScript(s=>{
   sessionStorage.setItem('meg.auth.session',JSON.stringify(s));
  },session);
  const page=await context.newPage();
  const attemptedWrites=[];
  const unknownApi=[];
  const externalHosts=[];
  const errors=[];
  let historySearchRequests=0;
  let snapshotReads=0;
  const homeSummaryMonths=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',req=>{
   const url=new URL(req.url());
   if(url.host!==baseHost&&['fetch','xhr'].includes(req.resourceType()))externalHosts.push(req.url());
  });
  await page.route('**/*',async route=>{
   const req=route.request();
   const url=new URL(req.url());
   if(url.host!==baseHost){await route.abort();return;}
   if(!/^\/(auth|finance|cards|payables)(\/|$)/.test(url.pathname)){
    await route.continue();return;
   }
   if(req.method()!=='GET'){
    attemptedWrites.push(req.method()+' '+url.pathname);
    await route.fulfill({status:405,contentType:'application/json',body:JSON.stringify({error:'SYNTHETIC_READ_ONLY'})});
    return;
   }
   if(url.pathname==='/finance/events'&&url.searchParams.get('search'))historySearchRequests++;
   if(/^\/(finance|cards)(\/|$)/.test(url.pathname)&&req.headers()['authorization']!=='Bearer synthetic-ci-only')errors.push('Authorization missing from authenticated finance request');
   if(url.pathname==='/finance/events/history-snapshot')snapshotReads++;
   if(url.pathname==='/finance/summary')homeSummaryMonths.push(url.searchParams.get('month'));

   const value=endpoints(url.pathname,url.searchParams.get('month')||monthKey,url.searchParams.get('search')||'',url.searchParams.get('filter')||'');
   if(value===undefined){
    if(url.pathname==='/finance/home-commitments'||url.pathname==='/finance/home-available'){
     await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'CANONICAL_ROUTE_NOT_DEPLOYED'})});
     return;
    }
    unknownApi.push(url.pathname);
    await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'SYNTHETIC_UNKNOWN_ROUTE'})});
    return;
   }
   await route.fulfill({status:200,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify(value)});
  });
  try{
   // A entrada, inclusive com link antigo apontando para Lançamentos, abre sempre na Home.
   await page.goto(base+'/web-evolution.html?tela=lancamentos',{waitUntil:'domcontentloaded'});
   await page.locator('.pano-root').waitFor({state:'visible',timeout:20000});
   assert.equal(await page.locator('[data-meg-operational-prism="read-only"]').count(),0,
    'Authenticated entry must start on Home');
   const headerPicker=page.getByRole('button',{name:'Selecionar período'});
   await headerPicker.waitFor({state:'visible'});
   assert.equal(await headerPicker.isEnabled(),true,'Topbar period control must be active');
   await page.screenshot({path:resolve(evidence,'home-entry-'+width+'x'+height+'.png'),fullPage:false});
   if(width===390||width===1366){
    await headerPicker.click();
    const picker=page.getByLabel('Mês do painel');
    await picker.waitFor({state:'visible'});
    await picker.fill('2025-12');
    await page.waitForFunction(()=>document.querySelector('.meg-period')?.textContent?.includes('Dezembro de 2025'),null,{timeout:20000});
    await page.getByRole('button',{name:/Despesas: R\\$\\s*0,00/}).waitFor({state:'visible',timeout:20000});
    assert.ok(homeSummaryMonths.includes('2025-12'),'Home must ask API for selected month');
    await page.screenshot({path:resolve(evidence,'home-period-2025-12-'+width+'x'+height+'.png'),fullPage:false});
    await headerPicker.click();
    await page.getByLabel('Mês do painel').fill(monthKey);
    await page.getByRole('button',{name:/Despesas: R\\$\\s*123,45/}).waitFor({state:'visible',timeout:20000});
    assert.ok(homeSummaryMonths.includes(monthKey),'Home must restore current month via API');
   }
   const homeWidth=await page.evaluate(()=>({page:document.documentElement.scrollWidth,view:window.innerWidth}));
   assert.ok(homeWidth.page<=homeWidth.view+1,'Horizontal overflow in Home '+width+'px: '+JSON.stringify(homeWidth));
   if(width<640)await page.getByRole('button',{name:'Abrir menu'}).click();
   await page.getByRole('button',{name:'Lançamentos',exact:true}).click();
   await page.locator('[data-meg-operational-prism="read-only"]').waitFor({timeout:20000});
   await page.locator('.meg-l09-open-row:visible').filter({hasText:item.description}).first().waitFor({state:'visible',timeout:20000});
   assert.equal(await page.locator('.meg-l09').count()>0,true,'Canonical stage09 grid missing');
   assert.equal(await page.locator('[data-testid="qa-batch-action"]').count(),0,'Batch writer control must remain absent');
   await page.getByLabel('Mês de referência').waitFor({state:'visible'});
   await page.getByLabel('Data inicial').waitFor({state:'visible'});
   await page.getByLabel('Data final').waitFor({state:'visible'});
   assert.equal(errors.length,0,'Unexpected page errors '+JSON.stringify(errors));
   const layoutWidth=await page.evaluate(()=>({page:document.documentElement.scrollWidth,view:window.innerWidth}));
   assert.ok(layoutWidth.page<=layoutWidth.view+1,'Horizontal overflow in '+width+'px: '+JSON.stringify(layoutWidth));
   await page.screenshot({path:resolve(evidence,'launches-'+width+'x'+height+'.png'),fullPage:false});
   if(width===1366){
    const periodInput=page.getByLabel('Mês de referência');
    await periodInput.fill('2026-10');
    await page.waitForFunction(()=>document.body.textContent?.includes('Outubro de 2026'),null,{timeout:20000});
    await periodInput.fill(monthKey);
    await page.locator('.meg-l09-open-row:visible').filter({hasText:item.description}).first().waitFor({state:'visible',timeout:20000});
    const selection=page.getByLabel('Abrangência do período');
    await selection.selectOption('year');
    const annualYear=page.getByLabel('Ano de referência');
    await annualYear.fill('2025');
    await page.locator('.meg-l09-open-row:visible').filter({hasText:priorYearHistory.description}).first().waitFor({state:'visible',timeout:20000});
    await annualYear.fill('2026');
    await page.locator('.meg-l09-open-row:visible').filter({hasText:priorHistory.description}).first().waitFor({state:'visible',timeout:20000});
    assert.equal(snapshotReads,1,'Year must use one consistent snapshot, not double paging');
    await selection.selectOption('all');
    await page.locator('.meg-l09-open-row:visible').filter({hasText:priorYearHistory.description}).first().waitFor({state:'visible',timeout:20000});
    assert.equal(snapshotReads,1,'All-history must reuse current revision snapshot');
    const waitCanonicalExpense=async(expected)=>{
     await page.waitForFunction(value=>[...document.querySelectorAll('.meg-l09-stat.is-expense strong')]
      .some(node=>node.textContent?.replace(/\\s/g,'').includes(value)),expected,{timeout:20000});
    };
    await waitCanonicalExpense('261,46');
    const search=page.getByPlaceholder('Buscar lançamentos...');
    await search.fill('OUTRO ANO');
    await page.locator('.meg-l09-open-row:visible').filter({hasText:priorYearHistory.description}).first().waitFor({state:'visible',timeout:20000});
    await waitCanonicalExpense('49,01');
    await search.fill('');
    await waitCanonicalExpense('261,46');
    await selection.selectOption('range');
    await page.getByLabel('Período inicial').fill('2025-12-01');
    await page.locator('.meg-l09-open-row:visible').filter({hasText:priorYearHistory.description}).first().waitFor({state:'visible',timeout:20000});
    assert.equal(snapshotReads,1,'Range must reuse verified snapshot');
    await selection.selectOption('month');
    await page.locator('.meg-l09-open-row:visible').filter({hasText:item.description}).first().waitFor({state:'visible',timeout:20000});
    const action=page.getByRole('button',{name:'Ações de '+item.description}).first();
    await action.click();
    const menu=page.getByRole('menu',{name:'Ações de '+item.description});
    await menu.waitFor({state:'visible'});
    for(const name of ['Duplicar como rascunho','Confirmar pagamento','Arquivar lançamento']){
     assert.equal(await menu.getByRole('menuitem',{name}).isDisabled(),true,'Mutation menu must be disabled: '+name);
    }
    await menu.getByRole('menuitem',{name:'Editar lançamento'}).click();
    const editor=page.getByTestId('stage10-edit-preview');
    await editor.waitFor({state:'visible'});
    assert.equal(await editor.getByLabel('Descrição da edição').inputValue(),item.description);
    assert.equal(await editor.getByRole('button',{name:'Salvar alterações'}).isDisabled(),true);
    assert.match(await editor.innerText(),/Dados reais consultados/);
    await page.screenshot({path:resolve(evidence,'edit-readonly-'+width+'x'+height+'.png'),fullPage:false});
    await editor.getByRole('button',{name:'Fechar edição'}).click();
    const createButton=page.locator('.meg-l09-hero-actions .meg-l09-add:visible');
    assert.equal(await createButton.count(),1,'Operational stage10 Create button must be unique');
    await createButton.click();
    const choice=page.locator('.meg-unified-choice-overlay [role="dialog"]');
    await choice.waitFor({state:'visible'});
    await choice.getByRole('button',{name:/Escolher Despesa/}).click();
    const form=page.getByRole('dialog',{name:'Novo lançamento'});
    await form.waitFor({state:'visible'});
    assert.equal(historySearchRequests,0,'Initial month load must not fetch lifetime history');
    await form.getByPlaceholder('DESCREVA A DESPESA').fill('MERCADO');
    const suggestions=page.getByRole('listbox',{name:'Descrições do histórico'});
    const older=suggestions.getByRole('option',{name:/MERCADO ANTERIOR/});
    await older.waitFor({state:'visible',timeout:20000});
    await older.click();
    assert.equal(await form.getByPlaceholder('DESCREVA A DESPESA').inputValue(),'MERCADO ANTERIOR');
    assert.equal(await form.getByPlaceholder('DD/MM/AAAA').inputValue(),'','Autocomplete must never copy historical date');
    assert.ok(historySearchRequests>=2,'Historical search must validate two complete passes on demand');
    assert.equal(await form.getByRole('button',{name:'Salvar lançamento'}).isDisabled(),true);
    await page.screenshot({path:resolve(evidence,'new-readonly-'+width+'x'+height+'.png'),fullPage:false});
    await page.goto(base+'/web-evolution.html?tela=home',{waitUntil:'domcontentloaded'});
    await page.locator('.pano-root').waitFor({state:'visible',timeout:20000});
    await page.getByText('Meus cartões',{exact:true}).waitFor({state:'visible'});
    await page.getByText(/Compromissos ainda não disponíveis na API canônica/).waitFor({state:'visible'});
    await page.screenshot({path:resolve(evidence,'home-canonical-404-'+width+'x'+height+'.png'),fullPage:false});
   }
   assert.equal(attemptedWrites.length,0,'Unexpected POST/PATCH/DELETE: '+attemptedWrites);
   assert.equal(unknownApi.length,0,'Unexpected API reads: '+unknownApi);
   assert.equal(externalHosts.length,0,'Third-party browser requests: '+externalHosts);
   console.log('MEG_STAGE10_PRISM_E2E_VIEWPORT_PASS '+width+'x'+height);
  }catch(error){
   await page.screenshot({path:resolve(evidence,'failure-'+width+'x'+height+'.png'),fullPage:false}).catch(()=>{});
   console.error('VIEWPORT_FAILED '+width+'x'+height+' requests='+JSON.stringify({attemptedWrites,unknownApi,externalHosts,errors}));
   throw error;
  }finally{await context.close();}
 }
 console.log('MEG_STAGE10_PRISM_SYNTHETIC_BROWSER_PASS');
}finally{await browser.close();}
