import type { PhoenixReadModel } from '../contracts';
import { isPhoenixMonetaryEvent } from '../home-period-summary';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type HomePeriodContext = {
  label: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  currentRealBalance: number;
};

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function posted(status: string) {
  return ['paid', 'reconciled', 'confirmed'].includes(status);
}

function signedAmount(event: PhoenixReadModel['events']['items'][number]) {
  const signed = Number(event.signedAmount || 0);
  if (Number.isFinite(signed) && signed !== 0) return signed;
  const amount = Math.abs(Number(event.amount || 0));
  return event.type === 'income' || event.type === 'redemption' ? amount : -amount;
}

function isIncome(event: PhoenixReadModel['events']['items'][number]) {
  return event.type === 'income' || event.type === 'redemption';
}

type PastGlyphKind = 'income' | 'expense' | 'result' | 'coins' | 'wallet' | 'paid' | 'benefit' | 'history';

function PastGlyph({ kind }: { kind: PastGlyphKind }) {
  if (kind === 'income') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6"/><path d="m7.8 10.2 4.2-4.2 4.2 4.2"/></svg>;
  if (kind === 'expense') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13"/><path d="m7.8 13.8 4.2 4.2 4.2-4.2"/></svg>;
  if (kind === 'result') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="13" width="3" height="7" rx="1"/><rect x="10.5" y="9" width="3" height="11" rx="1"/><rect x="17" y="4" width="3" height="16" rx="1"/></svg>;
  if (kind === 'coins') return <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="7" rx="6.5" ry="2.8"/><path d="M5.5 7v4c0 1.6 2.9 2.8 6.5 2.8s6.5-1.2 6.5-2.8V7"/><path d="M5.5 11v4c0 1.6 2.9 2.8 6.5 2.8s6.5-1.2 6.5-2.8v-4"/></svg>;
  if (kind === 'wallet') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h12.2A2.8 2.8 0 0 1 20 9.8v8.4A2.8 2.8 0 0 1 17.2 21H5a2.8 2.8 0 0 1-2.8-2.8V6.5A2.5 2.5 0 0 1 4.7 4H16"/><path d="M15.2 11.2H21v4.6h-5.8a2.3 2.3 0 1 1 0-4.6Z"/></svg>;
  if (kind === 'paid') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.2 2.3 4.9-5"/></svg>;
  if (kind === 'benefit') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 3v7.2M5.8 3v7.2M11.2 3v7.2M5.8 7.2h5.4M8.5 10.2V21M16 3v18M16 3c2.8 1.8 3.5 5.9 0 8.2"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
}

export function PhoenixHomePastMonth({ data, month, periodContext, onNavigate }: {
  data: PhoenixReadModel;
  month: string;
  periodContext: HomePeriodContext | null;
  onNavigate: (view: 'home' | 'movements' | 'history' | 'payables' | 'cards' | 'catalogs' | 'users' | 'settings' | 'receivables' | 'revenues' | 'cashflow' | 'reconcile' | 'analytics' | 'decisions' | 'budgets') => void;
  onOpenPeriod?: () => void;
}) {
  const realized = data.events.items
    .filter((event) => String(event.competence || event.date.slice(0, 7)) === month)
    .filter((event) => posted(event.status))
    .filter(isPhoenixMonetaryEvent);

  let realizedIncome = 0;
  let realizedExpense = 0;
  let paidCount = 0;
  let paidAmount = 0;

  for (const event of realized) {
    const signed = signedAmount(event);
    if (isIncome(event)) {
      realizedIncome += signed;
      continue;
    }
    realizedExpense += -signed;
    if (signed < 0) {
      paidCount += 1;
      paidAmount += -signed;
    }
  }

  const openingBalance = Number(periodContext?.openingBalance ?? data.cashflow.openingBalance ?? 0);
  const closingBalance = Number(periodContext?.closingBalance ?? (openingBalance + realizedIncome - realizedExpense));
  const result = realizedIncome - realizedExpense;
  const benefitBalance = Number(data.summary.benefitBalance || 0);

  return <section className="meg-home-v13-past" data-home-fidelity="reference-v13" aria-label={`Resumo financeiro de ${monthLabel(month)}`}>
    <header className="meg-past-v13-heading">
      <div>
        <span>Resumo do mês</span>
        <h1>{monthLabel(month)}</h1>
        <p>Veja como foi o seu mês em uma visão simples.</p>
      </div>
      <span className="meg-past-v13-heading-icon" aria-hidden="true"><PastGlyph kind="result" /></span>
    </header>

    <section className="meg-past-v13-grid" aria-label="Resumo do mês">
      <article className="income"><span className="meg-past-v13-icon"><PastGlyph kind="income" /></span><span>Receitas realizadas</span><strong>{money.format(realizedIncome)}</strong></article>
      <article className="expense"><span className="meg-past-v13-icon"><PastGlyph kind="expense" /></span><span>Despesas realizadas</span><strong>{money.format(realizedExpense)}</strong></article>
      <article className={`result ${result >= 0 ? 'positive' : 'negative'}`}><span className="meg-past-v13-icon"><PastGlyph kind="result" /></span><span>Resultado do mês</span><strong>{result > 0 ? '+' : ''}{money.format(result)}</strong></article>
      <article className="opening"><span className="meg-past-v13-icon"><PastGlyph kind="coins" /></span><span>Saldo inicial</span><strong>{money.format(openingBalance)}</strong></article>
      <article className="closing"><span className="meg-past-v13-icon"><PastGlyph kind="wallet" /></span><span>Saldo final</span><strong>{money.format(closingBalance)}</strong></article>
      <article className="paid"><span className="meg-past-v13-icon"><PastGlyph kind="paid" /></span><span>Contas pagas</span><strong>{paidCount.toLocaleString('pt-BR')} contas</strong><small>{money.format(paidAmount)}</small></article>
    </section>

    <button className="meg-past-v13-benefit" type="button" onClick={() => onNavigate('movements')}>
      <span className="meg-past-v13-benefit-icon" aria-hidden="true"><PastGlyph kind="benefit" /></span>
      <span><strong>Benefício Alimentação</strong><small>Saldo final do mês</small><b>{money.format(benefitBalance)}</b></span>
      <em aria-hidden="true">›</em>
    </button>

    <button className="meg-past-v13-action" type="button" onClick={() => onNavigate('movements')}>
      <span className="meg-past-v13-action-icon" aria-hidden="true"><PastGlyph kind="history" /></span>
      <strong>Ver lançamentos de {monthLabel(month).replace(/ de \d{4}$/,'')}</strong>
      <em aria-hidden="true">›</em>
    </button>
  </section>;;
}
