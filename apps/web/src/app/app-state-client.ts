import type { LegacyTransaction } from '@core/finance/events';
import { readSession } from './auth-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export type CloudAppState = {
  state: { transactions: LegacyTransaction[]; [key: string]: unknown };
  revision: number;
  updatedAt?: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}`, ...(init?.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || `HTTP_${response.status}`), { status: response.status });
  return payload as T;
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
