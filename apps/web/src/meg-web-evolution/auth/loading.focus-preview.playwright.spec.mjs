import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const ROOT='http://127.0.0.1:4173/web-evolution.html';
const OUT='artifacts/meg-loading-auth-accessibility';
const user={id:'fake-user',name:'Usuário de Teste',email:'fake@example.test',role:'ADMIN',status:'ACTIVE',isActive:true};
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
test.setTimeout(35_000);
async function startStored(page){
  await page.goto(ROOT);
  await page.evaluate(value=>sessionStorage.setItem('meg.auth.session',JSON.stringify(value)),{user,accessToken:'fake-access',refreshToken:'fake-refresh-token-long-enough',refreshExpiresAt:'2099-12-31T00:00:00Z'});
  await page.reload();
}
for(const kind of ['network','server','unauthorized']){
  test('Focus returns to visible email field after '+kind+' validation failure',async({page})=>{
    await page.route('**/auth/me',r=>kind==='network'?r.abort('failed'):r.fulfill({status:kind==='server'?503:401,contentType:'application/json',body:JSON.stringify({error:'VALIDATION_FAILED'})}));
    if(kind==='unauthorized')await page.route('**/auth/refresh',r=>r.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'REFRESH_DENIED'})}));
    await startStored(page);
    await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    await expect(page.locator('.meg-shell')).toHaveCount(0);
    await expect(page.locator('input[name=email]')).toBeFocused();
  });
}
for(const [width,height] of [[1366,768],[1366,600],[1024,600],[1093,480],[910,400]]){
  test('Preview-only failure is navigable by keyboard and scroll '+width+'x'+height,async({browser})=>{
    const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    try {
      await page.goto(ROOT+'?auth=loading&state=error');
      await expect(page.getByRole('heading',{name:'Não foi possível carregar os dados'})).toBeVisible();
      const button=page.getByRole('button',{name:'Voltar ao login'});
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport({ratio:.8});
      await button.focus();
      await expect(button).toBeFocused();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      mkdirSync(OUT,{recursive:true});
      await page.screenshot({path:OUT+'/preview-error-'+width+'x'+height+'.png',animations:'disabled'});
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    }finally{await ctx.close()}
  });
}
test('Runtime Loading does not leak focus to protected Shell while HTTP pending',async({page})=>{
  let release;
  await page.route('**/auth/me',async r=>{
    await new Promise(resolve=>{release=resolve});
    await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user})});
  });
  try {
    await startStored(page);
    await expect(page.locator('[data-meg-loading="runtime"]')).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    expect(await page.locator('.meg-shell :focus').count()).toBe(0);
    expect(await page.locator('.meg-login-form :focus').count()).toBe(0);
    const p=page.getByRole('progressbar',{name:'Inicialização do acesso'});
    await expect(p).toHaveAttribute('aria-valuenow','25');
    await expect(page.getByRole('status')).toContainText('Validando seu acesso');
  }finally{if(release)release()}
});
