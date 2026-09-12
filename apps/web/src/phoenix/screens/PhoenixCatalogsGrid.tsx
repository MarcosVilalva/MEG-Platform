import { useMemo, useState } from 'react';
import type { CreditCard } from '../../app/cards-client';
import { PhoenixGridFilter, type PhoenixGridFilterKind, type PhoenixGridFilterOption, type PhoenixGridFilterValue, type PhoenixGridSortDirection } from '../PhoenixGridFilter';
import { resolvePhoenixCardIdentity } from '../card-identity';
import type { PhoenixReadModel } from '../contracts';
import '../phoenix-screens.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type CatalogTab = 'accounts' | 'categories' | 'payments' | 'cards';
type CatalogGridKey = 'name' | 'type' | 'institution' | 'openingBalance' | 'group' | 'status' | 'issuer' | 'brand' | 'creditLimit' | 'closingDay' | 'dueDay';
type CatalogSort = { key: CatalogGridKey; direction: PhoenixGridSortDirection } | null;
type CatalogFilterMap = Record<CatalogGridKey, PhoenixGridFilterValue>;
type CatalogRow = {
  id: string;
  name: string;
  type: string;
  institution: string;
  openingBalance: number | null;
  group: string;
  status: string;
  issuer: string;
  brand: string;
  creditLimit: number | null;
  closingDay: number | null;
  dueDay: number | null;
  card?: CreditCard;
};

type CatalogState<T> = Record<CatalogTab, T>;

const tabKeys: Record<CatalogTab, CatalogGridKey[]> = {
  accounts: ['name', 'type', 'institution', 'openingBalance', 'status'],
  categories: ['name', 'group', 'type', 'status'],
  payments: ['name', 'type', 'status'],
  cards: ['name', 'issuer', 'brand', 'creditLimit', 'closingDay', 'dueDay']
};

const labels: Record<CatalogGridKey, string> = {
  name: 'Nome',
  type: 'Tipo',
  institution: 'Instituição',
  openingBalance: 'Saldo inicial',
  group: 'Grupo',
  status: 'Status',
  issuer: 'Emissor',
  brand: 'Bandeira',
  creditLimit: 'Limite',
  closingDay: 'Fechamento',
  dueDay: 'Vencimento'
};

function initialFilters(): CatalogFilterMap {
  return {
    name: { kind: 'text', value: '' },
    type: { kind: 'multi', values: [] },
    institution: { kind: 'multi', values: [] },
    openingBalance: { kind: 'number', min: '', max: '' },
    group: { kind: 'multi', values: [] },
    status: { kind: 'multi', values: [] },
    issuer: { kind: 'multi', values: [] },
    brand: { kind: 'multi', values: [] },
    creditLimit: { kind: 'number', min: '', max: '' },
    closingDay: { kind: 'number', min: '', max: '' },
    dueDay: { kind: 'number', min: '', max: '' }
  };
}

function initialFiltersByTab(): CatalogState<CatalogFilterMap> {
  return {
    accounts: initialFilters(),
    categories: initialFilters(),
    payments: initialFilters(),
    cards: initialFilters()
  };
}

function initialSortByTab(): CatalogState<CatalogSort> {
  return { accounts: null, categories: null, payments: null, cards: null };
}

function initialSearchByTab(): CatalogState<string> {
  return { accounts: '', categories: '', payments: '', cards: '' };
}

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function parseBrazilianNumber(value: string) {
  const normalized = String(value || '')
    .trim()
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function filterActive(filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return Boolean(filter.value.trim());
  if (filter.kind === 'multi') return filter.values.length > 0;
  if (filter.kind === 'number') return Boolean(filter.min || filter.max);
  return Boolean(filter.from || filter.to);
}

function filterSummary(label: string, filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return `${label}: ${filter.value}`;
  if (filter.kind === 'multi') return `${label}: ${filter.values.length} valor(es)`;
  if (filter.kind === 'number') return `${label}: ${filter.min || '−∞'} até ${filter.max || '+∞'}`;
  return `${label}: ${filter.from || 'início'} até ${filter.to || 'fim'}`;
}

function matches(value: string | number | null, filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return !filter.value.trim() || normalize(value).includes(normalize(filter.value));
  if (filter.kind === 'multi') return !filter.values.length || filter.values.includes(normalize(value));
  if (filter.kind === 'number') {
    const current = typeof value === 'number' ? value : Number.NaN;
    if (!Number.isFinite(current)) return !filter.min && !filter.max;
    const min = parseBrazilianNumber(filter.min);
    const max = parseBrazilianNumber(filter.max);
    if (min !== null && current < min) return false;
    if (max !== null && current > max) return false;
    return true;
  }
  return true;
}

function compare(left: string | number | null, right: string | number | null, direction: PhoenixGridSortDirection) {
  const emptyLeft = left === null || left === '';
  const emptyRight = right === null || right === '';
  if (emptyLeft !== emptyRight) return emptyLeft ? 1 : -1;
  if (typeof left === 'number' && typeof right === 'number') return direction === 'asc' ? left - right : right - left;
  const result = String(left ?? '').localeCompare(String(right ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

function optionList(rows: CatalogRow[], key: CatalogGridKey): PhoenixGridFilterOption[] {
  const values = new Map<string, { label: string; count: number }>();
  rows.forEach((row) => {
    const label = String(row[key] ?? '—');
    const value = normalize(label);
    const current = values.get(value);
    values.set(value, { label, count: (current?.count || 0) + 1 });
  });
  return [...values.entries()]
    .map(([value, item]) => ({ value, label: item.label, count: item.count }))
    .sort((left, right) => left.label.localeCompare(right.label, 'pt-BR', { numeric: true, sensitivity: 'base' }));
}

function PageIntro() {
  return <header className="px-screen-head">
    <div><span className="px-kicker">Cadastros</span><h1>Base operacional</h1><p>Contas, classificações, grupos, formas de pagamento e cartões usados pelas regras financeiras.</p></div>
    <div className="px-screen-head-aside"><span className="px-status reconciled">Histórico protegido</span></div>
  </header>;
}

export function PhoenixCatalogsGrid({ data }: { data: PhoenixReadModel }) {
  const [tab, setTab] = useState<CatalogTab>('accounts');
  const [filtersByTab, setFiltersByTab] = useState<CatalogState<CatalogFilterMap>>(initialFiltersByTab);
  const [sortByTab, setSortByTab] = useState<CatalogState<CatalogSort>>(initialSortByTab);
  const [searchByTab, setSearchByTab] = useState<CatalogState<string>>(initialSearchByTab);

  const activeAccounts = data.accounts.filter((item) => item.isActive);
  const activeCategories = data.categories.filter((item) => item.isActive);
  const activePayments = data.paymentMethods.filter((item) => item.isActive);

  const rows = useMemo<CatalogRow[]>(() => {
    if (tab === 'accounts') return data.accounts.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type || '—',
      institution: item.institution || '—',
      openingBalance: Number(item.openingBalance || 0),
      group: '',
      status: item.isActive ? 'Ativa' : 'Inativa',
      issuer: '', brand: '', creditLimit: null, closingDay: null, dueDay: null
    }));
    if (tab === 'categories') return data.categories.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type || '—',
      institution: '', openingBalance: null,
      group: item.group || '—',
      status: item.isActive ? 'Ativa' : 'Inativa',
      issuer: '', brand: '', creditLimit: null, closingDay: null, dueDay: null
    }));
    if (tab === 'payments') return data.paymentMethods.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type || '—',
      institution: '', openingBalance: null, group: '',
      status: item.isActive ? 'Ativa' : 'Inativa',
      issuer: '', brand: '', creditLimit: null, closingDay: null, dueDay: null
    }));
    return data.cards.map((item) => ({
      id: item.id,
      name: item.name,
      type: '', institution: '', openingBalance: null, group: '', status: '',
      issuer: item.issuer || '—',
      brand: item.brand || '—',
      creditLimit: Number(item.creditLimit || 0),
      closingDay: Number(item.closingDay || 0),
      dueDay: Number(item.dueDay || 0),
      card: item
    }));
  }, [data, tab]);

  const filters = filtersByTab[tab];
  const sort = sortByTab[tab];
  const search = searchByTab[tab];
  const keys = tabKeys[tab];
  const activeFilterKeys = keys.filter((key) => filterActive(filters[key]));

  const options = useMemo(() => ({
    type: optionList(rows, 'type'),
    institution: optionList(rows, 'institution'),
    group: optionList(rows, 'group'),
    status: optionList(rows, 'status'),
    issuer: optionList(rows, 'issuer'),
    brand: optionList(rows, 'brand')
  }), [rows]);

  const visibleRows = useMemo(() => {
    const needle = normalize(search);
    const filtered = rows.filter((row) => {
      const searchable = normalize(keys.map((key) => row[key]).join(' '));
      if (needle && !searchable.includes(needle)) return false;
      return keys.every((key) => matches(row[key] as string | number | null, filters[key]));
    });
    if (!sort || !keys.includes(sort.key)) return filtered;
    return [...filtered].sort((left, right) => compare(left[sort.key] as string | number | null, right[sort.key] as string | number | null, sort.direction));
  }, [rows, keys, filters, search, sort]);

  function updateFilter(key: CatalogGridKey, value: PhoenixGridFilterValue) {
    setFiltersByTab((current) => ({ ...current, [tab]: { ...current[tab], [key]: value } }));
  }

  function clearFilter(key: CatalogGridKey) {
    const fresh = initialFilters();
    setFiltersByTab((current) => ({ ...current, [tab]: { ...current[tab], [key]: fresh[key] } }));
  }

  function clearGrid() {
    setFiltersByTab((current) => ({ ...current, [tab]: initialFilters() }));
    setSortByTab((current) => ({ ...current, [tab]: null }));
    setSearchByTab((current) => ({ ...current, [tab]: '' }));
  }

  function setSearch(value: string) {
    setSearchByTab((current) => ({ ...current, [tab]: value }));
  }

  function setSort(key: CatalogGridKey, direction: PhoenixGridSortDirection) {
    setSortByTab((current) => ({ ...current, [tab]: { key, direction } }));
  }

  function clearSort() {
    setSortByTab((current) => ({ ...current, [tab]: null }));
  }

  function header(label: string, key: CatalogGridKey, kind: PhoenixGridFilterKind, list?: PhoenixGridFilterOption[]) {
    return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} options={list} sort={sort?.key === key ? sort.direction : null} onSort={(direction) => setSort(key, direction)} onChange={(value) => updateFilter(key, value)} /></div>;
  }

  return <section className="px-screen">
    <PageIntro />
    <section className="px-screen-kpis">
      <article><span>Contas ativas</span><strong>{activeAccounts.length}</strong><small>Base financeira</small></article>
      <article><span>Classificações</span><strong>{activeCategories.length}</strong><small>Organização das despesas</small></article>
      <article><span>Formas de pagamento</span><strong>{activePayments.length}</strong><small>Meios ativos</small></article>
      <article><span>Cartões ativos</span><strong>{data.cards.filter((item) => item.isActive).length}</strong><small>Identidade automática MEG</small></article>
    </section>

    <div className="px-tabbar px-catalog-tabs">
      <button className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>Contas</button>
      <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Classificações</button>
      <button className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Formas de pagamento</button>
      <button className={tab === 'cards' ? 'active' : ''} onClick={() => setTab('cards')}>Cartões</button>
    </div>

    <section className="px-card px-catalog-panel px-table-card">
      <div className="px-panel-head"><div><span>Base real</span><h2>{tab === 'accounts' ? 'Contas' : tab === 'categories' ? 'Classificações' : tab === 'payments' ? 'Formas de pagamento' : 'Cartões'}</h2></div><button className="px-secondary-action" type="button" disabled>Novo cadastro</button></div>

      <div className="px-toolbar px-catalog-grid-toolbar">
        <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar em todas as colunas deste cadastro" /></label>
        <span className="px-toolbar-note">{visibleRows.length} de {rows.length} exibido(s)</span>
      </div>

      {activeFilterKeys.length || sort || search ? <div className="px-grid-active-filters">
        <span>Filtros do cadastro</span>
        {search ? <span className="px-grid-filter-chip">Busca: {search}<button type="button" onClick={() => setSearch('')} aria-label="Limpar busca">×</button></span> : null}
        {activeFilterKeys.map((key) => <span className="px-grid-filter-chip" key={key}>{filterSummary(labels[key], filters[key])}<button type="button" onClick={() => clearFilter(key)} aria-label={`Remover filtro ${labels[key]}`}>×</button></span>)}
        {sort ? <span className="px-grid-filter-chip">Ordenação: {labels[sort.key]} {sort.direction === 'asc' ? '↑' : '↓'}<button type="button" onClick={clearSort} aria-label="Remover ordenação">×</button></span> : null}
        <button className="px-grid-clear-all" type="button" onClick={clearGrid}>Limpar grade</button>
      </div> : null}

      <div className="px-table-scroll">
        <table className="px-data-table">
          <thead><tr>
            {tab === 'accounts' ? <><th>{header('Conta', 'name', 'text')}</th><th>{header('Tipo', 'type', 'multi', options.type)}</th><th>{header('Instituição', 'institution', 'multi', options.institution)}</th><th>{header('Saldo inicial', 'openingBalance', 'number')}</th><th>{header('Status', 'status', 'multi', options.status)}</th></> : null}
            {tab === 'categories' ? <><th>{header('Classificação', 'name', 'text')}</th><th>{header('Grupo', 'group', 'multi', options.group)}</th><th>{header('Tipo', 'type', 'multi', options.type)}</th><th>{header('Status', 'status', 'multi', options.status)}</th></> : null}
            {tab === 'payments' ? <><th>{header('Forma', 'name', 'text')}</th><th>{header('Tipo', 'type', 'multi', options.type)}</th><th>{header('Status', 'status', 'multi', options.status)}</th></> : null}
            {tab === 'cards' ? <><th>{header('Cartão', 'name', 'text')}</th><th>{header('Emissor', 'issuer', 'multi', options.issuer)}</th><th>{header('Bandeira', 'brand', 'multi', options.brand)}</th><th>{header('Limite', 'creditLimit', 'number')}</th><th>{header('Fechamento', 'closingDay', 'number')}</th><th>{header('Vencimento', 'dueDay', 'number')}</th></> : null}
          </tr></thead>
          <tbody>{visibleRows.map((row) => {
            if (tab === 'accounts') return <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.type}</td><td>{row.institution}</td><td className="px-money">{money.format(row.openingBalance || 0)}</td><td><span className={`px-status ${row.status === 'Ativa' ? 'reconciled' : 'archived'}`}>{row.status}</span></td></tr>;
            if (tab === 'categories') return <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.group}</td><td>{row.type}</td><td><span className={`px-status ${row.status === 'Ativa' ? 'reconciled' : 'archived'}`}>{row.status}</span></td></tr>;
            if (tab === 'payments') return <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.type}</td><td><span className={`px-status ${row.status === 'Ativa' ? 'reconciled' : 'archived'}`}>{row.status}</span></td></tr>;
            const identity = row.card ? resolvePhoenixCardIdentity(row.card) : null;
            return <tr key={row.id}><td><span className="px-catalog-card-name"><span className="px-mini-card" style={{ background: identity?.background }}>{identity?.miniLabel || row.name.slice(0, 6).toUpperCase()}</span><strong>{row.name}</strong></span></td><td>{row.issuer}</td><td>{row.brand}</td><td className="px-money">{money.format(row.creditLimit || 0)}</td><td>dia {row.closingDay}</td><td>dia {row.dueDay}</td></tr>;
          })}</tbody>
        </table>
        {!visibleRows.length ? <p className="px-empty">Nenhum cadastro corresponde aos filtros aplicados.</p> : null}
      </div>
    </section>
  </section>;
}
