import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const ROOT='http://127.0.0.1:4173/web-evolution.html';
const OUT='artifacts/meg-stage05-loading-auth';
const KEY='meg.auth.session';
const fixture={
  user:{id:'loading-test-user',name:'Usuário Fictício',email:'loading@example.test',role:'ADMIN',status:'ACTIVE',isActive:true},
  accessToken:'fictional-access-token',refreshToken:'fictional-refresh-token-of-required-length',
  refreshExpiresAt:'2099-12-31T00:00:00Z'
};
const headers={'content-type':'application/json','access-control-allow-origin':'http://127.0.0.1:4173'};
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
test.setTimeout(45_000);

async function storeAndReload(page, session=fixture) {
  await page.goto(ROOT);
  await page.evaluate(([key,data])=>sessionStorage.setItem(key,JSON.stringify(data)),[KEY,session]);
  await page.reload();
}
async function loadingCoherent(page,width,height,label) {
  const loading=page.locator('[data-meg-loading="runtime"]');
  await expect(loading).toBeVisible();
  await expect(page.getByRole('progressbar',{name:'Inicialização do acesso'})).toHaveAttribute('aria-valuenow','25');
  await expect(page.getByRole('status')).toContainText('Validando seu acesso');
  await expect(page.locator('.meg-shell')).toHaveCount(0);
  await expect(page.locator('input[name=email]')).toHaveCount(0);
  const dims=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
  expect(dims.scrollWidth).toBeLessThanOrEqual(dims.width+1);
  mkdirSync(OUT,{recursive:true});
  await page.screenshot({path:OUT+'/runtime-'+label+'-'+width+'x'+height+'.png',animations:'disabled'});
}
for (const [width,height] of [[1366,768],[1366,600],[1024,600],[1093,480],[910,400]]) {
  test('Initial no-session → Login '+width+'x'+height,async({browser})=>{
    const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    try{
      await page.goto(ROOT);
      await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
      await expect(page.locator('.meg-shell')).toHaveCount(0);
      await expect(page.locator('[data-meg-loading="runtime"]')).toHaveCount(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      await page.reload();
      await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    }finally{await ctx.close()}
  });
  test('Slow valid session → Loading → Shell '+width+'x'+height,async({browser})=>{
    const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    let calls=0,release;
    await page.route('**/auth/me',async route=>{
      calls++;
      await new Promise(resolve=>{release=resolve});
      await route.fulfill({status:200,headers,body:JSON.stringify({user:fixture.user})});
    });
    try{
      await storeAndReload(page);
      await expect.poll(()=>calls).toBeGreaterThan(0);
      await loadingCoherent(page,width,height,'valid-slow');
      await page.waitForTimeout(180);
      const observed=calls;
      release();
      await expect(page.locator('.meg-shell')).toBeVisible();
      await expect(page.locator('[data-meg-loading="runtime"]')).toHaveCount(0);
      // Cada montagem/restauração de sessão deve validar uma vez, inclusive React StrictMode.
      expect(observed,'duplicated validation requests while Loading was mounted').toBe(1);
    }finally{if(release)release();await ctx.close()}
  });
}
test('Unauthorized access renews exactly once and checks refreshed session',async({page})=>{
  let me=0,refresh=0;
  await page.route('**/auth/me',route=>{
    me++;
    const auth=route.request().headers()['authorization']||'';
    return route.fulfill({status:auth.includes('refreshed-access')?200:401,headers,body:JSON.stringify(auth.includes('refreshed-access')?{user:fixture.user}:{error:'UNAUTHORIZED'})});
  });
  await page.route('**/auth/refresh',route=>{
    refresh++;
    return route.fulfill({status:200,headers,body:JSON.stringify({...fixture,accessToken:'refreshed-access',refreshToken:'new-fictional-refresh-token'})});
  });
  await storeAndReload(page);
  await expect(page.locator('.meg-shell')).toBeVisible();
  expect(refresh,'only one refresh call allowed').toBe(1);
  expect(me).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(k=>JSON.parse(sessionStorage.getItem(k)).accessToken,KEY)).toBe('refreshed-access');
});
test('Unauthorized session and rejected refresh return Login, no protected flash',async({page})=>{
  await page.route('**/auth/me',r=>r.fulfill({status:401,headers,body:JSON.stringify({error:'UNAUTHORIZED'})}));
  await page.route('**/auth/refresh',r=>r.fulfill({status:401,headers,body:JSON.stringify({error:'REFRESH_DENIED'})}));
  await storeAndReload(page);
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
  await expect(page.locator('.meg-shell')).toHaveCount(0);
  expect(await page.evaluate(k=>sessionStorage.getItem(k),KEY)).toBeNull();
});
for(const [label,kind] of [['network','failed'],['server','503']]){
  test('Failed validation ('+label+') leaves Loading safely and allows Login',async({page})=>{
    await page.route('**/auth/me',r=>kind==='failed'?r.abort('failed'):r.fulfill({status:503,headers,body:JSON.stringify({error:'INTERNAL_SERVER_ERROR'})}));
    await storeAndReload(page);
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible({timeout:15000});
    await expect(page.locator('[data-meg-loading="runtime"]')).toHaveCount(0);
    await expect(page.locator('.meg-shell')).toHaveCount(0);
    await page.getByRole('textbox',{name:'E-mail'}).fill('fictional@example.test');
  });
}
test('Slow stale refresh after logout cannot repopulate session',async({page})=>{
  await page.route('**/auth/me',r=>r.fulfill({status:200,headers,body:JSON.stringify({user:fixture.user})}));
  await page.route('**/auth/logout',r=>r.fulfill({status:204,headers}));
  await storeAndReload(page);
  await expect(page.locator('.meg-shell')).toBeVisible();
  let release;
  let calls=0;
  await page.route('**/auth/refresh',async route=>{
    calls++;
    await new Promise(resolve=>{release=resolve});
    await route.fulfill({status:200,headers,body:JSON.stringify({...fixture,refreshToken:'stale-renewed-token'})});
  });
  await page.evaluate(()=>{void import('/src/app/auth-client.ts').then(m=>m.refreshAuthSession()).catch(()=>null)});
  await expect.poll(()=>calls).toBe(1);
  await page.getByRole('button',{name:'Sair'}).click();
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
  release();
  await page.waitForTimeout(250);
  expect(await page.evaluate(k=>sessionStorage.getItem(k),KEY)).toBeNull();
  await expect(page.locator('.meg-shell')).toHaveCount(0);
});
test('Preview loading route remains isolated from session even after reload',async({page})=>{
  await page.goto(ROOT);
  await page.evaluate(([key,value])=>sessionStorage.setItem(key,JSON.stringify(value)),[KEY,fixture]);
  await page.goto(ROOT+'?auth=loading');
  await expect(page.locator('[data-meg-loading="preview-only"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-meg-loading="preview-only"]')).toBeVisible();
  await expect(page.locator('.meg-shell')).toHaveCount(0);
});
