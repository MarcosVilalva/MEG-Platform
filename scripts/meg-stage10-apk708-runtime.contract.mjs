import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const release = '36c886b9597be95a28eb2add00f073e5f43f6fe0';
const source = (path) => execFileSync('git', ['show', release + ':' + path], { encoding: 'utf8' });
const gatewaySource = source('apps/web/src/phoenix/data/phoenix-write-gateway.ts');
const bridgeSource = source('apps/web/src/phoenix/simple-event-form-bridge.ts');

async function setup(benefit) {
  const calls = [];
  const committed = new Map();
  const dispatched = [];
  let failure;
  let drawer;
  const transport = async (payload) => {
    calls.push(payload.operationId);
    const fault = failure;
    failure = undefined;
    if (fault === 'STATE_CONFLICT' || fault === 'INVALID_ACCOUNT') throw new Error(fault);
    const event = committed.get(payload.operationId) ?? { id: randomUUID(), date: payload.date };
    committed.set(payload.operationId, event);
    if (fault === 'NETWORK_RESPONSE_LOST') throw new Error(fault);
    return event;
  };

  const button = {};
  const feedback = {};
  const field = (title, element) => ({
    querySelector: (selector) => selector === 'span' ? { textContent: title } : element,
  });
  const option = (value, textContent, accountType) => ({ value, textContent, dataset: { accountType } });
  const select = (item) => ({ value: item.value, options: [item], selectedOptions: [item] });
  const controls = {
    '[data-phoenix-account-select="source"]': select(option('qa-account', benefit ? 'Benefício' : 'Conta QA', benefit ? 'benefit' : 'checking')),
    '[data-phoenix-payment-method-select]': select(option('qa-method', benefit ? 'Verocard' : 'PIX')),
    '[data-phoenix-writer-feedback]': feedback,
    '.px-money-mask': { value: '12,35' },
    '.px-review-launch': button,
  };
  const root = {
    dataset: {},
    querySelector: (selector) => controls[selector] ?? null,
    querySelectorAll: (selector) => selector === 'label.px-field' ? [
      field('Descrição', { value: 'Lançamento fictício' }),
      field('Data do evento', { value: '2026-11-11' }),
      field('Grupo', { value: 'qa-category' }),
    ] : [],
  };
  drawer = root;
  const context = createContext({
    crypto: { randomUUID },
    Error,
    CustomEvent: class { constructor(type) { this.type = type; } },
    window: {
      location: { hostname: 'stage10.invalid' },
      dispatchEvent: (event) => dispatched.push(event.type),
      setTimeout: (callback, ms) => setTimeout(callback, ms).unref(),
    },
    document: {
      readyState: 'loading',
      addEventListener() {},
      querySelector: () => drawer,
    },
  });
  const definitions = {
    '../../app/auth-client': { authenticatedRequest: (path, request) => {
      assert.equal(path, '/finance/benefit-events');
      return transport(JSON.parse(request.body));
    } },
    '../../app/cards-client': { cardsClient: {} },
    '../../app/finance-client': { financeClient: { createEvent: transport } },
    '../app/payables-client': { payablesClient: {} },
    './data/phoenix-transfer-write-gateway': {
      preparePhoenixTransfer() {},
      runPhoenixTransferWrite() {},
    },
    './income-payment-methods': {
      PHOENIX_INCOME_PAYMENT_METHODS: [],
      canonicalPhoenixIncomePaymentMethod() {},
    },
  };
  const readModel = {
    loadPhoenixReadModel: async () => ({ events: { items: [...committed.values()] } }),
    invalidatePhoenixReadModelMonth() {},
    peekPhoenixReadModel() { return null; },
    clearPhoenixReadModelCache() {},
  };
  definitions['./load-phoenix-read-model'] = readModel;
  definitions['./data/load-phoenix-read-model'] = readModel;
  const gateway = new SourceTextModule(stripTypeScriptTypes(gatewaySource, { mode: 'transform' }), {
    context,
    initializeImportMeta(meta) {
      meta.env = { VITE_PHOENIX_SIMPLE_EVENT_WRITE: 'enabled', VITE_PHOENIX_BENEFIT_WRITE: 'enabled' };
    },
  });
  const bridge = new SourceTextModule(
    stripTypeScriptTypes(bridgeSource + '\nexport { submit, syncDrawer };', { mode: 'transform' }),
    { context },
  );
  await bridge.link((path) => {
    if (path === './data/phoenix-write-gateway') return gateway;
    assert.ok(Object.hasOwn(definitions, path), 'Unexpected historical import: ' + path);
    const exports = definitions[path];
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await bridge.evaluate();
  return {
    calls, committed, dispatched, feedback, button, gateway: gateway.namespace,
    submit: async (fault) => {
      failure = fault;
      await bridge.namespace.submit(root);
    },
    reopen: () => {
      drawer = null;
      bridge.namespace.syncDrawer();
      drawer = root;
    },
  };
}

for (const benefit of [false, true]) {
  const success = await setup(benefit);
  await success.submit();
  await new Promise(setImmediate);
  assert.equal(success.committed.size, 1);
  assert.equal(success.feedback.textContent, 'PHOENIX_WRITE_NOT_CONFIRMED');
  assert.equal(success.button.textContent, 'Tentar gravar novamente');
  assert.ok(success.dispatched.includes('meg:phoenix-snapshot-committed'));

  const lost = await setup(benefit);
  await lost.submit('NETWORK_RESPONSE_LOST');
  assert.equal(lost.committed.size, 1);
  assert.equal(lost.button.textContent, 'Tentar gravar novamente');
  await lost.submit();
  assert.equal(lost.calls[0], lost.calls[1], 'Retry in the same drawer retains the key');
  assert.equal(lost.committed.size, 1);

  const reopened = await setup(benefit);
  await reopened.submit('NETWORK_RESPONSE_LOST');
  reopened.reopen();
  await reopened.submit();
  assert.notEqual(reopened.calls[0], reopened.calls[1], 'Drawer teardown loses the key');
  assert.equal(reopened.committed.size, 2, 'Permissive transport illustrates the consequence of changing keys');

  for (const failure of ['STATE_CONFLICT', 'INVALID_ACCOUNT']) {
    const rejected = await setup(benefit);
    await rejected.submit(failure);
    assert.equal(rejected.committed.size, 0);
    assert.equal(rejected.button.textContent, 'Tentar gravar novamente');
  }
}
console.log('MEG_STAGE10_APK708_RUNTIME_FALSE_ERROR_AND_REOPEN_KEY_LOSS=DETECTED');
