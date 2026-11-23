import type { FinancialEvent } from '../../app/finance-client';

/**
 * PT113: comprovante de tentativa financeira durável, sem dados financeiros abertos.
 * Apenas nonce, hashes salgados, operationId aleatório e eventId opcional.
 * Uma pendência impede qualquer novo POST com dados diferentes ou outro usuário.
 * Não é um outbox: nunca envia operações e nunca executa retries automáticos.
 */
export const PHOENIX_CREATE_JOURNAL_KEY = 'meg.phoenix.create.attempt.v1';
export const PHOENIX_CREATE_GENERATION_KEY = 'meg.phoenix.create.generation.v1';

type PhoenixConfirmedGeneration = { version: 1; token: string; confirmedAt: number };
let confirmedByThisDocument: string | null = null;

function readConfirmedGeneration(storage: Pick<Storage, 'getItem'>): PhoenixConfirmedGeneration | null {
  let raw: string | null;
  try { raw = storage.getItem(PHOENIX_CREATE_GENERATION_KEY); }
  catch { throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_STORAGE_UNAVAILABLE'); }
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<PhoenixConfirmedGeneration>;
    if (value.version !== 1 || typeof value.token !== 'string'
      || !/^[0-9a-f]{32}$/.test(value.token)
      || !Number.isSafeInteger(value.confirmedAt) || Number(value.confirmedAt) <= 0) throw new Error('invalid');
    return value as PhoenixConfirmedGeneration;
  } catch {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_GENERATION_INVALID');
  }
}
function noteConfirmedGeneration(storage: JournalContext['storage']): string {
  const record: PhoenixConfirmedGeneration = {
    version: 1, token: randomNonce(), confirmedAt: Date.now(),
  };
  try { storage.setItem(PHOENIX_CREATE_GENERATION_KEY, JSON.stringify(record)); }
  catch { throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_STORAGE_UNAVAILABLE'); }
  const stored = readConfirmedGeneration(storage);
  if (JSON.stringify(stored) !== JSON.stringify(record)) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_GENERATION_NOT_DURABLE');
  }
  return record.token;
}
function startedBeforeExternalConfirmation(storage: JournalContext['storage']): boolean {
  const generation = readConfirmedGeneration(storage);
  if (!generation || confirmedByThisDocument === generation.token) return false;
  if (typeof window === 'undefined') return false; // Offline Node tests have no real page.
  const openedAt = window.performance?.timeOrigin;
  // Unrecognized browser page identity fails closed, never invent a safe epoch.
  return typeof openedAt !== 'number' || !Number.isFinite(openedAt) || generation.confirmedAt >= openedAt;
}


/**
 * Exclusão mútua entre abas da mesma origem. localStorage isoladamente não
 * oferece compare-and-swap; ler + escrever sem Web Locks permite duas chaves.
 * Sem suporte ou em origem insegura, o candidato bloqueia novas gravações.
 * Não é uma trava interdispositivo (autoridade final continua sendo a API).
 */
export async function withPhoenixCreateJournalLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_LOCK_UNAVAILABLE');
  }
  return navigator.locks.request('meg.phoenix.create.attempt.v1', { mode: 'exclusive' },
    async () => action());
}


export type PhoenixAttemptKind = 'monetary' | 'benefit';
export type PhoenixCreateJournalRecord = {
  version: 1;
  nonce: string;
  scopeHash: string;
  intentHash: string;
  kind: PhoenixAttemptKind;
  operationId: string;
  eventId?: string;
  receiptHash?: string;
  createdAt: string;
  explicitDuplicate?: true;
};
export type PhoenixCreateJournalResult =
  | { status: 'new' | 'same'; record: PhoenixCreateJournalRecord }
  | { status: 'blocked'; reason: 'DIFFERENT_INTENT' | 'DIFFERENT_SESSION' | 'STALE_TAB' };

export class PhoenixCreateJournalError extends Error {
  constructor(public code: string) { super(code); }
}

// A API define recibos com TTL de 45 dias. A margem de 24 horas aqui evita
// reenvio de operação antiga cujo recibo possa ter sido expurgado no servidor.
export const PHOENIX_CREATE_EXPLICIT_RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
export function canExplicitlyReplayPhoenixCreate(
  record: PhoenixCreateJournalRecord,
  now = Date.now(),
): boolean {
  const original = Date.parse(record.createdAt);
  return Number.isFinite(original) && Number.isFinite(now)
    && now >= original && now - original <= PHOENIX_CREATE_EXPLICIT_RETRY_WINDOW_MS;
}
export type JournalContext = {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  userId: string;
  apiUrl: string;
  workspaceId: string;
};

function readRecord(storage: JournalContext['storage']): PhoenixCreateJournalRecord | null {
  let raw: string | null;
  try { raw = storage.getItem(PHOENIX_CREATE_JOURNAL_KEY); }
  catch { throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_STORAGE_UNAVAILABLE'); }
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<PhoenixCreateJournalRecord>;
    if (value.version !== 1 || !['monetary', 'benefit'].includes(value.kind || '')
      || typeof value.nonce !== 'string' || !/^[0-9a-f]{32}$/.test(value.nonce)
      || typeof value.scopeHash !== 'string' || !/^[0-9a-f]{64}$/.test(value.scopeHash)
      || typeof value.intentHash !== 'string' || !/^[0-9a-f]{64}$/.test(value.intentHash)
      || typeof value.operationId !== 'string' || !/^[a-z0-9-]{6,128}$/i.test(value.operationId)
      || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))
      || (value.explicitDuplicate !== undefined && value.explicitDuplicate !== true)
      || (value.eventId !== undefined && (typeof value.eventId !== 'string' || !value.eventId))
      || (value.receiptHash !== undefined && (typeof value.receiptHash !== 'string' || !/^[0-9a-f]{64}$/.test(value.receiptHash)))
      || Boolean(value.eventId) !== Boolean(value.receiptHash)) {
      throw new Error('invalid');
    }
    return value as PhoenixCreateJournalRecord;
  } catch {
    // Dados inválidos não podem ser removidos em silêncio.
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_INVALID');
  }
}
function writeRecord(storage: JournalContext['storage'], record: PhoenixCreateJournalRecord): void {
  try { storage.setItem(PHOENIX_CREATE_JOURNAL_KEY, JSON.stringify(record)); }
  catch { throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_STORAGE_UNAVAILABLE'); }
  const persisted = readRecord(storage);
  if (!persisted || JSON.stringify(persisted) !== JSON.stringify(record)) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_WRITE_NOT_DURABLE');
  }
}
function randomNonce(): string {
  if (!globalThis.crypto?.getRandomValues) throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_CRYPTO_UNAVAILABLE');
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
async function digest(parts: unknown[]): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_CRYPTO_UNAVAILABLE');
  const data = new TextEncoder().encode(JSON.stringify(parts));
  const hash = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function scopeHash(context: JournalContext, nonce: string): Promise<string> {
  if (!context.userId || !context.apiUrl || !context.workspaceId) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_SCOPE_REQUIRED');
  }
  return digest(['meg-phoenix-scope-v2', nonce, context.userId, context.apiUrl, context.workspaceId]);
}
async function intentHash(kind: PhoenixAttemptKind, payload: unknown, nonce: string): Promise<string> {
  return digest(['meg-phoenix-intent-v1', nonce, kind, payload]);
}
function eventProof(event: FinancialEvent): unknown[] {
  const value = Number(event?.amount);
  const cents = Math.round(value * 100);
  if (!event?.id || typeof event.id !== 'string'
    || typeof event.description !== 'string' || typeof event.date !== 'string'
    || !Number.isFinite(value) || !Number.isSafeInteger(cents)) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_RECEIPT_INVALID');
  }
  return [
    event.id, event.type, event.status, event.date.slice(0, 10),
    event.description, cents, event.accountId ?? null,
    event.categoryId ?? null, event.paymentMethodId ?? null,
  ];
}
export async function phoenixReceiptProof(event: FinancialEvent, nonce: string): Promise<string> {
  return digest(['meg-phoenix-event-proof-v1', nonce, ...eventProof(event)]);
}
export async function reservePhoenixCreate(
  context: JournalContext,
  kind: PhoenixAttemptKind,
  payload: unknown,
  candidateOperationId: string,
): Promise<PhoenixCreateJournalResult> {
  const existing = readRecord(context.storage);
  if (existing) {
    if (await scopeHash(context, existing.nonce) !== existing.scopeHash) {
      return { status: 'blocked', reason: 'DIFFERENT_SESSION' };
    }
    if (kind !== existing.kind || await intentHash(kind, payload, existing.nonce) !== existing.intentHash) {
      return { status: 'blocked', reason: 'DIFFERENT_INTENT' };
    }
    return { status: 'same', record: existing };
  }
  // PT116: uma aba aberta antes da confirmacao de outra nao representa
  // necessariamente uma NOVA intencao. Exigir atualizacao antes de novo POST.
  // Não adiciona nova regra financeira de deduplicação: servidor segue autoridade.
  if (startedBeforeExternalConfirmation(context.storage)) {
    return { status: 'blocked', reason: 'STALE_TAB' };
  }
  if (!/^[a-z0-9-]{6,128}$/i.test(candidateOperationId)) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_OPERATION_ID_INVALID');
  }
  const nonce = randomNonce();
  const record: PhoenixCreateJournalRecord = {
    version: 1, nonce, scopeHash: await scopeHash(context, nonce),
    intentHash: await intentHash(kind, payload, nonce),
    kind, operationId: candidateOperationId,
    createdAt: new Date().toISOString(),
    ...(payload && typeof payload === 'object' && 'allowDuplicate' in payload
      && (payload as { allowDuplicate?: unknown }).allowDuplicate === true
      ? { explicitDuplicate: true as const } : {}),
  };
  writeRecord(context.storage, record);
  return { status: 'new', record };
}
export function findPhoenixCreatePending(storage: JournalContext['storage']): boolean {
  return readRecord(storage) !== null;
}
export function pendingPhoenixCreateRequestsExplicitDuplicate(storage: JournalContext['storage']): boolean {
  return readRecord(storage)?.explicitDuplicate === true;
}
export async function notePhoenixCreateReceipt(
  context: JournalContext,
  record: PhoenixCreateJournalRecord,
  event: FinancialEvent,
): Promise<PhoenixCreateJournalRecord> {
  const existing = readRecord(context.storage);
  if (!existing || existing.operationId !== record.operationId || existing.nonce !== record.nonce
    || await scopeHash(context, record.nonce) !== record.scopeHash) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_ATTEMPT_CHANGED');
  }
  if (existing.eventId && existing.eventId !== event.id) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_EVENT_CHANGED');
  }
  const receiptHash = await phoenixReceiptProof(event, record.nonce);
  if (existing.receiptHash && existing.receiptHash !== receiptHash) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_RECEIPT_CHANGED');
  }
  const next: PhoenixCreateJournalRecord = {
    ...existing, eventId: event.id, receiptHash,
  };
  writeRecord(context.storage, next);
  return next;
}
export async function matchesPhoenixCreateReceipt(
  record: PhoenixCreateJournalRecord,
  event: FinancialEvent,
): Promise<boolean> {
  return Boolean(record.eventId === event.id && record.receiptHash
    && await phoenixReceiptProof(event, record.nonce) === record.receiptHash);
}
/**
 * PT117: somente a resposta HTTP 409 autenticada do writer com o codigo
 * POSSIBLE_DUPLICATE comprova rejeicao SEM commit desta operationId.
 * Uma falha de rede ou excecao local com o mesmo texto nunca libera journal.
 */
export function isDefinitivePhoenixDuplicateRejection(
  result: { status: string; operationId?: string; code?: string; details?: { httpStatus?: number } },
  expectedOperationId: string,
): boolean {
  return result.status === 'error' && result.operationId === expectedOperationId
    && result.code === 'POSSIBLE_DUPLICATE' && result.details?.httpStatus === 409;
}

export async function rejectDefinitivePhoenixDuplicate(
  context: JournalContext,
  record: PhoenixCreateJournalRecord,
): Promise<void> {
  const existing = readRecord(context.storage);
  if (!existing || JSON.stringify(existing) !== JSON.stringify(record)
    || await scopeHash(context, record.nonce) !== record.scopeHash) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_ATTEMPT_CHANGED');
  }
  if (existing.eventId || existing.receiptHash) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_ALREADY_ACKNOWLEDGED');
  }
  try { context.storage.removeItem(PHOENIX_CREATE_JOURNAL_KEY); }
  catch { throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_STORAGE_UNAVAILABLE'); }
  if (readRecord(context.storage) !== null) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_CLEAR_NOT_DURABLE');
  }
}

export async function finishPhoenixCreate(
  context: JournalContext, record: PhoenixCreateJournalRecord,
  verifiedEvent: FinancialEvent,
): Promise<void> {
  const existing = readRecord(context.storage);
  if (!existing || existing.operationId !== record.operationId || existing.nonce !== record.nonce
    || await scopeHash(context, record.nonce) !== record.scopeHash
    || !await matchesPhoenixCreateReceipt(existing, verifiedEvent)) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_CONFIRMATION_MISMATCH');
  }
  // Primeiro publica o marco de confirmacao, depois limpa o recibo.
  // Uma falha entre os dois nao deixa uma janela sem barreira entre abas.
  const nextGeneration = noteConfirmedGeneration(context.storage);
  try { context.storage.removeItem(PHOENIX_CREATE_JOURNAL_KEY); }
  catch { throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_STORAGE_UNAVAILABLE'); }
  if (readRecord(context.storage) !== null) {
    throw new PhoenixCreateJournalError('PHOENIX_JOURNAL_CLEAR_NOT_DURABLE');
  }
  confirmedByThisDocument = nextGeneration;
}
