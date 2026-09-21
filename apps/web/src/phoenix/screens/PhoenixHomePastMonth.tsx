import type { PhoenixReadModel } from '../contracts';
import { isPhoenixBenefitEvent } from '../home-period-summary';

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

export function PhoenixHomePastMonth({ data, month, periodContext, onNavigate, onOpenPeriod }: {
  data: PhoenixReadModel;
  month: string;
  periodContext: HomePeriodContext | null;
  onNavigate: (view: 'home' | 'movements' | 'history' | 'payables' | 'cards' | 'catalogs' | 'users' | 'settings' | 'receivables' | 'revenues' | 'cashflow' | 'reconcile' | 'analytics' | 'decisions' | 'budgets') => void;
  onOpenPeriod?: () => void;
}) {
  const realized = data.events.items
    .filter((event) => String(event.competence || event.date.slice(0, 7)) === month)
    .filter((event) => posted(event.status))
    .filter((event) => !isPhoenixBenefitEvent(event));

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

  return <section className="px-home-past" aria-label={`Resumo financeiro de ${monthLabel(month)}`}>
    <header className="px-period-mobile-head">
      <div>
        <span className="px-kicker">Mês encerrado</span>
        <h1>{monthLabel(month)}</h1>
        <p>Fotografia simples do que aconteceu no mês.</p>
      </div>
      {onOpenPeriod ? <button type="button" onClick={onOpenPeriod}>Alterar período</button> : null}
    </header>

    <article className="px-past-balance-card">
      <div><span>Saldo inicial</span><strong>{money.format(openingBalance)}</strong></div>
      <span className="px-past-balance-arrow" aria-hidden="true">→</span>
      <div className="closing"><span>Saldo final</span><strong>{money.format(closingBalance)}</strong></div>
    </article>

    <section className="px-past-kpis" aria-label="Resumo do mês">
      <article className="income"><span>Receitas realizadas</span><strong>{money.format(realizedIncome)}</strong></article>
      <article className="expense"><span>Despesas realizadas</span><strong>{money.format(realizedExpense)}</strong></article>
      <article className={result >= 0 ? 'result positive' : 'result negative'}><span>Resultado do mês</span><strong>{result > 0 ? '+' : ''}{money.format(result)}</strong></article>
      <article className="paid"><span>Contas pagas</span><strong>{money.format(paidAmount)}</strong><small>{paidCount.toLocaleString('pt-BR')} lançamento(s) pago(s)</small></article>
    </section>

    <article className="px-past-benefit-card">
      <div><span>Benefício Alimentação</span><strong>Saldo final do mês</strong><small>Separado do caixa monetário.</small></div>
      <b>{money.format(benefitBalance)}</b>
    </article>

    <button className="px-period-open-movements" type="button" onClick={() => onNavigate('movements')}>
      Abrir lançamentos de {monthLabel(month)}
    </button>
  </section>;
}
