import { useMemo, useState } from 'react';
import type { Payable } from '../../app/payables-client';
import type { PhoenixReadModel } from '../contracts';
import '../phoenix-screens.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

type Priority = 'all' | 'overdue' | 'today' | 'upcoming';
type PendingItem = {
  id: string;
  source: 'payable' | 'event';
  description: string;
  dueDate: string;
  openAmount: number;
  installmentNo: number;
  installmentQty: number;
  categoryName: string;
  group: string;
  paymentMethod: string;
  modality: string;
};

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function isoDay(value: string | Date) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function installmentFromDescription(description: string) {
  const match = description.match(/(?:^|\s)(\d+)\s*\/\s*(\d+)\s*$/);
  if (!match) return { no: 1, qty: 1 };
  return { no: Number(match[1]) || 1, qty: Number(match[2]) || 1 };
}

function payableItem(item: Payable): PendingItem {
  return {
    id: `payable-${item.id}`,
    source: 'payable',
    description: item.description,
    dueDate: isoDay(item.dueDate),
    openAmount: Number(item.openAmount || 0),
    installmentNo: item.installmentNo || 1,
    installmentQty: item.installmentQty || 1,
    categoryName: item.category?.group || item.category?.name || 'Sem classificação',
    group: item.category?.name || 'Sem grupo',
    paymentMethod: 'Conta a pagar',
    modality: '—'
  };
}

function eventItems(data: PhoenixReadModel): PendingItem[] {
  return data.events.items
    .filter((event) => event.competence === data.month)
    .filter((event) => event.type === 'expense' && event.status === 'planned')
    .filter((event) => normalize(event.account?.type) !== 'benefit')
    .filter((event) => !normalize(`${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''} ${event.description}`).includes('verocard'))
    .map((event) => {
      const installment = installmentFromDescription(event.description);
      return {
        id: `event-${event.id}`,
        source: 'event' as const,
        description: event.description,
        dueDate: isoDay(event.date),
        openAmount: -Number(event.signedAmount || 0),
        installmentNo: installment.no,
        installmentQty: installment.qty,
        categoryName: event.sourceDetails?.expenseClass || event.category?.group || event.category?.name || 'Sem classificação',
        group: event.sourceDetails?.group || event.category?.name || 'Sem grupo',
        paymentMethod: event.sourceDetails?.paymentMethod || event.paymentMethod?.name || 'Não informada',
        modality: event.sourceDetails?.modality || '—'
      };
    });
}

function signature(item: PendingItem) {
  return `${normalize(item.description)}|${item.dueDate}|${Math.abs(item.openAmount).toFixed(2)}`;
}

export function PhoenixPayables({ data }: { data: PhoenixReadModel }) {
  const today = todaySaoPaulo();
  const [priority, setPriority] = useState<Priority>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const open = useMemo(() => {
    const official = data.payables
      .filter((item) => !['paid', 'cancelled'].includes(item.status) && Number(item.openAmount) > 0)
      .map(payableItem);
    const seen = new Set(official.map(signature));
    const compatibility = eventItems(data).filter((item) => {
      const key = signature(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...official, ...compatibility].sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.description.localeCompare(right.description, 'pt-BR'));
  }, [data]);

  const actionable = open.filter((item) => item.openAmount > 0);
  const overdue = actionable.filter((item) => item.dueDate < today);
  const dueToday = actionable.filter((item) => item.dueDate === today);
  const upcoming = actionable.filter((item) => item.dueDate > today);
  const total = open.reduce((sum, item) => sum + item.openAmount, 0);

  const visible = useMemo(() => open.filter((item) => {
    const actionableItem = item.openAmount > 0;
    const matchesPriority = priority === 'all'
      || (priority === 'overdue' && actionableItem && item.dueDate < today)
      || (priority === 'today' && actionableItem && item.dueDate === today)
      || (priority === 'upcoming' && actionableItem && item.dueDate > today);
    const haystack = normalize(`${item.description} ${item.categoryName} ${item.group} ${item.paymentMethod} ${item.modality}`);
    return matchesPriority && haystack.includes(normalize(search));
  }), [open, priority, search, today]);

  const grouped = visible.reduce<Record<string, PendingItem[]>>((acc, item) => {
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});

  const selectedItems = actionable.filter((item) => selected.has(item.id));
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.openAmount, 0);
  const available = data.summary.availableBalance + data.summary.realizedResult;
  const compatibilityCount = open.filter((item) => item.source === 'event').length;
  const adjustmentCount = open.filter((item) => item.openAmount < 0).length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return <section className="px-screen">
    <header className="px-screen-head">
      <div><span className="px-kicker">Pendentes</span><h1>Prioridades e compromissos</h1><p>Organize o que precisa de ação agora e simule a baixa sem alterar a base.</p></div>
      <div className="px-screen-head-aside"><span className="px-total-pill">{money.format(total)} pendente</span></div>
    </header>

    <section className="px-screen-kpis">
      <article><span>Total pendente líquido</span><strong>{money.format(total)}</strong><small>{actionable.length} compromisso(s){adjustmentCount ? ` · ${adjustmentCount} ajuste(s)` : ''}</small></article>
      <article className="danger"><span>Vencidos</span><strong>{overdue.length}</strong><small>Prioridade máxima</small></article>
      <article className="warn"><span>Vencem hoje</span><strong>{dueToday.length}</strong><small>Ação imediata</small></article>
      <article><span>Próximos vencimentos</span><strong>{upcoming.length}</strong><small>Agenda ativa</small></article>
    </section>

    <div className="px-priority-tabs">{([['all','Todos'],['overdue','Vencidos'],['today','Hoje'],['upcoming','Próximos']] as const).map(([id,label]) => <button key={id} type="button" className={priority === id ? 'active' : ''} onClick={() => setPriority(id)}>{label}</button>)}</div>

    <div className="px-pending-layout">
      <section className="px-card px-pending-list">
        <div className="px-toolbar">
          <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar compromisso, grupo ou forma de pagamento" /></label>
          <span className="px-toolbar-note">{visible.length} de {open.length} exibido(s)</span>
        </div>
        {compatibilityCount > 0 ? <div className="px-history-source-note"><strong>Leitura consolidada:</strong> despesas planejadas do período entram em Pendentes enquanto o domínio novo de contas a pagar é migrado. Estornos permanecem como ajustes negativos e não ficam disponíveis para baixa.</div> : null}
        {Object.entries(grouped).map(([group, items]) => <section className="px-pending-group" key={group}>
          <header><div><strong>{group}</strong><small>{items.length} item(ns)</small></div><strong>{money.format(items.reduce((sum, item) => sum + item.openAmount, 0))}</strong></header>
          {items.map((item) => {
            const adjustment = item.openAmount < 0;
            const late = adjustment ? 0 : item.dueDate < today ? Math.max(1, Math.floor((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${item.dueDate}T12:00:00Z`).getTime()) / 86400000)) : 0;
            const credit = normalize(item.modality).includes('credito') || normalize(item.paymentMethod).includes('cartao');
            return <label className={`px-pending-row ${adjustment ? 'is-adjustment' : ''}`} key={item.id}>
              <input type="checkbox" disabled={adjustment} checked={!adjustment && selected.has(item.id)} onChange={() => toggle(item.id)} />
              <div className="px-pending-date"><strong>{date.format(new Date(`${item.dueDate}T12:00:00Z`))}</strong><small>{adjustment ? 'Ajuste de estorno' : late ? `${late} dia(s) em atraso` : item.dueDate === today ? 'Vence hoje' : 'Programado'}</small></div>
              <div className="px-pending-copy"><strong>{item.description}</strong><small>{item.installmentQty > 1 ? `Parcela ${item.installmentNo}/${item.installmentQty}` : 'Pagamento único'} · {item.categoryName} · {item.paymentMethod}</small></div>
              <strong className={`px-pending-amount ${adjustment ? 'positive' : ''}`}>{money.format(item.openAmount)}</strong>
              <span className={`px-status ${adjustment ? 'reconciled' : late ? 'overdue' : 'planned'}`}>{adjustment ? 'ESTORNO' : credit ? 'CARTÃO' : late ? 'VENCIDO' : 'PENDENTE'}</span>
              <button type="button" className="px-detail-btn" aria-label={`Detalhes de ${item.description}`}>↘</button>
            </label>;
          })}
        </section>)}
        {!visible.length ? <p className="px-empty">Nenhum compromisso corresponde ao filtro.</p> : null}
      </section>

      <aside className="px-card px-payment-summary">
        <div className="px-panel-head"><div><span>Baixa protegida</span><h2>Simulação</h2></div><span className="px-status reconciled">ATIVA</span></div>
        <dl>
          <div><dt>Saldo monetário disponível</dt><dd>{money.format(available)}</dd></div>
          <div><dt>Total pendente líquido</dt><dd>{money.format(total)}</dd></div>
          <div><dt>Itens selecionados</dt><dd>{selected.size}</dd></div>
          <div><dt>Valor selecionado</dt><dd>{money.format(selectedTotal)}</dd></div>
          <div className="emphasis"><dt>Saldo previsto após a baixa</dt><dd>{money.format(available - selectedTotal)}</dd></div>
        </dl>
        <div className={`px-protection-note ${selectedTotal > available ? 'danger' : ''}`}>{selectedTotal > available ? 'A seleção ultrapassa o saldo monetário disponível. A baixa deverá permanecer bloqueada.' : 'Simulação segura: nenhum valor foi gravado. Benefícios continuam fora do saldo monetário e estornos não podem ser baixados como despesa.'}</div>
        <button className="px-primary-action" type="button" disabled>Revisar e confirmar baixa</button>
        <small className="px-readonly-hint">Gravação desabilitada durante a fase de paridade Phoenix.</small>
      </aside>
    </div>
  </section>;
}
