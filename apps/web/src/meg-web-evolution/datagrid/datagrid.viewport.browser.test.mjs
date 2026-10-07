import assert from 'node:assert/strict';
import { createDataGridBrowser } from './datagrid.browser.driver.mjs';

const appUrl = process.env.MEG_WEB_EVOLUTION_DATAGRID_URL || 'http://127.0.0.1:4173/datagrid-harness.html';
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1366, height: 600 },
  { width: 1024, height: 768 },
  { width: 900, height: 700 },
  { width: 640, height: 600 },
  { width: 390, height: 844 },
];

const browser = await createDataGridBrowser();

async function assertDesktopContainment(width, height, collapsed) {
  const label = width + 'x' + height + (collapsed ? ' recolhida' : ' expandida');
  await browser.setViewport(width, height);
  await browser.navigate(appUrl);
  await browser.evaluate(`(() => {
    localStorage.removeItem('meg-web-evolution:datagrid:stage-04-harness');
    localStorage.setItem('meg-web-evolution:sidebar-collapsed', '${collapsed ? 'true' : 'false'}');
    return true;
  })()`);
  await browser.navigate(appUrl);
  await browser.sleep(180);

  const snapshot = await browser.evaluate(`(() => {
    const visible = (element) => Boolean(element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden' && getComputedStyle(element).display !== 'none');
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left:value.left, right:value.right, top:value.top, bottom:value.bottom, width:value.width, height:value.height };
    };
    const within = (child, parent) => child.left >= parent.left - 1 && child.right <= parent.right + 1 && child.top >= parent.top - 1 && child.bottom <= parent.bottom + 1;
    const topbar = document.querySelector('.meg-topbar');
    const grid = document.querySelector('[data-datagrid]');
    const main = document.querySelector('.meg-main');
    const viewport = document.querySelector('.meg-datagrid__viewport');
    const topbarRect = rect(topbar);
    const gridRect = rect(grid);
    const topbarControls = [...topbar.querySelectorAll('button, input')].filter(visible).map((element) => ({ selector:element.getAttribute('aria-label') || element.className, rect:rect(element) }));
    const profileChevron = document.querySelector('.meg-profile svg:last-child');
    if (visible(profileChevron)) topbarControls.push({ selector:'profile-chevron', rect:rect(profileChevron) });
    const gridControls = [...grid.querySelectorAll('.meg-datagrid-toolbar button, .meg-datagrid-footer button, .meg-datagrid-footer select')].filter(visible).map((element) => ({ selector:element.getAttribute('aria-label') || element.textContent.trim() || element.tagName, rect:rect(element) }));
    return {
      collapsed: document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed'),
      documentScrollWidth: document.documentElement.scrollWidth,
      mainClientWidth: main.clientWidth,
      mainScrollWidth: main.scrollWidth,
      viewportOverflowX: getComputedStyle(viewport).overflowX,
      clippedTopbar: topbarControls.filter((item) => !within(item.rect, topbarRect)),
      clippedGrid: gridControls.filter((item) => !within(item.rect, gridRect)),
    };
  })()`);

  assert.equal(snapshot.collapsed, collapsed, label + ': estado da sidebar incorreto');
  assert.ok(snapshot.documentScrollWidth <= width, label + ': documento criou rolagem horizontal');
  assert.ok(snapshot.mainScrollWidth <= snapshot.mainClientWidth + 1, label + ': área principal criou rolagem horizontal');
  assert.equal(snapshot.viewportOverflowX, 'auto', label + ': scroll horizontal deve ficar confinado ao grid');
  assert.deepEqual(snapshot.clippedTopbar, [], label + ': controle da topbar cortado');
  assert.deepEqual(snapshot.clippedGrid, [], label + ': controle do grid cortado');
}

async function assertLowHeightFilterDialogs(width, height) {
  const label = width + 'x' + height;
  const filters = [
    ['date', 'Data'],
    ['description', 'Descrição técnica'],
    ['quantity', 'Quantidade'],
    ['amount', 'Valor técnico'],
    ['segment', 'Segmento'],
    ['active', 'Ativo'],
  ];

  await browser.setViewport(width, height);
  await browser.navigate(appUrl);
  await browser.evaluate("(() => { localStorage.removeItem('meg-web-evolution:datagrid:stage-04-harness'); return true; })()");
  await browser.navigate(appUrl);
  await browser.sleep(160);

  for (const [key, columnLabel] of filters) {
    const open = async () => {
      const opened = await browser.evaluate(`(() => {
        const th=[...document.querySelectorAll('.meg-datagrid-table thead th')].find((item)=>item.textContent.includes(${JSON.stringify(columnLabel)}));
        const button=th?.querySelector('.meg-datagrid-filter-button');
        if (!button) return false;
        button.focus();
        button.click();
        return true;
      })()`);
      assert.equal(opened, true, label + ': funil ausente para ' + columnLabel);
      await browser.sleep(60);
    };

    await open();
    const geometry = await browser.evaluate(`(() => {
      const dialog=document.querySelector('[data-datagrid-filter-dialog="${key}"]');
      if (!dialog) return null;
      const rect=dialog.getBoundingClientRect();
      const footer=dialog.querySelector('.meg-datagrid-filter-panel__footer');
      const clear=[...dialog.querySelectorAll('button')].find((button)=>button.textContent.trim()==='Limpar');
      const apply=[...dialog.querySelectorAll('button')].find((button)=>button.textContent.trim()==='Aplicar');
      const footerRect=footer?.getBoundingClientRect();
      const clearRect=clear?.getBoundingClientRect();
      const applyRect=apply?.getBoundingClientRect();
      const clickable=(button, buttonRect)=>{
        if(!button || !buttonRect) return false;
        const hit=document.elementFromPoint(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2);
        return !button.disabled && Boolean(hit && button.contains(hit));
      };
      return {
        lowSheet: dialog.hasAttribute('data-datagrid-low-height-sheet'),
        top:rect.top,
        bottom:rect.bottom,
        height:rect.height,
        footerTop:footerRect?.top,
        footerBottom:footerRect?.bottom,
        clearTop:clearRect?.top,
        clearBottom:clearRect?.bottom,
        applyTop:applyRect?.top,
        applyBottom:applyRect?.bottom,
        clearClickable:clickable(clear, clearRect),
        applyClickable:clickable(apply, applyRect),
      };
    })()`);
    assert.ok(geometry, label + ': filtro ' + columnLabel + ' não abriu');
    assert.equal(geometry.lowSheet, true, label + ': viewport baixa deve usar bottom sheet em ' + columnLabel);
    assert.ok(geometry.top >= -1 && geometry.bottom <= height + 1, label + ': diálogo de ' + columnLabel + ' ultrapassou a viewport');
    assert.ok(geometry.footerTop >= -1 && geometry.footerBottom <= height + 1, label + ': rodapé de ' + columnLabel + ' saiu da viewport');
    assert.ok(geometry.clearTop >= -1 && geometry.clearBottom <= height + 1 && geometry.clearClickable, label + ': Limpar inacessível em ' + columnLabel);
    assert.ok(geometry.applyTop >= -1 && geometry.applyBottom <= height + 1 && geometry.applyClickable, label + ': Aplicar inacessível em ' + columnLabel);

    await browser.evaluate(`(() => {
      const dialog=document.querySelector('[data-datagrid-filter-dialog="${key}"]');
      const button=[...dialog.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Limpar');
      button.click();
      return true;
    })()`);
    await browser.sleep(40);
    assert.equal(await browser.evaluate(`Boolean(document.querySelector('[data-datagrid-filter-dialog="${key}"]'))`), false, label + ': Limpar não fechou ' + columnLabel);
    assert.equal(await browser.evaluate(`(() => { const th=[...document.querySelectorAll('.meg-datagrid-table thead th')].find((item)=>item.textContent.includes(${JSON.stringify(columnLabel)})); return document.activeElement===th?.querySelector('.meg-datagrid-filter-button'); })()`), true, label + ': foco não voltou após Limpar em ' + columnLabel);

    await open();
    await browser.evaluate(`(() => {
      const dialog=document.querySelector('[data-datagrid-filter-dialog="${key}"]');
      const button=[...dialog.querySelectorAll('button')].find((item)=>item.textContent.trim()==='Aplicar');
      button.click();
      return true;
    })()`);
    await browser.sleep(40);
    assert.equal(await browser.evaluate(`Boolean(document.querySelector('[data-datagrid-filter-dialog="${key}"]'))`), false, label + ': Aplicar não fechou ' + columnLabel);
    assert.equal(await browser.evaluate(`(() => { const th=[...document.querySelectorAll('.meg-datagrid-table thead th')].find((item)=>item.textContent.includes(${JSON.stringify(columnLabel)})); return document.activeElement===th?.querySelector('.meg-datagrid-filter-button'); })()`), true, label + ': foco não voltou após Aplicar em ' + columnLabel);

    await open();
    await browser.pressKey('Escape', 'Escape');
    assert.equal(await browser.evaluate(`Boolean(document.querySelector('[data-datagrid-filter-dialog="${key}"]'))`), false, label + ': Esc não fechou ' + columnLabel);
    assert.equal(await browser.evaluate(`(() => { const th=[...document.querySelectorAll('.meg-datagrid-table thead th')].find((item)=>item.textContent.includes(${JSON.stringify(columnLabel)})); return document.activeElement===th?.querySelector('.meg-datagrid-filter-button'); })()`), true, label + ': Esc não devolveu foco em ' + columnLabel);
  }

  const openedColumns = await browser.evaluate("(() => { const button=[...document.querySelectorAll('.meg-datagrid-tool')].find((item)=>item.textContent.includes('Colunas')); if(!button) return false; button.focus(); button.click(); return true; })()");
  assert.equal(openedColumns, true, label + ': seletor de colunas ausente');
  await browser.sleep(60);
  const columnGeometry = await browser.evaluate("(() => { const dialog=document.querySelector('[data-datagrid-column-dialog]'); if(!dialog) return null; const rect=dialog.getBoundingClientRect(); const close=dialog.querySelector('button[aria-label="Fechar colunas"]'); const closeRect=close?.getBoundingClientRect(); const hit=closeRect ? document.elementFromPoint(closeRect.left + closeRect.width / 2, closeRect.top + closeRect.height / 2) : null; return { top:rect.top, bottom:rect.bottom, closeTop:closeRect?.top, closeBottom:closeRect?.bottom, closeClickable:Boolean(close && hit && close.contains(hit)) }; })()");
  assert.ok(columnGeometry, label + ': seletor de colunas não abriu');
  assert.ok(columnGeometry.top >= -1 && columnGeometry.bottom <= height + 1, label + ': seletor de colunas ultrapassou a viewport');
  assert.ok(columnGeometry.closeTop >= -1 && columnGeometry.closeBottom <= height + 1 && columnGeometry.closeClickable, label + ': fechar colunas inacessível');
  await browser.pressKey('Escape', 'Escape');
  assert.equal(await browser.evaluate("Boolean(document.querySelector('[data-datagrid-column-dialog]'))"), false, label + ': Esc não fechou seletor de colunas');
  assert.equal(await browser.evaluate("(() => { const button=[...document.querySelectorAll('.meg-datagrid-tool')].find((item)=>item.textContent.includes('Colunas')); return document.activeElement===button; })()"), true, label + ': Esc não devolveu foco ao seletor de colunas');
}

try {
  await assertLowHeightFilterDialogs(1366, 600);
  await assertLowHeightFilterDialogs(1024, 600);

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1366, height: 600 },
    { width: 1024, height: 768 },
  ]) {
    await assertDesktopContainment(viewport.width, viewport.height, false);
    await assertDesktopContainment(viewport.width, viewport.height, true);
  }
  for (const viewport of viewports) {
    await browser.setViewport(viewport.width, viewport.height);
    await browser.navigate(appUrl);
    await browser.evaluate("(() => { localStorage.removeItem('meg-web-evolution:datagrid:stage-04-harness'); localStorage.removeItem('meg-web-evolution:sidebar-collapsed'); return true; })()");
    await browser.navigate(appUrl);
    await browser.sleep(180);

    const snapshot = await browser.evaluate("(() => { const html=document.documentElement; const body=document.body; const shell=document.querySelector('.meg-shell'); const main=document.querySelector('.meg-main'); const grid=document.querySelector('[data-datagrid]'); const viewport=document.querySelector('.meg-datagrid__viewport'); const table=document.querySelector('.meg-datagrid-table'); const cards=document.querySelector('.meg-datagrid-cards'); const mobileFilter=document.querySelector('.meg-datagrid-mobile-filter'); const mobileSelectAll=document.querySelector('.meg-datagrid-mobile-select-all'); const mobileAggregates=document.querySelector('.meg-datagrid-mobile-aggregates'); const rows=[...document.querySelectorAll('[data-grid-row]')].filter((element)=>element.getClientRects().length > 0 && getComputedStyle(element).visibility!=='hidden'); const shellRect=shell?.getBoundingClientRect(); const gridRect=grid?.getBoundingClientRect(); return { innerWidth:window.innerWidth, innerHeight:window.innerHeight, htmlScrollWidth:html.scrollWidth, bodyScrollWidth:body.scrollWidth, mainClientWidth:main?.clientWidth, mainScrollWidth:main?.scrollWidth, shellRight:shellRect?.right, gridLeft:gridRect?.left, gridRight:gridRect?.right, gridWidth:gridRect?.width, tableDisplay:table ? getComputedStyle(table).display : null, cardsDisplay:cards ? getComputedStyle(cards).display : null, mobileFilterDisplay:mobileFilter ? getComputedStyle(mobileFilter).display : null, mobileSelectAllDisplay:mobileSelectAll ? getComputedStyle(mobileSelectAll).display : null, mobileAggregatesDisplay:mobileAggregates ? getComputedStyle(mobileAggregates).display : null, viewportOverflowX:viewport ? getComputedStyle(viewport).overflowX : null, viewportClientWidth:viewport?.clientWidth, viewportScrollWidth:viewport?.scrollWidth, virtualized:grid?.getAttribute('data-virtualized'), renderedRows:rows.length, groupCount:document.querySelectorAll('[data-grid-group]').length }; })()");

    const label = viewport.width + 'x' + viewport.height;
    assert.equal(snapshot.innerWidth, viewport.width, label + ': largura emulada incorreta');
    assert.equal(snapshot.innerHeight, viewport.height, label + ': altura emulada incorreta');
    assert.ok(snapshot.htmlScrollWidth <= viewport.width, label + ': documento criou rolagem horizontal');
    assert.ok(snapshot.bodyScrollWidth <= viewport.width, label + ': body criou rolagem horizontal');
    assert.ok(snapshot.mainScrollWidth <= snapshot.mainClientWidth + 1, label + ': área principal criou rolagem horizontal');
    assert.ok(snapshot.shellRight <= viewport.width + 1, label + ': Shell saiu do viewport');
    assert.ok(snapshot.gridLeft >= -1 && snapshot.gridRight <= viewport.width + 1 && snapshot.gridWidth > 0, label + ': DataGrid saiu do viewport');
    assert.equal(snapshot.virtualized, 'true', label + ': fixture >500 não ativou virtualização');
    assert.ok(snapshot.renderedRows > 0 && snapshot.renderedRows < 120, label + ': virtualização renderizou linhas demais ou nenhuma');
    assert.ok(snapshot.groupCount > 0, label + ': agrupamento não foi renderizado');

    if (viewport.width >= 1024) {
      assert.equal(snapshot.tableDisplay, 'table', label + ': desktop deve usar tabela');
      assert.equal(snapshot.cardsDisplay, 'none', label + ': cards devem ficar ocultos no desktop');
      assert.equal(snapshot.mobileFilterDisplay, 'none', label + ': botão móvel de filtros deve ficar oculto no desktop');
      assert.equal(snapshot.mobileSelectAllDisplay, 'none', label + ': seleção móvel deve ficar oculta no desktop');
      assert.equal(snapshot.mobileAggregatesDisplay, 'none', label + ': agregados móveis devem ficar ocultos no desktop');
      assert.equal(snapshot.viewportOverflowX, 'auto', label + ': rolagem horizontal desktop deve ficar confinada ao componente');
      assert.ok(snapshot.viewportScrollWidth >= snapshot.viewportClientWidth, label + ': viewport interno inválido');

      const aggregateFooter = await browser.evaluate("(() => { const footer=document.querySelector('.meg-datagrid-table tfoot'); const cell=footer?.querySelector('td'); if(!footer || !cell) return null; const alpha=(value)=>{ const match=value.match(/rgba?\\(([^)]+)\\)/); if(!match) return 0; const parts=match[1].split(',').map((part)=>part.trim()); return parts.length < 4 ? 1 : Number(parts[3]); }; return { footerBackground:getComputedStyle(footer).backgroundColor, cellBackground:getComputedStyle(cell).backgroundColor, footerAlpha:alpha(getComputedStyle(footer).backgroundColor), cellAlpha:alpha(getComputedStyle(cell).backgroundColor) }; })()");
      assert.ok(aggregateFooter, label + ': rodapé de agregados ausente');
      assert.equal(aggregateFooter.footerAlpha, 1, label + ': fundo do rodapé de agregados não é opaco');
      assert.equal(aggregateFooter.cellAlpha, 1, label + ': células do rodapé de agregados não são opacas');

      await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-sort-button'); button.focus(); button.click(); return true; })()");
      await browser.sleep(80);
      const sortState = await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-sort-button'); const th=button.closest('th'); return { sort:th.getAttribute('aria-sort'), focused:document.activeElement===button }; })()");
      assert.equal(sortState.sort, 'ascending', label + ': aria-sort não refletiu ordenação crescente');
      assert.equal(sortState.focused, true, label + ': botão de ordenação perdeu foco');

      await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-filter-button'); button.focus(); button.click(); return true; })()");
      await browser.sleep(80);
      const filterOpen = await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-filter-button'); return { expanded:button.getAttribute('aria-expanded') }; })()");
      assert.equal(filterOpen.expanded, 'true', label + ': funil não marcou aria-expanded');
      assert.equal(await browser.evaluate("Boolean(document.querySelector('[role=dialog][data-datagrid-filter-dialog]'))"), true, label + ': popover role=dialog não abriu');
      await browser.pressKey('Escape', 'Escape');
      assert.equal(await browser.evaluate("Boolean(document.querySelector('[role=dialog][data-datagrid-filter-dialog]'))"), false, label + ': Esc não fechou popover');
      assert.equal(await browser.evaluate("document.activeElement===document.querySelector('.meg-datagrid-filter-button')"), true, label + ': foco não voltou ao funil');

      const groupBefore = await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-table .meg-datagrid-group-button'); button.focus(); return button.getAttribute('aria-expanded'); })()");
      await browser.pressKey('Enter', 'Enter');
      const groupAfter = await browser.evaluate("document.querySelector('.meg-datagrid-table .meg-datagrid-group-button')?.getAttribute('aria-expanded')");
      assert.notEqual(groupAfter, groupBefore, label + ': Enter não alternou grupo recolhível');

      if (viewport.width === 1920) {
        await browser.evaluate("(() => { const button=[...document.querySelectorAll('.meg-datagrid-tool')].find((item)=>item.textContent.includes('Colunas')); button.click(); return true; })()");
        await browser.sleep(80);
        assert.equal(await browser.evaluate("Boolean(document.querySelector('.meg-datagrid-column-menu'))"), true, label + ': menu Colunas não abriu');

        const beforeVisibility = await browser.evaluate("[...document.querySelectorAll('.meg-datagrid-table thead th .meg-datagrid-sort-button > span:first-child')].map((item)=>item.textContent.trim())");
        await browser.evaluate("(() => { const item=[...document.querySelectorAll('.meg-datagrid-column-menu__item')].find((node)=>node.textContent.includes('Quantidade')); item.querySelector('input[type=checkbox]').click(); return true; })()");
        await browser.sleep(80);
        const hiddenHeaders = await browser.evaluate("[...document.querySelectorAll('.meg-datagrid-table thead th .meg-datagrid-sort-button > span:first-child')].map((item)=>item.textContent.trim())");
        assert.ok(beforeVisibility.includes('Quantidade'), label + ': coluna Quantidade deveria começar visível');
        assert.equal(hiddenHeaders.includes('Quantidade'), false, label + ': ocultar coluna não removeu Quantidade');

        await browser.evaluate("(() => { const item=[...document.querySelectorAll('.meg-datagrid-column-menu__item')].find((node)=>node.textContent.includes('Quantidade')); item.querySelector('input[type=checkbox]').click(); return true; })()");
        await browser.sleep(80);
        const restoredHeaders = await browser.evaluate("[...document.querySelectorAll('.meg-datagrid-table thead th .meg-datagrid-sort-button > span:first-child')].map((item)=>item.textContent.trim())");
        assert.ok(restoredHeaders.includes('Quantidade'), label + ': mostrar coluna não restaurou Quantidade');

        await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-column-menu button[aria-label=\"Mover Data para baixo\"]'); button.click(); return true; })()");
        await browser.sleep(80);
        const reorderedHeaders = await browser.evaluate("[...document.querySelectorAll('.meg-datagrid-table thead th .meg-datagrid-sort-button > span:first-child')].map((item)=>item.textContent.trim())");
        assert.equal(reorderedHeaders[0], 'Descrição técnica', label + ': reordenação acessível de colunas não foi aplicada');
        assert.equal(reorderedHeaders[1], 'Data', label + ': Data deveria ter sido movida para a segunda posição');

        await browser.evaluate("(() => { const headers=[...document.querySelectorAll('.meg-datagrid-table thead th')]; const th=headers.find((item)=>item.textContent.includes('Data')); const resizer=th.querySelector('.meg-datagrid-resizer'); resizer.focus(); return true; })()");
        await browser.pressKey('ArrowRight', 'ArrowRight');
        const persistedAfterResize = await browser.evaluate("JSON.parse(localStorage.getItem('meg-web-evolution:datagrid:stage-04-harness'))");
        assert.ok(persistedAfterResize.widths.date >= 140, label + ': resize por teclado não persistiu largura respeitando minWidth');
        assert.equal(persistedAfterResize.columnOrder[0], 'description', label + ': ordem de colunas não foi persistida');

        await browser.evaluate("document.querySelector('.meg-datagrid-column-menu .meg-datagrid-dialog-header button').click()");
        await browser.navigate(appUrl);
        await browser.sleep(120);
        const persistedHeaders = await browser.evaluate("[...document.querySelectorAll('.meg-datagrid-table thead th .meg-datagrid-sort-button > span:first-child')].map((item)=>item.textContent.trim())");
        assert.equal(persistedHeaders[0], 'Descrição técnica', label + ': ordem persistida não sobreviveu ao reload');
        const persistedReload = await browser.evaluate("JSON.parse(localStorage.getItem('meg-web-evolution:datagrid:stage-04-harness'))");
        assert.ok(persistedReload.widths.date >= 140, label + ': largura persistida não sobreviveu ao reload');
      }
    } else {
      assert.equal(snapshot.tableDisplay, 'none', label + ': abaixo de 1024 a tabela deve ficar oculta');
      assert.notEqual(snapshot.cardsDisplay, 'none', label + ': abaixo de 1024 as linhas devem virar cards');
      assert.notEqual(snapshot.mobileFilterDisplay, 'none', label + ': botão Filtros deve ficar disponível');
      assert.notEqual(snapshot.mobileSelectAllDisplay, 'none', label + ': selecionar filtrados não pode desaparecer nos cards');
      assert.notEqual(snapshot.mobileAggregatesDisplay, 'none', label + ': agregados não podem desaparecer nos cards');
      assert.equal(snapshot.viewportOverflowX, 'hidden', label + ': cards não podem criar rolagem horizontal interna');

      await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-mobile-filter'); button.focus(); button.click(); return true; })()");
      await browser.sleep(80);
      const sheetOpen = await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-mobile-filter'); return { expanded:button.getAttribute('aria-expanded') }; })()");
      assert.equal(sheetOpen.expanded, 'true', label + ': botão Filtros não marcou aria-expanded');
      const sheet = await browser.evaluate("(() => { const element=document.querySelector('[data-datagrid-mobile-sheet]'); if(!element) return null; const rect=element.getBoundingClientRect(); return { role:element.getAttribute('role'), modal:element.getAttribute('aria-modal'), top:rect.top, bottom:rect.bottom, width:rect.width }; })()");
      assert.ok(sheet, label + ': bottom sheet não abriu');
      assert.equal(sheet.role, 'dialog', label + ': bottom sheet sem role=dialog');
      assert.equal(sheet.modal, 'true', label + ': bottom sheet sem aria-modal');
      assert.ok(sheet.width <= viewport.width + 1, label + ': bottom sheet excedeu largura');
      if (viewport.width < 640) {
        assert.ok(sheet.top <= 1 && sheet.bottom >= viewport.height - 1, label + ': abaixo de 640 o bottom sheet deve ocupar a tela');
      }
      await browser.pressKey('Escape', 'Escape');
      assert.equal(await browser.evaluate("Boolean(document.querySelector('[data-datagrid-mobile-sheet]'))"), false, label + ': Esc não fechou bottom sheet');
      assert.equal(await browser.evaluate("document.activeElement===document.querySelector('.meg-datagrid-mobile-filter')"), true, label + ': foco não voltou ao botão Filtros');

      const groupSelector = '.meg-datagrid-cards .meg-datagrid-group-button';
      const groupBefore = await browser.evaluate("(() => { const button=document.querySelector('" + groupSelector + "'); button.focus(); return button.getAttribute('aria-expanded'); })()");
      await browser.pressKey('Enter', 'Enter');
      const groupAfter = await browser.evaluate("document.querySelector('" + groupSelector + "')?.getAttribute('aria-expanded')");
      assert.notEqual(groupAfter, groupBefore, label + ': Enter não alternou grupo em cards');
    }

    console.log('OK DataGrid ' + label);
  }

  await browser.setViewport(1920, 1080);

  await browser.navigate(appUrl + '?state=loading');
  assert.equal(await browser.evaluate("document.querySelector('[data-datagrid]')?.getAttribute('data-state')"), 'loading', 'Skeleton: estado loading não exposto');
  assert.equal(await browser.evaluate("Boolean(document.querySelector('.meg-datagrid-skeleton[role=status]'))"), true, 'Skeleton: estrutura não renderizada');
  assert.equal(await browser.evaluate("document.querySelector('[data-datagrid]')?.getAttribute('aria-busy')"), 'true', 'Skeleton: aria-busy ausente');

  await browser.navigate(appUrl + '?state=empty');
  const emptyText = await browser.evaluate("document.querySelector('.meg-datagrid-empty')?.textContent || ''");
  assert.ok(emptyText.includes('Nenhum dado disponível'), 'Estado vazio sem dados não renderizado');

  await browser.evaluate("(() => { localStorage.setItem('meg-web-evolution:datagrid:stage-04-harness-filtered-empty', JSON.stringify({ filters:{ description:{ type:'text', operator:'equals', value:'__sem_resultado__' } }, sort:[], columnOrder:[], hiddenColumns:[], widths:{}, pageSize:600 })); return true; })()");
  await browser.navigate(appUrl + '?state=filtered-empty');
  await browser.sleep(100);
  const filteredEmpty = await browser.evaluate("(() => { const element=document.querySelector('.meg-datagrid-empty'); return { text:element?.textContent || '', clear:Boolean(element?.querySelector('button')) }; })()");
  assert.ok(filteredEmpty.text.includes('Nenhum resultado com os filtros atuais'), 'Estado vazio filtrado não renderizado');
  assert.equal(filteredEmpty.clear, true, 'Estado vazio filtrado precisa oferecer ação de limpar');

  const isolatedKeys = await browser.evaluate("(() => ({ normal:localStorage.getItem('meg-web-evolution:datagrid:stage-04-harness'), filtered:localStorage.getItem('meg-web-evolution:datagrid:stage-04-harness-filtered-empty') }))()");
  assert.ok(isolatedKeys.filtered, 'Persistência da instância filtrada não existe');
  assert.notEqual(isolatedKeys.normal, isolatedKeys.filtered, 'Chaves de persistência não podem colidir entre grids');

  console.log('MEG Web Evolution DataGrid viewport contract: OK');
} catch (error) {
  console.error('DataGrid browser diagnostics:', browser.diagnostics());
  throw error;
} finally {
  await browser.close();
}
