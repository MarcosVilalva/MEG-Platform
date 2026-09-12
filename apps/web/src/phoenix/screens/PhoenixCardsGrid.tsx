import { useMemo, useState, type CSSProperties } from 'react';
import { PhoenixGridFilter, type PhoenixGridFilterKind, type PhoenixGridFilterValue, type PhoenixGridOption, type PhoenixGridSortDirection } from '../PhoenixGridFilter';
import { resolvePhoenixCardIdentity } from '../card-identity';
import type { PhoenixReadModel } from '../contracts';
import '../phoenix-screens.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

type CardTab = 'current' | 'future' | 'installments' | 'rules';
type GridMode = 'current' | 'installments';
type GridKey = 'description' | 'purchaseDate' | 'installment' | 'group' | 'amount' | 'status' | 'statementMonth';
type GridSort = { key: GridKey; direction: PhoenixGridSortDirection } | null;
type GridFilterMap = Record<GridKey, PhoenixGridFilterValue>;
type GridRow = {
  id: string;
  description: string;
  purchaseDate: string;
  installment: string;
  group: string;
  amount: number;
  status: string;
  statementMonth: string;
};

type GridState<T> = Record<GridMode, T>;

const labels: Record<GridKey, string> = {
  description: 'Compra',
  purchaseDate: 'Data',
  installment: 'Parcela',
  group: 'Grupo',
  amount: 'Valor',
  status: 'Situação',
  statementMonth: 'Fatura'
};

const keysByMode: Record<GridMode, GridKey[]> = {
  current: ['description', 'purchaseDate', 'installment', 'group', 'amount', 'status'],
  installments: ['description', 'installment', 'statementMonth', 'amount', 'status']
};

function initialFilters(): GridFilterMap {
  return {
    description: { kind: 'text', value: '' },
    purchaseDate: { kind: 'date', from: '', to: '' },
    installment: { kind: 'multi', values: [] },
    group: { kind: 'multi', values: [] },
    amount: { kind: 'number', min: '', max: '' },
    status: { kind: 'multi', values: [] },
    statementMonth: { kind: 'multi', values: [] }
  };
}

function initialFiltersByMode(): GridState<GridFilterMap> {
  return { current: initialFilters(), installments: initialFilters() };
}

function initialSortByMode(): GridState<GridSort> {
  return { current: null, installments: null };
}

function initialSearchByMode(): GridState<string> {
  return { current: '', installments: '' };
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
  const normalized = String(value || '').trim().replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase());
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

function matches(value: string | number, filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return !filter.value.trim() || normalize(value).includes(normalize(filter.value));
  if (filter.kind === 'multi') return !filter.values.length || filter.values.includes(normalize(value));
  if (filter.kind === 'date') {
    const current = String(value).slice(0, 10);
    if (filter.from && current < filter.from) return false;
    if (filter.to && current > filter.to) return false;
    return true;
  }
  const current = typeof value === 'number' ? value : Number.NaN;
  const min = parseBrazilianNumber(filter.min);
  const max = parseBrazilianNumber(filter.max);
  if (min !== null && current < min) return false;
  if (max !== null && current > max) return false;
  return true;
}

function compare(left: string | number, right: string | number, direction: PhoenixGridSortDirection) {
  if (typeof left === 'number' && typeof right === 'number') return direction === 'asc' ? left - right : right - left;
  const result = String(left).localeCompare(String(right), 'pt-BR', { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

function options(rows: GridRow[], key: GridKey, format?: (value: string) => string): PhoenixGridOption[] {
  const values = new Map<string, { label: string; count: number }>();
  rows.forEach((row) => {
    const raw = String(row[key]);
    const value = normalize(raw);
    const current = values.get(value);
    values.set(value, { label: format ? format(raw) : raw, count: (current?.count || 0) + 1 });
  });
  return [...values.entries()].map(([value, item]) => ({ value, label: item.label, count: item.count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true, sensitivity: 'base' }));
}

export function PhoenixCardsGrid({ data }: { data: PhoenixReadModel }) {
  const [selectedId, setSelectedId] = useState(data.cards[0]?.id || '');
  const [tab, setTab] = useState<CardTab>('current');
  const [filtersByMode, setFiltersByMode] = useState<GridState<GridFilterMap>>(initialFiltersByMode);
  const [sortByMode, setSortByMode] = useState<GridState<GridSort>>(initialSortByMode);
  const [searchByMode, setSearchByMode] = useState<GridState<string>>(initialSearchByMode);

  const selected = data.cards.find((card) => card.id === selectedId) || data.cards[0] || null;
  if (!selected) return <section className="px-screen"><header className="px-screen-head"><div><span className="px-kicker">Cartões de crédito</span><h1>Faturas e compromissos</h1><p>Nenhum cartão ativo foi localizado na base real.</p></div></header><div className="px-card px-empty">Cadastre cartões no sistema atual antes da migração da escrita.</div></section>;

  const identity = resolvePhoenixCardIdentity(selected);
  const allEntries = selected.purchases.flatMap((purchase) => purchase.entries.map((entry) => ({ purchase, entry })));
  const currentEntries = allEntries.filter(({ entry }) => entry.statementMonth === data.month);
  const nextMonth = (() => { const [y, m] = data.month.split('-').map(Number); return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7); })();
  const futureEntries = allEntries.filter(({ entry }) => entry.statementMonth > data.month && entry.status === 'open');
  const futureTotal = futureEntries.reduce((sum, row) => sum + Number(row.entry.amount || 0), 0);
  const nextStatement = allEntries.filter(({ entry }) => entry.statementMonth === nextMonth && entry.status === 'open').reduce((sum, row) => sum + Number(row.entry.amount || 0), 0);
  const usage = Number(selected.creditLimit) > 0 ? Math.min(100, Math.max(0, (Number(selected.usedLimit) / Number(selected.creditLimit)) * 100)) : 0;
  const legacyCurrent = selected.purchases.filter((purchase) => !purchase.entries.length && purchase.purchaseDate.startsWith(data.month));

  const currentRows = useMemo<GridRow[]>(() => [
    ...currentEntries.map(({ purchase, entry }) => ({
      id: entry.id,
      description: purchase.description,
      purchaseDate: purchase.purchaseDate.slice(0, 10),
      installment: `${entry.number}/${purchase.installments}`,
      group: purchase.category?.name || '—',
      amount: Number(entry.amount || 0),
      status: entry.status,
      statementMonth: entry.statementMonth
    })),
    ...legacyCurrent.map((purchase) => ({
      id: purchase.id,
      description: purchase.description,
      purchaseDate: purchase.purchaseDate.slice(0, 10),
      installment: 'Legado',
      group: purchase.category?.name || '—',
      amount: Number(purchase.totalAmount || 0),
      status: purchase.legacyOpen ? 'aberto' : 'registrado',
      statementMonth: data.month
    }))
  ], [currentEntries, legacyCurrent, data.month]);

  const installmentRows = useMemo<GridRow[]>(() => futureEntries.map(({ purchase, entry }) => ({
    id: entry.id,
    description: purchase.description,
    purchaseDate: purchase.purchaseDate.slice(0, 10),
    installment: `${entry.number}/${purchase.installments}`,
    group: purchase.category?.name || '—',
    amount: Number(entry.amount || 0),
    status: entry.status,
    statementMonth: entry.statementMonth
  })), [futureEntries]);

  const mode: GridMode = tab === 'installments' ? 'installments' : 'current';
  const sourceRows = mode === 'current' ? currentRows : installmentRows;
  const filters = filtersByMode[mode];
  const sort = sortByMode[mode];
  const search = searchByMode[mode];
  const keys = keysByMode[mode];
  const activeKeys = keys.filter((key) => filterActive(filters[key]));

  const gridOptions = useMemo(() => ({
    installment: options(sourceRows, 'installment'),
    group: options(sourceRows, 'group'),
    status: options(sourceRows, 'status'),
    statementMonth: options(sourceRows, 'statementMonth', monthLabel)
  }), [sourceRows]);

  const visibleRows = useMemo(() => {
    const needle = normalize(search);
    const filtered = sourceRows.filter((row) => {
      if (needle && !normalize(keys.map((key) => row[key]).join(' ')).includes(needle)) return false;
      return keys.every((key) => matches(row[key], filters[key]));
    });
    if (!sort || !keys.includes(sort.key)) return filtered;
    return [...filtered].sort((left, right) => compare(left[sort.key], right[sort.key], sort.direction));
  }, [sourceRows, search, keys, filters, sort]);

  function clearModeGrid() {
    setFiltersByMode((current) => ({ ...current, [mode]: initialFilters() }));
    setSortByMode((current) => ({ ...current, [mode]: null }));
    setSearchByMode((current) => ({ ...current, [mode]: '' }));
  }

  function selectCard(id: string) {
    setSelectedId(id);
    setFiltersByMode(initialFiltersByMode());
    setSortByMode(initialSortByMode());
    setSearchByMode(initialSearchByMode());
  }

  function header(label: string, key: GridKey, kind: PhoenixGridFilterKind, list?: PhoenixGridOption[]) {
    return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} options={list} sort={sort?.key === key ? sort.direction : null} onSort={(direction) => setSortByMode((current) => ({ ...current, [mode]: { key, direction } }))} onChange={(value) => setFiltersByMode((current) => ({ ...current, [mode]: { ...current[mode], [key]: value } }))} /></div>;
  }

  return <section className="px-screen">
    <header className="px-screen-head"><div><span className="px-kicker">Cartões de crédito</span><h1>Faturas e compromissos</h1><p>Limites, faturas e compras usando o cadastro real de cada cartão.</p></div><div className="px-screen-head-aside"><button className="px-secondary-action" type="button" disabled>Gerenciar cartões</button></div></header>
    <div className="px-cards-shell">
      <aside className="px-card px-card-picker">
        <div className="px-panel-head"><div><span>Meus cartões</span><h2>{data.cards.length} ativo(s)</h2></div></div>
        {data.cards.map((card) => { const id = resolvePhoenixCardIdentity(card); return <button key={card.id} type="button" className={`px-card-option ${selected.id === card.id ? 'active' : ''}`} onClick={() => selectCard(card.id)}><span className="px-mini-card" style={{ background: id.background }}>{id.miniLabel}</span><span><strong>{card.name}</strong><small>{card.issuer || card.brand || 'Cartão cadastrado'} · {money.format(Number(card.statementAmount || 0))}</small></span><span>›</span></button>; })}
      </aside>

      <div className="px-card-detail">
        <article className="px-card px-card-hero">
          <div className="px-card-hero-grid">
            <div className="px-physical-card" style={{ background: identity.background } as CSSProperties}>
              {identity.artwork ? <img src={`${import.meta.env.BASE_URL}${identity.artwork}`} alt={identity.label} /> : <><strong>{identity.label}</strong><span className="px-chip" /><small>{selected.issuer || selected.brand || 'MEG FINANÇAS'}</small>{identity.brandAsset ? <img className="px-brand-asset" src={`${import.meta.env.BASE_URL}assets/card-brands/${identity.brandAsset}.svg`} alt={selected.brand || identity.brandAsset} /> : null}</>}
            </div>
            <div className="px-card-account"><span className="px-kicker">Cartão selecionado</span><h2>{selected.name}</h2><p>{selected.issuer || 'Cartão cadastrado no MEG'}{selected.lastFour ? ` · final ${selected.lastFour}` : ''}</p><div className="px-cycle-dates"><div><span>Fechamento</span><strong>dia {selected.closingDay}</strong></div><div><span>Vencimento</span><strong>dia {selected.dueDay}</strong></div><span className="px-status planned">EM ABERTO</span></div></div>
          </div>
          <div className="px-card-metrics"><div><span>Fatura atual</span><strong>{money.format(Number(selected.statementAmount || 0))}</strong></div><div><span>Após fechamento</span><strong>{money.format(nextStatement)}</strong></div><div><span>Parcelas futuras</span><strong>{money.format(futureTotal)}</strong></div><div><span>Total comprometido</span><strong>{money.format(Number(selected.usedLimit || 0))}</strong></div></div>
          <div className="px-limit"><div><span>Uso do limite</span><strong>{usage.toFixed(0)}% · {money.format(Number(selected.availableLimit || 0))} disponível</strong></div><progress max="100" value={usage} /></div>
        </article>

        <section className="px-card px-card-movement px-table-card">
          <div className="px-panel-head"><div><span>Movimentação do cartão</span><h2>{selected.name}</h2></div><button className="px-secondary-action" type="button" disabled>Revisar pagamento da fatura</button></div>
          <div className="px-tabbar"><button className={tab === 'current' ? 'active' : ''} onClick={() => setTab('current')}>Fatura atual</button><button className={tab === 'future' ? 'active' : ''} onClick={() => setTab('future')}>Próximas faturas</button><button className={tab === 'installments' ? 'active' : ''} onClick={() => setTab('installments')}>Parcelas futuras</button><button className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>Regras</button></div>

          {(tab === 'current' || tab === 'installments') ? <>
            <div className="px-toolbar px-card-grid-toolbar"><label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearchByMode((current) => ({ ...current, [mode]: event.target.value }))} placeholder="Buscar nesta grade do cartão" /></label><span className="px-toolbar-note">{visibleRows.length} de {sourceRows.length} exibido(s)</span></div>
            {activeKeys.length || sort || search ? <div className="px-grid-active-filters"><span>Filtros da fatura</span>{search ? <span className="px-grid-filter-chip">Busca: {search}<button type="button" onClick={() => setSearchByMode((current) => ({ ...current, [mode]: '' }))}>×</button></span> : null}{activeKeys.map((key) => <span className="px-grid-filter-chip" key={key}>{filterSummary(labels[key], filters[key])}<button type="button" onClick={() => { const fresh = initialFilters(); setFiltersByMode((current) => ({ ...current, [mode]: { ...current[mode], [key]: fresh[key] } })); }}>×</button></span>)}{sort ? <span className="px-grid-filter-chip">Ordenação: {labels[sort.key]} {sort.direction === 'asc' ? '↑' : '↓'}<button type="button" onClick={() => setSortByMode((current) => ({ ...current, [mode]: null }))}>×</button></span> : null}<button className="px-grid-clear-all" type="button" onClick={clearModeGrid}>Limpar grade</button></div> : null}
          </> : null}

          {tab === 'current' ? <div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>{header('Compra', 'description', 'text')}</th><th>{header('Data', 'purchaseDate', 'date')}</th><th>{header('Parcela', 'installment', 'multi', gridOptions.installment)}</th><th>{header('Grupo', 'group', 'multi', gridOptions.group)}</th><th>{header('Valor', 'amount', 'number')}</th><th>{header('Situação', 'status', 'multi', gridOptions.status)}</th><th>Detalhes</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td><strong>{row.description}</strong></td><td>{date.format(new Date(`${row.purchaseDate}T12:00:00Z`))}</td><td>{row.installment}</td><td>{row.group}</td><td className="px-money">{money.format(row.amount)}</td><td><span className={`px-status ${row.status}`}>{row.status}</span></td><td><button className="px-detail-btn" type="button">↘</button></td></tr>)}</tbody></table>{!visibleRows.length ? <p className="px-empty">Nenhuma compra corresponde aos filtros desta fatura.</p> : null}</div> : null}
          {tab === 'future' ? <div className="px-future-grid">{Array.from(new Set(futureEntries.map(({ entry }) => entry.statementMonth))).sort().slice(0,6).map((month) => { const value = futureEntries.filter(({ entry }) => entry.statementMonth === month).reduce((sum,row) => sum + Number(row.entry.amount),0); return <article key={month}><span>{monthLabel(month)}</span><strong>{money.format(value)}</strong></article>; })}{!futureEntries.length ? <p className="px-empty">Não há faturas futuras em aberto.</p> : null}</div> : null}
          {tab === 'installments' ? <div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>{header('Compra', 'description', 'text')}</th><th>{header('Parcela', 'installment', 'multi', gridOptions.installment)}</th><th>{header('Fatura', 'statementMonth', 'multi', gridOptions.statementMonth)}</th><th>{header('Valor', 'amount', 'number')}</th><th>{header('Situação', 'status', 'multi', gridOptions.status)}</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td>{row.description}</td><td>{row.installment}</td><td>{monthLabel(row.statementMonth)}</td><td className="px-money">{money.format(row.amount)}</td><td><span className={`px-status ${row.status}`}>{row.status}</span></td></tr>)}</tbody></table>{!visibleRows.length ? <p className="px-empty">Nenhuma parcela futura corresponde aos filtros aplicados.</p> : null}</div> : null}
          {tab === 'rules' ? <ol className="px-rules-list"><li>Compras após o dia de fechamento entram na fatura seguinte.</li><li>Parcelamentos são distribuídos em centavos para preservar exatamente o valor total.</li><li>O limite comprometido considera parcelas em aberto e compatibilidade com compras legadas ainda abertas.</li><li>Pagamento de fatura gera evento financeiro correspondente no backend.</li><li>A identidade visual é resolvida pelo produto e emissor reais; a bandeira é apenas auxiliar.</li></ol> : null}
        </section>
      </div>
    </div>
  </section>;
}
