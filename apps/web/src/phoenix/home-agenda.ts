import type { PhoenixReadModel } from './contracts';

export type PhoenixHomeAgendaItem = {
  id: string;
  source: 'payable' | 'event';
  description: string;
  dueDate: string;
  amount: number;
  meta: string;
  kind: 'VENCIDO' | 'FATURA' | 'PRÓXIMO';
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
      const paymentReference = `${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''} ${event.sourceDetails?.modality || ''}`;
      const card = normalize(paymentReference).includes('cartao') || normalize(paymentReference).includes('credito');
      return {
        id: `event-${event.id}`,
        source: 'event' as const,
        description: event.description,
        dueDate,
        amount,
        meta: event.sourceDetails?.expenseClass || event.category?.group || event.category?.name || 'Lançamento planejado',
        kind: dueDate < today ? 'VENCIDO' as const : card ? 'FATURA' as const : 'PRÓXIMO' as const
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
  const groups = ([
    {
      kind: 'VENCIDOS',
      title: 'Compromissos anteriores',
      subtitle: 'Agrupados por data de vencimento',
      amount: byKind('VENCIDO').reduce((sum, item) => sum + item.amount, 0),
      count: byKind('VENCIDO').length
    },
    {
      kind: 'FATURA',
      title: 'Compras do mesmo cartão',
      subtitle: 'Uma fatura por cartão e vencimento',
      amount: byKind('FATURA').reduce((sum, item) => sum + item.amount, 0),
      count: byKind('FATURA').length
    },
    {
      kind: 'PRÓXIMOS',
      title: 'Demais compromissos do período',
      subtitle: 'Ordenados por vencimento',
      amount: byKind('PRÓXIMO').reduce((sum, item) => sum + item.amount, 0),
      count: byKind('PRÓXIMO').length
    }
  ] satisfies PhoenixHomeAgendaGroup[]).filter((item) => item.count > 0);

  return {
    items,
    groups,
    actionableAmount: items.reduce((sum, item) => sum + item.amount, 0),
    compatibilityCount: compatibility.length
  };
}
