import type { LegacyTransaction } from '@core/finance/events';
import { authenticatedRequest } from './auth-client';

export type CloudAppState = {
  state: { transactions: LegacyTransaction[]; [key: string]: unknown };
  revision: number;
  updatedAt?: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return authenticatedRequest<T>(path, init);
}

export async function readCloudState(signal?: AbortSignal): Promise<CloudAppState> {
  const result = await request<CloudAppState>('/app-state', { signal });
  return { ...result, state: { ...result.state, transactions: Array.isArray(result.state?.transactions) ? result.state.transactions : [] } };
}

function restoreFingerprint(transactions: LegacyTransaction[]) {
  return transactions
    .map((item) => [item.id, String(item.date || '').slice(0, 10), item.type, Number(item.amount), item.description].join('|'))
    .sort()
    .join('\n');
}

export async function replaceCloudTransactions(transactions: LegacyTransaction[]) {
  const expectedFingerprint = restoreFingerprint(transactions);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await readCloudState();
    try {
      const result = await request<{ revision: number; updatedAt?: string | null; normalization?: { active?: boolean; reconciled?: boolean } }>('/app-state', {
        method: 'PUT',
        body: JSON.stringify({
          state: { ...current.state, transactions },
          expectedRevision: current.revision,
        }),
      });
      const verified = await readCloudState();
      if (restoreFingerprint(verified.state.transactions) !== expectedFingerprint) {
        throw new Error('RESTORE_VERIFICATION_FAILED');
      }
      return { ...result, state: verified.state, verifiedRevision: verified.revision };
    } catch (error) {
      if ((error as { status?: number }).status === 409 && attempt === 0) continue;
      throw error;
    }
  }
  throw new Error('STATE_CONFLICT');
}

export async function patchCloudTransactions(upserts: LegacyTransaction[], deletes: string[] = []) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await readCloudState();
    try {
      return await request<{ revision: number; confirmation?: unknown }>('/app-state/transactions', {
        method: 'PATCH',
        body: JSON.stringify({ operationId: crypto.randomUUID(), expectedRevision: current.revision, upserts, deletes, activities: [] })
      });
    } catch (error) {
      if ((error as { status?: number }).status !== 409 || attempt === 1) throw error;
    }
  }
  throw new Error('STATE_CONFLICT');
}


export async function patchCloudStateProperties(
  properties: Record<string, unknown>,
  expectedRevision: number,
  operationId = crypto.randomUUID()
) {
  return request<{ revision: number; changed: boolean; updatedAt?: string | null }>('/app-state/properties', {
    method: 'PATCH',
    body: JSON.stringify({ operationId, expectedRevision, properties })
  });
}
