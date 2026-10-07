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

try {
  for (const viewport of viewports) {
    await browser.setViewport(viewport.width, viewport.height);
    await browser.navigate(appUrl);
    await browser.evaluate("(() => { localStorage.removeItem('meg-web-evolution:datagrid:stage-04-harness'); localStorage.removeItem('meg-web-evolution:sidebar-collapsed'); return true; })()");
    await browser.navigate(appUrl);
    await browser.sleep(180);

    const snapshot = await browser.evaluate("(() => { const html=document.documentElement; const body=document.body; const shell=document.querySelector('.meg-shell'); const main=document.querySelector('.meg-main'); const grid=document.querySelector('[data-datagrid]'); const viewport=document.querySelector('.meg-datagrid__viewport'); const table=document.querySelector('.meg-datagrid-table'); const cards=document.querySelector('.meg-datagrid-cards'); const mobileFilter=document.querySelector('.meg-datagrid-mobile-filter'); const rows=[...document.querySelectorAll('[data-grid-row]')].filter((element)=>getComputedStyle(element).display!=='none'); const shellRect=shell?.getBoundingClientRect(); const gridRect=grid?.getBoundingClientRect(); return { innerWidth:window.innerWidth, innerHeight:window.innerHeight, htmlScrollWidth:html.scrollWidth, bodyScrollWidth:body.scrollWidth, mainClientWidth:main?.clientWidth, mainScrollWidth:main?.scrollWidth, shellRight:shellRect?.right, gridLeft:gridRect?.left, gridRight:gridRect?.right, gridWidth:gridRect?.width, tableDisplay:table ? getComputedStyle(table).display : null, cardsDisplay:cards ? getComputedStyle(cards).display : null, mobileFilterDisplay:mobileFilter ? getComputedStyle(mobileFilter).display : null, viewportOverflowX:viewport ? getComputedStyle(viewport).overflowX : null, viewportClientWidth:viewport?.clientWidth, viewportScrollWidth:viewport?.scrollWidth, virtualized:grid?.getAttribute('data-virtualized'), renderedRows:rows.length, groupCount:document.querySelectorAll('[data-grid-group]').length }; })()");

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
      assert.equal(snapshot.viewportOverflowX, 'auto', label + ': rolagem horizontal desktop deve ficar confinada ao componente');
      assert.ok(snapshot.viewportScrollWidth >= snapshot.viewportClientWidth, label + ': viewport interno inválido');

      const sortState = await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-sort-button'); button.focus(); button.click(); const th=button.closest('th'); return { sort:th.getAttribute('aria-sort'), focused:document.activeElement===button }; })()");
      assert.equal(sortState.sort, 'ascending', label + ': aria-sort não refletiu ordenação crescente');
      assert.equal(sortState.focused, true, label + ': botão de ordenação perdeu foco');

      const filterOpen = await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-filter-button'); button.focus(); button.click(); return { expanded:button.getAttribute('aria-expanded'), focused:document.activeElement===button }; })()");
      assert.equal(filterOpen.expanded, 'true', label + ': funil não marcou aria-expanded');
      await browser.sleep(80);
      assert.equal(await browser.evaluate("Boolean(document.querySelector('[role=dialog][data-datagrid-filter-dialog]'))"), true, label + ': popover role=dialog não abriu');
      await browser.pressKey('Escape', 'Escape');
      assert.equal(await browser.evaluate("Boolean(document.querySelector('[role=dialog][data-datagrid-filter-dialog]'))"), false, label + ': Esc não fechou popover');
      assert.equal(await browser.evaluate("document.activeElement===document.querySelector('.meg-datagrid-filter-button')"), true, label + ': foco não voltou ao funil');

      const groupBefore = await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-table .meg-datagrid-group-button'); button.focus(); return button.getAttribute('aria-expanded'); })()");
      await browser.pressKey('Enter', 'Enter');
      const groupAfter = await browser.evaluate("document.querySelector('.meg-datagrid-table .meg-datagrid-group-button')?.getAttribute('aria-expanded')");
      assert.notEqual(groupAfter, groupBefore, label + ': Enter não alternou grupo recolhível');
    } else {
      assert.equal(snapshot.tableDisplay, 'none', label + ': abaixo de 1024 a tabela deve ficar oculta');
      assert.notEqual(snapshot.cardsDisplay, 'none', label + ': abaixo de 1024 as linhas devem virar cards');
      assert.notEqual(snapshot.mobileFilterDisplay, 'none', label + ': botão Filtros deve ficar disponível');
      assert.equal(snapshot.viewportOverflowX, 'hidden', label + ': cards não podem criar rolagem horizontal interna');

      const sheetOpen = await browser.evaluate("(() => { const button=document.querySelector('.meg-datagrid-mobile-filter'); button.focus(); button.click(); return { expanded:button.getAttribute('aria-expanded') }; })()");
      assert.equal(sheetOpen.expanded, 'true', label + ': botão Filtros não marcou aria-expanded');
      await browser.sleep(80);
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

  console.log('MEG Web Evolution DataGrid viewport contract: OK');
} catch (error) {
  console.error('DataGrid browser diagnostics:', browser.diagnostics());
  throw error;
} finally {
  await browser.close();
}
