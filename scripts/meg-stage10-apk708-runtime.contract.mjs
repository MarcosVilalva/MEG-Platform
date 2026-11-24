import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const release = '36c886b9597be95a28eb2add00f073e5f43f6fe0';
const source = (path) => execFileSync('git', ['show', release + ':' + path], { encoding: 'utf8' });
const gatewaySource = source('apps/web/src/phoenix/data/phoenix-write-gateway.ts');
const bridgeSource = source('apps/web/src/phoenix/simple-event-form-bridge.ts');
const historicalAndroidBuild = source('.github/workflows/build-android-apk.yml');
const historicalAndroidSheet = source('apps/web/src/mobile/MegMobileLaunchSheet.tsx');
assert.match(historicalAndroidBuild, /VITE_MOBILE_APP: 'true'/);
assert.match(historicalAndroidSheet, /await runPhoenixSimpleEventWrite[\s\S]+?if \(result.status === 'error'\)[\s\S]+?setStep\('success'\)/);

async function setup(benefit, {
  fixed = false, storage = new Map(), userId = 'qa-user', transportState, storageUnavailable = false,
} = {}) {
  const calls = [];
  const committed = transportState ?? new Map();
  const dispatched = [];
  let failure;
  let drawer;
  const transport = async (payload) => {
    calls.push(payload.operationId);
    const fault = failure;
    failure = undefined;
    if (fault === 'STATE_CONFLICT' || fault === 'INVALID_ACCOUNT') throw new Error(fault);
    if (fault === 'HOLD_RESPONSE') await new Promise((resolve) => setImmediate(resolve));
    const event = committed.get(payload.operationId) ?? {
      id: randomUUID(), operationId: payload.operationId,
      date: payload.date, description: payload.description,
      type: payload.type, status: payload.status, amount: payload.amount,
      accountId: payload.accountId ?? null,
      paymentMethodId: payload.paymentMethodId ?? null,
      categoryId: payload.categoryId ?? null,
    };
    committed.set(payload.operationId, event);
    if (fault === 'NETWORK_RESPONSE_LOST') throw new Error(fault);
    if (fault === 'INCOMPLETE_SUCCESS') return {};
    return event;
  };

  const button = {
    dataset: {}, disabled: false, textContent: 'Salvar lançamento',
    insertAdjacentElement() {},
  };
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
    crypto: { randomUUID, subtle: webcrypto.subtle, getRandomValues: webcrypto.getRandomValues.bind(webcrypto) },
    TextEncoder,
    AbortController,
    navigator: { locks: { request: async (_name, _options, action) => action() } },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        if (storageUnavailable) throw new Error('STORAGE_DENIED');
        storage.set(key, value);
      },
      removeItem: (key) => storage.delete(key),
    },
    Error,
    CustomEvent: class { constructor(type) { this.type = type; } },
    window: {
      performance: { timeOrigin: Date.now() - 600_000 },
      location: { hostname: 'stage10.invalid' },
      dispatchEvent: (event) => dispatched.push(event.type),
      setTimeout: (callback, ms) => setTimeout(callback, ms).unref(),
      clearTimeout: (handle) => clearTimeout(handle),
      confirm: () => true,
    },
    document: {
      readyState: 'loading',
      createElement: () => ({ setAttribute() {}, remove() {} }),
      addEventListener() {},
      querySelector: () => drawer,
    },
  });
  const definitions = {
    '../../app/auth-client': {
      readSession: () => ({ user: { id: userId } }),
      authenticatedRequest: (path, request) => {
        if (path === '/app-state/revision') return Promise.resolve({workspace:{id:'qa-workspace'}});
        assert.equal(path, '/finance/benefit-events');
        return transport(JSON.parse(request.body));
      },
    },
    '../../app/cards-client': { cardsClient: {} },
    '../../app/finance-client': { financeClient: {
      createEvent: transport,
      getHistorySnapshot: async () => ({
        kind:'complete', items:[...committed.values()], total:committed.size,
      }),
      listEvents: async (page, pageSize) => ({
        page, pageSize, total:committed.size,
        items:[...committed.values()].slice((page-1)*pageSize,page*pageSize),
      }),
    } },
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
  // Distintas profundidades relativas do mesmo import em bridge e gateway.
  // Não suprimir importações desconhecidas: qualquer novo contrato requer mock expresso.
  definitions['../app/auth-client'] = definitions['../../app/auth-client'];
  definitions['../app/finance-client'] = definitions['../../app/finance-client'];
  definitions['./load-phoenix-read-model'] = readModel;
  definitions['./data/load-phoenix-read-model'] = readModel;
  // Historico APK708 nao possui guarda IndexedDB Phoenix. A nova dependencia
  // deve permanecer inacessivel nesse contrato. PT211/PT212 validam Android QA.
  const noHistoricalIndexedDb = async () => {
    throw new Error('UNEXPECTED_ANDROID_INDEXEDDB_IN_APK708_CHARACTERIZATION');
  };
  definitions['../../durable-outbox-store.js'] = {
    readDurableOutboxStrict: noHistoricalIndexedDb,
    protectDurableOutbox: noHistoricalIndexedDb,
    deleteDurableOutboxIfOperationId: noHistoricalIndexedDb,
  };
  const activeGatewaySource = fixed
    ? readFileSync('apps/web/src/phoenix/data/phoenix-write-gateway.ts', 'utf8')
    : gatewaySource;
  // Actual Phoenix safety modules; the old harness did not know these imports.
  // Type-only references to FinancialEvent disappear after TS stripping.
  const qaRealModules = {
    './data/phoenix-accepted-create-readback': new SourceTextModule(
      stripTypeScriptTypes(readFileSync('apps/web/src/phoenix/data/phoenix-accepted-create-readback.ts','utf8'), {mode:'transform'}),
      { context },
    ),
    './data/phoenix-create-attempt-journal': new SourceTextModule(
      stripTypeScriptTypes(readFileSync('apps/web/src/phoenix/data/phoenix-create-attempt-journal.ts','utf8'), {mode:'transform'}),
      { context, initializeImportMeta(meta) {
        meta.env = { VITE_STAGE10_ANDROID_CONFIRMATION_QA: 'false' };
      } },
    ),
  };
  const gateway = new SourceTextModule(stripTypeScriptTypes(activeGatewaySource, { mode: 'transform' }), {
    context,
    initializeImportMeta(meta) {
      meta.env = {
        VITE_PHOENIX_SIMPLE_EVENT_WRITE: 'enabled', VITE_PHOENIX_BENEFIT_WRITE: 'enabled',
        VITE_STAGE10_ANDROID_CONFIRMATION_QA: 'true', VITE_API_URL: 'http://127.0.0.1:3333',
      };
    },
  });
  const bridge = new SourceTextModule(
    stripTypeScriptTypes(
      (fixed ? readFileSync('apps/web/src/phoenix/simple-event-form-bridge.ts', 'utf8') : bridgeSource)
        + (fixed ? '\nexport { submit, syncDrawer, retryUnconfirmedPhoenixCreate };'
          : '\nexport { submit, syncDrawer };'),
      { mode: 'transform' },
    ),
    { context, initializeImportMeta(meta) {
      meta.env = { VITE_STAGE10_ANDROID_CONFIRMATION_QA: 'true', VITE_API_URL: 'http://127.0.0.1:3333' };
    } },
  );
  await bridge.link((path) => {
    if (path === './data/phoenix-write-gateway') return gateway;
    if (fixed && Object.hasOwn(qaRealModules, path)) return qaRealModules[path];
    assert.ok(Object.hasOwn(definitions, path), 'Unexpected historical import: ' + path);
    const exports = definitions[path];
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await bridge.evaluate();
  const writeFromNativeSheet = async (fault) => {
    const payload = {
      description: 'Fluxo da tela Android', date: '2026-11-11', amount: 12.35,
      status: 'paid', type: 'expense', accountId: 'qa-account',
      categoryId: 'qa-category', paymentMethodId: 'qa-method',
    };
    failure = fault;
    const writer = gateway.namespace;
    return benefit
      ? writer.runPhoenixBenefitEventWrite(writer.preparePhoenixBenefitEvent(payload), '2026-11')
      : writer.runPhoenixSimpleEventWrite(writer.preparePhoenixSimpleEvent(payload), '2026-11');
  };
  return {
    calls, committed, dispatched, feedback, button, writeFromNativeSheet,
    submit: async (fault) => {
      failure = fault;
      await bridge.namespace.submit(root);
    },
    retry: async () => {
      assert.equal(fixed, true);
      await bridge.namespace.retryUnconfirmedPhoenixCreate(root);
    },
    reopen: () => {
      drawer = null;
      bridge.namespace.syncDrawer();
      drawer = fixed ? root : { ...root };
    },
    detach: () => {
      drawer = null;
      bridge.namespace.syncDrawer();
    },
    waitForWrite: async () => {
      while (calls.length === 0) await new Promise(setImmediate);
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

for (const benefit of [false, true]) {
  const success = await setup(benefit, { fixed: true });
  await success.submit();
  if (success.committed.size !== 1 || success.button.textContent !== 'Fechar lançamento') {
    console.log('STAGE10_QA_HARNESS_DIAG', {
      benefit, button: success.button.textContent,
      feedback: success.feedback.textContent,
      calls: success.calls.length, committed: success.committed.size,
    });
  }
  assert.equal(success.committed.size, 1);
  assert.equal(success.button.textContent, 'Fechar lançamento');
  assert.match(success.feedback.textContent, /Lançamento confirmado pela leitura do histórico financeiro/);

  const storage = new Map();
  const first = await setup(benefit, { fixed: true, storage });
  await first.submit('NETWORK_RESPONSE_LOST');
  assert.equal(first.button.textContent, 'Verificar gravação');
  assert.equal(first.committed.size, 1);
  assert.equal(storage.has('meg.phoenix.create.attempt.v1'), true);
  assert.equal([...storage.keys()].filter(key => key.startsWith('meg.phoenix.create-qa.v1.')).length, 1);
  assert.ok(!JSON.stringify([...storage]).includes('Lançamento fictício'));

  const anotherUser = await setup(benefit, { fixed: true, storage, userId: 'qa-other' });
  await anotherUser.submit();
  assert.equal(anotherUser.calls.length, 0, 'Outro usuário não pode enviar a operação pendente');
  assert.equal(storage.has('meg.phoenix.create.attempt.v1'), true);

  const restarted = await setup(benefit, { fixed: true, storage, transportState: first.committed });
  await restarted.submit();
  assert.equal(restarted.calls.length, 0, 'Verificar gravação não emite POST');
  await restarted.retry(); // consentimento explícito em mock controlado
  assert.equal(first.calls[0], restarted.calls[0]);
  assert.equal(restarted.committed.size, 1);
  assert.equal(restarted.button.textContent, 'Fechar lançamento');
  assert.equal(storage.has('meg.phoenix.create.attempt.v1'), false);
  assert.equal([...storage.keys()].filter(key => key.startsWith('meg.phoenix.create-qa.v1.')).length, 0);

  const conflict = await setup(benefit, { fixed: true });
  await conflict.submit('STATE_CONFLICT');
  assert.equal(conflict.committed.size, 0);
  assert.equal(conflict.button.textContent, 'Verificar gravação');
  conflict.reopen();
  await conflict.submit();
  assert.equal(conflict.calls.length, 1, 'Reabertura não provoca replay automático');
  await conflict.retry();
  assert.equal(conflict.calls[0], conflict.calls[1], 'Retomada mantém a mesma identidade');
  assert.equal(conflict.committed.size, 1);

  const rejectedStorage = new Map();
  const rejected = await setup(benefit, { fixed: true, storage: rejectedStorage });
  await rejected.submit('INVALID_ACCOUNT');
  assert.equal(rejected.committed.size, 0);
  assert.equal(rejected.calls.length, 1);
  assert.equal(rejected.button.textContent, 'Verificar gravação');
  assert.equal(rejectedStorage.has('meg.phoenix.create.attempt.v1'), true,
    'Recusa preserva journal para impedir reenvio com identidade nova');

  const detachedStorage = new Map();
  const detached = await setup(benefit, { fixed: true, storage: detachedStorage });
  const writing = detached.submit('HOLD_RESPONSE');
  await detached.waitForWrite();
  detached.detach();
  await writing;
  assert.equal(detached.committed.size, 1);
  assert.equal(detachedStorage.has('meg.phoenix.create.attempt.v1'), true,
    'Fechar drawer durante escrita não descarta a identidade da tentativa');
  assert.equal([...detachedStorage.keys()].filter(key => key.startsWith('meg.phoenix.create-qa.v1.')).length, 1);

  const native = await setup(benefit, { fixed: true, storage: new Map() });
  const pending = await native.writeFromNativeSheet('INCOMPLETE_SUCCESS');
  assert.equal(pending.code, 'PHOENIX_CREATE_UNCONFIRMED');
  const recovered = await native.writeFromNativeSheet();
  assert.equal(recovered.status, 'accepted');
  assert.equal(pending.operationId, recovered.operationId);
  assert.equal(native.committed.size, 1);

  const unavailable = await setup(benefit, { fixed: true, storageUnavailable: true });
  const blocked = await unavailable.writeFromNativeSheet();
  assert.equal(blocked.code, 'PHOENIX_CREATE_STORAGE_UNAVAILABLE');
  assert.equal(unavailable.calls.length, 0);
}
console.log('MEG_STAGE10_ANDROID_QA_CREATE_CONFIRMATION_AND_RETRY=PASS');
