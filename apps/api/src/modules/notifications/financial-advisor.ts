import { prisma } from '@meg/database';
import { config } from '../../config';
import { resolveWorkspaceContext } from '../workspaces/service';
import { buildAlexaFinancialPanorama, type LegacyTransaction } from './service';

export type AlexaAdvisorIntent =
  | 'financial-analysis'
  | 'financial-risk'
  | 'savings-opportunities'
  | 'spending-analysis'
  | 'cash-margin'
  | 'scenario-by-date';

export type AlexaAdvisorQuery = {
  date?: string;
};

type AdvisorExpense = {
  label: string;
  value: number;
};

type AlexaAdvisorResponse = {
  speech: string;
  reprompt: string;
  cardTitle: string;
  cardText: string;
  data: {
    query: AlexaAdvisorIntent;
    month: string;
    paidToIncomeRatio: number | null;
    available: number;
    projectedClosing: number;
    overdueTotal: number;
    next30DaysTotal: number;
    marginAfter30Days: number;
    riskLevel: 'controlado' | 'atenção' | 'crítico';
    topExpenses: AdvisorExpense[];
    requestedDate?: string | null;
    scenarioCommitments?: number;
    scenarioBalance?: number;
  };
};

const money = (value: number) => Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const normalize = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
const amountOf = (item: LegacyTransaction) => Number(item.expenseAmount ?? item.amount ?? 0) || 0;
const incomeAmountOf = (item: LegacyTransaction) => Number(item.incomeAmount ?? item.amount ?? 0) || 0;

function isBenefitTransaction(item: LegacyTransaction) {
  if (item.financialScope === 'benefit') return true;
  if (item.financialScope === 'monetary') return false;
  if (String(item.financialAccountId || '').startsWith('account-benefit-')) return true;
  const modality = normalize(item.modality);
  if (modality.includes('ALIMENTA')) return true;
  if (isIncome(item)) return normalize(item.description).includes('VEROCARD');
  return normalize(item.paymentMethod || item.account).includes('VEROCARD');
}

function isIncome(item: LegacyTransaction) {
  return ['INCOME', 'RECEITA', 'REDEMPTION'].includes(normalize(item.type));
}

function isPaidExpense(item: LegacyTransaction) {
  return ['PAID', 'PAGO', 'PAGA', 'RECONCILED', 'CONFIRMED'].includes(normalize(item.status || item.situation));
}

function isOpenMonetaryExpense(item: LegacyTransaction) {
  if (isBenefitTransaction(item) || isIncome(item) || !item.date) return false;
  return amountOf(item) > 0 && !isPaidExpense(item);
}

function localIso(referenceDate: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(referenceDate);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00-03:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function monthLabel(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function dateLabel(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function naturalLabel(value: unknown) {
  const text = String(value || 'Despesa').trim().replace(/\s+/g, ' ');
  if (!text) return 'Despesa';
  return text
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|[\s/(])\p{L}/gu, (letter) => letter.toLocaleUpperCase('pt-BR'));
}

function topPaidExpenses(transactions: LegacyTransaction[], month: string): AdvisorExpense[] {
  const totals = new Map<string, { label: string; value: number }>();
  for (const item of transactions) {
    const date = String(item.date || '');
    if (!date.startsWith(month) || isBenefitTransaction(item) || isIncome(item) || !isPaidExpense(item)) continue;
    const value = amountOf(item);
    if (value <= 0) continue;
    const rawLabel = String(item.description || item.paymentMethod || item.account || 'Despesa').trim();
    const key = normalize(rawLabel) || 'DESPESA';
    const previous = totals.get(key);
    if (previous) previous.value += value;
    else totals.set(key, { label: naturalLabel(rawLabel), value });
  }
  return [...totals.values()].sort((a, b) => b.value - a.value).slice(0, 5);
}

function describeTopExpenses(items: AdvisorExpense[], limit = 3) {
  const selected = items.slice(0, limit);
  if (!selected.length) return 'Ainda não há despesas monetárias pagas suficientes para apontar os maiores gastos do mês.';
  const parts = selected.map((item) => `${item.label}, ${money(item.value)}`);
  if (parts.length === 1) return `A maior despesa paga foi ${parts[0]}.`;
  return `As maiores despesas pagas foram ${parts.slice(0, -1).join('; ')}; e ${parts.at(-1)}.`;
}

function percent(value: number) {
  return `${(value * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function riskAssessment(input: {
  projectedClosing: number;
  paidToIncomeRatio: number | null;
  overdueTotal: number;
  next30DaysTotal: number;
  marginAfter30Days: number;
}) {
  if (input.projectedClosing < 0) {
    return {
      level: 'crítico' as const,
      reason: `as pendências do mês levam a uma projeção negativa de ${money(Math.abs(input.projectedClosing))}`
    };
  }
  if (input.overdueTotal > 0) {
    return {
      level: 'crítico' as const,
      reason: `há ${money(input.overdueTotal)} em compromissos vencidos que precisam de prioridade`
    };
  }
  if (input.marginAfter30Days < 0) {
    return {
      level: 'crítico' as const,
      reason: `os compromissos cadastrados para os próximos 30 dias superam o saldo atual em ${money(Math.abs(input.marginAfter30Days))}, sem considerar novas receitas`
    };
  }
  if ((input.paidToIncomeRatio ?? 0) >= 0.85) {
    return {
      level: 'atenção' as const,
      reason: `as despesas já pagas consomem ${percent(input.paidToIncomeRatio || 0)} das receitas monetárias do mês`
    };
  }
  if (input.next30DaysTotal > 0) {
    return {
      level: 'atenção' as const,
      reason: `há ${money(input.next30DaysTotal)} em compromissos cadastrados para os próximos 30 dias`
    };
  }
  return {
    level: 'controlado' as const,
    reason: 'não há pendências relevantes ou pressão de caixa identificada nos próximos 30 dias com os dados cadastrados'
  };
}

export function buildAlexaFinancialAdvice(
  transactions: LegacyTransaction[],
  referenceDate = new Date(),
  intent: AlexaAdvisorIntent = 'financial-analysis',
  query: AlexaAdvisorQuery = {}
): AlexaAdvisorResponse {
  const panorama = buildAlexaFinancialPanorama(transactions, referenceDate, 'overview');
  const data = panorama.data || {};
  const month = String(data.month || localIso(referenceDate).slice(0, 7));
  const monthText = monthLabel(month);
  const available = Number(data.monetaryAvailable || 0);
  const income = Number(data.monetaryIncome || 0);
  const paid = Number(data.monetaryPaidExpense || 0);
  const pending = Number(data.monetaryPendingExpense || 0);
  const projectedClosing = Number(data.projectedClosing || 0);
  const today = localIso(referenceDate);
  const in30Days = addDays(today, 30);

  const open = transactions.filter(isOpenMonetaryExpense);
  const overdue = open.filter((item) => String(item.date) < today);
  const upcoming30 = open.filter((item) => String(item.date) >= today && String(item.date) <= in30Days);
  const overdueTotal = overdue.reduce((sum, item) => sum + amountOf(item), 0);
  const next30DaysTotal = upcoming30.reduce((sum, item) => sum + amountOf(item), 0);
  const commitments30 = overdueTotal + next30DaysTotal;
  const marginAfter30Days = available - commitments30;
  const paidToIncomeRatio = income > 0 ? paid / income : null;
  const topExpenses = topPaidExpenses(transactions, month);
  const risk = riskAssessment({ projectedClosing, paidToIncomeRatio, overdueTotal, next30DaysTotal, marginAfter30Days });
  const topExpenseText = describeTopExpenses(topExpenses);

  let speech: string;
  let cardTitle: string;
  let requestedDate: string | null | undefined;
  let scenarioCommitments: number | undefined;
  let scenarioBalance: number | undefined;

  if (intent === 'financial-risk') {
    speech = `Seu nível de atenção financeira está ${risk.level}. O principal ponto é que ${risk.reason}. `
      + `Hoje você tem ${money(available)} disponíveis e, sem considerar novas receitas, a margem depois dos compromissos cadastrados para os próximos 30 dias seria ${marginAfter30Days >= 0 ? money(marginAfter30Days) : `negativa em ${money(Math.abs(marginAfter30Days))}`}.`;
    cardTitle = 'MEG Finanças — Risco financeiro';
  } else if (intent === 'savings-opportunities') {
    speech = `${topExpenseText} Sem presumir quais gastos são essenciais, eu começaria revisando os itens recorrentes ou ajustáveis entre essas maiores despesas. `
      + `${paidToIncomeRatio !== null ? `Até agora, as despesas pagas representam ${percent(paidToIncomeRatio)} das receitas do mês. ` : ''}`
      + `A prioridade é preservar caixa para ${money(commitments30)} em compromissos vencidos ou previstos nos próximos 30 dias.`;
    cardTitle = 'MEG Finanças — Oportunidades de economia';
  } else if (intent === 'spending-analysis') {
    speech = `${topExpenseText} No total, você já pagou ${money(paid)} em despesas monetárias em ${monthText}. `
      + `${paidToIncomeRatio !== null ? `Isso corresponde a ${percent(paidToIncomeRatio)} das receitas monetárias do mês.` : 'Ainda não há receita monetária do mês suficiente para calcular o percentual de comprometimento.'}`;
    cardTitle = 'MEG Finanças — Maiores gastos';
  } else if (intent === 'cash-margin') {
    speech = `Considerando o saldo atual de ${money(available)} e todos os compromissos monetários cadastrados que estão vencidos ou vencem nos próximos 30 dias, no total de ${money(commitments30)}, `
      + `${marginAfter30Days >= 0 ? `sua margem de caixa seria ${money(marginAfter30Days)}` : `faltariam ${money(Math.abs(marginAfter30Days))}`}. `
      + 'Esse cálculo não considera novas receitas nem despesas que ainda não foram lançadas.';
    cardTitle = 'MEG Finanças — Margem de caixa';
  } else if (intent === 'scenario-by-date') {
    requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(query.date || '')) ? String(query.date) : null;
    if (!requestedDate) {
      speech = 'Para fazer essa simulação, diga uma data. Por exemplo: se eu pagar tudo até dia 10 de setembro, quanto sobra?';
      cardTitle = 'MEG Finanças — Simulação';
    } else {
      const commitments = open.filter((item) => String(item.date) <= requestedDate!);
      scenarioCommitments = commitments.reduce((sum, item) => sum + amountOf(item), 0);
      scenarioBalance = available - scenarioCommitments;
      speech = `Se você quitar todos os compromissos monetários cadastrados com vencimento até ${dateLabel(requestedDate)}, no total de ${money(scenarioCommitments)}, `
        + `${scenarioBalance >= 0 ? `restariam ${money(scenarioBalance)}` : `faltariam ${money(Math.abs(scenarioBalance))}`}. `
        + 'A simulação usa o saldo atual e não considera novas receitas ou despesas ainda não lançadas.';
      cardTitle = `MEG Finanças — Cenário até ${dateLabel(requestedDate)}`;
    }
  } else {
    const commitmentSentence = paidToIncomeRatio !== null
      ? `As despesas já pagas representam ${percent(paidToIncomeRatio)} das receitas monetárias do mês.`
      : 'Ainda não há receita monetária do mês suficiente para calcular o comprometimento da renda.';
    const pendingSentence = pending > 0
      ? `Ainda existem ${money(pending)} em pendências dentro de ${monthText}.`
      : `Não há contas monetárias em aberto dentro de ${monthText}.`;
    const marginSentence = marginAfter30Days >= 0
      ? `Sem considerar novas receitas, depois dos compromissos vencidos ou previstos nos próximos 30 dias, a margem de caixa seria ${money(marginAfter30Days)}.`
      : `Sem considerar novas receitas, os compromissos dos próximos 30 dias excedem o saldo atual em ${money(Math.abs(marginAfter30Days))}.`;
    speech = `Análise financeira de ${monthText}. Você tem ${money(available)} disponíveis. ${commitmentSentence} ${pendingSentence} `
      + `${marginSentence} O diagnóstico do MEG está em nível de ${risk.level}, porque ${risk.reason}. ${topExpenseText}`;
    cardTitle = `MEG Finanças — Análise de ${monthText}`;
  }

  return {
    speech,
    reprompt: 'Você pode perguntar qual é o maior risco, onde está gastando mais, onde pode economizar, quanto pode comprometer ou fazer uma simulação por data.',
    cardTitle,
    cardText: [
      `Saldo disponível: ${money(available)}`,
      `Despesas pagas no mês: ${money(paid)}`,
      `Receitas do mês: ${money(income)}`,
      `Comprometimento: ${paidToIncomeRatio === null ? 'não calculado' : percent(paidToIncomeRatio)}`,
      `Pendências do mês: ${money(pending)}`,
      `Vencidos: ${money(overdueTotal)}`,
      `Próximos 30 dias: ${money(next30DaysTotal)}`,
      `Margem após 30 dias: ${marginAfter30Days >= 0 ? money(marginAfter30Days) : `-${money(Math.abs(marginAfter30Days))}`}`,
      `Nível de atenção: ${risk.level}`,
      topExpenses.length ? `Maiores despesas: ${topExpenses.slice(0, 3).map((item) => `${item.label} (${money(item.value)})`).join('; ')}` : 'Maiores despesas: sem dados suficientes',
      requestedDate ? `Cenário até ${dateLabel(requestedDate)}: ${scenarioBalance !== undefined && scenarioBalance >= 0 ? money(scenarioBalance) : scenarioBalance !== undefined ? `-${money(Math.abs(scenarioBalance))}` : 'não calculado'}` : ''
    ].filter(Boolean).join('\n'),
    data: {
      query: intent,
      month,
      paidToIncomeRatio,
      available,
      projectedClosing,
      overdueTotal,
      next30DaysTotal,
      marginAfter30Days,
      riskLevel: risk.level,
      topExpenses,
      requestedDate,
      scenarioCommitments,
      scenarioBalance
    }
  };
}

export async function alexaFinancialAdvice(referenceDate = new Date(), intent: AlexaAdvisorIntent = 'financial-analysis', query: AlexaAdvisorQuery = {}) {
  const owner = await prisma.user.findUnique({
    where: { email: config.alexaOwnerEmail.trim().toLowerCase() },
    select: { id: true, email: true, isActive: true, status: true }
  });
  if (!owner?.isActive || owner.status !== 'ACTIVE') throw new Error('ALEXA_OWNER_NOT_ACTIVE');
  const context = await resolveWorkspaceContext(owner.id);
  const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId } });
  const state = saved?.state as { transactions?: LegacyTransaction[] } | null;
  return { owner: owner.email, ...buildAlexaFinancialAdvice(state?.transactions || [], referenceDate, intent, query) };
}
