import type { PhoenixReadModel } from '../../phoenix/contracts';
import { buildPhoenixHomeAgenda } from '../../phoenix/home-agenda';

export type WebNextHomeRoute =
  | 'home' | 'movements' | 'cards' | 'budgets' | 'reports'
  | 'catalogs' | 'payables' | 'settings';

export type WebNextHomeModel = {
  month: string;
  monthLabel: string;
  totalBalance: number;
  benefitBalance: number;
  freeAfterCommitments: number;
  kpis: {
    income: { value: number; changePct: number | null };
    expense: { value: number; changePct: number | null };
    result: { value: number; changePct: number | null };
    goals: { total: number; used: number; percent: number; active: number };
  };
  assets: Array<{
    id: string;
    kind: 'account' | 'card';
    eyebrow: string;
    name: string;
    value?: number;
    meta: string;
    accent?: string | null;
  }>;
  hiddenAssetCount: number;
  trend: Array<{ month: string; label: string; income: number; expense: number; result: number }>;
  recent: Array<{ id: string; description: string; meta: string; amount: number; date: string }>;
  alerts: Array<{ id: string; title: string; meta: string; amount: number; dueDate: string; level: 'danger' | 'warning' | 'card' }>;
  smartAlert: { title: string; text: string; route: WebNextHomeRoute } | null;
  pendingCount: number;
  pendingAmount: number;
};

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function todayIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function shortMonth(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace('.', '')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function shortDate(value: string) {
  const [, month, day] = value.slice(0, 10).split('-');
  return day && month ? `${day}/${month}` : value;
}

function percentageDelta(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || Math.abs(previous) < 0.005) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function eventIsActive(status: unknown) {
  return !['archived', 'arquivado', 'cancelled', 'canceled', 'cancelado'].includes(normalize(status));
}

function isBenefitEvent(event: PhoenixReadModel['events']['items'][number]) {
  const reference = [
    event.account?.type,
    event.account?.name,
    event.paymentMethod?.name,
    event.sourceDetails?.paymentMethod,
    event.description,
  ].join(' ');
  const text = normalize(reference);
  return text.includes('benefit') || text.includes('verocard') || text.includes('verocheque');
}

function buildDuplicateAlert(data: PhoenixReadModel): WebNextHomeModel['smartAlert'] {
  const buckets = new Map<string, PhoenixReadModel['events']['items']>();
  data.events.items
    .filter((event) => eventIsActive(event.status) && !isBenefitEvent(event))
    .forEach((event) => {
      const amount = Math.abs(Number(event.amount || event.signedAmount || 0));
      if (!amount || !event.description) return;
      const key = [
        String(event.date).slice(0, 10),
        event.accountId || '',
        normalize(event.description),
        amount.toFixed(2),
      ].join('|');
      const items = buckets.get(key) || [];
      items.push(event);
      buckets.set(key, items);
    });

  const duplicates = [...buckets.values()].filter((items) => items.length > 1);
  if (!duplicates.length) {
    if (!data.normalization.primary || !data.normalization.reconciled) {
      return {
        title: 'A leitura financeira precisa de verificação',
        text: 'A normalização atual ainda não está marcada como primária e reconciliada.',
        route: 'settings',
      };
    }
    return null;
  }

  const first = duplicates[0];
  return {
    title: `${duplicates.length} possível(is) duplicidade(s) encontrada(s)`,
    text: `${first[0]?.description || 'Lançamento'} aparece ${first.length} vezes com a mesma data, conta e valor.`,
    route: 'movements',
  };
}

export function buildWebNextHomeModel(
  data: PhoenixReadModel,
  context?: { closingBalance?: number | null },
): WebNextHomeModel {
  const today = todayIso();
  const agenda = buildPhoenixHomeAgenda(data, today);
  const totalBalance = Number.isFinite(Number(context?.closingBalance))
    ? Number(context?.closingBalance)
    : Number(data.summary.availableBalance || 0) + Number(data.summary.realizedResult || 0);

  const budgetTotal = data.budgets.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const budgetUsed = data.budgets.reduce((sum, item) => sum + Number(item.used || 0), 0);
  const budgetPercent = budgetTotal > 0 ? Math.max(0, Math.min(100, budgetUsed / budgetTotal * 100)) : 0;

  const accounts = data.accounts
    .filter((account) => account.isActive && !normalize(account.type).includes('benefit'))
    .slice(0, 1)
    .map((account) => ({
      id: `account-${account.id}`,
      kind: 'account' as const,
      eyebrow: account.institution || 'Conta',
      name: account.name,
      value: data.accounts.filter((item) => item.isActive && !normalize(item.type).includes('benefit')).length === 1 ? totalBalance : undefined,
      meta: 'Conta ativa',
    }));

  const cards = data.cards
    .filter((card) => card.isActive)
    .map((card) => ({
      id: `card-${card.id}`,
      kind: 'card' as const,
      eyebrow: card.brand || card.issuer || 'Cartão',
      name: card.name,
      value: Number(card.payableStatementAmount ?? card.statementAmount ?? 0),
      meta: 'Fatura atual',
      accent: card.color,
    }));

  const monetaryAccountCount = data.accounts.filter((account) => account.isActive && !normalize(account.type).includes('benefit')).length;
  const visibleAssetCount = accounts.length + cards.length;
  const allAssetCount = monetaryAccountCount + cards.length;

  const recent = data.events.items
    .filter((event) => eventIsActive(event.status) && !isBenefitEvent(event))
    .sort((left, right) =>
      String(right.date).localeCompare(String(left.date))
      || String(right.updatedAt || right.createdAt || '').localeCompare(String(left.updatedAt || left.createdAt || '')))
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      description: event.description,
      meta: event.category?.name || event.paymentMethod?.name || 'Sem classificação',
      amount: Number(event.signedAmount || 0),
      date: String(event.date).slice(0, 10),
    }));

  const grouped = new Map<string, WebNextHomeModel['alerts'][number]>();
  agenda.items.forEach((item) => {
    const card = Boolean(item.cardLabel);
    const key = card ? `card|${item.cardLabel}|${item.dueDate.slice(0, 10)}` : item.id;
    const level: WebNextHomeModel['alerts'][number]['level'] = item.dueDate.slice(0, 10) < today ? 'danger' : card ? 'card' : 'warning';
    const current = grouped.get(key);
    if (current) {
      current.amount += item.amount;
      return;
    }
    grouped.set(key, {
      id: key,
      title: card ? `Fatura ${item.cardLabel || 'Cartão'}` : item.description,
      meta: item.dueDate.slice(0, 10) < today ? `Vencido em ${shortDate(item.dueDate)}` : `Vence em ${shortDate(item.dueDate)}`,
      amount: item.amount,
      dueDate: item.dueDate.slice(0, 10),
      level,
    });
  });

  const alerts = [...grouped.values()]
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .slice(0, 3);

  return {
    month: data.month,
    monthLabel: monthLabel(data.month),
    totalBalance,
    benefitBalance: Number(data.summary.benefitBalance || 0),
    freeAfterCommitments: totalBalance - agenda.actionableAmount,
    kpis: {
      income: {
        value: Number(data.summary.realizedIncome || 0),
        changePct: percentageDelta(Number(data.summary.realizedIncome || 0), Number(data.analytics.previous.income || 0)),
      },
      expense: {
        value: Number(data.summary.realizedExpense || 0),
        changePct: percentageDelta(Number(data.summary.realizedExpense || 0), Number(data.analytics.previous.expense || 0)),
      },
      result: {
        value: Number(data.summary.realizedResult || 0),
        changePct: percentageDelta(Number(data.summary.realizedResult || 0), Number(data.analytics.previous.result || 0)),
      },
      goals: { total: budgetTotal, used: budgetUsed, percent: budgetPercent, active: data.budgets.length },
    },
    assets: [...accounts, ...cards],
    hiddenAssetCount: Math.max(0, allAssetCount - visibleAssetCount),
    trend: data.analytics.monthlyTrend.slice(-6).map((item) => ({
      month: item.month,
      label: shortMonth(item.month),
      income: Number(item.income || 0),
      expense: Number(item.expense || 0),
      result: Number(item.result || 0),
    })),
    recent,
    alerts,
    smartAlert: buildDuplicateAlert(data),
    pendingCount: agenda.items.length,
    pendingAmount: agenda.actionableAmount,
  };
}
