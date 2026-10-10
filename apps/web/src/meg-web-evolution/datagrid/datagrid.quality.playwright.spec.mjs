import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({
  browserName: 'chromium',
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox'],
  },
});

const baseUrl = process.env.MEG_DATAGRID_URL || 'http://127.0.0.1:4173/datagrid-harness.html';
const visualUrl = `${baseUrl}?state=visual`;
const storageKey = 'meg-web-evolution:datagrid:stage-04-harness-visual';

const approvedViewports = [
  { width: 1366, height: 600 },
  { width: 910, height: 400 },
  { width: 680, height: 600 },
  { width: 680, height: 400 },
  { width: 640, height: 600 },
  { width: 390, height: 844 },
];

async function seedFilterAndSort(page) {
  await page.goto(visualUrl);
  await page.evaluate(({ key }) => {
    localStorage.setItem(key, JSON.stringify({
      filters: {
        segment: { type: 'enum', selected: ['gamma'] },
      },
      sort: [{ key: 'amount', direction: 'desc' }],
      columnOrder: [],
      hiddenColumns: [],
      widths: {},
      pageSize: 600,
    }));
  }, { key: storageKey });
  await page.reload();
  await expect(page.locator('.meg-datagrid-toolbar')).toBeVisible();
}

for (const viewport of [
  { width: 1366, height: 600, mode: 'table' },
  { width: 680, height: 600, mode: 'cards' },
]) {
  test(`Limpar tudo preserva ordenação em ${viewport.mode} ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seedFilterAndSort(page);

    if (viewport.mode === 'table') {
      await expect(page.locator('.meg-datagrid-table')).toBeVisible();
    } else {
      await expect(page.locator('.meg-datagrid-cards')).toBeVisible();
      await expect(page.locator('.meg-datagrid-mobile-sort select')).toHaveValue('amount:desc');
    }

    const clear = page.locator('.meg-datagrid-clear-all');
    await expect(clear).toBeVisible();
    await clear.click();

    const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), storageKey);
    expect(persisted.filters).toEqual({});
    expect(persisted.sort).toEqual([{ key: 'amount', direction: 'desc' }]);

    if (viewport.mode === 'cards') {
      await expect(page.locator('.meg-datagrid-mobile-sort select')).toHaveValue('amount:desc');
    }
  });
}

test('910x400: Coluna herda tema do Operador e ano usa disclosure acessível', async ({ page }) => {
  await page.setViewportSize({ width: 910, height: 400 });
  await page.goto(visualUrl);

  await page.locator('.meg-datagrid-mobile-filter').click();
  const sheet = page.locator('[data-datagrid-mobile-sheet]');
  await expect(sheet).toBeVisible();

  const columnSelect = sheet.locator('[data-datagrid-mobile-column]');
  await columnSelect.selectOption('date');

  const operator = sheet.locator('select[name="filter-date-operator"]');
  await expect(operator).toBeVisible();

  const styles = await Promise.all([
    columnSelect.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return { backgroundColor: style.backgroundColor, color: style.color, height: rect.height };
    }),
    operator.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return { backgroundColor: style.backgroundColor, color: style.color, height: rect.height };
    }),
  ]);
  expect(styles[0].backgroundColor).toBe(styles[1].backgroundColor);
  expect(styles[0].color).toBe(styles[1].color);
  expect(Math.abs(styles[0].height - styles[1].height)).toBeLessThanOrEqual(2);

  const year = sheet.locator('.meg-datagrid-date-year__toggle').first();
  await expect(year).toHaveAttribute('aria-expanded', 'false');
  await expect(year.locator('.meg-datagrid-date-year__indicator')).toHaveText('+');

  await year.press('Enter');
  await expect(year).toHaveAttribute('aria-expanded', 'true');
  await expect(year.locator('.meg-datagrid-date-year__indicator')).toHaveText('−');

  await year.press('Space');
  await expect(year).toHaveAttribute('aria-expanded', 'false');
  await expect(year.locator('.meg-datagrid-date-year__indicator')).toHaveText('+');
});

test('FilterPanel e controles do DataGrid possuem id ou name', async ({ page }) => {
  await page.setViewportSize({ width: 910, height: 400 });
  await page.goto(visualUrl);

  await page.locator('.meg-datagrid-mobile-filter').click();
  const sheet = page.locator('[data-datagrid-mobile-sheet]');
  await expect(sheet).toBeVisible();
  const columnSelect = sheet.locator('[data-datagrid-mobile-column]');

  const missing = [];
  for (const key of ['description', 'segment', 'quantity', 'amount', 'date', 'active']) {
    await columnSelect.selectOption(key);
    const current = await page.evaluate(() => {
      const selectors = [
        '.meg-datagrid input',
        '.meg-datagrid select',
        '.meg-datagrid textarea',
        '[data-datagrid-filter-dialog] input',
        '[data-datagrid-filter-dialog] select',
        '[data-datagrid-filter-dialog] textarea',
        '[data-datagrid-mobile-sheet] input',
        '[data-datagrid-mobile-sheet] select',
        '[data-datagrid-mobile-sheet] textarea',
      ].join(',');
      return [...document.querySelectorAll(selectors)]
        .filter((element) => !element.id && !element.getAttribute('name'))
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute('type'),
          ariaLabel: element.getAttribute('aria-label'),
          placeholder: element.getAttribute('placeholder'),
        }));
    });
    if (current.length) missing.push({ key, fields: current });
  }
  expect(missing).toEqual([]);
});

for (const viewport of approvedViewports) {
  test(`axe e console DataGrid ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);

    const consoleMessages = [];
    const pageErrors = [];
    const devtoolsIssues = [];
    page.on('console', (message) => {
      if (message.type() === 'warning' || message.type() === 'error') {
        consoleMessages.push({ type: message.type(), text: message.text(), url: message.location().url || '' });
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const cdp = await page.context().newCDPSession(page);
    cdp.on('Audits.issueAdded', ({ issue }) => devtoolsIssues.push(issue));
    await cdp.send('Audits.enable');

    await page.goto(visualUrl);
    await expect(page.locator('.meg-datagrid')).toBeVisible();

    const axe = await new AxeBuilder({ page })
      .include('.meg-datagrid')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(axe.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target),
    }))).toEqual([]);

    await page.waitForTimeout(100);
    expect(consoleMessages).toEqual([]);
    expect(pageErrors).toEqual([]);

    const resolvedIssueNodes = [];
    for (const issue of devtoolsIssues) {
      const backendNodeId = issue.details?.genericIssueDetails?.violatingNodeId;
      if (!backendNodeId) continue;
      try {
        const outer = await cdp.send('DOM.getOuterHTML', { backendNodeId });
        const resolved = await cdp.send('DOM.resolveNode', { backendNodeId });
        const selectorResult = await cdp.send('Runtime.callFunctionOn', {
          objectId: resolved.object.objectId,
          returnByValue: true,
          functionDeclaration: `function () {
            const element = this;
            const escape = (value) => CSS.escape(String(value));
            if (!(element instanceof Element)) return '<non-element>';
            if (element.matches('.meg-topbar input[aria-label="Buscar"]')) {
              return '.meg-topbar input[aria-label="Buscar"]';
            }
            if (element.id) return '#' + escape(element.id);
            const name = element.getAttribute('name');
            if (name) return element.tagName.toLowerCase() + '[name="' + CSS.escape(name) + '"]';
            const aria = element.getAttribute('aria-label');
            if (aria) return element.tagName.toLowerCase() + '[aria-label="' + CSS.escape(aria) + '"]';
            const parts = [];
            let current = element;
            while (current && current.nodeType === 1 && parts.length < 5) {
              let part = current.tagName.toLowerCase();
              if (current.classList.length) part += '.' + [...current.classList].map(escape).join('.');
              parts.unshift(part);
              current = current.parentElement;
            }
            return parts.join(' > ');
          }`,
        });
        const detail = {
          viewport: `${viewport.width}x${viewport.height}`,
          code: issue.code,
          errorType: issue.details?.genericIssueDetails?.errorType ?? null,
          backendNodeId,
          selector: selectorResult.result.value ?? null,
          outerHTML: outer.outerHTML ?? null,
        };
        resolvedIssueNodes.push(detail);
        console.log('DEVTOOLS_ISSUE_NODE', JSON.stringify(detail));
      } catch (error) {
        console.log('DEVTOOLS_ISSUE_NODE_RESOLVE_ERROR', String(error));
      }
    }

    const knownShellIssues = devtoolsIssues.filter((issue) => {
      if (
        issue.code !== 'GenericIssue'
        || issue.details?.genericIssueDetails?.errorType !== 'FormEmptyIdAndNameAttributesForInputError'
      ) return false;
      const backendNodeId = issue.details?.genericIssueDetails?.violatingNodeId;
      const resolved = resolvedIssueNodes.find((item) => item.backendNodeId === backendNodeId);
      return (
        resolved?.selector === '.meg-topbar input[aria-label="Buscar"]'
        && resolved?.outerHTML === '<input aria-label="Buscar" placeholder="Buscar movimentações, contas, cartões, relatórios...">'
      );
    });
    const unexpectedIssues = devtoolsIssues.filter((issue) => !knownShellIssues.includes(issue));

    // Exceção estrita da Etapa 04: somente o campo visual de busca da topbar do Shell.
    expect(knownShellIssues.length).toBeLessThanOrEqual(1);
    expect(unexpectedIssues).toEqual([]);
  });
}

for (const viewport of approvedViewports) {
  test(`regressão visual DataGrid ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(visualUrl);
    const grid = page.locator('.meg-datagrid');
    await expect(grid).toBeVisible();

    if (viewport.width < 900) {
      await expect.poll(async () => page.evaluate(() => {
        const viewportElement = document.querySelector('.meg-datagrid__viewport');
        if (!viewportElement) return 0;
        const viewportRect = viewportElement.getBoundingClientRect();
        return [...document.querySelectorAll('.meg-datagrid-card-row')].filter((card) => {
          const rect = card.getBoundingClientRect();
          const style = getComputedStyle(card);
          return (
            rect.width > 0
            && rect.height > 0
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && rect.bottom > viewportRect.top
            && rect.top < viewportRect.bottom
          );
        }).length;
      }), {
        message: `${viewport.width}x${viewport.height}: esperado ao menos 1 card visível antes do screenshot`,
        timeout: 5000,
      }).toBeGreaterThan(0);

      if (viewport.width === 390 && viewport.height === 844) {
        const groupHeader = page.locator('.meg-datagrid-card-group .meg-datagrid-group-button').first();
        await expect(groupHeader).toBeVisible();
        const groupHeaderWidth = await groupHeader.evaluate((element) => ({
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        }));
        expect(
          groupHeaderWidth.scrollWidth,
          '390x844: cabeçalho do grupo não pode ter overflow horizontal',
        ).toBeLessThanOrEqual(groupHeaderWidth.clientWidth);
      }
    }

    await expect(grid).toHaveScreenshot(`datagrid-${viewport.width}x${viewport.height}.png`, {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.002,
    });
  });
}


async function resetVisualState(page, state = {}) {
  await page.goto(visualUrl);
  await page.evaluate(({ key, state: next }) => {
    localStorage.setItem(key, JSON.stringify({
      filters: {},
      sort: [],
      columnOrder: [],
      hiddenColumns: [],
      widths: {},
      pageSize: 600,
      ...next,
    }));
  }, { key: storageKey, state });
  await page.reload();
  await expect(page.locator('.meg-datagrid-toolbar')).toBeVisible();
}

async function openDescriptionFilter(page) {
  const button = page.getByRole('button', { name: 'Filtrar Descrição técnica' });
  await button.click();
  const dialog = page.locator('[data-datagrid-filter-dialog="description"]');
  await expect(dialog).toBeVisible();
  return dialog;
}

function distinctCheckbox(dialog, label) {
  return dialog.locator('.meg-datagrid-check')
    .filter({ hasText: label })
    .locator('input[type="checkbox"]');
}

test('Descrição técnica: 11 checkboxes selecionados retornam exatamente 11 registros', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 600 });
  await resetVisualState(page);
  const dialog = await openDescriptionFilter(page);

  const selectedLabels = Array.from({ length: 11 }, (_, index) =>
    `Registro técnico ${String(190 + index).padStart(3, '0')}`
  );

  for (const label of selectedLabels) {
    const checkbox = distinctCheckbox(dialog, label);
    await expect(checkbox).toHaveCount(1);
    await checkbox.check();
  }

  await dialog.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.locator('.meg-datagrid-harness__head p')).toContainText('11 de 640 registros técnicos');

  const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), storageKey);
  expect(persisted.filters.description.selected).toHaveLength(11);
});

test('Descrição técnica: todos os 640 valores são alcançáveis e Selecionar tudo marca os 640', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 600 });
  await resetVisualState(page);
  const dialog = await openDescriptionFilter(page);

  await expect(dialog.getByText('Selecionar tudo (640)', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Mostrando 200 de 640.', { exact: false })).toBeVisible();

  const search = dialog.locator('input[name="filter-description-distinct-search"]');
  await search.fill('Registro técnico 640');
  await expect(dialog.getByText('Registro técnico 640', { exact: true })).toBeVisible();
  await search.fill('');

  const selectAll = dialog.locator('input[name="filter-description-select-visible"]');
  await selectAll.check();
  await dialog.getByRole('button', { name: 'Aplicar' }).click();

  await expect(page.locator('.meg-datagrid-harness__head p')).toContainText('640 de 640 registros técnicos');
  const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), storageKey);
  expect(persisted.filters.description.selected).toHaveLength(640);
  expect(new Set(persisted.filters.description.selected).size).toBe(640);
});

test('Descrição técnica: Contém 3 limpa seleção discreta e popover reflete somente o critério ativo', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 600 });
  await resetVisualState(page);
  const dialog = await openDescriptionFilter(page);

  for (let sequence = 1; sequence <= 5; sequence += 1) {
    const label = `Registro técnico ${String(sequence).padStart(3, '0')}`;
    await distinctCheckbox(dialog, label).check();
  }

  const criteria = dialog.locator('input[name="filter-description-text"]');
  await criteria.fill('3');

  const checked = dialog.locator('input[name="filter-description-distinct-value"]:checked');
  await expect(checked).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.locator('.meg-datagrid-harness__head p')).toContainText('208 de 640 registros técnicos');
  await expect(page.locator('.meg-datagrid-filter-chip').filter({ hasText: 'Descrição técnica' })).toContainText('Contém 3');

  const reopened = await openDescriptionFilter(page);
  await expect(reopened.locator('input[name="filter-description-text"]')).toHaveValue('3');
  await expect(reopened.locator('input[name="filter-description-distinct-value"]:checked')).toHaveCount(0);
});

for (const viewport of [
  { width: 660, height: 600 },
  { width: 390, height: 844 },
]) {
  test(`Ordenar por não corta nem sobrepõe em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await resetVisualState(page, {
      sort: [{ key: 'amount', direction: 'asc' }],
    });

    const sort = page.locator('.meg-datagrid-mobile-sort');
    const select = sort.locator('select');
    const label = sort.locator(':scope > span');
    await expect(sort).toBeVisible();
    await expect(select).toHaveValue('amount:asc');
    await expect(select).toHaveAttribute('title', 'Valor técnico · crescente');

    const metrics = await page.evaluate(() => {
      const rect = (selector) => {
        const el = document.querySelector(selector);
        const r = el?.getBoundingClientRect();
        return r ? { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height } : null;
      };
      const overlaps = (a, b) => Boolean(a && b
        && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
        && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1);
      const toolbar = rect('.meg-datagrid-toolbar');
      const primary = rect('.meg-datagrid-toolbar__primary');
      const filter = rect('.meg-datagrid-mobile-filter');
      const selectAll = rect('.meg-datagrid-mobile-select-all');
      const sortWrap = rect('.meg-datagrid-mobile-sort');
      const sortSelect = rect('.meg-datagrid-mobile-sort select');
      const sortLabel = rect('.meg-datagrid-mobile-sort > span');
      const actions = rect('.meg-datagrid-toolbar__actions');
      return {
        toolbar, primary, filter, selectAll, sortWrap, sortSelect, sortLabel, actions,
        documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        sortClipped: Boolean(toolbar && sortSelect && (
          sortSelect.left < toolbar.left - 1 || sortSelect.right > toolbar.right + 1
        )),
        sortOverlapsFilter: overlaps(sortSelect, filter),
        sortOverlapsSelectAll: overlaps(sortSelect, selectAll),
        sortOverlapsActions: overlaps(sortSelect, actions),
      };
    });

    console.log('MOBILE_SORT_METRICS', `${viewport.width}x${viewport.height}`, JSON.stringify(metrics));
    expect(metrics.documentOverflow).toBe(false);
    expect(metrics.sortClipped).toBe(false);
    expect(metrics.sortOverlapsFilter).toBe(false);
    expect(metrics.sortOverlapsSelectAll).toBe(false);
    expect(metrics.sortOverlapsActions).toBe(false);
    expect(metrics.sortSelect.width).toBeGreaterThanOrEqual(viewport.width === 660 ? 150 : 250);

    if (viewport.width === 660) {
      expect(metrics.sortLabel.width).toBeLessThanOrEqual(2);
      expect(metrics.sortLabel.height).toBeLessThanOrEqual(2);
      expect(Math.abs(metrics.sortSelect.top - metrics.filter.top)).toBeLessThanOrEqual(2);
      expect(Math.abs(metrics.sortSelect.bottom - metrics.filter.bottom)).toBeLessThanOrEqual(2);
      expect(metrics.primary.height).toBeLessThanOrEqual(52);
    }
  });
}
