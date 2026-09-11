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

export async function readCloudState(): Promise<CloudAppState> {
  const result = await request<CloudAppState>('/app-state');
  return { ...result, state: { ...result.state, transactions: Array.isArray(result.state?.transactions) ? result.state.transactions : [] } };
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
