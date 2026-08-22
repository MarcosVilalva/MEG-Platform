import { isCreditCardExpense, isVerocardTransaction, transactionPeriodDate, transactionValue } from './legacy-finance.js';

const ESSENTIAL_GROUPS = new Set([
  'COMUNICAÇÃO', 'HIGIENE PESSOAL', 'IMÓVEL', 'MAT. ESCOLAR', 'PGTO DE DIVIDAS',
  'SAÚDE', 'SUPERMERCADO', 'TITULOS/PREVIDÊNCIA', 'TRANSPORTE',
].map(normalizeText));

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(Number(value) || 0).replace(/\u00a0/g, ' ');
}

function formatRate(value) {
  return `${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function itemGroup(item) {
  return String(item?.group || item?.category || 'Sem categoria').trim() || 'Sem categoria';
}

function itemExpenseType(item) {
  return String(item?.expenseClass || 'Não classificada').trim() || 'Não classificada';
}

function isPaid(item) {
  return item?.status === 'paid' || normalizeText(item?.situation) === 'PAGO';
}

function isRealizedIncome(item) {
  if (item?.type !== 'income') return false;
  if (isPaid(item)) return true;
  return !item?.status && !item?.situation;
}

function localDateIso(date) {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoDateLabel(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || '');
}

function shiftIsoDate(value, { days = 0, months = 0, firstDay = false } = {}) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, firstDay ? 1 : Number(match[3]), 12);
  if (months) date.setMonth(date.getMonth() + months);
  if (days) date.setDate(date.getDate() + days);
  return localDateIso(date);
}

function monthLabel(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const date = new Date(`${month}-01T12:00:00`);
  const label = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function monthsBetween(start, end) {
  const startMatch = String(start || '').match(/^(\d{4})-(\d{2})/);
  const endMatch = String(end || '').match(/^(\d{4})-(\d{2})/);
  if (!startMatch || !endMatch) return [];
  const cursor = new Date(Number(startMatch[1]), Number(startMatch[2]) - 1, 1, 12);
  const last = new Date(Number(endMatch[1]), Number(endMatch[2]) - 1, 1, 12);
  const months = [];
  while (cursor <= last && months.length < 240) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function aggregateExpenses(items, labelFor) {
  const map = new Map();
  items.forEach((item) => {
    const label = labelFor(item);
    map.set(label, roundMoney((map.get(label) || 0) + transactionValue(item, 'expense')));
  });
  return map;
}

function daysLate(date, referenceDate) {
  if (!date || !referenceDate || date >= referenceDate) return 0;
  return Math.max(0, Math.floor((new Date(`${referenceDate}T12:00:00`) - new Date(`${date}T12:00:00`)) / 86400000));
}

function recommendation(priority, title, action, impact, reason) {
  return { priority, title, action, impact: roundMoney(impact), reason };
}

function generateRecommendations(model) {
  const recommendations = [];
  const { metrics, categories, budgetRows, cardRows } = model;

  if (metrics.averageIncome === 0 && metrics.averageExpense === 0) {
    recommendations.push(recommendation(
      'MANTER', 'Registrar os dados do período',
      'Cadastre receitas recebidas e despesas pagas para que o MEG calcule metas e projeções confiáveis.',
      0,
      'Ainda não existem valores realizados suficientes para uma análise gerencial.',
    ));
  } else if (metrics.monthlyGap > 0) {
    recommendations.push(recommendation(
      'CRÍTICA', 'Atingir a receita mínima saudável',
      `Eleve a receita média em ${formatMoney(metrics.monthlyGap)} ou reduza despesas no mesmo valor.`,
      metrics.monthlyGap,
      `A receita saudável estimada é ${formatMoney(metrics.healthyIncome)} por mês, já considerando poupança de 20%.`,
    ));
  } else {
    recommendations.push(recommendation(
      'MANTER', 'Preservar a margem financeira saudável',
      `Mantenha receita mensal acima de ${formatMoney(metrics.healthyIncome)} e automatize a reserva.`,
      metrics.monthlySurplus,
      'A receita média atual já cobre as despesas realizadas e a meta de poupança.',
    ));
  }

  if (metrics.overdueCount > 0) {
    recommendations.push(recommendation(
      'CRÍTICA', `Regularizar ${metrics.overdueCount} conta(s) vencida(s)`,
      'Priorize compromissos com juros, risco de bloqueio ou impacto no histórico de crédito.',
      metrics.overdueValue,
      `As pendências vencidas somam ${formatMoney(metrics.overdueValue)}.`,
    ));
  }

  if (metrics.next30Value > Math.max(metrics.currentBalance, 0) && metrics.next30Value > 0) {
    recommendations.push(recommendation(
      'ALTA', 'Planejar os próximos 30 dias',
      'Confirme as entradas previstas e reserve os valores dos próximos vencimentos antes de assumir novas compras.',
      metrics.next30Value,
      `Há ${formatMoney(metrics.next30Value)} em compromissos próximos. O relatório não presume receitas futuras.`,
    ));
  }

  if (metrics.emergencyGap > 0 && metrics.averageIncome > 0) {
    recommendations.push(recommendation(
      'ALTA', 'Completar a reserva de emergência',
      `Acumule gradualmente ${formatMoney(metrics.emergencyGap)} para alcançar seis meses das despesas essenciais médias.`,
      metrics.emergencyGap,
      `A meta estimada é ${formatMoney(metrics.emergencyGoal)}.`,
    ));
  }

  const topFlexible = categories.find((item) => !item.essential && item.total > 0);
  if (topFlexible && metrics.expenseRatio > 0.8) {
    const target = Math.min(topFlexible.monthlyAverage * 0.15, Math.max(metrics.averageExpense - metrics.averageIncome * 0.8, 0));
    if (target > 0) recommendations.push(recommendation(
      'MÉDIA', `Revisar ${topFlexible.category}`,
      `Busque reduzir ${formatMoney(target)} por mês, começando pelos itens de menor impacto na qualidade de vida.`,
      target,
      `É o maior grupo flexível, com média mensal de ${formatMoney(topFlexible.monthlyAverage)}.`,
    ));
  }

  const budgetOverrun = budgetRows.find((item) => item.monthlyBudget > 0 && item.variance > 0);
  if (budgetOverrun) recommendations.push(recommendation(
    'MÉDIA', `Revisar a meta de ${budgetOverrun.category}`,
    `Reduza a média mensal em ${formatMoney(budgetOverrun.variance)} ou ajuste conscientemente a meta.`,
    budgetOverrun.variance,
    `A média realizada atingiu ${formatRate(budgetOverrun.utilization * 100)} da meta mensal.`,
  ));

  const stressedCard = cardRows.find((item) => item.limit > 0 && item.usage >= 0.7);
  if (stressedCard) recommendations.push(recommendation(
    stressedCard.usage >= 0.9 ? 'ALTA' : 'MÉDIA', `Reduzir o uso do cartão ${stressedCard.name}`,
    'Evite novas parcelas até que a utilização fique abaixo de 50% do limite.',
    stressedCard.pending,
    `A utilização estimada está em ${formatRate(stressedCard.usage * 100)} do limite.`,
  ));

  const order = { 'CRÍTICA': 0, 'ALTA': 1, 'MÉDIA': 2, 'MANTER': 3 };
  return recommendations.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9)).slice(0, 5);
}

export function buildExecutiveFinancialModel({ state, start, end, generatedAt = new Date(), owner = 'Usuário MEG' }) {
  const transactions = Array.isArray(state?.transactions) ? [...state.transactions] : [];
  const catalogs = state?.catalogs && typeof state.catalogs === 'object' ? state.catalogs : {};
  const budgets = state?.budgets && typeof state.budgets === 'object' ? state.budgets : {};
  const referenceDate = localDateIso(generatedAt);
  const monetary = transactions.filter((item) => !isVerocardTransaction(item));
  const dated = monetary.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(transactionPeriodDate(item)));
  const availableDates = dated.map(transactionPeriodDate).sort();
  const availableStart = start || availableDates[0] || '';
  const availableEnd = end || availableDates.at(-1) || referenceDate;
  const analysisEnd = availableEnd < referenceDate ? availableEnd : referenceDate;
  const trailingStart = shiftIsoDate(analysisEnd, { months: -11, firstDay: true });
  const analysisStart = availableStart && availableStart > trailingStart ? availableStart : trailingStart;
  const futureEnd = availableEnd > referenceDate ? availableEnd : referenceDate;
  const next30End = shiftIsoDate(referenceDate, { days: 30 });

  const periodItems = dated.filter((item) => {
    const date = transactionPeriodDate(item);
    return date >= analysisStart && date <= analysisEnd;
  });
  const realizedIncome = periodItems.filter(isRealizedIncome);
  const realizedExpenses = periodItems.filter((item) => item.type === 'expense' && isPaid(item));
  const realizedItems = [...realizedIncome, ...realizedExpenses]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.description).localeCompare(String(b.description), 'pt-BR'));

  const allPending = dated.filter((item) => item.type === 'expense' && !isPaid(item) && item.date <= futureEnd)
    .map((item) => ({
      ...item,
      value: roundMoney(transactionValue(item, 'expense')),
      daysLate: daysLate(item.date, referenceDate),
      overdue: Boolean(item.date && item.date < referenceDate),
      dueToday: item.date === referenceDate,
      future: item.date > referenceDate,
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || b.value - a.value);
  const overdue = allPending.filter((item) => item.overdue);
  const futureCommitments = allPending.filter((item) => item.future);
  const next30 = allPending.filter((item) => item.date >= referenceDate && item.date <= next30End);

  const months = monthsBetween(analysisStart, analysisEnd);
  const activeMonths = Math.max(months.length, 1);
  const monthly = months.map((month) => {
    const incomes = realizedIncome.filter((item) => item.date.startsWith(month));
    const expenses = realizedExpenses.filter((item) => item.date.startsWith(month));
    const income = roundMoney(incomes.reduce((sum, item) => sum + transactionValue(item, 'income'), 0));
    const expense = roundMoney(expenses.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0));
    return { month, label: monthLabel(month), income, expense, result: roundMoney(income - expense), savingsRate: income > 0 ? (income - expense) / income : 0 };
  });

  const income = roundMoney(realizedIncome.reduce((sum, item) => sum + transactionValue(item, 'income'), 0));
  const expense = roundMoney(realizedExpenses.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0));
  const operatingResult = roundMoney(income - expense);
  const averageIncome = roundMoney(income / activeMonths);
  const averageExpense = roundMoney(expense / activeMonths);

  const categoriesRaw = aggregateExpenses(realizedExpenses, itemGroup);
  const categoryBudgetKeys = new Map(Object.keys(budgets).map((key) => [normalizeText(key), key]));
  const categories = [...categoriesRaw.entries()].map(([category, total]) => {
    const budgetKey = categoryBudgetKeys.get(normalizeText(category));
    const monthlyBudget = Number(budgetKey ? budgets[budgetKey] : 0) || 0;
    const monthlyAverage = roundMoney(total / activeMonths);
    return {
      category, total, share: expense > 0 ? total / expense : 0,
      essential: ESSENTIAL_GROUPS.has(normalizeText(category)), monthlyAverage, monthlyBudget,
      budget: monthlyBudget, variance: roundMoney(monthlyAverage - monthlyBudget),
      utilization: monthlyBudget > 0 ? monthlyAverage / monthlyBudget : 0,
    };
  }).sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'pt-BR'));

  const expenseTypes = [...aggregateExpenses(realizedExpenses, itemExpenseType).entries()]
    .map(([type, total]) => ({ type, total, share: expense > 0 ? total / expense : 0, monthlyAverage: roundMoney(total / activeMonths) }))
    .sort((a, b) => b.total - a.total || a.type.localeCompare(b.type, 'pt-BR'));

  const budgetRows = categories.map((item) => ({ ...item }));
  Object.entries(budgets).forEach(([category, monthlyBudget]) => {
    if (budgetRows.some((item) => normalizeText(item.category) === normalizeText(category))) return;
    const value = Number(monthlyBudget) || 0;
    budgetRows.push({ category, total: 0, share: 0, essential: ESSENTIAL_GROUPS.has(normalizeText(category)), monthlyAverage: 0, monthlyBudget: value, budget: value, variance: -value, utilization: 0 });
  });
  budgetRows.sort((a, b) => b.monthlyAverage - a.monthlyAverage || a.category.localeCompare(b.category, 'pt-BR'));

  const accounts = Array.isArray(catalogs.accounts) ? catalogs.accounts : [];
  const monetaryAccounts = accounts.filter((account) => normalizeText(account.type) !== 'BENEFIT');
  const openingBalance = monetaryAccounts.reduce((sum, account) => sum + (Number(account.openingBalance) || 0), 0);
  const allRealizedIncome = dated.filter((item) => item.date <= referenceDate && isRealizedIncome(item));
  const allPaidExpenses = dated.filter((item) => item.date <= referenceDate && item.type === 'expense' && isPaid(item));
  const currentBalance = roundMoney(openingBalance
    + allRealizedIncome.reduce((sum, item) => sum + transactionValue(item, 'income'), 0)
    - allPaidExpenses.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0));
  const accountRows = monetaryAccounts.map((account) => {
    const linked = dated.filter((item) => item.financialAccountId === account.id && item.date <= referenceDate);
    const balance = (Number(account.openingBalance) || 0)
      + linked.filter(isRealizedIncome).reduce((sum, item) => sum + transactionValue(item, 'income'), 0)
      - linked.filter((item) => item.type === 'expense' && isPaid(item)).reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
    return { name: account.name || 'Conta sem nome', active: account.isActive !== false, balance: roundMoney(balance) };
  }).sort((a, b) => b.balance - a.balance);

  const cards = Array.isArray(catalogs.cards) ? catalogs.cards : [];
  const pendingCardExpenses = allPending.filter(isCreditCardExpense);
  const cardRows = cards.map((card) => {
    const key = normalizeText(card.paymentMethod);
    const pendingValue = pendingCardExpenses.filter((item) => normalizeText(item.paymentMethod || item.account) === key)
      .reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
    const limit = Number(card.limit || 0);
    return { name: card.paymentMethod || card.productName || 'Cartão', limit, pending: roundMoney(pendingValue), available: roundMoney(Math.max(limit - pendingValue, 0)), usage: limit > 0 ? pendingValue / limit : 0, active: card.isActive !== false };
  }).sort((a, b) => b.usage - a.usage);

  const paymentMethods = [...aggregateExpenses(realizedExpenses, (item) => String(item.paymentMethod || item.account || 'Não informado').trim() || 'Não informado').entries()]
    .map(([method, total]) => ({ method, total, share: expense > 0 ? total / expense : 0 }))
    .sort((a, b) => b.total - a.total);

  const futureMonths = monthsBetween(referenceDate.slice(0, 7), shiftIsoDate(referenceDate, { months: 5 }).slice(0, 7));
  const futureMonthly = futureMonths.map((month) => {
    const items = futureCommitments.filter((item) => item.date.startsWith(month));
    return { month, label: monthLabel(month), count: items.length, total: roundMoney(items.reduce((sum, item) => sum + item.value, 0)) };
  });

  const essentialAverage = categories.filter((item) => item.essential).reduce((sum, item) => sum + item.monthlyAverage, 0);
  const savingsCapacity = roundMoney(averageIncome - averageExpense);
  const savingsRate = averageIncome > 0 ? savingsCapacity / averageIncome : 0;
  const savingsGoal = roundMoney(averageIncome * 0.2);
  const expenseRatio = averageIncome > 0 ? averageExpense / averageIncome : 0;
  const essentialRatio = averageIncome > 0 ? essentialAverage / averageIncome : 1;
  const healthyIncome = roundMoney(averageExpense / 0.8);
  const minimumIncome = roundMoney(averageExpense);
  const monthlyGap = roundMoney(Math.max(healthyIncome - averageIncome, 0));
  const monthlySurplus = roundMoney(Math.max(averageIncome - healthyIncome, 0));
  const emergencyGoal = roundMoney(essentialAverage * 6);
  const emergencyGap = roundMoney(Math.max(emergencyGoal - Math.max(currentBalance, 0), 0));
  const overdueValue = roundMoney(overdue.reduce((sum, item) => sum + item.value, 0));
  const futureValue = roundMoney(futureCommitments.reduce((sum, item) => sum + item.value, 0));
  const next30Value = roundMoney(next30.reduce((sum, item) => sum + item.value, 0));
  const savingsScore = clamp(savingsRate / 0.2, 0, 1) * 40;
  const essentialScore = essentialRatio <= 0.5 ? 25 : clamp(1 - ((essentialRatio - 0.5) / 0.35), 0, 1) * 25;
  const balanceScore = currentBalance >= 0 ? 20 : clamp(1 + currentBalance / Math.max(averageIncome, 1), 0, 1) * 20;
  const punctualityScore = overdue.length ? clamp(1 - overdue.length / Math.max(allPending.length, 1), 0, 1) * 15 : 15;
  const hasSufficientData = realizedItems.length > 0 && averageIncome > 0;
  const healthScore = hasSufficientData ? Math.round(clamp(savingsScore + essentialScore + balanceScore + punctualityScore, 0, 100)) : 0;

  const metrics = {
    income, expense, paidExpense: expense, operatingResult, currentBalance,
    transactionCount: realizedItems.length, sourceTransactionCount: monetary.length,
    incomeCount: realizedIncome.length, expenseCount: realizedExpenses.length,
    pendingCount: allPending.length, overdueCount: overdue.length, overdueValue,
    futureCount: futureCommitments.length, futureValue, next30Count: next30.length, next30Value,
    averageIncome, averageExpense, savingsCapacity, savingsRate, savingsGoal,
    expenseRatio, essentialAverage: roundMoney(essentialAverage), essentialRatio,
    minimumIncome, healthyIncome, monthlyGap, monthlySurplus,
    emergencyGoal, currentReserve: roundMoney(Math.max(currentBalance, 0)), emergencyGap,
    hasSufficientData, healthScore,
    healthStatus: !hasSufficientData ? 'SEM DADOS SUFICIENTES' : healthScore >= 80 ? 'SAUDÁVEL' : healthScore >= 60 ? 'EM ATENÇÃO' : 'PRECISA DE REEQUILÍBRIO',
  };

  const model = {
    metadata: {
      owner, generatedAt: generatedAt.toISOString(), referenceDate,
      start: analysisStart, end: analysisEnd, availableStart, availableEnd,
      periodLabel: `Últimos 12 meses realizados, ${isoDateLabel(analysisStart)} a ${isoDateLabel(analysisEnd)}`,
      source: 'MEG Finanças, base autenticada na nuvem', methodologyVersion: '2.0',
    },
    metrics, monthly, categories, expenseTypes, budgetRows, overdue, futureCommitments,
    upcoming: allPending.filter((item) => item.date >= referenceDate).slice(0, 10),
    futureMonthly, accountRows, cardRows, paymentMethods, transactions: realizedItems,
  };
  model.recommendations = generateRecommendations(model);
  return model;
}

export const executiveFinancialReportInternals = { normalizeText, monthLabel, monthsBetween, localDateIso, shiftIsoDate };
