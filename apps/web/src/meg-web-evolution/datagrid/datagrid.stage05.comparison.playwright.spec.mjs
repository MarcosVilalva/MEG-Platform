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
    const toolbar = document.querySelector('.meg-datagrid-toolbar');
    const rect = (el) => {
      if (!el || !el.getClientRects().length || getComputedStyle(el).display === 'none') return null;
      const b = el.getBoundingClientRect();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
    };
    const get = (selector) => rect(document.querySelector(selector));
    const intersect = (a, b) =>
      Boolean(a && b && Math.min(a.right, b.right)-Math.max(a.left,b.left)>1 &&
        Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1);
    const boundary = rect(toolbar);
    const controls = [...toolbar.querySelectorAll('button,select,input[type="checkbox"],input[type="search"]')]
      .filter(el => { const c=getComputedStyle(el); const r=rect(el);
        return r && c.display !== 'none' && c.visibility !== 'hidden' &&
          r.width >= 4 && r.height >= 4 &&
          !(c.clipPath === 'inset(50%)');
      }).map(el => ({ name: el.getAttribute('aria-label') || el.textContent?.trim() || el.tagName,
        box: rect(el), tag: el.tagName, cls: el.className }));
    const overlaps = [];
    for (let i=0;i<controls.length;i++) for(let j=i+1;j<controls.length;j++)
      if(intersect(controls[i].box,controls[j].box))
        overlaps.push([controls[i].name,controls[j].name]);
    const clipped = controls.filter(c=> c.box.left < boundary.left-1 ||
      c.box.right > boundary.right+1 || c.box.top < boundary.top-1 ||
      c.box.bottom > boundary.bottom+1).map(c=>c.name);
    const chips = controls.filter(c=>String(c.cls).includes('filter-chip'));
    return {
      viewport: { width:innerWidth,height:innerHeight },
      document: {width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},
      toolbar:boundary,controls,overlaps,clipped,
      search:get('.meg-datagrid-quick-search'),
      primary:get('.meg-datagrid-toolbar__primary'),
      actions:get('.meg-datagrid-toolbar__actions'),
      chips:get('.meg-datagrid-toolbar__filters'),
      filterButton:get('.meg-datagrid-mobile-filter'),
      sortControl:get('.meg-datagrid-mobile-sort'),
      footer:get('.meg-datagrid-footer'),
      filterSortOverlap:intersect(get('.meg-datagrid-mobile-filter'),get('.meg-datagrid-mobile-sort')),
      chipCount:chips.length,
      overflowButton:get('.meg-datagrid-more-filters'),
      pdf:get('.meg-datagrid-pdf-action'),
    };
  });
}
async function checkGeometry(geom, size) {
  expect(geom.document.width,'Sem scroll horizontal da página').toBeLessThanOrEqual(size.width + 1);
  expect(geom.overlaps,'Nenhum par de controles sobrepostos').toEqual([]);
  expect(geom.clipped,'Nenhum controle deve ser cortado pela toolbar').toEqual([]);
  expect(geom.filterSortOverlap).toBe(false);
  if(size.width===390) {
    expect(geom.footer?.bottom,'Rodapé dentro da tela de 390').toBeLessThanOrEqual(size.height+1);
    expect(geom.pdf?.right,'PDF com respiro da borda da toolbar').toBeLessThanOrEqual(geom.toolbar.right-4);
  }
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
    await checkGeometry(geometry, size);
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
    await input.press('Enter');
    await expect(page.locator('.meg-datagrid-quick-search__count')).toContainText('1 de 640 registros');
    await fs.mkdir(root, { recursive: true });
    await page.screenshot({ path: path.join(root, 'toolbar-chips-busca-' + size.width + 'x' + size.height + '.png'), animations: 'disabled' });
    const geom = await metrics(page);
    await fs.writeFile(path.join(root, 'toolbar-chips-busca-' + size.width + 'x' + size.height + '.json'), JSON.stringify(geom, null, 2));
    await checkGeometry(geom, size);
    if (size.width===910) {
      expect(geom.search.width).toBeLessThanOrEqual(42);
      expect(geom.chipCount).toBeLessThanOrEqual(2);
      expect(geom.overflowButton,'+N filtros visível').not.toBeNull();
    }
  });
}


/* Geometria integral em viewports desktop/tablet/mobile, ambos os estados. */
for (const size of [
  {width:1366,height:768},{width:1366,height:600},
  {width:1093,height:480},{width:1024,height:600},
  {width:910,height:400},{width:760,height:600},
  {width:680,height:600},{width:680,height:400},
  {width:660,height:844},{width:640,height:600},
  {width:600,height:844},{width:390,height:844},
]) {
  test('Geometria completa com filtros: '+size.width+'x'+size.height, async ({page}) => {
    await page.setViewportSize(size);
    await page.goto(url+'?state=visual');
    await page.evaluate(() => {
      localStorage.setItem('meg-web-evolution:datagrid:stage-04-harness-visual',
        JSON.stringify({ filters:{segment:{type:'enum',selected:['gamma']}, active:{type:'boolean',booleanValue:true}},
          sort:[],columnOrder:[],hiddenColumns:[],widths:{},pageSize:600 }));
    });
    await page.reload();
    if(size.width<1024) await page.getByRole('button',{name:'Abrir busca rápida'}).click();
    const input=page.getByRole('searchbox',{name:'Buscar em todas as colunas visíveis'});
    await input.fill('tecnico 003');
    await input.press('Enter');
    await expect(page.locator('.meg-datagrid-quick-search__count')).toContainText('1 de 640 registros');
    const geom=await metrics(page);
    await checkGeometry(geom,size);
    expect(geom.chipCount,'Máximo de 2 chips visíveis').toBeLessThanOrEqual(2);
    if(size.width===910) expect(geom.overflowButton,'+N filtros obrigatório').not.toBeNull();
  });
}
