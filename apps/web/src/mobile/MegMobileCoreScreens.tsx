import { useMemo, useState } from 'react';
import type { FinancialEvent } from '../app/finance-client';
import type { PhoenixReadModel } from '../phoenix/contracts';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function signedAmount(event: FinancialEvent) {
  const signed = Number(event.signedAmount || 0);
  if (Number.isFinite(signed) && signed !== 0) return signed;
  const amount = Math.abs(Number(event.amount || 0));
  return event.type === 'income' || event.type === 'redemption' ? amount : -amount;
}

function statusLabel(status: string) {
  const value = String(status || '').toLowerCase();
  if (['paid','reconciled','confirmed'].includes(value)) return 'PAGO';
  if (value === 'planned') return 'PENDENTE';
  if (value === 'archived') return 'ARQUIVADO';
  return value.toUpperCase() || 'LANÇAMENTO';
}

function shortDate(value: string) {
  const raw = String(value || '').slice(0, 10);
  const [year, month, day] = raw.split('-');
  return year && month && day ? `${day}/${month}/${year}` : raw;
}

function EventGlyph({ positive }: { positive: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={positive ? 'M12 19V5M7 10l5-5 5 5' : 'M12 5v14M7 14l5 5 5-5'} /></svg>;
}

function SearchGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>;
}

function FilterGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h8M16 7h4M4 17h4M12 17h8M4 12h12"/><circle cx="14" cy="7" r="2"/><circle cx="10" cy="17" r="2"/><circle cx="18" cy="12" r="2"/></svg>;
}

type MobileMovementKind = 'all' | 'income' | 'expense' | 'benefit';

function normalizeMovementText(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function mobileMovementKind(event: FinancialEvent): Exclude<MobileMovementKind, 'all'> {
  const context = normalizeMovementText([
    event.description,
    event.category?.name,
    event.paymentMethod?.name,
    event.sourceDetails?.group,
    event.sourceDetails?.paymentMethod,
  ].filter(Boolean).join(' '));
  if (/aliment|verocard|beneficio/.test(context)) return 'benefit';
  return signedAmount(event) >= 0 ? 'income' : 'expense';
}

function EventContextGlyph({ event }: { event: FinancialEvent }) {
  const context = normalizeMovementText([
    event.description,
    event.category?.name,
    event.paymentMethod?.name,
    event.sourceDetails?.group,
    event.sourceDetails?.paymentMethod,
  ].filter(Boolean).join(' '));
  if (/aliment|verocard|fast food|restaurante|lanche|mercado/.test(context)) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v8M9 3v8M6 7h3M7.5 11v10M15 3v8c0 2 3 2 3 0V3M16.5 13v8"/></svg>;
  }
  if (/pix/.test(context)) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 4 4-4 4-4-4 4-4ZM7 8l-4 4 4 4 4-4M17 8l4 4-4 4-4-4M12 13l4 4-4 4-4-4"/></svg>;
  }
  if (/cartao|credito|latam|itau|santander|bradesco|nubank|mercado pago/.test(context)) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 9h18M7 15h4"/></svg>;
  }
  return <EventGlyph positive={signedAmount(event) >= 0}/>;
}

function movementTone(event: FinancialEvent) {
  return signedAmount(event) >= 0 ? 'income' : 'expense';
}

export function MegMobileMovements({
  data,
  onOpenEvent,
  onNew,
}: {
  data: PhoenixReadModel;
  onOpenEvent: (event: FinancialEvent) => void;
  onNew: () => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<MobileMovementKind>('all');

  const posted = useMemo(() => data.events.items, [data.events.items]);
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  const rows = posted
    .filter((event) => !normalized || [
      event.description,
      event.category?.name,
      event.account?.name,
      event.paymentMethod?.name,
      event.sourceDetails?.group,
      event.sourceDetails?.paymentMethod,
    ].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(normalized))
    .filter((event) => kind === 'all' ? true : mobileMovementKind(event) === kind)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const totals = posted.reduce((summary, event) => {
    const value = signedAmount(event);
    if (value >= 0) summary.income += value;
    else summary.expense += Math.abs(value);
    return summary;
  }, { income: 0, expense: 0 });
  const result = totals.income - totals.expense;

  return <main className="meg3-screen meg3-movements" data-meg-fixed-screen="true">
    <header className="meg3-title-block meg3-movements-title">
      <span>CONTROLE FINANCEIRO</span>
      <h1>Lançamentos</h1>
      <p>Consulte cada lançamento com categoria, conta e forma de pagamento.</p>
    </header>

    <section className="meg3-movement-kpis" aria-label="Resumo dos lançamentos">
      <article className="income"><span aria-hidden="true">↑</span><small>Entradas</small><strong>{money.format(totals.income)}</strong></article>
      <article className="expense"><span aria-hidden="true">↓</span><small>Saídas</small><strong>{money.format(totals.expense)}</strong></article>
      <article className={result >= 0 ? 'result positive' : 'result negative'}><span aria-hidden="true">▥</span><small>Resultado</small><strong>{result >= 0 ? '+' : '-'}{money.format(Math.abs(result))}</strong></article>
    </section>

    <nav className="meg3-movement-tabs" aria-label="Tipo de lançamento">
      {([
        ['all','Todos'],
        ['income','Receitas'],
        ['expense','Despesas'],
        ['benefit','Alimentação'],
      ] as const).map(([value,label]) =>
        <button key={value} type="button" className={kind === value ? 'active' : ''} onClick={() => setKind(value)}>{label}</button>
      )}
    </nav>

    <section className="meg3-movement-toolbar">
      <label><SearchGlyph/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lançamento..."/></label>
      <button type="button" aria-label="Limpar filtros" className={kind !== 'all' || query ? 'active' : ''} onClick={() => { setKind('all'); setQuery(''); }}><FilterGlyph/></button>
    </section>

    <header className="meg3-movement-list-head">
      <span><strong>{rows.length.toLocaleString('pt-BR')} lançamento{rows.length === 1 ? '' : 's'}</strong><small>{data.month.split('-').reverse().join('/')} · toque para abrir</small></span>
      <button type="button" onClick={onNew}><b aria-hidden="true">＋</b>Novo</button>
    </header>

    <section className="meg3-event-list" data-meg-scroll-region="true">
      {rows.map((event) => {
        const signed = signedAmount(event);
        const tone = movementTone(event);
        const category = event.category?.name || event.sourceDetails?.group || (signed >= 0 ? 'Receitas' : 'Despesas');
        const account = event.account?.name || '';
        const method = event.paymentMethod?.name || event.sourceDetails?.paymentMethod || '';
        const detail = [category, account].filter(Boolean).join(' · ');
        return <button className={`meg3-event-card ${tone} kind-${mobileMovementKind(event)}`} type="button" key={event.id} onClick={() => onOpenEvent(event)}>
          <span className="meg3-event-icon"><EventContextGlyph event={event}/></span>
          <span className="meg3-event-copy">
            <small>{shortDate(event.date)} · {statusLabel(event.status)}</small>
            <strong>{event.description}</strong>
            <em>{detail}</em>
            {method ? <i className="meg3-payment-chip">{method}</i> : <i className="meg3-payment-chip muted">Forma não informada</i>}
          </span>
          <span className="meg3-event-value">
            <b>{signed > 0 ? '+' : '-'}{money.format(Math.abs(signed))}</b>
            <i>›</i>
          </span>
        </button>;
      })}
      {!rows.length ? <div className="meg3-empty">Nenhum lançamento neste filtro.</div> : null}
    </section>
  </main>;
}

export function MegMobileHistory({ data }: { data: PhoenixReadModel }) {
  const items = useMemo(() => [...data.financialAudit.items].sort((a,b) => String(b.at || '').localeCompare(String(a.at || ''))), [data.financialAudit.items]);
  return <main className="meg3-screen meg3-history" data-meg-fixed-screen="true">
    <header className="meg3-title-block"><span>HISTÓRICO</span><h1>Atividades</h1><p>Alterações e confirmações registradas no MEG.</p></header>
    <section className="meg3-history-summary"><article><small>Registros</small><strong>{items.length.toLocaleString('pt-BR')}</strong></article><article><small>Período</small><strong>{data.month.split('-').reverse().join('/')}</strong></article></section>
    <section className="meg3-timeline" data-meg-scroll-region="true">
      {items.map((item) => <article key={item.id} className="meg3-timeline-item">
        <span className="meg3-timeline-dot"/>
        <div><small>{item.at ? new Date(item.at).toLocaleString('pt-BR') : 'Registro'}</small><strong>{String(item.action || 'ATUALIZAÇÃO').replace(/_/g,' ')}</strong><p>{item.entity}{item.entityId ? ` · ${item.entityId}` : ''}</p></div>
      </article>)}
      {!items.length ? <div className="meg3-empty">Nenhuma atividade encontrada.</div> : null}
    </section>
  </main>;
}

export function MegMobileCashflow({ data }: { data: PhoenixReadModel }) {
  const [tab, setTab] = useState<'summary' | 'income' | 'expense'>('summary');
  const days = data.cashflow.days || [];
  const result = Number(data.cashflow.totalIncome || 0) - Number(data.cashflow.totalExpense || 0);
  const maxDaily = Math.max(1, ...days.flatMap((day) => [Number(day.income || 0), Number(day.expense || 0)]));
  const visibleDays = days.filter((day) => tab === 'summary' || (tab === 'income' ? Number(day.income || 0) > 0 : Number(day.expense || 0) > 0));
  return <main className="meg3-screen meg3-cashflow" data-meg-fixed-screen="true">
    <header className="meg3-title-block"><span>FLUXO DE CAIXA</span><h1>Fluxo de caixa</h1><p>Entradas, saídas e evolução do saldo no período.</p></header>
    <nav className="meg3-analysis-tabs" aria-label="Visão do fluxo de caixa">
      <button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>Resumo</button>
      <button className={tab === 'income' ? 'active' : ''} onClick={() => setTab('income')}>Entradas</button>
      <button className={tab === 'expense' ? 'active' : ''} onClick={() => setTab('expense')}>Saídas</button>
    </nav>
    <section className="meg3-analysis-scroll" data-meg-scroll-region="true">
      <section className="meg3-cashflow-summary">
        <article className="income"><small>Entradas</small><strong>{money.format(Number(data.cashflow.totalIncome || 0))}</strong></article>
        <article className="expense"><small>Saídas</small><strong>{money.format(Number(data.cashflow.totalExpense || 0))}</strong></article>
        <article className={result >= 0 ? 'result positive' : 'result negative'}><small>Resultado</small><strong>{money.format(result)}</strong></article>
      </section>
      <section className="meg3-cashflow-balance">
        <div><small>Saldo inicial</small><strong>{money.format(Number(data.cashflow.openingBalance || 0))}</strong></div>
        <div><small>Fechamento realizado</small><strong>{money.format(Number(data.cashflow.realizedClosing || 0))}</strong></div>
      </section>
      <section className="meg3-daily-chart" aria-label="Evolução diária do fluxo">
        <header><strong>Evolução diária</strong><small>{days.length} dias com movimentação</small></header>
        <div className="meg3-daily-chart-bars">
          {days.slice(-16).map((day) => <span key={day.date} title={shortDate(day.date)}>
            <i className="income" style={{height:`${Math.max(3, Number(day.income || 0) / maxDaily * 100)}%`}}/>
            <i className="expense" style={{height:`${Math.max(3, Number(day.expense || 0) / maxDaily * 100)}%`}}/>
          </span>)}
        </div>
        <footer><span><i className="income"/>Entradas</span><span><i className="expense"/>Saídas</span></footer>
      </section>
      <section className="meg3-cashflow-list">
      {visibleDays.map((day) => <article key={day.date}>
        <span><strong>{shortDate(day.date)}</strong><small>{day.eventCount} lançamento(s)</small></span>
        <span className="income">+{money.format(Number(day.income || 0))}</span>
        <span className="expense">-{money.format(Number(day.expense || 0))}</span>
        <b>{money.format(Number(day.realizedBalance || day.projectedBalance || 0))}</b>
      </article>)}
      {!visibleDays.length ? <div className="meg3-empty">Nenhum movimento diário neste filtro.</div> : null}
      </section>
    </section>
  </main>;
}

export function MegMobileAnalytics({ data }: { data: PhoenixReadModel }) {
  const [tab, setTab] = useState<'overview' | 'categories' | 'compare'>('overview');
  const categories = data.analytics.categories || [];
  const trend = data.analytics.monthlyTrend || [];
  const max = Math.max(1, ...categories.map((item) => Number(item.amount || 0)));
  const trendMax = Math.max(1, ...trend.flatMap((item) => [Number(item.income || 0), Number(item.expense || 0)]));
  const categoryTotal = categories.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const palette = ['#ff667b','#4be0ad','#58a8ff','#f4c94c','#9c86ff','#7faaa5'];
  let cursor = 0;
  const donutStops = categories.slice(0, 6).map((item, index) => {
    const start = cursor;
    cursor += categoryTotal > 0 ? Number(item.amount || 0) / categoryTotal * 100 : 0;
    return `${palette[index]} ${start}% ${cursor}%`;
  });
  return <main className="meg3-screen meg3-analytics" data-meg-fixed-screen="true">
    <header className="meg3-title-block"><span>RELATÓRIOS</span><h1>Relatórios</h1><p>Indicadores para entender hábitos e tomar decisões.</p></header>
    <nav className="meg3-analysis-tabs" aria-label="Tipo de relatório">
      <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Visão geral</button>
      <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Categorias</button>
      <button className={tab === 'compare' ? 'active' : ''} onClick={() => setTab('compare')}>Comparar</button>
    </nav>
    <section className="meg3-analysis-scroll" data-meg-scroll-region="true">
      <section className="meg3-analytics-kpis">
        <article className="income"><small>Receitas</small><strong>{money.format(Number(data.analytics.summary.realizedIncome || 0))}</strong></article>
        <article className="expense"><small>Despesas</small><strong>{money.format(Number(data.analytics.summary.realizedExpense || 0))}</strong></article>
        <article><small>Média diária</small><strong>{money.format(Number(data.analytics.dailyAverageExpense || 0))}</strong></article>
      </section>
      {tab !== 'compare' ? <section className="meg3-category-visual">
        <div className="meg3-donut" style={{background: donutStops.length ? `conic-gradient(${donutStops.join(',')})` : 'rgba(255,255,255,.06)'}}><span><small>Total</small><strong>{money.format(categoryTotal)}</strong><em>100%</em></span></div>
        <div className="meg3-category-legend">
          {categories.slice(0, 6).map((item, index) => <p key={item.name}><i style={{background:palette[index]}}/><span>{item.name}</span><strong>{categoryTotal ? Math.round(Number(item.amount || 0) / categoryTotal * 100) : 0}%</strong></p>)}
        </div>
      </section> : null}
      {tab === 'compare' || tab === 'overview' ? <section className="meg3-trend-chart">
        <header><strong>Evolução mensal</strong><small>Receitas e saídas</small></header>
        <div>{trend.slice(-6).map((item) => <span key={item.month}><b><i className="income" style={{height:`${Math.max(4, Number(item.income || 0) / trendMax * 100)}%`}}/><i className="expense" style={{height:`${Math.max(4, Number(item.expense || 0) / trendMax * 100)}%`}}/></b><small>{item.month.slice(5)}</small></span>)}</div>
      </section> : null}
      {tab !== 'compare' ? <section className="meg3-analytics-list">
        <header><strong>Por categoria</strong><small>{Number(data.analytics.concentrationTop3 || 0).toLocaleString('pt-BR',{maximumFractionDigits:1})}% concentrado nas três maiores</small></header>
        {categories.map((item) => <article key={item.name}>
          <div><span><strong>{item.name}</strong><small>{money.format(Number(item.amount || 0))}</small></span><div><i style={{width:`${Math.max(3, Math.min(100, Number(item.amount || 0) / max * 100))}%`}}/></div></div>
        </article>)}
        {!categories.length ? <div className="meg3-empty">Sem dados suficientes para o período.</div> : null}
      </section> : null}
    </section>
  </main>;
}
