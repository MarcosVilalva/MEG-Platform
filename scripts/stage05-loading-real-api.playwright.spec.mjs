import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
test.afterAll(async()=>{await db.$disconnect()});
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
test.setTimeout(70_000);
const APP='http://127.0.0.1:4173/web-evolution.html';
const API='http://127.0.0.1:3333';
const ACCOUNT='homolog.pr643@example.test';
test('Backend real isolated: login, Loading validation on reload, refresh and logout',async({browser,request})=>{
  expect(process.env.NODE_ENV).toBe('test');
  const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const page=await context.newPage();
  try{
    await page.goto(APP);
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    await page.locator('input[name=email]').fill(ACCOUNT);
    await page.locator('input[name=password]').fill(process.env.MEG_TEST_PASSWORD);
    await page.getByRole('button',{name:'Entrar no MEG'}).click();
    await expect(page.locator('.meg-shell')).toBeVisible({timeout:25000});
    const old=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('meg.auth.session')));
    expect(old?.accessToken?.length).toBeGreaterThan(30);
    await page.reload();
    await expect(page.locator('.meg-shell')).toBeVisible({timeout:15000});
    expect(await page.evaluate(()=>sessionStorage.getItem('meg.auth.session'))).toBeTruthy();

    await page.evaluate(()=>{
      const key='meg.auth.session';
      const saved=JSON.parse(sessionStorage.getItem(key));
      saved.accessToken='expired-fictional-access-token';
      sessionStorage.setItem(key,JSON.stringify(saved));
    });
    await page.reload();
    await expect(page.locator('.meg-shell')).toBeVisible({timeout:18000});
    const refreshed=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('meg.auth.session')));
    expect(refreshed.accessToken).not.toBe('expired-fictional-access-token');
    expect(refreshed.refreshToken).not.toBe(old.refreshToken);
    const prior=await request.post(API+'/auth/refresh',{data:{refreshToken:old.refreshToken}});
    expect(prior.status()).toBe(401);
    const done=page.waitForResponse(r=>r.url().endsWith('/auth/logout')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Sair'}).click();
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    await expect(page.locator('.meg-shell')).toHaveCount(0);
    expect((await done).status()).toBe(204);
    const revoked=await request.post(API+'/auth/refresh',{data:{refreshToken:refreshed.refreshToken}});
    expect(revoked.status()).toBe(401);
    await page.reload();
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    expect(await page.evaluate(()=>sessionStorage.getItem('meg.auth.session'))).toBeNull();
    console.log('REAL_API_LOADING_RESTORE_REFRESH_AND_LOGOUT=PASSED');
  }finally{await context.close();}
});
