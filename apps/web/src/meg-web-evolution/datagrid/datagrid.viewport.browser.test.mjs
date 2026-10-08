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

async function waitForSelectorCount(selector, minimum = 1, label = selector) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const count = await browser.evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`);
    if (count >= minimum) return count;
    await browser.sleep(50);
  }
  throw new Error(label + ': conteúdo não renderizou a tempo');
}
async function waitForMissing(selector, label = selector) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const exists = await browser.evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
    if (!exists) return;
    await browser.sleep(50);
  }
  throw new Error(label + ': elemento continuou presente');
}

async function setActiveFilterCount(count) {
  await browser.evaluate(`(() => {
    const filters = {
      date:{ type:'date', operator:'between', value:'2026-10-08', value2:'2026-10-08' },
      description:{ type:'text', operator:'contains', value:'Registro' },
      segment:{ type:'enum', selected:['alpha','beta','gamma','delta'] },
      quantity:{ type:'number', operator:'gte', value:1 },
      amount:{ type:'currency', operator:'gte', value:0 }
    };
    const keys=['date','description','segment','quantity','amount'];
    localStorage.setItem('meg-web-evolution:datagrid:stage-04-harness', JSON.stringify({
      filters:Object.fromEntries(keys.slice(0,${count}).map((key)=>[key,filters[key]])),
      sort:[], columnOrder:[], hiddenColumns:[], widths:{}, pageSize:600
    }));
    return true;
  })()`);
}

async function assertToolbarFilters(width, height, count, evidenceName = null) {
  const label = width + 'x' + height + ' · ' + count + ' filtros';
  await browser.setViewport(width, height);
  await browser.navigate(appUrl);
  await browser.evaluate("localStorage.setItem('meg-web-evolution:sidebar-collapsed','false')");
  await setActiveFilterCount(count);
  await browser.navigate(appUrl);
  await waitForSelectorCount('.meg-datagrid-mobile-filter', 1, label + ' botão Filtros');

  if (count > 0) {
    await waitForSelectorCount('.meg-datagrid-toolbar__filters .meg-datagrid-filter-chip', Math.min(count,2), label + ' chips');
  }

  const snapshot = await browser.evaluate(`(() => {
    const toolbar=document.querySelector('.meg-datagrid-toolbar');
    const filters=document.querySelector('.meg-datagrid-toolbar__filters');
    const chips=[...document.querySelectorAll('.meg-datagrid-toolbar__filters .meg-datagrid-filter-chip')];
    const more=document.querySelector('.meg-datagrid-more-filters');
    const filterButton=document.querySelector('.meg-datagrid-mobile-filter');
    const thead=document.querySelector('.meg-datagrid-table thead');
    const footer=document.querySelector('.meg-datagrid-table tfoot');
    const rows=[...document.querySelectorAll('.meg-datagrid-table tbody tr[data-grid-row]')].filter((row)=>{
      const r=row.getBoundingClientRect();
      const h=thead?.getBoundingClientRect();
      const f=footer?.getBoundingClientRect();
      const topLimit=h?.bottom ?? 0;
      const bottomLimit=Math.min(window.innerHeight, f?.top ?? window.innerHeight);
      return r.top >= topLimit - 1 && r.bottom <= bottomLimit + 1 && getComputedStyle(row).display!=='none';
    });
    const tr=toolbar?.getBoundingClientRect(), fr=filters?.getBoundingClientRect(), hr=thead?.getBoundingClientRect();
    return {
      toolbarHeight:tr?.height??0,
      filterTop:fr?.top??null,
      toolbarTop:tr?.top??null,
      toolbarBottom:tr?.bottom??null,
      chips:chips.length,
      moreText:more?.textContent?.trim()??'',
      filterText:filterButton?.querySelector('.meg-datagrid-filter-count-label')?.textContent?.trim()??'',
      filterVisible:Boolean(filterButton && getComputedStyle(filterButton).display!=='none' && filterButton.getClientRects().length),
      headerHeight:hr?.height??0,
      headerTop:hr?.top??null,
      headerBottom:hr?.bottom??null,
      visibleRows:rows.length,
      dateChip:chips[0]?.textContent?.trim()??''
    };
  })()`);

  assert.equal(snapshot.filterVisible, true, label + ': botão Filtros (N) não está visível');
  assert.ok(snapshot.filterText.includes('Filtros ('+count+')'), label + ': botão Filtros (N) incorreto');
  assert.equal(snapshot.chips, Math.min(count,2), label + ': deve mostrar no máximo dois chips');
  if(count>2) assert.equal(snapshot.moreText, '+'+(count-2)+' filtros', label + ': contador +N incorreto');
  if(count===0) assert.equal(snapshot.filterTop, null, label + ': faixa de filtros vazia não deve existir');
  assert.ok(snapshot.toolbarHeight <= (height<=400 ? 58 : 72), label + ': toolbar ganhou segunda linha');
  assert.ok(snapshot.filterTop == null || (snapshot.filterTop >= snapshot.toolbarTop-1 && snapshot.filterTop < snapshot.toolbarBottom+1), label + ': chips saíram da toolbar');
  if(count>=1) assert.equal(snapshot.dateChip.includes('08/10/2026'), true, label + ': chip Data não está em dd/mm/aaaa');
  assert.ok(snapshot.headerHeight >= 40, label + ': cabeçalho sticky ficou cortado');
  assert.ok(snapshot.headerTop != null && snapshot.headerBottom <= height+1, label + ': cabeçalho não está inteiro');
  assert.ok(snapshot.visibleRows >= 2, label + ': menos de duas linhas de dados totalmente visíveis');

  if(evidenceName) await captureEvidence(evidenceName);

  if(count>2) {
    await browser.evaluate("document.querySelector('.meg-datagrid-more-filters')?.click()");
    await waitForSelectorCount('[data-datagrid-active-filters-popover] .meg-datagrid-filter-chip', count, label + ' popover completo');
    const allChips=await browser.evaluate("document.querySelectorAll('[data-datagrid-active-filters-popover] .meg-datagrid-filter-chip').length");
    assert.equal(allChips,count,label + ': popover não listou todos os filtros');
    if(evidenceName) await captureEvidence(evidenceName+'-popover');
    await waitForSelectorCount('[data-datagrid-active-filters-popover] .meg-datagrid-clear-all',1,label + ' Limpar tudo no popover');
    await browser.evaluate("document.querySelector('[data-datagrid-active-filters-popover] .meg-datagrid-filter-chip')?.click()");
    await browser.sleep(50);
    const persisted=await browser.evaluate("JSON.parse(localStorage.getItem('meg-web-evolution:datagrid:stage-04-harness'))");
    assert.equal(Object.keys(persisted.filters).length,count-1,label + ': remover pelo × não atualizou filtros');
    await waitForSelectorCount('.meg-datagrid-toolbar__filters .meg-datagrid-clear-all',1,label + ' Limpar tudo na toolbar');
    await browser.evaluate("document.querySelector('.meg-datagrid-toolbar__filters .meg-datagrid-clear-all')?.click()");
  } else if(count>0) {
    await browser.evaluate("document.querySelector('.meg-datagrid-toolbar__filters .meg-datagrid-filter-chip')?.click()");
    await browser.sleep(40);
    await setActiveFilterCount(count);
    await browser.navigate(appUrl);
    await waitForSelectorCount('.meg-datagrid-toolbar__filters .meg-datagrid-clear-all',1,label + ' Limpar tudo');
    await browser.evaluate("document.querySelector('.meg-datagrid-toolbar__filters .meg-datagrid-clear-all')?.click()");
  }
  if(count>0) {
    await waitForMissing('.meg-datagrid-toolbar__filters',label + ' limpar filtros');
    const persistedAfterClear=await browser.evaluate("JSON.parse(localStorage.getItem('meg-web-evolution:datagrid:stage-04-harness'))");
    assert.equal(Object.keys(persistedAfterClear.filters).length,0,label + ': Limpar tudo não zerou filtros');
  }
}

async function assertFilteredEmptyLayout(width, height, evidenceName) {
  const label = width + 'x' + height + ' vazio por filtros';
  await browser.setViewport(width, height);
  await browser.navigate(appUrl);
  await browser.evaluate(`(() => {
    localStorage.setItem('meg-web-evolution:sidebar-collapsed','false');
    localStorage.setItem('meg-web-evolution:datagrid:stage-04-harness-filtered-empty', JSON.stringify({
      filters:{ description:{ type:'text', operator:'equals', value:'__sem_resultado__' } },
      sort:[], columnOrder:[], hiddenColumns:[], widths:{}, pageSize:600
    }));
    return true;
  })()`);
  await browser.navigate(appUrl + '?state=filtered-empty');
  await waitForSelectorCount('.meg-datagrid-filtered-empty .meg-datagrid-table thead',1,label + ' cabeçalho');
  const snapshot=await browser.evaluate(`(() => {
    const head=document.querySelector('.meg-datagrid-filtered-empty .meg-datagrid-table thead');
    const funnels=[...document.querySelectorAll('.meg-datagrid-filtered-empty .meg-datagrid-filter-button')];
    const empty=document.querySelector('.meg-datagrid-filtered-empty .meg-datagrid-empty');
    const filter=document.querySelector('.meg-datagrid-mobile-filter');
    const hr=head?.getBoundingClientRect(), er=empty?.getBoundingClientRect();
    return {
      headVisible:Boolean(hr && hr.height>=40 && hr.top>=0 && hr.bottom<=window.innerHeight+1),
      funnels:funnels.length,
      emptyBelow:Boolean(hr && er && er.top>=hr.bottom-1),
      filterText:filter?.querySelector('.meg-datagrid-filter-count-label')?.textContent?.trim()??'',
      filterVisible:Boolean(filter && getComputedStyle(filter).display!=='none' && filter.getClientRects().length)
    };
  })()`);
  assert.equal(snapshot.headVisible,true,label + ': cabeçalho não ficou visível');
  assert.ok(snapshot.funnels>0,label + ': funis desapareceram no estado vazio filtrado');
  assert.equal(snapshot.emptyBelow,true,label + ': mensagem vazia não ficou abaixo do cabeçalho');
  assert.equal(snapshot.filterVisible,true,label + ': botão Filtros (N) ausente');
  assert.ok(snapshot.filterText.includes('Filtros (1)'),label + ': contador Filtros (N) incorreto no vazio');
  await captureEvidence(evidenceName);
}

async function assertDateYearDisclosure(selector, evidencePrefix = null) {
  const yearSelector = selector + ' .meg-datagrid-date-year__toggle';
  await waitForSelectorCount(yearSelector, 1, 'grupo de ano');
  const read = () => browser.evaluate(`(() => { const b=document.querySelector(${JSON.stringify(yearSelector)}); return { expanded:b?.getAttribute('aria-expanded'), indicator:b?.querySelector('.meg-datagrid-date-year__indicator')?.textContent }; })()`);
  let state = await read();
  assert.equal(state.expanded, 'false', 'Ano deve iniciar recolhido');
  assert.equal(state.indicator, '+', 'Ano recolhido deve mostrar +');
  if (evidencePrefix) await captureEvidence(evidencePrefix + '-year-collapsed');
  await browser.evaluate(`document.querySelector(${JSON.stringify(yearSelector)})?.click()`);
  await waitForSelectorCount(selector + ' .meg-datagrid-date-year__content', 1, 'ano expandido');
  state = await read();
  assert.equal(state.expanded, 'true', 'Clique/teclado deve expandir ano');
  assert.equal(state.indicator, '−', 'Ano expandido deve mostrar −');
  if (evidencePrefix) await captureEvidence(evidencePrefix + '-year-expanded');
  await browser.evaluate(`document.querySelector(${JSON.stringify(yearSelector)})?.click()`);
  await browser.evaluate(`document.querySelector(${JSON.stringify(yearSelector)})?.focus()`);
  await browser.pressKey('Enter', 'Enter');
  state = await read();
  assert.equal(state.expanded, 'true', 'Enter deve expandir ano');
  assert.equal(state.indicator, '−', 'Enter expandido deve mostrar −');
  await browser.pressKey(' ', 'Space');
  state = await read();
  assert.equal(state.expanded, 'false', 'Espaço deve recolher ano');
  assert.equal(state.indicator, '+', 'Espaço recolhido deve mostrar +');
}
async function applyTodayDateFilter(width, height, collapsed, evidenceName = null) {
  const label = width + 'x' + height + (collapsed ? ' recolhida' : ' expandida');
  await browser.setViewport(width, height);
  await browser.navigate(appUrl);
  await browser.evaluate(`(() => { localStorage.removeItem('meg-web-evolution:datagrid:stage-04-harness'); localStorage.setItem('meg-web-evolution:sidebar-collapsed','${collapsed ? 'true' : 'false'}'); return true; })()`);
  await browser.navigate(appUrl);
  const baseline = await browser.evaluate("document.querySelector('.meg-datagrid-page-range')?.textContent || ''");

  const openDateFilter = async () => {
    if (width >= 1024) {
      await waitForSelectorCount('.meg-datagrid-table .meg-datagrid-filter-button', 1, label + ' funis');
      assert.equal(await openDesktopFilter('Data'), true, label + ': funil Data não abriu');
      await waitForSelectorCount('[data-datagrid-filter-dialog="date"] .meg-datagrid-shortcuts button', 1, label + ' atalhos Data');
      return '[data-datagrid-filter-dialog="date"]';
    }

    await waitForSelectorCount('.meg-datagrid-mobile-filter', 1, label + ' botão Filtros');
    await browser.evaluate("document.querySelector('.meg-datagrid-mobile-filter')?.click()");
    await waitForSelectorCount('[data-datagrid-mobile-column]', 1, label + ' seletor Coluna');
    await browser.evaluate(`(() => { const s=document.querySelector('[data-datagrid-mobile-column]'); s.value='date'; s.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    await waitForSelectorCount('[data-datagrid-mobile-sheet] .meg-datagrid-shortcuts button', 1, label + ' atalhos Data móvel');
    return '[data-datagrid-mobile-sheet]';
  };

  const activateTodayAndApply = async () => {
    const dialogSelector = await openDateFilter();
    const shortcutSelector = dialogSelector + ' .meg-datagrid-shortcuts button';
    await browser.evaluate(`(() => {
      const d=document.querySelector(${JSON.stringify(dialogSelector)});
      const today=[...d.querySelectorAll('.meg-datagrid-shortcuts button')].find(b=>b.textContent.trim()==='Hoje');
      today?.click();
      return Boolean(today);
    })()`);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const active = await browser.evaluate(`Boolean([...document.querySelectorAll(${JSON.stringify(shortcutSelector)})].find(b=>b.textContent.trim()==='Hoje' && b.classList.contains('is-active')))`);
      if (active) break;
      await browser.sleep(25);
      if (attempt === 39) throw new Error(label + ': atalho Hoje não atualizou o draft');
    }
    await browser.evaluate(`(() => {
      const d=document.querySelector(${JSON.stringify(dialogSelector)});
      const apply=[...d.querySelectorAll('button')].find(b=>b.textContent.trim()==='Aplicar');
      apply?.click();
      return Boolean(apply);
    })()`);
    await waitForSelectorCount('.meg-datagrid-toolbar__filters .meg-datagrid-filter-chip', 1, label + ' chip ativo');
  };

  await activateTodayAndApply();

  const active=await browser.evaluate(`(() => {
    const bar=document.querySelector('.meg-datagrid-toolbar__filters');
    const chip=bar?.querySelector('.meg-datagrid-filter-chip');
    const vp=document.querySelector('.meg-datagrid__viewport');
    const th=document.querySelector('.meg-datagrid-table thead');
    if(!bar||!chip||!vp)return null;
    const b=bar.getBoundingClientRect(),c=chip.getBoundingClientRect(),v=vp.getBoundingClientRect();
    const table=th?.closest('table');
    const headerVisible=Boolean(th && table && getComputedStyle(table).display !== 'none' && th.getClientRects().length);
    const h=headerVisible ? th.getBoundingClientRect() : null;
    const hit=document.elementFromPoint(c.left+c.width/2,c.top+c.height/2);
    return {
      barBottom:b.bottom,
      viewportTop:v.top,
      headerTop:h?.top??null,
      chipHit:Boolean(hit&&chip.contains(hit)),
      range:document.querySelector('.meg-datagrid-page-range')?.textContent||''
    };
  })()`);
  assert.ok(active, label + ': barra ativa não encontrada');
  assert.ok(active.barBottom <= active.viewportTop + 1, label + ': barra invade viewport');
  if(active.headerTop!=null) assert.ok(active.barBottom <= active.headerTop + 1, label + ': thead cobre barra');
  assert.equal(active.chipHit,true,label + ': chip coberto');
  assert.notEqual(active.range,baseline,label + ': filtro não alterou registros');
  if(evidenceName) await captureEvidence(evidenceName);

  await browser.evaluate("document.querySelector('.meg-datagrid-filter-chip')?.click()");
  await waitForMissing('.meg-datagrid-toolbar__filters',label + ' remoção por chip');
  assert.equal(await browser.evaluate("document.querySelector('.meg-datagrid-page-range')?.textContent||''"),baseline,label + ': chip não restaurou registros');

  await activateTodayAndApply();
  await waitForSelectorCount('.meg-datagrid-clear-all', 1, label + ' Limpar tudo');
  await browser.evaluate("document.querySelector('.meg-datagrid-clear-all')?.click()");
  await waitForMissing('.meg-datagrid-toolbar__filters', label + ' Limpar tudo');
  assert.equal(await browser.evaluate("document.querySelector('.meg-datagrid-page-range')?.textContent||''"),baseline,label + ': Limpar tudo não restaurou registros');
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
    const header=dialog.querySelector('.meg-datagrid-dialog-header');
    const controls=dialog.querySelector('.meg-datagrid-filter__controls');
    const operator=dialog.querySelector('.meg-datagrid-field select');
    const clickable=(button)=>{
      if(!button) return false;
      const buttonRect=button.getBoundingClientRect();
      const hit=document.elementFromPoint(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2);
      return !button.disabled && buttonRect.top >= -1 && buttonRect.bottom <= window.innerHeight + 1 && Boolean(hit && button.contains(hit));
    };
    const headerRect=header?.getBoundingClientRect();
    const operatorRect=operator?.getBoundingClientRect();
    const controlsBackground=controls ? getComputedStyle(controls).backgroundColor : null;
    const scrollables=[...dialog.querySelectorAll('*')].filter((element)=>{
      const style=getComputedStyle(element);
      return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
    });
    return {
      top:rect.top,
      bottom:rect.bottom,
      left:rect.left,
      right:rect.right,
      width:rect.width,
      headerHeight:headerRect?.height ?? 0,
      controlsBackground,
      operatorHeight:operatorRect?.height ?? 0,
      operatorText:operator?.selectedOptions?.[0]?.textContent ?? '',
      scrollableCount:scrollables.length,
      clearClickable:clickable(clear),
      applyClickable:clickable(apply),
      hasSheetLayer:Boolean(dialog.closest('.meg-datagrid-sheet-layer')),
    };
  })()`);
  assert.ok(geometry, label + ': popover não abriu');
  assert.equal(geometry.hasSheetLayer, false, label + ': popover não pode virar bottom sheet');
  assert.ok(geometry.top >= -1 && geometry.bottom <= height + 1, label + ': popover ultrapassou a altura da viewport');
  assert.ok(geometry.left >= -1 && geometry.right <= (await browser.evaluate('window.innerWidth')) + 1, label + ': popover ultrapassou a largura da viewport');
  assert.ok(geometry.headerHeight <= 48, label + ': cabeçalho do popover passou de 48px');
  if (geometry.controlsBackground != null) {
    assert.notEqual(geometry.controlsBackground, 'rgba(0, 0, 0, 0)', label + ': bloco Busca/Selecionar tudo não pode ser transparente');
    assert.notEqual(geometry.controlsBackground, 'transparent', label + ': bloco Busca/Selecionar tudo não pode ser transparente');
  }
  if (geometry.operatorText) {
    assert.ok(geometry.operatorHeight >= 34 && geometry.operatorHeight <= 38, label + ': select Operador deve ter cerca de 36px');
  }
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
          const list=dialog?.querySelector('.meg-datagrid-filter__values');
          const inputs=[...dialog?.querySelectorAll('.meg-datagrid-filter__values input[type="checkbox"]') || []];
          if(!body || !list || inputs.length < 2) return null;
          inputs[0].focus();
          const before=document.activeElement===inputs[0];
          const listCanScroll=list.scrollHeight > list.clientHeight;
          list.scrollTop=list.scrollHeight;
          const last=inputs[inputs.length - 1];
          last.scrollIntoView({block:'nearest'});
          const listRect=list.getBoundingClientRect();
          const lastRect=last.getBoundingClientRect();
          const controls=dialog.querySelector('.meg-datagrid-filter__controls');
          const controlsRect=controls?.getBoundingClientRect();
          const listStyle=getComputedStyle(list);
          const probePoints=controlsRect ? [
            [controlsRect.left + Math.min(12, controlsRect.width / 4), controlsRect.top + 8],
            [controlsRect.left + controlsRect.width / 2, controlsRect.top + controlsRect.height / 2],
            [controlsRect.right - Math.min(12, controlsRect.width / 4), controlsRect.bottom - 8],
          ] : [];
          const controlsOwnEveryProbe=probePoints.every(([x,y])=>{
            const hit=document.elementFromPoint(x,y);
            return Boolean(hit && controls && controls.contains(hit));
          });
          const scrollables=[...dialog.querySelectorAll('*')].filter((element)=>{
            const style=getComputedStyle(element);
            return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
          });
          return {
            before,
            listCanScroll,
            lastVisible:lastRect.top >= listRect.top - 1 && lastRect.bottom <= listRect.bottom + 1,
            rendered:inputs.length,
            listStartsBelowControls:Boolean(controlsRect && listRect.top >= controlsRect.bottom - 1),
            controlsOwnEveryProbe,
            listOverflowY:listStyle.overflowY,
            scrollableCount:scrollables.length,
          };
        })()`);
        assert.ok(listBehavior, label + ': lista longa de texto não disponível');
        assert.equal(listBehavior.before, true, label + ': primeiro valor não recebeu foco');
        assert.equal(listBehavior.listCanScroll, true, label + ': lista longa deve rolar na região única de valores');
        assert.equal(listBehavior.lastVisible, true, label + ': lista não rola até o último item renderizado');
        assert.equal(listBehavior.listStartsBelowControls, true, label + ': lista deve começar abaixo de Busca/Selecionar tudo');
        assert.equal(listBehavior.controlsOwnEveryProbe, true, label + ': bloco fixo deve ficar acima da lista em elementFromPoint');
        assert.ok(['auto', 'scroll', 'hidden', 'clip'].includes(listBehavior.listOverflowY), label + ': lista deve recortar conteúdo no próprio viewport');
        assert.equal(listBehavior.scrollableCount, 1, label + ': popover deve ter um único elemento rolável');
        assert.ok(listBehavior.rendered <= 200, label + ': lista longa ultrapassou limite de renderização');

        await browser.evaluate(`document.querySelector('[data-datagrid-filter-dialog="description"] .meg-datagrid-filter__values input[type="checkbox"]')?.focus()`);
        await browser.pressKey('ArrowDown', 'ArrowDown');
        const arrowMoved = await browser.evaluate(`(() => { const inputs=[...document.querySelectorAll('[data-datagrid-filter-dialog="description"] .meg-datagrid-filter__values input[type="checkbox"]')]; return inputs.length > 1 && document.activeElement===inputs[1]; })()`);
        assert.equal(arrowMoved, true, label + ': ArrowDown não moveu foco entre valores');

        const filteredSelectAll = await browser.evaluate(`(() => {
          const dialog=document.querySelector('[data-datagrid-filter-dialog="description"]');
          const search=dialog?.querySelector('.meg-datagrid-filter__search input');
          if(!search) return null;
          const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
          descriptor?.set?.call(search,'Registro técnico 1');
          search.dispatchEvent(new Event('input',{bubbles:true}));
          return true;
        })()`);
        assert.equal(filteredSelectAll, true, label + ': busca de valores não encontrada');
        await browser.sleep(40);
        const selectOnlyFiltered = await browser.evaluate(`(() => {
          const dialog=document.querySelector('[data-datagrid-filter-dialog="description"]');
          const all=dialog?.querySelector('.meg-datagrid-check--all input[type="checkbox"]');
          const visible=[...dialog?.querySelectorAll('.meg-datagrid-filter__values input[type="checkbox"]') || []];
          const countText=dialog?.querySelector('.meg-datagrid-check--all')?.textContent || '';
          all?.click();
          return { visible:visible.length, checked:visible.filter((input)=>input.checked).length, countText };
        })()`);
        assert.ok(selectOnlyFiltered.visible > 0, label + ': busca filtrada não retornou valores');
        assert.equal(selectOnlyFiltered.checked, selectOnlyFiltered.visible, label + ': Selecionar tudo deve marcar apenas itens filtrados visíveis');
        assert.ok(selectOnlyFiltered.countText.includes('(' + selectOnlyFiltered.visible + ')'), label + ': Selecionar tudo deve exibir contagem filtrada');
      }

      if (columnLabel === 'Data') {
        await waitForSelectorCount('[data-datagrid-filter-dialog="date"] .meg-datagrid-date-year__toggle',1,label + ' anos');
        await assertDateYearDisclosure('[data-datagrid-filter-dialog="date"]', width===1366 && height===600 && !collapsed ? 'data-1366x600-expanded-sidebar' : null);
      }
      if (columnLabel === 'Segmento' && width === 1366 && height === 600 && !collapsed) {
        await waitForSelectorCount('[data-datagrid-filter-dialog="segment"] .meg-datagrid-filter__values .meg-datagrid-check',1,'segmento 1366x600');
        await captureEvidence('segmento-1366x600-expanded-sidebar');
      }
      if (columnLabel === 'Valor técnico' && width === 1366 && height === 600 && !collapsed) {
        await browser.evaluate(`(() => { const list=document.querySelector('[data-datagrid-filter-dialog="amount"] .meg-datagrid-filter__values'); if(list) list.scrollTop=list.scrollHeight; return true; })()`);
        await browser.sleep(30);
        await captureEvidence('valor-tecnico-1366x600-scrolled');
      }
      if (columnLabel === 'Descrição técnica' && width === 1093 && height === 480 && !collapsed) {
        await captureEvidence('descricao-1093x480-expanded');
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

    for (const [key, columnLabel] of [
      ['date', 'Data'],
      ['description', 'Descrição técnica'],
      ['quantity', 'Quantidade'],
      ['amount', 'Valor técnico'],
      ['segment', 'Segmento'],
      ['active', 'Ativo'],
    ]) {
      const selected = await browser.evaluate(`(() => {
        const select=document.querySelector('[data-datagrid-mobile-column]');
        if(!select) return false;
        select.value=${JSON.stringify(key)};
        select.dispatchEvent(new Event('change',{bubbles:true}));
        return true;
      })()`);
      assert.equal(selected, true, label + ': seletor móvel de coluna ausente');
      await browser.sleep(35);
      await assertPopoverGeometry(label + ' ' + columnLabel, '[data-datagrid-mobile-sheet]', height, true);

      if (key === 'date') {
        await waitForSelectorCount('[data-datagrid-mobile-sheet] .meg-datagrid-date-year__toggle',1,label + ' anos móveis');
        if(width===910 && height===400 && !collapsed) {
          const themed=await browser.evaluate(`(() => { const c=document.querySelector('[data-datagrid-mobile-column]'),o=document.querySelector('[data-datagrid-mobile-sheet] .meg-datagrid-field select'); if(!c||!o)return null; const cs=getComputedStyle(c),os=getComputedStyle(o); return {cb:cs.backgroundColor,ob:os.backgroundColor,cc:cs.color,oc:os.color,h:c.getBoundingClientRect().height}; })()`);
          assert.ok(themed);
          assert.equal(themed.cb,themed.ob,label + ': fundo Coluna != Operador');
          assert.equal(themed.cc,themed.oc,label + ': cor Coluna != Operador');
          assert.ok(themed.h>=34&&themed.h<=38,label + ': altura Coluna');
          await captureEvidence('column-data-910x400-expanded-sidebar');
        }
        await assertDateYearDisclosure('[data-datagrid-mobile-sheet]', width===910 && height===400 && !collapsed ? 'data-910x400-expanded-sidebar' : null);
      }

      if (key === 'segment' && width === 910 && height === 400 && !collapsed) {
        const lowList = await browser.evaluate(`(() => {
          const dialog=document.querySelector('[data-datagrid-mobile-sheet]');
          const list=dialog?.querySelector('.meg-datagrid-filter__values');
          const rows=[...dialog?.querySelectorAll('.meg-datagrid-filter__values .meg-datagrid-check') || []];
          if(!list) return null;
          const rect=list.getBoundingClientRect();
          const visibleRows=rows.filter((row)=>{ const r=row.getBoundingClientRect(); return r.bottom > rect.top && r.top < rect.bottom; }).length;
          list.scrollTop=list.scrollHeight;
          const last=rows[rows.length - 1]?.getBoundingClientRect();
          const after=list.getBoundingClientRect();
          const scrollables=[...dialog.querySelectorAll('*')].filter((element)=>{
            const style=getComputedStyle(element);
            return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
          });
          return {
            visibleRows,
            canScroll:list.scrollHeight > list.clientHeight + 1,
            lastVisible:Boolean(last && last.bottom <= after.bottom + 1),
            scrollableCount:scrollables.length,
          };
        })()`);
        assert.ok(lowList, label + ': lista Segmento ausente');
        assert.ok(lowList.visibleRows >= 3, label + ': lista Segmento precisa mostrar pelo menos 3 linhas');
        assert.equal(lowList.canScroll, true, label + ': lista Segmento deve rolar em 910x400');
        assert.equal(lowList.lastVisible, true, label + ': lista Segmento deve rolar até o último item');
        assert.equal(lowList.scrollableCount, 1, label + ': popover móvel deve ter um único elemento rolável');
        await captureEvidence('column-segmento-910x400-expanded-sidebar');
      }
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
  const viewportFailures = [];
  const collectViewportFailure = async (label, task) => {
    try {
      await task();
    } catch (error) {
      viewportFailures.push({ label, message: error instanceof Error ? error.message : String(error) });
      console.error('FAIL ' + label + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1366, height: 600 },
    { width: 1024, height: 600 },
    { width: 1093, height: 480 },
    { width: 910, height: 400 },
  ]) {
    await collectViewportFailure(`overlay ${viewport.width}x${viewport.height} expandida`, () => assertCompactOverlays(viewport.width, viewport.height, false));
    await collectViewportFailure(`overlay ${viewport.width}x${viewport.height} recolhida`, () => assertCompactOverlays(viewport.width, viewport.height, true));
  }

  for (const viewport of [
    { width: 1366, height: 600 },
    { width: 910, height: 400 },
  ]) {
    for (const count of [0, 1, 3, 5]) {
      await collectViewportFailure(
        `toolbar ${viewport.width}x${viewport.height} ${count} filtros`,
        () => assertToolbarFilters(
          viewport.width,
          viewport.height,
          count,
          `filters-${count}-${viewport.width}x${viewport.height}`,
        ),
      );
    }
  }

  for (const viewport of [
    { width: 1366, height: 600 },
    { width: 910, height: 400 },
  ]) {
    await collectViewportFailure(
      `filtered-empty ${viewport.width}x${viewport.height}`,
      () => assertFilteredEmptyLayout(
        viewport.width,
        viewport.height,
        `filtered-empty-${viewport.width}x${viewport.height}`,
      ),
    );
  }

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1366, height: 600 },
    { width: 1024, height: 600 },
    { width: 1093, height: 480 },
    { width: 910, height: 400 },
  ]) {
    await collectViewportFailure(`active ${viewport.width}x${viewport.height} expandida`, () => applyTodayDateFilter(viewport.width, viewport.height, false, viewport.width===1366&&viewport.height===600 ? 'data-active-1366x600-expanded-sidebar' : viewport.width===910&&viewport.height===400 ? 'data-active-910x400-expanded-sidebar' : null));
    await collectViewportFailure(`active ${viewport.width}x${viewport.height} recolhida`, () => applyTodayDateFilter(viewport.width, viewport.height, true));
  }

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1366, height: 600 },
    { width: 1024, height: 768 },
    { width: 1024, height: 600 },
    { width: 1093, height: 480 },
  ]) {
    await collectViewportFailure(`containment ${viewport.width}x${viewport.height} expandida`, () => assertDesktopContainment(viewport.width, viewport.height, false));
    await collectViewportFailure(`containment ${viewport.width}x${viewport.height} recolhida`, () => assertDesktopContainment(viewport.width, viewport.height, true));
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
      assert.notEqual(snapshot.mobileFilterDisplay, 'none', label + ': botão Filtros (N) deve permanecer visível no desktop');
      assert.equal(snapshot.mobileSelectAllDisplay, 'none', label + ': seleção móvel deve ficar oculta no desktop');
      assert.equal(snapshot.mobileAggregatesDisplay, 'none', label + ': agregados móveis devem ficar ocultos no desktop');
      assert.equal(snapshot.viewportOverflowX, 'auto', label + ': rolagem horizontal desktop deve ficar confinada ao componente');
      assert.ok(snapshot.viewportScrollWidth >= snapshot.viewportClientWidth, label + ': viewport interno inválido');

      const aggregateFooter = await browser.evaluate("(() => { const footer=document.querySelector('.meg-datagrid-table tfoot'); const cell=footer?.querySelector('td'); if(!footer || !cell) return null; const alpha=(value)=>{ const match=value.match(/rgba?\\(([^)]+)\\)/); if(!match) return 0; const parts=match[1].split(',').map((part)=>part.trim()); return parts.length < 4 ? 1 : Number(parts[3]); }; return { footerBackground:getComputedStyle(footer).backgroundColor, cellBackground:getComputedStyle(cell).backgroundColor, footerAlpha:alpha(getComputedStyle(footer).backgroundColor), cellAlpha:alpha(getComputedStyle(cell).backgroundColor) }; })()");
      assert.ok(aggregateFooter, label + ': rodapé de agregados ausente');
      assert.equal(aggregateFooter.footerAlpha, 1, label + ': fundo do rodapé de agregados não é opaco');
      assert.equal(aggregateFooter.cellAlpha, 1, label + ': células do rodapé de agregados não são opacas');
      const theadBackground = await browser.evaluate("getComputedStyle(document.querySelector('.meg-datagrid-table thead')).backgroundColor");
      assert.notEqual(theadBackground, 'rgba(0, 0, 0, 0)', label + ': thead sticky não pode ser transparente');
      assert.notEqual(theadBackground, 'transparent', label + ': thead sticky não pode ser transparente');

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

  if (viewportFailures.length) {
    console.error('MEG DataGrid aggregated viewport failures:', JSON.stringify(viewportFailures, null, 2));
    throw new AggregateError(
      viewportFailures.map((item) => new Error(item.label + ': ' + item.message)),
      `${viewportFailures.length} falha(s) agregada(s) no contrato de viewport`,
    );
  }

  console.log('MEG Web Evolution DataGrid viewport contract: OK');
} catch (error) {
  console.error('DataGrid browser diagnostics:', browser.diagnostics());
  throw error;
} finally {
  await browser.close();
}
