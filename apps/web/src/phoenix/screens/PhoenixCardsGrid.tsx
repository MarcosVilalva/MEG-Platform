import { useMemo, useState, type CSSProperties } from 'react';
import type { CreditCard } from '../../app/cards-client';
import { PhoenixGridFilter, type PhoenixGridFilterKind, type PhoenixGridFilterValue, type PhoenixGridOption, type PhoenixGridSortDirection } from '../PhoenixGridFilter';
import { resolvePhoenixCardIdentity } from '../card-identity';
import type { PhoenixLegacyTransaction, PhoenixReadModel } from '../contracts';
import '../phoenix-screens.css';
import '../phoenix-cards-premium.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

type CardTab = 'current' | 'future' | 'installments' | 'rules';
type GridMode = 'current' | 'installments';
type GridKey = 'description' | 'purchaseDate' | 'installment' | 'group' | 'amount' | 'status' | 'statementMonth';
type GridSort = { key: GridKey; direction: PhoenixGridSortDirection } | null;
type GridFilterMap = Record<GridKey, PhoenixGridFilterValue>;
type GridRow = {
  id: string;
  source: 'domain' | 'legacy' | 'canonical';
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
function cardAliases(card: CreditCard) {
  const name = normalize(card.name);
  const issuer = normalize(card.issuer || '');
  const aliases = new Set<string>([name]);
  if (name.includes('meli') || issuer.includes('mercado livre')) {
    aliases.add('cartao ml');
    aliases.add('mercado livre');
    aliases.add('mercado pago');
  }
  if (name.includes('latam')) {
    aliases.add('cartao latam pass');
    aliases.add('latam pass');
  }
  if (name.includes('azul')) aliases.add('cartao azul');
  if (name.includes('riachuelo') || issuer.includes('midway')) {
    aliases.add('riachuelo');
    aliases.add('cartao riachuelo');
  }
  return [...aliases].filter(Boolean);
}
function transactionMatchesCard(tx: PhoenixLegacyTransaction, card: CreditCard) {
  const method = normalize(tx.paymentMethod || tx.account);
  const name = normalize(card.name);
  if (!method || !name) return false;
  if (cardAliases(card).some((alias) => method === alias || method.includes(alias))) return true;
  const words = cardWords(card.name);
  if (!words.length) return false;
  const matches = words.filter((word) => method.includes(word));
  return matches.length >= Math.min(2, words.length) || (words.length === 1 && matches.length === 1);
}
function isCredit(tx: PhoenixLegacyTransaction) {
  return normalize(`${tx.modality || ''} ${tx.paymentMethod || ''} ${tx.account || ''}`).includes('credito') || normalize(`${tx.paymentMethod || ''} ${tx.account || ''}`).includes('cartao');
}
function isExpense(tx: PhoenixLegacyTransaction) { return normalize(tx.type) === 'expense' || normalize(tx.type) === 'despesa'; }
function isCancelledStatus(status: string) {
  return ['cancelled', 'cancelado', 'archived', 'arquivado'].includes(normalize(status));
}
function isOpenStatus(status: string) {
  const value = normalize(status);
  return !['paid', 'pago', 'reconciled', 'conciliado', 'received', 'recebido', 'cancelled', 'cancelado', 'archived', 'arquivado'].includes(value);
}
function rowStatusLabel(row: GridRow) {
  if (isCancelledStatus(row.status)) return 'Cancelado';
  if (row.amount < 0) return 'Crédito/estorno';
  return isOpenStatus(row.status) ? 'Pendente' : 'Pago';
}
function rowStatusClass(row: GridRow) {
  if (isCancelledStatus(row.status)) return 'archived';
  if (row.amount < 0) return 'reconciled';
  return isOpenStatus(row.status) ? 'planned' : 'reconciled';
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
    amount: tx.amount !== undefined ? parseNumber(tx.amount) : parseNumber(tx.expenseAmount),
    status: String(tx.status || tx.situation || 'pending'),
    statementMonth: dueDate.slice(0, 7)
  };
}
function rowSignature(row: GridRow) {
  return `${normalize(row.description)}|${row.statementMonth}|${normalize(row.installment)}|${row.amount.toFixed(2)}`;
}
function sumRows(rows: GridRow[]) {
  return rows.filter((row) => !isCancelledStatus(row.status)).reduce((sum, row) => sum + row.amount, 0);
}

export function PhoenixCardsGrid({ data }: { data: PhoenixReadModel }) {
  const [selectedId, setSelectedId] = useState(data.cards[0]?.id || '');
  const [tab, setTab] = useState<CardTab>('current');
  const [filterState, setFilterState] = useState<GridState<GridFilterMap>>(filtersByMode);
  const [sortState, setSortState] = useState<GridState<GridSort>>(sortsByMode);
  const [searchState, setSearchState] = useState<GridState<string>>(searchesByMode);
  const [detailRow, setDetailRow] = useState<GridRow | null>(null);
  const [selectedFutureMonth, setSelectedFutureMonth] = useState('');

  const selected = data.cards.find((card) => card.id === selectedId) || data.cards[0] || null;

  const officialRows = useMemo<GridRow[]>(() => selected ? selected.purchases.flatMap((purchase) => purchase.entries.map((entry) => ({
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
  }))) : [], [selected]);

  const legacyRows = useMemo<GridRow[]>(() => selected ? data.legacyTransactions
    .filter((tx) => isExpense(tx) && isCredit(tx) && transactionMatchesCard(tx, selected))
    .map(legacyRow)
    .filter((row): row is GridRow => Boolean(row)) : [], [data.legacyTransactions, selected]);

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

  // A fatura atual deve usar exatamente as mesmas linhas canônicas que geram
  // seus totais. Isso impede que o cabeçalho use signedAmount normalizado enquanto
  // a grade ainda exibe um amount legado divergente por arredondamento ou estorno.
  const canonicalRows = useMemo<GridRow[]>(() => selected?.statement?.month === data.month
    ? selected.statement.lines.map((line) => ({
        id: line.id,
        source: 'canonical' as const,
        description: line.description,
        purchaseDate: line.purchaseDate || line.dueDate,
        dueDate: line.dueDate,
        installment: `${line.installmentNo}/${line.installmentQty}`,
        group: line.kind === 'credit' ? 'Crédito/estorno' : 'Compra',
        amount: Number(line.effect || 0),
        status: line.isOpen ? 'open' : line.sourceStatus,
        statementMonth: line.statementMonth,
      }))
    : [], [selected, data.month]);

  const currentRows = canonicalRows.length
    ? canonicalRows
    : allRows.filter((row) => row.statementMonth === data.month);
  const futureRows = allRows.filter((row) => row.statementMonth > data.month && isOpenStatus(row.status));
  const currentOpen = currentRows.filter((row) => isOpenStatus(row.status) && !isCancelledStatus(row.status));
  const next = nextMonth(data.month);
  const currentStatement = selected?.statement?.month === data.month ? selected.statement.netAmount : sumRows(currentRows);
  const currentPurchases = selected?.statement?.month === data.month
    ? selected.statement.charges
    : currentRows.filter((row) => !isCancelledStatus(row.status) && row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
  const currentCredits = selected?.statement?.month === data.month
    ? selected.statement.credits
    : Math.abs(currentRows.filter((row) => !isCancelledStatus(row.status) && row.amount < 0).reduce((sum, row) => sum + row.amount, 0));
  const currentOutstandingRaw = selected?.statement?.month === data.month ? selected.statement.openNetAmount : sumRows(currentOpen);
  const currentOutstanding = selected?.statement?.month === data.month ? selected.statement.payableAmount : Math.max(0, currentOutstandingRaw);
  const nextStatement = sumRows(futureRows.filter((row) => row.statementMonth === next));
  const futureNet = sumRows(futureRows);
  const futureCommitted = Math.max(0, futureNet);
  const totalCommitted = currentOutstanding + futureCommitted;
  const creditLimit = Number(selected?.creditLimit || 0);
  const usage = creditLimit > 0 ? Math.min(100, Math.max(0, totalCommitted / creditLimit * 100)) : 0;
  const availableLimit = creditLimit - totalCommitted;
  const paidCurrent = currentRows.some((row) => !isOpenStatus(row.status) && !isCancelledStatus(row.status));
  const canonicalStatus = selected?.statement?.month === data.month ? selected.statement.status : null;
  const currentStatus = canonicalStatus === 'credit'
    ? 'CRÉDITO'
    : canonicalStatus === 'partial'
      ? 'PARCIAL'
      : canonicalStatus === 'paid' || canonicalStatus === 'zero'
        ? 'PAGA'
        : canonicalStatus === 'empty'
          ? 'SEM FATURA'
          : canonicalStatus === 'open'
            ? 'EM ABERTO'
            : !currentRows.length
              ? 'SEM FATURA'
              : currentOutstandingRaw > 0
                ? (paidCurrent ? 'PARCIAL' : 'EM ABERTO')
                : currentOpen.some((row) => row.amount < 0)
                  ? 'CRÉDITO'
                  : 'PAGA';
  const currentStatusClass = currentStatus === 'EM ABERTO' || currentStatus === 'PARCIAL' ? 'planned' : currentStatus === 'PAGA' ? 'reconciled' : 'confirmed';
  const usageTone = usage >= 90 ? 'danger' : usage >= 75 ? 'warning' : 'healthy';
  const futureMonths = [...new Set(futureRows.map((row) => row.statementMonth))].sort().slice(0, 12);
  const activeFutureMonth = selectedFutureMonth && futureMonths.includes(selectedFutureMonth) ? selectedFutureMonth : futureMonths[0] || '';
  const activeFutureRows = activeFutureMonth ? futureRows.filter((row) => row.statementMonth === activeFutureMonth) : [];
  const activeFutureAmount = sumRows(activeFutureRows);
  const activeFutureCredits = Math.abs(activeFutureRows.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amount, 0));

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
    setSelectedFutureMonth('');
    setDetailRow(null);
  }
  function header(label: string, key: GridKey, kind: PhoenixGridFilterKind, list?: PhoenixGridOption[]) {
    return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} options={list} sort={sort?.key === key ? sort.direction : null} onSort={(direction) => setSortState((current) => ({ ...current, [mode]: { key, direction } }))} onChange={(value) => setFilterState((current) => ({ ...current, [mode]: { ...current[mode], [key]: value } }))} /></div>;
  }

  if (!selected) return <section className="px-screen"><header className="px-screen-head"><div><span className="px-kicker">Cartões de crédito</span><h1>Faturas e compromissos</h1><p>Nenhum cartão ativo foi localizado na base real.</p></div></header><div className="px-card px-empty">Cadastre cartões no sistema atual antes da migração da escrita.</div></section>;

  const identity = resolvePhoenixCardIdentity(selected);

  return <section className="px-screen px-cards-premium" data-cards-layout="cockpit-v2">
    <header className="px-screen-head px-cards-page-head">
      <div>
        <span className="px-kicker">Cartões de crédito · {monthLabel(data.month)}</span>
        <h1>Cartões, faturas e limite</h1>
        <p>Uma leitura rápida do que já fechou, do que ainda compromete o limite e de como as próximas faturas estão se formando.</p>
      </div>
      <div className="px-screen-head-aside">
        <span className="px-cards-head-count">{data.cards.length} cartão(ões) ativo(s)</span>
        <button className="px-secondary-action" type="button" disabled>Gerenciar cartões</button>
      </div>
    </header>

    <section className="px-cards-rail-shell" aria-label="Meus cartões">
      <div className="px-cards-rail-head">
        <div><span>Meus cartões</span><strong>Escolha um cartão para atualizar todo o painel</strong></div>
        <small>Fatura do período · limite disponível</small>
      </div>
      <div className="px-cards-rail">
        {data.cards.map((card) => {
          const cardIdentity = resolvePhoenixCardIdentity(card);
          const txRows = data.legacyTransactions
            .filter((tx) => isExpense(tx) && isCredit(tx) && transactionMatchesCard(tx, card))
            .map(legacyRow)
            .filter((row): row is GridRow => Boolean(row));
          const monthRows = txRows.filter((row) => row.statementMonth === data.month);
          const amount = card.statement?.month === data.month
            ? card.statement.netAmount
            : monthRows.length ? sumRows(monthRows) : Number(card.statementAmount || 0);
          const limit = Number(card.creditLimit || 0);
          const available = Number.isFinite(Number(card.availableLimit)) ? Number(card.availableLimit) : Math.max(0, limit - Number(card.usedLimit || 0));
          return <button key={card.id} type="button" className={`px-cards-rail-item ${selected.id === card.id ? 'active' : ''}`} onClick={() => selectCard(card.id)}>
            <span className="px-cards-rail-card" style={{ background: cardIdentity.background }}>
              {cardIdentity.artwork ? <img src={`${import.meta.env.BASE_URL}${cardIdentity.artwork}`} alt="" /> : <strong>{cardIdentity.miniLabel}</strong>}
            </span>
            <span className="px-cards-rail-copy">
              <strong>{card.name}</strong>
              <small>{card.lastFour ? `Final ${card.lastFour} · ` : ''}{card.issuer || card.brand || 'Cartão cadastrado'}</small>
              <span><b>{money.format(amount)}</b><em>{money.format(available)} livre</em></span>
            </span>
            <span className="px-cards-rail-check" aria-hidden="true">{selected.id === card.id ? '✓' : '›'}</span>
          </button>;
        })}
      </div>
    </section>

    <section className="px-card-focus">
      <article className="px-card px-card-focus-visual">
        <div className="px-physical-card px-physical-card-premium" style={{ background: identity.background } as CSSProperties}>
          {identity.artwork ? <img src={`${import.meta.env.BASE_URL}${identity.artwork}`} alt={identity.label} /> : <>
            <div className="px-card-face-top"><strong>{identity.label}</strong><span>{selected.lastFour ? `•••• ${selected.lastFour}` : 'MEG FINANÇAS'}</span></div>
            <span className="px-chip" />
            <small>{selected.issuer || selected.brand || 'MEG FINANÇAS'}</small>
            {identity.brandAsset ? <img className="px-brand-asset" src={`${import.meta.env.BASE_URL}assets/card-brands/${identity.brandAsset}.svg`} alt={selected.brand || identity.brandAsset} /> : null}
          </>}
        </div>
        <div className="px-card-focus-meta">
          <span>Cartão selecionado</span>
          <strong>{selected.name}</strong>
          <small>{selected.issuer || 'Cartão cadastrado no MEG'}{selected.lastFour ? ` · final ${selected.lastFour}` : ''}</small>
          <div>
            <span><small>Fechamento</small><b>dia {selected.closingDay}</b></span>
            <span><small>Vencimento</small><b>dia {selected.dueDay}</b></span>
          </div>
        </div>
      </article>

      <article className="px-card px-card-focus-financial">
        <div className="px-card-statement-head">
          <div>
            <span>Fatura de {monthLabel(data.month)}</span>
            <strong>{money.format(currentStatement)}</strong>
            <small>Compras {money.format(currentPurchases)} · créditos/estornos {money.format(currentCredits)}</small>
          </div>
          <span className={`px-status ${currentStatusClass}`}>{currentStatus}</span>
        </div>

        <div className="px-card-executive-strip">
          <div><span>Em aberto agora</span><strong>{money.format(currentOutstanding)}</strong><small>Valor que ainda compromete o caixa</small></div>
          <div><span>Próxima fatura</span><strong>{money.format(nextStatement)}</strong><small>{monthLabel(next)}</small></div>
          <div><span>Parcelas futuras</span><strong>{money.format(futureNet)}</strong><small>{futureRows.length} parcela(s) em aberto</small></div>
          <div className="emphasis"><span>Total comprometido</span><strong>{money.format(totalCommitted)}</strong><small>Fatura em aberto + futuro</small></div>
        </div>

        <div className={`px-card-limit-panel ${usageTone}`}>
          <div className="px-card-limit-title">
            <div><span>Uso do limite</span><strong>{usage.toFixed(0)}%</strong></div>
            <div><span>Limite disponível</span><strong>{money.format(availableLimit)}</strong></div>
          </div>
          <progress max="100" value={usage} />
          <div className="px-card-limit-equation" aria-label="Memória de cálculo do limite">
            <span>{money.format(creditLimit)} <small>limite</small></span>
            <b>−</b>
            <span>{money.format(currentOutstanding)} <small>fatura aberta</small></span>
            <b>−</b>
            <span>{money.format(futureCommitted)} <small>parcelas futuras</small></span>
            <b>=</b>
            <strong>{money.format(availableLimit)} <small>disponível</small></strong>
          </div>
        </div>
      </article>
    </section>

    <section className="px-card px-card-movement px-table-card px-card-workspace">
      <header className="px-card-workspace-head">
        <div>
          <span className="px-kicker">Movimentações do cartão</span>
          <h2>{selected.name}</h2>
          <p>A fatura, as próximas competências e as parcelas usam a mesma base real que forma os totais acima.</p>
        </div>
        <button className="px-secondary-action" type="button" disabled>Revisar pagamento da fatura</button>
      </header>

      <div className="px-tabbar px-card-tabs">
        <button className={tab === 'current' ? 'active' : ''} onClick={() => setTab('current')}>Fatura atual <small>{currentRows.length}</small></button>
        <button className={tab === 'future' ? 'active' : ''} onClick={() => setTab('future')}>Próximas faturas <small>{futureMonths.length}</small></button>
        <button className={tab === 'installments' ? 'active' : ''} onClick={() => setTab('installments')}>Parcelas futuras <small>{futureRows.length}</small></button>
        <button className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>Regras</button>
      </div>

      {(tab === 'current' || tab === 'installments') ? <>
        <div className="px-toolbar px-card-toolbar">
          <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearchState((current) => ({ ...current, [mode]: event.target.value }))} placeholder={tab === 'current' ? 'Buscar na fatura atual' : 'Buscar nas parcelas futuras'} /></label>
          <span className="px-toolbar-note">{visibleRows.length} de {sourceRows.length} exibido(s)</span>
        </div>
        {activeKeys.length || sort || search ? <div className="px-grid-active-filters"><span>Filtros da grade</span>{search ? <span className="px-grid-filter-chip">Busca: {search}<button type="button" onClick={() => setSearchState((current) => ({ ...current, [mode]: '' }))}>×</button></span> : null}{activeKeys.map((key) => <span className="px-grid-filter-chip" key={key}>{summary(labels[key], filters[key])}<button type="button" onClick={() => setFilterState((current) => ({ ...current, [mode]: { ...current[mode], [key]: initialFilters()[key] } }))}>×</button></span>)}{sort ? <span className="px-grid-filter-chip">Ordenação: {labels[sort.key]} {sort.direction === 'asc' ? '↑' : '↓'}<button type="button" onClick={() => setSortState((current) => ({ ...current, [mode]: null }))}>×</button></span> : null}<button className="px-grid-clear-all" type="button" onClick={resetGrid}>Limpar grade</button></div> : null}
        <div className="px-table-scroll px-card-table-scroll"><table className="px-data-table"><thead><tr>
          {tab === 'current' ? <><th>{header('Compra','description','text')}</th><th>{header('Data da compra','purchaseDate','date')}</th><th>{header('Parcela','installment','multi',gridOptions.installment)}</th><th>{header('Grupo','group','multi',gridOptions.group)}</th><th>{header('Valor','amount','number')}</th><th>{header('Situação','status','multi',gridOptions.status)}</th><th>Detalhes</th></> : <><th>{header('Compra','description','text')}</th><th>{header('Parcela','installment','multi',gridOptions.installment)}</th><th>{header('Fatura','statementMonth','multi',gridOptions.statementMonth)}</th><th>{header('Valor','amount','number')}</th><th>{header('Situação','status','multi',gridOptions.status)}</th><th>Detalhes</th></>}
        </tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}>{tab === 'current' ? <><td><strong>{row.description}</strong></td><td>{date.format(new Date(`${row.purchaseDate}T12:00:00Z`))}</td><td>{row.installment}</td><td>{row.group}</td><td className={`px-money ${row.amount < 0 ? 'positive' : ''}`}>{money.format(row.amount)}</td><td><span className={`px-status ${rowStatusClass(row)}`}>{rowStatusLabel(row)}</span></td><td><button className="px-detail-btn" type="button" aria-label={`Ver detalhes de ${row.description}`} onClick={() => setDetailRow(row)}>↗</button></td></> : <><td><strong>{row.description}</strong></td><td>{row.installment}</td><td>{monthLabel(row.statementMonth)}</td><td className={`px-money ${row.amount < 0 ? 'positive' : ''}`}>{money.format(row.amount)}</td><td><span className={`px-status ${rowStatusClass(row)}`}>{rowStatusLabel(row)}</span></td><td><button className="px-detail-btn" type="button" aria-label={`Ver detalhes de ${row.description}`} onClick={() => setDetailRow(row)}>↗</button></td></>}</tr>)}</tbody></table>{!visibleRows.length ? <p className="px-empty">Nenhuma movimentação corresponde aos filtros desta aba.</p> : null}</div>
      </> : null}

      {tab === 'future' ? <div className="px-card-future-workspace">
        <div className="px-card-future-timeline" aria-label="Próximas faturas">
          {futureMonths.map((month) => {
            const rows = futureRows.filter((row) => row.statementMonth === month);
            const value = sumRows(rows);
            return <button key={month} type="button" className={activeFutureMonth === month ? 'active' : ''} onClick={() => setSelectedFutureMonth(month)}>
              <span>{monthLabel(month)}</span>
              <strong>{money.format(value)}</strong>
              <small>{rows.length} parcela(s)</small>
            </button>;
          })}
          {!futureMonths.length ? <div className="px-empty">Não há faturas futuras em aberto.</div> : null}
        </div>

        {activeFutureMonth ? <div className="px-card-future-detail">
          <header>
            <div><span>Fatura selecionada</span><h3>{monthLabel(activeFutureMonth)}</h3></div>
            <div><span>Total previsto</span><strong>{money.format(activeFutureAmount)}</strong><small>{activeFutureCredits ? `Créditos/estornos ${money.format(activeFutureCredits)}` : 'Sem créditos/estornos'}</small></div>
          </header>
          <div className="px-card-future-list">
            {activeFutureRows.map((row) => <button type="button" key={row.id} onClick={() => setDetailRow(row)}>
              <span><strong>{row.description}</strong><small>{row.installment} · {row.group}</small></span>
              <b>{money.format(row.amount)}</b>
              <em>›</em>
            </button>)}
          </div>
        </div> : null}
      </div> : null}

      {tab === 'rules' ? <div className="px-card-rules">
        <div className="px-card-rules-head"><span>Como o MEG lê seus cartões</span><strong>Regras que protegem os totais de fatura e limite</strong></div>
        <ol className="px-rules-list"><li>A fatura do período usa a data efetiva de vencimento/competência do lançamento, e não apenas a data original da compra.</li><li>Compras, créditos e estornos entram pelo valor líquido da fatura; estornos negativos reduzem o total devido.</li><li>Uma fatura já paga continua exibindo seu total histórico, mas deixa de compor o limite comprometido.</li><li>Parcelas legadas permanecem somente em leitura até a migração definitiva para o domínio de cartões.</li><li>Compras novas do domínio de cartões continuam sendo priorizadas quando existirem, evitando duplicidade com a compatibilidade legada.</li><li>O limite comprometido considera somente fatura atual e parcelas futuras ainda em aberto.</li><li>A identidade visual é resolvida automaticamente pelo produto, emissor e bandeira cadastrados.</li></ol>
      </div> : null}
    </section>

    {detailRow ? <div className="px-card-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailRow(null); }}>
      <aside className="px-card-detail-drawer" role="dialog" aria-modal="true" aria-label={`Detalhes de ${detailRow.description}`}>
        <header><div><span className="px-kicker">{monthLabel(detailRow.statementMonth)}</span><h2>{detailRow.description}</h2><p>{detailRow.installment} · {detailRow.group}</p></div><button type="button" aria-label="Fechar detalhes" onClick={() => setDetailRow(null)}>×</button></header>
        <div className="px-card-detail-amount">
          <span>Efeito na fatura</span>
          <strong className={detailRow.amount < 0 ? 'positive' : ''}>{money.format(detailRow.amount)}</strong>
          <span className={`px-status ${rowStatusClass(detailRow)}`}>{rowStatusLabel(detailRow)}</span>
        </div>
        <dl>
          <div><dt>Data da compra</dt><dd>{date.format(new Date(`${detailRow.purchaseDate}T12:00:00Z`))}</dd></div>
          <div><dt>Fatura</dt><dd>{monthLabel(detailRow.statementMonth)}</dd></div>
          <div><dt>Parcela</dt><dd>{detailRow.installment}</dd></div>
          <div><dt>Grupo</dt><dd>{detailRow.group}</dd></div>
          <div><dt>Origem</dt><dd>{detailRow.source === 'canonical' ? 'Fatura canônica' : detailRow.source === 'domain' ? 'Domínio de cartões' : 'Compatibilidade legada'}</dd></div>
        </dl>
        <footer><span>Detalhe somente leitura nesta etapa.</span><button type="button" onClick={() => setDetailRow(null)}>Fechar</button></footer>
      </aside>
    </div> : null}
  </section>;
}
