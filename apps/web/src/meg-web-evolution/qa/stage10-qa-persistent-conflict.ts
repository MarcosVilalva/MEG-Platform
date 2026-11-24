/**
 * PT190: marcador de conflito persistente, exclusivo do QA Web isolado.
 * NAO importar no Android/Capacitor ou liberar como writer sem gate completo.
 * Inspecionar SOMENTE depois de confirmar que existe operacao pendente.
 * Ausencia de marcador exige readback canonico, NUNCA autoriza replay.
 * Sem dados financeiros, sem sucesso sintetico, sem limpeza automatica.
 */
import { decideStage10WriteConflict } from './stage10-write-conflict-policy';

export const QA_CONFLICT_MARKER_KEY = 'meg-stage10-qa-pending-conflict-v1';
const PROTOCOL = 'meg-stage10-qa-pending-conflict-v1';

export type QaConflictScope = {
  actorId: string;
  workspaceId: string;
  operationId: string;
  payloadFingerprint: string;
  generation: number;
};
type QaConflictMarker = QaConflictScope & {
  protocol: typeof PROTOCOL;
  code: string;
  recordedAt: string;
};

export type QaConflictInspection =
  | { status: 'blocked'; code: string }
  | { status: 'requires-canonical-readback' };

export type QaMarkerStorage = Pick<Storage, 'getItem' | 'setItem'>;

function validScope(value: unknown): value is QaConflictScope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const s = value as Partial<QaConflictScope>;
  return typeof s.actorId === 'string' && s.actorId.length > 0
    && typeof s.workspaceId === 'string' && s.workspaceId.length > 0
    && typeof s.operationId === 'string' && s.operationId.length > 0
    && typeof s.payloadFingerprint === 'string' && /^[a-f0-9]{64}$/.test(s.payloadFingerprint)
    && typeof s.generation === 'number' && Number.isSafeInteger(s.generation)
    && s.generation >= 0;
}

function markerFrom(raw: string): QaConflictMarker | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const s = value as Partial<QaConflictMarker>;
  if (s.protocol !== PROTOCOL || !validScope(s)) return null;
  const marker = value as QaConflictMarker;
  return typeof marker.code === 'string' && /^[A-Z0-9_]{2,96}$/.test(marker.code)
    && typeof marker.recordedAt === 'string'
    && !Number.isNaN(Date.parse(marker.recordedAt)) ? marker : null;
}

function sameScope(left: QaConflictScope, right: QaConflictScope): boolean {
  return left.actorId === right.actorId && left.workspaceId === right.workspaceId
    && left.operationId === right.operationId
    && left.payloadFingerprint === right.payloadFingerprint
    && left.generation === right.generation;
}

/** Nunca retorna permissao de escrita. Mesmo marcador ausente exige readback. */
export function inspectQaPendingConflict(
  storage: QaMarkerStorage, scope: QaConflictScope,
): QaConflictInspection {
  if (!validScope(scope)) return { status: 'blocked', code: 'QA_CONFLICT_INVALID_SCOPE' };
  let raw: string | null;
  try { raw = storage.getItem(QA_CONFLICT_MARKER_KEY); }
  catch { return { status: 'blocked', code: 'QA_CONFLICT_STORAGE_UNAVAILABLE' }; }
  if (raw === null) return { status: 'requires-canonical-readback' };
  const marker = markerFrom(raw);
  if (!marker) return { status: 'blocked', code: 'QA_CONFLICT_MARKER_CORRUPTED' };
  if (!sameScope(marker, scope)) return { status: 'blocked', code: 'QA_CONFLICT_SCOPE_MISMATCH' };
  return { status: 'blocked', code: marker.code };
}

/**
 * Registra e RELE o marcador antes de bloquear reenvios.
 * Erro de armazenamento impede sucesso e exige resolucao.
 * Nao guarda descricao, valor, conta, payload ou token.
 */
export function persistQaPermanentConflict(
  storage: QaMarkerStorage,
  scope: QaConflictScope,
  status: number,
  response: unknown,
): QaConflictInspection {
  if (!validScope(scope)) throw new Error('QA_CONFLICT_INVALID_SCOPE');
  const decision = decideStage10WriteConflict(status, response);
  if (decision.action !== 'keep-protected-requires-resolution') {
    throw new Error('QA_CONFLICT_NOT_PERMANENT');
  }
  const existing = inspectQaPendingConflict(storage, scope);
  if (existing.status === 'blocked') {
    if (existing.code.startsWith('QA_CONFLICT_')) throw new Error(existing.code);
    return existing;
  }
  const code = /^[A-Z0-9_]{2,96}$/.test(decision.code)
    ? decision.code : 'QA_HTTP_PERMANENT_REJECTION';
  const marker: QaConflictMarker = {
    ...scope, protocol: PROTOCOL, code, recordedAt: new Date().toISOString(),
  };
  try {
    storage.setItem(QA_CONFLICT_MARKER_KEY, JSON.stringify(marker));
  } catch {
    throw new Error('QA_CONFLICT_STORAGE_UNAVAILABLE');
  }
  const verify = inspectQaPendingConflict(storage, scope);
  if (verify.status !== 'blocked' || verify.code !== code) {
    throw new Error('QA_CONFLICT_MARKER_SAVE_UNVERIFIED');
  }
  return verify;
}
