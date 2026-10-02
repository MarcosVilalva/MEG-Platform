import { useEffect, useMemo, useState } from 'react';
import { WebNextIcon } from '../components/WebNextIcon';
import type { WebNextLaunchPreset } from '../components/WebNextLaunchSelector';
import type { WebNextMovementRow, WebNextMovementsModel } from '../data/movements-view-model';
import '../styles/movements.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function shortDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return day && month && year ? day + '/' + month + '/' + year.slice(-2) : value;
}

function statusTone(row: WebNextMovementRow) {
  if (row.statusKey === 'planned' || row.statusKey === 'draft') return 'is-pending';
  if (row.statusKey === 'reconciled') return 'is-reconciled';
  return 'is-done';
}

export function WebNextMovements({
  model,
  focusEventRequest,
  onLaunch,
  onEditEvent,
  onOpenPeriod,
  onOpenHistory,
}: {
  model: WebNextMovementsModel;
  focusEventRequest?: { token: number; eventId: string } | null;
  onLaunch: (preset: WebNextLaunchPreset) => void;
  onEditEvent: (eventId: string) => void;
  onOpenPeriod: () => void;
  onOpenHistory: () => void;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer' | 'benefit'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusEventRequest) return;
    if (model.rows.some((row) => row.id === focusEventRequest.eventId)) {
      setSelectedId(focusEventRequest.eventId);
    }
  }, [focusEventRequest, model.rows]);

  const filtered = useMemo(() => {
    const needle = normalize(search);
    return model.rows.filter((row) => {
      const haystack = normalize([
        row.description,
        row.classification,
        row.group,
        row.paymentMethod,
        row.accountName,
        row.modality,
        row.status,
      ].join(' '));
      const typeMatches = typeFilter === 'all'
        || (typeFilter === 'benefit' ? row.benefit : row.kind === typeFilter);
      return (!needle || haystack.includes(needle))
        && typeMatches
        && (statusFilter === 'all' || row.statusKey === statusFilter)
        && (accountFilter === 'all' || row.accountId === accountFilter);
    });
  }, [accountFilter, model.rows, search, statusFilter, typeFilter]);

  const filteredTotals = useMemo(() => filtered.reduce((sum, row) => {
    if (!['paid', 'reconciled', 'confirmed'].includes(row.statusKey)) return sum;
    if (row.benefit) return sum;
    if (row.kind === 'income') sum.income += Math.max(0, row.amount);
    if (row.kind === 'expense') sum.expense += Math.abs(row.amount);
    return sum;
  }, { income: 0, expense: 0 }), [filtered]);

  const hasFilters = Boolean(search.trim())
    || typeFilter !== 'all'
    || statusFilter !== 'all'
    || accountFilter !== 'all';
  const shownIncome = hasFilters ? filteredTotals.income : model.totals.income;
  const shownExpense = hasFilters ? filteredTotals.expense : model.totals.expense;
  const shownResult = shownIncome - shownExpense;
  const selected = model.rows.find((row) => row.id === selectedId) || null;

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setAccountFilter('all');
  };

  return <section className="mnx-movements" data-web-next-screen="movements" data-reference="web-board-2">
    <header className="mnx-movements-head">
      <div>
        <span>LANÇAMENTOS</span>
        <h1>Seu movimento financeiro, sem ruído</h1>
        <p>Receitas, despesas, benefício e transferências do período em uma única leitura.</p>
      </div>
      <button type="button" className="mnx-movements-primary" onClick={() => onLaunch('expense')}>
        <WebNextIcon name="plus" aria-hidden="true" />
        <span><strong>Nova despesa</strong><small>Abrir lançamento</small></span>
      </button>
    </header>

    <section className="mnx-movement-kpis" aria-label="Resumo dos lançamentos">
      <article className="is-income">
        <span><WebNextIcon name="receivables" /></span>
        <div><small>Receitas realizadas</small><strong>{money.format(shownIncome)}</strong><em>{hasFilters ? 'No filtro atual' : model.periodLabel}</em></div>
      </article>
      <article className="is-expense">
        <span><WebNextIcon name="payables" /></span>
        <div><small>Despesas realizadas</small><strong>{money.format(shownExpense)}</strong><em>{hasFilters ? 'No filtro atual' : model.periodLabel}</em></div>
      </article>
      <article className={shownResult >= 0 ? 'is-result-positive' : 'is-result-negative'}>
        <span><WebNextIcon name="analytics" /></span>
        <div><small>Movimento líquido</small><strong>{money.format(shownResult)}</strong><em>Receitas menos despesas</em></div>
      </article>
      <article className="is-benefit">
        <span><WebNextIcon name="food" /></span>
        <div><small>Movimento em benefício</small><strong>{money.format(Math.abs(model.totals.benefit))}</strong><em>Fora do caixa monetário</em></div>
      </article>
    </section>

    <section className="mnx-movement-board">
      <div className="mnx-movement-toolbar">
        <label className="mnx-movement-search">
          <WebNextIcon name="search" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar descrição, grupo, conta ou forma de pagamento"
            aria-label="Buscar lançamentos"
          />
          {search ? <button type="button" aria-label="Limpar busca" onClick={() => setSearch('')}>×</button> : null}
        </label>

        <label>
          <span>Tipo</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
            <option value="all">Todos</option>
            <option value="expense">Despesas</option>
            <option value="income">Receitas</option>
            <option value="transfer">Transferências</option>
            <option value="benefit">Benefício</option>
          </select>
        </label>

        <label>
          <span>Situação</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Todas</option>
            <option value="planned">Pendente</option>
            <option value="confirmed">Confirmado</option>
            <option value="paid">Pago</option>
            <option value="reconciled">Conciliado</option>
          </select>
        </label>

        <label className="mnx-movement-account-filter">
          <span>Conta</span>
          <select value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
            <option value="all">Todas as contas</option>
            {model.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>

        <button type="button" className="mnx-movement-period" onClick={onOpenPeriod}>
          <WebNextIcon name="calendar" aria-hidden="true" />
          <span><small>Período</small><strong>{model.periodLabel}</strong></span>
        </button>

        {hasFilters ? <button type="button" className="mnx-movement-clear" onClick={clearFilters}>Limpar</button> : null}
      </div>

      <div className="mnx-movement-board-head">
        <div><strong>{filtered.length}</strong><span>lançamento{filtered.length === 1 ? '' : 's'} encontrado{filtered.length === 1 ? '' : 's'}</span></div>
        <small>Duplo clique abre a edição. Clique simples mostra os detalhes.</small>
      </div>

      <div className="mnx-movement-grid" role="table" aria-label="Lançamentos financeiros">
        <div className="mnx-movement-grid-head" role="row">
          <span>Vencimento</span>
          <span>Tipo</span>
          <span>Descrição</span>
          <span>Grupo</span>
          <span>Conta</span>
          <span>Pagamento</span>
          <span>Situação</span>
          <span>Valor</span>
        </div>

        <div className="mnx-movement-grid-scroll" data-meg-scroll-region="true">
          {filtered.map((row) => <button
            type="button"
            role="row"
            key={row.id}
            data-event-id={row.id}
            className={'mnx-movement-row is-' + row.kind + (row.benefit ? ' is-benefit' : '')}
            onClick={() => setSelectedId(row.id)}
            onDoubleClick={() => onEditEvent(row.id)}
          >
            <span className="is-date" role="cell"><strong>{shortDate(row.dueDate)}</strong><small>{row.weekday}</small></span>
            <span className="is-type" role="cell"><i><WebNextIcon name={row.benefit ? 'food' : row.kind === 'income' ? 'receivables' : row.kind === 'transfer' ? 'cashflow' : 'payables'} /></i><strong>{row.benefit ? 'Benefício' : row.typeLabel}</strong></span>
            <span className="is-description" role="cell"><strong title={row.description}>{row.description}</strong><small>{row.classification !== '—' ? row.classification : row.modality}</small></span>
            <span className="is-group" role="cell">{row.group}</span>
            <span className="is-account" role="cell">{row.accountName}</span>
            <span className="is-payment" role="cell">{row.paymentMethod}</span>
            <span className={'is-status ' + statusTone(row)} role="cell">{row.status}</span>
            <span className={'is-value ' + (row.amount > 0 ? 'positive' : row.amount < 0 ? 'negative' : '')} role="cell">{money.format(row.amount)}</span>
          </button>)}

          {!filtered.length ? <div className="mnx-movement-empty">
            <WebNextIcon name="search" />
            <strong>Nenhum lançamento encontrado</strong>
            <span>Revise os filtros ou inclua um novo movimento.</span>
            <button type="button" onClick={clearFilters}>Limpar filtros</button>
          </div> : null}
        </div>
      </div>
    </section>

    {selected ? <div className="mnx-movement-detail-overlay">
      <button type="button" className="mnx-movement-detail-backdrop" aria-label="Fechar detalhes" onClick={() => setSelectedId(null)} />
      <aside className="mnx-movement-detail" aria-label="Detalhes do lançamento">
        <header>
          <span className={'is-' + (selected.benefit ? 'benefit' : selected.kind)}>
            <WebNextIcon name={selected.benefit ? 'food' : selected.kind === 'income' ? 'receivables' : selected.kind === 'transfer' ? 'cashflow' : 'payables'} />
          </span>
          <div><small>DETALHES DO LANÇAMENTO</small><h2>{selected.description}</h2><p>{selected.benefit ? 'Compra com benefício' : selected.typeLabel} · {selected.status}</p></div>
          <button type="button" aria-label="Fechar detalhes" onClick={() => setSelectedId(null)}>×</button>
        </header>

        <div className="mnx-movement-detail-value">
          <span>Valor do movimento</span>
          <strong className={selected.amount >= 0 ? 'positive' : 'negative'}>{money.format(selected.amount)}</strong>
        </div>

        <div className="mnx-movement-detail-grid">
          <div><span>Vencimento</span><strong>{shortDate(selected.dueDate)}</strong></div>
          <div><span>Data da compra</span><strong>{shortDate(selected.purchaseDate)}</strong></div>
          <div><span>Conta</span><strong>{selected.accountName}</strong></div>
          <div><span>Forma</span><strong>{selected.paymentMethod}</strong></div>
          <div><span>Classificação</span><strong>{selected.classification}</strong></div>
          <div><span>Grupo</span><strong>{selected.group}</strong></div>
          <div><span>Modalidade</span><strong>{selected.modality}</strong></div>
          <div><span>Situação</span><strong>{selected.status}</strong></div>
        </div>

        {selected.notes ? <div className="mnx-movement-detail-notes"><span>Observações</span><p>{selected.notes}</p></div> : null}

        <footer>
          <button type="button" className="primary" onClick={() => { setSelectedId(null); onEditEvent(selected.id); }}>Editar lançamento</button>
          <button type="button" onClick={() => { setSelectedId(null); onOpenHistory(); }}>Ver histórico</button>
          <button type="button" onClick={() => setSelectedId(null)}>Fechar</button>
        </footer>
      </aside>
    </div> : null}
  </section>;
}
