import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
const ROOT = 'http://127.0.0.1:4173/web-evolution.html?auth=create-account';
const DIR = 'artifacts/meg-stage05-auth';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });
const sizes = [[360,844],[390,844],[768,1024],[1365,600],[1920,1080]];
for (const [width,height] of sizes) {
  test(`Criar Conta ${width}x${height}: captura integral e erro`, async ({ browser }) => {
    const context = await browser.newContext({ viewport:{width,height}, reducedMotion:'reduce' });
    const page=await context.newPage();
    await page.goto(ROOT);
    await expect(page.getByRole('heading',{name:'Criar conta'})).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    mkdirSync(DIR,{recursive:true});
    await page.screenshot({path:`${DIR}/criar-conta-${width}x${height}.png`,fullPage:true,animations:'disabled'});
    await page.getByRole('button',{name:'Continuar'}).click();
    await expect(page.getByRole('alert')).toContainText('Informe seu nome');
    await page.screenshot({path:`${DIR}/criar-conta-${width}x${height}-erro.png`,fullPage:true,animations:'disabled'});
    for (const button of await page.getByRole('button').all()) {
      const bounds=await button.boundingBox();
      if (bounds) expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
    await context.close();
  });
}
test('Criar Conta mantém 202 PENDING_APPROVAL sem inventar confirmação imediata',async({page})=>{
  let requestBody;
  await page.route('**/auth/register',async route=>{
    requestBody=route.request().postDataJSON();
    await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'PENDING_APPROVAL',message:'Solicitação enviada ao administrador.',administratorEmail:'admin@exemplo.com'})});
  });
  await page.goto(ROOT);
  await page.getByRole('textbox',{name:'Nome completo'}).fill('Pessoa Exemplo');
  await page.getByRole('textbox',{name:'E-mail'}).fill('usuario@exemplo.com');
  await page.getByRole('textbox',{name:'Telefone'}).fill('(18) 99999-9999');
  await page.getByLabel('Senha',{exact:true}).fill('SenhaTeste123!');
  await page.getByLabel('Confirmar senha').fill('SenhaTeste123!');
  await page.getByRole('button',{name:'Continuar'}).click();
  await expect(page.getByText('Aguardando aprovação')).toBeVisible();
  expect(requestBody.phone).toBe('18999999999');
  expect(requestBody.accountType).toBe('REQUEST_ACCESS');
});
test('Criar meu espaço MEG usa contrato existente de cadastro',async({page})=>{
  let body;
  await page.route('**/auth/register',async route=>{
    body=route.request().postDataJSON();
    await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'PENDING_APPROVAL',message:'Aguardando aprovação',administratorEmail:'admin@exemplo.com'})});
  });
  await page.goto(ROOT);
  await page.getByRole('radio',{name:'Criar meu espaço MEG'}).check();
  await page.getByRole('textbox',{name:'Nome completo'}).fill('Pessoa Exemplo');
  await page.getByRole('textbox',{name:'E-mail'}).fill('usuario@exemplo.com');
  await page.getByRole('textbox',{name:'Telefone'}).fill('(18) 99999-9999');
  await page.getByRole('textbox',{name:'Nome do espaço MEG'}).fill('Espaço Exemplo');
  await page.getByLabel('Senha',{exact:true}).fill('SenhaTeste123!');
  await page.getByLabel('Confirmar senha').fill('SenhaTeste123!');
  await page.getByRole('button',{name:'Continuar'}).click();
  expect(body.accountType).toBe('CREATE_WORKSPACE');
  expect(body.workspaceName).toBe('Espaço Exemplo');
});
test('Criar Conta trata erro de API e preserva senha fora de armazenamento',async({page})=>{
  await page.route('**/auth/register',route=>route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'EMAIL_ALREADY_REGISTERED'})}));
  await page.goto(ROOT);
  await page.getByRole('textbox',{name:'Nome completo'}).fill('Pessoa Exemplo');
  await page.getByRole('textbox',{name:'E-mail'}).fill('usuario@exemplo.com');
  await page.getByRole('textbox',{name:'Telefone'}).fill('(18) 99999-9999');
  await page.getByLabel('Senha',{exact:true}).fill('SenhaTeste123!');
  await page.getByLabel('Confirmar senha').fill('SenhaTeste123!');
  await page.getByRole('button',{name:'Continuar'}).click();
  await expect(page.getByRole('alert')).toContainText('e-mail já possui cadastro');
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('SenhaTeste123!');
});
test('Criar Conta usa labels, foco visível e sem violações WCAG AA',async({page})=>{
  await page.goto(ROOT);
  await page.getByRole('textbox',{name:'Nome completo'}).focus();
  expect(await page.getByRole('textbox',{name:'Nome completo'}).evaluate(el=>el.matches(':focus-visible'))).toBe(true);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});
