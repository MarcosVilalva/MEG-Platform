import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const ROOT = 'http://127.0.0.1:4173/web-evolution.html';
const OUT = 'artifacts/meg-logout-evidence';
const KEY = 'meg.auth.session';
const session = {
  user: { id: 'fixture', name: 'Usuário de Teste', email: 'fixture@example.test', role: 'ADMIN', status: 'ACTIVE', isActive: true },
  accessToken: 'fake-access-token',
  refreshToken: 'fake-refresh-token-with-adequate-length',
  refreshExpiresAt: '2099-12-31T00:00:00Z'
};
const headers = { 'content-type':'application/json', 'access-control-allow-origin':'http://127.0.0.1:4173', 'access-control-allow-credentials':'true' };
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });
test.setTimeout(45_000);

async function setup(page, failLogout = false) {
  let calls = 0;
  await page.route('**/auth/me', r => r.fulfill({ status:200, headers, body:JSON.stringify({user:session.user}) }));
  await page.route('**/auth/logout', async r => {
    calls++;
    if (failLogout) return r.abort('failed');
    await r.fulfill({ status:204, headers });
  });
  await page.route('**/auth/login', r => r.fulfill({ status:200, headers, body:JSON.stringify(session) }));
  await page.goto(ROOT);
  await expect(page.getByRole('heading', {name:'Bem-vindo de volta.'})).toBeVisible();
  await page.evaluate(([k,s]) => {
    sessionStorage.setItem(k, JSON.stringify(s));
    localStorage.setItem('meg-web-evolution:test-preference', 'preserved');
    localStorage.setItem('meg-web-evolution:sidebar-collapsed', 'false');
  }, [KEY,session]);
  await page.reload();
  await expect(page.locator('.meg-shell')).toBeVisible();
  return { calls: () => calls };
}
async function signOut(page,width,collapsed=false) {
  if(width<640) await page.getByRole('button',{name:'Abrir menu'}).click();
  else if(collapsed) await page.getByRole('button',{name:'Recolher menu'}).click();
  await page.getByRole('button',{name:'Sair'}).click();
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
  await expect(page.locator('.meg-shell')).toHaveCount(0);
  expect(await page.evaluate(k=>sessionStorage.getItem(k),KEY)).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('meg-web-evolution:test-preference'))).toBe('preserved');
}
for(const [width,height] of [[1366,768],[1366,600],[1024,600],[1093,480],[910,400]]) {
  test('Logout funcional '+width+'x'+height, async ({browser}) => {
    const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    try {
      const backend=await setup(page);
      if(width<640) await page.getByRole('button',{name:'Abrir menu'}).click();
      else if(width===1024) await page.getByRole('button',{name:'Recolher menu'}).click();
      mkdirSync(OUT,{recursive:true});
      await page.addStyleTag({content:'.meg-profile-name,.meg-avatar{visibility:hidden!important}'});
      await page.screenshot({path:OUT+'/shell-'+width+'x'+height+'.png',animations:'disabled'});
      await page.getByRole('button',{name:'Sair'}).click();
      await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
      expect(await page.evaluate(k=>sessionStorage.getItem(k),KEY)).toBeNull();
      await expect(page.locator('.meg-shell')).toHaveCount(0);
      await expect(page.locator('input[name=email]')).toBeFocused();
      await expect.poll(backend.calls).toBe(1);
      await page.screenshot({path:OUT+'/login-'+width+'x'+height+'.png',animations:'disabled'});
      await page.reload();
      await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
      await expect(page.locator('.meg-shell')).toHaveCount(0);
      expect(await page.evaluate(k=>sessionStorage.getItem(k),KEY)).toBeNull();
    } finally { await ctx.close(); }
  });
}
test('Falha remota encerra sessao local e avisa', async ({page}) => {
  await setup(page,true);
  await signOut(page,1280);
  await expect(page.getByText(/Não foi possível confirmar o encerramento da sessão no servidor/)).toBeVisible();
});
test('Duplo clique faz uma unica chamada', async ({page}) => {
  const backend=await setup(page);
  await page.evaluate(() => { const b=document.querySelector('.meg-logout-button');b.click();b.click(); });
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
  await expect.poll(backend.calls).toBe(1);
  expect(await page.evaluate(k=>sessionStorage.getItem(k),KEY)).toBeNull();
});
test('Historico e novo login', async ({page}) => {
  await setup(page);
  await page.evaluate(()=>history.pushState({},'','?auth=recover-password'));
  await signOut(page,1280);
  await page.goBack();
  await expect(page.locator('.meg-shell')).toHaveCount(0);
  await page.goto(ROOT);
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
  await page.locator('input[name=email]').fill('fixture@example.test');
  await page.locator('input[name=password]').fill('ValidPassword123!');
  await page.getByRole('button',{name:'Entrar no MEG'}).click();
  await expect(page.locator('.meg-shell')).toBeVisible();
});
test('Refresh atrasado nao restaura sessao', async ({page}) => {
  await setup(page);
  let release=null;let requested=false;
  await page.route('**/auth/refresh', async r=>{
    requested=true;
    await new Promise(resolve=>{release=resolve;});
    await r.fulfill({status:200,headers,body:JSON.stringify({...session,refreshToken:'stale-new-refresh-token'})});
  });
  await page.evaluate(()=>{void import('/src/app/auth-client.ts').then(m=>m.refreshAuthSession()).catch(()=>null);});
  await expect.poll(()=>requested).toBe(true);
  await signOut(page,1280);
  release();
  await page.waitForTimeout(300);
  expect(await page.evaluate(k=>sessionStorage.getItem(k),KEY)).toBeNull();
  await expect(page.locator('.meg-shell')).toHaveCount(0);
});
