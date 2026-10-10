import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

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

    if (viewport.width === 680 && viewport.height === 400) {
      await fs.mkdir('artifacts/datagrid-evidence', { recursive: true });
      await grid.screenshot({
        path: 'artifacts/datagrid-evidence/quality-680x400-actual.png',
        animations: 'disabled',
        caret: 'hide',
      });
    }

    await expect(grid).toHaveScreenshot(`datagrid-${viewport.width}x${viewport.height}.png`, {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.002,
    });
  });
}
