/**
 * MEG Web Evolution — Fonte Única de Dados
 * Etapa 02.
 *
 * Contém somente estado/dados da nova Web.
 * Regras financeiras permanecem nas autoridades canônicas da API.
 */

const COLLECTIONS = [
  'accounts',
  'transactions',
  'payables',
  'cards',
  'installments',
  'statements',
  'benefits',
  'transfers',
  'categories',
  'classifications',
  'paymentMethods',
];

const emptyReadModels = () => ({
  summary: null,
  cashflow: null,
  analytics: null,
  benefitSummary: null,
});

export const createMegDataSource = (seed = {}) => ({
  version: 2,
  meta: {
    mode: seed.meta?.mode ?? 'mock',
    month: seed.meta?.month ?? null,
    syncToken: seed.meta?.syncToken ?? null,
    changedAt: seed.meta?.changedAt ?? null,
    sources: [...(seed.meta?.sources ?? [])],
  },
  ...Object.fromEntries(COLLECTIONS.map((name) => [name, [...(seed[name] ?? [])]])),
  readModels: {
    ...emptyReadModels(),
    ...(seed.readModels ?? {}),
  },
});

export const megMockData = createMegDataSource();

export function indexMegData(source) {
  const byId = (items = []) => new Map(items.map((item) => [item.id, item]));
  return Object.fromEntries(COLLECTIONS.map((name) => [name, byId(source[name])]));
}

export function mergeMegDataSource(current, patch) {
  const mergedCollections = {};
  for (const name of COLLECTIONS) {
    const merged = new Map((current[name] ?? []).map((item) => [item.id, item]));
    for (const item of patch[name] ?? []) merged.set(item.id, item);
    mergedCollections[name] = [...merged.values()];
  }
  return createMegDataSource({
    ...mergedCollections,
    meta: {
      ...current.meta,
      ...patch.meta,
      sources: [...new Set([...(current.meta?.sources ?? []), ...(patch.meta?.sources ?? [])])],
    },
    readModels: {
      ...(current.readModels ?? {}),
      ...(patch.readModels ?? {}),
    },
  });
}

export function validateMegDataSource(source) {
  const errors = [];

  for (const name of COLLECTIONS) {
    const items = source[name];
    if (!Array.isArray(items)) {
      errors.push(`${name}: coleção ausente`);
      continue;
    }
    const ids = new Set();
    for (const item of items) {
      if (!item?.id) errors.push(`${name}: item sem id`);
      else if (ids.has(item.id)) errors.push(`${name}: id duplicado ${item.id}`);
      else ids.add(item.id);
    }
  }

  const index = indexMegData(source);
  const requireRef = (collection, id, context) => {
    if (id != null && !index[collection].has(id)) errors.push(`${context}: referência inválida ${collection}/${id}`);
  };

  for (const item of source.transactions ?? []) {
    requireRef('accounts', item.accountId, `transactions/${item.id}`);
    requireRef('categories', item.categoryId, `transactions/${item.id}`);
    requireRef('classifications', item.classificationId, `transactions/${item.id}`);
    requireRef('paymentMethods', item.paymentMethodId, `transactions/${item.id}`);
    requireRef('cards', item.cardId, `transactions/${item.id}`);
  }
  for (const item of source.payables ?? []) {
    requireRef('transactions', item.transactionId, `payables/${item.id}`);
    requireRef('categories', item.categoryId, `payables/${item.id}`);
  }
  for (const item of source.installments ?? []) {
    requireRef('cards', item.cardId, `installments/${item.id}`);
    requireRef('transactions', item.transactionId, `installments/${item.id}`);
    requireRef('statements', item.statementId, `installments/${item.id}`);
  }
  for (const item of source.statements ?? []) requireRef('cards', item.cardId, `statements/${item.id}`);
  for (const item of source.benefits ?? []) requireRef('accounts', item.accountId, `benefits/${item.id}`);
  for (const item of source.transfers ?? []) {
    requireRef('accounts', item.fromAccountId, `transfers/${item.id}`);
    requireRef('accounts', item.toAccountId, `transfers/${item.id}`);
  }

  return { valid: errors.length === 0, errors };
}

export const megDataCollections = Object.freeze([...COLLECTIONS]);
