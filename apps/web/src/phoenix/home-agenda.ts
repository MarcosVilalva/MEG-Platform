import type { PhoenixReadModel } from './contracts';

export type PhoenixHomeAgendaItem = {
  id: string;
  source: 'payable' | 'event';
  description: string;
  dueDate: string;
  amount: number;
  meta: string;
  kind: 'VENCIDO' | 'FATURA' | 'PRÓXIMO';
  cardLabel?: string;
};

export type PhoenixHomeAgendaGroup = {
  kind: 'VENCIDOS' | 'FATURA' | 'PRÓXIMOS';
  title: string;
  subtitle: string;
  amount: number;
  count: number;
};

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function agendaSignature(item: Pick<PhoenixHomeAgendaItem, 'description' | 'dueDate' | 'amount'>) {
  return `${normalize(item.description)}|${item.dueDate.slice(0, 10)}|${Math.abs(item.amount).toFixed(2)}`;
}

function isBenefitEvent(event: PhoenixReadModel['events']['items'][number]) {
  const reference = `${event.account?.type || ''} ${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''} ${event.description}`;
  return normalize(reference).includes('benefit') || normalize(reference).includes('verocard');
}

function compactCardLabel(value: string) {
  const text = value.trim();
  if (!text) return 'Cartão';
  const normalized = normalize(text);
  if (normalized.includes('latam')) return 'LATAM PASS';
  if (normalized.includes('mli') || normalized.includes('meli') || normalized.includes('mercado livre') || normalized.includes('mercado pago') || normalized.includes('cartao ml')) return 'MELI';
  if (normalized.includes('azul')) return 'AZUL';
  if (normalized.includes('riachuelo') || normalized.includes('midway')) return 'RIACHUELO';
  return text.replace(/cart[aã]o/ig, '').replace(/cr[eé]dito/ig, '').replace(/\s+/g, ' ').trim() || 'Cartão';
}

function shortDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}` : value;
}

function moneyCompact(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function buildPhoenixHomeAgenda(data: PhoenixReadModel, today: string) {
  const official: PhoenixHomeAgendaItem[] = data.payables
    .filter((item) => !['paid', 'cancelled'].includes(item.status) && Number(item.openAmount) > 0)
    .map((item) => ({
      id: `payable-${item.id}`,
      source: 'payable' as const,
      description: item.description,
      dueDate: String(item.dueDate),
      amount: Number(item.openAmount || 0),
      meta: item.category?.group || item.category?.name || 'Conta a pagar',
      kind: String(item.dueDate).slice(0, 10) < today ? 'VENCIDO' as const : 'PRÓXIMO' as const
    }));

  const seen = new Set(official.map(agendaSignature));
  const compatibility: PhoenixHomeAgendaItem[] = data.events.items
    .filter((event) => event.competence === data.month)
    .filter((event) => event.status === 'planned' && event.type === 'expense')
    .filter((event) => !isBenefitEvent(event))
    .map((event) => {
      const dueDate = event.date.slice(0, 10);
      const amount = -Number(event.signedAmount || 0);
      const paymentReference = `${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''} ${event.sourceDetails?.modality || ''}`.trim();
      const card = normalize(paymentReference).includes('cartao') || normalize(paymentReference).includes('credito');
      return {
        id: `event-${event.id}`,
        source: 'event' as const,
        description: event.description,
        dueDate,
        amount,
        meta: event.sourceDetails?.expenseClass || event.category?.group || event.category?.name || 'Lançamento planejado',
        kind: dueDate < today ? 'VENCIDO' as const : card ? 'FATURA' as const : 'PRÓXIMO' as const,
        cardLabel: card ? compactCardLabel(event.paymentMethod?.name || event.sourceDetails?.paymentMethod || paymentReference) : undefined
      };
    })
    // Estorno/reversão possui signedAmount positivo e reduz a despesa pendente.
    // Portanto não é uma obrigação acionável da agenda.
    .filter((item) => item.amount > 0)
    .filter((item) => {
      const signature = agendaSignature(item);
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });

  const items = [...official, ...compatibility]
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.description.localeCompare(right.description, 'pt-BR'));

  const byKind = (kind: PhoenixHomeAgendaItem['kind']) => items.filter((item) => item.kind === kind);
  const overdue = byKind('VENCIDO');
  const invoices = byKind('FATURA');
  const upcoming = byKind('PRÓXIMO');

  const invoiceBuckets = new Map<string, { amount: number; count: number; dueDate: string }>();
  invoices.forEach((item) => {
    const label = item.cardLabel || 'Cartão';
    const key = `${label}|${item.dueDate.slice(0, 10)}`;
    const current = invoiceBuckets.get(key) || { amount: 0, count: 0, dueDate: item.dueDate.slice(0, 10) };
    current.amount += item.amount;
    current.count += 1;
    invoiceBuckets.set(key, current);
  });
  const invoiceSummary = [...invoiceBuckets.entries()]
    .sort((left, right) => left[1].dueDate.localeCompare(right[1].dueDate))
    .slice(0, 3)
    .map(([key, bucket]) => {
      const label = key.split('|')[0];
      return `${label} ${shortDate(bucket.dueDate)} · ${moneyCompact(bucket.amount)}`;
    })
    .join(' · ');

  const overdueDates = overdue.map((item) => item.dueDate.slice(0, 10)).filter(Boolean).sort();
  const upcomingDates = upcoming.map((item) => item.dueDate.slice(0, 10)).filter(Boolean).sort();

  const groups = ([
    {
      kind: 'VENCIDOS',
      title: 'Contas vencidas',
      subtitle: overdueDates.length
        ? `${overdue.length} item(ns) · de ${shortDate(overdueDates[0])} a ${shortDate(overdueDates[overdueDates.length - 1])}`
        : 'Compromissos anteriores ainda em aberto',
      amount: overdue.reduce((sum, item) => sum + item.amount, 0),
      count: overdue.length
    },
    {
      kind: 'FATURA',
      title: invoiceBuckets.size > 1 ? `${invoiceBuckets.size} faturas agrupadas` : 'Fatura de cartão',
      subtitle: invoiceSummary || 'Uma fatura por cartão e vencimento',
      amount: invoices.reduce((sum, item) => sum + item.amount, 0),
      count: invoices.length
    },
    {
      kind: 'PRÓXIMOS',
      title: 'Próximos vencimentos',
      subtitle: upcomingDates.length
        ? `Próximo em ${shortDate(upcomingDates[0])} · até ${shortDate(upcomingDates[upcomingDates.length - 1])}`
        : 'Ordenados por vencimento',
      amount: upcoming.reduce((sum, item) => sum + item.amount, 0),
      count: upcoming.length
    }
  ] satisfies PhoenixHomeAgendaGroup[]).filter((item) => item.count > 0);

  return {
    items,
    groups,
    actionableAmount: items.reduce((sum, item) => sum + item.amount, 0),
    compatibilityCount: compatibility.length,
    invoiceBucketCount: invoiceBuckets.size
  };
}
