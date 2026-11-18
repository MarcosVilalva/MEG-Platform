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
import { decideLegacyOutboxRejection, protectedOutboxConflict } from './cloud-outbox-conflict-policy.js';

const source = readFileSync(new URL('./instant-persistence.js', import.meta.url), 'utf8');
const begin = source.indexOf('async function ensureOutboxConfirmed() {');
const end = source.indexOf('\nasync function ensureStateOutboxConfirmed()', begin);
assert.ok(begin > 0 && end > begin, 'Estrutura legada alterada: rever contrato manualmente.');
const functionCode = source.slice(begin, end);
assert.ok(functionCode.includes('decideLegacyOutboxRejection'));

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
      applyTransactionOperations, readOutboxConflict, parkedOutboxMessage,
      decideLegacyOutboxRejection, parkOutboxConflict
    } = h;
    ${functionCode}
    return ensureOutboxConfirmed;
  `)(h);
}

async function exercise({ code, online = true, status = 409, retryable = undefined, emptyPayload = false }) {
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
  let parked = null;
  const operationIdsSeen = [];
  let databaseWrites = 0;
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
    cloudRequest: async (_route, options) => {
      patchCount += 1;
      operationIdsSeen.push(JSON.parse(options.body).operationId);
      // A fixture de conflito rejeita o PATCH antes de executar qualquer DML.
      return {
        status,
        ok: false,
        json: async () => {
          readResponseBodies += 1;
          return emptyPayload ? {} : { error: code, ...(retryable === undefined ? {} : { retryable }) };
        },
      };
    },
    verifyMutationConfirmation: () => false,
    applyTransactionOperations: state => state,
    decideLegacyOutboxRejection,
    readOutboxConflict: () => protectedOutboxConflict(persisted, parked) ? parked : null,
    parkedOutboxMessage: code => 'Bloqueio QA: ' + code,
    parkOutboxConflict: (_pending, code) => { parked = { code, generation: 5 }; },
  };
  const attempt = originalFunction(h);
  const first = await attempt();
  const second = await attempt();
  return { first, second, patchCount, readCount, cleared, hasPending, readResponseBodies,
    parked, operationIdsSeen, originalOperationId: persisted.operationId, databaseWrites };
}

const retryable = await exercise({ code: 'STATE_CONFLICT' });
assert.equal(retryable.patchCount, 6);
assert.equal(retryable.parked, null);
assert.equal(retryable.cleared, 0);
assert.equal(retryable.hasPending, true);

const permanent = await exercise({ code: 'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE' });
assert.equal(permanent.first, false);
assert.equal(permanent.second, false);
assert.equal(permanent.patchCount, 1, '409 permanente nao e reenviado');
assert.equal(permanent.readResponseBodies, 1, 'Cliente examina rejeicao financeira');
assert.equal(permanent.parked.code, 'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE');
assert.equal(permanent.cleared, 0, 'Operação fica protegida e não é confirmada');
assert.equal(permanent.hasPending, true);


assert.equal(new Set(retryable.operationIdsSeen).size, 1, 'Retries transitórios usam a MESMA chave.');
assert.equal(retryable.operationIdsSeen[0], retryable.originalOperationId);
assert.equal(permanent.operationIdsSeen[0], permanent.originalOperationId);
assert.equal(permanent.databaseWrites, 0, '409 financeiro não é commit.');

const unknown = await exercise({ code: 'NORMALIZATION_FUTURE_FINANCIAL_GUARD' });
assert.equal(unknown.patchCount, 1, '409 desconhecido não pode iniciar loop de replay.');
assert.equal(unknown.cleared, 0);
assert.equal(unknown.hasPending, true);
assert.equal(unknown.parked?.code, 'NORMALIZATION_FUTURE_FINANCIAL_GUARD');
assert.deepEqual(unknown.operationIdsSeen, [unknown.originalOperationId]);

const empty409 = await exercise({ code: '', emptyPayload: true });
assert.equal(empty409.patchCount, 1, '409 sem JSON reconhecível falha fechado.');
assert.equal(empty409.parked?.code, 'HTTP_409_UNKNOWN_CONFLICT');
assert.equal(empty409.cleared, 0);

const explicitlyPermanentRevision = await exercise({ code: 'NORMALIZATION_CONCURRENT_EVENT_CHANGE', retryable: false });
assert.equal(explicitlyPermanentRevision.patchCount, 1, 'retryable:false tem precedência.');
assert.equal(explicitlyPermanentRevision.parked?.code, 'NORMALIZATION_CONCURRENT_EVENT_CHANGE');

const invalid409 = await exercise({ code: 'OPERATION_ID_REUSED', retryable: false });
assert.equal(invalid409.patchCount, 1, 'Idempotency key reutilizada com payload diferente é conflito definitivo.');
assert.equal(invalid409.cleared, 0);

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
let schedulerParked = null;
let failureNotices = 0;
const retryScheduler = new Function('h', `
  "use strict";
  let outboxRetryTimer = null;
  const {
    readOutbox, hasTransactionOperations, hasStateOutbox, readStateOutbox,
    globalThis, flushImmediateSave, setSyncStatus,
    isCloudSessionReady, notifyPendingFailure, OUTBOX_RETRY_MS,
    readOutboxConflict
  } = h;
  ${schedulerCode}
  return scheduleOutboxRetry;
`)({
  readOutbox: () => ({ upserts: [{ id: 'qa-protected' }], deletes: [], activities: [] }),
  readOutboxConflict: () => schedulerParked,
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

schedulerParked = { code: 'NORMALIZATION_ARCHIVED_EVENT_REQUIRES_RESTORE' };
pendingTimers.shift().callback();
await new Promise(resolve => setImmediate(resolve));
assert.equal(pendingTimers.length, 0, 'Marcador bloqueia timer pendente');
retryScheduler();
assert.equal(pendingTimers.length, 0, 'Conflito estacionado nao gera novas retentativas');
assert.equal(decideLegacyOutboxRejection(422, { error: 'INVALID_APP_STATE_PATCH' }).action, 'manual-resolution-required');
assert.equal(decideLegacyOutboxRejection(429, {}).action, 'retry-later');

async function lostResponseAfterCommitDoesNotDuplicate() {
  const persisted = {
    generation: 8,
    operationId: '00000000-0000-4000-a000-000000001234',
    upserts: [{ id: 'legacy-qa-postcommit', amount: 15.25, type: 'expense' }],
    deletes: [], activities: [],
  };
  let serverCommittedId = null;
  let eventCount = 0;
  let patchCalls = 0;
  let cleared = 0;
  let pending = true;
  const sentIds = [];
  const h = {
    awaitDurableProtection: async () => undefined,
    readOutbox: () => pending ? persisted : { upserts: [], deletes: [], activities: [] },
    readOutboxConflict: () => null,
    hasTransactionOperations: x => Array.isArray(x.upserts) && x.upserts.length > 0,
    isCloudSessionReady: () => true,
    navigator: { onLine: true },
    ensureOutboxOperationId: x => x,
    readRemoteState: async () => ({
      revision: eventCount ? 11 : 10,
      state: { transactions: serverCommittedId ? persisted.upserts : [] },
    }),
    verifyTransactionOperations: (state, operation) =>
      state.transactions?.some(x => x.id === operation.upserts[0].id) || false,
    window: { MEG_CLOUD: { acceptConfirmedState: () => undefined } },
    publishCloudConfirmation: () => undefined,
    clearOutboxIfGeneration: () => { pending = false; cleared++; return true; },
    setSyncStatus: () => undefined,
    showPersistenceBlocker: () => undefined,
    parkedOutboxMessage: x => x,
    cloudRequest: async (_route, options) => {
      patchCalls++;
      const body = JSON.parse(options.body);
      sentIds.push(body.operationId);
      if (!serverCommittedId) {
        serverCommittedId = 'financial-event-qa-preserved';
        eventCount++;
        throw new Error('LOST_RESPONSE_AFTER_COMMIT');
      }
      throw new Error('UNEXPECTED_DUPLICATE_PATCH');
    },
    verifyMutationConfirmation: () => false,
    applyTransactionOperations: x => x,
    decideLegacyOutboxRejection,
    parkOutboxConflict: () => { throw new Error('UNEXPECTED_PARK'); },
  };
  const attempt = originalFunction(h);
  await assert.rejects(attempt(), /LOST_RESPONSE_AFTER_COMMIT/);
  assert.equal(persisted.operationId, sentIds[0], 'OperationId preservado após perda da resposta.');
  assert.equal(await attempt(), true, 'Releitura encontra resultado já confirmado.');
  assert.equal(patchCalls, 1, 'Reenvio não duplica evento persistido.');
  assert.equal(eventCount, 1);
  assert.equal(cleared, 1);
  assert.equal(pending, false);
}
await lostResponseAfterCommitDoesNotDuplicate();
console.log('MEG_STAGE10_UNKNOWN_409_FAIL_CLOSED_AND_OPERATION_ID=PASS');
console.log('MEG_STAGE10_POST_COMMIT_LOST_RESPONSE_NO_DUPLICATE=PASS');

// Fonte corrigida em QA; nao equivale a homologacao da APK instalada.
console.log('MEG_STAGE10_FROZEN_LEGACY_409_REPLAY_CONTRACT_CHARACTERIZED PASS');
