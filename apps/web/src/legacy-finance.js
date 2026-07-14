export function transactionValue(item, type) {
  if (item.type !== type) return 0;
  const explicit = type === 'income' ? item.incomeAmount : item.expenseAmount;
  return Number(explicit ?? item.amount ?? 0) || 0;
}

export function isVerocardTransaction(item) {
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  const payment = normalize(item.paymentMethod || item.account);
  const description = normalize(item.description);
  if (item.type === 'income') return description.includes('VEROCARD');
  if (item.type === 'expense') return payment === 'VEROCARD';
  return false;
}

export function calculateFinancialSummary(transactions, start = '', end = '') {
  const previousMonthEnd = start ? new Date(`${start}T12:00:00`).getTime() - 86400000 : 0;
  const previousMonthEndIso = previousMonthEnd ? new Date(previousMonthEnd).toISOString().slice(0, 10) : '';
  const openingItems = previousMonthEndIso ? transactions.filter((item) => item.date <= previousMonthEndIso) : [];
  const periodItems = transactions.filter((item) => (!start || item.date >= start) && (!end || item.date <= end));
  const sum = (items, type) => items.reduce((total, item) => total + transactionValue(item, type), 0);

  const cashOpeningItems = openingItems.filter((item) => !isVerocardTransaction(item));
  const cashPeriodItems = periodItems.filter((item) => !isVerocardTransaction(item));
  const ticketPeriodItems = periodItems.filter(isVerocardTransaction);

  const openingBalance = sum(cashOpeningItems, 'income') - sum(cashOpeningItems, 'expense');
  const income = sum(cashPeriodItems, 'income');
  const expense = sum(cashPeriodItems, 'expense');
  const paidExpense = sum(cashPeriodItems.filter((item) => item.status === 'paid' || String(item.situation || '').toUpperCase() === 'PAGO'), 'expense');
  const pendingExpense = expense - paidExpense;
  const ticketIncome = sum(ticketPeriodItems, 'income');
  const ticketExpense = sum(ticketPeriodItems, 'expense');
  const ticketBalance = ticketIncome - ticketExpense;
  const availableIncome = openingBalance + income;
  const closingBalance = availableIncome - paidExpense;
  const projectedBalance = availableIncome - expense;
  const consolidatedBalance = closingBalance + ticketBalance;
  const consolidatedIncome = availableIncome + ticketIncome;
  const consolidatedExpense = paidExpense + ticketExpense;

  return {
    income,
    expense,
    openingBalance,
    availableIncome,
    paidExpense,
    pendingExpense,
    closingBalance,
    projectedBalance,
    ticketIncome,
    ticketExpense,
    ticketBalance,
    consolidatedIncome,
    consolidatedExpense,
    consolidatedBalance,
    previousMonthEnd: previousMonthEndIso,
  };
}

export function calculateCurrentMonthHealth(transactions, monthStart, today, monthEnd) {
  const effectiveToday = today < monthStart ? monthStart : today > monthEnd ? monthEnd : today;
  const availableSummary = calculateFinancialSummary(transactions, monthStart, effectiveToday);
  const pendingItems = transactions
    .filter((item) => (
      item.type === 'expense'
      && !isVerocardTransaction(item)
      && item.date >= monthStart
      && item.date <= monthEnd
      && (item.status === 'pending' || String(item.situation || '').toUpperCase() === 'PENDENTE')
    ))
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.description || '').localeCompare(String(b.description || ''), 'pt-BR'));
  const pendingValue = pendingItems.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
  const overdueItems = pendingItems.filter((item) => item.date < today);
  const nextDue = pendingItems.find((item) => item.date >= today) || null;

  return {
    availableToday: availableSummary.closingBalance,
    pendingItems,
    pendingValue,
    projectedClosing: availableSummary.closingBalance - pendingValue,
    overdueItems,
    nextDue,
  };
}
