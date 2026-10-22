import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';

const ROOT = 'http://127.0.0.1:4173/web-evolution.html?auth=recover-password';
const EVIDENCE = 'artifacts/meg-stage05-recover-safe';
const mockRoute = '**/api/auth/forgot-password';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });
test.setTimeout(40_000);

async function visibleAndReachable(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport({ ratio: .85 });
  const accessible = await locator.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const target = document.elementFromPoint(x, y);
    return Boolean(target && (element === target || element.contains(target)));
  });
  expect(accessible, 'Action center must not be obscured or clipped after scrolling').toBe(true);
}

for (const [width, height] of [[1366,768],[1366,600],[1024,600],[1093,480],[910,400]]) {
  test('Recuperar Senha ' + width + 'x' + height + ': campos, scroll, erro e sucesso', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    let requests = 0;
    await page.route(mockRoute, async route => {
      requests++;
      await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({
        status:'PASSWORD_SENT', deliveredTo:'hidden@example.test', notifications:[]
      }) });
    });
    try {
      await page.goto(ROOT);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole('heading', {name:'Recuperar senha'})).toBeVisible();
      const field = page.getByRole('textbox', {name:'E-mail'});
      const submit = page.getByRole('button', {name:'Receber senha temporária'});
      const back = page.getByRole('button', {name:'Voltar ao login'});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await visibleAndReachable(page, field);
      await visibleAndReachable(page, submit);
      await visibleAndReachable(page, back);
      mkdirSync(EVIDENCE, {recursive:true});
      await page.screenshot({path:EVIDENCE+'/normal-'+width+'x'+height+'.png',fullPage:true,animations:'disabled'});
      await submit.click();
      await expect(page.getByRole('alert')).toContainText('Digite um e-mail válido.');
      await expect(field).toBeFocused();
      await expect(field).toHaveAttribute('aria-invalid','true');
      const describedBy = await field.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      await expect(page.locator('[id="' + describedBy + '"]')).toContainText('Digite um e-mail válido.');
      await visibleAndReachable(page, field);
      await visibleAndReachable(page, back);
      await page.screenshot({path:EVIDENCE+'/error-'+width+'x'+height+'.png',fullPage:true,animations:'disabled'});
      await field.fill('  QA.CASE@EXAMPLE.TEST  ');
      await expect(field).toHaveAttribute('aria-invalid','false');
      await submit.click();
      await expect(page.getByRole('heading',{name:'Solicitação recebida'})).toBeVisible();
      await expect(page.getByRole('heading',{name:'Solicitação recebida'})).toBeFocused();
      await expect(back).toHaveCount(1);
      await expect(page.getByText('qa.case@example.test')).toHaveCount(0);
      await expect(page.getByText('hidden@example.test')).toHaveCount(0);
      await visibleAndReachable(page, back);
      await page.screenshot({path:EVIDENCE+'/success-'+width+'x'+height+'.png',fullPage:true,animations:'disabled'});
      expect(requests).toBe(1);
      await back.click();
      await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
    } finally { await context.close(); }
  });
}

test('Duas submissões síncronas, uma chamada remota; loading, falha genérica e retry', async ({page}) => {
  let releaseFirst;
  let requested = 0;
  await page.route(mockRoute, async route => {
    requested++;
    if (requested === 1) {
      await new Promise(resolve => { releaseFirst = resolve; });
      await route.fulfill({status:503, contentType:'application/json', body:JSON.stringify({error:'ACCOUNT_NOT_FOUND', userEmail:'must-not-appear@example.test'})});
    } else {
      await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'PASSWORD_SENT',deliveredTo:'private@example.test',notifications:[]})});
    }
  });
  await page.goto(ROOT);
  const field=page.getByRole('textbox',{name:'E-mail'});
  const submit=page.getByRole('button',{name:'Receber senha temporária'});
  await field.fill('fixture@example.test');
  await page.evaluate(() => {
    const form = document.querySelector('.meg-auth-form');
    form.requestSubmit(); form.requestSubmit();
  });
  await expect.poll(() => requested).toBe(1);
  await expect(page.getByRole('button',{name:'Solicitando...'})).toBeDisabled();
  await expect(page.locator('.meg-auth-form')).toHaveAttribute('aria-busy','true');
  releaseFirst();
  await expect(page.getByRole('alert')).toContainText('Tente novamente mais tarde');
  await expect(field).toBeFocused();
  await expect(submit).toBeEnabled();
  await expect(page.getByText('ACCOUNT_NOT_FOUND')).toHaveCount(0);
  await expect(page.getByText('must-not-appear@example.test')).toHaveCount(0);
  await submit.click();
  await expect(page.getByRole('heading',{name:'Solicitação recebida'})).toBeVisible();
  await expect(page.getByText('private@example.test')).toHaveCount(0);
  expect(requested).toBe(2);
});

test('A11y: input nomeado, foco teclado, sucesso genérico, sem violação WCAG 2 AA',async({page})=>{
  await page.goto(ROOT);
  const field=page.getByRole('textbox',{name:'E-mail'});
  await field.focus();
  expect(await field.evaluate(el=>el.matches(':focus-visible'))).toBe(true);
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('Falha de rede não inventa sucesso, não revela cadastro e permite navegação',async({page})=>{
  await page.route(mockRoute,route=>route.abort('failed'));
  await page.goto(ROOT);
  await page.getByRole('textbox',{name:'E-mail'}).fill('fictional@example.test');
  await page.getByRole('button',{name:'Receber senha temporária'}).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível concluir sua solicitação');
  await expect(page.getByRole('heading',{name:'Solicitação recebida'})).toHaveCount(0);
  await page.getByRole('button',{name:'Voltar ao login'}).click();
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
});
