import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

test.use({
  browserName: 'chromium',
  launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] },
});
const url = process.env.MEG_DATAGRID_URL || 'http://127.0.0.1:4173/datagrid-harness.html';
const root = path.resolve('artifacts/datagrid-stage05/comparativos');
const baseline = path.resolve('apps/web/src/meg-web-evolution/datagrid/datagrid.quality.playwright.spec.mjs-snapshots');
const snapshots = [
  { width: 1366, height: 600 },
  { width: 910, height: 400 },
  { width: 680, height: 600 },
  { width: 680, height: 400 },
  { width: 640, height: 600 },
  { width: 390, height: 844 },
];

async function metrics(page) {
  return page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element || !element.getClientRects().length || getComputedStyle(element).display === 'none') return null;
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const a = rect('.meg-datagrid-mobile-filter');
    const b = rect('.meg-datagrid-mobile-sort');
    const intersect = (p, q) => Boolean(p && q && p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      search: rect('.meg-datagrid-quick-search'),
      primary: rect('.meg-datagrid-toolbar__primary'),
      actions: rect('.meg-datagrid-toolbar__actions'),
      chips: rect('.meg-datagrid-toolbar__filters'),
      filterButton: a,
      sortControl: b,
      footer: rect('.meg-datagrid-footer'),
      filterSortOverlap: intersect(a, b),
    };
  });
}

async function pairedImage(page, before, after, dest) {
  const left = before.toString('base64');
  const right = after.toString('base64');
  const result = await page.evaluate(async ({ left, right }) => {
    const load = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/png;base64,' + src;
    });
    const [a, b] = await Promise.all([load(left), load(right)]);
    const gap = 24, top = 36;
    const canvas = document.createElement('canvas');
    canvas.width = a.naturalWidth + gap + b.naturalWidth;
    canvas.height = Math.max(a.naturalHeight, b.naturalHeight) + top;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#10282c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 19px sans-serif';
    ctx.fillText('ANTES: baseline oficial Etapa 04', 10, 25);
    ctx.fillText('DEPOIS: composicao proposta Etapa 05', a.naturalWidth + gap + 10, 25);
    ctx.drawImage(a, 0, top);
    ctx.drawImage(b, a.naturalWidth + gap, top);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { left, right });
  await fs.writeFile(dest, Buffer.from(result, 'base64'));
}

for (const size of snapshots) {
  test('Antes e depois oficial ' + size.width + 'x' + size.height, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(url + '?state=visual');
    const grid = page.locator('.meg-datagrid');
    await expect(grid).toBeVisible();
    await fs.mkdir(root, { recursive: true });
    const name = size.width + 'x' + size.height;
    const before = await fs.readFile(path.join(baseline, 'datagrid-' + name + '-linux.png'));
    const after = await grid.screenshot({ animations: 'disabled', caret: 'hide' });
    await fs.writeFile(path.join(root, name + '-ANTES.png'), before);
    await fs.writeFile(path.join(root, name + '-DEPOIS.png'), after);
    await pairedImage(page, before, after, path.join(root, name + '-COMPARATIVO.png'));
    const geometry = await metrics(page);
    await fs.writeFile(path.join(root, name + '-geometria.json'), JSON.stringify(geometry, null, 2));
    expect(geometry.filterSortOverlap, 'Filtros nao pode interceptar Ordenar por').toBe(false);
    expect(geometry.document.width).toBeLessThanOrEqual(size.width + 1);
    if (size.width === 390) {
      expect(geometry.footer?.bottom, 'Rodape deve caber em 390x844').toBeLessThanOrEqual(size.height + 1);
    }
  });
}

for (const size of [{ width: 1366, height: 600 }, { width: 910, height: 400 }]) {
  test('Toolbar com chips e busca em ' + size.width + 'x' + size.height, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(url + '?state=visual');
    await page.evaluate(() => localStorage.setItem('meg-web-evolution:datagrid:stage-04-harness-visual',
      JSON.stringify({ filters: { segment: { type: 'enum', selected: ['gamma'] }, active: { type: 'boolean', booleanValue: true } },
        sort: [], columnOrder: [], hiddenColumns: [], widths: {}, pageSize: 600 })));
    await page.reload();
    await page.keyboard.press('Control+k');
    const input = page.getByRole('searchbox', { name: 'Buscar em todas as colunas visíveis' });
    await expect(input).toBeFocused();
    await input.fill('tecnico 003');
    await expect(page.locator('.meg-datagrid-quick-search__count')).toContainText('1 de 640 registros');
    await fs.mkdir(root, { recursive: true });
    await page.screenshot({ path: path.join(root, 'toolbar-chips-busca-' + size.width + 'x' + size.height + '.png'), animations: 'disabled' });
    const geom = await metrics(page);
    await fs.writeFile(path.join(root, 'toolbar-chips-busca-' + size.width + 'x' + size.height + '.json'), JSON.stringify(geom, null, 2));
    expect(geom.filterSortOverlap).toBe(false);
    expect(geom.document.width).toBeLessThanOrEqual(size.width + 1);
  });
}
