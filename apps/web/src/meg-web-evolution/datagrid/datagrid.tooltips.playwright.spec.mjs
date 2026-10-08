import { test, expect } from '@playwright/test';

test.use({
  browserName: 'chromium',
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox'],
  },
});

const appUrl = process.env.MEG_DATAGRID_URL || 'http://127.0.0.1:4173/datagrid-harness.html';
const storageKey = 'meg-web-evolution:datagrid:stage-04-harness';

function isoDayOffset(offset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ptBrDate(iso) {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

async function seedFilters(page) {
  const firstDate = isoDayOffset(-58);
  const secondDate = isoDayOffset(-57);
  const filters = {
    date: { type: 'date', operator: 'between', value: '', value2: '', selected: [firstDate, secondDate] },
    segment: { type: 'enum', selected: ['gamma'] },
    quantity: { type: 'number', operator: 'gte', value: '23', value2: '', selected: [] },
    amount: { type: 'currency', operator: 'gte', value: '23,00', value2: '', selected: [] },
  };

  await page.goto(appUrl);
  await page.evaluate(({ key, filters: next }) => {
    localStorage.setItem(key, JSON.stringify({
      filters: next,
      sort: [],
      columnOrder: [],
      hiddenColumns: [],
      widths: {},
      pageSize: 600,
    }));
  }, { key: storageKey, filters });
  await page.reload();
  await expect(page.locator('.meg-datagrid-toolbar')).toBeVisible();

  return {
    firstDate: ptBrDate(firstDate),
    secondDate: ptBrDate(secondDate),
  };
}

async function expectTooltip(page, expected) {
  const tooltip = page.locator('[data-datagrid-tooltip]');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText(expected);
}

for (const viewport of [
  { width: 1366, height: 600 },
  { width: 910, height: 400 },
]) {
  test(`tooltips e linhas de filtros ativos em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const dates = await seedFilters(page);

    const filterButton = page.locator('.meg-datagrid-mobile-filter');
    await filterButton.focus();
    await expectTooltip(page, '4 filtros ativos');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-datagrid-tooltip]')).toHaveCount(0);

    const toolbarChips = page.locator('.meg-datagrid-toolbar__filters .meg-datagrid-filter-chip');
    await expect(toolbarChips).toHaveCount(2);

    const expectedDateTooltip = `Data · ${dates.firstDate}, ${dates.secondDate}`;
    await toolbarChips.nth(0).hover();
    await expectTooltip(page, expectedDateTooltip);
    await page.mouse.move(2, 2);
    await expect(page.locator('[data-datagrid-tooltip]')).toHaveCount(0);

    await toolbarChips.nth(0).focus();
    await expectTooltip(page, expectedDateTooltip);
    await expect(toolbarChips.nth(0)).toHaveAttribute('aria-label', `Remover filtro Data: ${dates.firstDate}, ${dates.secondDate}`);

    await toolbarChips.nth(1).focus();
    await expectTooltip(page, 'Segmento · Grupo Gamma');
    await expect(toolbarChips.nth(1)).toHaveAttribute('aria-label', 'Remover filtro Segmento: Grupo Gamma');

    const moreButton = page.locator('.meg-datagrid-more-filters');
    await moreButton.focus();
    await expectTooltip(page, 'Quantidade · ≥ 23');
    await expectTooltip(page, 'Valor técnico · ≥ 23,00');

    await moreButton.press('Enter');
    await expect(page.locator('[data-datagrid-tooltip]')).toHaveCount(0);

    const popover = page.locator('[data-datagrid-active-filters-popover]');
    await expect(popover).toBeVisible();
    const rows = popover.locator('.meg-datagrid-active-filter-row');
    await expect(rows).toHaveCount(4);

    await expect(rows.nth(0).locator('.meg-datagrid-active-filter-row__label')).toHaveText('Data');
    await expect(rows.nth(0).locator('.meg-datagrid-active-filter-row__summary')).toHaveText(`${dates.firstDate}, ${dates.secondDate}`);
    await expect(rows.nth(1).locator('.meg-datagrid-active-filter-row__summary')).toHaveText('Grupo Gamma');
    await expect(rows.nth(2).locator('.meg-datagrid-active-filter-row__summary')).toHaveText('≥ 23');
    await expect(rows.nth(3).locator('.meg-datagrid-active-filter-row__summary')).toHaveText('≥ 23,00');

    await expect(rows.nth(0).locator('.meg-datagrid-active-filter-row__remove')).toHaveAttribute(
      'aria-label',
      `Remover filtro Data: ${dates.firstDate}, ${dates.secondDate}`,
    );
    await expect(rows.nth(3).locator('.meg-datagrid-active-filter-row__remove')).toHaveAttribute(
      'aria-label',
      'Remover filtro Valor técnico: ≥ 23,00',
    );

    const metrics = await rows.evaluateAll((elements) => elements.map((row) => {
      const style = getComputedStyle(row);
      const summary = row.querySelector('.meg-datagrid-active-filter-row__summary');
      const remove = row.querySelector('.meg-datagrid-active-filter-row__remove');
      const rowRect = row.getBoundingClientRect();
      const removeRect = remove?.getBoundingClientRect();
      const list = row.parentElement;
      const listStyle = list ? getComputedStyle(list) : null;
      const listInnerWidth = list
        ? list.clientWidth - parseFloat(listStyle?.paddingLeft || '0') - parseFloat(listStyle?.paddingRight || '0')
        : 0;
      return {
        radius: style.borderRadius,
        minHeight: style.minHeight,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        widthDelta: Math.abs(rowRect.width - listInnerWidth),
        gridColumns: style.gridTemplateColumns,
        summaryWhiteSpace: summary ? getComputedStyle(summary).whiteSpace : '',
        summaryOverflow: summary ? getComputedStyle(summary).overflow : '',
        summaryTextOverflow: summary ? getComputedStyle(summary).textOverflow : '',
        removeCenterDelta: removeRect
          ? Math.abs((rowRect.top + rowRect.height / 2) - (removeRect.top + removeRect.height / 2))
          : 999,
      };
    }));

    for (const metric of metrics) {
      expect(metric.radius).toBe('8px');
      expect(metric.minHeight).toBe('60px');
      expect(metric.paddingTop).toBe(metric.paddingBottom);
      expect(metric.widthDelta).toBeLessThanOrEqual(1);
      expect(metric.gridColumns.split(' ').length).toBeGreaterThanOrEqual(2);
      expect(metric.summaryWhiteSpace).toBe('normal');
      expect(metric.summaryOverflow).toBe('visible');
      expect(metric.summaryTextOverflow).not.toBe('ellipsis');
      expect(metric.removeCenterDelta).toBeLessThanOrEqual(1.5);
    }

    const sixDates = [-60, -59, -58, -57, -56, -55].map(isoDayOffset);
    await page.evaluate(({ key, selected }) => {
      localStorage.setItem(key, JSON.stringify({
        filters: {
          date: { type: 'date', operator: 'between', value: '', value2: '', selected },
        },
        sort: [],
        columnOrder: [],
        hiddenColumns: [],
        widths: {},
        pageSize: 600,
      }));
    }, { key: storageKey, selected: sixDates });
    await page.reload();

    const dateChipWithOverflow = page.locator('.meg-datagrid-toolbar__filters .meg-datagrid-filter-chip').first();
    await dateChipWithOverflow.focus();
    const firstFiveDates = sixDates.slice(0, 5).map(ptBrDate);
    const sixthDate = ptBrDate(sixDates[5]);
    const overflowTooltip = page.locator('[data-datagrid-tooltip]');
    await expect(overflowTooltip).toBeVisible();
    await expect(overflowTooltip).toContainText(`Data · ${firstFiveDates.join(', ')}, +1`);
    await expect(overflowTooltip).not.toContainText(sixthDate);
  });
}
