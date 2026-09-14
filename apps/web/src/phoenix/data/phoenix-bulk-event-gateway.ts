import { authenticatedRequest } from '../../app/auth-client';
import { clearPhoenixReadModelCache } from './load-phoenix-read-model';

// Homologado para o preview Phoenix após Production Smoke #318 verde.
// O servidor mantém um segundo gate independente (PHOENIX_BULK_EVENT_WRITE),
// portanto a UI só consegue gravar quando os dois lados estão liberados.
export const PHOENIX_BULK_EVENT_WRITE_ENABLED = true;

export type PhoenixBulkEventChanges = {
  date?: string;
  accountId?: string;
  paymentMethodId?: string;
  categoryId?: string;
};

type BulkUpdateResponse = {
  ids: string[];
  updated: number;
  idempotentReplay?: boolean;
};

type BulkArchiveResponse = {
  ids: string[];
  archived: number;
  idempotentReplay?: boolean;
};

export function newPhoenixBulkOperationId(kind: 'update' | 'archive') {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `phoenix-bulk-${kind}:${random}`;
}

export async function updatePhoenixEventsBulk(input: {
  ids: string[];
  changes: PhoenixBulkEventChanges;
  operationId: string;
}) {
  if (!PHOENIX_BULK_EVENT_WRITE_ENABLED) throw new Error('PHOENIX_BULK_WRITE_DISABLED');
  const result = await authenticatedRequest<BulkUpdateResponse>('/finance/events/bulk/update', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  clearPhoenixReadModelCache();
  return result;
}

export async function archivePhoenixEventsBulk(input: {
  ids: string[];
  operationId: string;
}) {
  if (!PHOENIX_BULK_EVENT_WRITE_ENABLED) throw new Error('PHOENIX_BULK_WRITE_DISABLED');
  const result = await authenticatedRequest<BulkArchiveResponse>('/finance/events/bulk/archive', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  clearPhoenixReadModelCache();
  return result;
}
