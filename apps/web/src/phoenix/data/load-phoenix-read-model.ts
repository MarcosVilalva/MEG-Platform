import {
  authenticatedRequest,
  getApiHealth,
  readSession
} from '../../app/auth-client';
import { cardsClient } from '../../app/cards-client';
import { financeClient } from '../../app/finance-client';
import { payablesClient } from '../../app/payables-client';
import type {
  PhoenixNormalizationPreview,
  PhoenixReadModel
} from '../contracts';

/**
 * Bootstrap oficial da fase de leitura da Phoenix V15.
 *
 * Regras:
 * - nenhuma mutação acontece aqui;
 * - totais financeiros vêm dos serviços oficiais do backend;
 * - consultas independentes são iniciadas em paralelo;
 * - a normalização é observada explicitamente para evitar esconder fallback.
 */
export async function loadPhoenixReadModel(month: string): Promise<PhoenixReadModel> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('PHOENIX_INVALID_MONTH');
  }

  const session = readSession();
  if (!session) throw new Error('PHOENIX_UNAUTHORIZED');

  const [
    health,
    normalization,
    summary,
    accounts,
    categories,
    paymentMethods,
    cards,
    payables,
    events
  ] = await Promise.all([
    getApiHealth(),
    authenticatedRequest<PhoenixNormalizationPreview>('/app-state/normalization-preview'),
    financeClient.getSummary(month),
    financeClient.listAccounts(),
    financeClient.listCategories(),
    financeClient.listPaymentMethods(),
    cardsClient.list(month),
    payablesClient.list(month),
    financeClient.listEvents(1, 100, '')
  ]);

  return {
    month,
    loadedAt: new Date().toISOString(),
    user: session.user,
    health,
    normalization,
    summary,
    accounts,
    categories,
    paymentMethods,
    cards,
    payables,
    events,
    sourcePolicy: {
      mode: 'read-only',
      summary: 'finance-domain',
      events: 'finance-domain',
      sharedFallback: 'app-state-normalized-read',
      cards: 'cards-domain-with-legacy-compatibility',
      payables: 'payables-domain'
    }
  };
}
