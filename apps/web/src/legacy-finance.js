export function transactionValue(item, type) {
  if (item.type !== type) return 0;
  const explicit = type === 'income' ? item.incomeAmount : item.expenseAmount;
  return Number(explicit ?? item.amount ?? 0) || 0;
}

export function calculateFinancialSummary(transactions, start = '', end = '') {
  const openingItems = start ? transactions.filter((item) => item.date < start) : [];
  const periodItems = transactions.filter((item) => (!start || item.date >= start) && (!end || item.date <= end));
  const sum = (items, type) => items.reduce((total, item) => total + transactionValue(item, type), 0);
  const openingBalance = sum(openingItems, 'income') - sum(openingItems, 'expense');
  const income = sum(periodItems, 'income');
  const expense = sum(periodItems, 'expense');
  return {
    income,
    expense,
    openingBalance,
    availableIncome: openingBalance + income,
    closingBalance: openingBalance + income - expense,
  };
}
