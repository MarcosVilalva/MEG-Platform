import { calculateFinancialSummary, isCreditCardExpense, isVerocardTransaction, transactionPeriodDate, transactionValue } from './legacy-finance.js';

const ESSENTIAL_GROUPS = new Set([
  'COMUNICAÇÃO',
  'HIGIENE PESSOAL',
  'IMÓVEL',
  'MAT. ESCOLAR',
  'PGTO DE DIVIDAS',
  'SAÚDE',
  'SUPERMERCADO',
  'TITULOS/PREVIDÊNCIA',
  'TRANSPORTE',
].map(normalizeText));

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(Number(value) || 0)
    .replace(/\u00a0/g, ' ');
}

function formatRate(value) {
  return `${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function itemGroup(item) {
  return String(item?.group || item?.category || 'Sem categoria').trim() || 'Sem categoria';
}

function isPaid(item) {
  return item?.status === 'paid' || normalizeText(item?.situation) === 'PAGO';
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

function categoryMap(items) {
  const map = new Map();
  items.forEach((item) => {
    const group = itemGroup(item);
    map.set(group, roundMoney((map.get(group) || 0) + transactionValue(item, 'expense')));
  });
  return map;
}

function paymentMap(items) {
  const map = new Map();
  items.forEach((item) => {
    const label = String(item.paymentMethod || item.account || 'Não informado').trim() || 'Não informado';
    map.set(label, roundMoney((map.get(label) || 0) + transactionValue(item, 'expense')));
  });
  return map;
}

function daysLate(date, referenceDate) {
  if (!date || !referenceDate || date >= referenceDate) return 0;
  return Math.max(0, Math.floor((new Date(`${referenceDate}T12:00:00`) - new Date(`${date}T12:00:00`)) / 86400000));
}

function recommendation(priority, title, action, impact, reason) {
  return { priority, title, action, impact, reason };
}

function generateRecommendations(model) {
  const recommendations = [];
  const {
    metrics,
    categories,
    pending,
    budgetRows,
    cardRows,
  } = model;

  if (metrics.projectedBalance < 0) {
    recommendations.push(recommendation(
      'CRÍTICA',
      'Eliminar o déficit projetado',
      `Reduza, adie ou renegocie ao menos ${formatMoney(Math.abs(metrics.projectedBalance))} antes de assumir novas despesas.`,
      Math.abs(metrics.projectedBalance),
      'As receitas e o saldo disponível não cobrem todas as despesas lançadas no período.',
    ));
  }

  if (metrics.overdueCount > 0) {
    recommendations.push(recommendation(
      'CRÍTICA',
      `Regularizar ${metrics.overdueCount} conta(s) vencida(s)`,
      'Priorize contas com juros, risco de bloqueio de serviço ou impacto no histórico de crédito.',
      metrics.overdueValue,
      `As pendências vencidas somam ${formatMoney(metrics.overdueValue)}.`,
    ));
  } else if (pending.length > 0) {
    recommendations.push(recommendation(
      'ALTA',
      'Separar o dinheiro das contas pendentes',
      'Mantenha o valor das pendências reservado e indisponível para novas compras.',
      metrics.pendingExpense,
      `Ainda existem ${pending.length} compromissos em aberto no período.`,
    ));
  }

  if (metrics.savingsRate < 0.2 && metrics.averageIncome > 0) {
    const gap = Math.max(metrics.savingsGoal - metrics.savingsCapacity, 0);
    recommendations.push(recommendation(
      metrics.savingsRate < 0 ? 'CRÍTICA' : 'ALTA',
      'Construir uma taxa de poupança de 20%',
      `Direcione mais ${formatMoney(gap)} por mês para reserva, investimento ou antecipação de dívidas.`,
      gap,
      `A capacidade histórica estimada é ${formatRate(metrics.savingsRate * 100)} da renda média.`,
    ));
  } else if (metrics.averageIncome > 0) {
    recommendations.push(recommendation(
      'MANTER',
      'Proteger a boa capacidade de poupança',
      'Automatize a transferência da reserva no dia do recebimento da renda.',
      metrics.savingsCapacity,
      `A capacidade histórica estimada está em ${formatRate(metrics.savingsRate * 100)}.`,
    ));
  }

  if (metrics.emergencyGap > 0) {
    recommendations.push(recommendation(
      'ALTA',
      'Completar a reserva de emergência',
      `Acumule ${formatMoney(metrics.emergencyGap)} para alcançar seis meses das despesas essenciais médias.`,
      metrics.emergencyGap,
      `A meta calculada é ${formatMoney(metrics.emergencyGoal)}.`,
    ));
  }

  const topFlexible = categories.find((item) => !item.essential && item.total > 0);
  if (topFlexible && metrics.averageIncome > 0 && metrics.expenseRatio > 0.8) {
    const target = Math.min(topFlexible.total * 0.15, Math.max(metrics.averageExpense - metrics.averageIncome * 0.8, 0));
    recommendations.push(recommendation(
      'MÉDIA',
      `Revisar gastos de ${topFlexible.category}`,
      `Busque uma redução inicial de ${formatMoney(target)} no período, começando pelos itens de menor impacto na qualidade de vida.`,
      target,
      `É o maior grupo flexível, com ${formatMoney(topFlexible.total)}.`,
    ));
  }

  const budgetOverrun = budgetRows.find((item) => item.budget > 0 && item.variance > 0);
  if (budgetOverrun) {
    recommendations.push(recommendation(
      'MÉDIA',
      `Corrigir a meta de ${budgetOverrun.category}`,
      `Reduza ${formatMoney(budgetOverrun.variance)} ou ajuste conscientemente a meta para refletir a realidade.`,
      budgetOverrun.variance,
      `O gasto ficou em ${formatRate(budgetOverrun.utilization * 100)} da meta definida.`,
    ));
  }

  const stressedCard = cardRows.find((item) => item.limit > 0 && item.usage >= 0.7);
  if (stressedCard) {
    recommendations.push(recommendation(
      stressedCard.usage >= 0.9 ? 'ALTA' : 'MÉDIA',
      `Reduzir o uso do cartão ${stressedCard.name}`,
      'Evite novas parcelas até que a utilização fique abaixo de 50% do limite.',
      stressedCard.pending,
      `A utilização estimada está em ${formatRate(stressedCard.usage * 100)} do limite.`,
    ));
  }

  if (!recommendations.length) {
    recommendations.push(recommendation(
      'MANTER',
      'Continuar o acompanhamento mensal',
      'Revise o relatório no fechamento de cada mês e mantenha metas atualizadas.',
      metrics.operatingResult,
      'Nenhum alerta financeiro relevante foi identificado no período.',
    ));
  }

  const order = { 'CRÍTICA': 0, 'ALTA': 1, 'MÉDIA': 2, 'MANTER': 3 };
  return recommendations.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9)).slice(0, 10);
}

export function buildExecutiveFinancialModel({ state, start, end, generatedAt = new Date(), owner = 'Usuário MEG', periodLabel = '' }) {
  const transactions = Array.isArray(state?.transactions) ? [...state.transactions] : [];
  const catalogs = state?.catalogs && typeof state.catalogs === 'object' ? state.catalogs : {};
  const budgets = state?.budgets && typeof state.budgets === 'object' ? state.budgets : {};
  const referenceDate = generatedAt.toISOString().slice(0, 10);
  const monetary = transactions.filter((item) => !isVerocardTransaction(item));
  const selected = monetary.filter((item) => {
    const date = transactionPeriodDate(item);
    return date && (!start || date >= start) && (!end || date <= end);
  }).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.description).localeCompare(String(b.description), 'pt-BR'));
  const selectedExpenses = selected.filter((item) => item.type === 'expense');
  const selectedIncome = selected.filter((item) => item.type === 'income');
  const pending = selectedExpenses
    .filter((item) => !isPaid(item))
    .map((item) => ({
      ...item,
      value: roundMoney(transactionValue(item, 'expense')),
      daysLate: daysLate(item.date, referenceDate),
      overdue: Boolean(item.date && item.date < referenceDate),
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || b.value - a.value);
  const summary = calculateFinancialSummary(monetary, start, end);
  const months = monthsBetween(start, end);
  const activeMonths = Math.max(months.length, 1);
  const monthly = months.map((month) => {
    const items = selected.filter((item) => transactionPeriodDate(item).startsWith(month));
    const income = roundMoney(items.reduce((sum, item) => sum + transactionValue(item, 'income'), 0));
    const expense = roundMoney(items.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0));
    return {
      month,
      label: monthLabel(month),
      income,
      expense,
      result: roundMoney(income - expense),
      savingsRate: income > 0 ? (income - expense) / income : 0,
    };
  });

  const categoriesRaw = categoryMap(selectedExpenses);
  const categoryBudgetKeys = new Map(Object.keys(budgets).map((key) => [normalizeText(key), key]));
  const categories = [...categoriesRaw.entries()]
    .map(([category, total]) => {
      const budgetKey = categoryBudgetKeys.get(normalizeText(category));
      const monthlyBudget = Number(budgetKey ? budgets[budgetKey] : 0) || 0;
      const budget = roundMoney(monthlyBudget * activeMonths);
      return {
        category,
        total,
        share: summary.expense > 0 ? total / summary.expense : 0,
        essential: ESSENTIAL_GROUPS.has(normalizeText(category)),
        monthlyAverage: roundMoney(total / activeMonths),
        monthlyBudget,
        budget,
        variance: roundMoney(total - budget),
        utilization: budget > 0 ? total / budget : 0,
      };
    })
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'pt-BR'));

  const budgetRows = categories.map((item) => ({ ...item }));
  Object.entries(budgets).forEach(([category, monthlyBudget]) => {
    if (budgetRows.some((item) => normalizeText(item.category) === normalizeText(category))) return;
    const budget = roundMoney((Number(monthlyBudget) || 0) * activeMonths);
    budgetRows.push({
      category,
      total: 0,
      share: 0,
      essential: ESSENTIAL_GROUPS.has(normalizeText(category)),
      monthlyAverage: 0,
      monthlyBudget: Number(monthlyBudget) || 0,
      budget,
      variance: roundMoney(-budget),
      utilization: 0,
    });
  });
  budgetRows.sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'pt-BR'));

  const historyMonths = [...new Set(monetary.map((item) => transactionPeriodDate(item).slice(0, 7)).filter((item) => /^\d{4}-\d{2}$/.test(item)))];
  const historyMonthCount = Math.max(historyMonths.length, 1);
  const historicalIncome = monetary.reduce((sum, item) => sum + transactionValue(item, 'income'), 0);
  const historicalExpense = monetary.reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
  const averageIncome = historicalIncome / historyMonthCount;
  const averageExpense = historicalExpense / historyMonthCount;
  const essentialAverage = categories
    .filter((item) => item.essential)
    .reduce((sum, item) => sum + item.monthlyAverage, 0);
  const savingsCapacity = averageIncome - averageExpense;
  const savingsRate = averageIncome > 0 ? savingsCapacity / averageIncome : 0;
  const savingsGoal = averageIncome * 0.2;
  const expenseRatio = averageIncome > 0 ? averageExpense / averageIncome : 0;
  const essentialRatio = averageIncome > 0 ? essentialAverage / averageIncome : 1;
  const emergencyGoal = essentialAverage * 6;
  const currentReserve = Math.max(summary.closingBalance, 0);
  const emergencyGap = Math.max(emergencyGoal - currentReserve, 0);
  const overdue = pending.filter((item) => item.overdue);
  const overdueValue = overdue.reduce((sum, item) => sum + item.value, 0);
  const savingsScore = clamp(savingsRate / 0.2, 0, 1) * 40;
  const essentialScore = essentialRatio <= 0.5 ? 25 : clamp(1 - ((essentialRatio - 0.5) / 0.35), 0, 1) * 25;
  const balanceScore = summary.projectedBalance >= 0 ? 20 : clamp(1 + summary.projectedBalance / Math.max(summary.availableIncome, 1), 0, 1) * 20;
  const punctualityScore = pending.length ? clamp(1 - overdue.length / pending.length, 0, 1) * 15 : 15;
  const healthScore = Math.round(clamp(savingsScore + essentialScore + balanceScore + punctualityScore, 0, 100));

  const accounts = Array.isArray(catalogs.accounts) ? catalogs.accounts : [];
  const accountRows = accounts.map((account) => {
    const linked = monetary.filter((item) => item.financialAccountId === account.id && (!end || item.date <= end));
    const balance = linked.reduce((sum, item) => sum + transactionValue(item, 'income') - transactionValue(item, 'expense'), 0);
    return {
      name: account.name || 'Conta sem nome',
      type: account.type || 'MONETARY',
      subtype: account.subtype || 'OTHER',
      active: account.isActive !== false,
      openingBalance: Number(account.openingBalance || 0),
      balance: roundMoney(balance),
      transactionCount: linked.length,
    };
  }).sort((a, b) => b.balance - a.balance);

  const cards = Array.isArray(catalogs.cards) ? catalogs.cards : [];
  const pendingCardExpenses = monetary.filter((item) => item.type === 'expense' && !isPaid(item) && isCreditCardExpense(item));
  const cardRows = cards.map((card) => {
    const key = normalizeText(card.paymentMethod);
    const pendingValue = pendingCardExpenses
      .filter((item) => normalizeText(item.paymentMethod || item.account) === key)
      .reduce((sum, item) => sum + transactionValue(item, 'expense'), 0);
    const limit = Number(card.limit || 0);
    return {
      name: card.paymentMethod || card.productName || 'Cartão',
      issuer: card.issuer || '',
      brand: card.brand || '',
      lastFour: card.lastFour || '',
      limit,
      pending: roundMoney(pendingValue),
      available: roundMoney(Math.max(limit - pendingValue, 0)),
      usage: limit > 0 ? pendingValue / limit : 0,
      closingDay: Number(card.closingDay || 0),
      dueDay: Number(card.dueDay || 0),
      active: card.isActive !== false,
    };
  }).sort((a, b) => b.usage - a.usage);

  const paymentMethods = [...paymentMap(selectedExpenses).entries()]
    .map(([method, total]) => ({ method, total, share: summary.expense > 0 ? total / summary.expense : 0 }))
    .sort((a, b) => b.total - a.total);

  const metrics = {
    income: roundMoney(summary.income),
    expense: roundMoney(summary.expense),
    paidExpense: roundMoney(summary.paidExpense),
    pendingExpense: roundMoney(summary.pendingExpense),
    operatingResult: roundMoney(summary.operatingResult),
    availableIncome: roundMoney(summary.availableIncome),
    closingBalance: roundMoney(summary.closingBalance),
    projectedBalance: roundMoney(summary.projectedBalance),
    transactionCount: selected.length,
    incomeCount: selectedIncome.length,
    expenseCount: selectedExpenses.length,
    pendingCount: pending.length,
    overdueCount: overdue.length,
    overdueValue: roundMoney(overdueValue),
    averageIncome: roundMoney(averageIncome),
    averageExpense: roundMoney(averageExpense),
    savingsCapacity: roundMoney(savingsCapacity),
    savingsRate,
    savingsGoal: roundMoney(savingsGoal),
    expenseRatio,
    essentialAverage: roundMoney(essentialAverage),
    essentialRatio,
    emergencyGoal: roundMoney(emergencyGoal),
    currentReserve: roundMoney(currentReserve),
    emergencyGap: roundMoney(emergencyGap),
    healthScore,
    healthStatus: healthScore >= 80 ? 'SAUDÁVEL' : healthScore >= 60 ? 'EM ATENÇÃO' : 'PRECISA DE REEQUILÍBRIO',
  };

  const model = {
    metadata: {
      owner,
      generatedAt: generatedAt.toISOString(),
      start,
      end,
      periodLabel: periodLabel || `${start} a ${end}`,
      source: 'MEG Finanças, base autenticada na nuvem',
      methodologyVersion: '1.0',
    },
    metrics,
    monthly,
    categories,
    budgetRows,
    pending,
    accountRows,
    cardRows,
    paymentMethods,
    transactions: selected,
  };
  model.recommendations = generateRecommendations(model);
  return model;
}

export const executiveFinancialReportInternals = {
  normalizeText,
  monthLabel,
  monthsBetween,
};
