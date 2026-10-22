import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:4173/web-evolution.html';
const AUTH_KEY = 'meg.auth.session';
const OUT = 'artifacts/meg-logout-final-audit';
const one = {
  user: {id:'user-one', name:'Usuário Fictício Um', email:'user.one@example.test', role:'ADMIN', status:'ACTIVE', isActive:true},
  accessToken:'fixture-access-one', refreshToken:'fixture-refresh-one', refreshExpiresAt:'2099-12-31T00:00:00Z'
};
const two = {
  user: {id:'user-two', name:'Usuário Fictício Dois', email:'user.two@example.test', role:'ADMIN', status:'ACTIVE', isActive:true},
  accessToken:'fixture-access-two', refreshToken:'fixture-refresh-two', refreshExpiresAt:'2099-12-31T00:00:00Z'
};
const headers = {'content-type':'application/json','access-control-allow-origin':'http://127.0.0.1:4173'};
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
test.setTimeout(40_000);

async function setup(page) {
  await page.route('**/auth/me', r=>r.fulfill({status:200,headers,body:JSON.stringify({user:one.user})}));
  await page.route('**/auth/login', r=>r.fulfill({status:200,headers,body:JSON.stringify(two)}));
  await page.route('**/auth/logout', r=>r.fulfill({status:204,headers}));
  await page.goto(BASE);
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
  await page.evaluate(([k,s])=>{
    sessionStorage.setItem(k,JSON.stringify(s));
    localStorage.setItem('meg-web-evolution:sidebar-collapsed','false');
    localStorage.setItem('meg-web-evolution:remembered-email','remembered@example.test');
  },[AUTH_KEY,one]);
  await page.reload();
  await expect(page.locator('.meg-shell')).toBeVisible();
}
async function assertLogin(page) {
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
  await expect(page.locator('.meg-shell')).toHaveCount(0);
  await expect(page.locator('input[name=email]')).toBeFocused();
  expect(await page.evaluate(k=>sessionStorage.getItem(k),AUTH_KEY)).toBeNull();
}

for (const {width,height,collapse} of [
  {width:1366,height:768,collapse:false},
  {width:1366,height:768,collapse:true},
  {width:1366,height:600,collapse:true},
  {width:1024,height:600,collapse:false},
  {width:1024,height:600,collapse:true},
  {width:1093,height:480,collapse:true},
  {width:910,height:400,collapse:true}
]) {
  test('Teclado, logout e sidebar '+width+'x'+height+' '+(collapse?'compacto':'expandido'), async ({browser})=>{
    const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    try {
      await setup(page);
      if(width>=1024 && collapse) {
        await page.getByRole('button',{name:'Recolher menu'}).click();
        await expect(page.getByRole('button',{name:'Expandir menu'})).toBeVisible();
      }
      const button=page.getByRole('button',{name:'Sair'});
      await expect(button).toBeVisible();
      await button.focus();
      await expect(button).toBeFocused();
      mkdirSync(OUT,{recursive:true});
      await page.addStyleTag({content:'.meg-profile-name,.meg-avatar{visibility:hidden!important}'});
      await page.screenshot({path:OUT+'/before-'+width+'x'+height+'-'+(collapse?'compact':'expand')+'.png',animations:'disabled'});
      await page.keyboard.press('Enter');
      await assertLogin(page);
      await page.screenshot({path:OUT+'/after-'+width+'x'+height+'-'+(collapse?'compact':'expand')+'.png',animations:'disabled'});
      const geometry=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth}));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.innerWidth+1);
      expect(await page.evaluate(()=>localStorage.getItem('meg-web-evolution:remembered-email'))).toBe('remembered@example.test');
      await page.reload();
      await expect(page.locator('.meg-shell')).toHaveCount(0);
    } finally {await ctx.close();}
  });
}

test('Logout antigo pode resolver após novo login sem destruir a nova sessão',async ({page})=>{
  await setup(page);
  let release;
  let entered=false;
  await page.unroute('**/auth/logout');
  await page.route('**/auth/logout',async r=>{
    entered=true;
    await new Promise(resolve=>{release=resolve;});
    await r.fulfill({status:204,headers});
  });
  await page.getByRole('button',{name:'Sair'}).click();
  await assertLogin(page);
  await expect.poll(()=>entered).toBe(true);
  await page.locator('input[name=email]').fill(two.user.email);
  await page.locator('input[name=password]').fill('FictionalPassword123!');
  await page.getByRole('button',{name:'Entrar no MEG'}).click();
  await expect(page.locator('.meg-shell')).toBeVisible();
  release();
  await expect.poll(()=>page.evaluate(k=>JSON.parse(sessionStorage.getItem(k))?.user?.id,AUTH_KEY)).toBe('user-two');
});

test('Leitura autenticada atrasada não repopula cache após sair',async ({page})=>{
  await setup(page);
  let release;
  let entered=false;
  await page.route('**/finance/accounts',async r=>{
    entered=true;
    await new Promise(resolve=>{release=resolve;});
    await r.fulfill({status:200,headers,body:JSON.stringify({accounts:[{id:'old-private-account'}]})});
  });
  await page.evaluate(()=>{void import('/src/app/auth-client.ts').then(m=>m.authenticatedRequest('/finance/accounts')).catch(()=>null)});
  await expect.poll(()=>entered).toBe(true);
  await page.getByRole('button',{name:'Sair'}).click();
  await assertLogin(page);
  release();
  await expect.poll(()=>page.evaluate(async()=>{const m=await import('/src/app/auth-client.ts');return m.peekAuthenticatedCache('/finance/accounts')==null})).toBe(true);
});

test('Atualização de perfil antiga não pode substituir identidade de novo usuário',async ({page})=>{
  await setup(page);
  let release;
  let entered=false;
  await page.route('**/auth/me/profile',async r=>{
    entered=true;
    await new Promise(resolve=>{release=resolve;});
    await r.fulfill({status:200,headers,body:JSON.stringify({user:{id:one.user.id,name:'Nome de usuário antigo alterado',email:one.user.email}})});
  });
  await page.evaluate(()=>{
    window.__oldProfileDone='pending';
    void import('/src/app/auth-client.ts').then(m=>m.updateOwnProfile({name:'Nome de usuário antigo alterado'}))
      .then(()=>window.__oldProfileDone='resolved').catch(()=>window.__oldProfileDone='rejected');
  });
  await expect.poll(()=>entered).toBe(true);
  await page.getByRole('button',{name:'Sair'}).click();
  await assertLogin(page);
  await page.locator('input[name=email]').fill(two.user.email);
  await page.locator('input[name=password]').fill('FictionalPassword123!');
  await page.getByRole('button',{name:'Entrar no MEG'}).click();
  await expect(page.locator('.meg-shell')).toBeVisible();
  expect(await page.evaluate(k=>JSON.parse(sessionStorage.getItem(k))?.user?.id,AUTH_KEY)).toBe('user-two');
  release();
  await expect.poll(()=>page.evaluate(()=>window.__oldProfileDone)).not.toBe('pending');
  expect(await page.evaluate(k=>JSON.parse(sessionStorage.getItem(k))?.user?.id,AUTH_KEY)).toBe('user-two');
});
