export const GLOBAL_FINANCIAL_SCHEMA_VERSION = 1;
export const DEFAULT_MONETARY_ACCOUNT_ID = 'account-monetary-main';
export const LEGACY_VEROCARD_ACCOUNT_ID = 'account-benefit-verocard-food';
export const OPENING_BALANCE_TRANSACTION_PREFIX = 'opening-balance:';

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

export function legacyBenefitMatch(item) {
  const modality = normalize(item?.modality);
  const description = normalize(item?.description);
  const payment = normalize(item?.paymentMethod || item?.account);
  if (modality.includes('ALIMENTA')) return true;
  if (item?.type === 'income') return description.includes('VEROCARD');
  if (item?.type === 'expense') return payment.includes('VEROCARD');
  return false;
}

export function isBenefitTransaction(item) {
  if (item?.financialScope === 'benefit') return true;
  if (item?.financialScope === 'monetary') return false;
  if (String(item?.financialAccountId || '').startsWith('account-benefit-')) return true;
  return legacyBenefitMatch(item);
}

function defaultAccounts() {
  return [
    { id: DEFAULT_MONETARY_ACCOUNT_ID, name: 'Conta monetaria principal', type: 'MONETARY', subtype: 'CHECKING', currency: 'BRL', isActive: true, source: 'SYSTEM_DEFAULT' },
    { id: LEGACY_VEROCARD_ACCOUNT_ID, name: 'Verocard Alimentacao', type: 'BENEFIT', subtype: 'FOOD', currency: 'BRL', isActive: true, source: 'LEGACY_VEROCARD' },
  ];
}

export function openingBalanceTransactionId(accountId) {
  return `${OPENING_BALANCE_TRANSACTION_PREFIX}${accountId}`;
}

export function buildOpeningBalanceTransaction(account, date) {
  const balance = Number(account?.openingBalance || 0);
  if (!account?.id || !date || balance === 0) return null;
  const type = balance >= 0 ? 'income' : 'expense';
  const amount = Math.abs(balance);
  return {
    id: openingBalanceTransactionId(account.id),
    date,
    description: `SALDO INICIAL - ${account.name}`,
    type,
    launchType: type === 'income' ? 'RECEITA' : 'DESPESA',
    incomeAmount: type === 'income' ? amount : 0,
    expenseAmount: type === 'expense' ? amount : 0,
    amount,
    expenseClass: type === 'expense' ? 'SALDO INICIAL' : '',
    group: 'SALDO INICIAL',
    category: type === 'income' ? 'Receitas' : 'SALDO INICIAL',
    paymentMethod: account.name,
    account: account.name,
    financialAccountId: account.id,
    financialScope: account.type === 'BENEFIT' ? 'benefit' : 'monetary',
    status: 'paid',
    situation: 'PAGO',
    modality: 'SALDO INICIAL',
    notes: 'Saldo informado na configuracao inicial da conta.',
    systemGenerated: 'OPENING_BALANCE',
  };
}

export function upsertOpeningBalanceTransaction(transactions, account, date) {
  const items = Array.isArray(transactions) ? transactions : [];
  const id = openingBalanceTransactionId(account?.id);
  const next = buildOpeningBalanceTransaction(account, date);
  const existingIndex = items.findIndex((item) => item?.id === id);
  if (!next) return existingIndex >= 0 ? items.filter((_, index) => index !== existingIndex) : items;
  if (existingIndex < 0) return [...items, next];
  return items.map((item, index) => index === existingIndex ? { ...item, ...next, date: item.date || next.date } : item);
}
export function migrateGlobalFinancialState(input) {
  const state = input && typeof input === 'object' ? structuredClone(input) : {};
  const catalogs = state.catalogs && typeof state.catalogs === 'object' ? state.catalogs : {};
  const accountsById = new Map((Array.isArray(catalogs.accounts) ? catalogs.accounts : []).filter((item) => item?.id).map((item) => [item.id, item]));
  defaultAccounts().forEach((account) => { if (!accountsById.has(account.id)) accountsById.set(account.id, account); });
  const transactions = (Array.isArray(state.transactions) ? state.transactions : []).map((item) => {
    if (item?.financialAccountId && item?.financialScope) return item;
    const linkedAccount = accountsById.get(item?.financialAccountId);
    const benefit = linkedAccount ? linkedAccount.type === 'BENEFIT' : legacyBenefitMatch(item);
    return { ...item, financialAccountId: item?.financialAccountId || (benefit ? LEGACY_VEROCARD_ACCOUNT_ID : DEFAULT_MONETARY_ACCOUNT_ID), financialScope: item?.financialScope || (benefit ? 'benefit' : 'monetary') };
  });
  return {
    ...state,
    schemaVersion: Math.max(Number(state.schemaVersion || 0), GLOBAL_FINANCIAL_SCHEMA_VERSION),
    migrations: { ...(state.migrations && typeof state.migrations === 'object' ? state.migrations : {}), globalFinancialFoundation: GLOBAL_FINANCIAL_SCHEMA_VERSION },
    transactions,
    catalogs: { ...catalogs, accounts: [...accountsById.values()] },
  };
}

export function reconcileGlobalFinancialMigration(before, after) {
  const source = Array.isArray(before?.transactions) ? before.transactions : [];
  const migrated = Array.isArray(after?.transactions) ? after.transactions : [];
  const sum = (items, type) => items.reduce((total, item) => total + (item?.type === type ? Number(item?.amount ?? (type === 'income' ? item?.incomeAmount : item?.expenseAmount) ?? 0) || 0 : 0), 0);
  const benefitCount = migrated.filter(isBenefitTransaction).length;
  return {
    valid: source.length === migrated.length && sum(source, 'income') === sum(migrated, 'income') && sum(source, 'expense') === sum(migrated, 'expense'),
    beforeCount: source.length, afterCount: migrated.length,
    incomeBefore: sum(source, 'income'), incomeAfter: sum(migrated, 'income'),
    expenseBefore: sum(source, 'expense'), expenseAfter: sum(migrated, 'expense'),
    benefitCount, monetaryCount: migrated.length - benefitCount,
  };
}
