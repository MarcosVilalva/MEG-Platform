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

async function expectTooltipPosition(page, trigger, expected, activation) {
  if (activation === 'hover') {
    await trigger.hover();
  } else {
    await page.mouse.move(2, 2);
    await trigger.focus();
  }

  await expectTooltip(page, expected);

  const triggerBox = await trigger.boundingBox();
  const tooltipBox = await page.locator('[data-datagrid-tooltip]').boundingBox();
  const viewport = page.viewportSize();
  expect(triggerBox).not.toBeNull();
  expect(tooltipBox).not.toBeNull();
  expect(viewport).not.toBeNull();

  const margin = 8;
  const gap = 8;
  const tolerance = 2;
  const triggerCenter = triggerBox.x + triggerBox.width / 2;
  const tooltipCenter = tooltipBox.x + tooltipBox.width / 2;
  const idealLeft = triggerCenter - tooltipBox.width / 2;
  const clampLeft = idealLeft < margin;
  const clampRight = idealLeft + tooltipBox.width > viewport.width - margin;

  expect(tooltipBox.x).toBeGreaterThanOrEqual(margin - tolerance);
  expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(viewport.width - margin + tolerance);
  expect(tooltipBox.y).toBeGreaterThanOrEqual(margin - tolerance);
  expect(tooltipBox.y + tooltipBox.height).toBeLessThanOrEqual(viewport.height - margin + tolerance);

  if (!clampLeft && !clampRight) {
    expect(Math.abs(tooltipCenter - triggerCenter)).toBeLessThanOrEqual(8);
  } else if (clampLeft) {
    expect(Math.abs(tooltipBox.x - margin)).toBeLessThanOrEqual(tolerance);
  } else {
    expect(Math.abs((tooltipBox.x + tooltipBox.width) - (viewport.width - margin))).toBeLessThanOrEqual(tolerance);
  }

  const below = triggerBox.y + triggerBox.height + gap;
  const above = triggerBox.y - gap - tooltipBox.height;
  if (below + tooltipBox.height <= viewport.height - margin) {
    expect(Math.abs(tooltipBox.y - below)).toBeLessThanOrEqual(tolerance);
  } else if (above >= margin) {
    expect(Math.abs(tooltipBox.y - above)).toBeLessThanOrEqual(tolerance);
  }
}

for (const viewport of [
  { width: 1366, height: 600 },
  { width: 910, height: 400 },
]) {
  test(`tooltips e linhas de filtros ativos em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const dates = await seedFilters(page);

    const filterButton = page.locator('.meg-datagrid-mobile-filter');
    await expectTooltipPosition(page, filterButton, '4 filtros ativos', 'hover');
    await expectTooltipPosition(page, filterButton, '4 filtros ativos', 'focus');

    const toolbarChips = page.locator('.meg-datagrid-toolbar__filters .meg-datagrid-filter-chip');
    await expect(toolbarChips).toHaveCount(2);

    const expectedDateTooltip = `Data · ${dates.firstDate}, ${dates.secondDate}`;
    await expectTooltipPosition(page, toolbarChips.nth(0), expectedDateTooltip, 'hover');
    await expectTooltipPosition(page, toolbarChips.nth(0), expectedDateTooltip, 'focus');
    await expect(toolbarChips.nth(0)).toHaveAttribute('aria-label', `Remover filtro Data: ${dates.firstDate}, ${dates.secondDate}`);

    await expectTooltipPosition(page, toolbarChips.nth(1), 'Segmento · Grupo Gamma', 'hover');
    await expectTooltipPosition(page, toolbarChips.nth(1), 'Segmento · Grupo Gamma', 'focus');
    await expect(toolbarChips.nth(1)).toHaveAttribute('aria-label', 'Remover filtro Segmento: Grupo Gamma');

    const moreButton = page.locator('.meg-datagrid-more-filters');
    await expectTooltipPosition(page, moreButton, 'Quantidade · ≥ 23', 'hover');
    await expectTooltip(page, 'Valor técnico · ≥ 23,00');
    await expectTooltipPosition(page, moreButton, 'Quantidade · ≥ 23', 'focus');
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


for (const viewport of [
  { width: 1366, height: 600 },
  { width: 910, height: 400 },
]) {
  test(`rodapé permanece visível no vazio filtrado em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(appUrl);
    await page.evaluate(({ key }) => {
      localStorage.setItem(key, JSON.stringify({
        filters: {
          amount: { type: 'currency', operator: 'gte', value: '999999', value2: '', selected: [] },
        },
        sort: [],
        columnOrder: [],
        hiddenColumns: [],
        widths: {},
        pageSize: 600,
      }));
    }, { key: storageKey });
    await page.reload();

    const emptyMessage = page.getByText('Nenhum resultado com os filtros atuais');
    const footer = page.locator('.meg-datagrid-footer');
    const range = page.locator('.meg-datagrid-page-range');
    const pageSize = page.locator('.meg-datagrid-page-size select');
    const previous = page.getByRole('button', { name: 'Página anterior' });
    const next = page.getByRole('button', { name: 'Próxima página' });
    const paginationIndicator = page.locator('.meg-datagrid-pagination > span');

    await expect(emptyMessage).toBeVisible();
    await expect(footer).toBeVisible();
    await expect(range).toHaveText('0–0 de 0');
    await expect(previous).toBeDisabled();
    await expect(next).toBeDisabled();
    await expect(paginationIndicator).toHaveText('1 / 1');

    await pageSize.selectOption('100');
    await expect(pageSize).toHaveValue('100');
    await expect(range).toHaveText('0–0 de 0');
    await expect(paginationIndicator).toHaveText('1 / 1');

    const metrics = await page.evaluate(() => {
      const footer = document.querySelector('.meg-datagrid-footer');
      const empty = document.querySelector('.meg-datagrid-filtered-empty .meg-datagrid-empty');
      const viewport = document.querySelector('.meg-datagrid-filtered-empty');
      const footerRect = footer?.getBoundingClientRect();
      const emptyRect = empty?.getBoundingClientRect();
      const viewportRect = viewport?.getBoundingClientRect();
      return {
        innerHeight: window.innerHeight,
        documentScrollHeight: document.documentElement.scrollHeight,
        bodyScrollHeight: document.body.scrollHeight,
        footerTop: footerRect?.top ?? null,
        footerBottom: footerRect?.bottom ?? null,
        emptyTop: emptyRect?.top ?? null,
        emptyBottom: emptyRect?.bottom ?? null,
        viewportTop: viewportRect?.top ?? null,
        viewportBottom: viewportRect?.bottom ?? null,
        viewportScrollHeight: viewport?.scrollHeight ?? null,
        viewportClientHeight: viewport?.clientHeight ?? null,
      };
    });

    expect(metrics.footerTop).not.toBeNull();
    expect(metrics.footerBottom).not.toBeNull();
    expect(metrics.footerTop).toBeGreaterThanOrEqual(0);
    expect(metrics.footerBottom).toBeLessThanOrEqual(viewport.height + 1);
    expect(metrics.documentScrollHeight).toBeLessThanOrEqual(viewport.height + 1);
    expect(metrics.bodyScrollHeight).toBeLessThanOrEqual(viewport.height + 1);

    expect(metrics.emptyTop).not.toBeNull();
    expect(metrics.emptyBottom).not.toBeNull();
    expect(metrics.viewportTop).not.toBeNull();
    expect(metrics.viewportBottom).not.toBeNull();
    expect(metrics.emptyTop).toBeGreaterThanOrEqual(metrics.viewportTop - 1);
    expect(metrics.emptyBottom).toBeLessThanOrEqual(metrics.viewportBottom + 1);
    expect(metrics.viewportScrollHeight).toBeLessThanOrEqual(metrics.viewportClientHeight + 1);
  });
}
