/**
 * MEG Web Evolution — Fonte Única de Dados
 * Etapa 02.
 *
 * Este módulo contém somente estado/dados canônicos para a nova Web.
 * Regras financeiras (saldo, competência, fatura, limite, baixa etc.) pertencem
 * às autoridades documentadas em docs/MEG-WEB-FINANCIAL-AUTHORITY.md.
 */

export const createMegDataSource = (seed = {}) => ({
  version: 1,
  accounts: [...(seed.accounts ?? [])],
  transactions: [...(seed.transactions ?? [])],
  payables: [...(seed.payables ?? [])],
  cards: [...(seed.cards ?? [])],
  installments: [...(seed.installments ?? [])],
  statements: [...(seed.statements ?? [])],
  benefits: [...(seed.benefits ?? [])],
  transfers: [...(seed.transfers ?? [])],
  categories: [...(seed.categories ?? [])],
  classifications: [...(seed.classifications ?? [])],
  paymentMethods: [...(seed.paymentMethods ?? [])],
});

export const megMockData = createMegDataSource();

export function indexMegData(source) {
  const byId = (items) => new Map(items.map((item) => [item.id, item]));
  return {
    accounts: byId(source.accounts),
    transactions: byId(source.transactions),
    payables: byId(source.payables),
    cards: byId(source.cards),
    installments: byId(source.installments),
    statements: byId(source.statements),
    benefits: byId(source.benefits),
    transfers: byId(source.transfers),
    categories: byId(source.categories),
    classifications: byId(source.classifications),
    paymentMethods: byId(source.paymentMethods),
  };
}

export function validateMegDataSource(source) {
  const errors = [];
  const collections = [
    'accounts', 'transactions', 'payables', 'cards', 'installments', 'statements',
    'benefits', 'transfers', 'categories', 'classifications', 'paymentMethods',
  ];

  for (const name of collections) {
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

  for (const item of source.transactions) {
    requireRef('accounts', item.accountId, `transactions/${item.id}`);
    requireRef('categories', item.categoryId, `transactions/${item.id}`);
    requireRef('classifications', item.classificationId, `transactions/${item.id}`);
    requireRef('paymentMethods', item.paymentMethodId, `transactions/${item.id}`);
    requireRef('cards', item.cardId, `transactions/${item.id}`);
  }
  for (const item of source.payables) {
    requireRef('transactions', item.transactionId, `payables/${item.id}`);
  }
  for (const item of source.installments) {
    requireRef('cards', item.cardId, `installments/${item.id}`);
    requireRef('transactions', item.transactionId, `installments/${item.id}`);
    requireRef('statements', item.statementId, `installments/${item.id}`);
  }
  for (const item of source.statements) requireRef('cards', item.cardId, `statements/${item.id}`);
  for (const item of source.benefits) requireRef('accounts', item.accountId, `benefits/${item.id}`);
  for (const item of source.transfers) {
    requireRef('accounts', item.fromAccountId, `transfers/${item.id}`);
    requireRef('accounts', item.toAccountId, `transfers/${item.id}`);
  }

  return { valid: errors.length === 0, errors };
}
