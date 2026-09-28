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

function MovementKpiGlyph({ kind }: { kind: 'income' | 'expense' | 'result' }) {
  if (kind === 'income') return <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="9" cy="17" rx="5" ry="2.5"/><path d="M4 14.5V17M14 14.5V17M4 12c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5-2.2-2.5-5-2.5S4 10.6 4 12Z"/><circle cx="16.5" cy="7.5" r="4.5"/><path d="M16.5 5v5M18 6h-2.1a1.1 1.1 0 0 0 0 2.2h1.2a1.1 1.1 0 0 1 0 2.2H15"/></svg>;
  if (kind === 'expense') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M15 14h3M8 3v5M6 6l2 2 2-2"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="8" r="3"/><circle cx="17" cy="16" r="3"/><path d="M9.5 9.5 14.5 14.5M14 5h5v5M19 5l-5 5"/></svg>;
}

function EventContextGlyph({ event }: { event: FinancialEvent }) {
  const category = normalizeMovementText(event.category?.name || event.sourceDetails?.group || '');
  const description = normalizeMovementText(event.description);
  const context = [category, description].filter(Boolean).join(' ');
  const signed = signedAmount(event);
  if (signed >= 0) return <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="9" cy="17" rx="5" ry="2.5"/><path d="M4 14.5V17M14 14.5V17M4 12c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5-2.2-2.5-5-2.5S4 10.6 4 12Z"/><circle cx="16.5" cy="7.5" r="4.5"/><path d="M16.5 5v5M18 6h-2.1a1.1 1.1 0 0 0 0 2.2h1.2a1.1 1.1 0 0 1 0 2.2H15"/></svg>;
  if (/bebidas? e similares|bebida|refrigerante|cerveja|suco|coca.?cola/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10l-1 18H8L7 3Z"/><path d="M8 7h8M13 7l3-5"/></svg>;
  if (/fast food|hamburg|lanche/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11c.6-4 3-6 7-6s6.4 2 7 6H5Z"/><path d="M4 14h16M6 14l1 5h10l1-5M8 11h.01M12 9h.01M16 11h.01"/></svg>;
  if (/presentes?|presente/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 6h18v4H3zM12 6v14M12 6c-3 0-5-1-5-3 0-1.2 1-2 2.2-2C11 1 12 3.3 12 6Zm0 0c3 0 5-1 5-3 0-1.2-1-2-2.2-2C13 1 12 3.3 12 6Z"/></svg>;
  if (/supermerc|mercado|mercearia|hortifruti/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2 11h10l3-8H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>;
  if (/automovel|veiculo|carro/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 16-1-4 2-5h12l2 5-1 4M4 16h16v4h-3v-2H7v2H4v-4Z"/><circle cx="8" cy="13" r="1"/><circle cx="16" cy="13" r="1"/></svg>;
  if (/moto|motocic/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17h5l3-6h3l2 6M9 9h4l3 8M14 7h4"/></svg>;
  if (/comunicacao|telefone|celular|claro|vivo|tim|oi|fibra/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.5 10 7.8 8.2 10c1.2 2.5 3.3 4.6 5.8 5.8l2.2-1.8 4.3 2.8-.8 3.2c-.2.8-1 1.4-1.9 1.3C10.2 20.4 3.6 13.8 2.7 6.2c-.1-.9.5-1.7 1.3-1.9l3.2-.8Z"/></svg>;
  if (/curso|educa|faculdade/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M7 9v5c3 2 7 2 10 0V9M21 7v7"/></svg>;
  if (/mat\. escolar|material escolar|escola/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2.5"/><path d="m9 14 6-6 2 2-6 6-3 1 1-3Z"/></svg>;
  if (/eletro|eletron|utilidade/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v6M16 3v6M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v4"/></svg>;
  if (/higiene|pessoal/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h6M10 5V3h4v2M8 8h8l1 13H7L8 8Z"/><path d="M10 12h4"/></svg>;
  if (/imovel|moradia|aluguel|condominio|casa/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>;
  if (/lazer|cinema|jogo|entretenimento|viagem/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l2 11-4 2-3-4h-4l-3 4-4-2L5 7Z"/><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01"/></svg>;
  if (/pet|veterin/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="8" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="5" cy="13" r="2"/><circle cx="19" cy="13" r="2"/><path d="M12 11c-3 0-6 4-5 7 1 3 4 1 5 1s4 2 5-1c1-3-2-7-5-7Z"/></svg>;
  if (/pgto de dividas|divida/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>;
  if (/saude|medic|farmac|hospital/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11Z"/><path d="M9 12h6M12 9v6"/></svg>;
  if (/titulos|previdencia/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.7-2.8 8.1-7 10-4.2-1.9-7-5.3-7-10V6l7-3Z"/><circle cx="12" cy="11" r="3"/><path d="M12 9v4"/></svg>;
  if (/transporte|uber|99|onibus/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M7 8h10M8 19v2M16 19v2"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/></svg>;
  if (/vestuario|roupa/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4-5 3 3 5 2-1v10h8V11l2 1 3-5-5-3c-.6 1.4-1.9 2-4 2S8.6 5.4 8 4Z"/></svg>;
  if (/sem categoria/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12 12 3h7l2 2v7l-9 9-9-9Z"/><circle cx="17" cy="7" r="1"/></svg>;
  if (/aliment|restaurante|padaria|refeic/.test(context)) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v8M9 3v8M6 7h3M7.5 11v10M15 3v8c0 2 3 2 3 0V3M16.5 13v8"/></svg>;
  return <EventGlyph positive={signed >= 0}/>;
}
function movementTone(event: FinancialEvent) {
  return signedAmount(event) >= 0 ? 'income' : 'expense';
}

export function MegMobileMovements({
  data,
  onOpenEvent,
  onNew,
  onOpenPeriod,
}: {
  data: PhoenixReadModel;
  onOpenEvent: (event: FinancialEvent) => void;
  onNew: () => void;
  onOpenPeriod?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Exclude<MobileMovementKind, 'benefit'>>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  const posted = useMemo(() => data.events.items, [data.events.items]);
  const categories = useMemo(() => Array.from(new Set(posted.map((event) => event.category?.name || event.sourceDetails?.group || '').filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [posted]);
  const accounts = useMemo(() => Array.from(new Set(posted.map((event) => event.account?.name || '').filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [posted]);
  const paymentMethods = useMemo(() => Array.from(new Set(posted.map((event) => event.paymentMethod?.name || event.sourceDetails?.paymentMethod || '').filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [posted]);
  const normalized = normalizeMovementText(query.trim());
  const rows = posted
    .filter((event) => !normalized || normalizeMovementText([
      event.description,
      event.category?.name,
      event.account?.name,
      event.paymentMethod?.name,
      event.sourceDetails?.group,
      event.sourceDetails?.paymentMethod,
    ].filter(Boolean).join(' ')).includes(normalized))
    .filter((event) => {
      const signed = signedAmount(event);
      if (kind === 'income' && signed < 0) return false;
      if (kind === 'expense' && signed >= 0) return false;
      const category = event.category?.name || event.sourceDetails?.group || '';
      const account = event.account?.name || '';
      const method = event.paymentMethod?.name || event.sourceDetails?.paymentMethod || '';
      if (categoryFilter && category !== categoryFilter) return false;
      if (accountFilter && account !== accountFilter) return false;
      if (paymentFilter && method !== paymentFilter) return false;
      return true;
    })
    .sort((a, b) => sortDirection === 'desc'
      ? String(b.date).localeCompare(String(a.date))
      : String(a.date).localeCompare(String(b.date)));
  const totals = posted.reduce((summary, event) => {
    const value = signedAmount(event);
    if (value >= 0) summary.income += value;
    else summary.expense += Math.abs(value);
    return summary;
  }, { income: 0, expense: 0 });
  const result = totals.income - totals.expense;
  const activeFilterCount = Number(kind !== 'all') + Number(Boolean(categoryFilter)) + Number(Boolean(accountFilter)) + Number(Boolean(paymentFilter));
  const period = data.month.split('-').reverse().join('/');
  const clearFilters = () => {
    setKind('all');
    setCategoryFilter('');
    setAccountFilter('');
    setPaymentFilter('');
  };

  return <main className="meg3-screen meg3-movements" data-meg-fixed-screen="true" data-meg-movements="approved-redesign">
    <header className="meg3-movements-heading">
      <div><h1>Lançamentos</h1><p>Controle seus eventos financeiros.</p></div>
      <button type="button" className={activeFilterCount ? 'active' : ''} aria-label="Filtrar lançamentos" onClick={() => setFiltersOpen(true)}>
        <FilterGlyph/>{activeFilterCount ? <b>{activeFilterCount}</b> : null}
      </button>
    </header>

    <section className="meg3-movement-kpis" aria-label="Resumo dos lançamentos">
      <article className="income"><span aria-hidden="true"><MovementKpiGlyph kind="income"/></span><strong>{money.format(totals.income)}</strong><small>Entradas</small></article>
      <article className="expense"><span aria-hidden="true"><MovementKpiGlyph kind="expense"/></span><strong>{money.format(totals.expense)}</strong><small>Saídas</small></article>
      <article className={result >= 0 ? 'result positive' : 'result negative'}><span aria-hidden="true"><MovementKpiGlyph kind="result"/></span><strong>{result >= 0 ? '+' : '-'}{money.format(Math.abs(result))}</strong><small>Resultado</small></article>
    </section>

    <section className="meg3-movement-controls" aria-label="Busca, contador e ordenação">
      <section className="meg3-movement-toolbar" aria-label="Buscar lançamentos">
        <label><SearchGlyph/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lançamento..."/></label>
      </section>

      <header className="meg3-movement-list-head">
        <span><strong>{rows.length.toLocaleString('pt-BR')} lançamento{rows.length === 1 ? '' : 's'}</strong><small>{period} · toque para abrir</small></span>
        <button
          type="button"
          className="meg3-movement-sort"
          aria-label={sortDirection === 'desc' ? 'Ordenar do mais antigo para o mais recente' : 'Ordenar do mais recente para o mais antigo'}
          title={sortDirection === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}
          onClick={() => setSortDirection((current) => current === 'desc' ? 'asc' : 'desc')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 4v16M5 7l3-3 3 3M16 20V4M13 17l3 3 3-3"/>
          </svg>
        </button>
      </header>
    </section>

    <section className="meg3-event-list" data-meg-scroll-region="true">
      {rows.map((event) => {
        const signed = signedAmount(event);
        const tone = movementTone(event);
        const category = event.category?.name || event.sourceDetails?.group || (signed >= 0 ? 'Receitas' : 'Despesas');
        const account = event.account?.name || '';
        const method = event.paymentMethod?.name || event.sourceDetails?.paymentMethod || '';
        const detail = [category, account].filter(Boolean).join(' · ');
        const status = statusLabel(event.status);
        const statusTone = status === 'PENDENTE' ? 'pending' : signed >= 0 ? 'received' : 'done';
        const date = String(event.date || '').slice(0, 10);
        const weekday = date ? new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z')).replace('.', '').toUpperCase() : '';
        return <button className={'meg3-event-card ' + tone + ' kind-' + mobileMovementKind(event)} type="button" key={event.id} onClick={() => onOpenEvent(event)}>
          <span className="meg3-event-icon"><EventContextGlyph event={event}/></span>
          <span className="meg3-event-copy">
            <small>{shortDate(event.date)}{weekday ? ' · ' + weekday : ''}</small>
            <strong>{event.description}</strong>
            <em>{detail}</em>
            {method ? <i className="meg3-payment-chip">{method}</i> : <i className="meg3-payment-chip muted">Forma não informada</i>}
          </span>
          <span className="meg3-event-value">
            <i className={'meg3-status-pill ' + statusTone}>{status}</i>
            <b>{signed > 0 ? '+' : '-'}{money.format(Math.abs(signed))}</b>
            <i className="meg3-event-chevron">›</i>
          </span>
        </button>;
      })}
      {!rows.length ? <div className="meg3-empty">Nenhum lançamento neste filtro.</div> : null}
    </section>

    {filtersOpen ? <div className="meg3-movement-filter-overlay" role="presentation" onClick={() => setFiltersOpen(false)}>
      <section className="meg3-movement-filter-sheet" role="dialog" aria-modal="true" aria-label="Filtrar lançamentos" onClick={(event) => event.stopPropagation()}>
        <header><h2>Filtrar lançamentos</h2><button type="button" aria-label="Fechar filtros" onClick={() => setFiltersOpen(false)}>×</button></header>
        <label className="meg3-filter-period"><span>Período</span><button type="button" onClick={() => { setFiltersOpen(false); onOpenPeriod?.(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18"/></svg><strong>{period}</strong><b>⌄</b></button></label>
        <fieldset><legend>Status</legend><div className="meg3-filter-status">
          <button type="button" className={kind === 'all' ? 'active' : ''} onClick={() => setKind('all')}>Todos</button>
          <button type="button" className={kind === 'income' ? 'active income' : 'income'} onClick={() => setKind('income')}>↑ Receitas</button>
          <button type="button" className={kind === 'expense' ? 'active expense' : 'expense'} onClick={() => setKind('expense')}>↓ Despesas</button>
        </div></fieldset>
        <label><span>Categoria</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">Todas as categorias</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span>Conta</span><select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}><option value="">Todas as contas</option>{accounts.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span>Forma de pagamento</span><select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option value="">Todas as formas</option>{paymentMethods.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <footer><button type="button" className="secondary" onClick={clearFilters}>Limpar</button><button type="button" className="apply" onClick={() => setFiltersOpen(false)}>✓ Aplicar</button></footer>
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
