import { isBenefitTransaction } from './legacy-financial-accounts.js';

export function transactionValue(item, type) {
  if (item.type !== type) return 0;
  const explicit = type === 'income' ? item.incomeAmount : item.expenseAmount;
  return Number(explicit ?? item.amount ?? 0) || 0;
}

export function isVerocardTransaction(item) {
  return isBenefitTransaction(item);
}

function normalizedFinanceText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

export function isCreditCardExpense(item) {
  const method = normalizedFinanceText(item.paymentMethod || item.account);
  const modality = normalizedFinanceText(item.modality);
  return item.type === 'expense' && (modality.includes('CREDITO') || method.includes('CARTAO') || method.includes('CREDITO'));
}

export function calculateCreditCardPortfolio(allTransactions, periodTransactions, registeredCards = [], filters = {}) {
  const cardFilter = normalizedFinanceText(filters.card || '');
  const statusFilter = String(filters.status || 'all').toLowerCase();
  const search = normalizedFinanceText(filters.search || '');
  const isPaid = (item) => item.status === 'paid' || normalizedFinanceText(item.situation) === 'PAGO';
  const inactiveMethods = new Set(registeredCards.filter((card) => card.isActive === false).map((card) => normalizedFinanceText(card.paymentMethod)));
  const cardExpenses = allTransactions.filter((item) => isCreditCardExpense(item) && !inactiveMethods.has(normalizedFinanceText(item.paymentMethod || item.account)));
  const periodCardExpenses = periodTransactions.filter((item) => isCreditCardExpense(item) && !inactiveMethods.has(normalizedFinanceText(item.paymentMethod || item.account)));
  const registeredByMethod = new Map(registeredCards.filter((card) => card.isActive !== false).map((card) => [normalizedFinanceText(card.paymentMethod), card]));

  cardExpenses.forEach((item) => {
    const method = String(item.paymentMethod || item.account || 'Cartão não cadastrado').trim();
    const key = normalizedFinanceText(method);
    if (!registeredByMethod.has(key)) {
      registeredByMethod.set(key, { paymentMethod: method, brand: 'OUTRO', limit: 0, closingDay: 0, dueDay: 0, bestPurchaseDay: 0 });
    }
  });

  const matchesCard = (item) => !cardFilter || normalizedFinanceText(item.paymentMethod || item.account) === cardFilter;
  const matchesStatus = (item) => statusFilter === 'all' || (statusFilter === 'paid' ? isPaid(item) : !isPaid(item));
  const matchesSearch = (item) => !search || [item.description, item.group, item.category, item.paymentMethod, item.notes].some((value) => normalizedFinanceText(value).includes(search));
  const items = periodCardExpenses.filter((item) => matchesCard(item) && matchesStatus(item) && matchesSearch(item));
  const visibleCards = [...registeredByMethod.values()].filter((card) => !cardFilter || normalizedFinanceText(card.paymentMethod) === cardFilter);

  const cardSummaries = visibleCards.map((card) => {
    const key = normalizedFinanceText(card.paymentMethod);
    const allItems = cardExpenses.filter((item) => normalizedFinanceText(item.paymentMethod || item.account) === key);
    const periodItems = periodCardExpenses.filter((item) => normalizedFinanceText(item.paymentMethod || item.account) === key);
    const used = allItems.filter((item) => !isPaid(item)).reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
    const periodTotal = periodItems.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
    const limit = Number(card.limit || 0);
    return {
      ...card,
      used,
      available: Math.max(limit - used, 0),
      usagePercent: limit > 0 ? Math.min((used / limit) * 100, 999) : 0,
      periodTotal,
      purchaseCount: periodItems.length,
    };
  });

  const totalLimit = cardSummaries.reduce((sum, card) => sum + Number(card.limit || 0), 0);
  const usedLimit = cardSummaries.reduce((sum, card) => sum + card.used, 0);
  const periodTotal = items.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
  const paidTotal = items.filter(isPaid).reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
  const groupTotals = new Map();
  items.forEach((item) => {
    const group = String(item.group || item.category || 'Sem categoria');
    groupTotals.set(group, (groupTotals.get(group) || 0) + transactionValue(item, 'expense'));
  });
  const largestGroup = [...groupTotals.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];

  return {
    cards: cardSummaries,
    items: [...items].sort((a, b) => b.date.localeCompare(a.date) || String(a.description || '').localeCompare(String(b.description || ''), 'pt-BR')),
    totalLimit,
    usedLimit,
    availableLimit: Math.max(totalLimit - usedLimit, 0),
    usagePercent: totalLimit > 0 ? Math.min((usedLimit / totalLimit) * 100, 999) : 0,
    periodTotal,
    paidTotal,
    pendingTotal: periodTotal - paidTotal,
    largestGroup: { name: largestGroup[0], total: largestGroup[1] },
  };
}

export function groupPayableItems(items, { separateStatus = false } = {}) {
  const grouped = new Map();
  items.forEach((item) => {
    const payment = item.paymentMethod || item.account || 'Não informado';
    const isCard = isCreditCardExpense(item);
    const statusKey = separateStatus ? `:${item.status}` : '';
    const key = isCard ? `card:${item.date}:${normalizedFinanceText(payment)}${statusKey}` : `item:${item.id}`;
    if (!grouped.has(key)) grouped.set(key, { date: item.date, payment, isCard, status: item.status, items: [] });
    grouped.get(key).items.push(item);
  });
  return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date) || a.payment.localeCompare(b.payment, 'pt-BR'));
}

export function payableGroupTotal(group) {
  return group.items.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
}

export function payableGroupLabel(group) {
  return group.isCard ? group.payment : group.items[0]?.description || 'Conta';
}

export function summarizeDueDate(items, referenceDate = '') {
  const expenses = items
    .filter((item) => item.type === 'expense')
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.description || '').localeCompare(String(b.description || ''), 'pt-BR'));
  const date = referenceDate || expenses[0]?.date || '';
  if (!date) return null;
  const dateItems = expenses.filter((item) => item.date === date);
  const groups = groupPayableItems(dateItems);
  const labels = groups.map((group) => group.isCard ? `Fatura ${payableGroupLabel(group)}` : payableGroupLabel(group));
  const total = groups.reduce((sum, group) => sum + payableGroupTotal(group), 0);
  return { date, items: dateItems, groups, labels, total, count: groups.length, description: labels.join(', ') };
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
  const operatingResult = income - expense;
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
    operatingResult,
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
  const nextDate = pendingItems.find((item) => item.date >= today)?.date || '';
  const nextDue = nextDate ? summarizeDueDate(pendingItems, nextDate) : null;

  return {
    availableToday: availableSummary.closingBalance,
    pendingItems,
    pendingValue,
    projectedClosing: availableSummary.closingBalance - pendingValue,
    overdueItems,
    nextDue,
  };
}

export function calculateHistoricalProjection(transactions, endDate) {
  const allItems = transactions
    .filter((item) => item.date && (!endDate || item.date <= endDate))
    .sort((a, b) => a.date.localeCompare(b.date));
  const items = allItems.filter((item) => !isVerocardTransaction(item));
  const income = items.reduce((sum, item) => sum + transactionValue(item, 'income'), 0);
  const expenses = items.filter((item) => item.type === 'expense');
  const expense = expenses.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
  const paidExpense = expenses
    .filter((item) => item.status === 'paid' || String(item.situation || '').toUpperCase() === 'PAGO')
    .reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
  const pendingExpense = expense - paidExpense;

  return {
    allItems,
    items,
    income,
    expense,
    paidExpense,
    pendingExpense,
    balance: income - expense,
  };
}

export function calculateMonetaryDashboard(transactions, start = '', end = '') {
  // The dashboard is a reconciliation of the selected period, not a snapshot
  // cut off at today's date. A future-dated item already marked as paid must
  // therefore compose the paid total whenever its date is inside the filter.
  const period = calculateFinancialSummary(transactions, start, end);
  const balanceAfterPending = period.closingBalance - period.pendingExpense;

  return {
    ...period,
    currentIncome: period.income,
    currentPaidExpense: period.paidExpense,
    currentBalance: period.closingBalance,
    balanceAfterPending,
    missingAfterPending: Math.max(-balanceAfterPending, 0),
    surplusAfterPending: Math.max(balanceAfterPending, 0),
    effectiveEnd: end,
  };
}

export function availableMonetaryBalance(transactions, endDate, excludeId = '') {
  const eligible = transactions.filter((item) => item.id !== excludeId);
  return calculateFinancialSummary(eligible, '', endDate).closingBalance;
}

export function calculateBalanceReconciliation(transactions, actualBalance, endDate) {
  const ledgerBalance = availableMonetaryBalance(transactions, endDate);
  const safeActualBalance = Number(actualBalance);
  const difference = Number.isFinite(safeActualBalance) ? safeActualBalance - ledgerBalance : 0;
  return {
    ledgerBalance,
    actualBalance: Number.isFinite(safeActualBalance) ? safeActualBalance : 0,
    difference,
    adjustmentType: difference >= 0 ? 'income' : 'expense',
    adjustmentAmount: Math.abs(difference),
    reconciled: Math.abs(difference) < 0.005,
  };
}
