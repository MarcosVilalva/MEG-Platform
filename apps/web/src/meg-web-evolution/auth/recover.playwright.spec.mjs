import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
const ROOT = 'http://127.0.0.1:4173/web-evolution.html?auth=recover-password';
const DIR = 'artifacts/meg-stage05-auth';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });
for (const [width,height] of [[360,844],[390,844],[768,1024],[1365,600],[1920,1080]]) {
  test(`Recuperação ${width}x${height}: página inteira normal/erro`,async({browser})=>{
    const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    await page.goto(ROOT);
    await page.evaluate(()=>document.fonts.ready);
    await expect(page.getByRole('heading',{name:'Recuperar senha'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    mkdirSync(DIR,{recursive:true});
    await page.screenshot({path:`${DIR}/recuperar-senha-${width}x${height}.png`,fullPage:true,animations:'disabled'});
    await page.getByRole('button',{name:'Receber senha temporária'}).click();
    await expect(page.getByRole('alert')).toContainText('Digite um e-mail válido.');
    await page.screenshot({path:`${DIR}/recuperar-senha-${width}x${height}-erro.png`,fullPage:true,animations:'disabled'});
    await ctx.close();
  });
}
test('Recuperação oculta existência de cadastro e mantém resposta genérica',async({page})=>{
  let requests=0;
  await page.route('**/auth/forgot-password',async route=>{
    requests++;
    await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'PASSWORD_SENT',deliveredTo:'usuario@exemplo.com',notifications:[]})});
  });
  await page.goto(ROOT);
  await page.getByRole('textbox',{name:'E-mail'}).fill('usuario@exemplo.com');
  await page.getByRole('button',{name:'Receber senha temporária'}).click();
  await expect(page.getByText('Se o e-mail estiver cadastrado')).toBeVisible();
  expect(requests).toBe(1);
  await expect(page.getByText('usuario@exemplo.com')).toHaveCount(0);
});
test('Recuperação mostra erro de conexão e permite tentar novamente',async({page})=>{
  await page.route('**/auth/forgot-password',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'UNAVAILABLE'})}));
  await page.goto(ROOT);
  await page.getByRole('textbox',{name:'E-mail'}).fill('usuario@exemplo.com');
  await page.getByRole('button',{name:'Receber senha temporária'}).click();
  await expect(page.getByRole('alert')).toContainText('Tente novamente');
  await expect(page.getByRole('button',{name:'Receber senha temporária'})).toBeEnabled();
});
test('Recuperação tem labels, foco visível e sem violações WCAG 2 AA',async({page})=>{
  await page.goto(ROOT);
  await page.getByRole('textbox',{name:'E-mail'}).focus();
  expect(await page.getByRole('textbox',{name:'E-mail'}).evaluate(el=>el.matches(':focus-visible'))).toBe(true);
  const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(a.violations).toEqual([]);
});
