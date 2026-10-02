import { useEffect, useMemo, useState } from 'react';
import { WebNextIcon } from '../components/WebNextIcon';
import type { WebNextMovementItem, WebNextMovementKind, WebNextMovementsModel } from '../data/movements-view-model';
import '../styles/movements.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

type MovementTypeFilter = 'all' | WebNextMovementKind;
type MovementStatusFilter = 'all' | 'pending' | 'paid' | 'reconciled';
type PageSize = 20 | 50 | 'all';

export type WebNextMovementLaunchPreset = 'expense' | 'income' | 'benefit' | 'transfer';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—';
  return date.format(new Date(`${value}T12:00:00Z`));
}

function amountLabel(item: WebNextMovementItem) {
  if (item.kind === 'transfer') return money.format(item.amount);
  return money.format(item.signedAmount);
}

function matchesStatus(item: WebNextMovementItem, filter: MovementStatusFilter) {
  if (filter === 'all') return true;
  return item.status === filter;
}

function filteredTotals(items: WebNextMovementItem[]) {
  return items.reduce((total, item) => {
    if (!item.realized || item.isBenefit) return total;
    if (item.kind === 'income') total.income += Math.abs(item.signedAmount);
    if (item.kind === 'expense') total.expense += Math.abs(item.signedAmount);
    return total;
  }, { income: 0, expense: 0 });
}

export function WebNextMovements({
  model,
  periodLabel,
  focusEventRequest,
  onLaunch,
  onEditEvent,
  onOpenPeriod,
}: {
  model: WebNextMovementsModel;
  periodLabel: string;
  focusEventRequest?: { token: number; eventId: string } | null;
  onLaunch: (preset: WebNextMovementLaunchPreset) => void;
  onEditEvent: (eventId: string) => void;
  onOpenPeriod: () => void;
}) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<MovementStatusFilter>('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    return model.items.filter((item) => {
      if (typeFilter !== 'all' && item.kind !== typeFilter) return false;
      if (!matchesStatus(item, statusFilter)) return false;
      if (accountFilter !== 'all' && item.accountId !== accountFilter) return false;
      if (!needle) return true;
      return normalize([
        item.description,
        item.classification,
        item.group,
        item.paymentMethod,
        item.accountName,
        item.modality,
        item.statusLabel,
      ].join(' ')).includes(needle);
    });
  }, [model.items, query, typeFilter, statusFilter, accountFilter]);

  const hasFilters = Boolean(query.trim()) || typeFilter !== 'all' || statusFilter !== 'all' || accountFilter !== 'all';
  const dynamicTotals = useMemo(() => filteredTotals(filtered), [filtered]);
  const income = hasFilters ? dynamicTotals.income : model.summary.income;
  const expense = hasFilters ? dynamicTotals.expense : model.summary.expense;
  const result = hasFilters ? income - expense : model.summary.result;
  const pendingCount = hasFilters
    ? filtered.filter((item) => item.status === 'pending').length
    : model.summary.pendingCount;

  const numericPageSize = pageSize === 'all' ? Math.max(1, filtered.length) : pageSize;
  const pageCount = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filtered.length / numericPageSize));
  const currentPage = Math.min(page, pageCount);
  const start = pageSize === 'all' ? 0 : (currentPage - 1) * numericPageSize;
  const visible = pageSize === 'all' ? filtered : filtered.slice(start, start + numericPageSize);
  const end = pageSize === 'all' ? filtered.length : Math.min(filtered.length, start + numericPageSize);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, statusFilter, accountFilter, pageSize]);

  useEffect(() => {
    if (!focusEventRequest?.eventId) return;
    const index = filtered.findIndex((item) => item.id === focusEventRequest.eventId);
    if (index < 0) return;
    const targetPage = pageSize === 'all' ? 1 : Math.floor(index / numericPageSize) + 1;
    setPage(targetPage);
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-mnx-event-id="${focusEventRequest.eventId}"]`)?.scrollIntoView({ block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusEventRequest?.token, focusEventRequest?.eventId, filtered, numericPageSize, pageSize]);

  const clearFilters = () => {
    setQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setAccountFilter('all');
  };

  return <section className="mnx-movements" data-web-next-screen="movements" data-reference="web-board-2-approved">
    <header className="mnx-movements-hero">
      <div className="mnx-movements-title">
        <span>CONTROLE FINANCEIRO</span>
        <h1>Lançamentos</h1>
        <p>Receitas, despesas e transferências em uma visão única do período.</p>
      </div>
      <div className="mnx-movements-actions" aria-label="Ações de lançamento">
        <button className="is-primary" type="button" onClick={() => onLaunch('expense')}><WebNextIcon name="plus" /><span>Nova despesa</span></button>
        <button type="button" onClick={() => onLaunch('income')}><WebNextIcon name="receivables" /><span>Nova receita</span></button>
        <button type="button" onClick={() => onLaunch('transfer')}><WebNextIcon name="cashflow" /><span>Transferência</span></button>
      </div>
    </header>

    <section className="mnx-movement-kpis" aria-label="Resumo dos lançamentos">
      <article className="is-income">
        <span><WebNextIcon name="receivables" /></span>
        <div><small>Receitas realizadas</small><strong>{money.format(income)}</strong><em>{hasFilters ? 'No filtro atual' : periodLabel}</em></div>
      </article>
      <article className="is-expense">
        <span><WebNextIcon name="payables" /></span>
        <div><small>Despesas realizadas</small><strong>{money.format(expense)}</strong><em>{hasFilters ? 'No filtro atual' : periodLabel}</em></div>
      </article>
      <article className={result >= 0 ? 'is-result positive' : 'is-result negative'}>
        <span><WebNextIcon name="analytics" /></span>
        <div><small>Resultado</small><strong>{result > 0 ? '+' : ''}{money.format(result)}</strong><em>Entradas menos saídas realizadas</em></div>
      </article>
      <article className="is-pending">
        <span><WebNextIcon name="calendar" /></span>
        <div><small>Pendentes</small><strong>{pendingCount}</strong><em>{pendingCount === 1 ? 'lançamento em aberto' : 'lançamentos em aberto'}</em></div>
      </article>
    </section>

    <section className="mnx-movement-toolbar" aria-label="Filtros dos lançamentos">
      <label className="mnx-movement-search">
        <WebNextIcon name="search" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar descrição, categoria, conta ou forma de pagamento" />
        {query ? <button type="button" aria-label="Limpar busca" onClick={() => setQuery('')}>×</button> : null}
      </label>

      <div className="mnx-movement-type-filter" role="group" aria-label="Tipo de lançamento">
        {([
          ['all', 'Todos'],
          ['income', 'Receitas'],
          ['expense', 'Despesas'],
          ['transfer', 'Transferências'],
        ] as Array<[MovementTypeFilter, string]>).map(([value, label]) =>
          <button key={value} type="button" className={typeFilter === value ? 'is-active' : ''} onClick={() => setTypeFilter(value)}>{label}</button>
        )}
      </div>

      <label className="mnx-movement-select">
        <span>Situação</span>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as MovementStatusFilter)}>
          <option value="all">Todas</option>
          <option value="pending">Pendentes</option>
          <option value="paid">Pagos / recebidos</option>
          <option value="reconciled">Conciliados</option>
        </select>
      </label>

      <label className="mnx-movement-select is-account">
        <span>Conta</span>
        <select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
          <option value="all">Todas as contas</option>
          {model.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
      </label>

      <button className="mnx-movement-period" type="button" onClick={onOpenPeriod}><WebNextIcon name="calendar" /><span>{periodLabel}</span><WebNextIcon name="chevron" /></button>
      {hasFilters ? <button className="mnx-movement-clear" type="button" onClick={clearFilters}>Limpar</button> : null}
    </section>

    <section className="mnx-movement-ledger">
      <header>
        <div>
          <span>HISTÓRICO FINANCEIRO</span>
          <strong>{filtered.length} {filtered.length === 1 ? 'lançamento' : 'lançamentos'}</strong>
        </div>
        <small>Do mais recente para o mais antigo · clique em editar para abrir o lançamento completo.</small>
      </header>

      <div className="mnx-movement-table-scroll" data-meg-scroll-region="true">
        <table className="mnx-movement-table">
          <thead>
            <tr>
              <th className="is-date">Vencimento</th>
              <th className="is-purchase">Compra</th>
              <th className="is-type">Tipo</th>
              <th className="is-description">Descrição</th>
              <th className="is-classification">Classificação</th>
              <th className="is-value">Valor</th>
              <th className="is-payment">Forma</th>
              <th className="is-status">Situação</th>
              <th className="is-account">Conta</th>
              <th className="is-action"><span className="mnx-visually-hidden">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => <tr
              key={item.id}
              data-mnx-event-id={item.id}
              className={focusEventRequest?.eventId === item.id ? 'is-focused' : undefined}
              onDoubleClick={() => onEditEvent(item.id)}
            >
              <td className="is-date" data-label="Vencimento"><strong>{formatDate(item.dueDate)}</strong><small>{item.weekday || '—'}</small></td>
              <td className="is-purchase" data-label="Compra">{formatDate(item.purchaseDate)}</td>
              <td className="is-type" data-label="Tipo"><span className={`mnx-movement-kind is-${item.kind}`}>{item.kindLabel}</span></td>
              <td className="is-description" data-label="Descrição"><strong title={item.description}>{item.description}</strong><small>{item.group}</small></td>
              <td className="is-classification" data-label="Classificação">{item.classification}</td>
              <td className={`is-value is-${item.kind}`} data-label="Valor"><strong>{amountLabel(item)}</strong></td>
              <td className="is-payment" data-label="Forma"><strong>{item.paymentMethod}</strong><small>{item.modality}</small></td>
              <td className="is-status" data-label="Situação"><span className={`mnx-movement-status is-${item.status}`}>{item.statusLabel}</span></td>
              <td className="is-account" data-label="Conta">{item.accountName}</td>
              <td className="is-action"><button type="button" aria-label={`Editar ${item.description}`} title="Editar lançamento" onClick={() => onEditEvent(item.id)}><WebNextIcon name="chevron" /></button></td>
            </tr>)}
          </tbody>
        </table>

        {!visible.length ? <div className="mnx-movement-empty">
          <span><WebNextIcon name="search" /></span>
          <strong>Nenhum lançamento encontrado</strong>
          <small>Revise a busca ou os filtros aplicados.</small>
          {hasFilters ? <button type="button" onClick={clearFilters}>Limpar filtros</button> : null}
        </div> : null}
      </div>

      <footer className="mnx-movement-pagination">
        <div><strong>{filtered.length ? `${start + 1}–${end}` : '0'} de {filtered.length}</strong><span>registros exibidos</span></div>
        <div className="mnx-movement-page-controls">
          <button type="button" disabled={currentPage <= 1 || pageSize === 'all'} aria-label="Página anterior" onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
          <span>Página <strong>{currentPage}</strong> de {pageCount}</span>
          <button type="button" disabled={currentPage >= pageCount || pageSize === 'all'} aria-label="Próxima página" onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button>
        </div>
        <label><span>Exibir</span><select value={String(pageSize)} onChange={(event) => setPageSize(event.target.value === 'all' ? 'all' : Number(event.target.value) as 20 | 50)}><option value="20">20 por página</option><option value="50">50 por página</option><option value="all">Todos</option></select></label>
      </footer>
    </section>
  </section>;
}
