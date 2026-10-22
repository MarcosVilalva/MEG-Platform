import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';

const WEB_URL='http://127.0.0.1:4173/web-evolution.html';
const API_URL='http://127.0.0.1:3333';
const ACCOUNT='homolog.pr643@example.test';
const OUT='artifacts/meg-pr643-ephemeral-real-api';
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
test.setTimeout(55_000);

const db=new PrismaClient();
test.afterAll(async()=>{await db.$disconnect();});

async function loginThroughBrowser(page) {
  await page.locator('input[name=email]').fill(ACCOUNT);
  await page.locator('input[name=password]').fill(process.env.MEG_TEST_PASSWORD);
  await page.getByRole('button',{name:'Entrar no MEG'}).click();
  await expect(page.locator('.meg-shell')).toBeVisible({timeout:20_000});
  const session=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('meg.auth.session')));
  expect(session?.refreshToken?.length).toBeGreaterThan(20);
  expect(session?.user?.email).toBe(ACCOUNT);
  return session;
}

async function logoutThroughBrowser(page, session) {
  const done=page.waitForResponse(response=>response.url().endsWith('/auth/logout')&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Sair'}).click();
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
  await expect(page.locator('.meg-shell')).toHaveCount(0);
  expect(await page.evaluate(()=>sessionStorage.getItem('meg.auth.session'))).toBeNull();
  const remote=await done;
  expect(remote.status(),'Remote refresh-token revocation HTTP status').toBe(204);
  const secondTry=await page.request.post(API_URL+'/auth/refresh',{data:{refreshToken:session.refreshToken}});
  expect(secondTry.status(),'A revoked refresh token must not be reusable').toBe(401);
  const hash=createHash('sha256').update(session.refreshToken).digest('hex');
  const row=await db.authSession.findUnique({where:{tokenHash:hash},select:{revokedAt:true}});
  expect(row?.revokedAt,'Refresh token revocation persisted in ephemeral PostgreSQL').not.toBeNull();
}

test('API real efêmera: Login → Sair → Login, recarga, novo Login e refresh revogado',async({browser})=>{
  expect(process.env.NODE_ENV).toBe('test');
  expect(process.env.MEG_TEST_PASSWORD?.length).toBeGreaterThanOrEqual(12);
  const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const page=await context.newPage();
  try {
    await page.goto(WEB_URL);
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    const first=await loginThroughBrowser(page);
    mkdirSync(OUT,{recursive:true});
    await page.addStyleTag({content:'.meg-profile-name,.meg-avatar{visibility:hidden!important}'});
    await page.screenshot({path:OUT+'/01-shell-authenticated-fixture.png',animations:'disabled'});
    await logoutThroughBrowser(page,first);
    await page.screenshot({path:OUT+'/02-login-after-logout.png',animations:'disabled'});
    await page.reload();
    await expect(page.locator('.meg-shell')).toHaveCount(0);
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    expect(await page.evaluate(()=>sessionStorage.getItem('meg.auth.session'))).toBeNull();
    await page.screenshot({path:OUT+'/03-login-after-reload.png',animations:'disabled'});
    const second=await loginThroughBrowser(page);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    const validMe=await page.request.get(API_URL+'/auth/me',{headers:{Authorization:'Bearer '+second.accessToken}});
    expect(validMe.status()).toBe(200);
    await logoutThroughBrowser(page,second);
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    await page.screenshot({path:OUT+'/04-login-after-second-logout.png',animations:'disabled'});
    console.log('EPHEMERAL_AUTH_REAL_API_FLOW=PASSED');
    console.log('REMOTE_REFRESH_REVOCATION=HTTP_204_AND_REUSE_HTTP_401_AND_DB_REVOKED');
  } finally {await context.close();}
});
