import { test, expect } from '@playwright/test';

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || undefined } });

test('a raiz apresenta Login Stage05 e cadastro permanece navegável após reload', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/');

  await expect(page.locator('[data-meg-login="stage05"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar no MEG' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar conta' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/phoenix/i);

  await page.getByRole('link', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/\?auth=create-account$/);
  await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nome completo' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Telefone' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
});
