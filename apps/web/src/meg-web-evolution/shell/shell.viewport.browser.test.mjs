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

async function measure(state) {
  return evaluate(`(() => {
    const root = document.documentElement;
    const firstItem = document.querySelector('.meg-nav-item');
    const items = [...document.querySelectorAll('.meg-nav-item')];
    const labels = [...document.querySelectorAll('.meg-nav-item span')];
    const logo = document.querySelector('.meg-brand-logo--${state}');
    const control = document.querySelector('.meg-sidebar-control');
    const firstIcon = firstItem.querySelector('svg');
    const nav = document.querySelector('.meg-nav');
    const sidebar = document.querySelector('.meg-sidebar');
    if (!firstItem || !logo || !control || !firstIcon || !nav || !sidebar) throw new Error('Elementos do contrato do Shell não encontrados.');

    const logoRect = logo.getBoundingClientRect();
    const itemRect = firstItem.getBoundingClientRect();
    const iconRect = firstIcon.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const controlRect = control.getBoundingClientRect();
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
      navIcons,
      collapsedArtDisplay: getComputedStyle(document.querySelector('.sidebar__art')).display,
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

    await evaluate(`document.querySelector('.meg-sidebar-control')?.click()`);
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
      assert.ok(collapsed.logoWidth >= 30, `${viewport.width}x${viewport.height} recolhida: símbolo menor que 30px (${collapsed.logoWidth})`);
      assert.equal(collapsed.navIcons.length, 7, `${viewport.width}x${viewport.height} recolhida: esperado 7 ícones de menu`);
      collapsed.navIcons.forEach((icon, index) => {
        assert.ok(icon.width > 0 && icon.height > 0, `${viewport.width}x${viewport.height} recolhida: ícone ${index + 1} sem dimensão`);
        assert.equal(icon.fullyInsideNav, true, `${viewport.width}x${viewport.height} recolhida: ícone ${index + 1} cortado pelo nav`);
        assert.equal(icon.visibleAtCenter, true, `${viewport.width}x${viewport.height} recolhida: ícone ${index + 1} coberto no centro`);
      });
      assert.equal(collapsed.controlBorderWidth, '0px', `${viewport.width}x${viewport.height} recolhida: botão expandir não pode ter borda em repouso`);
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
