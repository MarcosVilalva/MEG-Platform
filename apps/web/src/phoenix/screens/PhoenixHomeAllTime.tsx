import type { PhoenixReadModel } from '../contracts';
import { buildPhoenixAllTimeHomeSummary } from '../home-period-summary';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatIso(value: string | null) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function PhoenixHomeAllTime({ data, onNavigate }: {
  data: PhoenixReadModel;
  onNavigate: (view: 'home' | 'movements' | 'history' | 'payables') => void;
}) {
  const summary = buildPhoenixAllTimeHomeSummary(data);
  const freePositive = summary.freeAfterCommitments >= 0;
  const projectionPositive = summary.projectedAfterPlanned >= 0;

  return <>
    <div className="px-page-head">
      <div>
        <span className="px-kicker">Visão geral · Tudo</span>
        <h1>Histórico completo</h1>
        <p>Do primeiro ao último lançamento normalizado, preservando o saldo monetário atual como referência de hoje.</p>
        <span className="px-updated">
          {formatIso(summary.firstDate)} → {formatIso(summary.lastDate)} · {summary.eventCount.toLocaleString('pt-BR')} lançamento(s)
        </span>
      </div>
    </div>

    <section className="px-dashboard-grid">
      <article className="px-card px-premium-balance">
        <span className="px-kicker">Saldo monetário atual</span>
        <h2>{money.format(summary.currentMonetaryBalance)}</h2>
        <p>Fotografia realizada de hoje. O modo Tudo não transforma lançamentos futuros em saldo disponível.</p>
        <div className="px-balance-stats">
          <div className="px-balance-stat"><span>Receitas realizadas desde o início</span><strong>{money.format(summary.realizedIncome)}</strong></div>
          <div className="px-balance-stat"><span>Despesas realizadas desde o início</span><strong>{money.format(summary.realizedExpense)}</strong></div>
          <div className="px-balance-stat"><span>Resultado realizado histórico</span><strong>{money.format(summary.realizedResult)}</strong></div>
        </div>
      </article>
    </section>

    <article className={`px-dashboard-alert ${freePositive ? 'is-positive' : ''}`}>
      <div className="px-dashboard-alert-copy">
        <div className="px-dashboard-alert-icon">{freePositive ? '✓' : '!'}</div>
        <div>
          <h3>{freePositive ? 'Compromissos cobertos pelo saldo atual' : 'Compromissos superam o saldo atual'}</h3>
          <p>Considera todas as despesas monetárias ainda planejadas, inclusive vencidas e futuras, com estornos reduzindo o compromisso líquido.</p>
        </div>
      </div>
      <div className="px-gap-block"><span>Saldo livre após compromissos</span><strong>{money.format(summary.freeAfterCommitments)}</strong></div>
    </article>

    <section className="px-metrics">
      <article className="px-card px-metric good"><span>Receitas registradas</span><strong>{money.format(summary.recordedIncome)}</strong><small>Toda a base, realizadas + planejadas</small></article>
      <article className="px-card px-metric bad"><span>Despesas registradas</span><strong>{money.format(summary.recordedExpense)}</strong><small>Líquidas de estornos em toda a base</small></article>
      <article className="px-card px-metric warn"><span>Compromissos em aberto</span><strong>{money.format(summary.plannedExpense)}</strong><small>{summary.actionableCommitmentCount.toLocaleString('pt-BR')} obrigação(ões) com efeito de saída</small></article>
      <article className="px-card px-metric info"><span>Receitas previstas em aberto</span><strong>{money.format(summary.plannedIncome)}</strong><small>Ainda não integram o saldo atual</small></article>
    </section>

    <section className="px-bottom-grid">
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
        <div className="px-dashboard-row"><div className="px-dashboard-row-copy"><strong>Benefício alimentação atual</strong><small>Créditos realizados desde o início: {money.format(summary.benefitCredits)} · utilizado: {money.format(summary.benefitUsed)}</small></div><strong>{money.format(summary.benefitBalance)}</strong></div>
      </article>
    </section>
  </>;
}
