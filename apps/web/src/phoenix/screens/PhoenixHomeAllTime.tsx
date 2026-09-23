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
  const freePositive = summary.freeAfterCommitments >= 0;
  const projectionPositive = summary.projectedAfterPlanned >= 0;
  const firstDate = periodContext?.startDate ?? summary.firstDate;
  const lastDate = periodContext?.endDate ?? summary.lastDate;
  const title = isAll ? 'Histórico completo' : 'Resumo do período';
  const kicker = isAll ? 'Visão geral · Tudo' : `Visão geral · ${periodLabel}`;
  const [benefitOpen, setBenefitOpen] = useState(false);
  const benefitEvents = useMemo(() => data.events.items
    .filter(isPhoenixBenefitEvent)
    .filter((event) => ['paid', 'reconciled', 'confirmed'].includes(String(event.status)))
    .sort((left, right) => String(left.date).localeCompare(String(right.date))), [data.events.items]);
  const benefitCredits = benefitEvents.reduce((sum, event) => Math.max(0, Number(event.signedAmount || 0)) + sum, 0);
  const benefitSpent = benefitEvents.reduce((sum, event) => Math.max(0, -Number(event.signedAmount || 0)) + sum, 0);
  const benefitOpening = Number(summary.benefitBalance || 0) - benefitCredits + benefitSpent;
  const benefitEvolution = benefitEvents.reduce<Array<{ id: string; date: string; description: string; amount: number; balance: number }>>((rows, event) => {
    const amount = Number(event.signedAmount || 0);
    const previous = rows.length ? rows[rows.length - 1].balance : benefitOpening;
    rows.push({ id: event.id, date: String(event.date).slice(0, 10), description: event.description || 'Movimentação do benefício', amount, balance: previous + amount });
    return rows;
  }, []);

  return <>
  <section className="px-home-alltime px-home-approved" data-home-alltime-layout="approved-mobile-v4">
    <div className="px-page-head">
      <div>
        <span className="px-kicker">{kicker}</span>
        <h1>{title}</h1>
        
        {onOpenPeriod ? <button className="px-home-period-edit" type="button" onClick={onOpenPeriod}>Alterar período · {periodLabel}</button> : null}
      </div>
    </div>

    <section className="px-alltime-quick-actions" aria-label="Lançamentos rápidos">
      <button type="button" onClick={() => onLaunch?.('expense')}><span>↘</span><strong>Despesa</strong><small>Novo lançamento</small></button>
      <button type="button" onClick={() => onLaunch?.('income')}><span>↗</span><strong>Receita</strong><small>Novo lançamento</small></button>
      <button type="button" className="benefit" onClick={() => onLaunch?.('benefit')}><span>◈</span><strong>Alimentação</strong><small>Lançar no benefício</small></button>
    </section>

    <section className="px-dashboard-grid">
      <article className="px-card px-premium-balance px-period-balance-card">
        <div className="px-period-balance-primary">
          <span className="px-kicker">{isAll ? 'Saldo monetário atual' : 'Saldo final do período'}</span>
          <h2>{money.format(isAll ? summary.currentMonetaryBalance : periodClosing)}</h2>
          <p>{isAll
            ? 'Fotografia realizada de hoje. Eventos futuros não são transformados em saldo disponível.'
            : `O período começou com ${money.format(periodOpening)} e terminou em ${money.format(periodClosing)}.`}</p>
          {!isAll ? <div className="px-period-opening-chip"><span>Saldo inicial</span><strong>{money.format(periodOpening)}</strong></div> : null}
        </div>

        <div className="px-period-summary-inline">
          <header><span>Resumo do período</span><strong>{isAll ? 'Trajetória realizada' : periodLabel}</strong></header>
          <div className="px-period-summary-equation">
            <div className="income"><span>Receitas realizadas</span><strong>{money.format(summary.realizedIncome)}</strong></div>
            <b aria-hidden="true">−</b>
            <div className="expense"><span>Despesas realizadas</span><strong>{money.format(summary.realizedExpense)}</strong></div>
            <b aria-hidden="true">=</b>
            <div className={`result ${signedClass(displayedResult)}`}><span>Resultado do período</span><strong>{displayedResult > 0 ? '+' : ''}{money.format(displayedResult)}</strong></div>
          </div>
        </div>
      </article>
    </section>

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
    </article> : <article className={`px-dashboard-alert ${freePositive ? 'is-positive' : ''}`}>
      <div className="px-dashboard-alert-copy">
        <div className="px-dashboard-alert-icon">{freePositive ? '✓' : '!'}</div>
        <div>
          <h3>{freePositive ? 'Compromissos cobertos pelo saldo atual' : 'Compromissos superam o saldo atual'}</h3>
          <p>Considera todas as despesas monetárias ainda planejadas, inclusive vencidas e futuras, com estornos reduzindo o compromisso líquido.</p>
        </div>
      </div>
      <div className="px-gap-block"><span>Saldo livre após compromissos</span><strong>{money.format(summary.freeAfterCommitments)}</strong></div>
    </article>}

    <section className="px-metrics">
      {isAll ? <>
        <article className="px-card px-metric good"><span>Receitas registradas</span><strong>{money.format(summary.recordedIncome)}</strong><small>Toda a base, realizadas + planejadas</small></article>
        <article className="px-card px-metric bad"><span>Despesas registradas</span><strong>{money.format(summary.recordedExpense)}</strong><small>Líquidas de estornos em toda a base</small></article>
        <article className="px-card px-metric warn"><span>Compromissos em aberto</span><strong>{money.format(summary.plannedExpense)}</strong><small>{summary.actionableCommitmentCount.toLocaleString('pt-BR')} obrigação(ões) com efeito de saída</small></article>
        <article className="px-card px-metric info"><span>Receitas previstas em aberto</span><strong>{money.format(summary.plannedIncome)}</strong><small>Ainda não integram o saldo atual</small></article>
      </> : <>
        <article className="px-card px-metric info"><span>Saldo inicial</span><strong>{money.format(periodOpening)}</strong><small>Posição imediatamente antes do recorte</small></article>
        <article className="px-card px-metric good"><span>Receitas realizadas</span><strong>{money.format(summary.realizedIncome)}</strong><small>Entradas efetivamente realizadas no período</small></article>
        <article className="px-card px-metric bad"><span>Despesas realizadas</span><strong>{money.format(summary.realizedExpense)}</strong><small>Saídas efetivamente realizadas no período</small></article>
        <article className={`px-card px-metric ${periodResult >= 0 ? 'good' : 'bad'}`}><span>Resultado do período</span><strong>{periodResult > 0 ? '+' : ''}{money.format(periodResult)}</strong><small>Saldo final menos saldo inicial</small></article>
      </>}
    </section>

    {isAll ? <section className="px-bottom-grid">
      <article className="px-card">
        <div className="px-panel-head"><div><span>Horizonte completo</span><h2>Posição após tudo que já está previsto</h2></div></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Saldo monetário atual</strong><small>Ponto de partida realizado</small></div><strong>{money.format(summary.currentMonetaryBalance)}</strong></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>+ Receitas previstas</strong><small>Eventos de receita ainda planejados</small></div><strong>{money.format(summary.plannedIncome)}</strong></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>− Compromissos em aberto</strong><small>Despesas planejadas líquidas</small></div><strong>{money.format(summary.plannedExpense)}</strong></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Projeção final da base</strong><small>Depois de todos os eventos atualmente planejados</small></div><strong>{money.format(summary.projectedAfterPlanned)}</strong></div>
        <div className={`px-history-state ${projectionPositive ? 'sincronizado' : 'arquivado'}`}>{projectionPositive ? 'PROJEÇÃO POSITIVA' : 'PROJEÇÃO NEGATIVA'}</div>
      </article>

      <article className="px-card">
        <div className="px-panel-head"><div><span>Base completa</span><h2>Desde quando começamos</h2></div><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('movements')}>Ver todos os lançamentos</button></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Primeiro lançamento</strong><small>{formatIso(summary.firstDate)}</small></div></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Último lançamento cadastrado</strong><small>{formatIso(summary.lastDate)}</small></div></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Eventos monetários</strong><small>{summary.monetaryEventCount.toLocaleString('pt-BR')} de {summary.eventCount.toLocaleString('pt-BR')} eventos</small></div></div>
        <button type="button" className="px-dashboard-row px-alltime-benefit-row" onClick={() => setBenefitOpen(true)}><div className="px-dashboard-row-copy"><strong>Benefício alimentação atual</strong><small>Toque para acompanhar créditos, consumo e saldo após cada movimento</small></div><strong>{money.format(summary.benefitBalance)}</strong></button>
      </article>
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
