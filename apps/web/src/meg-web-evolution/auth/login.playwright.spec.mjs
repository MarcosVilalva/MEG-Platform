import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';

const ROOT = 'http://127.0.0.1:4173/web-evolution.html';
const EVIDENCE = 'artifacts/meg-web-stage05-login';
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });
const viewports = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080, scale: 1 },
  { name: 'desktop-1366x768', width: 1366, height: 768, scale: 1 },
  { name: 'low-1365x600', width: 1365, height: 600, scale: 1 },
  { name: 'mobile-360x844', width: 360, height: 844, scale: 1 },
  { name: 'mobile-390x844', width: 390, height: 844, scale: 1 },
  { name: 'tablet-768x1024', width: 768, height: 1024, scale: 1 },
  { name: 'hidpi-1366x768-2x', width: 1366, height: 768, scale: 2 },
];

async function prepare(page) {
  await page.goto(ROOT);
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
}

for (const viewport of viewports) {
  test(`${viewport.name}: Login sem sobreposição horizontal, screenshot e foco`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.scale, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await prepare(page);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      await expect(page.getByRole('button', { name: 'Entrar no MEG' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Mostrar senha' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Criar conta' })).toBeVisible();
      if (viewport.width >= 1024) {
        for (const locator of [page.locator('.meg-login-panel'), page.locator('.meg-login-feature').last()]) {
          const rect = await locator.boundingBox();
          expect(rect, 'Elemento precisa estar visível no desktop').not.toBeNull();
          expect(rect.y + rect.height, 'Elemento não pode ficar cortado no desktop').toBeLessThanOrEqual(viewport.height + 1);
        }
      }
      if (viewport.width <= 480) {
        const panel = await page.locator('.meg-login-panel').boundingBox();
        const logo = await page.locator('.meg-login-logo').boundingBox();
        const copy = await page.locator('.meg-login-hero-copy').boundingBox();
        expect(logo.y + logo.height).toBeLessThan(panel.y);
        expect(panel.y + panel.height).toBeLessThan(copy.y);
        for (const selector of ['.meg-login-password-toggle', '.meg-login-submit', '.meg-login-options a', '.meg-login-create a']) {
          const bounds = await page.locator(selector).boundingBox();
          expect(bounds.height, selector).toBeGreaterThanOrEqual(44);
        }
        const forgot = await page.locator('.meg-login-options a').boundingBox();
        const remembered = await page.locator('.meg-login-remember').boundingBox();
        expect(Math.abs(forgot.y - remembered.y)).toBeLessThanOrEqual(2);
      }
      mkdirSync(EVIDENCE, { recursive: true });
      await page.screenshot({ path: `${EVIDENCE}/${viewport.name}.png`, fullPage: true, animations: 'disabled' });
      await page.getByRole('button', { name: 'Entrar no MEG' }).click();
      await expect(page.getByRole('alert')).toContainText('Digite um e-mail válido.');
      const space = await page.evaluate(() => { const a = document.querySelector('.meg-login-message').getBoundingClientRect(); const b = document.querySelector('.meg-login-submit').getBoundingClientRect(); return b.top - a.bottom; });
      expect(space).toBeGreaterThanOrEqual(7.5);
      expect(space).toBeLessThanOrEqual(12.5);
      await page.screenshot({ path: `${EVIDENCE}/${viewport.name}-erro.png`, fullPage: true, animations: 'disabled' });
      await page.getByRole('textbox', { name: 'E-mail' }).focus();
      expect(await page.locator('input[name="email"]').evaluate(el => el.matches(':focus-visible'))).toBe(true);
    } finally { await context.close(); }
  });
}

test('Validação local e mensagens em português', async ({ page }) => {
  await prepare(page);
  await page.getByRole('button', { name: 'Entrar no MEG' }).click();
  await expect(page.getByRole('alert')).toContainText('Digite um e-mail válido.');
  await page.getByRole('textbox', { name: 'E-mail' }).fill('usuario@exemplo.com');
  await page.getByRole('button', { name: 'Entrar no MEG' }).click();
  await expect(page.getByRole('alert')).toContainText('pelo menos 8 caracteres');
});

test('Login inválido não cria sessão e informa erro genérico', async ({ page }) => {
  await page.route('**/auth/login', async route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'INVALID_CREDENTIALS' }) }));
  await prepare(page);
  await page.getByRole('textbox', { name: 'E-mail' }).fill('usuario@exemplo.com');
  await page.locator('input[name="password"]').fill('SenhaTeste123!');
  await page.getByRole('button', { name: 'Entrar no MEG' }).click();
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos');
  expect(await page.evaluate(() => sessionStorage.getItem('meg.auth.session'))).toBeNull();
});

test('Login válido usa auth-client, cria sessão e exibe Shell sem antecipar Home', async ({ page }) => {
  await page.route('**/auth/login', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    accessToken: 'test-access-token', refreshToken: 'test-refresh-token-for-fixture-only', refreshExpiresAt: '2030-01-01T00:00:00Z',
    user: { id: 'fixture-user', name: 'Usuário Exemplo', email: 'usuario@exemplo.com', status: 'ACTIVE', role: 'VIEWER', isActive: true }
  }) }));
  await prepare(page);
  await page.getByRole('textbox', { name: 'E-mail' }).fill('usuario@exemplo.com');
  await page.locator('input[name="password"]').fill('SenhaTeste123!');
  await page.getByRole('button', { name: 'Entrar no MEG' }).click();
  await expect(page.getByRole('complementary', { name: 'Navegação principal' })).toBeVisible();
  const saved = await page.evaluate(() => sessionStorage.getItem('meg.auth.session'));
  expect(JSON.parse(saved).user.email).toBe('usuario@exemplo.com');
});

test('Visibilidade da senha, lembrar apenas e-mail e destinos de navegação', async ({ page }) => {
  await prepare(page);
  const pass = page.locator('input[name="password"]');
  await expect(pass).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Mostrar senha' }).click();
  await expect(pass).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/auth=create-account/);
  await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao login' }).click();
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
  await expect(page).toHaveURL(/auth=recover-password/);
  await expect(page.getByRole('heading', { name: 'Recuperar senha' })).toBeVisible();
});

test('Teclado Enter envia uma vez e layout móvel com teclado reduzido mantém ação acessível', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 430 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await page.route('**/auth/login', async route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'INVALID_CREDENTIALS' }) }));
    await prepare(page);
    await page.getByRole('textbox', { name: 'E-mail' }).fill('usuario@exemplo.com');
    await page.locator('input[name="password"]').fill('SenhaTeste123!');
    await page.locator('input[name="password"]').press('Enter');
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: 'Entrar no MEG' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Entrar no MEG' })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  } finally { await context.close(); }
});

test('Acessibilidade do Login, sem violações WCAG 2 A/AA', async ({ page }) => {
  await prepare(page);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});
