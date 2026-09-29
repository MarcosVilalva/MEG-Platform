import { useMemo, useState } from 'react';
import type { FinancialEvent } from '../app/finance-client';
import type { PhoenixReadModel } from '../phoenix/contracts';
import { MegIcon, resolveFinancialIcon } from './MegMobileIcon';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function signedAmount(event: FinancialEvent) {
  const signed = Number(event.signedAmount || 0);
  if (Number.isFinite(signed) && signed !== 0) return signed;
  const amount = Math.abs(Number(event.amount || 0));
  return event.type === 'income' || event.type === 'redemption' ? amount : -amount;
}

function statusLabel(event: FinancialEvent) {
  const value = String(event.status || '').toLowerCase();
  if (value === 'planned') return 'PENDENTE';
  if (value === 'archived') return 'ARQUIVADO';
  if (['paid','reconciled','confirmed'].includes(value)) {
    return signedAmount(event) >= 0 ? 'RECEBIDA' : 'PAGO';
  }
  return value.toUpperCase() || 'LANÇAMENTO';
}

function statusTone(event: FinancialEvent) {
  const value = String(event.status || '').toLowerCase();
  if (value === 'planned') return 'pending';
  if (value === 'archived') return 'archived';
  return signedAmount(event) >= 0 ? 'received' : 'paid';
}

function shortDate(value: string) {
  const raw = String(value || '').slice(0, 10);
  const [year, month, day] = raw.split('-');
  return year && month && day ? `${day}/${month}/${year}` : raw;
}

function SearchGlyph() {
  return <MegIcon name="search" size={20}/>;
}

type MobileMovementKind = 'all' | 'income' | 'expense' | 'benefit';

function normalizeMovementText(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('pt-BR');
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
  const icon = resolveFinancialIcon({
    type: event.type,
    signedAmount: signedAmount(event),
    categoryName: event.category?.name,
    sourceGroup: event.sourceDetails?.group,
    description: event.description,
    paymentName: event.paymentMethod?.name || event.sourceDetails?.paymentMethod,
  });
  return <MegIcon name={icon} size={22}/>;
}

function movementTone(event: FinancialEvent) {
  return signedAmount(event) >= 0 ? 'income' : 'expense';
}

export function MegMobileMovements({
  data,
  onOpenEvent,
  onOpenPeriod,
}: {
  data: PhoenixReadModel;
  onOpenEvent: (event: FinancialEvent) => void;
  onOpenPeriod?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [filters, setFilters] = useState({ kind: 'all' as MobileMovementKind, categoryId: '', accountId: '', paymentMethodId: '' });
  const [draft, setDraft] = useState(filters);
  const [filterOpen, setFilterOpen] = useState(false);

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
    .filter((event) => {
      if (filters.kind === 'income' && signedAmount(event) < 0) return false;
      if (filters.kind === 'expense' && signedAmount(event) >= 0) return false;
      if (filters.categoryId && String(event.categoryId || event.category?.id || '') !== filters.categoryId) return false;
      if (filters.accountId && String(event.accountId || event.account?.id || '') !== filters.accountId) return false;
      if (filters.paymentMethodId && String(event.paymentMethodId || event.paymentMethod?.id || '') !== filters.paymentMethodId) return false;
      return true;
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const totals = posted.reduce((summary, event) => {
    const value = signedAmount(event);
    if (value >= 0) summary.income += value;
    else summary.expense += Math.abs(value);
    return summary;
  }, { income: 0, expense: 0 });
  const result = totals.income - totals.expense;
  const competenceLabel = data.month.split('-').reverse().join('/');
  const [year, month] = data.month.split('-').map(Number);
  const longPeriod = Number.isFinite(year) && Number.isFinite(month)
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
        .format(new Date(year, Math.max(0, month - 1), 1))
        .replace(/^./, (letter) => letter.toLocaleUpperCase('pt-BR'))
    : competenceLabel;

  const hasFilters = filters.kind !== 'all' || !!filters.categoryId || !!filters.accountId || !!filters.paymentMethodId;
  const visibleCount = normalized || hasFilters ? rows.length : Number(data.events.total || posted.length);

  const openFilters = () => {
    setDraft(filters);
    setDraftQuery(query);
    setFilterOpen(true);
  };

  const clearFilters = () => {
    const clean = { kind: 'all' as MobileMovementKind, categoryId: '', accountId: '', paymentMethodId: '' };
    setDraft(clean);
    setFilters(clean);
    setQuery('');
    setDraftQuery('');
  };

  return <main className="meg3-screen meg3-movements" data-meg-fixed-screen="true">
    <header className="meg3-movements-heading">
      <div>
        <h1>Lançamentos</h1>
        <p>Controle seus eventos financeiros.</p>
      </div>
      <button type="button" className={filterOpen || hasFilters || query ? 'active' : ''} aria-label="Buscar e filtrar lançamentos" onClick={openFilters}>
        <MegIcon name="sliders" size={24}/>
      </button>
    </header>

    <section className="meg3-movement-kpis" aria-label="Resumo dos lançamentos">
      <article className="income"><span aria-hidden="true"><MegIcon name="banknote" size={20}/></span><small>Entradas</small><strong>{money.format(totals.income)}</strong></article>
      <article className="expense"><span aria-hidden="true"><MegIcon name="receipt" size={20}/></span><small>Saídas</small><strong>{money.format(totals.expense)}</strong></article>
      <article className={result >= 0 ? 'result positive' : 'result negative'}><span aria-hidden="true"><MegIcon name="trend" size={20}/></span><small>Resultado</small><strong>{result >= 0 ? '+' : '-'}{money.format(Math.abs(result))}</strong></article>
    </section>

    <header className="meg3-movement-list-head">
      <span><strong>{visibleCount.toLocaleString('pt-BR')} lançamento{visibleCount === 1 ? '' : 's'}</strong><small>{competenceLabel} · toque para abrir</small></span>
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
            <span className="meg3-event-meta">
              <small>{shortDate(event.date)}</small>
              <i className={`status-${statusTone(event)}`}>{statusLabel(event)}</i>
            </span>
            <strong>{event.description}</strong>
            <em>{detail}</em>
            <i className={method ? 'meg3-payment-label' : 'meg3-payment-label muted'}>{method || 'Forma não informada'}</i>
          </span>
          <span className="meg3-event-value">
            <b>{signed > 0 ? '+' : '-'}{money.format(Math.abs(signed))}</b>
            <i><MegIcon name="chevron-right" size={15}/></i>
          </span>
        </button>;
      })}
      {!rows.length ? <div className="meg3-empty">Nenhum lançamento neste filtro.</div> : null}
    </section>

    {filterOpen ? <div className="meg3-movement-filter-overlay" role="presentation" onClick={() => setFilterOpen(false)}>
      <section className="meg3-movement-filter-sheet" role="dialog" aria-modal="true" aria-label="Filtrar lançamentos" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><small>LANÇAMENTOS</small><h2>Buscar e filtrar</h2></div>
          <button type="button" aria-label="Fechar" onClick={() => setFilterOpen(false)}><MegIcon name="x" size={20}/></button>
        </header>

        <label className="meg3-filter-search">
          <SearchGlyph/>
          <input autoFocus value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="Buscar por descrição, categoria, conta..."/>
        </label>

        <div className="meg3-filter-field">
          <small>Período</small>
          <button type="button" className="meg3-filter-period" onClick={() => { setFilterOpen(false); onOpenPeriod?.(); }}>
            <MegIcon name="calendar" size={18}/><span>{longPeriod}</span><MegIcon name="chevron-down" size={16}/>
          </button>
        </div>

        <div className="meg3-filter-field">
          <small>Status</small>
          <div className="meg3-movement-filter-types">
            {([
              ['all','Todos','sliders'],
              ['income','Receitas','arrow-up'],
              ['expense','Despesas','arrow-down'],
            ] as const).map(([value,label,icon]) =>
              <button key={value} type="button" className={draft.kind === value ? 'active' : ''} onClick={() => setDraft((current) => ({ ...current, kind: value }))}>
                <MegIcon name={icon} size={17}/><span>{label}</span>
              </button>
            )}
          </div>
        </div>

        <label className="meg3-filter-field">
          <small>Categoria</small>
          <span className="meg3-filter-select"><MegIcon name="list" size={18}/><select value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}><option value="">Todas as categorias</option>{data.categories.filter((item) => item.isActive !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><MegIcon name="chevron-right" size={15}/></span>
        </label>

        <label className="meg3-filter-field">
          <small>Conta</small>
          <span className="meg3-filter-select"><MegIcon name="wallet" size={18}/><select value={draft.accountId} onChange={(event) => setDraft((current) => ({ ...current, accountId: event.target.value }))}><option value="">Todas as contas</option>{data.accounts.filter((item) => item.isActive !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><MegIcon name="chevron-right" size={15}/></span>
        </label>

        <label className="meg3-filter-field">
          <small>Forma de pagamento</small>
          <span className="meg3-filter-select"><MegIcon name="card" size={18}/><select value={draft.paymentMethodId} onChange={(event) => setDraft((current) => ({ ...current, paymentMethodId: event.target.value }))}><option value="">Todas as formas</option>{data.paymentMethods.filter((item) => item.isActive !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><MegIcon name="chevron-right" size={15}/></span>
        </label>

        <footer>
          <button type="button" className="secondary" onClick={clearFilters}>Limpar</button>
          <button type="button" className="apply" onClick={() => { setFilters(draft); setQuery(draftQuery.trim()); setFilterOpen(false); }}><MegIcon name="check-line" size={18}/>Aplicar</button>
        </footer>
      </section>
    </div> : null}
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
