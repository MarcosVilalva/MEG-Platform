/**
 * Derivações estruturais da fonte única.
 * Não contém regras financeiras. Somente seleção, filtro, agrupamento e soma de
 * valores já produzidos/normalizados pela autoridade financeira.
 */

const cents = (value) => Math.round(Number(value ?? 0) * 100);
const money = (valueInCents) => valueInCents / 100;

export function filterTransactions(source, predicate = () => true) {
  return source.transactions.filter(predicate);
}

export function aggregateSignedAmounts(items, field = 'signedAmount') {
  return money(items.reduce((total, item) => total + cents(item[field]), 0));
}

export function countBy(items, key) {
  const counts = new Map();
  for (const item of items) {
    const value = typeof key === 'function' ? key(item) : item[key];
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export function groupBy(items, key) {
  const groups = new Map();
  for (const item of items) {
    const value = typeof key === 'function' ? key(item) : item[key];
    const group = groups.get(value) ?? [];
    group.push(item);
    groups.set(value, group);
  }
  return groups;
}

export function deriveTransactionView(source, predicate = () => true) {
  const items = filterTransactions(source, predicate);
  return {
    items,
    count: items.length,
    signedTotal: aggregateSignedAmounts(items),
    byStatus: countBy(items, 'status'),
    byCategory: groupBy(items, 'categoryId'),
    byAccount: groupBy(items, 'accountId'),
  };
}
