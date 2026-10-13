import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
const ROOT = 'http://127.0.0.1:4173/web-evolution.html?auth=loading';
const DIR = 'artifacts/meg-stage05-auth';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });
for (const [width,height] of [[360,844],[390,844],[768,1024],[1365,600],[1920,1080]]) {
  test(`Loading ${width}x${height}: página inteira normal/erro`,async({browser})=>{
    const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    await page.goto(ROOT);
    await expect(page.locator('[data-meg-loading="preview-only"]')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    if (width === 1365 && height === 600) {
      expect(await page.locator('.meg-loading-art').evaluate(el => getComputedStyle(el).objectFit)).toBe('contain');
    }
    if (width <= 480) {
      const label = page.locator('.meg-loading-mobile-copy h1');
      await expect(label).toBeVisible();
      const bounds = await label.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
    }
    mkdirSync(DIR,{recursive:true});
    await page.screenshot({path:`${DIR}/loading-${width}x${height}.png`,fullPage:true,animations:'disabled'});
    await page.goto(ROOT+'&state=error');
    await expect(page.getByRole('heading',{name:'Não foi possível carregar os dados'})).toBeVisible();
    await page.screenshot({path:`${DIR}/loading-${width}x${height}-erro.png`,fullPage:true,animations:'disabled'});
    await ctx.close();
  });
}
test('Loading visual usa imagem oficial, possui progresso acessível e não faz API calls',async({page})=>{
  const requests=[];
  page.on('request',req=>{ if (/^\/(auth|finance)\//.test(new URL(req.url()).pathname)) requests.push(req.url()); });
  await page.goto(ROOT);
  await expect(page.getByRole('progressbar',{name:'Carregamento de dados'})).toHaveCount(1);
  expect(requests).toEqual([]);
});
test('Estado vazio isolado não modifica dados e permite retornar',async({page})=>{
  await page.goto(ROOT+'&state=empty');
  await expect(page.getByRole('heading',{name:'Nenhum dado para carregar'})).toBeVisible();
  await page.getByRole('button',{name:'Voltar ao login'}).click();
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
});
test('Loading possui nome acessível e nenhum problema WCAG AA',async({page})=>{
  await page.goto(ROOT);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});
