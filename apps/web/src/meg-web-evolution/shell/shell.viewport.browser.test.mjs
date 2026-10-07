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

async function hoverTooltip(selector) {
  const point = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  assert.ok(point, `Elemento não encontrado para hover: ${selector}`);
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await sleep(80);
  return evaluate(`(() => {
    const tooltip = document.querySelector('.meg-global-tooltip');
    if (!tooltip) return null;
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
    };
  })()`);
}

async function focusTooltip(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)})?.focus()`);
  await sleep(80);
  return evaluate(`(() => {
    const tooltip = document.querySelector('.meg-global-tooltip');
    if (!tooltip) return null;
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
    };
  })()`);
}

async function clearPointerAndFocus() {
  await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 }).catch(() => {});
  await evaluate(`document.activeElement instanceof HTMLElement && document.activeElement.blur()`);
  await sleep(40);
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

    const topbarHoverTooltip = await hoverTooltip('.meg-topbar-new');
    assert.equal(topbarHoverTooltip?.text, 'Novo lançamento', `${viewport.width}x${viewport.height}: tooltip hover do Novo não apareceu`);
    assert.equal(topbarHoverTooltip?.insideViewport, true, `${viewport.width}x${viewport.height}: tooltip hover do Novo saiu da janela`);
    await clearPointerAndFocus();

    const topbarFocusTooltip = await focusTooltip('.meg-sidebar-toggle-topbar');
    assert.equal(topbarFocusTooltip?.text, 'Recolher menu', `${viewport.width}x${viewport.height}: tooltip focus do recolher não apareceu`);
    assert.equal(topbarFocusTooltip?.insideViewport, true, `${viewport.width}x${viewport.height}: tooltip focus do recolher saiu da janela`);
    await clearPointerAndFocus();

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

    const navHoverTooltip = await hoverTooltip('.meg-nav .meg-nav-item[data-tooltip="Início"]');
    assert.equal(navHoverTooltip?.text, 'Início', `${viewport.width}x${viewport.height} recolhida: tooltip hover de Início não apareceu`);
    assert.equal(navHoverTooltip?.insideViewport, true, `${viewport.width}x${viewport.height} recolhida: tooltip hover de Início saiu da janela`);
    await clearPointerAndFocus();

    const navFocusTooltip = await focusTooltip('.meg-nav .meg-nav-item[data-tooltip="Configurações"]');
    assert.equal(navFocusTooltip?.text, 'Configurações', `${viewport.width}x${viewport.height} recolhida: tooltip focus de Configurações não apareceu`);
    assert.equal(navFocusTooltip?.insideViewport, true, `${viewport.width}x${viewport.height} recolhida: tooltip focus de Configurações saiu da janela`);
    await clearPointerAndFocus();
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

  console.log('MEG Web Evolution viewport contract: OK');
} finally {
  socket.close();
  chrome.kill('SIGTERM');
}
