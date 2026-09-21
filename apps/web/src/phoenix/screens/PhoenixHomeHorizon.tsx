import type { PhoenixReadModel } from '../contracts';
import { isPhoenixMonetaryEvent } from '../home-period-summary';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type EventItem = PhoenixReadModel['events']['items'][number];

type ProjectionRow = {
  key: string;
  date: string;
  title: string;
  subtitle: string;
  amount: number;
  kind: 'card' | 'pending';
};

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function monthBounds(value: string) {
  const [year, month] = value.split('-').map(Number);
  return {
    start: `${value}-01`,
    end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}

function shortDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}` : value;
}

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function signedAmount(event: EventItem) {
  const signed = Number(event.signedAmount || 0);
  if (Number.isFinite(signed) && signed !== 0) return signed;
  const amount = Math.abs(Number(event.amount || 0));
  return event.type === 'income' || event.type === 'redemption' ? amount : -amount;
}

function isIncome(event: EventItem) {
  return event.type === 'income' || event.type === 'redemption';
}

function isOpenPlanned(event: EventItem) {
  return event.status === 'planned' && isPhoenixMonetaryEvent(event);
}

function cardLabel(event: EventItem) {
  const reference = `${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''} ${event.sourceDetails?.modality || ''}`.trim();
  const normalized = normalize(reference);
  if (!normalized.includes('cartao') && !normalized.includes('credito')) return null;
  if (normalized.includes('latam')) return 'LATAM PASS';
  if (normalized.includes('meli') || normalized.includes('mercado livre') || normalized.includes('mercado pago') || normalized.includes('cartao ml')) return 'MELI';
  if (normalized.includes('azul')) return 'AZUL';
  if (normalized.includes('riachuelo') || normalized.includes('midway')) return 'RIACHUELO';
  return (event.paymentMethod?.name || event.sourceDetails?.paymentMethod || 'Cartão')
    .replace(/cart[aã]o/ig, '')
    .replace(/cr[eé]dito/ig, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Cartão';
}

function buildRows(events: EventItem[]) {
  const rows: ProjectionRow[] = [];
  const cardBuckets = new Map<string, ProjectionRow>();

  events.forEach((event) => {
    const signed = signedAmount(event);
    if (isIncome(event) || signed >= 0) return;
    const date = String(event.date).slice(0, 10);
    const card = cardLabel(event);
    if (card) {
      const key = `${card}|${date}`;
      const current = cardBuckets.get(key) || {
        key,
        date,
        title: `Fatura ${card}`,
        subtitle: 'Compras do cartão agrupadas pelo vencimento',
        amount: 0,
        kind: 'card' as const,
      };
      current.amount += -signed;
      cardBuckets.set(key, current);
      return;
    }
    rows.push({
      key: event.id,
      date,
      title: event.description,
      subtitle: event.category?.group || event.category?.name || event.sourceDetails?.expenseClass || 'Pendência prevista',
      amount: -signed,
      kind: 'pending',
    });
  });

  return [...cardBuckets.values(), ...rows]
    .sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title, 'pt-BR'));
}

export function PhoenixHomeHorizon({ current, events, targetMonth, currentRealBalance, currentBenefitBalance, onNavigate, onOpenPeriod }: {
  current: PhoenixReadModel;
  events: PhoenixReadModel['events']['items'];
  targetMonth: string;
  currentRealBalance?: number;
  currentBenefitBalance?: number;
  onNavigate: (view: 'home' | 'movements' | 'history' | 'payables' | 'cards' | 'catalogs' | 'users' | 'settings' | 'receivables' | 'revenues' | 'cashflow' | 'reconcile' | 'analytics' | 'decisions' | 'budgets') => void;
  onOpenPeriod?: () => void;
}) {
  const { start, end } = monthBounds(targetMonth);
  const baseBalance = typeof currentRealBalance === 'number' && Number.isFinite(currentRealBalance)
    ? currentRealBalance
    : Number(current.summary.availableBalance || 0) + Number(current.summary.realizedResult || 0);

  const planned = events
    .filter(isOpenPlanned)
    .filter((event) => String(event.date).slice(0, 10) <= end);

  const beforeMonth = planned.filter((event) => String(event.date).slice(0, 10) < start);
  const monthEvents = planned.filter((event) => {
    const date = String(event.date).slice(0, 10);
    return date >= start && date <= end;
  });

  const projectedOpening = baseBalance + beforeMonth.reduce((sum, event) => sum + signedAmount(event), 0);
  const expectedIncome = monthEvents
    .filter(isIncome)
    .reduce((sum, event) => sum + Math.max(0, signedAmount(event)), 0);
  const expectedExpense = monthEvents
    .filter((event) => !isIncome(event))
    .reduce((sum, event) => sum + Math.max(0, -signedAmount(event)), 0);
  const expenseReversals = monthEvents
    .filter((event) => !isIncome(event))
    .reduce((sum, event) => sum + Math.max(0, signedAmount(event)), 0);
  const totalCommitments = Math.max(0, expectedExpense - expenseReversals);
  const projectedClosing = projectedOpening + expectedIncome - totalCommitments;
  const rows = buildRows(monthEvents);
  const cardRows = rows.filter((item) => item.kind === 'card');
  const otherRows = rows.filter((item) => item.kind === 'pending');
  const cardAmount = cardRows.reduce((sum, item) => sum + item.amount, 0);
  const otherAmount = otherRows.reduce((sum, item) => sum + item.amount, 0);
  const benefitBalance = typeof currentBenefitBalance === 'number' && Number.isFinite(currentBenefitBalance)
    ? currentBenefitBalance
    : Number(current.summary.benefitBalance || 0);

  return <section className="px-home-future" aria-label={`Projeção financeira de ${monthLabel(targetMonth)}`}>
    <header className="px-period-mobile-head">
      <div>
        <span className="px-kicker">Projeção mensal</span>
        <h1>{monthLabel(targetMonth)}</h1>
        <p>O que já está previsto para comprometer ou reforçar seu caixa neste mês.</p>
      </div>
      {onOpenPeriod ? <button type="button" onClick={onOpenPeriod}>Alterar período</button> : null}
    </header>

    <article className="px-future-balance-card">
      <div><span>Saldo inicial projetado</span><strong>{money.format(projectedOpening)}</strong><small>Saldo real atual após os compromissos previstos antes deste mês.</small></div>
      <div className={projectedClosing >= 0 ? 'closing positive' : 'closing negative'}><span>Saldo após compromissos</span><strong>{money.format(projectedClosing)}</strong><small>Inclui receitas e despesas previstas do período.</small></div>
    </article>

    <section className="px-future-kpis" aria-label="Projeção do mês">
      <article className="income"><span>Receitas previstas</span><strong>{money.format(expectedIncome)}</strong><small>{monthEvents.filter(isIncome).length.toLocaleString('pt-BR')} entrada(s)</small></article>
      <article className="expense"><span>Total de compromissos</span><strong>{money.format(totalCommitments)}</strong><small>{rows.length.toLocaleString('pt-BR')} compromisso(s)</small></article>
      <article className="card"><span>Faturas de cartões</span><strong>{money.format(cardAmount)}</strong><small>{cardRows.length.toLocaleString('pt-BR')} fatura(s) no mês</small></article>
      <article className="pending"><span>Outras pendências</span><strong>{money.format(otherAmount)}</strong><small>{otherRows.length.toLocaleString('pt-BR')} item(ns)</small></article>
    </section>

    <article className="px-future-benefit-card">
      <div><span>Benefício Alimentação</span><strong>Fora do caixa monetário</strong><small>Saldo atual de referência, acompanhado separadamente da projeção monetária.</small></div>
      <b>{money.format(benefitBalance)}</b>
    </article>

    <section className="px-future-pending-board">
      <header>
        <div><span className="px-kicker">Pendências do mês</span><h2>Compromissos previstos</h2></div>
        <button type="button" onClick={() => onNavigate('payables')}>Abrir Pendentes</button>
      </header>
      <div className="px-future-pending-list">
        {rows.slice(0, 8).map((item) => <button key={item.key} type="button" onClick={() => onNavigate(item.kind === 'card' ? 'cards' : 'payables')}>
          <span className={item.kind} aria-hidden="true">{item.kind === 'card' ? '▣' : '!'}</span>
          <div><strong>{item.title}</strong><small>{shortDate(item.date)} · {item.subtitle}</small></div>
          <b>{money.format(item.amount)}</b>
        </button>)}
        {!rows.length ? <div className="px-future-empty"><strong>Nenhum compromisso previsto neste mês</strong><span>A projeção será atualizada assim que novos lançamentos ou faturas forem cadastrados.</span></div> : null}
      </div>
      {rows.length > 8 ? <footer><button type="button" onClick={() => onNavigate('payables')}>Ver todos os {rows.length.toLocaleString('pt-BR')} compromissos</button></footer> : null}
    </section>

    <button className="px-period-open-movements" type="button" onClick={() => onNavigate('movements')}>
      Abrir lançamentos de {monthLabel(targetMonth)}
    </button>
  </section>;
}
