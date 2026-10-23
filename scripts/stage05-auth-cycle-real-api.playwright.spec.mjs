import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
const APP='http://127.0.0.1:4173/web-evolution.html';
const API='http://127.0.0.1:3333';
const ADDRESS='new.member.qa@example.test';
const ADMIN='homolog.pr643@example.test';
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
test.setTimeout(70000);
test.afterAll(async()=>db.$disconnect());
test('API e PostgreSQL reais: cadastrar membro pendente, login, Loading, Sair e recarga',async({browser,request})=>{
  expect(process.env.NODE_ENV).toBe('test');
  const ctx=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const page=await ctx.newPage();
  try {
    await page.goto(APP+'?auth=create-account');
    await page.locator('input[name=name]').fill('Membro Fictício da QA');
    await page.locator('input[name=email]').fill(ADDRESS);
    await page.locator('input[name=phone]').fill('11999999999');
    await page.locator('input[name=password]').fill(process.env.MEG_TEST_PASSWORD);
    await page.locator('input[name=confirmPassword]').fill(process.env.MEG_TEST_PASSWORD);
    const registration=page.waitForResponse(r=>r.url().endsWith('/auth/register')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Continuar'}).click();
    const created=await registration;
    if (created.status() !== 202) {
      const safe = await created.json().catch(() => ({}));
      console.log('REGISTER_STATUS=' + created.status() + ' CODE=' + String(safe.error || 'UNKNOWN'));
    }
    expect(created.status()).toBe(202);
    await expect(page.getByRole('heading',{name:'Aguardando aprovação'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Aguardando aprovação'})).toBeFocused();
    await expect(page.getByRole('button',{name:'Voltar ao login'})).toHaveCount(1);
    const user=await db.user.findUnique({where:{email:ADDRESS},select:{id:true,status:true,isActive:true}});
    expect(user?.status).toBe('PENDING');
    expect(user?.isActive).toBe(false);
    const memberships=await db.workspaceMember.findMany({where:{userId:user.id}});
    expect(memberships.some(m=>m.status==='PENDING')).toBe(true);
    expect(await db.authSession.count({where:{userId:user.id}})).toBe(0);
    await page.getByRole('button',{name:'Voltar ao login'}).click();
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();

    await page.locator('input[name=email]').fill(ADMIN);
    await page.locator('input[name=password]').fill(process.env.MEG_TEST_PASSWORD);
    await page.getByRole('button',{name:'Entrar no MEG'}).click();
    await expect(page.locator('.meg-shell')).toBeVisible({timeout:20000});
    const session=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('meg.auth.session')));
    expect(session.user.email).toBe(ADMIN);
    await page.reload();
    await expect(page.locator('.meg-shell')).toBeVisible({timeout:15000});
    const logout=page.waitForResponse(r=>r.url().endsWith('/auth/logout')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Sair'}).click();
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    expect((await logout).status()).toBe(204);
    expect(await page.evaluate(()=>sessionStorage.getItem('meg.auth.session'))).toBeNull();
    await page.goBack();
    await expect(page.locator('.meg-shell')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    const revoked=await request.post(API+'/auth/refresh',{data:{refreshToken:session.refreshToken}});
    expect(revoked.status()).toBe(401);
    console.log('REAL_API_FULL_CYCLE_REGISTER_LOGIN_LOADING_LOGOUT=PASSED');
  }finally{await ctx.close();}
});
