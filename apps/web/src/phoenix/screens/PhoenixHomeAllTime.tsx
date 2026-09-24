import { useEffect, useMemo, useState } from 'react';
import type { PhoenixReadModel } from '../contracts';
import { buildPhoenixAllTimeHomeSummary, isPhoenixBenefitEvent } from '../home-period-summary';
import { PhoenixProfileAvatar, hydratePhoenixAvatarPreference, readPhoenixAvatarPreference, type PhoenixAvatarPreference } from '../profile-avatar';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type PeriodMode = 'month' | 'range' | 'all';
type HomePeriodContext = {
  label: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  currentRealBalance: number;
};

function formatIso(value: string | null) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function signedClass(value: number) {
  if (value > 0) return 'is-positive';
  if (value < 0) return 'is-negative';
  return 'is-neutral';
}

function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function currentMonthKey() {
  return todayIso().slice(0, 7);
}

function monthEnd(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function nextMonthKey(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
}

function openEventAmount(event: PhoenixReadModel['events']['items'][number]) {
  const signed = Number(event.signedAmount || 0);
  return Math.abs(Number.isFinite(signed) && signed !== 0 ? signed : Number(event.amount || 0));
}

export function PhoenixHomeAllTime({ data, mode = 'all', periodLabel = 'Tudo', periodContext, onNavigate, onOpenPeriod, onLaunch }: {
  data: PhoenixReadModel;
  mode?: PeriodMode;
  periodLabel?: string;
  periodContext?: HomePeriodContext | null;
  onNavigate: (view: 'home' | 'movements' | 'history' | 'payables') => void;
  onOpenPeriod?: () => void;
  onLaunch?: (preset: 'expense' | 'income' | 'benefit') => void;
}) {
  const summary = buildPhoenixAllTimeHomeSummary(data);
  const isAll = mode === 'all';
  const periodOpening = periodContext?.openingBalance ?? Number(data.cashflow.openingBalance || 0);
  const periodClosing = periodContext?.closingBalance ?? Number(data.cashflow.realizedClosing || 0);
  const currentRealBalance = periodContext?.currentRealBalance ?? summary.currentMonetaryBalance;
  const periodResult = periodClosing - periodOpening;
  const displayedResult = isAll ? summary.realizedResult : periodResult;
  const variationToToday = currentRealBalance - periodClosing;
  const firstDate = periodContext?.startDate ?? summary.firstDate;
  const lastDate = periodContext?.endDate ?? summary.lastDate;
  const title = isAll ? 'Histórico completo' : 'Resumo do período';
  const kicker = isAll ? 'Visão geral · Tudo' : `Visão geral · ${periodLabel}`;
  const [benefitOpen, setBenefitOpen] = useState(false);
  const [avatar, setAvatar] = useState<PhoenixAvatarPreference>(() => readPhoenixAvatarPreference(data.user.id));
  useEffect(() => {
    let active = true;
    const syncAvatar = () => setAvatar(readPhoenixAvatarPreference(data.user.id));
    void hydratePhoenixAvatarPreference(data.user.id).then((preference) => { if (active) setAvatar(preference); });
    window.addEventListener('meg:profile-avatar-changed', syncAvatar);
    return () => { active = false; window.removeEventListener('meg:profile-avatar-changed', syncAvatar); };
  }, [data.user.id]);
  const displayNameParts = String(data.user.name || 'MEG').trim().split(/\\s+/);
  const displayName = displayNameParts.length > 1 ? displayNameParts[0] + ' ' + displayNameParts[displayNameParts.length - 1] : displayNameParts[0];
  const openExpenses = useMemo(() => data.events.items.filter((event) => event.type === 'expense' && !isPhoenixBenefitEvent(event) && !['paid', 'reconciled', 'confirmed', 'cancelled'].includes(String(event.status))).sort((a, b) => String(a.date).localeCompare(String(b.date))), [data.events.items]);
  const today = todayIso();
  const thisMonth = currentMonthKey();
  const thisMonthEnd = monthEnd(thisMonth);
  const nextMonth = nextMonthKey(thisMonth);
  const openNow = openExpenses.filter((event) => String(event.date).slice(0, 10) <= thisMonthEnd);
  const openNowAmount = openNow.reduce((sum, event) => sum + openEventAmount(event), 0);
  const nextDue = openExpenses.find((event) => String(event.date).slice(0, 10) >= today) || null;
  const nextMonthExpenses = openExpenses.filter((event) => String(event.date).slice(0, 7) === nextMonth);
  const nextMonthAmount = nextMonthExpenses.reduce((sum, event) => sum + openEventAmount(event), 0);
  const benefitEvents = useMemo(() => data.events.items
    .filter(isPhoenixBenefitEvent)
    .filter((event) => ['paid', 'reconciled', 'confirmed'].includes(String(event.status)))
    .sort((left, right) => String(left.date).localeCompare(String(right.date))), [data.events.items]);
  const benefitCredits = summary.benefitCredits;
  const benefitSpent = summary.benefitUsed;
  const benefitOpening = Number(summary.benefitBalance || 0) - benefitCredits + benefitSpent;
  const historyStartMonth = summary.firstDate ? summary.firstDate.slice(0, 7) : thisMonth;
  const historyEndMonth = summary.lastDate ? summary.lastDate.slice(0, 7) : thisMonth;
  const [historyStartYear, historyStartMonthNumber] = historyStartMonth.split('-').map(Number);
  const [historyEndYear, historyEndMonthNumber] = historyEndMonth.split('-').map(Number);
  const historyMonthCount = Math.max(1, (historyEndYear - historyStartYear) * 12 + historyEndMonthNumber - historyStartMonthNumber + 1);
  const averageMonthlyIncome = summary.realizedIncome / historyMonthCount;
  const averageMonthlyExpense = summary.realizedExpense / historyMonthCount;
  const benefitEvolution = benefitEvents.reduce<Array<{ id: string; date: string; description: string; amount: number; balance: number }>>((rows, event) => {
    const rawSigned = Number(event.signedAmount);
    const fallbackAmount = Math.abs(Number(event.amount || 0));
    const amount = Number.isFinite(rawSigned) && rawSigned !== 0
      ? rawSigned
      : event.type === 'income' || event.type === 'redemption' ? fallbackAmount : -fallbackAmount;
    const previous = rows.length ? rows[rows.length - 1].balance : benefitOpening;
    rows.push({ id: event.id, date: String(event.date).slice(0, 10), description: event.description || 'Movimentação do benefício', amount, balance: previous + amount });
    return rows;
  }, []);

  return <>
  <section className={"px-home-alltime px-home-approved " + (isAll ? "is-modern-all" : "is-period-range")} data-home-alltime-layout="compact-command-v7">
    <header className="px-alltime-profile-head">
      <div className="px-alltime-profile"><PhoenixProfileAvatar preference={avatar} name={data.user.name} className="px-alltime-profile-avatar" /><span><small>MEG FINANÇAS</small><strong>{data.user.name || displayName}</strong></span></div>
    </header>
    {!isAll ? <div className="px-page-head px-alltime-title"><div><span className="px-kicker">{kicker}</span><h1>{title}</h1></div></div> : null}
    <section className="px-alltime-quick-actions" aria-label="Lançamentos rápidos">
      <button type="button" onClick={() => onLaunch?.('expense')}><span>↘</span><strong>Despesa</strong><small>Novo lançamento</small></button>
      <button type="button" onClick={() => onLaunch?.('income')}><span>↗</span><strong>Receita</strong><small>Novo lançamento</small></button>
      <button type="button" className="benefit" onClick={() => onLaunch?.('benefit')}><span>◈</span><strong>Alimentação</strong><small>Lançar no benefício</small></button>
    </section>

    {isAll ? <section className="px-alltime-overview-v8">
      <div className="px-alltime-balance-v8">
        <div className="px-alltime-balance-copy">
          <span>SALDO MONETÁRIO ATUAL</span>
          <strong>{money.format(summary.currentMonetaryBalance)}</strong>
          <small>Fotografia real de hoje · sem misturar compromissos futuros</small>
        </div>
        <div className="px-alltime-balance-art" aria-hidden="true"><i /><i /><i /><b>◉</b></div>
      </div>
      <div className="px-alltime-flow-v8">
        <article><span>Entradas acumuladas</span><strong>{money.format(summary.realizedIncome)}</strong></article>
        <article><span>Saídas acumuladas</span><strong>{money.format(summary.realizedExpense)}</strong></article>
        <article className={signedClass(summary.realizedResult)}><span>Resultado acumulado</span><strong>{summary.realizedResult > 0 ? '+' : ''}{money.format(summary.realizedResult)}</strong></article>
      </div>
    </section> : <section className="px-dashboard-grid">
      <article className="px-card px-premium-balance px-period-balance-card">
        <div className="px-period-balance-primary">
          <span className="px-kicker">Saldo final do período</span>
          <h2>{money.format(periodClosing)}</h2>
          <p>{`O período começou com ${money.format(periodOpening)} e terminou em ${money.format(periodClosing)}.`}</p>
          <div className="px-period-opening-chip"><span>Saldo inicial</span><strong>{money.format(periodOpening)}</strong></div>
        </div>
        <div className="px-period-summary-inline">
          <header><span>Resumo do período</span><strong>{periodLabel}</strong></header>
          <div className="px-period-summary-equation">
            <div className="income"><span>Receitas realizadas</span><strong>{money.format(summary.realizedIncome)}</strong></div>
            <b aria-hidden="true">−</b>
            <div className="expense"><span>Despesas realizadas</span><strong>{money.format(summary.realizedExpense)}</strong></div>
            <b aria-hidden="true">=</b>
            <div className={`result ${signedClass(displayedResult)}`}><span>Movimento líquido</span><strong>{displayedResult > 0 ? '+' : ''}{money.format(displayedResult)}</strong></div>
          </div>
        </div>
      </article>
    </section>}

    {!isAll ? <article className="px-period-real-compare">
      <div className="px-period-real-copy">
        <span>Comparação com o saldo real</span>
        <strong>Como aquele período terminou versus como o caixa está hoje</strong>
        <small>O saldo histórico é reconstruído com os movimentos realizados até o fim do recorte; o saldo de hoje continua sendo a referência canônica atual.</small>
      </div>
      <div className="px-period-real-values">
        <div><span>Fim do período</span><strong>{money.format(periodClosing)}</strong></div>
        <b aria-hidden="true">→</b>
        <div><span>Saldo real hoje</span><strong>{money.format(currentRealBalance)}</strong></div>
        <div className={`delta ${signedClass(variationToToday)}`}><span>Variação até hoje</span><strong>{variationToToday > 0 ? '+' : ''}{money.format(variationToToday)}</strong></div>
      </div>
    </article> : null}

    {!isAll ? <section className="px-metrics">
      <article className="px-card px-metric info"><span>Saldo inicial</span><strong>{money.format(periodOpening)}</strong><small>Posição imediatamente antes do recorte</small></article>
      <article className="px-card px-metric good"><span>Receitas realizadas</span><strong>{money.format(summary.realizedIncome)}</strong><small>Entradas efetivamente realizadas no período</small></article>
      <article className="px-card px-metric bad"><span>Despesas realizadas</span><strong>{money.format(summary.realizedExpense)}</strong><small>Saídas efetivamente realizadas no período</small></article>
      <article className={`px-card px-metric ${periodResult >= 0 ? 'good' : 'bad'}`}><span>Resultado do período</span><strong>{periodResult > 0 ? '+' : ''}{money.format(periodResult)}</strong><small>Saldo final menos saldo inicial</small></article>
    </section> : null}

    {isAll ? <section className="px-alltime-commitment-board px-alltime-commitment-board-v8">
      <header><span>COMPROMISSOS</span><small>O que ainda exige atenção a partir de hoje</small></header>
      <div className="px-alltime-commitment-grid">
        <article><span className="icon">▤</span><div><small>Em aberto agora</small><strong>{money.format(openNowAmount)}</strong></div></article>
        <article><span className="icon due">▣</span><div><small>Próximo vencimento</small><strong>{nextDue ? formatIso(String(nextDue.date).slice(0, 10)) : '—'}</strong><span>{nextDue?.description || 'Nenhum vencimento futuro'}</span><b>{nextDue ? money.format(openEventAmount(nextDue)) : '—'}</b></div></article>
        <article><span className="icon next">◔</span><div><small>Próximo mês</small><strong>{money.format(nextMonthAmount)}</strong><span>{nextMonthExpenses.length} compromisso(s)</span></div></article>
      </div>
      <button type="button" onClick={() => onNavigate('payables')}><span className="icon">▤</span><span>Ver todos os compromissos</span><b>›</b></button>
    </section> : null}

    {isAll ? <button type="button" className="px-alltime-benefit-spotlight" onClick={() => setBenefitOpen(true)}><span className="icon">▣</span><span className="copy"><small>BENEFÍCIO ALIMENTAÇÃO</small><strong>{money.format(summary.benefitBalance)}</strong><em>Saldo disponível · acompanhar evolução</em></span><b>›</b></button> : null}

    {isAll ? <section className="px-alltime-history-summary">
      <header><div><span className="icon">▥</span><span><small>RESUMO HISTÓRICO</small><strong>Visão geral da sua vida financeira</strong></span></div><button type="button" onClick={() => onNavigate('movements')}>›</button></header>
      <div>
        <article><small>Total de lançamentos</small><strong>{summary.monetaryEventCount.toLocaleString('pt-BR')}</strong></article>
        <article><small>Período</small><strong>{formatIso(summary.firstDate)}<br/>a {formatIso(summary.lastDate)}</strong></article>
        <article><small>Média mensal de despesa</small><strong className="expense">{money.format(averageMonthlyExpense)}</strong></article>
        <article><small>Média mensal de receita</small><strong className="income">{money.format(averageMonthlyIncome)}</strong></article>
      </div>
    </section> : <section className="px-bottom-grid px-period-bottom-grid">
      <article className="px-card">
        <div className="px-panel-head"><div><span>Memória do período</span><h2>Como o saldo foi formado</h2></div></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Saldo inicial</strong><small>{formatIso(firstDate)}</small></div><strong>{money.format(periodOpening)}</strong></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>+ Receitas realizadas</strong><small>Entradas confirmadas, pagas ou conciliadas</small></div><strong>{money.format(summary.realizedIncome)}</strong></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>− Despesas realizadas</strong><small>Saídas confirmadas, pagas ou conciliadas</small></div><strong>{money.format(summary.realizedExpense)}</strong></div>
        <div className="px-dashboard-row emphasized"><div className="px-dashboard-row-copy"><strong>Saldo final do período</strong><small>{formatIso(lastDate)}</small></div><strong>{money.format(periodClosing)}</strong></div>
      </article>

      <article className="px-card">
        <div className="px-panel-head"><div><span>Comparativo</span><h2>Do fim do período até hoje</h2></div><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('movements')}>Ver lançamentos</button></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Saldo final do período</strong><small>Fotografia histórica reconstruída</small></div><strong>{money.format(periodClosing)}</strong></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Saldo real atual</strong><small>Fotografia canônica de hoje</small></div><strong>{money.format(currentRealBalance)}</strong></div>
        <div className="px-dashboard-row emphasized"><div className="px-dashboard-row-copy"><strong>Variação acumulada</strong><small>Saldo atual menos saldo final do período</small></div><strong className={signedClass(variationToToday)}>{variationToToday > 0 ? '+' : ''}{money.format(variationToToday)}</strong></div>
        <div className="px-history-state sincronizado">SALDO HISTÓRICO ANCORADO NO SALDO REAL</div>
      </article>
    </section>}
  </section>
  {benefitOpen ? <div className="px-home-benefit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBenefitOpen(false); }}>
    <section className="px-home-benefit-modal" role="dialog" aria-modal="true" aria-label="Acompanhamento do benefício alimentação">
      <header className="px-home-benefit-modal-head"><div className="px-home-benefit-modal-title"><div><span className="px-kicker">Benefício alimentação · {periodLabel}</span><h2>Evolução do saldo</h2><p>Benefício separado do caixa monetário, preservando a leitura do período.</p></div></div><button type="button" aria-label="Fechar" onClick={() => setBenefitOpen(false)}>×</button></header>
      <div className="px-home-benefit-summary px-home-benefit-summary-four">
        <article><span>Saldo inicial</span><strong>{money.format(benefitOpening)}</strong></article>
        <article className="credit"><span>Créditos</span><strong>{money.format(benefitCredits)}</strong></article>
        <article className="spent"><span>Consumo</span><strong>{money.format(benefitSpent)}</strong></article>
        <article className="current"><span>Saldo atual</span><strong>{money.format(summary.benefitBalance)}</strong></article>
      </div>
      <section className="px-home-benefit-movements"><header><div><span>Movimentações</span><strong>{benefitEvolution.length} registro(s)</strong></div><button type="button" onClick={() => { setBenefitOpen(false); onNavigate('movements'); }}>Ver lançamentos</button></header><div className="px-home-benefit-list">{[...benefitEvolution].reverse().slice(0, 30).map((item) => <div className="px-home-benefit-row" key={item.id}><span className={`px-home-benefit-row-icon ${item.amount >= 0 ? 'credit' : 'debit'}`} aria-hidden="true">{item.amount >= 0 ? '↗' : '↘'}</span><div><strong>{item.description}</strong><small>{formatIso(item.date)} · saldo {money.format(item.balance)}</small></div><strong className={item.amount >= 0 ? 'credit' : 'debit'}>{item.amount >= 0 ? '+' : '−'} {money.format(Math.abs(item.amount))}</strong></div>)}</div></section>
      <footer className="px-home-benefit-footer"><span>O benefício não altera o saldo monetário da Home.</span><button type="button" className="primary" onClick={() => setBenefitOpen(false)}>Fechar</button></footer>
    </section>
  </div> : null}
  </>;
}
