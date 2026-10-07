import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const appUrl = process.env.MEG_WEB_EVOLUTION_URL || 'http://127.0.0.1:4173/web-evolution.html';
const viewports = [
  { width: 1366, height: 600 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));
assert.ok(chromePath, 'Chrome/Chromium não encontrado para o contrato visual do Shell.');

const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--force-device-scale-factor=1',
  '--remote-debugging-port=9222',
  '--window-size=1366,768',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(url, retries = 50) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await sleep(100);
  }
  throw new Error(`Chrome DevTools indisponível: ${url}`);
}

const pages = await waitForJson('http://127.0.0.1:9222/json/list');
const page = pages.find((item) => item.type === 'page') || pages[0];
assert.ok(page?.webSocketDebuggerUrl, 'Página CDP não encontrada.');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let requestId = 0;
const pending = new Map();

socket.addEventListener('message', (event) => {
  const payload = JSON.parse(event.data);
  if (!payload.id) return;
  const item = pending.get(payload.id);
  if (!item) return;
  pending.delete(payload.id);
  if (payload.error) item.reject(new Error(payload.error.message));
  else item.resolve(payload.result);
});

function command(method, params = {}) {
  const id = ++requestId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result.value;
}

async function navigate(url) {
  await command('Page.navigate', { url });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const ready = await evaluate('document.readyState');
    if (ready === 'complete') return;
    await sleep(100);
  }
  throw new Error('A página do Shell não concluiu o carregamento.');
}

async function tooltipSnapshot() {
  return evaluate(`(() => {
    const tooltips = [...document.querySelectorAll('.meg-global-tooltip')];
    return {
      count: tooltips.length,
      items: tooltips.map((tooltip) => {
        const rect = tooltip.getBoundingClientRect();
        return {
          text: tooltip.textContent,
          width: rect.width,
          height: rect.height,
          insideViewport:
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= window.innerWidth &&
            rect.bottom <= window.innerHeight,
          parentIsBody: tooltip.parentElement === document.body,
          insideSidebar: Boolean(tooltip.closest('.meg-sidebar, .meg-sidebar-wrap, .meg-nav')),
        };
      }),
    };
  })()`);
}

async function targetSnapshot(selector) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      ariaLabel: element.getAttribute('aria-label'),
      hasTitle: element.hasAttribute('title'),
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  })()`);
}

async function hoverTarget(selector) {
  const target = await targetSnapshot(selector);
  assert.ok(target, `Elemento não encontrado para hover: ${selector}`);
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y });
  await sleep(90);
  return { target, tooltip: await tooltipSnapshot() };
}

async function focusTarget(selector) {
  const target = await targetSnapshot(selector);
  assert.ok(target, `Elemento não encontrado para foco: ${selector}`);
  await evaluate(`document.querySelector(${JSON.stringify(selector)})?.focus()`);
  await sleep(90);
  return { target, tooltip: await tooltipSnapshot() };
}

async function clearPointerAndFocus() {
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 }).catch(() => {});
  await evaluate(`document.activeElement instanceof HTMLElement && document.activeElement.blur()`);
  await sleep(50);
  const tooltip = await tooltipSnapshot();
  assert.equal(tooltip.count, 0, 'Tooltip residual permaneceu após mouseleave/blur');
}

function assertTooltipMatches(result, context) {
  assert.equal(result.target.hasTitle, false, `${context}: atributo title não pode existir`);
  assert.ok(result.target.ariaLabel, `${context}: aria-label ausente`);
  assert.equal(result.tooltip.count, 1, `${context}: esperado exatamente 1 tooltip, encontrado ${result.tooltip.count}`);
  const tooltip = result.tooltip.items[0];
  assert.equal(tooltip.text, result.target.ariaLabel, `${context}: texto do tooltip difere do aria-label`);
  assert.ok(tooltip.width > 0 && tooltip.height > 0, `${context}: tooltip sem dimensão visível`);
  assert.equal(tooltip.insideViewport, true, `${context}: tooltip saiu da janela`);
  assert.equal(tooltip.parentIsBody, true, `${context}: tooltip não foi portado para document.body`);
  assert.equal(tooltip.insideSidebar, false, `${context}: tooltip ficou sujeito ao overflow da sidebar/nav`);
}

function assertNoTooltip(result, context) {
  assert.equal(result.target.hasTitle, false, `${context}: atributo title não pode existir`);
  assert.equal(result.tooltip.count, 0, `${context}: não deveria haver tooltip, encontrado ${result.tooltip.count}`);
}

async function assertHoverAndFocusTooltip(selector, context) {
  await clearPointerAndFocus();
  const hover = await hoverTarget(selector);
  assertTooltipMatches(hover, `${context} / hover`);
  await clearPointerAndFocus();
  const focus = await focusTarget(selector);
  assertTooltipMatches(focus, `${context} / foco`);
  await clearPointerAndFocus();
}

async function assertHoverAndFocusNoTooltip(selector, context) {
  await clearPointerAndFocus();
  const hover = await hoverTarget(selector);
  assertNoTooltip(hover, `${context} / hover`);
  await clearPointerAndFocus();
  const focus = await focusTarget(selector);
  assertNoTooltip(focus, `${context} / foco`);
  await clearPointerAndFocus();
}

async function measure(state) {
  return evaluate(`(() => {
    const root = document.documentElement;
    const firstItem = document.querySelector('.meg-nav-item');
    const items = [...document.querySelectorAll('.meg-nav-item')];
    const labels = [...document.querySelectorAll('.meg-nav-item span')];
    const logo = document.querySelector('.meg-brand-logo--${state}');
    const control = document.querySelector('.meg-sidebar-toggle-topbar');
    const firstIcon = firstItem.querySelector('svg');
    const nav = document.querySelector('.meg-nav');
    const sidebar = document.querySelector('.meg-sidebar');
    const period = document.querySelector('.meg-period');
    const periodLabel = period?.querySelector('span');
    if (!firstItem || !logo || !control || !firstIcon || !nav || !sidebar || !period || !periodLabel) throw new Error('Elementos do contrato do Shell não encontrados.');

    const logoRect = logo.getBoundingClientRect();
    const itemRect = firstItem.getBoundingClientRect();
    const iconRect = firstIcon.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const controlRect = control.getBoundingClientRect();
    const periodRect = period.getBoundingClientRect();
    const periodLabelRect = periodLabel.getBoundingClientRect();
    const navIcons = [...document.querySelectorAll('.meg-nav .meg-nav-item svg')].map((icon) => {
      const rect = icon.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {
        width: rect.width,
        height: rect.height,
        fullyInsideNav:
          rect.left >= navRect.left &&
          rect.top >= navRect.top &&
          rect.right <= navRect.right &&
          rect.bottom <= navRect.bottom,
        visibleAtCenter: Boolean(hit && (hit === icon || icon.contains(hit) || icon.parentElement?.contains(hit))),
      };
    });

    const clippingAncestor = (() => {
      let node = control.parentElement;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const clipsX = ['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowX) &&
          (controlRect.left < rect.left || controlRect.right > rect.right);
        const clipsY = ['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY) &&
          (controlRect.top < rect.top || controlRect.bottom > rect.bottom);
        if (clipsX || clipsY) return node.className || node.tagName;
        node = node.parentElement;
      }
      return null;
    })();

    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollHeight: root.scrollHeight,
      logoBottom: logoRect.bottom,
      firstItemTop: itemRect.top,
      logoOpacity: getComputedStyle(logo).opacity,
      logoPosition: getComputedStyle(logo).position,
      logoWidth: logoRect.width,
      logoCenterX: logoRect.left + logoRect.width / 2,
      firstIconCenterX: iconRect.left + iconRect.width / 2,
      logoTopOffset: logoRect.top - sidebarRect.top,
      labelsFit: labels.every((label) => label.scrollWidth <= label.clientWidth),
      itemsFit: items.every((item) => item.scrollWidth <= item.clientWidth),
      controlInsideViewport:
        controlRect.left >= 0 &&
        controlRect.top >= 0 &&
        controlRect.right <= window.innerWidth &&
        controlRect.bottom <= window.innerHeight,
      controlWidth: controlRect.width,
      controlHeight: controlRect.height,
      controlTopmostAtCenter:
        document.elementFromPoint(
          controlRect.left + controlRect.width / 2,
          controlRect.top + controlRect.height / 2,
        ) === control,
      controlHasTitle: control.hasAttribute('title'),
      controlBorderWidth: getComputedStyle(control).borderTopWidth,
      controlOpacity: getComputedStyle(control).opacity,
      controlVisibility: getComputedStyle(control).visibility,
      navIcons,
      navScrollHeight: nav.scrollHeight,
      navClientHeight: nav.clientHeight,
      collapsedArtDisplay: getComputedStyle(document.querySelector('.sidebar__art')).display,
      periodOneLine:
        periodLabel.getClientRects().length === 1 &&
        periodLabelRect.height <= parseFloat(getComputedStyle(periodLabel).lineHeight || periodLabelRect.height) + 1,
      periodFits:
        period.scrollWidth <= period.clientWidth &&
        periodLabel.scrollWidth <= periodLabel.clientWidth &&
        !periodLabel.textContent.includes('\n'),
      periodInsideViewport: periodRect.right <= window.innerWidth && periodRect.left >= 0,
      controlClippingAncestor: clippingAncestor,
    };
  })()`);
}

const responsiveViewports = [
  { width: 1023, height: 768 },
  { width: 900, height: 700 },
  { width: 768, height: 600 },
  { width: 700, height: 600 },
  { width: 640, height: 600 },
  { width: 639, height: 600 },
  { width: 390, height: 844 },
];

async function measureResponsiveTopbar() {
  return evaluate(`(() => {
    const selectors = {
      menu: '.meg-menu-button',
      search: '.meg-search',
      period: '.meg-period',
      notification: '.meg-notification',
      profile: '.meg-profile',
    };

    const elements = Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => [key, document.querySelector(selector)])
    );

    const rects = Object.fromEntries(
      Object.entries(elements).map(([key, element]) => {
        if (!element) return [key, null];
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return [key, null];
        const rect = element.getBoundingClientRect();
        return [key, {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        }];
      })
    );

    const visibleRects = Object.entries(rects).filter(([, rect]) => rect && rect.width > 0 && rect.height > 0);
    const overlaps = [];
    for (let i = 0; i < visibleRects.length; i += 1) {
      for (let j = i + 1; j < visibleRects.length; j += 1) {
        const [aName, a] = visibleRects[i];
        const [bName, b] = visibleRects[j];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > 1 && overlapY > 1) overlaps.push(aName + 'x' + bName);
      }
    }

    const period = elements.period;
    const periodLabel = period?.querySelector('span');
    const root = document.documentElement;
    const topbar = document.querySelector('.meg-topbar');
    const topbarRect = topbar?.getBoundingClientRect();

    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
      overlaps,
      allInsideViewport: visibleRects.every(([, rect]) =>
        rect.left >= 0 &&
        rect.top >= 0 &&
        rect.right <= window.innerWidth &&
        rect.bottom <= window.innerHeight
      ),
      allInsideTopbar: topbarRect
        ? visibleRects.every(([, rect]) =>
            rect.left >= topbarRect.left - 1 &&
            rect.top >= topbarRect.top - 1 &&
            rect.right <= topbarRect.right + 1 &&
            rect.bottom <= topbarRect.bottom + 1
          )
        : false,
      periodOneLine: periodLabel
        ? periodLabel.getClientRects().length === 1 &&
          periodLabel.scrollWidth <= periodLabel.clientWidth
        : false,
      searchWidth: rects.search?.width || 0,
      searchInputWidth: elements.search?.querySelector('input')?.getBoundingClientRect().width || 0,
      searchInputOpacity: elements.search?.querySelector('input') ? getComputedStyle(elements.search.querySelector('input')).opacity : '0',
      periodWidth: rects.period?.width || 0,
      topbarHeight: topbarRect?.height || 0,
    };
  })()`);
}

const sidebarResponsiveViewports = [
  { width: 1366, height: 768 },
  { width: 1024, height: 600 },
  { width: 900, height: 560 },
  { width: 690, height: 600 },
  { width: 768, height: 520 },
  { width: 480, height: 520 },
  { width: 480, height: 480 },
];

async function prepareSidebarForState(viewport, collapsed) {
  await navigate(`${appUrl}?sidebar-contract=${viewport.width}x${viewport.height}-${collapsed ? 'collapsed' : 'expanded'}`);
  await sleep(180);

  if (viewport.width < 640) {
    await evaluate(`document.querySelector('.meg-menu-button')?.click()`);
    await sleep(120);
    await evaluate(`document.querySelector('.meg-shell')?.classList.toggle('is-sidebar-collapsed', ${collapsed})`);
    return;
  }

  const isCollapsed = await evaluate(`document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed')`);
  if (Boolean(isCollapsed) !== collapsed) {
    await evaluate(`document.querySelector('.meg-sidebar-toggle-topbar')?.click()`);
    await sleep(120);
  }
}

async function measureSidebarResponsive() {
  return evaluate(`(() => {
    const root = document.documentElement;
    const sidebar = document.querySelector('.meg-sidebar');
    const nav = document.querySelector('.meg-nav');
    const footer = document.querySelector('.meg-sidebar-footer');
    const art = document.querySelector('.sidebar__art');
    const items = [...document.querySelectorAll('.meg-nav .meg-nav-item')];
    const dividerStyle = footer ? getComputedStyle(footer, '::before') : null;

    if (!sidebar || !nav || !footer || items.length !== 7) {
      return { missing: true, itemCount: items.length };
    }

    const sidebarRect = sidebar.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const itemRects = items.map((item) => {
      const rect = item.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(centerX, centerY);
      return {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        bottom: rect.bottom,
        fullyInsideNav:
          rect.left >= navRect.left - 1 &&
          rect.right <= navRect.right + 1 &&
          rect.top >= navRect.top - 1 &&
          rect.bottom <= navRect.bottom + 1,
        visibleAtCenter: Boolean(hit && (hit === item || item.contains(hit))),
      };
    });

    const parseRgb = (value) => {
      const match = value?.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
      return match ? match.slice(1, 4).map(Number) : null;
    };
    const dividerRgb = parseRgb(dividerStyle?.backgroundColor);
    const dividerNeutral = dividerRgb
      ? Math.max(...dividerRgb) - Math.min(...dividerRgb) <= 8
      : false;

    const maxItemHeight = Math.max(...itemRects.map((item) => item.height), 0);
    const lastItem = itemRects[itemRects.length - 1];
    const needsScroll = nav.scrollHeight > nav.clientHeight + 1;
    const gapToFooter = Math.max(0, footerRect.top - lastItem.bottom);

    return {
      missing: false,
      innerHeight: window.innerHeight,
      documentScrollHeight: root.scrollHeight,
      sidebarTop: sidebarRect.top,
      sidebarBottom: sidebarRect.bottom,
      navTop: navRect.top,
      navBottom: navRect.bottom,
      navClientHeight: nav.clientHeight,
      navScrollHeight: nav.scrollHeight,
      needsScroll,
      itemCount: items.length,
      itemRects,
      maxItemHeight,
      lastItemBottom: lastItem.bottom,
      gapToFooter,
      footerTop: footerRect.top,
      dividerNeutral,
      dividerColor: dividerStyle?.backgroundColor || '',
      artDisplay: art ? getComputedStyle(art).display : 'missing',
    };
  })()`);
}

async function assertSidebarState(viewport, collapsed) {
  await prepareSidebarForState(viewport, collapsed);
  await clearPointerAndFocus();
  const result = await measureSidebarResponsive();
  const state = collapsed ? 'recolhida' : 'expandida';

  assert.equal(result.missing, false, `${viewport.width}x${viewport.height} ${state}: estrutura da sidebar ausente`);
  assert.equal(result.itemCount, 7, `${viewport.width}x${viewport.height} ${state}: esperado 7 itens`);
  assert.ok(
    result.documentScrollHeight <= result.innerHeight,
    `${viewport.width}x${viewport.height} ${state}: documento não pode rolar (${result.documentScrollHeight}/${result.innerHeight})`,
  );
  assert.equal(
    result.dividerNeutral,
    true,
    `${viewport.width}x${viewport.height} ${state}: divisor de Sair não é neutro (${result.dividerColor})`,
  );

  for (const [index, item] of result.itemRects.entries()) {
    assert.ok(item.width > 0 && item.height > 0, `${viewport.width}x${viewport.height} ${state}: item ${index + 1} sem dimensão`);
    if (viewport.height >= 520) {
      assert.equal(item.fullyInsideNav, true, `${viewport.width}x${viewport.height} ${state}: item ${index + 1} parcialmente cortado`);
      assert.equal(item.visibleAtCenter, true, `${viewport.width}x${viewport.height} ${state}: item ${index + 1} não está visível no centro`);
    }
  }

  if (viewport.height >= 520 && viewport.height < 768) {
    assert.equal(
      result.needsScroll,
      false,
      `${viewport.width}x${viewport.height} ${state}: nav não deveria rolar a partir de 520px`,
    );
    assert.ok(
      result.lastItemBottom <= result.navBottom + 1,
      `${viewport.width}x${viewport.height} ${state}: último item ultrapassa o nav`,
    );
    assert.ok(
      result.gapToFooter <= result.maxItemHeight + 1,
      `${viewport.width}x${viewport.height} ${state}: vazio excessivo antes do rodapé (${result.gapToFooter}px > ${result.maxItemHeight}px)`,
    );
  }

  if (viewport.height < 520) {
    assert.equal(
      result.needsScroll,
      true,
      `${viewport.width}x${viewport.height} ${state}: abaixo de 520px o nav deve ser rolável`,
    );
    const reachable = await evaluate(`(() => {
      const nav = document.querySelector('.meg-nav');
      const last = document.querySelector('.meg-nav .meg-nav-item:last-child');
      if (!nav || !last) return false;
      nav.scrollTop = nav.scrollHeight;
      const navRect = nav.getBoundingClientRect();
      const rect = last.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, Math.min(rect.top + rect.height / 2, navRect.bottom - 1));
      return rect.bottom <= navRect.bottom + 1 && Boolean(hit && (hit === last || last.contains(hit)));
    })()`);
    assert.equal(reachable, true, `${viewport.width}x${viewport.height} ${state}: último item não é alcançável pela rolagem`);
  }

  if (viewport.height < 700) {
    assert.equal(result.artDisplay, 'none', `${viewport.width}x${viewport.height} ${state}: marca d'água deve ficar oculta abaixo de 700px`);
  }

  if (collapsed && viewport.width >= 640) {
    for (const [label, selector] of [
      ['Início', '.meg-nav .meg-nav-item[aria-label="Início"]'],
      ['Lançamentos', '.meg-nav .meg-nav-item[aria-label="Lançamentos"]'],
      ['Cartões', '.meg-nav .meg-nav-item[aria-label="Cartões"]'],
      ['Pendentes', '.meg-nav .meg-nav-item[aria-label="Pendentes"]'],
      ['Benefícios', '.meg-nav .meg-nav-item[aria-label="Benefícios"]'],
      ['Relatórios', '.meg-nav .meg-nav-item[aria-label="Relatórios"]'],
      ['Configurações', '.meg-nav .meg-nav-item[aria-label="Configurações"]'],
      ['Sair', '.meg-logout-button[aria-label="Sair"]'],
    ]) {
      await assertHoverAndFocusTooltip(selector, `${viewport.width}x${viewport.height} ${state} / ${label}`);
    }
  }
}

async function assertReducedTopbarLaunchers(viewport) {
  const launchers = await evaluate(`(() => {
    const wrap = document.querySelector('.meg-topbar-launchers');
    const toggle = document.querySelector('.meg-sidebar-toggle-topbar');
    const add = document.querySelector('.meg-topbar-new');
    if (!wrap || !toggle || !add) return null;
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    return {
      wrap: visible(wrap),
      toggle: visible(toggle),
      add: visible(add),
      shellCollapsed: document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed') || false,
      toggleTabIndex: toggle.tabIndex,
      toggleAriaHidden: toggle.getAttribute('aria-hidden'),
    };
  })()`);

  assert.ok(launchers, `${viewport.width}x${viewport.height}: controles rápidos ausentes`);
  assert.equal(launchers.add, true, `${viewport.width}x${viewport.height}: Novo sumiu`);

  if (viewport.width >= 1024) {
    assert.equal(launchers.wrap, true, `${viewport.width}x${viewport.height}: grupo de ações rápidas sumiu`);
    assert.equal(launchers.toggle, true, `${viewport.width}x${viewport.height}: recolher/expandir deveria estar visível no desktop`);
    assert.equal(launchers.toggleTabIndex, 0, `${viewport.width}x${viewport.height}: toggle desktop deveria aceitar foco`);
  } else if (viewport.width >= 640) {
    assert.equal(launchers.wrap, true, `${viewport.width}x${viewport.height}: grupo de ações rápidas sumiu`);
    assert.equal(launchers.toggle, false, `${viewport.width}x${viewport.height}: toggle não pode aparecer na sidebar compacta`);
    assert.equal(launchers.shellCollapsed, true, `${viewport.width}x${viewport.height}: sidebar compacta deve permanecer recolhida`);
    assert.equal(launchers.toggleTabIndex, -1, `${viewport.width}x${viewport.height}: toggle oculto não pode entrar no foco`);
    assert.equal(launchers.toggleAriaHidden, 'true', `${viewport.width}x${viewport.height}: toggle oculto precisa aria-hidden=true`);
  } else {
    assert.equal(launchers.toggle, false, `${viewport.width}x${viewport.height}: toggle desktop não pode aparecer no mobile`);
  }
}

try {
  await command('Page.enable');
  await command('Runtime.enable');

  for (const viewport of viewports) {
    await command('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await navigate(`${appUrl}?viewport-contract=${viewport.width}x${viewport.height}`);
    await sleep(250);

    const expanded = await measure('expanded');
    assert.ok(
      expanded.scrollHeight <= expanded.innerHeight,
      `${viewport.width}x${viewport.height} expandida: scrollHeight ${expanded.scrollHeight} > innerHeight ${expanded.innerHeight}`,
    );
    assert.ok(
      expanded.firstItemTop >= expanded.logoBottom,
      `${viewport.width}x${viewport.height} expandida: Início (${expanded.firstItemTop}) sobrepõe logo (${expanded.logoBottom})`,
    );
    if (viewport.width >= 1024) {
      assert.ok(
        expanded.logoWidth >= (viewport.height < 520 ? 104 : 112),
        `${viewport.width}x${viewport.height} expandida: logo desktop perdeu escala (${expanded.logoWidth}px)`,
      );
    }
    if (viewport.height < 768) {
      assert.ok(
        expanded.firstItemTop - expanded.logoBottom >= 6,
        `${viewport.width}x${viewport.height} expandida: respiro entre logo e Início menor que 6px (${expanded.firstItemTop - expanded.logoBottom})`,
      );
    }
    assert.equal(expanded.logoOpacity, '1');
    assert.equal(expanded.labelsFit, true, `${viewport.width}x${viewport.height} expandida: texto do menu truncado`);
    assert.equal(expanded.itemsFit, true, `${viewport.width}x${viewport.height} expandida: item do menu excede a largura`);
    assert.equal(expanded.controlInsideViewport, true, `${viewport.width}x${viewport.height} expandida: botão de recolher fora da janela`);
    assert.equal(expanded.controlTopmostAtCenter, true, `${viewport.width}x${viewport.height} expandida: botão coberto no centro`);
    assert.equal(expanded.controlHasTitle, false, `${viewport.width}x${viewport.height} expandida: atributo title não deve existir`);
    assert.equal(expanded.controlClippingAncestor, null, `${viewport.width}x${viewport.height} expandida: botão sujeito a clipping por ancestral ${expanded.controlClippingAncestor}`);
    assert.equal(expanded.periodOneLine, true, `${viewport.width}x${viewport.height}: período quebrou em mais de uma linha`);
    assert.equal(expanded.periodFits, true, `${viewport.width}x${viewport.height}: período foi espremido/cortado`);
    assert.equal(expanded.periodInsideViewport, true, `${viewport.width}x${viewport.height}: período saiu da janela`);

    const navSelectors = [
      ['Início', '.meg-nav .meg-nav-item[aria-label="Início"]'],
      ['Lançamentos', '.meg-nav .meg-nav-item[aria-label="Lançamentos"]'],
      ['Cartões', '.meg-nav .meg-nav-item[aria-label="Cartões"]'],
      ['Pendentes', '.meg-nav .meg-nav-item[aria-label="Pendentes"]'],
      ['Benefícios', '.meg-nav .meg-nav-item[aria-label="Benefícios"]'],
      ['Relatórios', '.meg-nav .meg-nav-item[aria-label="Relatórios"]'],
      ['Configurações', '.meg-nav .meg-nav-item[aria-label="Configurações"]'],
    ];

    for (const [label, selector] of navSelectors) {
      await assertHoverAndFocusNoTooltip(
        selector,
        `${viewport.width}x${viewport.height} expandida / ${label}`,
      );
    }

    await assertHoverAndFocusNoTooltip(
      '.meg-logout-button[aria-label="Sair"]',
      `${viewport.width}x${viewport.height} expandida / Sair`,
    );

    await assertHoverAndFocusTooltip(
      '.meg-sidebar-toggle-topbar',
      `${viewport.width}x${viewport.height} expandida / Recolher menu («)`,
    );
    await assertHoverAndFocusTooltip(
      '.meg-topbar-new[aria-label="Novo lançamento"]',
      `${viewport.width}x${viewport.height} expandida / Novo lançamento (+)`,
    );

    await evaluate(`document.querySelector('.meg-sidebar-toggle-topbar')?.click()`);
    await sleep(250);

    const collapsed = await measure('collapsed');
    assert.ok(
      collapsed.scrollHeight <= collapsed.innerHeight,
      `${viewport.width}x${viewport.height} recolhida: scrollHeight ${collapsed.scrollHeight} > innerHeight ${collapsed.innerHeight}`,
    );
    assert.ok(
      collapsed.firstItemTop >= collapsed.logoBottom,
      `${viewport.width}x${viewport.height} recolhida: Início (${collapsed.firstItemTop}) sobrepõe símbolo (${collapsed.logoBottom})`,
    );
    assert.equal(collapsed.logoOpacity, '1');
    assert.equal(collapsed.controlInsideViewport, true, `${viewport.width}x${viewport.height} recolhida: botão de expandir fora da janela`);
    assert.equal(collapsed.controlTopmostAtCenter, true, `${viewport.width}x${viewport.height} recolhida: botão coberto no centro`);
    assert.equal(collapsed.controlHasTitle, false, `${viewport.width}x${viewport.height} recolhida: atributo title não deve existir`);
    assert.equal(collapsed.controlClippingAncestor, null, `${viewport.width}x${viewport.height} recolhida: botão sujeito a clipping por ancestral ${collapsed.controlClippingAncestor}`);

    for (const [label, selector] of navSelectors) {
      await assertHoverAndFocusTooltip(
        selector,
        `${viewport.width}x${viewport.height} recolhida / ${label}`,
      );
    }

    await assertHoverAndFocusTooltip(
      '.meg-logout-button[aria-label="Sair"]',
      `${viewport.width}x${viewport.height} recolhida / Sair`,
    );
    await assertHoverAndFocusTooltip(
      '.meg-sidebar-toggle-topbar',
      `${viewport.width}x${viewport.height} recolhida / Expandir menu (»)`,
    );
    await assertHoverAndFocusTooltip(
      '.meg-topbar-new[aria-label="Novo lançamento"]',
      `${viewport.width}x${viewport.height} recolhida / Novo lançamento (+)`,
    );
    if (viewport.width === 1366 && (viewport.height === 600 || viewport.height === 768)) {
      assert.ok(
        Math.abs(collapsed.logoCenterX - collapsed.firstIconCenterX) <= 1,
        `${viewport.width}x${viewport.height} recolhida: símbolo fora do eixo dos ícones (${collapsed.logoCenterX} vs ${collapsed.firstIconCenterX})`,
      );
      assert.ok(
        collapsed.logoTopOffset >= 12,
        `${viewport.width}x${viewport.height} recolhida: símbolo com menos de 12px de respiro superior (${collapsed.logoTopOffset})`,
      );
      assert.ok(
        collapsed.logoCenterX > 0,
        `${viewport.width}x${viewport.height} recolhida: centro do símbolo inválido`,
      );
      assert.ok(collapsed.logoWidth >= 34, `${viewport.width}x${viewport.height} recolhida: logo reduzido menor que 34px (${collapsed.logoWidth})`);
      assert.equal(collapsed.navIcons.length, 7, `${viewport.width}x${viewport.height} recolhida: esperado 7 ícones de menu`);
      assert.ok(
        collapsed.navScrollHeight <= collapsed.navClientHeight + 1,
        `${viewport.width}x${viewport.height} recolhida: nav não deveria exigir rolagem (${collapsed.navScrollHeight}/${collapsed.navClientHeight})`,
      );
      collapsed.navIcons.forEach((icon, index) => {
        assert.ok(icon.width > 0 && icon.height > 0, `${viewport.width}x${viewport.height} recolhida: ícone ${index + 1} sem dimensão`);
        assert.equal(icon.fullyInsideNav, true, `${viewport.width}x${viewport.height} recolhida: ícone ${index + 1} cortado pelo nav`);
        assert.equal(icon.visibleAtCenter, true, `${viewport.width}x${viewport.height} recolhida: ícone ${index + 1} coberto no centro`);
      });
      assert.equal(collapsed.controlBorderWidth, '1px', `${viewport.width}x${viewport.height} recolhida: controle da topbar deve manter borda de 1px`);
      assert.equal(collapsed.controlOpacity, '1', `${viewport.width}x${viewport.height} recolhida: controle não pode desaparecer por opacity`);
      assert.equal(collapsed.controlVisibility, 'visible', `${viewport.width}x${viewport.height} recolhida: controle não pode desaparecer por visibility`);
      assert.equal(collapsed.collapsedArtDisplay, 'none', `${viewport.width}x${viewport.height} recolhida: marca d'água deve ficar oculta`);
    }

    console.log(
      `OK ${viewport.width}x${viewport.height}: expandida ${expanded.scrollHeight}/${expanded.innerHeight}, recolhida ${collapsed.scrollHeight}/${collapsed.innerHeight}`,
    );
  }

  for (const viewport of responsiveViewports) {
    await command('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width < 640,
    });

    await navigate(`${appUrl}?responsive-contract=${viewport.width}x${viewport.height}`);
    await sleep(250);

    const responsive = await measureResponsiveTopbar();
    assert.equal(
      responsive.scrollWidth <= responsive.innerWidth,
      true,
      `${viewport.width}x${viewport.height}: documento criou rolagem horizontal (${responsive.scrollWidth}/${responsive.innerWidth})`,
    );
    assert.equal(
      responsive.scrollHeight <= responsive.innerHeight,
      true,
      `${viewport.width}x${viewport.height}: documento criou rolagem vertical externa (${responsive.scrollHeight}/${responsive.innerHeight})`,
    );
    assert.deepEqual(
      responsive.overlaps,
      [],
      `${viewport.width}x${viewport.height}: controles da topbar se sobrepõem: ${responsive.overlaps.join(', ')}`,
    );
    assert.equal(
      responsive.allInsideViewport,
      true,
      `${viewport.width}x${viewport.height}: controle da topbar saiu da janela`,
    );
    assert.equal(
      responsive.allInsideTopbar,
      true,
      `${viewport.width}x${viewport.height}: controle da topbar saiu dos limites do cabeçalho`,
    );
    assert.equal(
      responsive.periodOneLine,
      true,
      `${viewport.width}x${viewport.height}: descrição do período quebrou/cortou`,
    );
    assert.ok(
      responsive.searchWidth > 0 && responsive.periodWidth > 0,
      `${viewport.width}x${viewport.height}: busca ou período sem largura útil`,
    );

    if (viewport.width >= 640 && viewport.width <= 700) {
      assert.ok(
        responsive.searchWidth <= 48,
        `${viewport.width}x${viewport.height}: busca deveria compactar para ícone antes de quebrar (${responsive.searchWidth}px)`,
      );
      assert.ok(
        responsive.searchInputWidth <= 1 && responsive.searchInputOpacity === '0',
        `${viewport.width}x${viewport.height}: texto da busca deveria estar recolhido no estado compacto`,
      );
    }

    if (viewport.width < 640) {
      assert.ok(
        responsive.searchWidth > 200,
        `${viewport.width}x${viewport.height}: no mobile a busca deve voltar a ocupar a linha própria`,
      );
      assert.equal(
        responsive.searchInputOpacity,
        '1',
        `${viewport.width}x${viewport.height}: input da busca deve reaparecer após o reflow mobile`,
      );
    }

    console.log(
      `OK responsive ${viewport.width}x${viewport.height}: topbar=${responsive.topbarHeight}px, busca=${responsive.searchWidth}px, período=${responsive.periodWidth}px`,
    );
  }

  console.log('MEG Web Evolution responsive topbar contract: OK');

  for (const viewport of sidebarResponsiveViewports) {
    await command('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width < 640,
    });

    await navigate(`${appUrl}?sidebar-lock-contract=${viewport.width}x${viewport.height}`);
    await sleep(250);
    await assertReducedTopbarLaunchers(viewport);

    if (viewport.width >= 1024) {
      await assertSidebarState(viewport, false);
      await assertSidebarState(viewport, true);
    } else if (viewport.width >= 640) {
      await assertSidebarState(viewport, true);
      const compactLock = await evaluate(`(() => {
        const shell = document.querySelector('.meg-shell');
        const toggle = document.querySelector('.meg-sidebar-toggle-topbar');
        toggle?.click();
        return {
          collapsed: shell?.classList.contains('is-sidebar-collapsed') || false,
          toggleDisplay: toggle ? getComputedStyle(toggle).display : 'missing',
        };
      })()`);
      assert.equal(compactLock.collapsed, true, `${viewport.width}x${viewport.height}: sidebar compacta foi expandida indevidamente`);
      assert.equal(compactLock.toggleDisplay, 'none', `${viewport.width}x${viewport.height}: controle de expandir deveria estar oculto`);
    } else {
      await assertSidebarState(viewport, true);
    }

    console.log(`OK sidebar responsive ${viewport.width}x${viewport.height}`);
  }

  await command('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate(`${appUrl}?sidebar-restore-contract=user-preference`);
  await sleep(220);

  await evaluate(`document.querySelector('.meg-sidebar-toggle-topbar')?.click()`);
  await sleep(120);
  assert.equal(
    await evaluate(`document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed')`),
    true,
    '1366x768: usuário escolheu sidebar recolhida',
  );

  await command('Emulation.setDeviceMetricsOverride', {
    width: 900,
    height: 700,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(220);
  assert.equal(
    await evaluate(`document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed')`),
    true,
    '900x700: sidebar deve permanecer forçadamente recolhida',
  );

  await command('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(260);
  assert.equal(
    await evaluate(`document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed')`),
    true,
    '1366x768 após ampliar: preferência recolhida do usuário deve ser restaurada',
  );

  await evaluate(`document.querySelector('.meg-sidebar-toggle-topbar')?.click()`);
  await sleep(120);
  assert.equal(
    await evaluate(`document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed')`),
    false,
    '1366x768: usuário escolheu sidebar expandida',
  );

  await command('Emulation.setDeviceMetricsOverride', {
    width: 900,
    height: 700,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(220);
  assert.equal(
    await evaluate(`document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed')`),
    true,
    '900x700: sidebar expandida do desktop deve ser forçada a recolher',
  );

  await command('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(260);
  assert.equal(
    await evaluate(`document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed')`),
    false,
    '1366x768 após ampliar: preferência expandida do usuário deve ser restaurada',
  );

  await command('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate(`${appUrl}?sidebar-tab-restore=collapsed`);
  await sleep(220);

  await evaluate(`localStorage.setItem('meg-web-evolution:sidebar-collapsed', 'true')`);
  await navigate(`${appUrl}?sidebar-tab-restore=collapsed-reload`);
  await sleep(220);
  assert.equal(
    await evaluate(`document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed')`),
    true,
    'recarregamento/restauração de aba deve preservar preferência recolhida',
  );

  await evaluate(`localStorage.setItem('meg-web-evolution:sidebar-collapsed', 'false')`);
  await navigate(`${appUrl}?sidebar-tab-restore=expanded-reload`);
  await sleep(220);
  assert.equal(
    await evaluate(`document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed')`),
    false,
    'recarregamento/restauração de aba deve preservar preferência expandida',
  );

  console.log('MEG Web Evolution responsive sidebar contract: OK');

  console.log('MEG Web Evolution viewport contract: OK');
} finally {
  socket.close();
  chrome.kill('SIGTERM');
}
