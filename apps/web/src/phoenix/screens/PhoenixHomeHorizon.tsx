import type { PhoenixReadModel } from '../contracts';
import { buildPhoenixHorizonSummary } from '../home-period-summary';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatIso(value: string | null) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function PhoenixHomeHorizon({ current, events, targetMonth, today, onNavigate }: {
  current: PhoenixReadModel;
  events: PhoenixReadModel['events']['items'];
  targetMonth: string;
  today: string;
  onNavigate: (view: 'home' | 'movements' | 'payables' | 'cashflow') => void;
}) {
  const summary = buildPhoenixHorizonSummary(current, events, targetMonth, today);
  const freePositive = summary.freeAfterCommitments >= 0;
  const projectionPositive = summary.projectedClosing >= 0;
  const hasCriticalDate = Boolean(summary.firstNegativeDate);

  return <>
    <div className="px-page-head">
      <div>
        <span className="px-kicker">Planejamento · até o período</span>
        <h1>Até {monthLabel(targetMonth)}</h1>
        <p>O saldo de hoje permanece como ponto de partida. Compromissos e receitas previstas são acumulados até o fim do período escolhido.</p>
        <span className="px-updated">Horizonte até {formatIso(summary.cutoffDate)} · saldo atual preservado como realizado</span>
      </div>
    </div>

    <section className="px-dashboard-grid">
      <article className="px-card px-premium-balance">
        <span className="px-kicker">Saldo monetário atual</span>
        <h2>{money.format(summary.currentMonetaryBalance)}</h2>
        <p>Dinheiro realizado hoje. Selecionar um mês futuro não antecipa receitas nem baixa despesas.</p>
        <div className="px-balance-stats">
          <div className="px-balance-stat"><span>Compromissos até o período</span><strong>{money.format(summary.pendingExpense)}</strong></div>
          <div className="px-balance-stat"><span>Receitas previstas até o período</span><strong>{money.format(summary.pendingIncome)}</strong></div>
          <div className="px-balance-stat"><span>Saldo livre após compromissos</span><strong>{money.format(summary.freeAfterCommitments)}</strong></div>
        </div>
      </article>
    </section>

    <article className={`px-dashboard-alert ${projectionPositive ? 'is-positive' : ''}`}>
      <div className="px-dashboard-alert-copy">
        <div className="px-dashboard-alert-icon">{projectionPositive ? '✓' : '!'}</div>
        <div>
          <h3>{projectionPositive ? `Projeção positiva até ${monthLabel(targetMonth)}` : `Atenção ao horizonte até ${monthLabel(targetMonth)}`}</h3>
          <p>Saldo atual + receitas previstas − compromissos ainda em aberto até o último dia do mês selecionado.</p>
        </div>
      </div>
      <div className="px-gap-block"><span>Saldo projetado ao fim do horizonte</span><strong>{money.format(summary.projectedClosing)}</strong></div>
    </article>

    <section className="px-metrics">
      <article className="px-card px-metric bad"><span>Compromissos em aberto</span><strong>{money.format(summary.pendingExpense)}</strong><small>{summary.actionableCommitmentCount.toLocaleString('pt-BR')} obrigação(ões) com efeito de saída</small></article>
      <article className="px-card px-metric info"><span>Receitas previstas</span><strong>{money.format(summary.pendingIncome)}</strong><small>{summary.plannedIncomeCount.toLocaleString('pt-BR')} entrada(s) ainda não realizada(s)</small></article>
      <article className={`px-card px-metric ${freePositive ? 'good' : 'bad'}`}><span>Dinheiro livre após compromissos</span><strong>{money.format(summary.freeAfterCommitments)}</strong><small>Não considera receitas futuras para dizer quanto está realmente livre hoje</small></article>
      <article className={`px-card px-metric ${hasCriticalDate ? 'warn' : 'good'}`}><span>Menor saldo previsto</span><strong>{money.format(summary.minimumProjectedBalance)}</strong><small>{summary.minimumProjectedDate ? `Em ${formatIso(summary.minimumProjectedDate)}` : 'Sem queda abaixo do saldo atual no horizonte'}</small></article>
    </section>

    <section className="px-bottom-grid">
      <article className="px-card">
        <div className="px-panel-head"><div><span>Transparência do cálculo</span><h2>Como chegamos à projeção</h2></div><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('movements')}>Ver lançamentos</button></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Saldo monetário atual</strong><small>Fotografia realizada de hoje</small></div><strong>{money.format(summary.currentMonetaryBalance)}</strong></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>+ Receitas previstas</strong><small>Até {formatIso(summary.cutoffDate)}</small></div><strong>{money.format(summary.pendingIncome)}</strong></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>− Compromissos em aberto</strong><small>Inclui vencidos e futuros até o período; estornos reduzem o compromisso líquido</small></div><strong>{money.format(summary.pendingExpense)}</strong></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>= Saldo projetado</strong><small>Posição ao final do horizonte com o que já está cadastrado</small></div><strong>{money.format(summary.projectedClosing)}</strong></div>
      </article>

      <article className="px-card">
        <div className="px-panel-head"><div><span>Risco de caixa</span><h2>Pontos de atenção</h2></div><button className="px-dashboard-row-action" type="button" onClick={() => onNavigate('payables')}>Ver pendentes</button></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Vencidos ainda em aberto</strong><small>{summary.overdueCount.toLocaleString('pt-BR')} item(ns)</small></div><strong>{money.format(summary.overdueExpense)}</strong></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Primeira data de saldo negativo</strong><small>{summary.firstNegativeDate ? 'A projeção cruza abaixo de zero neste ponto' : 'Nenhum saldo negativo previsto no horizonte'}</small></div><strong>{formatIso(summary.firstNegativeDate)}</strong></div>
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Menor saldo previsto</strong><small>{summary.minimumProjectedDate ? `Ponto mínimo em ${formatIso(summary.minimumProjectedDate)}` : 'Saldo atual permanece como menor referência'}</small></div><strong>{money.format(summary.minimumProjectedBalance)}</strong></div>
      </article>
    </section>
  </>;
}
