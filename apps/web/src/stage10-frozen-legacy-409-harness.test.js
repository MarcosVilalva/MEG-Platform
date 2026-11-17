/**
 * Contrato executável do cliente legado CONGELADO: extrai somente a função
 * ensureOutboxConfirmed do módulo fonte, sem modificar Android/JS produtivo.
 *
 * Intencionalmente demonstra um BLOQUEIO: 409 permanente não é consumido pelo
 * protocolo legado; qualquer payload retryable:false é ignorado, permanecendo
 * a operação protegida na fila para novos replays.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./instant-persistence.js', import.meta.url), 'utf8');
const begin = source.indexOf('async function ensureOutboxConfirmed() {');
const end = source.indexOf('\nasync function ensureStateOutboxConfirmed()', begin);
assert.ok(begin > 0 && end > begin, 'Estrutura legada alterada: rever contrato manualmente.');
const functionCode = source.slice(begin, end);
assert.ok(functionCode.includes('if (response.status === 409) continue;'));

function originalFunction(h) {
  // Reproduz literalmente o corpo da função versionada no repositório,
  // isolado das dependências de DOM e rede, fornecidas por mocks locais.
  return new Function('h', `
    "use strict";
    let outboxReplayRunning = false;
    const {
      awaitDurableProtection, readOutbox, hasTransactionOperations, isCloudSessionReady,
      navigator, ensureOutboxOperationId, readRemoteState, verifyTransactionOperations,
      window, publishCloudConfirmation, clearOutboxIfGeneration, setSyncStatus,
      showPersistenceBlocker, cloudRequest, verifyMutationConfirmation,
      applyTransactionOperations
    } = h;
    ${functionCode}
    return ensureOutboxConfirmed;
  `)(h);
}

async function exercise({ code, online = true }) {
  const persisted = {
    generation: 5,
    operationId: '00000000-0000-4000-a000-000000000999',
    upserts: [{ id: 'archived-id', description: 'Operacao ficticia' }],
    deletes: [],
    activities: [],
  };
  let patchCount = 0;
  let readCount = 0;
  let cleared = 0;
  let hasPending = true;
  let readResponseBodies = 0;
  const h = {
    awaitDurableProtection: async () => undefined,
    readOutbox: () => hasPending ? persisted : { upserts: [], deletes: [], activities: [] },
    hasTransactionOperations: value => value.upserts.length > 0,
    isCloudSessionReady: () => true,
    navigator: { onLine: online },
    ensureOutboxOperationId: x => x,
    readRemoteState: async () => { readCount += 1; return { revision: readCount, state: { transactions: [] } }; },
    verifyTransactionOperations: () => false,
    window: { MEG_CLOUD: { acceptConfirmedState: () => undefined } },
    publishCloudConfirmation: () => undefined,
    clearOutboxIfGeneration: () => { hasPending = false; cleared += 1; return true; },
    setSyncStatus: () => undefined,
    showPersistenceBlocker: () => undefined,
    cloudRequest: async () => {
      patchCount += 1;
      return {
        status: 409,
        ok: false,
        json: async () => { readResponseBodies += 1; return { error: code, retryable: false }; },
      };
    },
    verifyMutationConfirmation: () => false,
    applyTransactionOperations: state => state,
  };
  const attempt = originalFunction(h);
  const first = await attempt();
  const second = await attempt();
  return { first, second, patchCount, readCount, cleared, hasPending, readResponseBodies };
}

const retryable = await exercise({ code: 'STATE_CONFLICT' });
assert.equal(retryable.patchCount, 6);
assert.equal(retryable.cleared, 0);
assert.equal(retryable.hasPending, true);

const permanent = await exercise({ code: 'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE' });
assert.equal(permanent.first, false);
assert.equal(permanent.second, false);
assert.equal(permanent.patchCount, 6, 'Mesmo 409 permanente é reenviado duas vezes, 3 por execução');
assert.equal(permanent.readResponseBodies, 0, 'Cliente legado ignora error/retryable do HTTP 409');
assert.equal(permanent.cleared, 0, 'Operação fica protegida e não é confirmada');
assert.equal(permanent.hasPending, true);

const offline = await exercise({ code: 'STATE_CONFLICT', online: false });
assert.equal(offline.patchCount, 0);
assert.equal(offline.readCount, 0);
assert.equal(offline.cleared, 0);
assert.equal(offline.hasPending, true);

// Mudar 409 para 422 não resolve: o agendador legado reenvia todo erro
// enquanto a operação persistente permanecer no outbox.
const schedulerBegin = source.indexOf('function scheduleOutboxRetry(');
const schedulerEnd = source.indexOf('\nasync function flushImmediateSave()', schedulerBegin);
assert.ok(schedulerBegin > 0 && schedulerEnd > schedulerBegin);
const schedulerCode = source.slice(schedulerBegin, schedulerEnd);
const pendingTimers = [];
let failureNotices = 0;
const retryScheduler = new Function('h', `
  "use strict";
  let outboxRetryTimer = null;
  const {
    readOutbox, hasTransactionOperations, hasStateOutbox, readStateOutbox,
    globalThis, flushImmediateSave, setSyncStatus,
    isCloudSessionReady, notifyPendingFailure, OUTBOX_RETRY_MS
  } = h;
  ${schedulerCode}
  return scheduleOutboxRetry;
`)({
  readOutbox: () => ({ upserts: [{ id: 'qa-protected' }], deletes: [], activities: [] }),
  hasTransactionOperations: x => x.upserts.length > 0,
  hasStateOutbox: () => false,
  readStateOutbox: () => ({}),
  globalThis: {
    setTimeout: (callback, delay) => {
      pendingTimers.push({ callback, delay });
      return pendingTimers.length;
    },
  },
  flushImmediateSave: async () => { throw new Error('HTTP 422 sem alteração'); },
  setSyncStatus: () => undefined,
  isCloudSessionReady: () => true,
  notifyPendingFailure: () => { failureNotices += 1; },
  OUTBOX_RETRY_MS: 2000,
});
retryScheduler();
assert.equal(pendingTimers.length, 1);
for (let n = 0; n < 3; n += 1) {
  const job = pendingTimers.shift();
  assert.ok(job, 'O agendador continua tentando novamente');
  job.callback();
  // Aguarda a reação à Promise rejection do save, sem timers reais.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pendingTimers.length, 1, 'Mesmo após 422, o cliente agendou outra tentativa');
}
assert.equal(failureNotices, 3);
assert.equal(pendingTimers[0].delay, 16000);

// Isto comprova a lacuna, NÃO resolve a issue #699 nem valida aparelho Android.
console.log('MEG_STAGE10_FROZEN_LEGACY_409_REPLAY_CONTRACT_CHARACTERIZED PASS');
