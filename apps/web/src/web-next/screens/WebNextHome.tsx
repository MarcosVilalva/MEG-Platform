import { useState, type CSSProperties } from 'react';
import type { WebNextRoute } from '../components/WebNextSidebar';
import { WebNextIcon } from '../components/WebNextIcon';
import type { WebNextHomeModel } from '../data/home-view-model';
import '../styles/home.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function pct(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Sem base comparativa';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}%`;
}

function shortDate(value: string) {
  const [, month, day] = value.slice(0, 10).split('-');
  return day && month ? `${day}/${month}` : value;
}

function chartCoordinates(values: number[], width = 600, height = 168) {
  if (!values.length) return [] as Array<{x:number;y:number}>;
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = Math.max(1, max - min);
  const step = values.length > 1 ? width / (values.length - 1) : width / 2;
  return values.map((value, index) => {
    const x = values.length > 1 ? index * step : width / 2;
    const y = 8 + (height - 16) - ((value - min) / range) * (height - 16);
    return { x, y: Math.max(8, Math.min(height, y)) };
  });
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function WebNextHome({
  model,
  onNavigate,
}: {
  model: WebNextHomeModel;
  onNavigate: (route: WebNextRoute) => void;
}) {
  const [activeTrendIndex,setActiveTrendIndex]=useState(()=>Math.max(0,model.trend.length-1));
  const resultCoordinates = chartCoordinates(model.trend.map((item) => item.result));
  const resultPoints = resultCoordinates.map((point)=>`${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const areaPath = resultCoordinates.length
    ? `M ${resultCoordinates[0].x},168 L ${resultCoordinates.map((point)=>`${point.x},${point.y}`).join(' L ')} L ${resultCoordinates[resultCoordinates.length-1].x},168 Z`
    : '';
  const resultPositive = model.kpis.result.value >= 0;
  const activeTrend = model.trend[Math.min(activeTrendIndex,Math.max(0,model.trend.length-1))] || null;
  const activePoint = resultCoordinates[Math.min(activeTrendIndex,Math.max(0,resultCoordinates.length-1))] || null;
  const maxFlow = Math.max(1, ...model.trend.flatMap((item)=>[Math.abs(item.income),Math.abs(item.expense)]));
  const liquidityPercent = model.totalBalance > 0
    ? clampPercent(model.freeAfterCommitments / model.totalBalance * 100)
    : 0;
  const committedAmount = Math.max(0, model.totalBalance - model.freeAfterCommitments);

  return <section className="mnx-home mnx-command-center" data-web-next-screen="home" data-reference="web-board-1-approved" data-month={model.month}>
    <section className="mnx-command-hero" aria-label="Seu dinheiro agora">
      <article className="mnx-money-stage">
        <div className="mnx-money-stage-copy">
          <span className="mnx-stage-eyebrow"><i /> SEU DINHEIRO AGORA</span>
          <h1>{money.format(model.totalBalance)}</h1>
          <p>Saldo monetário disponível neste momento</p>
          <div className="mnx-stage-chips">
            <span className={resultPositive ? 'is-positive' : 'is-negative'}><b>{resultPositive ? '+' : ''}{money.format(model.kpis.result.value)}</b> no mês</span>
            <span><b>{money.format(model.freeAfterCommitments)}</b> livre após compromissos</span>
          </div>
          <button type="button" onClick={() => onNavigate('cashflow')}>Abrir fluxo de caixa <WebNextIcon name="chevron" /></button>
        </div>

        <div className="mnx-liquidity-orbit" style={{ '--mnx-liquidity': `${liquidityPercent}%` } as CSSProperties}>
          <div className="mnx-liquidity-ring">
            <div><strong>{liquidityPercent.toFixed(0)}%</strong><span>livre</span></div>
          </div>
          <small>Liquidez após compromissos</small>
          <em>{money.format(committedAmount)} comprometido</em>
        </div>
      </article>

      <div className="mnx-command-metrics">
        <article className="mnx-orbit-card is-income">
          <span className="mnx-orbit-icon"><WebNextIcon name="receivables" /></span>
          <div><small>Receitas</small><strong>{money.format(model.kpis.income.value)}</strong><em>{pct(model.kpis.income.changePct)} vs. anterior</em></div>
          <i className="mnx-orbit-line" />
        </article>
        <article className="mnx-orbit-card is-expense">
          <span className="mnx-orbit-icon"><WebNextIcon name="payables" /></span>
          <div><small>Despesas</small><strong>{money.format(model.kpis.expense.value)}</strong><em>{pct(model.kpis.expense.changePct)} vs. anterior</em></div>
          <i className="mnx-orbit-line" />
        </article>
        <article className="mnx-orbit-card is-result">
          <span className="mnx-orbit-icon"><WebNextIcon name="analytics" /></span>
          <div><small>Resultado do mês</small><strong>{money.format(model.kpis.result.value)}</strong><em>{resultPositive ? 'Resultado positivo' : 'Resultado negativo'}</em></div>
          <i className="mnx-orbit-line" />
        </article>
        <article className="mnx-orbit-card is-goal">
          <span className="mnx-orbit-icon"><WebNextIcon name="budgets" /></span>
          <div><small>Metas</small><strong>{model.kpis.goals.total > 0 ? money.format(model.kpis.goals.total) : 'Sem meta'}</strong><em>{model.kpis.goals.active ? `${model.kpis.goals.active} ativa(s) · ${model.kpis.goals.percent.toFixed(0)}% utilizado` : 'Defina seus próximos objetivos'}</em></div>
          <i className="mnx-orbit-line" />
        </article>
      </div>
    </section>

    <section className="mnx-wallet-ribbon" aria-label="Carteira financeira">
      <header>
        <div><span>CARTEIRA</span><strong>Contas e cartões</strong></div>
        <div className="mnx-wallet-meta"><span>Benefício <b>{money.format(model.benefitBalance)}</b></span><button type="button" onClick={() => onNavigate('cards')}>Ver carteira <WebNextIcon name="chevron" /></button></div>
      </header>
      <div className="mnx-wallet-strip">
        {model.assets.map((asset,index) => <button
          type="button"
          className={`mnx-wallet-card is-${asset.kind}`}
          key={asset.id}
          onClick={() => onNavigate(asset.kind === 'card' ? 'cards' : 'catalogs')}
          style={{
            '--mnx-wallet-accent': asset.accent || (asset.kind === 'card' ? '#617dff' : '#49f0df'),
            '--mnx-wallet-depth': `${index + 1}`,
          } as CSSProperties}
        >
          <span className="mnx-wallet-icon"><WebNextIcon name={asset.kind === 'card' ? 'cards' : 'catalogs'} /></span>
          <span className="mnx-wallet-copy"><small>{asset.eyebrow}</small><strong>{asset.name}</strong><em>{asset.value !== undefined ? money.format(asset.value) : asset.meta}</em></span>
          <WebNextIcon name="chevron" />
        </button>)}
        {model.hiddenAssetCount > 0 ? <button type="button" className="mnx-wallet-card is-more" onClick={() => onNavigate('catalogs')}>
          <strong>+{model.hiddenAssetCount}</strong><span>outros vínculos</span><WebNextIcon name="chevron" />
        </button> : null}
        {!model.assets.length && !model.hiddenAssetCount ? <div className="mnx-empty">Nenhuma conta ou cartão ativo.</div> : null}
      </div>
    </section>

    <section className="mnx-cockpit">
      <article className="mnx-flow-console">
        <header className="mnx-console-header">
          <div><span>MEG PULSE</span><h2>O movimento do seu dinheiro</h2><p>Receitas, despesas e resultado dos últimos meses.</p></div>
          <button type="button" onClick={() => onNavigate('reports')}>Análise completa <WebNextIcon name="chevron" /></button>
        </header>

        <div className="mnx-flow-inspector">
          {activeTrend ? <>
            <div className="is-period"><small>Período em foco</small><strong>{activeTrend.label}</strong></div>
            <div className="is-income"><small>Receitas</small><strong>{money.format(activeTrend.income)}</strong></div>
            <div className="is-expense"><small>Despesas</small><strong>{money.format(activeTrend.expense)}</strong></div>
            <div className={activeTrend.result >= 0 ? 'is-result positive' : 'is-result negative'}><small>Saldo</small><strong>{money.format(activeTrend.result)}</strong></div>
          </> : null}
        </div>

        <div className="mnx-flow-chart">
          <div className="mnx-flow-grid" aria-hidden="true"><i/><i/><i/><i/></div>
          <div className="mnx-flow-bars">
            {model.trend.map((item,index)=><button
              type="button"
              key={item.month}
              className={index===activeTrendIndex?'is-active':''}
              aria-label={`${item.label}: receitas ${money.format(item.income)}, despesas ${money.format(item.expense)}, saldo ${money.format(item.result)}`}
              onMouseEnter={()=>setActiveTrendIndex(index)}
              onFocus={()=>setActiveTrendIndex(index)}
              onClick={()=>setActiveTrendIndex(index)}
            >
              <div className="mnx-flow-bar-pair">
                <i className="income" style={{height:`${Math.max(7,Math.abs(item.income)/maxFlow*100)}%`}}/>
                <i className="expense" style={{height:`${Math.max(7,Math.abs(item.expense)/maxFlow*100)}%`}}/>
              </div>
              <span>{item.label}</span>
            </button>)}
          </div>

          {resultPoints ? <svg viewBox="0 0 600 178" preserveAspectRatio="none" aria-label="Evolução do saldo">
            <defs>
              <linearGradient id="mnx-area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6ff8e7" stopOpacity=".28"/><stop offset="1" stopColor="#6ff8e7" stopOpacity="0"/></linearGradient>
              <linearGradient id="mnx-pulse-line" x1="0" x2="1"><stop offset="0" stopColor="#6ff8e7"/><stop offset=".5" stopColor="#f4fffd"/><stop offset="1" stopColor="#68b9ff"/></linearGradient>
            </defs>
            {areaPath ? <path className="mnx-flow-area" d={areaPath}/> : null}
            <polyline className="mnx-flow-line" points={resultPoints}/>
            {activePoint ? <line className="mnx-flow-crosshair" x1={activePoint.x} x2={activePoint.x} y1="4" y2="168"/> : null}
            {resultCoordinates.map((point,index)=><circle key={index} className={index===activeTrendIndex?'is-active':''} cx={point.x} cy={point.y} r={index===activeTrendIndex?6:3.2}/>)}
          </svg> : null}

          <div className="mnx-flow-legend"><span className="income">Receitas</span><span className="expense">Despesas</span><span className="result">Saldo</span><em>Passe o mouse pelos meses</em></div>
        </div>
      </article>

      <aside className="mnx-action-console">
        <section className="mnx-action-section">
          <header><div><span>AGORA</span><h2>O que pede atenção</h2></div>{model.pendingCount ? <b>{model.pendingCount}</b> : null}</header>
          <div className="mnx-attention-list">
            {model.alerts.slice(0,3).map((item)=><button type="button" key={item.id} onClick={()=>onNavigate('payables')}>
              <span className={`is-${item.level}`}><WebNextIcon name={item.level==='card'?'cards':item.level==='danger'?'bell':'calendar'}/></span>
              <div><strong>{item.title}</strong><small>{item.meta}</small></div>
              <b>{money.format(item.amount)}</b>
            </button>)}
            {model.smartAlert ? <button type="button" className="is-smart" onClick={()=>onNavigate(model.smartAlert!.route)}>
              <span className="is-warning"><WebNextIcon name="bell"/></span>
              <div><strong>{model.smartAlert.title}</strong><small>{model.smartAlert.text}</small></div>
              <WebNextIcon name="chevron"/>
            </button> : null}
            {!model.alerts.length && !model.smartAlert ? <div className="mnx-mini-empty"><strong>Nada urgente</strong><span>Seu período está sob controle.</span></div> : null}
          </div>
          <footer><span><strong>{money.format(model.freeAfterCommitments)}</strong> livre após compromissos</span><button type="button" onClick={()=>onNavigate('payables')}>Abrir pendências</button></footer>
        </section>

        <section className="mnx-action-section is-recent">
          <header><div><span>ÚLTIMOS MOVIMENTOS</span><h2>Atividade recente</h2></div><button type="button" onClick={()=>onNavigate('movements')}>Ver todos</button></header>
          <div className="mnx-recent-stream">
            {model.recent.slice(0,3).map((item)=><button type="button" key={item.id} onClick={()=>onNavigate('movements')}>
              <span className={item.amount>=0?'is-income':'is-expense'}><WebNextIcon name={item.amount>=0?'receivables':'payables'}/></span>
              <div><strong>{item.description}</strong><small>{shortDate(item.date)} · {item.meta}</small></div>
              <b className={item.amount>=0?'is-income':'is-expense'}>{item.amount>=0?'+':'−'} {money.format(Math.abs(item.amount))}</b>
            </button>)}
            {!model.recent.length ? <div className="mnx-mini-empty"><strong>Sem movimentações</strong><span>Nada registrado neste período.</span></div> : null}
          </div>
        </section>
      </aside>
    </section>
  </section>;
}
