import { useMemo, useState, type CSSProperties } from 'react';
import type { CreditCard } from '../../app/cards-client';
import { PhoenixGridFilter, type PhoenixGridFilterKind, type PhoenixGridFilterValue, type PhoenixGridOption, type PhoenixGridSortDirection } from '../PhoenixGridFilter';
import { resolvePhoenixCardIdentity } from '../card-identity';
import type { PhoenixLegacyTransaction, PhoenixReadModel } from '../contracts';
import '../phoenix-screens.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

type CardTab = 'current' | 'future' | 'installments' | 'rules';
type GridMode = 'current' | 'installments';
type GridKey = 'description' | 'purchaseDate' | 'installment' | 'group' | 'amount' | 'status' | 'statementMonth';
type GridSort = { key: GridKey; direction: PhoenixGridSortDirection } | null;
type GridFilterMap = Record<GridKey, PhoenixGridFilterValue>;
type GridRow = {
  id: string;
  source: 'domain' | 'legacy';
  description: string;
  purchaseDate: string;
  dueDate: string;
  installment: string;
  group: string;
  amount: number;
  status: string;
  statementMonth: string;
};
type GridState<T> = Record<GridMode, T>;

const labels: Record<GridKey, string> = {
  description: 'Compra', purchaseDate: 'Data', installment: 'Parcela', group: 'Grupo', amount: 'Valor', status: 'Situação', statementMonth: 'Fatura'
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
function filtersByMode(): GridState<GridFilterMap> { return { current: initialFilters(), installments: initialFilters() }; }
function sortsByMode(): GridState<GridSort> { return { current: null, installments: null }; }
function searchesByMode(): GridState<string> { return { current: '', installments: '' }; }

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
}
function parseNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function parseBrazilianNumber(value: string) {
  const normalized = String(value || '').trim().replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(Date.UTC(year, month - 1, 1))).replace(/^./, (letter) => letter.toUpperCase());
}
function nextMonth(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
}
function active(filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return Boolean(filter.value.trim());
  if (filter.kind === 'multi') return filter.values.length > 0;
  if (filter.kind === 'number') return Boolean(filter.min || filter.max);
  return Boolean(filter.from || filter.to);
}
function summary(label: string, filter: PhoenixGridFilterValue) {
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

const cardStopWords = new Set(['cartao', 'credito', 'visa', 'mastercard', 'platinum', 'itau', 'banco', 'card']);
function cardWords(value: unknown) {
  return normalize(value).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((word) => word.length >= 2 && !cardStopWords.has(word));
}
function transactionMatchesCard(tx: PhoenixLegacyTransaction, card: CreditCard) {
  const method = normalize(tx.paymentMethod || tx.account);
  const name = normalize(card.name);
  if (!method || !name) return false;
  if (method === name || method.includes(name) || name.includes(method)) return true;
  const words = cardWords(card.name);
  if (!words.length) return false;
  const matches = words.filter((word) => method.includes(word));
  return matches.length >= Math.min(2, words.length) || (words.length === 1 && matches.length === 1);
}
function isCredit(tx: PhoenixLegacyTransaction) {
  return normalize(`${tx.modality || ''} ${tx.paymentMethod || ''} ${tx.account || ''}`).includes('credito') || normalize(`${tx.paymentMethod || ''} ${tx.account || ''}`).includes('cartao');
}
function isExpense(tx: PhoenixLegacyTransaction) { return normalize(tx.type) === 'expense' || normalize(tx.type) === 'despesa'; }
function isOpenStatus(status: string) {
  const value = normalize(status);
  return !['paid', 'pago', 'reconciled', 'conciliado', 'received', 'recebido', 'cancelled', 'cancelado'].includes(value);
}
function legacyRow(tx: PhoenixLegacyTransaction): GridRow | null {
  const dueDate = String(tx.date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const purchaseDate = String(tx.purchaseDate || tx.date || '').slice(0, 10);
  const installmentNo = Number(tx.installmentNumber || 0);
  const installmentCount = Number(tx.installmentCount || 0);
  const installment = installmentNo && installmentCount ? `${installmentNo}/${installmentCount}` : 'Única';
  return {
    id: `legacy-${tx.id || `${dueDate}-${tx.description}`}`,
    source: 'legacy',
    description: String(tx.description || 'Compra no cartão'),
    purchaseDate,
    dueDate,
    installment,
    group: String(tx.group || tx.category || tx.expenseClass || '—'),
    amount: parseNumber(tx.expenseAmount ?? tx.amount),
    status: String(tx.status || tx.situation || 'pending'),
    statementMonth: dueDate.slice(0, 7)
  };
}
function rowSignature(row: GridRow) {
  return `${normalize(row.description)}|${row.statementMonth}|${normalize(row.installment)}|${row.amount.toFixed(2)}`;
}

export function PhoenixCardsGrid({ data }: { data: PhoenixReadModel }) {
  const [selectedId, setSelectedId] = useState(data.cards[0]?.id || '');
  const [tab, setTab] = useState<CardTab>('current');
  const [filterState, setFilterState] = useState<GridState<GridFilterMap>>(filtersByMode);
  const [sortState, setSortState] = useState<GridState<GridSort>>(sortsByMode);
  const [searchState, setSearchState] = useState<GridState<string>>(searchesByMode);

  const selected = data.cards.find((card) => card.id === selectedId) || data.cards[0] || null;
  if (!selected) return <section className="px-screen"><header className="px-screen-head"><div><span className="px-kicker">Cartões de crédito</span><h1>Faturas e compromissos</h1><p>Nenhum cartão ativo foi localizado na base real.</p></div></header><div className="px-card px-empty">Cadastre cartões no sistema atual antes da migração da escrita.</div></section>;

  const identity = resolvePhoenixCardIdentity(selected);
  const officialRows = useMemo<GridRow[]>(() => selected.purchases.flatMap((purchase) => purchase.entries.map((entry) => ({
    id: entry.id,
    source: 'domain' as const,
    description: purchase.description,
    purchaseDate: purchase.purchaseDate.slice(0, 10),
    dueDate: `${entry.statementMonth}-01`,
    installment: `${entry.number}/${purchase.installments}`,
    group: purchase.category?.name || '—',
    amount: Number(entry.amount || 0),
    status: entry.status,
    statementMonth: entry.statementMonth
  }))), [selected]);

  const legacyRows = useMemo<GridRow[]>(() => data.legacyTransactions
    .filter((tx) => isExpense(tx) && isCredit(tx) && transactionMatchesCard(tx, selected))
    .map(legacyRow)
    .filter((row): row is GridRow => Boolean(row)), [data.legacyTransactions, selected]);

  const allRows = useMemo(() => {
    const rows = [...officialRows];
    const seen = new Set(rows.map(rowSignature));
    legacyRows.forEach((row) => {
      const key = rowSignature(row);
      if (!seen.has(key)) {
        seen.add(key);
        rows.push(row);
      }
    });
    return rows.sort((a, b) => b.dueDate.localeCompare(a.dueDate) || b.purchaseDate.localeCompare(a.purchaseDate));
  }, [officialRows, legacyRows]);

  const currentRows = allRows.filter((row) => row.statementMonth === data.month);
  const futureRows = allRows.filter((row) => row.statementMonth > data.month && isOpenStatus(row.status));
  const currentOpen = currentRows.filter((row) => isOpenStatus(row.status));
  const next = nextMonth(data.month);
  const currentStatement = currentOpen.reduce((sum, row) => sum + row.amount, 0);
  const nextStatement = futureRows.filter((row) => row.statementMonth === next).reduce((sum, row) => sum + row.amount, 0);
  const futureTotal = futureRows.reduce((sum, row) => sum + row.amount, 0);
  const totalCommitted = currentStatement + futureTotal;
  const creditLimit = Number(selected.creditLimit || 0);
  const usage = creditLimit > 0 ? Math.min(100, Math.max(0, totalCommitted / creditLimit * 100)) : 0;
  const availableLimit = creditLimit - totalCommitted;

  const mode: GridMode = tab === 'installments' ? 'installments' : 'current';
  const sourceRows = mode === 'current' ? currentRows : futureRows;
  const filters = filterState[mode];
  const sort = sortState[mode];
  const search = searchState[mode];
  const keys = keysByMode[mode];
  const activeKeys = keys.filter((key) => active(filters[key]));
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

  function resetGrid() {
    setFilterState((current) => ({ ...current, [mode]: initialFilters() }));
    setSortState((current) => ({ ...current, [mode]: null }));
    setSearchState((current) => ({ ...current, [mode]: '' }));
  }
  function selectCard(id: string) {
    setSelectedId(id);
    setFilterState(filtersByMode());
    setSortState(sortsByMode());
    setSearchState(searchesByMode());
  }
  function header(label: string, key: GridKey, kind: PhoenixGridFilterKind, list?: PhoenixGridOption[]) {
    return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} options={list} sort={sort?.key === key ? sort.direction : null} onSort={(direction) => setSortState((current) => ({ ...current, [mode]: { key, direction } }))} onChange={(value) => setFilterState((current) => ({ ...current, [mode]: { ...current[mode], [key]: value } }))} /></div>;
  }

  return <section className="px-screen">
    <header className="px-screen-head"><div><span className="px-kicker">Cartões de crédito</span><h1>Faturas e compromissos</h1><p>Limites, faturas e compras usando o cadastro real e a agenda financeira já existente no MEG.</p></div><div className="px-screen-head-aside"><button className="px-secondary-action" type="button" disabled>Gerenciar cartões</button></div></header>

    <div className="px-cards-shell">
      <aside className="px-card px-card-picker">
        <div className="px-panel-head"><div><span>Meus cartões</span><h2>{data.cards.length} ativo(s)</h2></div></div>
        {data.cards.map((card) => {
          const cardIdentity = resolvePhoenixCardIdentity(card);
          const txRows = data.legacyTransactions.filter((tx) => isExpense(tx) && isCredit(tx) && transactionMatchesCard(tx, card)).map(legacyRow).filter((row): row is GridRow => Boolean(row));
          const openMonth = txRows.filter((row) => row.statementMonth === data.month && isOpenStatus(row.status)).reduce((sum, row) => sum + row.amount, 0);
          const amount = openMonth || Number(card.statementAmount || 0);
          return <button key={card.id} type="button" className={`px-card-option ${selected.id === card.id ? 'active' : ''}`} onClick={() => selectCard(card.id)}><span className="px-mini-card" style={{ background: cardIdentity.background }}>{cardIdentity.miniLabel}</span><span><strong>{card.name}</strong><small>{card.issuer || card.brand || 'Cartão cadastrado'} · {money.format(amount)}</small></span><span>›</span></button>;
        })}
      </aside>

      <div className="px-card-detail">
        <article className="px-card px-card-hero">
          <div className="px-card-hero-grid">
            <div className="px-physical-card" style={{ background: identity.background } as CSSProperties}>
              {identity.artwork ? <img src={`${import.meta.env.BASE_URL}${identity.artwork}`} alt={identity.label} /> : <><strong>{identity.label}</strong><span className="px-chip" /><small>{selected.issuer || selected.brand || 'MEG FINANÇAS'}</small>{identity.brandAsset ? <img className="px-brand-asset" src={`${import.meta.env.BASE_URL}assets/card-brands/${identity.brandAsset}.svg`} alt={selected.brand || identity.brandAsset} /> : null}</>}
            </div>
            <div className="px-card-account"><span className="px-kicker">Cartão selecionado</span><h2>{selected.name}</h2><p>{selected.issuer || 'Cartão cadastrado no MEG'}{selected.lastFour ? ` · final ${selected.lastFour}` : ''}</p><div className="px-cycle-dates"><div><span>Fechamento</span><strong>dia {selected.closingDay}</strong></div><div><span>Vencimento</span><strong>dia {selected.dueDay}</strong></div><span className="px-status planned">EM ABERTO</span></div></div>
          </div>
          <div className="px-card-metrics"><div><span>Fatura atual</span><strong>{money.format(currentStatement)}</strong></div><div><span>Próxima fatura</span><strong>{money.format(nextStatement)}</strong></div><div><span>Parcelas futuras</span><strong>{money.format(futureTotal)}</strong></div><div><span>Total comprometido</span><strong>{money.format(totalCommitted)}</strong></div></div>
          <div className="px-limit"><div><span>Uso do limite</span><strong>{usage.toFixed(0)}% · {money.format(availableLimit)} disponível</strong></div><progress max="100" value={usage} /></div>
        </article>

        <section className="px-card px-card-movement px-table-card">
          <div className="px-panel-head"><div><span>Movimentação do cartão</span><h2>{selected.name}</h2></div><button className="px-secondary-action" type="button" disabled>Revisar pagamento da fatura</button></div>
          <div className="px-tabbar"><button className={tab === 'current' ? 'active' : ''} onClick={() => setTab('current')}>Fatura atual</button><button className={tab === 'future' ? 'active' : ''} onClick={() => setTab('future')}>Próximas faturas</button><button className={tab === 'installments' ? 'active' : ''} onClick={() => setTab('installments')}>Parcelas futuras</button><button className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>Regras</button></div>

          {(tab === 'current' || tab === 'installments') ? <>
            <div className="px-toolbar"><label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearchState((current) => ({ ...current, [mode]: event.target.value }))} placeholder="Buscar na movimentação do cartão" /></label><span className="px-toolbar-note">{visibleRows.length} de {sourceRows.length} exibido(s)</span></div>
            {activeKeys.length || sort || search ? <div className="px-grid-active-filters"><span>Filtros da grade</span>{search ? <span className="px-grid-filter-chip">Busca: {search}<button type="button" onClick={() => setSearchState((current) => ({ ...current, [mode]: '' }))}>×</button></span> : null}{activeKeys.map((key) => <span className="px-grid-filter-chip" key={key}>{summary(labels[key], filters[key])}<button type="button" onClick={() => setFilterState((current) => ({ ...current, [mode]: { ...current[mode], [key]: initialFilters()[key] } }))}>×</button></span>)}{sort ? <span className="px-grid-filter-chip">Ordenação: {labels[sort.key]} {sort.direction === 'asc' ? '↑' : '↓'}<button type="button" onClick={() => setSortState((current) => ({ ...current, [mode]: null }))}>×</button></span> : null}<button className="px-grid-clear-all" type="button" onClick={resetGrid}>Limpar grade</button></div> : null}
            <div className="px-table-scroll"><table className="px-data-table"><thead><tr>
              {tab === 'current' ? <><th>{header('Compra','description','text')}</th><th>{header('Data da compra','purchaseDate','date')}</th><th>{header('Parcela','installment','multi',gridOptions.installment)}</th><th>{header('Grupo','group','multi',gridOptions.group)}</th><th>{header('Valor','amount','number')}</th><th>{header('Situação','status','multi',gridOptions.status)}</th><th>Detalhes</th></> : <><th>{header('Compra','description','text')}</th><th>{header('Parcela','installment','multi',gridOptions.installment)}</th><th>{header('Fatura','statementMonth','multi',gridOptions.statementMonth)}</th><th>{header('Valor','amount','number')}</th><th>{header('Situação','status','multi',gridOptions.status)}</th></>}
            </tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}>{tab === 'current' ? <><td><strong>{row.description}</strong></td><td>{date.format(new Date(`${row.purchaseDate}T12:00:00Z`))}</td><td>{row.installment}</td><td>{row.group}</td><td className="px-money">{money.format(row.amount)}</td><td><span className={`px-status ${isOpenStatus(row.status) ? 'planned' : 'reconciled'}`}>{isOpenStatus(row.status) ? 'Pendente' : 'Pago'}</span></td><td><button className="px-detail-btn" type="button">↘</button></td></> : <><td>{row.description}</td><td>{row.installment}</td><td>{monthLabel(row.statementMonth)}</td><td className="px-money">{money.format(row.amount)}</td><td><span className="px-status planned">Pendente</span></td></>}</tr>)}</tbody></table>{!visibleRows.length ? <p className="px-empty">Nenhuma movimentação corresponde aos filtros desta aba.</p> : null}</div>
          </> : null}

          {tab === 'future' ? <div className="px-future-grid">{[...new Set(futureRows.map((row) => row.statementMonth))].sort().slice(0, 12).map((month) => { const rows = futureRows.filter((row) => row.statementMonth === month); const value = rows.reduce((sum, row) => sum + row.amount, 0); return <article key={month}><span>{monthLabel(month)}</span><strong>{money.format(value)}</strong><small>{rows.length} parcela(s)</small></article>; })}{!futureRows.length ? <p className="px-empty">Não há faturas futuras em aberto.</p> : null}</div> : null}

          {tab === 'rules' ? <ol className="px-rules-list"><li>A fatura atual usa a data de vencimento/competência do lançamento, e não apenas a data original da compra.</li><li>Parcelas legadas permanecem somente em leitura até a migração definitiva para o domínio de cartões.</li><li>Compras novas do domínio de cartões continuam sendo priorizadas quando existirem, evitando duplicidade com a compatibilidade legada.</li><li>O limite comprometido considera fatura atual e parcelas futuras ainda pendentes.</li><li>A identidade visual é resolvida automaticamente pelo produto, emissor e bandeira cadastrados.</li></ol> : null}
        </section>
      </div>
    </div>
  </section>;
}
