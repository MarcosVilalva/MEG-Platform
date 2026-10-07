import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const appUrl = process.env.MEG_WEB_EVOLUTION_URL || 'http://127.0.0.1:4173/web-evolution.html';
const viewports = [
  { width: 1366, height: 600 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isCI = Boolean(process.env.CI);

function resolveChromeCandidate(candidate) {
  if (!candidate) return null;

  if (candidate.includes('/') || candidate.includes('\\')) {
    return existsSync(candidate) ? candidate : null;
  }

  const resolved = spawnSync('which', [candidate], { encoding: 'utf8' });
  if (resolved.status !== 0) return null;

  const executable = resolved.stdout.trim().split(/\r?\n/, 1)[0];
  return executable && existsSync(executable) ? executable : null;
}

const ciChromeCandidates = [
  process.env.CHROME_BIN,
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser',
];

const localChromeCandidates = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

const chromeCandidates = isCI ? ciChromeCandidates : localChromeCandidates;
const attemptedChromeCandidates = isCI
  ? [
      process.env.CHROME_BIN ? `CHROME_BIN=${process.env.CHROME_BIN}` : 'CHROME_BIN=(não definido)',
      'google-chrome',
      'google-chrome-stable',
      'chromium',
      'chromium-browser',
    ]
  : chromeCandidates.filter(Boolean);

let chromePath = null;
for (const candidate of chromeCandidates) {
  chromePath = resolveChromeCandidate(candidate);
  if (chromePath) break;
}

assert.ok(
  chromePath,
  `Chrome/Chromium não encontrado para o contrato visual do Shell. Tentativas: ${attemptedChromeCandidates.join(', ')}`,
);

const chromeUserDataDir = isCI
  ? mkdtempSync(join(tmpdir(), 'meg-web-evolution-chrome-'))
  : `/tmp/meg-web-evolution-chrome-${process.pid}`;

const ciChromeArgs = [
  '--headless=new',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-debugging-port=0',
  '--remote-allow-origins=*',
  `--user-data-dir=${chromeUserDataDir}`,
  '--force-device-scale-factor=1',
  '--window-size=1366,768',
  'about:blank',
];

const localChromeArgs = [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--force-device-scale-factor=1',
  '--remote-debugging-pipe',
  `--user-data-dir=${chromeUserDataDir}`,
  '--window-size=1366,768',
  'about:blank',
];

const chrome = spawn(chromePath, isCI ? ciChromeArgs : localChromeArgs, {
  stdio: isCI ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
});

let chromeStdout = '';
let chromeStderr = '';
let chromeExitCode = null;
let chromeSignal = null;

if (chrome.stdout) {
  chrome.stdout.setEncoding('utf8');
  chrome.stdout.on('data', (chunk) => {
    chromeStdout += chunk;
  });
}

chrome.stderr.setEncoding('utf8');
chrome.stderr.on('data', (chunk) => {
  chromeStderr += chunk;
});

chrome.on('exit', (code, signal) => {
  chromeExitCode = code;
  chromeSignal = signal;
});

chrome.on('error', (error) => {
  chromeStderr += `\n[spawn error] ${error.stack || error.message}`;
});

function chromeDiagnostics() {
  return [
    `exitCode=${chromeExitCode ?? chrome.exitCode ?? 'null'}`,
    `signal=${chromeSignal ?? chrome.signalCode ?? 'null'}`,
    `stdout=${chromeStdout.slice(-4000) || '(vazio)'}`,
    `stderr=${chromeStderr.slice(-4000) || '(vazio)'}`,
  ].join('; ');
}

async function waitForDevToolsEndpoint() {
  const activePortFile = join(chromeUserDataDir, 'DevToolsActivePort');
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (chrome.exitCode !== null || chrome.signalCode !== null || chromeExitCode !== null || chromeSignal !== null) {
      throw new Error(
        `Chrome encerrou antes de publicar o endpoint DevTools. ${chromeDiagnostics()}`,
      );
    }

    if (existsSync(activePortFile)) {
      try {
        const [portLine, browserPath] = readFileSync(activePortFile, 'utf8').trim().split(/\r?\n/);
        const port = Number(portLine);
        if (Number.isInteger(port) && port > 0 && browserPath) {
          return `ws://127.0.0.1:${port}${browserPath}`;
        }
      } catch {
        // O Chrome pode criar o arquivo antes de concluir a gravação; continue o polling.
      }
    }

    await sleep(100);
  }

  throw new Error(
    `Chrome não publicou DevToolsActivePort em até 20s. ${chromeDiagnostics()}`,
  );
}

let cdpInput = null;
let cdpOutput = null;
let cdpSocket = null;

try {
  if (isCI) {
    const endpoint = await waitForDevToolsEndpoint();
    assert.equal(typeof WebSocket, 'function', 'WebSocket global indisponível no Node usado pelo CI.');

    cdpSocket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout ao conectar no endpoint DevTools. ${chromeDiagnostics()}`));
      }, 5000);

      cdpSocket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });

      cdpSocket.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error(`Falha ao conectar no endpoint DevTools. ${chromeDiagnostics()}`));
      }, { once: true });
    });
  } else {
    cdpInput = chrome.stdio[3];
    cdpOutput = chrome.stdio[4];
    assert.ok(cdpInput && cdpOutput, 'Pipes CDP do Chrome não foram criados.');
    cdpOutput.setEncoding('utf8');
  }
} catch (error) {
  if (!chrome.killed) chrome.kill('SIGTERM');
  if (isCI) rmSync(chromeUserDataDir, { recursive: true, force: true });
  throw error;
}

let requestId = 0;
const pending = new Map();
let cdpBuffer = '';
let pageSessionId = null;

function handleCdpMessage(rawMessage) {
  if (!rawMessage) return;

  const payload = JSON.parse(rawMessage);
  if (!payload.id) return;

  const item = pending.get(payload.id);
  if (!item) return;

  pending.delete(payload.id);
  clearTimeout(item.timeout);

  if (payload.error) item.reject(new Error(payload.error.message));
  else item.resolve(payload.result);
}

if (isCI) {
  cdpSocket.addEventListener('message', (event) => {
    handleCdpMessage(String(event.data));
  });
} else {
  cdpOutput.on('data', (chunk) => {
    cdpBuffer += chunk;

    while (true) {
      const separatorIndex = cdpBuffer.indexOf('\0');
      if (separatorIndex < 0) break;

      const rawMessage = cdpBuffer.slice(0, separatorIndex);
      cdpBuffer = cdpBuffer.slice(separatorIndex + 1);
      handleCdpMessage(rawMessage);
    }
  });
}

function writeCdp(payload) {
  if (isCI) {
    assert.equal(cdpSocket?.readyState, WebSocket.OPEN, `Socket CDP indisponível. ${chromeDiagnostics()}`);
    cdpSocket.send(JSON.stringify(payload));
    return;
  }

  cdpInput.write(JSON.stringify(payload) + '\0');
}

function sendCommand(method, params = {}, sessionId = null, timeoutMs = 12000) {
  const id = ++requestId;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(
        new Error(
          `Timeout CDP em ${method}. exitCode=${chrome.exitCode}; stderr=${chromeStderr.slice(-2000)}`,
        ),
      );
    }, timeoutMs);

    pending.set(id, { resolve, reject, timeout });
    writeCdp(payload);
  });
}

const targets = await sendCommand('Target.getTargets');
const pageTarget = targets.targetInfos.find((item) => item.type === 'page');
assert.ok(pageTarget?.targetId, 'Página CDP não encontrada via remote-debugging-pipe.');

const attached = await sendCommand('Target.attachToTarget', {
  targetId: pageTarget.targetId,
  flatten: true,
});
pageSessionId = attached.sessionId;
assert.ok(pageSessionId, 'Sessão CDP da página não foi criada.');

function command(method, params = {}) {
  return sendCommand(method, params, pageSessionId);
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  if (result.exceptionDetails) {
    const message =
      result.exceptionDetails.exception?.description ||
      result.exceptionDetails.text ||
      'Erro desconhecido no Runtime.evaluate';
    throw new Error(`Erro no navegador: ${message}`);
  }

  return result.result.value;
}

async function navigate(url) {
  await command('Page.navigate', { url });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(`(() => ({
      readyState: document.readyState,
      shellReady: Boolean(document.querySelector('.meg-shell')),
    }))()`);

    if (ready?.readyState === 'complete' && ready.shellReady) {
      await evaluate(`(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        return true;
      })()`);
      return;
    }
    await sleep(100);
  }

  throw new Error('A página do Shell não concluiu o carregamento/renderização.');
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
      labelsFit: labels.every((label) => {
        const style = getComputedStyle(label);
        const rect = label.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0) return true;
        return label.scrollWidth <= label.clientWidth + 2;
      }),
      truncatedLabels: labels
        .filter((label) => {
          const style = getComputedStyle(label);
          const rect = label.getBoundingClientRect();
          if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0) return false;
          return label.scrollWidth > label.clientWidth + 2;
        })
        .map((label) => ({
          text: label.textContent?.trim() || '',
          scrollWidth: label.scrollWidth,
          clientWidth: label.clientWidth,
        })),
      itemsFit: items.every((item) => item.scrollWidth <= item.clientWidth + 2),
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
        !periodLabel.textContent.includes('\\n'),
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

    const outsideViewport = visibleRects
      .filter(([, rect]) =>
        rect.left < 0 ||
        rect.top < 0 ||
        rect.right > window.innerWidth ||
        rect.bottom > window.innerHeight
      )
      .map(([name, rect]) => ({
        name,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      }));

    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
      overlaps,
      outsideViewport,
      allInsideViewport: outsideViewport.length === 0,
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
    await sleep(500);
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

    const brand = document.querySelector('.meg-brand');
    const artRectElement = document.querySelector('.sidebar__art');
    const brandRect = brand?.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const artRect = artRectElement?.getBoundingClientRect();
    const dividerTop = footerRect.top + (parseFloat(dividerStyle?.top || '0') || 0);
    const dividerHeight = parseFloat(dividerStyle?.height || '0') || 0;
    const dividerRect = {
      top: dividerTop,
      bottom: dividerTop + dividerHeight,
      height: dividerHeight,
      left: footerRect.left,
      right: footerRect.right,
    };
    const itemRects = items.map((item, index) => {
      const rect = item.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(centerX, centerY);
      return {
        index: index + 1,
        label: item.getAttribute('aria-label') || item.textContent?.trim() || ('item-' + (index + 1)),
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
    const item5 = itemRects[4] || null;
    const overlaps = [];
    if (item5) {
      const overlapY = (name, rect) => {
        if (!rect) return;
        const overlap = Math.min(item5.bottom, rect.bottom) - Math.max(item5.top, rect.top);
        if (overlap > 1) overlaps.push({ name, overlap });
      };
      overlapY('logo', brandRect);
      overlapY('divisor', dividerRect);
      overlapY('rodape', footerRect);
      overlapY('grafismo', artRect);
      if (item5.top < navRect.top - 1) overlaps.push({ name: 'nav-top-clipping', overlap: navRect.top - item5.top });
      if (item5.bottom > navRect.bottom + 1) overlaps.push({ name: 'nav-bottom-clipping', overlap: item5.bottom - navRect.bottom });
    }

    const rectSummary = (rect) => rect ? ({
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    }) : null;

    return {
      missing: false,
      innerHeight: window.innerHeight,
      documentScrollHeight: root.scrollHeight,
      sidebarTop: sidebarRect.top,
      sidebarBottom: sidebarRect.bottom,
      sidebarRect: rectSummary(sidebarRect),
      brandRect: rectSummary(brandRect),
      navTop: navRect.top,
      navBottom: navRect.bottom,
      navRect: rectSummary(navRect),
      navClientHeight: nav.clientHeight,
      navScrollHeight: nav.scrollHeight,
      navOverflowY: getComputedStyle(nav).overflowY,
      needsScroll,
      itemCount: items.length,
      itemRects,
      maxItemHeight,
      lastItemBottom: lastItem.bottom,
      gapToFooter,
      footerTop: footerRect.top,
      footerRect: rectSummary(footerRect),
      dividerRect: rectSummary(dividerRect),
      artRect: rectSummary(artRect),
      item5Overlaps: overlaps,
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
      assert.equal(
        item.fullyInsideNav,
        true,
        `${viewport.width}x${viewport.height} ${state}: item ${index + 1} parcialmente cortado; diagnóstico=${JSON.stringify({
          sidebar: result.sidebarRect,
          logo: result.brandRect,
          nav: result.navRect,
          itens: result.itemRects.map(({ index, label, top, bottom, height }) => ({ index, label, top, bottom, height })),
          divisor: result.dividerRect,
          rodape: result.footerRect,
          grafismo: result.artRect,
          navOverflowY: result.navOverflowY,
          navScrollHeight: result.navScrollHeight,
          navClientHeight: result.navClientHeight,
          item5Overlaps: result.item5Overlaps,
        })}`,
      );
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

    const startsCollapsed = await evaluate(
      `document.querySelector('.meg-shell')?.classList.contains('is-sidebar-collapsed') || false`,
    );
    if (startsCollapsed) {
      await evaluate(`document.querySelector('.meg-sidebar-toggle-topbar')?.click()`);
      await sleep(700);
    }

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
    assert.equal(
      expanded.labelsFit,
      true,
      `${viewport.width}x${viewport.height} expandida: texto do menu truncado ${JSON.stringify(expanded.truncatedLabels)}`,
    );
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
    await sleep(700);

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
      `${viewport.width}x${viewport.height}: controle da topbar saiu da janela ${JSON.stringify(responsive.outsideViewport)}`,
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
  for (const item of pending.values()) {
    clearTimeout(item.timeout);
    item.reject(new Error('Contrato encerrado antes da resposta CDP.'));
  }
  pending.clear();
  if (cdpSocket) cdpSocket.close();
  if (cdpInput) cdpInput.end();
  if (cdpOutput) cdpOutput.destroy();

  if (chrome.exitCode === null && chrome.signalCode === null && !chrome.killed) {
    const chromeStopped = new Promise((resolve) => {
      chrome.once('exit', resolve);
      setTimeout(resolve, 1500);
    });
    chrome.kill('SIGTERM');
    await chromeStopped;
  }

  if (isCI) {
    try {
      rmSync(chromeUserDataDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    } catch (error) {
      console.warn(`Falha não fatal ao limpar user-data-dir do Chrome: ${error.message}`);
    }
  }
}
