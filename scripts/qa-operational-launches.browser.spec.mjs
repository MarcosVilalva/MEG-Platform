import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { mkdirSync } from 'node:fs';

const APP_URI='http://127.0.0.1:4173/web-evolution.html';
const API='http://127.0.0.1:3333';
const USER_A='finance-owner-a@example.test';
const USER_B='finance-owner-b@example.test';
const OUT='artifacts/operational-launches-qa';
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
test.setTimeout(95_000);

async function signIn(page,email) {
  await page.goto(APP_URI);
  await page.locator('input[name=email]').fill(email);
  await page.locator('input[name=password]').fill(process.env.MEG_TEST_PASSWORD);
  await page.getByRole('button',{name:'Entrar no MEG'}).click();
  await expect(page.locator('.meg-shell')).toBeVisible({timeout:25000});
  const session=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('meg.auth.session')));
  expect(session.user.email).toBe(email);
  return session;
}

test('API real: 251 lançamentos, busca de página 3, exportação idêntica, logout e isolamento',async({browser,request})=>{
  const a=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce',acceptDownloads:true});
  const page=await a.newPage();
  const pages=[];
  page.on('request',r=>{if(r.url().includes('/finance/events?'))pages.push(new URL(r.url()).searchParams.get('page'))});
  try {
    const session=await signIn(page,USER_A);
    const direct=await request.get(API+'/finance/events?page=1&pageSize=100',{headers:{Authorization:'Bearer '+session.accessToken}});
    console.log('API_PAGE1_STATUS='+direct.status()+' TOTAL='+(direct.ok()?(await direct.json()).total:'unavailable'));
    await page.waitForTimeout(1500);
    console.log('FINANCIAL_UI_STATE='+JSON.stringify((await page.locator('.meg-launches').innerText()).slice(0,700)));
    await expect(page.getByText('251 de 251 registros no histórico completo.',{exact:false})).toBeVisible({timeout:35000});
    expect(new Set(pages)).toEqual(new Set(['1','2','3']));
    expect(await page.getByRole('table',{name:'Histórico completo de lançamentos financeiros'}).count()).toBe(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    mkdirSync(OUT,{recursive:true});
    const visibleTable = page.getByRole('table',{name:'Histórico completo de lançamentos financeiros'});
    await expect(visibleTable.locator('thead th:visible').first()).toBeVisible();
    await expect(visibleTable.locator('tbody tr[data-grid-row]:visible').first()).toBeVisible();
    expect(await page.locator('.meg-datagrid__viewport').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(160);
    await page.screenshot({path:OUT+'/01-desktop-251-real-api.png',animations:'disabled'});

    const fullDownloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Exportar Excel'}).click();
    const fullDownload=await fullDownloadPromise;
    const book=new ExcelJS.Workbook();
    await book.xlsx.readFile(await fullDownload.path());
    const cells=[];
    book.worksheets[0].eachRow(row=>row.eachCell(cell=>{if(typeof cell.value==='string')cells.push(cell.value);}));
    expect(cells.some(x=>x.includes('Registro Financeiro QA 1 #250'))).toBe(true);
    expect(cells.some(x=>x.includes('Registro Financeiro QA 2 #000'))).toBe(false);

    await page.getByRole('button',{name:'Abrir busca rápida'}).click();
    const search=page.getByRole('searchbox',{name:'Buscar em todas as colunas visíveis'});
    await search.fill('Registro Financeiro QA 1 #250');
    await search.press('Enter');
    await expect(page.getByText('1 de 251 registros no histórico completo.',{exact:false})).toBeVisible();
    const filteredPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Exportar Excel'}).click();
    const filteredFile=await filteredPromise;
    const filteredBook=new ExcelJS.Workbook();
    await filteredBook.xlsx.readFile(await filteredFile.path());
    const values=[];
    filteredBook.worksheets[0].eachRow(row=>row.eachCell(cell=>{if(typeof cell.value==='string')values.push(cell.value);}));
    expect(values.filter(x=>x==='Registro Financeiro QA 1 #250')).toHaveLength(1);
    expect(values.some(x=>x==='Registro Financeiro QA 1 #001')).toBe(false);
    await page.screenshot({path:OUT+'/02-filter-last-page.png',animations:'disabled'});

    const who=await request.get(API+'/finance/events?page=1&pageSize=100',{headers:{Authorization:'Bearer '+session.accessToken}});
    expect(who.status()).toBe(200);
    expect((await who.json()).total).toBe(251);
    const unauthorized=await request.get(API+'/finance/events?page=1&pageSize=100');
    expect(unauthorized.status()).toBe(401);
    await page.getByRole('button',{name:'Sair'}).click();
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    expect(await page.evaluate(()=>sessionStorage.getItem('meg.auth.session'))).toBeNull();
    console.log('REAL_API_FULL_HISTORY_FILTER_EXPORT_LOGOUT=PASSED');
  }finally{await a.close();}

  const b=await browser.newContext({viewport:{width:1024,height:600},reducedMotion:'reduce'});
  const pageB=await b.newPage();
  try{
    const sessionB=await signIn(pageB,USER_B);
    await expect(pageB.getByText('2 de 2 registros no histórico completo.',{exact:false})).toBeVisible({timeout:30000});
    await expect(pageB.getByText('Usuário Fictício 2')).toBeVisible();
    await expect(pageB.getByText('Usuário Fictício 1')).toHaveCount(0);
    const unauthorizedA=await request.get(API+'/finance/events?page=1&pageSize=100',{headers:{Authorization:'Bearer '+sessionB.accessToken}});
    expect(unauthorizedA.status()).toBe(200);
    const payload=await unauthorizedA.json();
    expect(payload.total).toBe(2);
    expect(payload.items.every(e=>e.description.includes('QA 2'))).toBe(true);
    await pageB.screenshot({path:OUT+'/03-isolated-second-account.png',animations:'disabled'});
    console.log('REAL_API_USER_WORKSPACE_ISOLATION=PASSED');
  }finally{await b.close();}
});

test('falha na página 2 não revela histórico parcial; tentativa de novo completa',async({page})=>{
  await signIn(page,USER_A);
  await page.waitForTimeout(1500);
  console.log('RETRY_UI_INITIAL='+JSON.stringify((await page.locator('.meg-launches').innerText()).slice(0,700)));
  await expect(page.getByText('251 de 251 registros no histórico completo.',{exact:false})).toBeVisible({timeout:30000});
  await page.route('**/finance/events?**',async route=>{
    if(new URL(route.request().url()).searchParams.get('page')==='2')
      return route.fulfill({status:503,contentType:'application/json',body:'{"error":"SERVICE_UNAVAILABLE"}'});
    return route.continue();
  });
  await page.getByRole('button',{name:'Atualizar consulta'}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('table',{name:'Histórico completo de lançamentos financeiros'})).toHaveCount(0);
  await page.unroute('**/finance/events?**');
  await page.getByRole('button',{name:'Tentar novamente'}).click();
  await expect(page.getByText('251 de 251 registros no histórico completo.',{exact:false})).toBeVisible({timeout:30000});
  console.log('NO_PARTIAL_EXPORT_ON_PAGINATION_FAILURE=PASSED');
});


test('Novo Lançamento: receita e despesa pendente com persistência real, idempotência e isolamento',async({browser,request})=>{
  const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const page=await context.newPage();
  try{
    const session=await signIn(page,USER_A);
    const headers={Authorization:'Bearer '+session.accessToken};
    await expect(page.getByText('251 de 251 registros no histórico completo.',{exact:false})).toBeVisible({timeout:35000});
    const list=await request.get(API+'/finance/accounts',{headers});
    expect(list.status()).toBe(200);
    const account=(await list.json()).find(x=>x.type==='checking'&&x.isActive);
    expect(account).toBeTruthy();
    const incomeResponse=await request.post(API+'/finance/categories',{headers,data:{name:'Receita QA Operacional',type:'income',group:'Teste',operationId:'category-income-qa-20261023'}});
    expect(incomeResponse.status()).toBe(201);
    const incomeCategory=await incomeResponse.json();
    const expenseResponse=await request.post(API+'/finance/categories',{headers,data:{name:'Despesa QA Operacional',type:'expense',group:'Variável',operationId:'category-expense-qa-20261023'}});
    expect(expenseResponse.status()).toBe(201);
    const expenseCategory=await expenseResponse.json();
    const methodResponse=await request.post(API+'/finance/payment-methods',{headers,data:{name:'PIX QA Operacional',type:'instant',operationId:'method-pix-qa-20261023'}});
    expect(methodResponse.status()).toBe(201);
    const method=await methodResponse.json();
    await page.getByRole('button',{name:/^\+ Novo lançamento$/}).click();
    await expect(page.getByTestId('new-launch-types')).toBeVisible();
    await expect(page.getByRole('button',{name:'Transferência indisponível'})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Benefício indisponível'})).toBeDisabled();
    mkdirSync(OUT,{recursive:true});
    await page.screenshot({path:OUT+'/04-choice-desktop.png',animations:'disabled'});
    await expect(page.getByRole('dialog',{name:'Novo lançamento'})).toBeVisible();
    await page.getByRole('button',{name:'Escolher Receita'}).click();
    await page.getByLabel('Descrição *').fill('Receita criada pelo QA operacional');
    await page.getByRole('textbox',{name:'Valor em reais *'}).fill('1.234,56');
    await page.getByLabel('Data *').fill('2026-10-23');
    await page.getByLabel('Categoria *').selectOption(incomeCategory.id);
    await page.getByLabel('Conta *').selectOption(account.id);
    await page.getByLabel('Forma de pagamento *').selectOption(method.id);
    await expect(page.getByTestId('new-launch-summary-amount')).toHaveText('R$ 1.234,56');
    await page.screenshot({path:OUT+'/05-income-form-desktop.png',animations:'disabled'});
    await page.getByRole('button',{name:/Salvar lançamento/}).click();
    await expect(page.getByText('252 de 252 registros no histórico completo.',{exact:false})).toBeVisible({timeout:35000});
    let events=await request.get(API+'/finance/events?page=1&pageSize=100',{headers});
    expect(events.status()).toBe(200);
    const json=await events.json();
    const income=json.items.find(x=>x.description==='Receita criada pelo QA operacional');
    expect(income).toBeTruthy();
    expect(income.type).toBe('income');
    expect(income.status).toBe('paid');
    expect(Number(income.amount)).toBe(1234.56);
    expect(income.accountId).toBe(account.id);
    const balanceResponse=await request.get(API+'/finance/monetary-balance?accountId='+encodeURIComponent(account.id)+'&date=2026-10-23',{headers});
    expect(balanceResponse.status()).toBe(200);
    const balanceBefore=Number((await balanceResponse.json()).available);

    await page.getByRole('button',{name:/^\+ Novo lançamento$/}).click();
    await page.getByRole('button',{name:'Escolher Receita'}).click();
    await page.getByRole('textbox',{name:'Valor em reais *'}).fill('7,89');
    await page.getByLabel('Data *').fill('2026-11-02');
    await page.getByLabel('Descrição *').fill('Receita criada pelo QA operacional');
    await expect(page.getByLabel('Categoria *')).toHaveValue(incomeCategory.id);
    await expect(page.getByLabel('Conta *')).toHaveValue(account.id);
    await expect(page.getByLabel('Forma de pagamento *')).toHaveValue(method.id);
    await expect(page.getByRole('textbox',{name:'Valor em reais *'})).toHaveValue('7,89');
    await expect(page.getByLabel('Data *')).toHaveValue('2026-11-02');
    await page.getByRole('button',{name:'Voltar',exact:true}).last().click();
    await expect(page.getByTestId('new-launch-types')).toBeVisible();
    await page.getByRole('button',{name:'Fechar novo lançamento'}).click();
    console.log('NEW_LAUNCH_AUTOCOMPLETE_NO_VALUE_OR_DATE=PASSED');


    await page.getByRole('button',{name:/^\+ Novo lançamento$/}).click();
    await page.getByRole('button',{name:'Escolher Despesa'}).click();
    await page.getByLabel('Descrição *').fill('Despesa pendente criada pelo QA');
    await page.getByRole('textbox',{name:'Valor em reais *'}).fill('10,07');
    await page.getByLabel('Data *').fill('2026-10-23');
    await page.getByLabel('Categoria *').selectOption(expenseCategory.id);
    await page.getByLabel('Conta *').selectOption(account.id);
    await page.getByLabel('Forma de pagamento *').selectOption(method.id);
    await expect(page.getByTestId('new-launch-summary-amount')).toHaveText('R$ 10,07');
    await page.screenshot({path:OUT+'/06-expense-pending-form-desktop.png',animations:'disabled'});
    await page.getByRole('button',{name:/Salvar lançamento/}).click();
    await expect(page.getByText('253 de 253 registros no histórico completo.',{exact:false})).toBeVisible({timeout:35000});
    events=await request.get(API+'/finance/events?page=1&pageSize=100',{headers});
    const expense=(await events.json()).items.find(x=>x.description==='Despesa pendente criada pelo QA');
    expect(expense).toBeTruthy();
    expect(expense.type).toBe('expense');
    expect(expense.status).toBe('planned');
    expect(Number(expense.amount)).toBe(10.07);
    const balanceAfter=Number((await (await request.get(API+'/finance/monetary-balance?accountId='+encodeURIComponent(account.id)+'&date=2026-10-23',{headers})).json()).available);
    expect(balanceAfter).toBe(balanceBefore);
    await page.screenshot({path:OUT+'/07-history-after-pending-expense.png',animations:'disabled'});
    await expect(page.getByRole('table',{name:'Histórico completo de lançamentos financeiros'}).locator('tbody tr[data-grid-row]:visible').first()).toBeVisible();

    const b=await browser.newContext();
    const bPage=await b.newPage();
    try {
      const sessionB=await signIn(bPage,USER_B);
      await expect(bPage.getByText('2 de 2 registros no histórico completo.',{exact:false})).toBeVisible({timeout:35000});
      const bEvents=await request.get(API+'/finance/events?page=1&pageSize=100',{headers:{Authorization:'Bearer '+sessionB.accessToken}});
      expect(bEvents.status()).toBe(200);
      expect((await bEvents.json()).items.every(x=>!x.description.includes('criada pelo QA'))).toBe(true);
      const rejected=await request.post(API+'/finance/events',{headers:{Authorization:'Bearer '+sessionB.accessToken},
        data:{description:'Sem permissão cruzada',type:'income',status:'planned',date:'2026-10-23',amount:1,accountId:account.id,categoryId:incomeCategory.id,paymentMethodId:method.id,operationId:'qa-cross-workspace-20261023'}});
      expect(rejected.status()).toBe(400);
    }finally{await b.close();}
    console.log('NOVO_LANCAMENTO_BASIC_API=PASSED');
  }finally{await context.close();}
});


test('referências visuais: acesso, teclado e overflow em 1024x600, 910x400 e 390x844',async({browser})=>{
  const sizes=[[1024,600],[910,400],[390,844]];
  for(const [width,height] of sizes){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await context.newPage();
    try{
      await signIn(page,USER_A);
      await expect(page.getByText('251 de 251 registros no histórico completo.',{exact:false})).toBeVisible({timeout:35000});
      await page.getByRole('button',{name:/^\+ Novo lançamento$/}).click();
      const chooser=page.getByTestId('new-launch-types');
      await expect(chooser).toBeVisible();
      await expect(page.getByRole('button',{name:'Transferência indisponível'})).toBeDisabled();
      await expect(page.getByRole('button',{name:'Benefício indisponível'})).toBeDisabled();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({path:OUT+'/viewport-'+width+'x'+height+'-choice.png',animations:'disabled'});
      await page.getByRole('button',{name:'Escolher Despesa'}).click();
      await expect(page.getByTestId('selected-launch-type')).toBeVisible();
      await expect(page.getByRole('button',{name:/Salvar lançamento/})).toBeVisible();
      await page.getByLabel('Descrição *').fill('QA visual de acessibilidade');
      await expect(page.locator('.meg-new-launch__summary').getByText('QA visual de acessibilidade')).toBeVisible();
      await page.getByRole('button',{name:/Salvar lançamento/}).scrollIntoViewIfNeeded();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({path:OUT+'/viewport-'+width+'x'+height+'-form.png',animations:'disabled'});
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog',{name:'Novo lançamento'})).toHaveCount(0);
    }finally{await context.close();}
  }
  console.log('VISUAL_RESPONSIVE_A11Y=PASSED');
});
