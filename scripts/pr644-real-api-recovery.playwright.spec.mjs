import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';

const API = 'http://127.0.0.1:3333';
const PAGE = 'http://127.0.0.1:4173/web-evolution.html?auth=recover-password';
const INBOX = 'http://127.0.0.1:3999/messages';
const EMAIL = 'homolog.pr643@example.test';
const ART = 'artifacts/meg-pr644-real-recovery';
const db = new PrismaClient();
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });
test.setTimeout(75_000);
test.afterAll(async () => { await db.$disconnect(); });

async function captured(request) {
  const r = await request.get(INBOX, { headers: {'x-meg-test-capture-key':process.env.MEG_CAPTURE_KEY } });
  expect(r.status()).toBe(200);
  return r.json();
}
async function forgot(request, email) {
  return request.post(API+'/auth/forgot-password', {data:{email}});
}
test('API Fastify e PostgreSQL reais: recuperação com inbox isolada, autenticação e proteção contra enumeração',async({browser,request})=>{
  expect(process.env.NODE_ENV).toBe('test');
  const user = await db.user.findUnique({where:{email:EMAIL},select:{id:true,passwordHash:true}});
  expect(user).toBeTruthy();
  const oldHash=user.passwordHash;
  const auth=await request.post(API+'/auth/login',{data:{email:EMAIL,password:process.env.MEG_TEST_PASSWORD}});
  expect(auth.status()).toBe(200);
  const previous=await auth.json();
  expect(previous.refreshToken?.length).toBeGreaterThan(20);
  const nonExisting='no-real-user-644@example.test';
  const unknown=await forgot(request,nonExisting);
  expect(unknown.status()).toBe(202);
  const unknownBody=await unknown.json();
  expect(unknownBody.status).toBe('PASSWORD_SENT');
  expect(unknownBody.notifications).toEqual([]);
  expect(unknownBody.deliveredTo).toBe(nonExisting);
  expect(await captured(request)).toHaveLength(0);

  const ctx=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const page=await ctx.newPage();
  try {
    await page.goto(PAGE);
    const input=page.getByRole('textbox',{name:'E-mail'});
    await input.fill(EMAIL);
    mkdirSync(ART,{recursive:true});
    await page.screenshot({path:ART+'/real-before-request.png',fullPage:true,animations:'disabled'});
    const submitted=page.waitForResponse(r=>r.url().endsWith('/auth/forgot-password')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Receber senha temporária'}).click();
    const received=await submitted;
    expect(received.status()).toBe(202);
    const knownBody=await received.json();
    expect(knownBody.status).toBe(unknownBody.status);
    expect(knownBody.notifications).toEqual(unknownBody.notifications);
    expect(knownBody.deliveredTo).toBe(EMAIL);
    expect(Object.keys(knownBody).sort()).toEqual(Object.keys(unknownBody).sort());
    await expect(page.getByRole('heading',{name:'Solicitação recebida'})).toBeVisible();
    await expect(page.getByText(/Se existir uma conta ativa/)).toBeVisible();
    await page.screenshot({path:ART+'/real-after-request.png',fullPage:true,animations:'disabled'});
    const inbox=await captured(request);
    expect(inbox).toHaveLength(1);
    expect(inbox[0].recipient).toBe(EMAIL);
    const password=inbox[0].password;
    expect(password.length).toBeGreaterThanOrEqual(12);
    const afterUser=await db.user.findUnique({where:{email:EMAIL},select:{passwordHash:true}});
    expect(afterUser.passwordHash).not.toBe(oldHash);
    expect(await bcrypt.compare(password,afterUser.passwordHash)).toBe(true);
    const sessions=await db.authSession.findMany({where:{userId:user.id},select:{revokedAt:true}});
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every(s=>s.revokedAt!==null)).toBe(true);
    const revoked=await request.post(API+'/auth/refresh',{data:{refreshToken:previous.refreshToken}});
    expect(revoked.status()).toBe(401);
    const beforeLogin=await request.post(API+'/auth/login',{data:{email:EMAIL,password:process.env.MEG_TEST_PASSWORD}});
    expect(beforeLogin.status()).toBe(401);

    await page.getByRole('button',{name:'Voltar ao login'}).click();
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    await page.locator('input[name=email]').fill(EMAIL);
    await page.locator('input[name=password]').fill(password);
    await page.getByRole('button',{name:'Entrar no MEG'}).click();
    await expect(page.locator('.meg-shell')).toBeVisible({timeout:20000});

    const cooldown=await forgot(request,EMAIL);
    expect(cooldown.status()).toBe(202);
    expect((await captured(request)).length).toBe(1);
    const history=await db.auditLog.count({where:{userId:user.id,action:'PASSWORD_RESET_BY_USER'}});
    expect(history).toBe(1);
    console.log('REAL_API_PASSWORD_RECOVERY=PASSED');
    console.log('TEST_ONLY_EMAIL_TRANSPORT=CAPTURED_ONE');
    console.log('TEMP_PASSWORD_HASH_LOGIN=PASSED');
    console.log('OLD_LOGIN_AND_SESSIONS_REVOKED=PASSED');
    console.log('MISSING_ACCOUNT_AND_COOLDOWN_GENERIC_202=PASSED');
  } finally {await ctx.close();}
  // A API real pode emitir 429 após cinco tentativas/hora por conta fictícia.
  const throttledEmail='throttle-644@example.test';
  for(let index=0;index<5;index++){
    const r=await forgot(request,throttledEmail);
    expect(r.status()).toBe(202);
  }
  const browser429=await browser.newContext({viewport:{width:910,height:400},reducedMotion:'reduce'});
  const limitedPage=await browser429.newPage();
  try {
    await limitedPage.goto(PAGE);
    await limitedPage.getByRole('textbox',{name:'E-mail'}).fill(throttledEmail);
    const response=limitedPage.waitForResponse(r=>r.url().endsWith('/auth/forgot-password')&&r.request().method()==='POST');
    await limitedPage.getByRole('button',{name:'Receber senha temporária'}).click();
    expect((await response).status()).toBe(429);
    await expect(limitedPage.getByRole('alert')).toContainText('Tente novamente mais tarde');
    await expect(limitedPage.getByRole('textbox',{name:'E-mail'})).toBeFocused();
    await expect(limitedPage.getByRole('heading',{name:'Solicitação recebida'})).toHaveCount(0);
    await limitedPage.getByRole('button',{name:'Voltar ao login'}).click();
    await expect(limitedPage.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    console.log('REAL_API_RATE_LIMIT_429_FRONTEND_GENERIC_ERROR=PASSED');
  } finally {await browser429.close();}
});
