import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

async function captureEvidence(name) {
  const result = await browser.command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const dir = resolve('artifacts/datagrid-evidence');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, name + '.png'), Buffer.from(result.data, 'base64'));
}

async function openDesktopFilter(columnLabel) {
  const opened = await browser.evaluate(`(() => {
    const th=[...document.querySelectorAll('.meg-datagrid-table thead th')].find((item)=>item.textContent.includes(${JSON.stringify(columnLabel)}));
    const button=th?.querySelector('.meg-datagrid-filter-button');
    if (!button) return false;
    button.focus();
    button.click();
    return true;
  })()`);
  return opened;
}

async function assertPopoverGeometry(label, selector, height, requireFilterActions = false) {
  const geometry = await browser.evaluate(`(() => {
    const dialog=document.querySelector(${JSON.stringify(selector)});
    if (!dialog) return null;
    const rect=dialog.getBoundingClientRect();
    const clear=[...dialog.querySelectorAll('button')].find((button)=>button.textContent.trim()==='Limpar');
    const apply=[...dialog.querySelectorAll('button')].find((button)=>button.textContent.trim()==='Aplicar');
    const clickable=(button)=>{
      if(!button) return false;
      const buttonRect=button.getBoundingClientRect();
      const hit=document.elementFromPoint(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2);
      return !button.disabled && buttonRect.top >= -1 && buttonRect.bottom <= window.innerHeight + 1 && Boolean(hit && button.contains(hit));
    };
    return {
      top:rect.top,
      bottom:rect.bottom,
      left:rect.left,
      right:rect.right,
      width:rect.width,
      clearClickable:clickable(clear),
      applyClickable:clickable(apply),
      hasSheetLayer:Boolean(dialog.closest('.meg-datagrid-sheet-layer')),
    };
  })()`);
  assert.ok(geometry, label + ': popover não abriu');
  assert.equal(geometry.hasSheetLayer, false, label + ': popover não pode virar bottom sheet');
  assert.ok(geometry.top >= -1 && geometry.bottom <= height + 1, label + ': popover ultrapassou a altura da viewport');
  assert.ok(geometry.left >= -1 && geometry.right <= (await browser.evaluate('window.innerWidth')) + 1, label + ': popover ultrapassou a largura da viewport');
  if (requireFilterActions) {
    assert.equal(geometry.clearClickable, true, label + ': Limpar precisa ficar visível e clicável');
    assert.equal(geometry.applyClickable, true, label + ': Aplicar precisa ficar visível e clicável');
  }
  return geometry;
}

async function assertCompactOverlays(width, height, collapsed) {
  const label = width + 'x' + height + (collapsed ? ' recolhida' : ' expandida');
  await browser.setViewport(width, height);
  await browser.navigate(appUrl);
  await browser.evaluate(`(() => {
    localStorage.removeItem('meg-web-evolution:datagrid:stage-04-harness');
    localStorage.setItem('meg-web-evolution:sidebar-collapsed', '${collapsed ? 'true' : 'false'}');
    return true;
  })()`);
  await browser.navigate(appUrl);
  await browser.sleep(160);

  if (width >= 1024) {
    for (const [key, columnLabel] of [
      ['date', 'Data'],
      ['description', 'Descrição técnica'],
      ['quantity', 'Quantidade'],
      ['amount', 'Valor técnico'],
      ['segment', 'Segmento'],
      ['active', 'Ativo'],
    ]) {
      assert.equal(await openDesktopFilter(columnLabel), true, label + ': funil ausente para ' + columnLabel);
      await browser.sleep(50);
      await assertPopoverGeometry(label + ' ' + columnLabel, '[data-datagrid-filter-dialog="' + key + '"]', height, true);

      if (columnLabel === 'Descrição técnica' && width === 1093 && height === 480 && !collapsed) {
        const listBehavior = await browser.evaluate(`(() => {
          const dialog=document.querySelector('[data-datagrid-filter-dialog="description"]');
          const body=dialog?.querySelector('.meg-datagrid-filter-panel__body');
          const inputs=[...dialog?.querySelectorAll('.meg-datagrid-filter__values input[type="checkbox"]') || []];
          if(!body || inputs.length < 2) return null;
          inputs[0].focus();
          const before=document.activeElement===inputs[0];
          const bodyCanScroll=body.scrollHeight > body.clientHeight;
          body.scrollTop=body.scrollHeight;
          const last=inputs[inputs.length - 1];
          last.scrollIntoView({block:'nearest'});
          const bodyRect=body.getBoundingClientRect();
          const lastRect=last.getBoundingClientRect();
          return {
            before,
            bodyCanScroll,
            lastVisible:lastRect.top >= bodyRect.top - 1 && lastRect.bottom <= bodyRect.bottom + 1,
            rendered:inputs.length,
          };
        })()`);
        assert.ok(listBehavior, label + ': lista longa de texto não disponível');
        assert.equal(listBehavior.before, true, label + ': primeiro valor não recebeu foco');
        assert.equal(listBehavior.bodyCanScroll, true, label + ': lista longa deve rolar no corpo único');
        assert.equal(listBehavior.lastVisible, true, label + ': lista não rola até o último item renderizado');
        assert.ok(listBehavior.rendered <= 200, label + ': lista longa ultrapassou limite de renderização');

        await browser.evaluate("document.querySelector('[data-datagrid-filter-dialog="description"] .meg-datagrid-filter__values input[type="checkbox"]')?.focus()");
        await browser.pressKey('ArrowDown', 'ArrowDown');
        const arrowMoved = await browser.evaluate("(() => { const inputs=[...document.querySelectorAll('[data-datagrid-filter-dialog="description"] .meg-datagrid-filter__values input[type="checkbox"]')]; return inputs.length > 1 && document.activeElement===inputs[1]; })()");
        assert.equal(arrowMoved, true, label + ': ArrowDown não moveu foco entre valores');
      }

      if (columnLabel === 'Data' && width === 1366 && height === 600 && !collapsed) {
        await captureEvidence('data-1366x600-expanded');
      }

      const triggerFocusedAfterOutside = await browser.evaluate(`(() => {
        const dialog=document.querySelector('[data-datagrid-filter-dialog="${key}"]');
        const point={ x:Math.max(2, dialog.getBoundingClientRect().left - 4), y:Math.max(2, dialog.getBoundingClientRect().top - 4) };
        const target=document.elementFromPoint(point.x, point.y);
        target?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));
        return true;
      })()`);
      assert.equal(triggerFocusedAfterOutside, true);
      await browser.sleep(40);
      assert.equal(await browser.evaluate(`Boolean(document.querySelector('[data-datagrid-filter-dialog="${key}"]'))`), false, label + ': clique fora não fechou ' + columnLabel);

      if (columnLabel === 'Data') {
        assert.equal(await openDesktopFilter(columnLabel), true);
        await browser.sleep(30);
        assert.equal(await openDesktopFilter(columnLabel), true, label + ': gatilho não respondeu ao toggle');
        await browser.sleep(30);
        assert.equal(await browser.evaluate(`Boolean(document.querySelector('[data-datagrid-filter-dialog="${key}"]'))`), false, label + ': segundo clique no gatilho deve fechar sem reabrir');
      }

      assert.equal(await openDesktopFilter(columnLabel), true);
      await browser.sleep(40);
      await browser.pressKey('Escape', 'Escape');
      assert.equal(await browser.evaluate(`Boolean(document.querySelector('[data-datagrid-filter-dialog="${key}"]'))`), false, label + ': Esc não fechou ' + columnLabel);
      assert.equal(await browser.evaluate(`(() => { const th=[...document.querySelectorAll('.meg-datagrid-table thead th')].find((item)=>item.textContent.includes(${JSON.stringify(columnLabel)})); return document.activeElement===th?.querySelector('.meg-datagrid-filter-button'); })()`), true, label + ': Esc não devolveu foco em ' + columnLabel);
    }
  } else {
    const opened = await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-mobile-filter'); if(!button) return false; button.focus(); button.click(); return true; })()");
    assert.equal(opened, true, label + ': botão Filtros ausente');
    await browser.sleep(50);
    await assertPopoverGeometry(label + ' Filtros', '[data-datagrid-mobile-sheet]', height, false);

    if (width === 910 && height === 400 && !collapsed) {
      await browser.evaluate("(() => { const trigger=[...document.querySelectorAll('.meg-datagrid-filter-accordion__trigger')].find((item)=>item.textContent.includes('Segmento')); if(trigger?.getAttribute('aria-expanded')!=='true') trigger?.click(); trigger?.scrollIntoView({block:'start'}); return true; })()");
      await browser.sleep(50);
      await captureEvidence('segmento-910x400-expanded');
    }

    await browser.evaluate("(() => { const dialog=document.querySelector('[data-datagrid-mobile-sheet]'); const rect=dialog.getBoundingClientRect(); const target=document.elementFromPoint(Math.max(2, rect.left - 4), Math.max(2, rect.top - 4)); target?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1})); return true; })()");
    await browser.sleep(30);
    assert.equal(await browser.evaluate("Boolean(document.querySelector('[data-datagrid-mobile-sheet]'))"), false, label + ': clique fora não fechou popover móvel');

    await browser.evaluate("document.querySelector('.meg-datagrid-mobile-filter')?.click()");
    await browser.sleep(30);
    await browser.pressKey('Escape', 'Escape');
    assert.equal(await browser.evaluate("Boolean(document.querySelector('[data-datagrid-mobile-sheet]'))"), false, label + ': Esc não fechou popover de filtros');
    assert.equal(await browser.evaluate("document.activeElement===document.querySelector('.meg-datagrid-mobile-filter')"), true, label + ': Esc não devolveu foco ao botão Filtros');
  }

  const openedColumns = await browser.evaluate("(() => { const button=[...document.querySelectorAll('.meg-datagrid-tool')].find((item)=>item.textContent.includes('Colunas')); if(!button) return false; button.focus(); button.click(); return true; })()");
  assert.equal(openedColumns, true, label + ': seletor de colunas ausente');
  await browser.sleep(50);
  await assertPopoverGeometry(label + ' Colunas', '[data-datagrid-column-dialog]', height, false);
  await browser.evaluate("(() => { const dialog=document.querySelector('[data-datagrid-column-dialog]'); const rect=dialog.getBoundingClientRect(); const target=document.elementFromPoint(Math.max(2, rect.left - 4), Math.max(2, rect.top - 4)); target?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1})); return true; })()");
  await browser.sleep(30);
  assert.equal(await browser.evaluate("Boolean(document.querySelector('[data-datagrid-column-dialog]'))"), false, label + ': clique fora não fechou Colunas');
  await browser.evaluate("(() => { const button=[...document.querySelectorAll('.meg-datagrid-tool')].find((item)=>item.textContent.includes('Colunas')); button?.click(); return true; })()");
  await browser.sleep(30);
  await browser.pressKey('Escape', 'Escape');
  assert.equal(await browser.evaluate("Boolean(document.querySelector('[data-datagrid-column-dialog]'))"), false, label + ': Esc não fechou seletor de colunas');
  assert.equal(await browser.evaluate("(() => { const button=[...document.querySelectorAll('.meg-datagrid-tool')].find((item)=>item.textContent.includes('Colunas')); return document.activeElement===button; })()"), true, label + ': Esc não devolveu foco ao seletor de colunas');
}

try {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1366, height: 600 },
    { width: 1024, height: 600 },
    { width: 1093, height: 480 },
    { width: 910, height: 400 },
  ]) {
    await assertCompactOverlays(viewport.width, viewport.height, false);
    await assertCompactOverlays(viewport.width, viewport.height, true);
  }

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1366, height: 600 },
    { width: 1024, height: 768 },
    { width: 1024, height: 600 },
    { width: 1093, height: 480 },
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
      const sheet = await browser.evaluate("(() => { const element=document.querySelector('[data-datagrid-mobile-sheet]'); if(!element) return null; const rect=element.getBoundingClientRect(); return { role:element.getAttribute('role'), modal:element.getAttribute('aria-modal'), top:rect.top, bottom:rect.bottom, left:rect.left, right:rect.right, width:rect.width, sheetLayer:Boolean(element.closest('.meg-datagrid-sheet-layer')) }; })()");
      assert.ok(sheet, label + ': popover de filtros não abriu');
      assert.equal(sheet.role, 'dialog', label + ': popover de filtros sem role=dialog');
      assert.equal(sheet.modal, 'false', label + ': popover compacto não deve ser modal');
      assert.equal(sheet.sheetLayer, false, label + ': filtros não podem usar bottom sheet');
      assert.ok(sheet.width <= viewport.width + 1 && sheet.left >= -1 && sheet.right <= viewport.width + 1, label + ': popover excedeu largura');
      assert.ok(sheet.top >= -1 && sheet.bottom <= viewport.height + 1, label + ': popover excedeu altura');
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
  const filteredEmpty = await browser.evaluate("(() => { const element=document.querySelector('.meg-datagrid-empty'); const clearAll=[...document.querySelectorAll('button')].filter((button)=>button.textContent.trim()==='Limpar tudo'); return { text:element?.textContent || '', emptyButtons:element?.querySelectorAll('button').length || 0, clearAllCount:clearAll.length }; })()");
  assert.ok(filteredEmpty.text.includes('Nenhum resultado com os filtros atuais'), 'Estado vazio filtrado não renderizado');
  assert.equal(filteredEmpty.emptyButtons, 0, 'Estado vazio não deve duplicar a ação de limpeza');
  assert.equal(filteredEmpty.clearAllCount, 1, 'Deve existir uma única ação Limpar tudo para o estado filtrado vazio');

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
