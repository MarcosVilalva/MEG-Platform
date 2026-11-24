import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const srcRoot = join(root, 'apps', 'web', 'src');
const source = readFileSync(join(srcRoot, 'instant-persistence.js'), 'utf8');
function extract(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'Fonte da implementacao mudou: ' + start);
  return source.slice(a, b);
}
const realSource = [
  extract('function readStateOutboxConflict(', '\nasync function parkStateOutboxConflict('),
  extract('async function initializeDurableOutboxes(', '\nconst durableReadyPromise'),
].join('\n');
const npxRoot = join(homedir(), 'AppData', 'Local', 'npm-cache', '_npx');
const installed = readdirSync(npxRoot, {withFileTypes:true})
  .filter(x=>x.isDirectory())
  .map(x=>join(npxRoot,x.name,'node_modules','puppeteer-core'))
  .find(p=>existsSync(p));
assert.ok(installed, 'Puppeteer existente nao localizado; nao instalar automaticamente');
const require = createRequire(join(dirname(installed), 'meg-stage10-pt203.js'));
const puppeteer = require('puppeteer-core');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
assert.ok(existsSync(chrome), 'Chrome real nao instalado');
const profile = mkdtempSync(join(tmpdir(), 'meg-stage10-pt203-private-'));
const served = new Set([
  'durable-outbox-store.js', 'durable-outbox-core.js',
  'cloud-state-properties-core.js', 'cloud-write-ahead-core.js',
]);
const server = createServer((req,res)=>{
  const filename = String(req.url || '/').slice(1);
  if (req.url === '/') {
    res.writeHead(200,{'Content-Type':'text/html', 'Cache-Control':'no-store'})
      .end('<!doctype html><title>PT203 synthetic storage</title>');
    return;
  }
  if (!served.has(filename)) { res.writeHead(404).end(); return; }
  res.writeHead(200,{'Content-Type':'text/javascript', 'Cache-Control':'no-store'})
    .end(readFileSync(join(srcRoot,filename)));
});
let browser = null;
let success = false;
let restartProven = false;
async function launch() {
  return puppeteer.launch({
    executablePath: chrome, headless: true, userDataDir: profile, timeout: 20000,
    args: ['--no-first-run','--no-default-browser-check','--disable-extensions',
      '--disable-background-networking','--disable-sync'],
  });
}
async function pageAt(url) {
  const page = await browser.newPage();
  await page.goto(url, {waitUntil:'domcontentloaded', timeout:15000});
  return page;
}
try {
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const record = {
    generation: 13, operationId:'00000000-0000-4000-a000-000000000203',
    properties:{ preferences:{ language:'pt-BR' }},
    updatedAt:'2026-11-23T12:00:00.000Z',
  };
  const marker = {
    generation:13, operationId:record.operationId, code:'OPERATION_ID_REUSED',
    detectedAt:'2026-11-23T12:01:00.000Z',
  };
  browser = await launch();
  let page = await pageAt(url);
  const first = await page.evaluate(async (record,marker)=>{
    const store = await import('/durable-outbox-store.js');
    const state = await store.protectDurableOutbox('state-properties',record);
    const conflict = await store.protectDurableOutbox('state-properties-conflict',marker);
    localStorage.setItem('meg-cloud-state-properties-outbox-v1',JSON.stringify(record));
    localStorage.setItem('meg-cloud-state-properties-outbox-conflict-v1',JSON.stringify(marker));
    const durable = await store.readDurableOutbox('state-properties-conflict');
    return {state,conflict, durable};
  }, record, marker);
  assert.equal(first.state.protected,true);
  assert.equal(first.conflict.protected,true);
  assert.equal(first.durable.operationId,record.operationId);
  console.log('PT203_REAL_CHROME_INDEXEDDB_PERSISTED=PASS');
  await browser.close(); browser=null;

  browser = await launch();
  restartProven=true;
  page = await pageAt(url);
  const result = await page.evaluate(async (realSource)=>{
    localStorage.clear(); // perfil privado descartavel, nenhuma sessao real.
    const store = await import('/durable-outbox-store.js');
    const core = await import('/durable-outbox-core.js');
    const readStateOutbox = () => core.normalizeStateOutbox(
      JSON.parse(localStorage.getItem('meg-cloud-state-properties-outbox-v1') || 'null'));
    const data = {
      readDurableOutbox: store.readDurableOutbox,
      protectOutbox: store.protectDurableOutbox,
      reconcileTransactionOutboxes: core.reconcileTransactionOutboxes,
      reconcileStateOutboxes: core.reconcileStateOutboxes,
      readOutbox: () => core.emptyTransactionOutbox(),
      readStateOutbox,
      hasTransactionOperations: value =>
        (value.upserts?.length||0) + (value.deletes?.length||0) + (value.activities?.length||0) > 0,
      hasStateOutbox: (value = readStateOutbox()) =>
        Boolean(value?.properties && Object.keys(value.properties).length),
      localStorage,
      STATE_OUTBOX_KEY: 'meg-cloud-state-properties-outbox-v1',
      OUTBOX_KEY: 'meg-cloud-transaction-outbox-v1',
      STATE_OUTBOX_CONFLICT_KEY: 'meg-cloud-state-properties-outbox-conflict-v1',
      STATE_OUTBOX_CONFLICT_KIND: 'state-properties-conflict',
      parseJson: value => {try{return JSON.parse(value || 'null')}catch{return null}},
      sameValue: (a,b) => JSON.stringify(a)===JSON.stringify(b),
      globalThis: window,
    };
    const deps = Object.keys(data).join(',');
    const compiler = new Function('context',
      'let unpersistedStateOutboxConflict=null;let durableHydrationRunning=true;'
      +'const {' + deps + '}=context;'
      +realSource
      +'return {init:initializeDurableOutboxes,conflict:readStateOutboxConflict};');
    const test = compiler(data);
    const before = {
      localState: localStorage.getItem(data.STATE_OUTBOX_KEY),
      localMarker: localStorage.getItem(data.STATE_OUTBOX_CONFLICT_KEY),
      durableState: await store.readDurableOutbox('state-properties'),
      durableMarker: await store.readDurableOutbox('state-properties-conflict'),
    };
    await test.init();
    const state = readStateOutbox();
    const conflict = test.conflict(state);
    const restored = {
      state: JSON.parse(localStorage.getItem(data.STATE_OUTBOX_KEY)),
      marker: JSON.parse(localStorage.getItem(data.STATE_OUTBOX_CONFLICT_KEY)),
    };
    localStorage.setItem(data.STATE_OUTBOX_CONFLICT_KEY,
      JSON.stringify({ ...restored.marker, operationId:'changed-local-only' }));
    await test.init();
    const divergence = test.conflict(readStateOutbox());
    return {before, state, conflict, restored, divergence};
  }, realSource);
  assert.equal(result.before.localState, null);
  assert.equal(result.before.localMarker, null);
  assert.equal(result.before.durableState.operationId,record.operationId);
  assert.equal(result.before.durableMarker.operationId,record.operationId);
  assert.equal(result.state.operationId,record.operationId);
  assert.equal(result.conflict.code,'OPERATION_ID_REUSED');
  assert.equal(result.restored.marker.operationId,record.operationId);
  assert.equal(result.divergence.code,'STATE_OUTBOX_CONFLICT_STORES_DIVERGED');
  console.log('PT203_REAL_CHROME_PROCESS_RESTART=PASS');
  console.log('PT203_REAL_CHROME_LOCALSTORAGE_LOSS_RECOVERY=PASS');
  console.log('PT203_REAL_SOURCE_HYDRATION_FAIL_CLOSED=PASS');
  console.log('PT203_REAL_CHROME_DIVERGENT_STORES_FAIL_CLOSED=PASS');
  success = true;
} finally {
  try { await browser?.close(); } catch {}
  try { server.closeAllConnections(); } catch {}
  await new Promise(resolve => server.close(resolve));
  rmSync(profile, {recursive:true,force:true});
  assert.equal(existsSync(profile),false,'Perfil Chrome privado deve ser excluido');
  console.log('PT203_PRIVATE_BROWSER_PROFILE_REMOVED=PASS');
  console.log('PT203_LOOPBACK_SERVER_STOPPED=PASS');
}
assert.ok(restartProven && success);
console.log('PT203_REAL_CHROME_INDEXEDDB_GATE=PASS');
