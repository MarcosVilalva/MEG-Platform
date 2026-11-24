import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

assert.equal(process.env.ANDROID_SERIAL, 'emulator-5554');
const pkg = 'br.com.megfinancas.app.stage10qa';
const expectedEmail = 'stage10-ci@example.invalid';
const expectedPassword = 'synthetic-stage10-ci';
const requests = [];
const server = createServer(async (request, response) => {
  const headers = {
    'access-control-allow-origin': 'https://localhost',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'content-type': 'application/json',
  };
  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers).end();
    return;
  }
  if (request.method !== 'POST' || request.url !== '/auth/login') {
    response.writeHead(404, headers).end('{}');
    return;
  }
  let body = '';
  for await (const chunk of request) body += chunk;
  requests.push(JSON.parse(body));
  response.writeHead(401, headers).end('{"error":"INVALID_CREDENTIALS"}');
});

function adb(...args) {
  return execFileSync('adb', args, { encoding: 'utf8', timeout: 10_000 }).trim();
}

async function waitUntil(action, label) {
  for (let i = 0; i < 35; i++) {
    const result = await action();
    if (result) return result;
    await delay(1_000);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

let socket;
let forwardPort;
try {
  server.listen(3333, '127.0.0.1');
  await once(server, 'listening');
  adb('reverse', 'tcp:3333', 'tcp:3333');
  adb('shell', 'am', 'start', '-n', `${pkg}/br.com.megfinancas.app.MainActivity`);
  const pid = await waitUntil(() => adb('shell', 'pidof', pkg, '||', 'true'), 'QA app process');
  const devtools = `webview_devtools_remote_${pid}`;
  forwardPort = adb('forward', 'tcp:0', `localabstract:${devtools}`);
  const target = await waitUntil(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${forwardPort}/json/list`, { signal: AbortSignal.timeout(2_000) });
      return (await response.json()).find((page) => page.url.startsWith('https://localhost/'));
    } catch {
      return null;
    }
  }, 'packaged WebView');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await once(socket, 'open');

  let id = 0;
  async function evaluate(expression) {
    const requestId = ++id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('WebView evaluation timed out')), 5_000);
      function finish(error, value) {
        clearTimeout(timer);
        socket.removeEventListener('message', handle);
        if (error) reject(error);
        else resolve(value);
      }
      function handle({ data }) {
        const payload = JSON.parse(data);
        if (payload.id !== requestId) return;
        if (payload.error || payload.result?.exceptionDetails) {
          finish(new Error('WebView evaluation failed'));
          return;
        }
        finish(null, payload.result.result.value);
      }
      socket.addEventListener('message', handle);
      socket.send(JSON.stringify({
        id: requestId,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true },
      }));
    });
  }

  await waitUntil(() => evaluate("Boolean(document.querySelector('input[autocomplete=current-password]'))"), 'login form');
  assert.deepEqual(await evaluate(`(async () => ({
    platform: window.Capacitor.getPlatform(),
    origin: location.origin,
    digestLength: (await crypto.subtle.digest('SHA-256', new Uint8Array([10]))).byteLength,
  }))()`), { platform: 'android', origin: 'https://localhost', digestLength: 32 });
  await evaluate(`(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const [field, value] of Object.entries({
      username: ${JSON.stringify(expectedEmail)}, 'current-password': ${JSON.stringify(expectedPassword)},
    })) {
      const input = document.querySelector('input[autocomplete=' + field + ']');
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`);
  assert.equal(await evaluate(`(() => {
    const submit = document.querySelector('.px-preview-submit');
    if (!submit || submit.disabled) return false;
    submit.click();
    return true;
  })()`), true);
  await waitUntil(() => evaluate("document.body.innerText.includes('E-mail ou senha não conferem')"), 'synthetic login rejection');
  assert.deepEqual(requests, [{ email: expectedEmail, password: expectedPassword }]);
  console.log('MEG_STAGE10_APK_EMULATOR_WEBVIEW_LOOPBACK_SMOKE_PASS');
} finally {
  socket?.close();
  server.closeAllConnections();
  server.close();
  if (forwardPort) adb('forward', '--remove', `tcp:${forwardPort}`);
  adb('reverse', '--remove', 'tcp:3333');
}
