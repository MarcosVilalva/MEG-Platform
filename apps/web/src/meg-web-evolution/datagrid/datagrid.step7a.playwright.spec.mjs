import { test, expect } from '@playwright/test';

test.use({
  browserName: 'chromium',
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox'],
  },
});
const base = process.env.MEG_DATAGRID_URL || 'http://127.0.0.1:4173/datagrid-harness.html';

async function openDescription(page, width = 680) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(base + '?state=step7a');
  await page.evaluate(() => localStorage.removeItem('meg-web-evolution:datagrid:stage-04-harness-step7a'));
  await page.reload();
  await page.locator('.meg-datagrid-mobile-filter').click();
  const sheet = page.locator('[data-datagrid-mobile-sheet]');
  await expect(sheet).toBeVisible();
  await sheet.locator('[data-datagrid-mobile-column]').selectOption('description');
  return sheet;
}

test('checkbox: 11 descricoes selecionadas devolvem 11 de 640 mesmo apos criterio digitado', async ({ page }) => {
  const sheet = await openDescription(page);
  await sheet.locator('input[name="filter-description-text"]').fill('3');
  const choices = sheet.locator('.meg-datagrid-filter__values input[name="filter-description-distinct-value"]');
  await expect(choices).toHaveCount(200);
  for (let i = 0; i < 11; i++) await choices.nth(i).check();
  await expect(sheet.locator('input[name="filter-description-text"]')).toHaveValue('');
  await sheet.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.locator('.meg-datagrid-harness__head')).toContainText('11 de 640');
});

test('select all cobre 640 valores, com busca e carregamento incremental', async ({ page }) => {
  const sheet = await openDescription(page);
  const list = sheet.locator('.meg-datagrid-filter__values');
  await expect(list.locator('input[name="filter-description-distinct-value"]')).toHaveCount(200);
  await sheet.locator('input[name="filter-description-select-visible"]').check();
  await expect(sheet.locator('input[name="filter-description-select-visible"]')).toBeChecked();
  await expect(list.getByRole('button', { name: /Mostrar mais/ })).toBeVisible();
  await list.getByRole('button', { name: /Mostrar mais/ }).click();
  await expect(list.locator('input[name="filter-description-distinct-value"]')).toHaveCount(400);
  await sheet.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.locator('.meg-datagrid-harness__head')).toContainText('640 de 640');
});

test('Contem 3 deixa apenas os valores correspondentes marcados no popover', async ({ page }) => {
  const sheet = await openDescription(page);
  await sheet.locator('input[name="filter-description-text"]').fill('3');
  const rows = sheet.locator('.meg-datagrid-filter__values .meg-datagrid-check:not(.meg-datagrid-check--all)');
  await expect(rows.first()).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await expect(rows.nth(i).locator('input[type="checkbox"]')).not.toBeChecked();
  }
  await expect(rows.filter({ hasText: 'Registro técnico 003' }).first().locator('input[type="checkbox"]')).toBeChecked();
  await sheet.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.locator('.meg-datagrid-harness__head')).not.toContainText('640 de 640');
});

for (const width of [660, 390]) {
  test('toolbar sem corte ou sobreposicao em ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base + '?state=step7a-layout');
    const toolbar = page.locator('.meg-datagrid-toolbar');
    const sort = page.locator('.meg-datagrid-mobile-sort');
    await expect(sort).toBeVisible();
    await expect(sort.locator('select')).toBeVisible();
    const geometry = await toolbar.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const sort = element.querySelector('.meg-datagrid-mobile-sort');
      const label = sort.querySelector('span').getBoundingClientRect();
      const select = sort.querySelector('select').getBoundingClientRect();
      return { left: rect.left, right: rect.right, labelRight: label.right, selectLeft: select.left,
        viewport: document.documentElement.clientWidth, bodyScroll: document.documentElement.scrollWidth };
    });
    expect(geometry.bodyScroll).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
    if (width === 660) expect(geometry.labelRight).toBeLessThanOrEqual(geometry.selectLeft + 1);
  });
}
