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
const endpoints=(path)=>{
 if(path==='/auth/me')return {user:sessionUser};
 if(path==='/finance/sync-status')return {
  token:'synthetic-consistent-version-v1',
  capabilities:{historySnapshotV1:true,filteredSummaryV1:false}
 };
 if(path==='/finance/events/history-snapshot')return {
  protocol:'financial-history-v1',kind:'complete',
  consistency:'repeatable-read',total:1,items:[item]
 };
 if(path==='/finance/summary')return {
  month:monthKey,availableBalance:900,income:0,expense:123.45,
  projectedResult:-123.45,realizedIncome:0,realizedExpense:123.45,
  realizedResult:-123.45,eventCount:1,pendingCount:0,pendingAmount:0,
  nextDue:null,topCategories:[]
 };
 if(path==='/finance/accounts')return [
  {id:'acc-checking',name:'Conta teste',type:'checking',isActive:true,openingBalance:'1000.00'},
  {id:'acc-benefit',name:'Benefício teste',type:'benefit',isActive:true,openingBalance:'100.00'}
 ];
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
const viewports=[[390,844],[640,900],[960,900],[1024,768],[1366,768],[820,360],[1024,450],[1920,1080]];
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
   const value=endpoints(url.pathname);
   if(value===undefined){
    unknownApi.push(url.pathname);
    await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'SYNTHETIC_UNKNOWN_ROUTE'})});
    return;
   }
   await route.fulfill({status:200,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify(value)});
  });
  try{
   await page.goto(base+'/web-evolution.html',{waitUntil:'domcontentloaded'});
   await page.locator('[data-meg-operational-prism="read-only"]').waitFor({timeout:20000});
   await page.locator('.meg-l09-open-row:visible').filter({hasText:item.description}).first().waitFor({state:'visible',timeout:20000});
   assert.equal(await page.locator('.meg-l09').count()>0,true,'Canonical stage09 grid missing');
   assert.equal(await page.locator('[data-testid="qa-batch-action"]').count(),0,'Batch writer control must remain absent');
   assert.equal(errors.length,0,'Unexpected page errors '+JSON.stringify(errors));
   await page.screenshot({path:resolve(evidence,'launches-'+width+'x'+height+'.png'),fullPage:false});
   if(width===1366){
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
    assert.equal(await form.getByRole('button',{name:'Salvar lançamento'}).isDisabled(),true);
    await page.screenshot({path:resolve(evidence,'new-readonly-'+width+'x'+height+'.png'),fullPage:false});
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
