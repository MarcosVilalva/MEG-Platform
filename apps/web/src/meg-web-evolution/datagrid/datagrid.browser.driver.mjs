import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function resolveChrome() {
  for (const candidate of [
    process.env.CHROME_BIN,
    process.env.CHROME_PATH,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ].filter(Boolean)) {
    if (candidate.includes('/') || candidate.includes('\\')) {
      if (existsSync(candidate)) return candidate;
      continue;
    }
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0) {
      const path = result.stdout.trim().split(/\r?\n/, 1)[0];
      if (path && existsSync(path)) return path;
    }
  }
  return null;
}

export async function createDataGridBrowser() {
  const chromePath = resolveChrome();
  assert.ok(chromePath, 'Chrome/Chromium não encontrado para o contrato visual do DataGrid.');

  const userDataDir = mkdtempSync(join(tmpdir(), 'meg-datagrid-chrome-'));
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    '--remote-allow-origins=*',
    '--user-data-dir=' + userDataDir,
    '--force-device-scale-factor=1',
    '--window-size=1920,1080',
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let stdout = '';
  let stderr = '';
  chrome.stdout.setEncoding('utf8');
  chrome.stderr.setEncoding('utf8');
  chrome.stdout.on('data', (chunk) => { stdout += chunk; });
  chrome.stderr.on('data', (chunk) => { stderr += chunk; });

  const activePortFile = join(userDataDir, 'DevToolsActivePort');
  const deadline = Date.now() + 20_000;
  let endpoint = null;

  while (Date.now() < deadline) {
    if (chrome.exitCode !== null) {
      throw new Error('Chrome encerrou durante startup. stdout=' + stdout.slice(-2000) + ' stderr=' + stderr.slice(-2000));
    }
    if (existsSync(activePortFile)) {
      try {
        const [portLine, browserPath] = readFileSync(activePortFile, 'utf8').trim().split(/\r?\n/);
        const port = Number(portLine);
        if (port > 0 && browserPath) {
          endpoint = 'ws://127.0.0.1:' + port + browserPath;
          break;
        }
      } catch {
        // O arquivo pode existir antes de a escrita terminar.
      }
    }
    await sleep(100);
  }

  assert.ok(endpoint, 'Chrome não publicou DevToolsActivePort. stderr=' + stderr.slice(-2000));
  assert.equal(typeof WebSocket, 'function', 'WebSocket global indisponível no Node.');

  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout ao conectar no DevTools do Chrome.')), 6000);
    socket.addEventListener('open', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    socket.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error('Falha ao conectar no DevTools. stderr=' + stderr.slice(-2000)));
    }, { once: true });
  });

  let requestId = 0;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const payload = JSON.parse(String(event.data));
    if (!payload.id) return;
    const item = pending.get(payload.id);
    if (!item) return;
    pending.delete(payload.id);
    clearTimeout(item.timeout);
    if (payload.error) item.reject(new Error(payload.error.message));
    else item.resolve(payload.result);
  });

  function send(method, params = {}, sessionId = null) {
    const id = ++requestId;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Timeout CDP em ' + method));
      }, 12_000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify(payload));
    });
  }

  const targets = await send('Target.getTargets');
  const page = targets.targetInfos.find((item) => item.type === 'page');
  assert.ok(page?.targetId, 'Target de página não localizado.');

  const attached = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  const sessionId = attached.sessionId;
  assert.ok(sessionId, 'Sessão CDP não criada.');

  const command = (method, params = {}) => send(method, params, sessionId);

  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      const message = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Erro desconhecido';
      throw new Error('Erro no navegador: ' + message);
    }
    return result.result.value;
  }

  async function setViewport(width, height) {
    await command('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: width,
      screenHeight: height,
    });
  }

  async function navigate(url) {
    await command('Page.navigate', { url });
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const ready = await evaluate("(() => ({ ready: document.readyState, shell: Boolean(document.querySelector('.meg-shell')), grid: Boolean(document.querySelector('[data-datagrid]')) }))()");
      if (ready.ready === 'complete' && ready.shell && ready.grid) {
        await evaluate("(() => { window.scrollTo(0,0); document.documentElement.scrollTop=0; document.body.scrollTop=0; return true; })()");
        return;
      }
      await sleep(100);
    }
    throw new Error('Harness do DataGrid não concluiu o carregamento.');
  }

  async function pressKey(key, code = key) {
    await command('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
    await sleep(80);
  }

  async function close() {
    try { socket.close(); } catch {}
    if (!chrome.killed) chrome.kill('SIGTERM');
    await sleep(80);
    rmSync(userDataDir, { recursive: true, force: true });
  }

  return {
    command,
    evaluate,
    setViewport,
    navigate,
    pressKey,
    sleep,
    close,
    diagnostics: () => ({ stdout: stdout.slice(-2000), stderr: stderr.slice(-2000), exitCode: chrome.exitCode }),
  };
}
