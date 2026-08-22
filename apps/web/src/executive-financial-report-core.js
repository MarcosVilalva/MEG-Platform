import { isCreditCardExpense, isVerocardTransaction, transactionPeriodDate, transactionValue } from './legacy-finance.js';

const ESSENTIAL_GROUPS = new Set([
  'COMUNICAÇÃO', 'HIGIENE PESSOAL', 'IMÓVEL', 'MAT. ESCOLAR', 'PGTO DE DIVIDAS',
  'SAÚDE', 'SUPERMERCADO', 'TITULOS/PREVIDÊNCIA', 'TRANSPORTE',
].map(normalizeText));

const LIFESTYLE_GROUPS = new Set([
  'BEBIDAS', 'ELETRO', 'ELETRO/ELETRONICOS', 'FAST FOOD', 'LAZER', 'PRESENTES', 'VESTUARIO',
].map(normalizeText));

const DEVELOPMENT_GROUPS = new Set([
  'CURSOS', 'EDUCACAO', 'MAT. ESCOLAR',
].map(normalizeText));

const INVESTMENT_GROUPS = new Set([
  'INVESTIMENTOS', 'TITULOS/PREVIDENCIA',
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

function managerialGroup(item) {
  const category = normalizeText(itemGroup(item));
  const expenseClass = normalizeText(itemExpenseType(item));
  if (expenseClass.includes('INVEST') || INVESTMENT_GROUPS.has(category)) return 'INVESTIMENTOS';
  if (expenseClass.includes('DIVIDA') || category === normalizeText('PGTO DE DIVIDAS')) return 'DÍVIDAS';
  if (DEVELOPMENT_GROUPS.has(category)) return 'DESENVOLVIMENTO';
  if (ESSENTIAL_GROUPS.has(category)) return 'ESSENCIAIS';
  if (LIFESTYLE_GROUPS.has(category)) return 'ESTILO DE VIDA';
  return 'OUTROS';
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
      'CRÍTICA', 'Executar o plano híbrido recomendado',
      `Combine aumento de receita de ${formatMoney(metrics.hybridIncomeIncrease)} com redução de despesas de ${formatMoney(metrics.hybridExpenseReduction)} por mês.`,
      metrics.hybridIncomeIncrease + metrics.hybridExpenseReduction,
      `A combinação leva a margem mensal para ${formatRate(metrics.hybridSavingsRate * 100)}, com receita de ${formatMoney(metrics.hybridIncome)} e despesa de ${formatMoney(metrics.hybridExpense)}.`,
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

  const managerialGroups = [...aggregateExpenses(realizedExpenses, managerialGroup).entries()]
    .map(([group, total]) => ({
      group,
      total,
      share: expense > 0 ? total / expense : 0,
      monthlyAverage: roundMoney(total / activeMonths),
    }))
    .sort((a, b) => b.total - a.total || a.group.localeCompare(b.group, 'pt-BR'));

  const budgetRows = categories.map((item) => ({ ...item }));
  Object.entries(budgets).forEach(([category, monthlyBudget]) => {
    if (budgetRows.some((item) => normalizeText(item.category) === normalizeText(category))) return;
    const value = Number(monthlyBudget) || 0;
    budgetRows.push({ category, total: 0, share: 0, essential: ESSENTIAL_GROUPS.has(normalizeText(category)), monthlyAverage: 0, monthlyBudget: value, budget: value, variance: -value, utilization: 0 });
  });
  budgetRows.sort((a, b) => b.monthlyAverage - a.monthlyAverage || a.category.localeCompare(b.category, 'pt-BR'));
  const budgetOpportunities = budgetRows
    .filter((item) => item.monthlyBudget > 0 && item.variance > 0)
    .sort((a, b) => b.variance - a.variance || b.utilization - a.utilization)
    .slice(0, 6);

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
  const actualMarginRate = averageIncome > 0 ? savingsCapacity / averageIncome : 0;
  const healthyExpenseCeiling = roundMoney(averageIncome * 0.8);
  const expenseReductionRequired = roundMoney(Math.max(averageExpense - healthyExpenseCeiling, 0));
  const incomeIncreaseRequired = monthlyGap;
  const rawHybridIncomeIncrease = incomeIncreaseRequired / 2;
  const hybridIncomeIncrease = roundMoney(incomeIncreaseRequired > 200
    ? Math.round(rawHybridIncomeIncrease / 100) * 100
    : rawHybridIncomeIncrease);
  const hybridExpenseReduction = roundMoney(Math.max(
    averageExpense - 0.8 * (averageIncome + hybridIncomeIncrease),
    0,
  ));
  const hybridIncome = roundMoney(averageIncome + hybridIncomeIncrease);
  const hybridExpense = roundMoney(Math.max(averageExpense - hybridExpenseReduction, 0));
  const hybridSavings = roundMoney(hybridIncome - hybridExpense);
  const hybridSavingsRate = hybridIncome > 0 ? hybridSavings / hybridIncome : 0;
  const emergencyGoal = roundMoney(essentialAverage * 6);
  const emergencyGap = roundMoney(Math.max(emergencyGoal - Math.max(currentBalance, 0), 0));
  const overdueValue = roundMoney(overdue.reduce((sum, item) => sum + item.value, 0));
  const futureValue = roundMoney(futureCommitments.reduce((sum, item) => sum + item.value, 0));
  const next30Value = roundMoney(next30.reduce((sum, item) => sum + item.value, 0));
  const cashCoverage30 = next30Value > 0 ? Math.max(currentBalance, 0) / next30Value : 1;
  const unfunded30 = roundMoney(Math.max(next30Value - Math.max(currentBalance, 0), 0));
  const afterAverageIncome30 = roundMoney(currentBalance + averageIncome - next30Value);
  const otherExpenseAverage = roundMoney(Math.max(averageExpense - essentialAverage, 0));
  const savingsScore = clamp(savingsRate / 0.2, 0, 1) * 40;
  const essentialScore = essentialRatio <= 0.5 ? 25 : clamp(1 - ((essentialRatio - 0.5) / 0.35), 0, 1) * 25;
  const balanceScore = currentBalance >= 0 ? 20 : clamp(1 + currentBalance / Math.max(averageIncome, 1), 0, 1) * 20;
  const punctualityScore = overdue.length ? clamp(1 - overdue.length / Math.max(allPending.length, 1), 0, 1) * 15 : 15;
  const hasSufficientData = realizedItems.length > 0 && averageIncome > 0;
  const scoreComponents = [
    { label: 'Poupança', score: hasSufficientData ? Math.round(savingsScore) : 0, max: 40 },
    { label: 'Essenciais', score: hasSufficientData ? Math.round(essentialScore) : 0, max: 25 },
    { label: 'Saldo', score: hasSufficientData ? Math.round(balanceScore) : 0, max: 20 },
    { label: 'Pontualidade', score: hasSufficientData ? Math.round(punctualityScore) : 0, max: 15 },
  ];
  const healthScore = hasSufficientData
    ? Math.round(clamp(scoreComponents.reduce((sum, item) => sum + item.score, 0), 0, 100))
    : 0;

  const metrics = {
    income, expense, paidExpense: expense, operatingResult, currentBalance,
    transactionCount: realizedItems.length, sourceTransactionCount: monetary.length,
    incomeCount: realizedIncome.length, expenseCount: realizedExpenses.length,
    pendingCount: allPending.length, overdueCount: overdue.length, overdueValue,
    futureCount: futureCommitments.length, futureValue, next30Count: next30.length, next30Value,
    averageIncome, averageExpense, savingsCapacity, savingsRate, savingsGoal,
    expenseRatio, essentialAverage: roundMoney(essentialAverage), essentialRatio,
    otherExpenseAverage, actualMarginRate, healthyExpenseCeiling,
    minimumIncome, healthyIncome, monthlyGap, monthlySurplus,
    incomeIncreaseRequired, expenseReductionRequired,
    hybridIncomeIncrease, hybridExpenseReduction, hybridIncome, hybridExpense,
    hybridSavings, hybridSavingsRate,
    emergencyGoal, currentReserve: roundMoney(Math.max(currentBalance, 0)), emergencyGap,
    cashCoverage30, unfunded30, afterAverageIncome30,
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
    metrics, monthly, categories, expenseTypes, managerialGroups, scoreComponents,
    budgetRows, budgetOpportunities, overdue, futureCommitments,
    upcoming: allPending.filter((item) => item.date >= referenceDate).slice(0, 10),
    futureMonthly, accountRows, cardRows, paymentMethods, transactions: realizedItems,
  };
  model.recommendations = generateRecommendations(model);
  return model;
}

export function buildMonthlyExpenseModel({ state, start, end, generatedAt = new Date(), owner = 'Usuário MEG' }) {
  const transactions = Array.isArray(state?.transactions) ? [...state.transactions] : [];
  const catalogs = state?.catalogs && typeof state.catalogs === 'object' ? state.catalogs : {};
  const budgets = state?.budgets && typeof state.budgets === 'object' ? state.budgets : {};
  const referenceDate = localDateIso(generatedAt);
  const startMonth = /^\d{4}-\d{2}/.test(String(start || '')) ? String(start).slice(0, 7) : '';
  const endMonth = /^\d{4}-\d{2}/.test(String(end || '')) ? String(end).slice(0, 7) : '';
  const selectedMonth = startMonth && startMonth === endMonth ? startMonth : endMonth || startMonth || referenceDate.slice(0, 7);
  const monthStart = `${selectedMonth}-01`;
  const monthEnd = shiftIsoDate(shiftIsoDate(monthStart, { months: 1, firstDay: true }), { days: -1 });
  const previousMonthStart = shiftIsoDate(monthStart, { months: -1, firstDay: true });
  const previousMonthEnd = shiftIsoDate(monthStart, { days: -1 });
  const daysInMonth = Number(monthEnd.slice(-2)) || 30;
  const isCurrentMonth = selectedMonth === referenceDate.slice(0, 7);
  const isPastMonth = selectedMonth < referenceDate.slice(0, 7);
  const daysElapsed = isCurrentMonth ? Math.min(Number(referenceDate.slice(-2)) || 1, daysInMonth) : isPastMonth ? daysInMonth : 0;

  const monetary = transactions
    .filter((item) => !isVerocardTransaction(item))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(transactionPeriodDate(item)));
  const monthItems = monetary.filter((item) => {
    const date = transactionPeriodDate(item);
    return date >= monthStart && date <= monthEnd;
  });
  const previousMonthItems = monetary.filter((item) => {
    const date = transactionPeriodDate(item);
    return date >= previousMonthStart && date <= previousMonthEnd;
  });
  const realizedIncome = monthItems.filter(isRealizedIncome);
  const paidExpenses = monthItems.filter((item) => item.type === 'expense' && isPaid(item));
  const pendingExpenses = monthItems.filter((item) => item.type === 'expense' && !isPaid(item));
  const committedExpenses = [...paidExpenses, ...pendingExpenses];
  const previousPaidExpenses = previousMonthItems.filter((item) => item.type === 'expense' && isPaid(item));
  const sum = (items, type) => roundMoney(items.reduce((total, item) => total + transactionValue(item, type), 0));

  const income = sum(realizedIncome, 'income');
  const paidExpense = sum(paidExpenses, 'expense');
  const pendingValue = sum(pendingExpenses, 'expense');
  const committedExpense = roundMoney(paidExpense + pendingValue);
  const previousExpense = sum(previousPaidExpenses, 'expense');
  const variablePaidExpense = sum(paidExpenses.filter((item) => ['ESTILO DE VIDA', 'OUTROS'].includes(managerialGroup(item))), 'expense');
  const paceProjection = isCurrentMonth && daysElapsed > 0
    ? roundMoney(committedExpense + (variablePaidExpense / daysElapsed) * Math.max(daysInMonth - daysElapsed, 0))
    : committedExpense;
  const projectedExpense = roundMoney(Math.max(committedExpense, paceProjection));
  const realizedResult = roundMoney(income - paidExpense);
  const projectedClosing = roundMoney(income - projectedExpense);
  const expenseRatio = income > 0 ? paidExpense / income : paidExpense > 0 ? 1 : 0;
  const projectedExpenseRatio = income > 0 ? projectedExpense / income : projectedExpense > 0 ? 1 : 0;
  const healthyExpenseCeiling = roundMoney(income * 0.8);
  const requiredHealthyIncome = roundMoney(projectedExpense / 0.8);
  const incomeIncreaseRequired = roundMoney(Math.max(requiredHealthyIncome - income, 0));
  const expenseReductionRequired = roundMoney(Math.max(projectedExpense - healthyExpenseCeiling, 0));
  const trendValue = roundMoney(projectedExpense - previousExpense);
  const trendRate = previousExpense > 0 ? trendValue / previousExpense : 0;

  const categoryBudgetKeys = new Map(Object.keys(budgets).map((key) => [normalizeText(key), key]));
  const categoryMap = new Map();
  committedExpenses.forEach((item) => {
    const category = itemGroup(item);
    const current = categoryMap.get(category) || { category, paid: 0, pending: 0, total: 0 };
    const value = transactionValue(item, 'expense');
    if (isPaid(item)) current.paid = roundMoney(current.paid + value);
    else current.pending = roundMoney(current.pending + value);
    current.total = roundMoney(current.paid + current.pending);
    categoryMap.set(category, current);
  });
  const categories = [...categoryMap.values()].map((item) => {
    const budgetKey = categoryBudgetKeys.get(normalizeText(item.category));
    const budget = Number(budgetKey ? budgets[budgetKey] : 0) || 0;
    return {
      ...item,
      share: committedExpense > 0 ? item.total / committedExpense : 0,
      essential: ESSENTIAL_GROUPS.has(normalizeText(item.category)),
      budget,
      variance: roundMoney(item.total - budget),
      utilization: budget > 0 ? item.total / budget : 0,
    };
  }).sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'pt-BR'));

  const managerialGroups = [...aggregateExpenses(committedExpenses, managerialGroup).entries()]
    .map(([group, total]) => ({ group, total, share: committedExpense > 0 ? total / committedExpense : 0 }))
    .sort((a, b) => b.total - a.total || a.group.localeCompare(b.group, 'pt-BR'));
  const paymentMethods = [...aggregateExpenses(committedExpenses, (item) => String(item.paymentMethod || item.account || 'Não informado').trim() || 'Não informado').entries()]
    .map(([method, total]) => ({ method, total, share: committedExpense > 0 ? total / committedExpense : 0 }))
    .sort((a, b) => b.total - a.total || a.method.localeCompare(b.method, 'pt-BR'));
  const expenseTypes = [...aggregateExpenses(committedExpenses, itemExpenseType).entries()]
    .map(([type, total]) => ({ type, total, share: committedExpense > 0 ? total / committedExpense : 0 }))
    .sort((a, b) => b.total - a.total || a.type.localeCompare(b.type, 'pt-BR'));

  const openItems = pendingExpenses.map((item) => {
    const date = transactionPeriodDate(item);
    return {
      ...item,
      date,
      value: roundMoney(transactionValue(item, 'expense')),
      overdue: date < referenceDate,
      dueToday: date === referenceDate,
      daysLate: daysLate(date, referenceDate),
    };
  }).sort((a, b) => Number(b.overdue) - Number(a.overdue) || String(a.date).localeCompare(String(b.date)) || b.value - a.value);
  const overdue = openItems.filter((item) => item.overdue);
  const overdueValue = roundMoney(overdue.reduce((total, item) => total + item.value, 0));
  const configuredBudget = roundMoney(Object.values(budgets).reduce((total, value) => total + (Number(value) || 0), 0));
  const budgetVariance = configuredBudget > 0 ? roundMoney(committedExpense - configuredBudget) : 0;
  const budgetOverValue = roundMoney(categories.filter((item) => item.budget > 0 && item.variance > 0).reduce((total, item) => total + item.variance, 0));
  const budgetOpportunities = categories
    .filter((item) => item.budget > 0 && item.variance > 0)
    .sort((a, b) => b.variance - a.variance || b.utilization - a.utilization);

  const controllableCategories = categories.filter((item) => {
    const group = committedExpenses.find((expense) => normalizeText(itemGroup(expense)) === normalizeText(item.category));
    const classification = group ? managerialGroup(group) : 'OUTROS';
    return !item.essential && classification !== 'INVESTIMENTOS' && classification !== 'DÍVIDAS' && classification !== 'DESENVOLVIMENTO';
  });
  const controllableExpense = roundMoney(controllableCategories.reduce((total, item) => total + item.total, 0));
  const desiredSavings = expenseReductionRequired > 0 ? expenseReductionRequired : roundMoney(projectedExpense * 0.05);
  const suggestedRate = controllableExpense > 0 ? clamp(desiredSavings / controllableExpense, 0.08, 0.2) : 0;
  const savingsOpportunities = controllableCategories.slice(0, 5).map((item) => ({
    category: item.category,
    current: item.total,
    rate: suggestedRate,
    saving: roundMoney(item.total * suggestedRate),
    newLimit: roundMoney(item.total * (1 - suggestedRate)),
  }));
  const suggestedSavings = roundMoney(savingsOpportunities.reduce((total, item) => total + item.saving, 0));
  const remainingExpenseGap = roundMoney(Math.max(expenseReductionRequired - suggestedSavings, 0));
  const incomeNeededAfterSavings = roundMoney(Math.max((projectedExpense - suggestedSavings) / 0.8 - income, 0));

  const spendingScore = income > 0 ? clamp((1.2 - projectedExpenseRatio) / 0.4, 0, 1) * 55 : projectedExpense === 0 ? 55 : 0;
  const punctualityScore = openItems.length ? clamp(1 - overdue.length / openItems.length, 0, 1) * 25 : 25;
  const budgetScore = configuredBudget > 0 ? clamp(1 - Math.max(budgetVariance, 0) / Math.max(configuredBudget, 1), 0, 1) * 20 : 12;
  const hasSufficientData = monthItems.length > 0;
  const controlScore = hasSufficientData ? Math.round(clamp(spendingScore + punctualityScore + budgetScore, 0, 100)) : 0;
  const healthStatus = !hasSufficientData ? 'SEM DADOS NO MÊS' : income <= 0 && projectedExpense > 0 ? 'SEM RECEITA REGISTRADA' : projectedExpenseRatio <= 0.8 ? 'MÊS SAUDÁVEL' : projectedExpenseRatio <= 1 ? 'MÊS EM ATENÇÃO' : 'MÊS CRÍTICO';

  const metrics = {
    income, paidExpense, pendingValue, committedExpense, variablePaidExpense, paceProjection, projectedExpense,
    realizedResult, projectedClosing, expenseRatio, projectedExpenseRatio,
    healthyExpenseCeiling, requiredHealthyIncome, incomeIncreaseRequired, expenseReductionRequired,
    previousExpense, trendValue, trendRate, daysElapsed, daysInMonth,
    openCount: openItems.length, overdueCount: overdue.length, overdueValue,
    configuredBudget, budgetVariance, budgetOverValue, controllableExpense,
    desiredSavings, suggestedSavings, remainingExpenseGap, incomeNeededAfterSavings,
    topCategoryShare: categories[0]?.share || 0, controlScore, healthStatus, hasSufficientData,
  };

  const recommendations = [];
  if (overdue.length) recommendations.push(recommendation(
    'CRÍTICA', `Regularizar ${overdue.length} compromisso(s) vencido(s)`,
    `Priorize ${formatMoney(overdueValue)} antes de assumir novas despesas.`, overdueValue,
    'Itens vencidos elevam juros, bloqueios e perda de previsibilidade do caixa.',
  ));
  if (expenseReductionRequired > 0) recommendations.push(recommendation(
    'ALTA', 'Reequilibrar o fechamento do mês',
    `Reduza até ${formatMoney(expenseReductionRequired)} ou eleve a receita em ${formatMoney(incomeIncreaseRequired)} para preservar uma margem de 20%.`,
    Math.min(expenseReductionRequired, incomeIncreaseRequired || expenseReductionRequired),
    `A despesa projetada é ${formatMoney(projectedExpense)} para uma receita realizada de ${formatMoney(income)}.`,
  ));
  else if (income > 0) recommendations.push(recommendation(
    'MANTER', 'Proteger a margem saudável',
    `Mantenha as despesas abaixo de ${formatMoney(healthyExpenseCeiling)} e reserve o saldo projetado.`,
    Math.max(projectedClosing, 0), 'A projeção permanece dentro do limite gerencial de 80% da receita.',
  ));
  if (budgetOpportunities.length) recommendations.push(recommendation(
    'ALTA', `Corrigir o desvio em ${budgetOpportunities[0].category}`,
    `A categoria está ${formatMoney(budgetOpportunities[0].variance)} acima da meta cadastrada.`,
    budgetOpportunities[0].variance, `Utilização atual de ${formatRate(budgetOpportunities[0].utilization * 100)} do orçamento.`,
  ));
  if (savingsOpportunities.length) recommendations.push(recommendation(
    'MÉDIA', `Ajustar ${savingsOpportunities[0].category}`,
    `Um limite de ${formatMoney(savingsOpportunities[0].newLimit)} pode liberar ${formatMoney(savingsOpportunities[0].saving)} no próximo mês.`,
    savingsOpportunities[0].saving, 'É a maior categoria controlável encontrada no mês.',
  ));
  if (previousExpense > 0) recommendations.push(recommendation(
    trendValue > 0 ? 'MÉDIA' : 'MANTER', trendValue > 0 ? 'Conter a alta mensal' : 'Consolidar a redução mensal',
    trendValue > 0 ? `A projeção está ${formatMoney(trendValue)} acima do mês anterior.` : `A projeção está ${formatMoney(Math.abs(trendValue))} abaixo do mês anterior.`,
    Math.abs(trendValue), `Variação projetada de ${formatRate(trendRate * 100)}.`,
  ));
  if (!recommendations.length) recommendations.push(recommendation(
    'MANTER', 'Registrar o movimento do mês',
    'Cadastre receitas, despesas pagas e compromissos em aberto para ativar as projeções gerenciais.',
    0, 'Ainda não há dados suficientes para uma recomendação específica.',
  ));

  const topExpenses = committedExpenses.map((item) => ({
    date: transactionPeriodDate(item),
    description: item.description || 'Despesa sem descrição',
    group: itemGroup(item),
    value: roundMoney(transactionValue(item, 'expense')),
    status: isPaid(item) ? 'PAGO' : 'EM ABERTO',
  })).sort((a, b) => b.value - a.value || a.date.localeCompare(b.date));

  return {
    metadata: {
      owner, generatedAt: generatedAt.toISOString(), referenceDate,
      start: monthStart, end: monthEnd, month: selectedMonth,
      periodLabel: monthLabel(selectedMonth),
      source: 'MEG Finanças, base autenticada na nuvem', methodologyVersion: '1.0 mensal',
      projectionMethod: isCurrentMonth ? 'Compromissos cadastrados mais o ritmo diário dos gastos flexíveis' : isPastMonth ? 'Fechamento do mês com compromissos ainda em aberto' : 'Compromissos cadastrados para o mês futuro',
    },
    metrics, categories, managerialGroups, paymentMethods, expenseTypes,
    budgetOpportunities, savingsOpportunities, openItems, overdue,
    topExpenses, recommendations: recommendations.slice(0, 5),
  };
}

export const executiveFinancialReportInternals = { normalizeText, monthLabel, monthsBetween, localDateIso, shiftIsoDate };
