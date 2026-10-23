import { test, expect } from '@playwright/test';
import { Workbook } from 'exceljs';
import { mkdirSync } from 'node:fs';

const URL='http://127.0.0.1:4173/web-evolution.html';
const API='http://127.0.0.1:3333';
const USER_A='finance-owner-a@example.test';
const USER_B='finance-owner-b@example.test';
const OUT='artifacts/operational-launches-qa';
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
test.setTimeout(95_000);

async function signIn(page,email) {
  await page.goto(URL);
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
    await expect(page.getByText('251 de 251 registros no histórico completo.',{exact:false})).toBeVisible({timeout:35000});
    expect(new Set(pages)).toEqual(new Set(['1','2','3']));
    expect(await page.getByRole('table',{name:'Histórico completo de lançamentos financeiros'}).count()).toBe(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    mkdirSync(OUT,{recursive:true});
    await page.screenshot({path:OUT+'/01-desktop-251-real-api.png',animations:'disabled'});

    const fullDownloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Exportar Excel'}).click();
    const fullDownload=await fullDownloadPromise;
    const book=new Workbook();
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
    const filteredBook=new Workbook();
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
