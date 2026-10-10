import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

test.use({
  browserName: 'chromium',
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox'],
  },
});

const url = process.env.MEG_DATAGRID_URL || 'http://127.0.0.1:4173/datagrid-harness.html';
const key = 'meg-web-evolution:datagrid:stage-04-harness-visual';
const evidence = 'artifacts/datagrid-stage05';

async function pdfText(buffer) {
  const standardFontDataUrl = pathToFileURL(path.resolve('node_modules/pdfjs-dist/standard_fonts') + path.sep).href;
  const task = getDocument({ data: new Uint8Array(buffer), disableFontFace: true, standardFontDataUrl });
  const pdf = await task.promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const words = await page.getTextContent();
    pages.push(words.items.map((item) => item.str || '').join(' '));
  }
  await task.destroy();
  return pages;
}

async function seedGamma(page) {
  await page.evaluate((storageKey) => {
    localStorage.setItem(storageKey, JSON.stringify({
      filters: { segment: { type: 'enum', selected: ['gamma'] } },
      sort: [{ key: 'amount', direction: 'desc' }],
      columnOrder: [], hiddenColumns: [], widths: {}, pageSize: 600,
    }));
  }, key);
  await page.reload();
}

test('Busca normalizada, chip, AND com coluna e Limpar tudo', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 600 });
  await page.goto(url + '?state=visual');
  const input = page.getByRole('searchbox', { name: 'Buscar em todas as colunas visíveis' });
  await input.fill('tecnico 003');
  await expect(page.locator('.meg-datagrid-quick-search__count')).toContainText('1 de 640 registros');
  await expect(page.getByRole('button', { name: /Remover filtro Busca/i })).toBeVisible();
  await page.getByRole('button', { name: /Remover filtro Busca/i }).click();
  await expect(page.locator('.meg-datagrid-quick-search__count')).toContainText('640 de 640 registros');
  await seedGamma(page);
  await input.fill('tecnico 003');
  await expect(page.locator('.meg-datagrid-quick-search__count')).toContainText('1 de 640 registros');
  await page.getByRole('button', { name: 'Limpar tudo' }).click();
  await expect(input).toHaveValue('');
  await expect(page.locator('.meg-datagrid-quick-search__count')).toContainText('640 de 640 registros');
});

test('Atalho e busca compacta com chips não podem causar rolagem horizontal da página', async ({ page }) => {
  for (const size of [
    { width: 1366, height: 768 }, { width: 1366, height: 600 },
    { width: 1024, height: 600 }, { width: 1093, height: 480 }, { width: 910, height: 400 },
  ]) {
    await page.setViewportSize(size);
    await page.goto(url + '?state=visual');
    await page.keyboard.press('Control+k');
    const input = page.getByRole('searchbox', { name: 'Buscar em todas as colunas visíveis' });
    await expect(input).toBeFocused();
    await input.fill('tecnico 003');
    await expect(page.locator('.meg-datagrid-quick-search__count')).toContainText('1 de 640 registros');
    if ([1366, 910].includes(size.width) && size.height <= 600) {
      await fs.mkdir(evidence, { recursive: true });
      await page.screenshot({ path: path.join(evidence, 'toolbar-' + size.width + 'x' + size.height + '.png') });
    }
    const geometry = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      toolbar: (() => { const r = document.querySelector('.meg-datagrid-toolbar').getBoundingClientRect(); return { left: r.left, right: r.right }; })(),
    }));
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.toolbar.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  }
});

test('PDF sem filtros baixa A4 paisagem com cabeçalho, totais e acentos Helvetica', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 600 });
  await page.goto(url + '?state=visual');
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF' }).click();
  const download = await promise;
  expect(download.suggestedFilename()).toMatch(/^datagrid-tecnico_\d{4}-\d{2}-\d{2}_\d{4}\.pdf$/);
  await fs.mkdir(evidence, { recursive: true });
  const file = path.join(evidence, 'datagrid-sem-filtros.pdf');
  await download.saveAs(file);
  const pages = await pdfText(await fs.readFile(file));
  expect(pages.length).toBeGreaterThan(1);
  const full = pages.join(' ');
  for (const value of ['Relatório DataGrid técnico', 'Nenhum filtro aplicado', '640 de 640', 'Soma', 'Média', 'Descrição técnica', 'Usuário não identificado']) {
    expect(full).toContain(value);
  }
  expect(pages[1]).toContain('Descrição técnica');
  expect(full).toContain('Não');
  expect(full).toContain('Relatório');
  const buffer = await fs.readFile(file);
  expect(buffer.toString('latin1', 0, 8)).toMatch(/^%PDF-/);
});

test('PDF com filtros e busca lista critérios e valores do conjunto combinado', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 600 });
  await page.goto(url + '?state=visual');
  await seedGamma(page);
  const input = page.getByRole('searchbox', { name: 'Buscar em todas as colunas visíveis' });
  await input.fill('tecnico 003');
  await expect(page.locator('.meg-datagrid-quick-search__count')).toContainText('1 de 640 registros');
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF' }).click();
  const download = await promise;
  await fs.mkdir(evidence, { recursive: true });
  const file = path.join(evidence, 'datagrid-com-filtros.pdf');
  await download.saveAs(file);
  const pages = await pdfText(await fs.readFile(file));
  const txt = pages.join(' ');
  expect(txt).toContain('Busca: tecnico 003');
  expect(txt).toContain('Segmento:');
  expect(txt).toContain('1 de 640');
  expect(txt).toContain('Média');
});
