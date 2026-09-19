import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
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
import '../phoenix-cards-fidelity-v6.css';
import '../phoenix-cards-responsive-v61.css';

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

type CardUiIconName =
  | 'card' | 'mouse' | 'limit' | 'available' | 'used' | 'invoice'
  | 'calendar' | 'star' | 'summary' | 'future' | 'installments'
  | 'history' | 'search' | 'count' | 'clock' | 'excel' | 'pdf'
  | 'cart' | 'fuel' | 'pharmacy' | 'car' | 'screen' | 'plane' | 'refresh';

function CardUiIcon({ name, size = 16 }: { name: CardUiIconName; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {name === 'card' ? <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></> : null}
    {name === 'mouse' ? <><rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 6v4"/></> : null}
    {name === 'limit' ? <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></> : null}
    {name === 'available' ? <><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.2 2.2 4.8-5"/></> : null}
    {name === 'used' ? <><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M14 3.2A9 9 0 0 1 20.8 10H14z"/></> : null}
    {name === 'invoice' ? <><path d="M6 3h10l2 2v16l-3-1.5L12 21l-3-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/></> : null}
    {name === 'calendar' ? <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 14h2M14 14h2M8 18h2"/></> : null}
    {name === 'star' ? <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/> : null}
    {name === 'summary' ? <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></> : null}
    {name === 'future' ? <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M12 14v4M10 16h4"/></> : null}
    {name === 'installments' ? <><rect x="4" y="7" width="16" height="10" rx="2"/><path d="M7 11h4M14 11h3"/></> : null}
    {name === 'history' ? <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5"/><path d="M4 4v4.5h4.5M12 8v5l3 2"/></> : null}
    {name === 'search' ? <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></> : null}
    {name === 'count' ? <><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.2 2.2 4.8-5"/></> : null}
    {name === 'clock' ? <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></> : null}
    {name === 'excel' ? <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h8M11 6v12"/></> : null}
    {name === 'pdf' ? <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 16h4"/></> : null}
    {name === 'cart' ? <><path d="M3 5h2l2 10h10l2-7H6"/><circle cx="9" cy="19" r="1"/><circle cx="17" cy="19" r="1"/></> : null}
    {name === 'fuel' ? <><path d="M6 3h8v18H6zM8 7h4"/><path d="M14 7h2l3 3v7a2 2 0 0 1-4 0v-5"/></> : null}
    {name === 'pharmacy' ? <><path d="M12 5v14M5 12h14"/><rect x="4" y="4" width="16" height="16" rx="4"/></> : null}
    {name === 'car' ? <><path d="m5 15 1-5h12l1 5"/><path d="M4 15h16v4H4z"/><circle cx="7" cy="19" r="1"/><circle cx="17" cy="19" r="1"/></> : null}
    {name === 'screen' ? <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></> : null}
    {name === 'plane' ? <path d="m3 13 8-2 4-7 2 1-2 7 5 3-1 2-6-2-4 5-2-1 2-6-6 2z"/> : null}
    {name === 'refresh' ? <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.5 8a7 7 0 0 1 11.2-1L20 12M4 12l2.3 5a7 7 0 0 0 11.2-1"/></> : null}
  </svg>;
}

function cardGroupIcon(group: string): CardUiIconName {
  const value = normalize(group);
  if (value.includes('supermerc')) return 'cart';
  if (value.includes('combust') || value.includes('posto')) return 'fuel';
  if (value.includes('farm')) return 'pharmacy';
  if (value.includes('transport') || value.includes('uber')) return 'car';
  if (value.includes('assin') || value.includes('stream')) return 'screen';
  if (value.includes('viag') || value.includes('aereo')) return 'plane';
  if (value.includes('ajust') || value.includes('estorno')) return 'refresh';
  if (value.includes('benef')) return 'star';
  return 'card';
}

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
  const haystack = normalize([
    tx.paymentMethod,
    tx.account,
    tx.modality,
    tx.notes
  ].filter(Boolean).join(' '));
  const name = normalize(card.name);
  if (!haystack || !name) return false;
  if (cardAliases(card).some((alias) => haystack === alias || haystack.includes(alias))) return true;
  const words = cardWords(card.name);
  if (!words.length) return false;
  const matches = words.filter((word) => haystack.includes(word));
  return matches.length >= Math.min(2, words.length) || (words.length === 1 && matches.length === 1);
}
function meaningfulStatement(card: CreditCard) {
  const statement = card.statement;
  if (!statement?.month) return false;
  return statement.lines.length > 0
    || Math.abs(Number(statement.netAmount || 0)) > 0.005
    || statement.status !== 'empty';
}
function resolveActiveCardMonth(card: CreditCard, rows: GridRow[], fallbackMonth: string) {
  if (meaningfulStatement(card)) return card.statement!.month;
  if (rows.some((row) => row.statementMonth === fallbackMonth)) return fallbackMonth;
  const months = [...new Set(rows.map((row) => row.statementMonth).filter(Boolean))].sort();
  return months.find((month) => month >= fallbackMonth) || months.at(-1) || fallbackMonth;
}
function dueDateForMonth(month: string, day: number | null | undefined) {
  if (!day || !/^\d{4}-\d{2}$/.test(month)) return '—';
  const [year, monthNumber] = month.split('-').map(Number);
  const safeDay = Math.max(1, Math.min(day, new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()));
  return longDate.format(new Date(Date.UTC(year, monthNumber - 1, safeDay, 12)));
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

  // A central segue a competência efetiva da fatura do cartão. Quando o snapshot
  // mensal solicitado não contém linhas, usa a primeira competência real disponível
  // daquele cartão em vez de exibir uma grade vazia artificialmente.
  const canonicalRows = useMemo<GridRow[]>(() => selected?.statement?.lines?.map((line) => ({
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
  })) || [], [selected]);

  const currentCardMonth = selected ? resolveActiveCardMonth(selected, allRows, data.month) : data.month;
  const currentRows = canonicalRows.length && selected?.statement?.month === currentCardMonth
    ? canonicalRows
    : allRows.filter((row) => row.statementMonth === currentCardMonth);
  const futureRows = allRows.filter((row) => row.statementMonth > currentCardMonth && isOpenStatus(row.status));
  const currentOpen = currentRows.filter((row) => isOpenStatus(row.status) && !isCancelledStatus(row.status));
  const next = nextMonth(currentCardMonth);
  const hasCanonicalCurrent = selected?.statement?.month === currentCardMonth && meaningfulStatement(selected);
  const currentStatement = hasCanonicalCurrent ? selected!.statement!.netAmount : sumRows(currentRows);
  const currentPurchases = hasCanonicalCurrent
    ? selected!.statement!.charges
    : currentRows.filter((row) => !isCancelledStatus(row.status) && row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
  const currentCredits = hasCanonicalCurrent
    ? selected!.statement!.credits
    : Math.abs(currentRows.filter((row) => !isCancelledStatus(row.status) && row.amount < 0).reduce((sum, row) => sum + row.amount, 0));
  const currentOutstandingRaw = hasCanonicalCurrent ? selected!.statement!.openNetAmount : sumRows(currentOpen);
  const currentOutstanding = hasCanonicalCurrent ? selected!.statement!.payableAmount : Math.max(0, currentOutstandingRaw);
  const nextStatement = sumRows(futureRows.filter((row) => row.statementMonth === next));
  const futureNet = sumRows(futureRows);
  const futureCommitted = Math.max(0, futureNet);
  const totalCommitted = currentOutstanding + futureCommitted;
  const creditLimit = Number(selected?.creditLimit || 0);
  const usage = creditLimit > 0 ? Math.min(100, Math.max(0, totalCommitted / creditLimit * 100)) : 0;
  const availableLimit = creditLimit - totalCommitted;
  const paidCurrent = currentRows.some((row) => !isOpenStatus(row.status) && !isCancelledStatus(row.status));
  const canonicalStatus = hasCanonicalCurrent ? selected!.statement!.status : null;
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
  const statementDueDate = hasCanonicalCurrent && selected!.statement!.dueDate
    ? longDate.format(new Date(`${selected!.statement!.dueDate.slice(0, 10)}T12:00:00Z`))
    : dueDateForMonth(currentCardMonth, selected?.dueDay);
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
      period: commandMonth ? monthLabel(commandMonth) : commandTab === 'current' ? monthLabel(currentCardMonth) : 'Conforme filtros da central do cartão',
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

  return <section className="px-screen px-cards-premium px-cards-wow px-cards-approved" data-cards-layout="fidelity-v6">
    <header className="px-cards-approved-head">
      <div className="px-cards-approved-heading">
        <span className="px-kicker">CARTÕES · VISÃO GERAL</span>
        <div className="px-cards-approved-title-row">
          <span className="px-cards-approved-title-icon" aria-hidden="true"><CardUiIcon name="card" size={24} /></span>
          <div>
            <h1>Seus cartões</h1>
            <p>Seus principais meios de pagamento em um só lugar.</p>
          </div>
        </div>
      </div>
      <div className="px-cards-approved-hint">
        <span className="px-cards-approved-mouse" aria-hidden="true"><CardUiIcon name="mouse" size={18} /></span>
        <div><strong>Duplo clique para abrir a central do cartão</strong><small>Acesse detalhes, faturas, limites e muito mais.</small></div>
      </div>
    </header>

    <aside className="px-cards-approved-mantra" aria-hidden="true"><span>MAIS</span><strong>CONTROLE</strong><span>MAIS</span><strong>LIBERDADE</strong></aside>

    <div className="px-cards-approved-grid" aria-label="Seus cartões">
      {data.cards.map((card) => {
        const cardIdentity = resolvePhoenixCardIdentity(card);
        const legacyCardRows = data.legacyTransactions
          .filter((tx) => isExpense(tx) && isCredit(tx) && transactionMatchesCard(tx, card))
          .map(legacyRow)
          .filter((row): row is GridRow => Boolean(row));
        const domainCardRows: GridRow[] = card.purchases.flatMap((purchase) => purchase.entries.map((entry) => ({
          id: entry.id,
          source: 'domain' as const,
          description: purchase.description,
          purchaseDate: purchase.purchaseDate.slice(0, 10),
          dueDate: `${entry.statementMonth}-01`,
          installment: `${entry.number}/${purchase.installments}`,
          group: purchase.category?.name || '—',
          amount: Number(entry.amount || 0),
          status: entry.status,
          statementMonth: entry.statementMonth,
        })));
        const cardRows = [...domainCardRows];
        const cardSeen = new Set(cardRows.map(rowSignature));
        legacyCardRows.forEach((row) => {
          const signature = rowSignature(row);
          if (!cardSeen.has(signature)) {
            cardSeen.add(signature);
            cardRows.push(row);
          }
        });
        const cardMonth = resolveActiveCardMonth(card, cardRows, data.month);
        const monthRows = cardRows.filter((row) => row.statementMonth === cardMonth);
        const statementAmount = card.statement?.month === cardMonth && meaningfulStatement(card)
          ? Number(card.statement!.netAmount || 0)
          : monthRows.length ? sumRows(monthRows) : Number(card.statementAmount || 0);
        const limit = Number(card.creditLimit || 0);
        const available = Number.isFinite(Number(card.availableLimit))
          ? Number(card.availableLimit)
          : Math.max(0, limit - Number(card.usedLimit || 0));
        const used = Math.max(0, limit - available);
        const cardUsage = limit > 0 ? Math.min(100, Math.max(0, used / limit * 100)) : 0;
        const due = card.statement?.month === cardMonth && meaningfulStatement(card) && card.statement!.dueDate
          ? longDate.format(new Date(`${card.statement!.dueDate.slice(0, 10)}T12:00:00Z`))
          : dueDateForMonth(cardMonth, card.dueDay);
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
            <span className="px-cards-approved-progress-row"><span className="px-cards-approved-progress"><i style={{ width: `${cardUsage}%` }} /></span><b>{cardUsage.toFixed(0)}%</b></span>
            <span className="px-cards-approved-split">
              <span><small>Disponível</small><strong>{money.format(available)}</strong></span>
              <span><small>Fatura atual</small><strong>{money.format(statementAmount)}</strong></span>
            </span>
          </span>

          <span className="px-cards-approved-due">
            <i aria-hidden="true"><CardUiIcon name="calendar" size={14} /></i>
            <span><small>Vencimento</small><strong>{due}</strong></span>
          </span>
        </button>;
      })}
    </div>

    <section className="px-cards-approved-selected" aria-label="Resumo do cartão selecionado">
      <div className="px-cards-approved-selected-id">
        <span className={`px-cards-approved-selected-art px-card-product-${identity.key}`} style={{ background: identity.background }}>
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
        <i aria-hidden="true"><CardUiIcon name="available" /></i>
        <span><small>Limite disponível</small><strong>{money.format(availableLimit)}</strong><em>de {money.format(creditLimit)}</em></span>
      </div>
      <div className="px-cards-approved-selected-metric">
        <i aria-hidden="true"><CardUiIcon name="invoice" /></i>
        <span><small>Fatura atual</small><strong>{money.format(currentStatement)}</strong><em>{currentStatus}</em></span>
      </div>
      <div className="px-cards-approved-selected-metric">
        <i aria-hidden="true"><CardUiIcon name="calendar" /></i>
        <span><small>Próx. vencimento</small><strong>{statementDueDate}</strong><em>{monthLabel(currentCardMonth)}</em></span>
      </div>
      <div className="px-cards-approved-selected-metric">
        <i aria-hidden="true"><CardUiIcon name="star" /></i>
        <span><small>Melhor dia de compra</small><strong>{bestPurchaseDay ? `Dia ${bestPurchaseDay}` : '—'}</strong><em>estimado pelo fechamento</em></span>
      </div>
    </section>

    {cardCommandOpen ? createPortal(<div className="px-card-command-backdrop px-card-command-approved-backdrop" role="presentation">
      <section className="px-card-command-modal px-card-command-approved" role="dialog" aria-modal="true" aria-label={`Central do cartão ${selected.name}`}>
        <header className="px-card-command-approved-head">
          <div>
            <span className="px-kicker">CENTRAL DO CARTÃO</span>
            <h2>{cardDisplayName(selected)}</h2>
            <p>Resumo, faturas, limites e histórico</p>
          </div>
          <span className="px-card-command-esc-hint" aria-label="Feche a central pressionando Escape">ESC</span>
        </header>

        <section className="px-card-command-approved-overview">
          <div className="px-card-command-approved-cardbox">
            <div className={`px-card-command-approved-art px-card-product-${identity.key}`} style={{ background: identity.background } as CSSProperties}>
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
            <div className="icon-kpi"><i aria-hidden="true"><CardUiIcon name="limit" /></i><span><small>Limite total</small><strong>{money.format(creditLimit)}</strong><em className="px-card-kpi-progress"><b style={{ width: `${usage}%` }} /><span>{usage.toFixed(0)}%</span></em></span></div>
            <div className="icon-kpi"><i aria-hidden="true"><CardUiIcon name="available" /></i><span><small>Disponível</small><strong>{money.format(availableLimit)}</strong><em>livre para uso</em></span></div>
            <div className="icon-kpi"><i aria-hidden="true"><CardUiIcon name="used" /></i><span><small>Utilizado</small><strong>{money.format(Math.max(0, creditLimit - availableLimit))}</strong><em>compromisso atual</em></span></div>
            <div className="icon-kpi"><i aria-hidden="true"><CardUiIcon name="invoice" /></i><span><small>Fatura atual</small><strong>{money.format(currentStatement)}</strong><em>{currentStatus}</em></span></div>
            <div className="icon-kpi"><i aria-hidden="true"><CardUiIcon name="calendar" /></i><span><small>Próximo vencimento</small><strong>{statementDueDate}</strong></span></div>
            <div className="icon-kpi"><i aria-hidden="true"><CardUiIcon name="star" /></i><span><small>Melhor dia de compra</small><strong>{bestPurchaseDay ? `Dia ${bestPurchaseDay}` : '—'}</strong></span></div>
          </div>
        </section>

        <nav className="px-card-command-approved-tabs" aria-label="Visões do cartão">
          <button className={commandTab === 'summary' ? 'active' : ''} type="button" onClick={() => setCommandTab('summary')}><span><CardUiIcon name="summary" /></span>Resumo</button>
          <button className={commandTab === 'current' ? 'active' : ''} type="button" onClick={() => { setCommandTab('current'); setCommandMonth(''); }}><span><CardUiIcon name="invoice" /></span>Fatura atual</button>
          <button className={commandTab === 'future' ? 'active' : ''} type="button" onClick={() => setCommandTab('future')}><span><CardUiIcon name="future" /></span>Próximas faturas</button>
          <button className={commandTab === 'installments' ? 'active' : ''} type="button" onClick={() => setCommandTab('installments')}><span><CardUiIcon name="installments" /></span>Parcelas</button>
          <button className={commandTab === 'history' ? 'active' : ''} type="button" onClick={() => setCommandTab('history')}><span><CardUiIcon name="history" /></span>Histórico</button>
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
            <label className="search"><span aria-hidden="true"><CardUiIcon name="search" /></span><input value={commandSearch} onChange={(event) => setCommandSearch(event.target.value)} placeholder="Buscar lançamento..." /></label>
            <label><span>Período</span><select value={commandMonth} onChange={(event) => setCommandMonth(event.target.value)}>
              <option value="">{commandTab === 'current' ? `${compactMonthLabel(currentCardMonth)} (Atual)` : 'Todos os períodos'}</option>
              {commandMonths.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}
            </select></label>
            <label><span>Situação</span><select value={commandStatus} onChange={(event) => setCommandStatus(event.target.value)}><option value="">Todos</option><option value="open">Pendente</option><option value="paid">Pago</option><option value="credit">Crédito/estorno</option></select></label>
            <label><span>Grupo</span><select value={commandGroup} onChange={(event) => setCommandGroup(event.target.value)}><option value="">Todos</option>{commandGroups.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>
            <label><span>Ordenar por</span><select value={commandSort} onChange={(event) => setCommandSort(event.target.value as typeof commandSort)}><option value="date-desc">Data (mais recente)</option><option value="date-asc">Data (mais antiga)</option><option value="amount-desc">Valor (maior)</option><option value="amount-asc">Valor (menor)</option><option value="description">Descrição</option></select></label>
          </div>

          <div className="px-card-command-approved-summarybar">
            <div><i aria-hidden="true"><CardUiIcon name="count" /></i><span><strong>{commandRows.length} lançamentos</strong><small>{commandTab === 'current' ? 'na fatura atual' : 'na visão filtrada'}</small></span></div>
            <div><i aria-hidden="true"><CardUiIcon name="invoice" /></i><span><small>Total da fatura</small><strong>{money.format(commandRowsTotal)}</strong></span></div>
            <div><i aria-hidden="true"><CardUiIcon name="clock" /></i><span><small>Em aberto</small><strong>{money.format(commandRows.filter((row) => isOpenStatus(row.status)).reduce((sum, row) => sum + row.amount, 0))}</strong></span></div>
            <div className="px-card-command-approved-export">
              <button type="button" disabled={!commandRows.length} onClick={() => exportCardStatement('xlsx')}><span aria-hidden="true"><CardUiIcon name="excel" /></span>Exportar Excel</button>
              <button type="button" disabled={!commandRows.length} onClick={() => exportCardStatement('pdf')}><span aria-hidden="true"><CardUiIcon name="pdf" /></span>Exportar PDF</button>
            </div>
          </div>

          <div className="px-card-command-approved-table-wrap">
            <table className="px-data-table px-card-command-approved-table" data-meg-export-native="true">
              <thead><tr><th>Data</th><th>Descrição</th><th>Grupo</th><th>Parcela</th><th>Situação</th><th>Valor</th><th /></tr></thead>
              <tbody>{commandRows.map((row) => <tr key={row.id} onDoubleClick={() => setDetailRow(row)} title="Duplo clique para abrir os detalhes">
                <td>{date.format(new Date(`${row.purchaseDate}T12:00:00Z`))}</td>
                <td><strong>{row.description}</strong><small>{monthLabel(row.statementMonth)}</small></td>
                <td><span className="px-card-command-group"><i><CardUiIcon name={cardGroupIcon(row.group)} /></i>{row.group}</span></td>
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
    </div>, document.body) : null}

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
