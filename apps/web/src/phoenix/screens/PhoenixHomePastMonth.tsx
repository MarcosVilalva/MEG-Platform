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

  return <section className="meg-home-v12 meg-home-v12-past" data-home-fidelity="approved-v12" aria-label={`Resumo financeiro de ${monthLabel(month)}`}>
    <header className="meg-home-v12-heading">
      <span>RESUMO DO MÊS</span>
      <h1>{monthLabel(month)}</h1>
      <p>Veja como foi o seu mês em uma visão simples.</p>
    </header>

    <section className="meg-home-v12-grid meg-home-v12-past-grid" aria-label="Resumo do mês">
      <article className="meg-home-v12-metric income"><span>Receitas realizadas</span><strong>{money.format(realizedIncome)}</strong></article>
      <article className="meg-home-v12-metric expense"><span>Despesas realizadas</span><strong>{money.format(realizedExpense)}</strong></article>
      <article className={`meg-home-v12-metric result ${result >= 0 ? 'positive' : 'negative'}`}><span>Resultado do mês</span><strong>{result > 0 ? '+' : ''}{money.format(result)}</strong></article>
      <article className="meg-home-v12-metric neutral"><span>Saldo inicial</span><strong>{money.format(openingBalance)}</strong></article>
      <article className="meg-home-v12-metric balance"><span>Saldo final</span><strong>{money.format(closingBalance)}</strong></article>
      <article className="meg-home-v12-metric paid"><span>Contas pagas</span><strong>{paidCount.toLocaleString('pt-BR')} contas</strong><small>{money.format(paidAmount)}</small></article>
    </section>

    <button className="meg-home-v12-benefit" type="button" onClick={() => onNavigate('movements')}>
      <span><small>BENEFÍCIO ALIMENTAÇÃO</small><strong>Saldo final do mês</strong></span>
      <b>{money.format(benefitBalance)}</b>
      <em aria-hidden="true">›</em>
    </button>

    <button className="meg-home-v12-wide-action" type="button" onClick={() => onNavigate('movements')}>
      <span>Ver lançamentos de {monthLabel(month)}</span><b aria-hidden="true">›</b>
    </button>
  </section>;
}
