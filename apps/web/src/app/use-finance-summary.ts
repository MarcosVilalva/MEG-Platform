import { useEffect, useState } from 'react';
import { readSession } from './auth-client';
import { financeClient, type FinanceSummary } from './finance-client';

type CacheEntry = { data: FinanceSummary; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<FinanceSummary>>();
const CACHE_TTL_MS = 30_000;

function cacheKey(month: string) {
  return `${readSession()?.user.id || 'anonymous'}:${month}`;
}

async function fetchSummary(month: string) {
  const key = cacheKey(month);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const current = pending.get(key);
  if (current) return current;

  const request = financeClient.getSummary(month)
    .then((data) => {
      cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export function invalidateFinanceSummary() {
  cache.clear();
}

export function useFinanceSummary(month: string) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void fetchSummary(month)
      .then((data) => { if (active) setSummary(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'SUMMARY_ERROR'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month]);

  return { summary, loading, error };
}