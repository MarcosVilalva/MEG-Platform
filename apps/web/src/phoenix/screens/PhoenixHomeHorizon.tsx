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


type FutureGlyphKind = 'calendar' | 'coins' | 'down' | 'income' | 'receipt' | 'card' | 'clock' | 'benefit' | 'pending';

function FutureGlyph({ kind }: { kind: FutureGlyphKind }) {
  if (kind === 'calendar') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M3.5 10h17"/></svg>;
  if (kind === 'coins') return <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="7" rx="6.5" ry="2.8"/><path d="M5.5 7v4c0 1.6 2.9 2.8 6.5 2.8s6.5-1.2 6.5-2.8V7"/><path d="M5.5 11v4c0 1.6 2.9 2.8 6.5 2.8s6.5-1.2 6.5-2.8v-4"/></svg>;
  if (kind === 'down') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13"/><path d="m7.8 13.8 4.2 4.2 4.2-4.2"/></svg>;
  if (kind === 'income') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6"/><path d="m7.8 10.2 4.2-4.2 4.2 4.2"/></svg>;
  if (kind === 'receipt') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if (kind === 'card') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 9h18M7 15h4"/></svg>;
  if (kind === 'clock') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.3 2"/></svg>;
  if (kind === 'benefit') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 3v7.2M5.8 3v7.2M11.2 3v7.2M5.8 7.2h5.4M8.5 10.2V21M16 3v18M16 3c2.8 1.8 3.5 5.9 0 8.2"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>;
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

export function PhoenixHomeHorizon({ current, events, targetMonth, currentRealBalance, currentBenefitBalance, onNavigate }: {
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

  return <section className="meg-home-v13-future" data-home-fidelity="reference-v13" aria-label={`Projeção financeira de ${monthLabel(targetMonth)}`}>
    <header className="meg-future-v13-heading">
      <div>
        <span>Projeção mensal</span>
        <h1>{monthLabel(targetMonth)}</h1>
        <p>O que já está previsto para comprometer ou reforçar seu caixa neste mês.</p>
      </div>
      <span className="meg-future-v13-heading-icon" aria-hidden="true"><FutureGlyph kind="calendar" /></span>
    </header>

    <section className="meg-future-v13-balance-grid" aria-label="Saldos projetados">
      <article className="opening">
        <span className="meg-future-v13-icon"><FutureGlyph kind="coins" /></span>
        <span>Saldo inicial projetado</span>
        <strong>{money.format(projectedOpening)}</strong>
        <small>Saldo real atual após os compromissos previstos antes deste mês.</small>
      </article>
      <article className={projectedClosing >= 0 ? 'closing positive' : 'closing negative'}>
        <span className="meg-future-v13-icon"><FutureGlyph kind="down" /></span>
        <span>Saldo após compromissos</span>
        <strong>{money.format(projectedClosing)}</strong>
        <small>Inclui receitas e despesas previstas do período.</small>
      </article>
    </section>

    <section className="meg-future-v13-grid" aria-label="Projeção do mês">
      <article className="income"><span className="meg-future-v13-icon"><FutureGlyph kind="income" /></span><span>Receitas previstas</span><strong>{money.format(expectedIncome)}</strong><small>{monthEvents.filter(isIncome).length.toLocaleString('pt-BR')} entrada(s)</small></article>
      <article className="commitments"><span className="meg-future-v13-icon"><FutureGlyph kind="receipt" /></span><span>Total de compromissos</span><strong>{money.format(totalCommitments)}</strong><small>{rows.length.toLocaleString('pt-BR')} compromisso(s)</small></article>
      <article className="card"><span className="meg-future-v13-icon"><FutureGlyph kind="card" /></span><span>Faturas de cartões</span><strong>{money.format(cardAmount)}</strong><small>{cardRows.length.toLocaleString('pt-BR')} fatura(s) no mês</small></article>
      <article className="pending"><span className="meg-future-v13-icon"><FutureGlyph kind="clock" /></span><span>Outras pendências</span><strong>{money.format(otherAmount)}</strong><small>{otherRows.length.toLocaleString('pt-BR')} item(ns)</small></article>
    </section>

    <article className="meg-future-v13-benefit">
      <span className="meg-future-v13-benefit-icon" aria-hidden="true"><FutureGlyph kind="benefit" /></span>
      <span><strong>Benefício Alimentação</strong><small>Fora do caixa monetário</small></span>
      <b>{money.format(benefitBalance)}</b>
    </article>

    <button className="meg-future-v13-pending-action" type="button" onClick={() => onNavigate('payables')}>
      <span className="meg-future-v13-pending-icon" aria-hidden="true"><FutureGlyph kind="pending" /></span>
      <span><strong>Principais pendências do mês</strong><small>{rows.length.toLocaleString('pt-BR')} itens previstos</small></span>
      <em>Abrir Pendentes</em>
      <b aria-hidden="true">›</b>
    </button>
  </section>;;
}
