import { useEffect, useState } from 'react';
import {
  getFinancialEvents,
  toLegacyTransaction,
  type ApiFinancialEvent
} from '../services/financial-events';

export function useFinancialEvents() {
  const [events, setEvents] = useState<ReturnType<typeof toLegacyTransaction>[]>([]);
  const [rawEvents, setRawEvents] = useState<ApiFinancialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const data = await getFinancialEvents();

      setRawEvents(data);
      setEvents(data.map(toLegacyTransaction));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return {
    events,
    rawEvents,
    loading,
    error,
    reload: load
  };
}
