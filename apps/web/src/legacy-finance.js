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

export function transactionPeriodDate(item) {
  return String(item?.date || '');
}

export function calculateCreditCardPortfolio(allTransactions, periodTransactions, registeredCards = [], filters = {}) {
  const cardFilter = normalizedFinanceText(filters.card || '');
  const statusFilter = String(filters.status || 'all').toLowerCase();
  const search = normalizedFinanceText(filters.search || '');
  const isPaid = (item) => item.status === 'paid' || normalizedFinanceText(item.situation) === 'PAGO';
  const inactiveMethods = new Set(registeredCards.filter((card) => card.isActive === false).map((card) => normalizedFinanceText(card.paymentMethod)));
  const registeredByMethod = new Map(registeredCards.filter((card) => card.isActive !== false).map((card) => [normalizedFinanceText(card.paymentMethod), card]));
  const usedByMethod = new Map();
  const periodByMethod = new Map();

  allTransactions.forEach((item) => {
    if (!isCreditCardExpense(item)) return;
    const method = String(item.paymentMethod || item.account || 'Cartão não cadastrado').trim();
    const key = normalizedFinanceText(method);
    if (inactiveMethods.has(key)) return;
    if (!registeredByMethod.has(key)) {
      registeredByMethod.set(key, { paymentMethod: method, brand: 'OUTRO', limit: 0, closingDay: 0, dueDay: 0, bestPurchaseDay: 0 });
    }
    if (!isPaid(item)) usedByMethod.set(key, (usedByMethod.get(key) || 0) + transactionValue(item, 'expense'));
  });

  const matchesStatus = (item) => statusFilter === 'all' || (statusFilter === 'paid' ? isPaid(item) : !isPaid(item));
  const items = [];
  periodTransactions.forEach((item) => {
    if (!isCreditCardExpense(item)) return;
    const method = String(item.paymentMethod || item.account || 'Cartão não cadastrado').trim();
    const key = normalizedFinanceText(method);
    if (inactiveMethods.has(key)) return;
    const periodSummary = periodByMethod.get(key) || { total: 0, count: 0 };
    periodSummary.total += transactionValue(item, 'expense');
    periodSummary.count += 1;
    periodByMethod.set(key, periodSummary);
    if (cardFilter && key !== cardFilter) return;
    if (!matchesStatus(item)) return;
    if (search) {
      const searchable = [item.description, item.group, item.category, item.paymentMethod, item.notes];
      if (!searchable.some((value) => normalizedFinanceText(value).includes(search))) return;
    }
    items.push(item);
  });

  const visibleCards = [...registeredByMethod.entries()]
    .filter(([key]) => !cardFilter || key === cardFilter)
    .map(([key, card]) => ({ key, card }));
  const cardSummaries = visibleCards.map(({ key, card }) => {
    const used = usedByMethod.get(key) || 0;
    const periodSummary = periodByMethod.get(key) || { total: 0, count: 0 };
    const limit = Number(card.limit || 0);
    return {
      ...card,
      used,
      available: Math.max(limit - used, 0),
      usagePercent: limit > 0 ? Math.min((used / limit) * 100, 999) : 0,
      periodTotal: periodSummary.total,
      purchaseCount: periodSummary.count,
    };
  });

  let totalLimit = 0;
  let usedLimit = 0;
  cardSummaries.forEach((card) => {
    totalLimit += Number(card.limit || 0);
    usedLimit += card.used;
  });
  let periodTotal = 0;
  let paidTotal = 0;
  const groupTotals = new Map();
  items.forEach((item) => {
    const value = transactionValue(item, 'expense');
    periodTotal += value;
    if (isPaid(item)) paidTotal += value;
    const group = String(item.group || item.category || 'Sem categoria');
    groupTotals.set(group, (groupTotals.get(group) || 0) + value);
  });
  let largestGroupName = '';
  let largestGroupTotal = 0;
  groupTotals.forEach((total, name) => {
    if (total > largestGroupTotal) {
      largestGroupName = name;
      largestGroupTotal = total;
    }
  });

  return {
    cards: cardSummaries,
    items: items.sort((a, b) => b.date.localeCompare(a.date) || String(a.description || '').localeCompare(String(b.description || ''), 'pt-BR')),
    totalLimit,
    usedLimit,
    availableLimit: Math.max(totalLimit - usedLimit, 0),
    usagePercent: totalLimit > 0 ? Math.min((usedLimit / totalLimit) * 100, 999) : 0,
    periodTotal,
    paidTotal,
    pendingTotal: periodTotal - paidTotal,
    largestGroup: { name: largestGroupName, total: largestGroupTotal },
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

export function calculateFinancialSummary(transactions, start = '', end = '', options = {}) {
  const previousMonthEnd = start ? new Date(`${start}T12:00:00`).getTime() - 86400000 : 0;
  const previousMonthEndIso = previousMonthEnd ? new Date(previousMonthEnd).toISOString().slice(0, 10) : '';
  const excludeId = String(options.excludeId || '');
  let openingBalance = 0;
  let income = 0;
  let expense = 0;
  let paidExpense = 0;
  let ticketOpeningBalance = 0;
  let ticketIncome = 0;
  let ticketExpense = 0;

  for (const item of transactions) {
    if (excludeId && item.id === excludeId) continue;
    const competenceDate = transactionPeriodDate(item);
    if (!competenceDate) continue;
    const incomeValue = transactionValue(item, 'income');
    const expenseValue = transactionValue(item, 'expense');
    const benefit = isVerocardTransaction(item);

    if (previousMonthEndIso && competenceDate <= previousMonthEndIso) {
      if (benefit) ticketOpeningBalance += incomeValue - expenseValue;
      else openingBalance += incomeValue - expenseValue;
    }

    if ((start && competenceDate < start) || (end && competenceDate > end)) continue;

    if (benefit) {
      ticketIncome += incomeValue;
      ticketExpense += expenseValue;
      continue;
    }

    income += incomeValue;
    expense += expenseValue;
    if (item.status === 'paid' || normalizedFinanceText(item.situation) === 'PAGO') paidExpense += expenseValue;
  }

  const pendingExpense = expense - paidExpense;
  const ticketAvailableIncome = ticketOpeningBalance + ticketIncome;
  const ticketBalance = ticketAvailableIncome - ticketExpense;
  const operatingResult = income - expense;
  const availableIncome = openingBalance + income;
  const closingBalance = availableIncome - paidExpense;
  const projectedBalance = availableIncome - expense;
  const consolidatedBalance = closingBalance + ticketBalance;
  const consolidatedIncome = availableIncome + ticketAvailableIncome;
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
    ticketOpeningBalance,
    ticketIncome,
    ticketAvailableIncome,
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

export function calculateMonetaryDashboard(transactions, start = '', end = '', precomputedSummary = null) {
  // The dashboard is a reconciliation of the selected period, not a snapshot
  // cut off at today's date. A future-dated item already marked as paid must
  // therefore compose the paid total whenever its date is inside the filter.
  const period = precomputedSummary && typeof precomputedSummary === 'object'
    ? precomputedSummary
    : calculateFinancialSummary(transactions, start, end);
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
  return calculateFinancialSummary(transactions, '', endDate, { excludeId }).closingBalance;
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
