import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.MEG_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('apps/web/dist'),artifacts=path.resolve(process.env.MEG_QA_DIR||'artifacts/evolution-system');
fs.mkdirSync(artifacts,{recursive:true});
const month='2026-10',account={id:'main',name:'Conta Monetária Principal',type:'CHECKING',openingBalance:0,isActive:true},benefitAccount={id:'benefit',name:'Verocard Alimentação',type:'BENEFIT',openingBalance:0,isActive:true},destination={...account,id:'bank',name:'Banco do Brasil'};
const pix={id:'pix',name:'Pix',type:'PIX',isActive:true},verocard={id:'verocard',name:'VEROCARD',type:'BENEFIT',isActive:true},category={id:'market',name:'Supermercado',type:'expense',isActive:true},incomeCategory={id:'salary',name:'Receitas',type:'income',isActive:true};
const event=(id,amount,status='paid',benefit=false)=>({id,description:id==='pending'?'Conta pendente':id==='salary'?'Salário':benefit?'VEROCARD ALIMENTAÇÃO':'Supermercado',type:amount>0?'income':'expense',status,date:'2026-10-02',competence:month,amount:Math.abs(amount),signedAmount:amount,accountId:benefit?'benefit':'main',account:benefit?benefitAccount:account,paymentMethodId:benefit?'verocard':'pix',paymentMethod:benefit?verocard:pix,categoryId:amount>0?'salary':'market',category:amount>0?incomeCategory:category});
const events=[event('salary',4850),event('expense',-342.5),event('pending',-125,'planned'),event('benefit-expense',-90,'paid',true)];
const summary={month,availableBalance:3049.15,income:4850,expense:342.5,projectedResult:4507.5,realizedIncome:4850,realizedExpense:342.5,realizedResult:4507.5,eventCount:events.length,pendingCount:1,pendingAmount:125,topCategories:[{name:'Supermercado',amount:342.5}]};
const benefit={month,balance:1436.52,credits:2000,used:563.48};
const card={id:'latam',name:'LATAM Pass',lastFour:'5934',brand:'Mastercard',isActive:true,creditLimit:10000,usedLimit:125,availableLimit:9875,closingDay:2,dueDay:10,statementAmount:125,statement:{month,dueDate:'2026-10-10',charges:125,credits:0,netAmount:125,openCharges:125,openCredits:0,openNetAmount:125,payableAmount:125,creditBalance:0,status:'open',lines:[]},purchases:[]};
let balance=3049.15,transferFailures=0;const writes=[],pageErrors=[];
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','application/json');
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.end();return;}
  if(req.method!=='GET'){
    let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}');writes.push({url:url.pathname,body});
    if(url.pathname==='/finance/transfers'&&transferFailures-- >0){res.writeHead(503);res.end(JSON.stringify({error:'NETWORK_RETRY'}));return;}
    if(url.pathname==='/finance/benefit-events'){events.push({...event('new-benefit-credit',body.amount,'paid',true),description:body.description,date:body.date});benefit.balance+=body.amount;benefit.credits+=body.amount;}
    if(url.pathname==='/finance/pending/batch/settle'){events.find(e=>e.id==='pending').status='paid';}
    res.end(JSON.stringify({paid:true,eventId:'confirmed',idempotentReplay:false}));return;
  }
  const routes={
    '/finance/summary':summary,'/finance/analytics':{month,summary,categories:summary.topCategories,monthlyTrend:[],paymentMethods:[],previous:{month,income:0,expense:0,result:0},delta:{income:0,expense:0,result:0},dailyAverageExpense:0,concentrationTop3:0},
    '/finance/benefit-summary':benefit,'/finance/cashflow':{month,openingBalance:0,projectedClosing:3049.15,realizedClosing:3049.15,totalIncome:4850,totalExpense:342.5,days:[{date:'2026-10-02',income:4850,expense:342.5,net:4507.5,realizedBalance:3049.15,projectedBalance:3049.15,eventCount:4}]},
    '/finance/events/month':{items:events,total:events.length,page:1,pageSize:events.length},'/finance/events':{items:events,total:events.length,page:1,pageSize:events.length},'/finance/accounts':[account,destination,benefitAccount],'/finance/categories':[category,incomeCategory],'/finance/payment-methods':[pix,verocard],'/cards':[card],'/payables':[],
    '/finance/sync-status':{token:'test',changedAt:null},'/finance/monetary-balance':{accountId:account.id,date:url.searchParams.get('date'),available:balance}
  };
  if(url.pathname in routes){res.end(JSON.stringify(routes[url.pathname]));return;}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('{}');return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.MEG_CHROMIUM_PATH?{executablePath:process.env.MEG_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']}:{} )});
try{
  const context=await browser.newContext({locale:'pt-BR',viewport:{width:1672,height:941}});
  await context.addInitScript(()=>sessionStorage.setItem('meg.auth.session',JSON.stringify({accessToken:'mock-only',refreshToken:'mock-only',refreshExpiresAt:'2099-01-01T00:00:00Z',user:{id:'mock',name:'Marcos de Andrade Vilalva',email:'test@example.invalid',role:'ADMIN',status:'ACTIVE',isActive:true}})));
  const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
  // API_URL pode apontar para produção em um build de teste; nenhuma requisição externa sai do mock.
  await page.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.origin===base)return route.continue();const result=await context.request.fetch(base+url.pathname+url.search,{method:request.method(),headers:{'Content-Type':'application/json'},data:request.postData()||undefined});return route.fulfill({response:result});});
  await page.goto(base+'/evolution.html?screen=system&month='+month);await page.getByRole('heading',{name:'Saldo disponível',exact:true}).waitFor();
  assert.equal(await page.getByText('Prévia visual · dados ilustrativos').count(),0);
  for(const viewport of [{width:1672,height:941},{width:1366,height:768},{width:430,height:932}]){
    await page.setViewportSize(viewport);
    for(const view of ['home','movements','payables','cards','benefit','analytics','cashflow','settings']){
      await page.goto(base+'/evolution.html?screen=system&view='+view+'&month='+month);await page.locator('.meg-page-content').waitFor();
      const sizes=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,iw:innerWidth,ih:innerHeight}));assert.ok(sizes.w<=sizes.iw&&sizes.h<=sizes.ih,'Rolagem geral em '+view+' '+JSON.stringify(sizes));
      await page.screenshot({path:path.join(artifacts,view+'-'+viewport.width+'x'+viewport.height+'.png')});
    }
  }
  for(const viewport of [{width:1672,height:941},{width:430,height:932}]){
    await page.setViewportSize(viewport);
    for(const preview of ['settlement','card-center','period','transfer','card-payment','edit-launch','benefit-recharge','launch']){
      await page.goto(base+'/evolution.html?screen=preview&preview='+preview);await page.locator('.meg-page-content').waitFor();await page.screenshot({path:path.join(artifacts,'preview-'+preview+'-'+viewport.width+'.png')});
    }
    for(const screen of ['login','loading']){
      await page.goto(base+'/evolution.html?screen='+screen);await page.screenshot({path:path.join(artifacts,screen+'-'+viewport.width+'.png')});
    }
  }
  await page.setViewportSize({width:1672,height:941});
  await page.goto(base+'/evolution.html?screen=system&view=movements&month='+month);await page.locator('.meg-page-content').waitFor();await page.getByRole('button',{name:'Benefício',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),1);
  await page.getByRole('button',{name:'Todos',exact:true}).click();await page.locator('input[type=date]').first().fill('2026-10-03');assert.equal(await page.locator('tbody tr').count(),0);
  // Saldo zero bloqueia a baixa, mantendo data escolhida e faltante explícito.
  balance=0;await page.goto(base+'/evolution.html?screen=system&view=payables&month='+month);await page.getByText('Conta pendente',{exact:true}).waitFor();await page.locator('.meg-pending-row').filter({hasText:'Conta pendente'}).locator('input').check();await page.getByRole('button',{name:'Pagar selecionados',exact:true}).first().click();await page.getByText('Saldo insuficiente. Faltam R$ 125,00',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Confirmar pagamento',exact:true}).isDisabled(),true);assert.equal(writes.length,0);await page.screenshot({path:path.join(artifacts,'settlement-insufficient.png')});await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  balance=3049.15;await page.getByRole('button',{name:'Pagar selecionados',exact:true}).first().click();await page.getByText('Saldo disponível: R$ 3.049,15',{exact:false}).waitFor();await page.locator('.meg-dialog input[type=date]').fill('2026-10-02');await page.getByRole('button',{name:'Confirmar pagamento',exact:true}).click();await page.getByRole('heading',{name:'Saldo disponível',exact:true}).waitFor();const batch=writes.find(x=>x.url.endsWith('/pending/batch/settle'));assert.equal(batch.body.paidAt,'2026-10-02');assert.equal(batch.body.items[0].sourceId,'pending');assert.ok(batch.body.operationId);
  // Recarga exclusiva em benefício aparece no histórico depois da confirmação.
  await page.getByRole('button',{name:'Benefícios',exact:true}).click();await page.getByRole('button',{name:'Registrar recarga',exact:true}).first().click();await page.getByLabel('Valor (R$)',{exact:true}).fill('200000');await page.getByRole('button',{name:'Confirmar recarga',exact:true}).click();await page.getByRole('heading',{name:'Saldo disponível',exact:true}).waitFor();const recharge=writes.find(x=>x.url==='/finance/benefit-events');assert.equal(recharge.body.accountId,'benefit');assert.equal(recharge.body.paymentMethodId,'verocard');assert.equal(recharge.body.type,'income');assert.equal(recharge.body.amount,2000);
  await page.getByRole('button',{name:'Benefícios',exact:true}).click();await page.getByText('RECARGA VEROCARD',{exact:true}).waitFor();
  // Repetir exatamente a transferência após falha preserva o identificador.
  transferFailures=1;await page.getByRole('button',{name:'Início',exact:true}).click();await page.getByRole('button',{name:'Transferência Entre suas contas'}).click();await page.getByLabel('Descrição',{exact:true}).fill('TRANSFERÊNCIA TESTE');await page.getByLabel('Valor (R$)',{exact:true}).fill('10000');await page.getByRole('button',{name:'Salvar transferência',exact:true}).click();await page.getByText('NETWORK_RETRY',{exact:true}).waitFor();await page.getByRole('button',{name:'Salvar transferência',exact:true}).click();await page.getByRole('heading',{name:'Saldo disponível',exact:true}).waitFor();const transfers=writes.filter(x=>x.url==='/finance/transfers');assert.equal(transfers.length,2);assert.equal(transfers[0].body.operationId,transfers[1].body.operationId);
  assert.deepEqual(pageErrors,[]);fs.writeFileSync(path.join(artifacts,'smoke-results.json'),JSON.stringify({passed:true,viewports:3,views:8,checks:['sem overflow geral','filtros de tipo e data','saldo insuficiente','data da baixa','baixa atômica','recarga exclusiva benefício','histórico recarga','retry idempotente','sem erros React'],writesMocked:writes.length},null,2));
  console.log('Evolution: 24 layouts e fluxos financeiros simulados passaram. Nenhum dado real alterado.');
}finally{await browser.close();server.close();}
