import type { CSSProperties } from 'react';
import type { WebNextRoute } from '../components/WebNextSidebar';
import { WebNextIcon } from '../components/WebNextIcon';
import type { WebNextHomeModel } from '../data/home-view-model';
import '../styles/home.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function pct(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Sem comparação';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}% vs. período anterior`;
}

function shortDate(value: string) {
  const [, month, day] = value.slice(0, 10).split('-');
  return day && month ? `${day}/${month}` : value;
}

function chartPoints(values: number[], width = 560, height = 148) {
  if (!values.length) return '';
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = Math.max(1, max - min);
  const step = values.length > 1 ? width / (values.length - 1) : width / 2;
  return values.map((value, index) => {
    const x = values.length > 1 ? index * step : width / 2;
    const y = height - ((value - min) / range) * height;
    return `${x.toFixed(1)},${Math.max(0, Math.min(height, y)).toFixed(1)}`;
  }).join(' ');
}

export function WebNextHome({
  model,
  onNavigate,
}: {
  model: WebNextHomeModel;
  onNavigate: (route: WebNextRoute) => void;
}) {
  const maxBar = Math.max(1, ...model.trend.flatMap((item) => [Math.abs(item.income), Math.abs(item.expense)]));
  const resultPoints = chartPoints(model.trend.map((item) => item.result));
  const resultPositive = model.kpis.result.value >= 0;

  return <section className="mnx-home" data-web-next-screen="home" data-reference="web-board-1-approved" data-month={model.month}>
    <section className="mnx-home-kpis" aria-label="Resumo financeiro">
      <article className="mnx-kpi mnx-kpi-income">
        <span className="mnx-kpi-icon"><WebNextIcon name="receivables" /></span>
        <div><small>Receitas</small><strong>{money.format(model.kpis.income.value)}</strong><em>{pct(model.kpis.income.changePct)}</em></div>
        <span className="mnx-kpi-spark" aria-hidden="true">↗</span>
      </article>
      <article className="mnx-kpi mnx-kpi-expense">
        <span className="mnx-kpi-icon"><WebNextIcon name="payables" /></span>
        <div><small>Despesas</small><strong>{money.format(model.kpis.expense.value)}</strong><em>{pct(model.kpis.expense.changePct)}</em></div>
        <span className="mnx-kpi-spark" aria-hidden="true">↘</span>
      </article>
      <article className="mnx-kpi mnx-kpi-balance">
        <span className="mnx-kpi-icon"><WebNextIcon name="analytics" /></span>
        <div><small>Saldo do mês</small><strong>{money.format(model.kpis.result.value)}</strong><em>{pct(model.kpis.result.changePct)}</em></div>
        <span className="mnx-kpi-spark" aria-hidden="true">⌁</span>
      </article>
      <article className="mnx-kpi mnx-kpi-goal">
        <span className="mnx-kpi-icon"><WebNextIcon name="budgets" /></span>
        <div><small>Metas</small><strong>{model.kpis.goals.total > 0 ? money.format(model.kpis.goals.total) : 'Sem meta'}</strong><em>{model.kpis.goals.active ? `${model.kpis.goals.active} meta(s) ativa(s)` : 'Defina limites no planejamento'}</em></div>
        <span className="mnx-kpi-goal-track"><i style={{ width: `${model.kpis.goals.percent}%` }} /></span>
        {model.kpis.goals.total > 0 ? <b className="mnx-kpi-goal-pct">{model.kpis.goals.percent.toFixed(0)}%</b> : null}
      </article>
    </section>

    <section className="mnx-home-board">
      <article className="mnx-panel mnx-balance-panel">
        <header><span>Saldo total</span><button type="button" aria-label="Abrir fluxo de caixa" onClick={() => onNavigate('cashflow')}><WebNextIcon name="chevron" /></button></header>
        <strong>{money.format(model.totalBalance)}</strong>
        <small>em caixa monetário</small>
        <div className={resultPositive ? 'is-positive' : 'is-negative'}>{resultPositive ? '+' : ''}{money.format(model.kpis.result.value)} no mês</div>
        <footer><span>Benefício alimentação</span><b>{money.format(model.benefitBalance)}</b></footer>
      </article>

      <article className="mnx-panel mnx-assets-panel">
        <header className="mnx-panel-heading"><div><span>Contas e cartões</span><h2>Visão rápida</h2></div><button type="button" onClick={() => onNavigate('cards')}>Ver todas as contas <WebNextIcon name="chevron" /></button></header>
        <div className="mnx-assets-strip">
          {model.assets.map((asset) => <button
            type="button"
            className={`mnx-asset-card is-${asset.kind}`}
            key={asset.id}
            onClick={() => onNavigate(asset.kind === 'card' ? 'cards' : 'catalogs')}
            style={asset.accent ? { '--mnx-asset-accent': asset.accent } as CSSProperties : undefined}
          >
            <span className="mnx-asset-icon"><WebNextIcon name={asset.kind === 'card' ? 'cards' : 'catalogs'} /></span>
            <span className="mnx-asset-copy"><small>{asset.eyebrow}</small><strong>{asset.name}</strong><em>{asset.value !== undefined ? money.format(asset.value) : asset.meta}</em></span>
          </button>)}
          {model.hiddenAssetCount > 0 ? <button type="button" className="mnx-asset-card is-more" onClick={() => onNavigate('catalogs')}>
            <strong>+{model.hiddenAssetCount}</strong><small>outras contas</small>
          </button> : null}
          {!model.assets.length && !model.hiddenAssetCount ? <div className="mnx-empty">Nenhuma conta ou cartão ativo.</div> : null}
        </div>
      </article>

      <article className="mnx-panel mnx-chart-panel">
        <header className="mnx-panel-heading"><div><span>Evolução financeira</span><h2>Receitas, despesas e saldo</h2></div><button type="button" onClick={() => onNavigate('reports')}>Últimos 6 meses <WebNextIcon name="chevron" /></button></header>
        <div className="mnx-chart-area">
          <div className="mnx-chart-bars">
            {model.trend.map((item) => <div className="mnx-chart-month" key={item.month}>
              <div className="mnx-chart-bar-pair">
                <i className="income" style={{ height: `${Math.max(4, Math.abs(item.income) / maxBar * 100)}%` }} />
                <i className="expense" style={{ height: `${Math.max(4, Math.abs(item.expense) / maxBar * 100)}%` }} />
              </div>
              <span>{item.label}</span>
            </div>)}
          </div>
          {resultPoints ? <svg viewBox="0 0 560 160" preserveAspectRatio="none" role="img" aria-label="Linha de saldo mensal"><polyline points={resultPoints} /></svg> : null}
        </div>
        <footer className="mnx-chart-legend"><span className="income">Receitas</span><span className="expense">Despesas</span><span className="result">Saldo</span></footer>
      </article>

      <article className="mnx-panel mnx-list-panel mnx-recent-panel">
        <header className="mnx-panel-heading"><div><span>Lançamentos recentes</span><h2>Últimas movimentações</h2></div><button type="button" onClick={() => onNavigate('movements')}>Ver todos <WebNextIcon name="chevron" /></button></header>
        <div className="mnx-home-list">
          {model.recent.map((item) => <button type="button" key={item.id} onClick={() => onNavigate('movements')}>
            <span className={item.amount >= 0 ? 'is-income' : 'is-expense'}><WebNextIcon name={item.amount >= 0 ? 'receivables' : 'payables'} /></span>
            <div><strong>{item.description}</strong><small>{shortDate(item.date)} · {item.meta}</small></div>
            <b className={item.amount >= 0 ? 'is-income' : 'is-expense'}>{item.amount >= 0 ? '+' : '−'} {money.format(Math.abs(item.amount))}</b>
          </button>)}
          {!model.recent.length ? <div className="mnx-empty">Nenhuma movimentação neste período.</div> : null}
        </div>
      </article>

      <article className="mnx-panel mnx-list-panel mnx-alerts-panel">
        <header className="mnx-panel-heading"><div><span>Pendências e alertas</span><h2>O que pede atenção</h2></div>{model.pendingCount ? <b className="mnx-heading-badge">{model.pendingCount}</b> : null}<button type="button" onClick={() => onNavigate('payables')}>Ver todos <WebNextIcon name="chevron" /></button></header>
        <div className="mnx-home-list">
          {model.alerts.map((item) => <button type="button" key={item.id} onClick={() => onNavigate('payables')}>
            <span className={`is-${item.level}`}><WebNextIcon name={item.level === 'card' ? 'cards' : item.level === 'danger' ? 'bell' : 'calendar'} /></span>
            <div><strong>{item.title}</strong><small>{item.meta}</small></div>
            <b>{money.format(item.amount)}</b>
            <em>Pagar</em>
          </button>)}
          {model.smartAlert ? <button type="button" className="mnx-smart-alert" onClick={() => onNavigate(model.smartAlert!.route)}>
            <span className="is-warning"><WebNextIcon name="bell" /></span>
            <div><strong>{model.smartAlert.title}</strong><small>{model.smartAlert.text}</small></div>
            <WebNextIcon name="chevron" />
          </button> : null}
          {!model.alerts.length && !model.smartAlert ? <div className="mnx-empty"><strong>Sem alertas relevantes</strong><small>Sua agenda imediata está organizada.</small></div> : null}
        </div>
        <footer className="mnx-alert-footer"><span>{money.format(model.freeAfterCommitments)} livre após compromissos</span><button type="button" onClick={() => onNavigate('payables')}>Ver pendências</button></footer>
      </article>
    </section>
  </section>;
}
