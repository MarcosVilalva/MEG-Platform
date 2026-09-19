import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { CreditCard } from '../../app/cards-client';
import { PhoenixGridFilter, type PhoenixGridFilterKind, type PhoenixGridFilterValue, type PhoenixGridOption, type PhoenixGridSortDirection } from '../PhoenixGridFilter';
import { resolvePhoenixCardIdentity } from '../card-identity';
import type { PhoenixLegacyTransaction, PhoenixReadModel } from '../contracts';
import {
  buildPhoenixPdf,
  buildPhoenixXlsx,
  detectPhoenixColumnKinds,
  phoenixExportFilename,
  type PhoenixExportReport,
} from '../table-export-core';
import '../phoenix-screens.css';
import '../phoenix-cards-premium.css';
import '../phoenix-cards-wow.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', timeZone: 'UTC' });

type CardTab = 'current' | 'future' | 'installments' | 'rules';
type CardCommandTab = 'summary' | 'current' | 'future' | 'installments' | 'history';
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
function compactMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace('.', '');
  return label.replace(/^./, (letter) => letter.toUpperCase());
}
function cardDisplayName(card: CreditCard) {
  const identity = resolvePhoenixCardIdentity(card);
  if (identity.key === 'latam') return 'LATAM PASS Itaú Mastercard';
  if (identity.key === 'mercado') return 'Mercado Pago Visa';
  if (identity.key === 'azul') return 'Azul Visa';
  if (identity.key === 'riachuelo') return 'Riachuelo Midway';
  return card.name;
}
function cardDisplayTier(card: CreditCard) {
  const key = resolvePhoenixCardIdentity(card).key;
  if (key === 'latam' || key === 'mercado' || key === 'azul') return 'Platinum';
  return card.brand || card.issuer || '';
}
function modalStatusLabel(row: GridRow) {
  if (isCancelledStatus(row.status)) return 'Cancelado';
  if (row.amount < 0 && normalize(row.description).includes('ESTORNO')) return 'Estornado';
  if (row.amount < 0) return 'Crédito';
  return isOpenStatus(row.status) ? 'Pendente' : 'Confirmado';
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
  const [cardCommandOpen, setCardCommandOpen] = useState(false);
  const [commandTab, setCommandTab] = useState<CardCommandTab>('summary');
  const [commandSearch, setCommandSearch] = useState('');
  const [commandMonth, setCommandMonth] = useState('');
  const [commandStatus, setCommandStatus] = useState('');
  const [commandGroup, setCommandGroup] = useState('');
  const [commandSort, setCommandSort] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'description'>('date-desc');

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
  const bestPurchaseDay = selected?.closingDay ? (selected.closingDay >= 28 ? 1 : selected.closingDay + 1) : null;
  const statementDueDate = selected?.statement?.month === data.month && selected.statement.dueDate
    ? longDate.format(new Date(`${selected.statement.dueDate.slice(0, 10)}T12:00:00Z`))
    : selected?.dueDay ? `dia ${selected.dueDay}` : '—';
  const nextStatementDelta = nextStatement - currentStatement;
  const biggestFuture = [...futureRows].filter((row) => row.amount > 0).sort((left, right) => right.amount - left.amount)[0] || null;
  const commandMonths = [...new Set(allRows.map((row) => row.statementMonth))].sort().reverse();
  const commandGroups = [...new Set(allRows.map((row) => row.group).filter((group) => group && group !== '—'))].sort((left, right) => left.localeCompare(right, 'pt-BR'));
  const commandBaseRows = commandTab === 'current'
    ? currentRows
    : commandTab === 'future' || commandTab === 'installments'
      ? futureRows
      : allRows;
  const commandRows = commandBaseRows.filter((row) => {
    if (commandSearch && !normalize(`${row.description} ${row.group} ${row.installment} ${row.statementMonth}`).includes(normalize(commandSearch))) return false;
    if (commandMonth && row.statementMonth !== commandMonth) return false;
    if (commandGroup && row.group !== commandGroup) return false;
    if (commandStatus) {
      const label = normalize(rowStatusLabel(row));
      if (commandStatus === 'open' && label !== 'pendente') return false;
      if (commandStatus === 'paid' && label !== 'pago') return false;
      if (commandStatus === 'credit' && label !== 'credito/estorno') return false;
    }
    return true;
  }).sort((left, right) => {
    if (commandSort === 'date-asc') return left.purchaseDate.localeCompare(right.purchaseDate);
    if (commandSort === 'amount-desc') return right.amount - left.amount;
    if (commandSort === 'amount-asc') return left.amount - right.amount;
    if (commandSort === 'description') return left.description.localeCompare(right.description, 'pt-BR', { sensitivity: 'base' });
    return right.purchaseDate.localeCompare(left.purchaseDate);
  });
  const commandRowsTotal = sumRows(commandRows);
  const topCurrentRows = [...currentRows].filter((row) => row.amount > 0 && !isCancelledStatus(row.status)).sort((left, right) => right.amount - left.amount).slice(0, 5);

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

  useEffect(() => {
    if (!cardCommandOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCardCommandOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [cardCommandOpen]);

  function openCardCommand(cardId?: string) {
    if (cardId && cardId !== selected?.id) selectCard(cardId);
    setCommandTab('current');
    setCommandSearch('');
    setCommandMonth('');
    setCommandStatus('');
    setCommandGroup('');
    setCommandSort('date-desc');
    setCardCommandOpen(true);
  }

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
    setCommandSearch('');
    setCommandMonth('');
    setCommandStatus('');
    setCommandGroup('');
    setCommandSort('date-desc');
  }
  function exportCardStatement(extension: 'xlsx' | 'pdf') {
    const headers = ['Data', 'Descrição', 'Grupo', 'Parcela', 'Fatura', 'Situação', 'Valor'];
    const rows = commandRows.map((row) => [
      date.format(new Date(`${row.purchaseDate}T12:00:00Z`)),
      row.description,
      row.group,
      row.installment,
      monthLabel(row.statementMonth),
      rowStatusLabel(row),
      money.format(row.amount),
    ]);
    const detected = detectPhoenixColumnKinds(headers, rows);
    const filters: string[] = [
      `Visão: ${commandTab === 'current' ? 'Fatura atual' : commandTab === 'future' ? 'Próximas faturas' : commandTab === 'installments' ? 'Parcelas' : commandTab === 'history' ? 'Histórico' : 'Resumo'}`,
    ];
    if (commandMonth) filters.push(`Competência: ${monthLabel(commandMonth)}`);
    if (commandStatus) filters.push(`Situação: ${commandStatus === 'open' ? 'Pendente' : commandStatus === 'paid' ? 'Pago' : 'Crédito/estorno'}`);
    if (commandGroup) filters.push(`Grupo: ${commandGroup}`);
    if (commandSearch.trim()) filters.push(`Busca: ${commandSearch.trim()}`);
    const report: PhoenixExportReport = {
      systemName: 'MEG Finanças',
      title: `Cartão ${selected?.name || 'Cartão'} — ${commandTab === 'current' ? 'Fatura atual' : commandTab === 'future' ? 'Próximas faturas' : commandTab === 'installments' ? 'Parcelas' : 'Histórico'}`,
      period: commandMonth ? monthLabel(commandMonth) : commandTab === 'current' ? monthLabel(data.month) : 'Conforme filtros da central do cartão',
      filters,
      generatedAt: new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date()),
      recordCount: rows.length,
      headers,
      rows,
      kinds: detected.kinds,
      sums: detected.sums,
    };
    const bytes = extension === 'xlsx' ? buildPhoenixXlsx(report) : buildPhoenixPdf(report);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy.buffer], {
      type: extension === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = phoenixExportFilename(report, extension);
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  function header(label: string, key: GridKey, kind: PhoenixGridFilterKind, list?: PhoenixGridOption[]) {
    return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} options={list} sort={sort?.key === key ? sort.direction : null} onSort={(direction) => setSortState((current) => ({ ...current, [mode]: { key, direction } }))} onChange={(value) => setFilterState((current) => ({ ...current, [mode]: { ...current[mode], [key]: value } }))} /></div>;
  }

  if (!selected) return <section className="px-screen"><header className="px-screen-head"><div><span className="px-kicker">Cartões de crédito</span><h1>Faturas e compromissos</h1><p>Nenhum cartão ativo foi localizado na base real.</p></div></header><div className="px-card px-empty">Cadastre cartões no sistema atual antes da migração da escrita.</div></section>;

  const identity = resolvePhoenixCardIdentity(selected);

  return <section className="px-screen px-cards-premium px-cards-wow px-cards-approved" data-cards-layout="approved-v4">
    <header className="px-cards-approved-head">
      <div className="px-cards-approved-heading">
        <span className="px-kicker">CARTÕES · VISÃO GERAL</span>
        <div className="px-cards-approved-title-row">
          <span className="px-cards-approved-title-icon" aria-hidden="true"><i /></span>
          <div>
            <h1>Seus cartões</h1>
            <p>Seus principais meios de pagamento em um só lugar.</p>
          </div>
        </div>
      </div>
      <div className="px-cards-approved-hint">
        <span className="px-cards-approved-mouse" aria-hidden="true"><i /></span>
        <div><strong>Duplo clique para abrir a central do cartão</strong><small>Acesse detalhes, faturas, limites e muito mais.</small></div>
      </div>
    </header>

    <div className="px-cards-approved-grid" aria-label="Seus cartões">
      {data.cards.map((card) => {
        const cardIdentity = resolvePhoenixCardIdentity(card);
        const txRows = data.legacyTransactions
          .filter((tx) => isExpense(tx) && isCredit(tx) && transactionMatchesCard(tx, card))
          .map(legacyRow)
          .filter((row): row is GridRow => Boolean(row));
        const monthRows = txRows.filter((row) => row.statementMonth === data.month);
        const statementAmount = card.statement?.month === data.month
          ? Number(card.statement.netAmount || 0)
          : monthRows.length ? sumRows(monthRows) : Number(card.statementAmount || 0);
        const limit = Number(card.creditLimit || 0);
        const available = Number.isFinite(Number(card.availableLimit))
          ? Number(card.availableLimit)
          : Math.max(0, limit - Number(card.usedLimit || 0));
        const used = Math.max(0, limit - available);
        const cardUsage = limit > 0 ? Math.min(100, Math.max(0, used / limit * 100)) : 0;
        const due = card.statement?.month === data.month && card.statement.dueDate
          ? longDate.format(new Date(`${card.statement.dueDate.slice(0, 10)}T12:00:00Z`))
          : card.dueDay ? `dia ${String(card.dueDay).padStart(2, '0')}` : '—';
        const displayName = cardDisplayName(card);
        const displayTier = cardDisplayTier(card);
        return <button
          key={card.id}
          type="button"
          className={`px-cards-approved-tile px-card-product-${cardIdentity.key} ${selected.id === card.id ? 'active' : ''}`}
          onClick={() => selectCard(card.id)}
          onDoubleClick={() => openCardCommand(card.id)}
          aria-label={`${card.name}. Limite ${money.format(limit)}. Disponível ${money.format(available)}. Fatura atual ${money.format(statementAmount)}.`}
        >
          <span className="px-cards-approved-art" style={{ background: cardIdentity.background }}>
            {cardIdentity.artwork
              ? <img src={`${import.meta.env.BASE_URL}${cardIdentity.artwork}`} alt={cardIdentity.label} />
              : <>
                  <span className="px-cards-approved-brand">{cardIdentity.label}</span>
                  <i className="px-chip" />
                  {cardIdentity.brandAsset ? <img className="px-brand-asset" src={`${import.meta.env.BASE_URL}assets/card-brands/${cardIdentity.brandAsset}.svg`} alt="" /> : null}
                </>}
            <span className="px-card-wow-gloss" />
          </span>

          <span className="px-cards-approved-name">
            <span><strong>{displayName}</strong>{displayTier ? <small>{displayTier}</small> : null}</span>
            <b aria-hidden="true">›</b>
          </span>

          <span className="px-cards-approved-limit">
            <small>Limite total</small>
            <strong>{money.format(limit)}</strong>
            <span className="px-cards-approved-progress"><i style={{ width: `${cardUsage}%` }} /><b>{cardUsage.toFixed(0)}%</b></span>
            <span className="px-cards-approved-split">
              <span><small>Disponível</small><strong>{money.format(available)}</strong></span>
              <span><small>Fatura atual</small><strong>{money.format(statementAmount)}</strong></span>
            </span>
          </span>

          <span className="px-cards-approved-due">
            <i aria-hidden="true">▦</i>
            <span><small>Vencimento</small><strong>{due}</strong></span>
          </span>
        </button>;
      })}
    </div>

    <section className="px-cards-approved-selected" aria-label="Resumo do cartão selecionado">
      <div className="px-cards-approved-selected-id">
        <span className="px-cards-approved-selected-art" style={{ background: identity.background }}>
          {identity.artwork
            ? <img src={`${import.meta.env.BASE_URL}${identity.artwork}`} alt="" />
            : <strong>{identity.miniLabel}</strong>}
        </span>
        <span><strong>{cardDisplayName(selected)}</strong>{cardDisplayTier(selected) ? <small>{cardDisplayTier(selected)}</small> : null}
          <span className="px-cards-approved-tags">
            {identity.key === 'latam' ? <><i>Mastercard</i><i>Itaú</i><i>LATAM Pass</i></> : <>
              {identity.brandAsset ? <i>{selected.brand || identity.brandAsset}</i> : null}
              {selected.issuer ? <i>{selected.issuer}</i> : null}
              <i>{identity.label}</i>
            </>}
          </span>
        </span>
      </div>
      <div className="px-cards-approved-selected-metric">
        <i aria-hidden="true">◉</i>
        <span><small>Limite disponível</small><strong>{money.format(availableLimit)}</strong><em>de {money.format(creditLimit)}</em></span>
      </div>
      <div className="px-cards-approved-selected-metric">
        <i aria-hidden="true">▤</i>
        <span><small>Fatura atual</small><strong>{money.format(currentStatement)}</strong><em>{currentStatus}</em></span>
      </div>
      <div className="px-cards-approved-selected-metric">
        <i aria-hidden="true">▦</i>
        <span><small>Próx. vencimento</small><strong>{statementDueDate}</strong><em>{monthLabel(data.month)}</em></span>
      </div>
      <div className="px-cards-approved-selected-metric">
        <i aria-hidden="true">☆</i>
        <span><small>Melhor dia de compra</small><strong>{bestPurchaseDay ? `Dia ${bestPurchaseDay}` : '—'}</strong><em>estimado pelo fechamento</em></span>
      </div>
    </section>

    {cardCommandOpen ? <div className="px-card-command-backdrop px-card-command-approved-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCardCommandOpen(false); }}>
      <section className="px-card-command-modal px-card-command-approved" role="dialog" aria-modal="true" aria-label={`Central do cartão ${selected.name}`}>
        <header className="px-card-command-approved-head">
          <div>
            <span className="px-kicker">CENTRAL DO CARTÃO</span>
            <h2>{cardDisplayName(selected)}</h2>
            <p>Resumo, faturas, limites e histórico</p>
          </div>
          <button type="button" aria-label="Fechar central do cartão" onClick={() => setCardCommandOpen(false)}>×</button>
        </header>

        <section className="px-card-command-approved-overview">
          <div className="px-card-command-approved-cardbox">
            <div className="px-card-command-approved-art" style={{ background: identity.background } as CSSProperties}>
              {identity.artwork
                ? <img src={`${import.meta.env.BASE_URL}${identity.artwork}`} alt={identity.label} />
                : <>
                    <strong>{identity.label}</strong>
                    <i className="px-chip" />
                    {identity.brandAsset ? <img className="px-brand-asset" src={`${import.meta.env.BASE_URL}assets/card-brands/${identity.brandAsset}.svg`} alt="" /> : null}
                  </>}
              <span className="px-card-wow-gloss" />
            </div>
            <div className="px-card-command-approved-cardcopy">
              <strong>{cardDisplayName(selected)}</strong>
              {cardDisplayTier(selected) ? <small>{cardDisplayTier(selected)}</small> : null}
              <span>{identity.key === 'latam' ? <><i>Mastercard</i><i>Itaú</i><i>LATAM Pass</i></> : <>{identity.brandAsset ? <i>{selected.brand || identity.brandAsset}</i> : null}{selected.issuer ? <i>{selected.issuer}</i> : null}<i>{identity.label}</i></>}</span>
            </div>
          </div>

          <div className="px-card-command-approved-kpis">
            <div><span>Limite total</span><strong>{money.format(creditLimit)}</strong><small><i style={{ width: `${usage}%` }} />{usage.toFixed(0)}%</small></div>
            <div><span>Disponível</span><strong>{money.format(availableLimit)}</strong><small>livre para uso</small></div>
            <div><span>Utilizado</span><strong>{money.format(Math.max(0, creditLimit - availableLimit))}</strong><small>compromisso atual</small></div>
            <div><span>Fatura atual</span><strong>{money.format(currentStatement)}</strong><small>{currentStatus}</small></div>
            <div className="icon-kpi"><i aria-hidden="true">▦</i><span><small>Próximo vencimento</small><strong>{statementDueDate}</strong></span></div>
            <div className="icon-kpi"><i aria-hidden="true">☆</i><span><small>Melhor dia de compra</small><strong>{bestPurchaseDay ? `Dia ${bestPurchaseDay}` : '—'}</strong></span></div>
          </div>
        </section>

        <nav className="px-card-command-approved-tabs" aria-label="Visões do cartão">
          <button className={commandTab === 'summary' ? 'active' : ''} type="button" onClick={() => setCommandTab('summary')}><span>▣</span>Resumo</button>
          <button className={commandTab === 'current' ? 'active' : ''} type="button" onClick={() => { setCommandTab('current'); setCommandMonth(''); }}><span>▤</span>Fatura atual</button>
          <button className={commandTab === 'future' ? 'active' : ''} type="button" onClick={() => setCommandTab('future')}><span>▦</span>Próximas faturas</button>
          <button className={commandTab === 'installments' ? 'active' : ''} type="button" onClick={() => setCommandTab('installments')}><span>▱</span>Parcelas</button>
          <button className={commandTab === 'history' ? 'active' : ''} type="button" onClick={() => setCommandTab('history')}><span>◷</span>Histórico</button>
        </nav>

        {commandTab === 'summary' ? <div className="px-card-command-approved-summary">
          <article><span>Limite disponível agora</span><strong>{money.format(availableLimit)}</strong><small>{usage.toFixed(0)}% do limite comprometido</small></article>
          <article><span>Em aberto na fatura atual</span><strong>{money.format(currentOutstanding)}</strong><small>{currentOpen.length} lançamento(s) em aberto</small></article>
          <article><span>Parcelas futuras</span><strong>{money.format(futureCommitted)}</strong><small>{futureRows.length} parcela(s) no horizonte</small></article>
          <article><span>Próxima fatura</span><strong>{money.format(nextStatement)}</strong><small>{monthLabel(next)}</small></article>
          <section className="px-card-command-approved-equation">
            <span>Memória do limite</span>
            <div><b>{money.format(creditLimit)}</b><i>−</i><b>{money.format(currentOutstanding)}</b><i>−</i><b>{money.format(futureCommitted)}</b><i>=</i><strong>{money.format(availableLimit)}</strong></div>
            <small>Limite total − fatura aberta − parcelas futuras = disponível</small>
          </section>
          <section className="px-card-command-approved-timeline">
            <header><span>Próximas competências</span><strong>Como as faturas estão se formando</strong></header>
            <div>{futureMonths.map((month) => {
              const rows = futureRows.filter((row) => row.statementMonth === month);
              return <button key={month} type="button" onClick={() => { setCommandTab('future'); setCommandMonth(month); }}>
                <span>{monthLabel(month)}</span><strong>{money.format(sumRows(rows))}</strong><small>{rows.length} parcela(s)</small>
              </button>;
            })}{!futureMonths.length ? <p className="px-empty">Sem faturas futuras em aberto.</p> : null}</div>
          </section>
        </div> : <div className="px-card-command-approved-data">
          <div className="px-card-command-approved-filters">
            <label className="search"><span aria-hidden="true">⌕</span><input value={commandSearch} onChange={(event) => setCommandSearch(event.target.value)} placeholder="Buscar lançamento..." /></label>
            <label><span>Período</span><select value={commandMonth} onChange={(event) => setCommandMonth(event.target.value)}>
              <option value="">{commandTab === 'current' ? `${compactMonthLabel(data.month)} (Atual)` : 'Todos os períodos'}</option>
              {commandMonths.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}
            </select></label>
            <label><span>Situação</span><select value={commandStatus} onChange={(event) => setCommandStatus(event.target.value)}><option value="">Todos</option><option value="open">Pendente</option><option value="paid">Pago</option><option value="credit">Crédito/estorno</option></select></label>
            <label><span>Grupo</span><select value={commandGroup} onChange={(event) => setCommandGroup(event.target.value)}><option value="">Todos</option>{commandGroups.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>
            <label><span>Ordenar por</span><select value={commandSort} onChange={(event) => setCommandSort(event.target.value as typeof commandSort)}><option value="date-desc">Data (mais recente)</option><option value="date-asc">Data (mais antiga)</option><option value="amount-desc">Valor (maior)</option><option value="amount-asc">Valor (menor)</option><option value="description">Descrição</option></select></label>
          </div>

          <div className="px-card-command-approved-summarybar">
            <div><i aria-hidden="true">◉</i><span><strong>{commandRows.length} lançamentos</strong><small>{commandTab === 'current' ? 'na fatura atual' : 'na visão filtrada'}</small></span></div>
            <div><i aria-hidden="true">▤</i><span><small>Total da fatura</small><strong>{money.format(commandRowsTotal)}</strong></span></div>
            <div><i aria-hidden="true">◷</i><span><small>Em aberto</small><strong>{money.format(commandRows.filter((row) => isOpenStatus(row.status)).reduce((sum, row) => sum + row.amount, 0))}</strong></span></div>
            <div className="px-card-command-approved-export">
              <button type="button" disabled={!commandRows.length} onClick={() => exportCardStatement('xlsx')}><span aria-hidden="true">▦</span>Exportar Excel</button>
              <button type="button" disabled={!commandRows.length} onClick={() => exportCardStatement('pdf')}><span aria-hidden="true">▤</span>Exportar PDF</button>
            </div>
          </div>

          <div className="px-card-command-approved-table-wrap">
            <table className="px-data-table px-card-command-approved-table" data-meg-export-native="true">
              <thead><tr><th>Data</th><th>Descrição</th><th>Grupo</th><th>Parcela</th><th>Situação</th><th>Valor</th><th /></tr></thead>
              <tbody>{commandRows.map((row) => <tr key={row.id} onDoubleClick={() => setDetailRow(row)} title="Duplo clique para abrir os detalhes">
                <td>{date.format(new Date(`${row.purchaseDate}T12:00:00Z`))}</td>
                <td><strong>{row.description}</strong><small>{monthLabel(row.statementMonth)}</small></td>
                <td>{row.group}</td>
                <td>{row.installment}</td>
                <td><span className={`px-status ${rowStatusClass(row)}`}>{modalStatusLabel(row)}</span></td>
                <td className={`px-money ${row.amount < 0 ? 'positive' : ''}`}>{money.format(row.amount)}</td>
                <td><button className="px-detail-btn" type="button" aria-label={`Ver detalhes de ${row.description}`} onClick={() => setDetailRow(row)}>›</button></td>
              </tr>)}</tbody>
            </table>
            {!commandRows.length ? <p className="px-empty">Nenhum lançamento corresponde aos filtros selecionados.</p> : null}
          </div>

          <footer className="px-card-command-approved-table-foot">
            <span>Mostrando {commandRows.length} lançamento(s)</span>
            <strong>{money.format(commandRowsTotal)}</strong>
          </footer>
        </div>}
      </section>
    </div> : null}

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
