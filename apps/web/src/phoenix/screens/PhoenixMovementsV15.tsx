import { useEffect, useMemo, useRef, useState } from 'react';
import type { FinancialEvent } from '../../app/finance-client';
import { PhoenixGridFilter, type PhoenixGridFilterKind, type PhoenixGridFilterValue, type PhoenixGridOption, type PhoenixGridSortDirection } from '../PhoenixGridFilter';
import type { PhoenixReadModel } from '../contracts';
import { PhoenixLaunchWriteControl } from '../components/PhoenixLaunchWriteControl';
import { phoenixWriteMessage, runPhoenixBenefitEventEdit, runPhoenixCardPurchaseCancel, runPhoenixCardPurchaseEdit, runPhoenixSimpleEventArchive, runPhoenixSimpleEventEdit } from '../data/phoenix-write-gateway';
import '../phoenix-launch.css';
import '../phoenix-launch-dynamic.css';
import '../phoenix-launch-editor-polish.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

type TxType = 'expense' | 'income' | 'transfer';
type LaunchPreset = 'expense' | 'income' | 'benefit';
type LaunchSituation = 'planned' | 'paid';
type GridKey = 'dueDate' | 'purchaseDate' | 'weekday' | 'type' | 'description' | 'income' | 'classification' | 'group' | 'expense' | 'paymentMethod' | 'status' | 'modality';
type GridSort = { key: GridKey; direction: PhoenixGridSortDirection } | null;
type GridFilterMap = Record<GridKey, PhoenixGridFilterValue>;
type MovementToolPanel = 'search' | 'filters' | 'account' | null;
type FinancialEventWithSourcePayload = FinancialEvent & { sourcePayload?: unknown };
type ProjectedCardMeta = {
  cardId: string;
  purchaseId: string;
  installmentId: string;
  installmentNumber: number;
  installmentCount: number;
  statementMonth: string;
  purchaseDate: string;
};

function sourcePayloadRecord(event: FinancialEvent) {
  const payload = (event as FinancialEventWithSourcePayload).sourcePayload;
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null;
}

function projectedCardMeta(event: FinancialEvent): ProjectedCardMeta | null {
  const payload = sourcePayloadRecord(event);
  if (!payload || payload.cardDomain !== true) return null;
  const cardId = String(payload.cardId || '').trim();
  const purchaseId = String(payload.purchaseId || '').trim();
  if (!cardId || !purchaseId) return null;
  return {
    cardId,
    purchaseId,
    installmentId: String(payload.installmentId || '').trim(),
    installmentNumber: Math.max(1, Number(payload.installmentNumber || 1)),
    installmentCount: Math.max(1, Number(payload.installmentCount || 1)),
    statementMonth: String(payload.statementMonth || '').trim(),
    purchaseDate: String(payload.purchaseDate || '').slice(0, 10),
  };
}

function projectedCardPurchase(data: PhoenixReadModel, event: FinancialEvent) {
  const meta = projectedCardMeta(event);
  if (!meta) return null;
  const card = data.cards.find((item) => item.id === meta.cardId) || null;
  const purchase = card?.purchases.find((item) => item.id === meta.purchaseId) || null;
  return card && purchase ? { meta, card, purchase } : null;
}

function cardPaymentMethodId(data: PhoenixReadModel, cardName: string) {
  const active = data.paymentMethods.filter((item) => item.isActive);
  const exact = active.find((item) => normalizeText(item.name) === normalizeText(cardName) && isCreditMethod(item.name, item.type));
  return exact?.id || active.find((item) => isCreditMethod(item.name, item.type))?.id || '';
}

type PhoenixExportRegistryWindow = Window & {
  __MEG_PHOENIX_EXPORT_DATA__?: Record<string, { rows: Array<Record<string, string>> }>;
};
type LaunchDraft = {
  type: TxType;
  situation: LaunchSituation;
  description: string;
  accountId: string;
  destinationId: string;
  eventDate: string;
  classification: string;
  categoryId: string;
  paymentMethodId: string;
  cardId: string;
  installments: number;
  manualDue: boolean;
  firstDue: string;
  recurring: boolean;
  recurrenceFrequency: 'Mensal' | 'Semanal' | 'Anual';
  recurrenceCount: number;
  saveTemplate: boolean;
  templateName: string;
  notes: string;
};

function saoPauloDay() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function initialDraft(): LaunchDraft {
  return {
    type: 'expense', situation: 'planned', description: '', accountId: '', destinationId: '', eventDate: saoPauloDay(),
    classification: '', categoryId: '', paymentMethodId: '', cardId: '', installments: 1, manualDue: false,
    firstDue: '', recurring: false, recurrenceFrequency: 'Mensal', recurrenceCount: 12,
    saveTemplate: false, templateName: '', notes: ''
  };
}

function initialGridFilters(): GridFilterMap {
  return {
    dueDate: { kind: 'date', from: '', to: '' },
    purchaseDate: { kind: 'date', from: '', to: '' },
    weekday: { kind: 'multi', values: [] },
    type: { kind: 'multi', values: [] },
    description: { kind: 'text', value: '' },
    income: { kind: 'number', min: '', max: '' },
    classification: { kind: 'multi', values: [] },
    group: { kind: 'multi', values: [] },
    expense: { kind: 'number', min: '', max: '' },
    paymentMethod: { kind: 'multi', values: [] },
    status: { kind: 'multi', values: [] },
    modality: { kind: 'multi', values: [] }
  };
}

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
}

function isBenefitAccount(name?: string | null) {
  const value = normalizeText(name || '');
  return value.includes('benef') || value.includes('verocard') || value.includes('alimentacao');
}

function isBenefitEvent(event: FinancialEvent) {
  const accountType = normalizeText(event.account?.type || '');
  const payment = normalizeText(`${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''}`);
  const description = normalizeText(event.description || '');
  return accountType === 'benefit' || payment.includes('verocard') || description.includes('verocard');
}

function isCreditMethod(name?: string | null, type?: string | null) {
  const value = normalizeText(`${name || ''} ${type || ''}`);
  return value.includes('credito') || value.includes('cartao');
}

function isPixMethod(name?: string | null, type?: string | null) {
  return normalizeText(`${name || ''} ${type || ''}`).includes('pix');
}

function isCrediarioMethod(name?: string | null, type?: string | null) {
  return normalizeText(`${name || ''} ${type || ''}`).includes('crediario');
}

function isCardDomainEvent(event: FinancialEvent) {
  return Boolean(projectedCardMeta(event));
}

function monthPlus(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

function validDayInMonth(month: string, day: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Math.min(day, last);
}

function cardDueDate(purchaseDate: string, closingDay: number, dueDay: number) {
  if (!purchaseDate) return '';
  const purchaseMonth = purchaseDate.slice(0, 7);
  const purchaseDay = Number(purchaseDate.slice(8, 10));
  const statementMonth = monthPlus(purchaseMonth, purchaseDay > closingDay ? 1 : 0);
  const dueMonth = monthPlus(statementMonth, dueDay <= closingDay ? 1 : 0);
  const safeDay = validDayInMonth(dueMonth, dueDay);
  return `${dueMonth}-${String(safeDay).padStart(2, '0')}`;
}

function eventStatus(value: string) {
  return ({ draft: 'Rascunho', planned: 'Pendente', confirmed: 'Confirmado', paid: 'Pago', reconciled: 'Conciliado', archived: 'Arquivado' } as Record<string, string>)[value] || value;
}

function eventType(value: FinancialEvent['type']) {
  return ({
    income: 'Receita', expense: 'Despesa', transfer: 'Transferência', investment: 'Investimento',
    redemption: 'Resgate', adjustment: 'Ajuste'
  } as Record<FinancialEvent['type'], string>)[value] || value;
}

function launchTypeForEvent(value: FinancialEvent['type']): TxType {
  if (value === 'income' || value === 'redemption') return 'income';
  if (value === 'transfer') return 'transfer';
  return 'expense';
}

function amountFromEvent(event: FinancialEvent) {
  return Math.abs(Number(event.amount || 0));
}

function displayEffect(event: FinancialEvent) {
  const signed = Number(event.signedAmount || 0);
  const visualType = launchTypeForEvent(event.type);
  if (visualType === 'income') return signed;
  if (visualType === 'expense') return -signed;
  return 0;
}

function monetaryTotals(events: FinancialEvent[]) {
  return events.reduce((total, event) => {
    if (isBenefitEvent(event)) return total;
    const visualType = launchTypeForEvent(event.type);
    const effect = displayEffect(event);
    if (visualType === 'income') total.income += effect;
    if (visualType === 'expense') total.expense += effect;
    return total;
  }, { income: 0, expense: 0 });
}

function weekday(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`)).replace('.', '');
}

function labelForAccount(data: PhoenixReadModel, id: string) {
  return data.accounts.find((item) => item.id === id)?.name || 'Selecione a conta';
}

function formatInputMoney(cents: number, negative: boolean) {
  return money.format((negative ? -1 : 1) * cents / 100);
}

function sourceGroup(event: FinancialEvent) {
  return event.category?.name || event.sourceDetails?.group || '—';
}

function sourceClassification(event: FinancialEvent) {
  return event.category?.group || event.sourceDetails?.expenseClass || '—';
}

function sourcePayment(event: FinancialEvent) {
  return event.paymentMethod?.name || event.sourceDetails?.paymentMethod || '—';
}

function sourceSituation(event: FinancialEvent) {
  if (launchTypeForEvent(event.type) === 'income') return 'Recebida';
  return eventStatus(event.status) || event.sourceDetails?.situation || '—';
}

function sourceModality(event: FinancialEvent) {
  return event.sourceDetails?.modality || '—';
}

function sourcePurchaseDate(event: FinancialEvent) {
  const payload = (event as FinancialEventWithSourcePayload).sourcePayload;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const value = (payload as Record<string, unknown>).purchaseDate;
    const normalized = String(value || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  }
  return event.date.slice(0, 10);
}

function formatIsoDate(value: string) {
  return date.format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split('-');
  return month && year ? `${month}/${year}` : value;
}

function parseBrazilianNumber(value: string) {
  const normalized = String(value || '').trim().replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function gridRow(event: FinancialEvent) {
  const visualType = launchTypeForEvent(event.type);
  const effect = displayEffect(event);
  return {
    dueDate: event.date.slice(0, 10), purchaseDate: sourcePurchaseDate(event),
    weekday: event.sourceDetails?.weekday || weekday(event.date),
    type: visualType === 'income' ? 'Receita' : visualType === 'transfer' ? 'Transferência' : 'Despesa',
    description: event.description,
    income: visualType === 'income' ? effect : null,
    classification: sourceClassification(event), group: sourceGroup(event),
    expense: visualType === 'expense' ? effect : null,
    paymentMethod: sourcePayment(event), status: sourceSituation(event), modality: sourceModality(event)
  };
}

type GridRow = ReturnType<typeof gridRow>;

function matchesGridFilter(value: GridRow[GridKey], filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return !filter.value.trim() || normalizeText(String(value ?? '')).includes(normalizeText(filter.value));
  if (filter.kind === 'multi') return !filter.values.length || filter.values.includes(normalizeText(String(value ?? '')));
  if (filter.kind === 'date') {
    const current = String(value ?? '').slice(0, 10);
    if (filter.from && current < filter.from) return false;
    if (filter.to && current > filter.to) return false;
    return true;
  }
  const current = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(current)) return !filter.min && !filter.max;
  const min = parseBrazilianNumber(filter.min);
  const max = parseBrazilianNumber(filter.max);
  if (min !== null && current < min) return false;
  if (max !== null && current > max) return false;
  return true;
}

function compareGridValues(left: GridRow[GridKey], right: GridRow[GridKey], direction: PhoenixGridSortDirection) {
  const emptyLeft = left === null || left === undefined || left === '';
  const emptyRight = right === null || right === undefined || right === '';
  if (emptyLeft !== emptyRight) return emptyLeft ? 1 : -1;
  if (typeof left === 'number' && typeof right === 'number') return direction === 'asc' ? left - right : right - left;
  const result = String(left ?? '').localeCompare(String(right ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

function filterIsActive(filter: PhoenixGridFilterValue) {
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

const gridLabels: Record<GridKey, string> = {
  dueDate: 'Vencimento', purchaseDate: 'Data da compra', weekday: 'Dia', type: 'Tipo', description: 'Descrição',
  income: 'Receita', classification: 'Classificação', group: 'Grupo', expense: 'Despesa',
  paymentMethod: 'Forma de pagamento', status: 'Situação', modality: 'Modalidade'
};

type MovementIconName = 'search' | 'filters' | 'calendar' | 'wallet' | 'income' | 'expense' | 'result' | 'warning' | 'close' | 'plus' | 'chevronLeft' | 'chevronRight' | 'chevronsLeft' | 'chevronsRight' | 'expand' | 'collapse';

function MovementIcon({ name, size = 18 }: { name: MovementIconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
  if (name === 'filters') return <svg {...common}><path d="M4 7h10M18 7h2M10 17h10M4 17h2M8 4v6M16 14v6"/></svg>;
  if (name === 'calendar') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
  if (name === 'wallet') return <svg {...common}><path d="M4 7.5h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z"/></svg>;
  if (name === 'income') return <svg {...common}><path d="M12 19V5M7 10l5-5 5 5"/></svg>;
  if (name === 'expense') return <svg {...common}><path d="M12 5v14M7 14l5 5 5-5"/></svg>;
  if (name === 'result') return <svg {...common}><path d="M5 19V9M10 19V5M15 19v-7M20 19V7"/></svg>;
  if (name === 'warning') return <svg {...common}><path d="M10.3 4.2 2.7 17.3A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.7L13.7 4.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 16.5h.01"/></svg>;
  if (name === 'close') return <svg {...common}><path d="m7 7 10 10M17 7 7 17"/></svg>;
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === 'chevronLeft') return <svg {...common}><path d="m15 18-6-6 6-6"/></svg>;
  if (name === 'chevronRight') return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
  if (name === 'chevronsLeft') return <svg {...common}><path d="m13 18-6-6 6-6M19 18l-6-6 6-6"/></svg>;
  if (name === 'chevronsRight') return <svg {...common}><path d="m11 18 6-6-6-6M5 18l6-6-6-6"/></svg>;
  if (name === 'expand') return <svg {...common}><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/></svg>;
  return <svg {...common}><path d="M8 8H3V3M16 8h5V3M8 16H3v5M21 21v-5h-5"/></svg>;
}

export function PhoenixMovementsV15({ data: initialData, onNavigateHistory, onDataCommitted, onOpenPeriod, launchRequest = 0, launchPreset = 'expense' }: { data: PhoenixReadModel; onNavigateHistory?: () => void; onDataCommitted?: (snapshot: PhoenixReadModel) => void; onOpenPeriod?: () => void; launchRequest?: number; launchPreset?: LaunchPreset }) {
  const nativeOperational = import.meta.env.VITE_MOBILE_APP === 'true';
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [status, setStatus] = useState('all');
  const [account, setAccount] = useState('all');
  const [toolPanel, setToolPanel] = useState<MovementToolPanel>(null);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [expandedList, setExpandedList] = useState(false);
  const [gridFilters, setGridFilters] = useState<GridFilterMap>(initialGridFilters);
  const [gridSort, setGridSort] = useState<GridSort>(null);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [launchWriteBusy, setLaunchWriteBusy] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [settlementConfirmOpen, setSettlementConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetEvent, setDeleteTargetEvent] = useState<FinancialEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [detailEvent, setDetailEvent] = useState<FinancialEvent | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventUpdatedAt, setEditingEventUpdatedAt] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [draft, setDraft] = useState<LaunchDraft>(initialDraft);
  const [amountCents, setAmountCents] = useState(0);
  const [negative, setNegative] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [validationVisible, setValidationVisible] = useState(false);
  const [recentEventId, setRecentEventId] = useState<string | null>(null);
  const recentTimerRef = useRef<number | null>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (!toolPanel) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !toolsRef.current?.contains(target)) setToolPanel(null);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [toolPanel]);

  useEffect(() => () => {
    if (recentTimerRef.current !== null) window.clearTimeout(recentTimerRef.current);
  }, []);

  const monthEvents = useMemo(() => data.events.items.filter((event) => event.competence === data.month), [data]);
  const rows = useMemo(() => monthEvents.map((event) => ({ event, row: gridRow(event) })), [monthEvents]);
  const quickSearchSuggestions = useMemo(() => {
    const values = new Set<string>();
    monthEvents.forEach((event) => {
      const category = event.category?.name?.trim();
      if (category && category !== '—') values.add(category);
      const payment = event.paymentMethod?.name?.trim();
      if (payment && payment !== '—') values.add(payment);
    });
    return [...values].slice(0, 5);
  }, [monthEvents]);

  const gridOptions = useMemo(() => {
    const optionKeys: GridKey[] = ['weekday', 'type', 'classification', 'group', 'paymentMethod', 'status', 'modality'];
    const result = {} as Record<GridKey, PhoenixGridOption[]>;
    optionKeys.forEach((key) => {
      const values = new Map<string, { label: string; count: number }>();
      rows.forEach(({ row }) => {
        const label = String(row[key] ?? '—');
        const normalized = normalizeText(label);
        const current = values.get(normalized);
        values.set(normalized, { label, count: (current?.count || 0) + 1 });
      });
      result[key] = [...values.entries()]
        .map(([value, item]) => ({ value, label: item.label, count: item.count }))
        .sort((left, right) => left.label.localeCompare(right.label, 'pt-BR', { numeric: true, sensitivity: 'base' }));
    });
    return result;
  }, [rows]);

  const filtered = useMemo(() => {
    const result = rows.filter(({ event, row }) => {
      const haystack = `${event.description} ${event.category?.name || ''} ${event.category?.group || ''} ${event.account?.name || ''} ${event.paymentMethod?.name || ''}`.toLocaleLowerCase('pt-BR');
      const visualType = launchTypeForEvent(event.type);
      const toolbarMatches = haystack.includes(search.trim().toLocaleLowerCase('pt-BR'))
        && (typeFilter === 'all' || visualType === typeFilter)
        && (status === 'all' || event.status === status)
        && (account === 'all' || event.accountId === account);
      if (!toolbarMatches) return false;
      return (Object.keys(gridFilters) as GridKey[]).every((key) => matchesGridFilter(row[key], gridFilters[key]));
    });
    if (!gridSort) return result.map(({ event }) => event);
    return [...result]
      .sort((left, right) => compareGridValues(left.row[gridSort.key], right.row[gridSort.key], gridSort.direction))
      .map(({ event }) => event);
  }, [rows, search, typeFilter, status, account, gridFilters, gridSort]);

  const monthTotals = useMemo(() => monetaryTotals(monthEvents), [monthEvents]);
  const filteredTotals = useMemo(() => monetaryTotals(filtered), [filtered]);
  const activeGridFilters = (Object.keys(gridFilters) as GridKey[]).filter((key) => filterIsActive(gridFilters[key]));
  const toolbarFilterCount = Number(Boolean(search.trim())) + Number(typeFilter !== 'all') + Number(status !== 'all') + Number(account !== 'all');
  const activeFilterCount = activeGridFilters.length + toolbarFilterCount;
  const hasActiveFilters = activeFilterCount > 0;
  const displayedIncome = hasActiveFilters ? filteredTotals.income : monthTotals.income;
  const displayedExpense = hasActiveFilters ? filteredTotals.expense : monthTotals.expense;
  const displayedResult = displayedIncome - displayedExpense;
  const canArchiveEvent = data.user.role === 'ADMIN' || data.user.role === 'MANAGER';
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = filtered.length ? (currentPage - 1) * pageSize : 0;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const visibleEvents = expandedList ? filtered : filtered.slice(pageStart, pageEnd);
  const exportRows = useMemo(() => filtered.map((event) => {
    const row = gridRow(event);
    return {
      dueDate: formatIsoDate(String(row.dueDate)),
      purchaseDate: formatIsoDate(String(row.purchaseDate)),
      weekday: String(row.weekday ?? ''),
      type: String(row.type ?? ''),
      description: String(row.description ?? ''),
      income: typeof row.income === 'number' ? money.format(row.income) : '—',
      classification: String(row.classification ?? ''),
      group: String(row.group ?? ''),
      expense: typeof row.expense === 'number' ? money.format(row.expense) : '—',
      paymentMethod: String(row.paymentMethod ?? ''),
      status: String(row.status ?? ''),
      modality: String(row.modality ?? ''),
    };
  }), [filtered]);
  const paginationPages = useMemo(() => {
    if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);
    const start = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [currentPage, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, status, account, gridFilters, gridSort, pageSize]);

  useEffect(() => {
    setPage((value) => Math.min(value, pageCount));
  }, [pageCount]);

  useEffect(() => {
    const target = window as PhoenixExportRegistryWindow;
    const registry = target.__MEG_PHOENIX_EXPORT_DATA__ || (target.__MEG_PHOENIX_EXPORT_DATA__ = {});
    registry.movements = { rows: exportRows };
    return () => {
      if (registry.movements?.rows === exportRows) delete registry.movements;
    };
  }, [exportRows]);

  const selectedAccount = data.accounts.find((item) => item.id === draft.accountId) || null;
  const selectedDestination = data.accounts.find((item) => item.id === draft.destinationId) || null;
  const selectedCategory = data.categories.find((item) => item.id === draft.categoryId) || null;
  const selectedPayment = data.paymentMethods.find((item) => item.id === draft.paymentMethodId) || null;
  const selectedCard = data.cards.find((item) => item.id === draft.cardId) || null;
  const editingEvent = editingEventId ? data.events.items.find((item) => item.id === editingEventId) || null : null;
  const editingCardPurchase = editingEvent ? projectedCardPurchase(data, editingEvent) : null;
  const editingBenefit = Boolean(editingEvent && isBenefitEvent(editingEvent));
  const benefit = editingBenefit || selectedAccount?.type === 'benefit' || isBenefitAccount(selectedAccount?.name);
  const credit = Boolean(editingCardPurchase) || isCreditMethod(selectedPayment?.name, selectedPayment?.type);
  const pix = draft.type === 'expense' && isPixMethod(selectedPayment?.name, selectedPayment?.type);
  const crediario = isCrediarioMethod(selectedPayment?.name, selectedPayment?.type);
  const calculatedDue = selectedCard ? cardDueDate(draft.eventDate, selectedCard.closingDay, selectedCard.dueDay) : '';
  const effectiveSituation: LaunchSituation = draft.type === 'income' ? 'paid' : credit ? 'planned' : benefit ? 'paid' : pix ? 'paid' : draft.situation;
  const situationRule = draft.type === 'income'
    ? 'Receitas são registradas sempre como recebidas.'
    : credit
      ? 'Compras no crédito ficam sempre pendentes até a baixa da fatura.'
      : benefit
        ? 'Benefício alimentação fica sempre como pago e não compõe o caixa monetário.'
        : pix
          ? 'Pagamento via Pix é imediato e fica como Pago.'
          : '';

  const expenseCategories = useMemo(
    () => data.categories.filter((item) => item.isActive && (!item.type || item.type === 'expense')),
    [data.categories]
  );
  const expenseClassifications = useMemo(() => {
    const values = new Map<string, string>();
    expenseCategories.forEach((item) => {
      const label = String(item.group || '').trim();
      if (label) values.set(normalizeText(label), label);
    });
    const all = [...values.values()].sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }));
    const specific = all.filter((label) => !['despesas', 'receitas'].includes(normalizeText(label)));
    return specific.length ? specific : all;
  }, [expenseCategories]);
  const expenseGroups = useMemo(() => {
    if (!draft.classification) return [];
    const groups = new Map<string, (typeof expenseCategories)[number]>();
    expenseCategories
      .filter((item) => normalizeText(item.group || '') === normalizeText(draft.classification))
      .forEach((item) => groups.set(normalizeText(item.name), item));
    return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' }));
  }, [expenseCategories, draft.classification]);
  const incomeCategories = useMemo(
    () => data.categories.filter((item) => item.isActive && (!item.type || item.type === 'income')).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' })),
    [data.categories]
  );
  const paymentMethods = data.paymentMethods.filter((item) => item.isActive);
  const accounts = data.accounts.filter((item) => item.isActive);
  const canonicalBenefitAccount = accounts.find((item) => item.type === 'benefit') || null;
  const canonicalVerocardPayment = paymentMethods.find((item) => normalizeText(item.name).includes('verocard')) || null;
  const cards = data.cards.filter((item) => item.isActive);

  const missing = useMemo(() => {
    const list: string[] = [];
    if (!draft.description.trim()) list.push('descrição');
    if (!draft.accountId && (draft.type === 'transfer' || !credit)) list.push(draft.type === 'transfer' ? 'conta de origem' : 'conta');
    if (!draft.eventDate) list.push('data');
    if (!amountCents) list.push('valor');
    if (draft.type === 'transfer') {
      if (!draft.destinationId) list.push('conta de destino');
      else if (draft.destinationId === draft.accountId) list.push('destino diferente da origem');
      if (benefit || selectedDestination?.type === 'benefit' || isBenefitAccount(selectedDestination?.name)) list.push('contas monetárias válidas');
    } else {
      if (draft.type === 'expense' && !draft.classification) list.push('classificação');
      if (draft.type === 'expense' && !draft.categoryId) list.push('grupo');
      if (!draft.paymentMethodId && !editingCardPurchase) list.push(draft.type === 'income' ? 'forma de recebimento' : 'forma de pagamento');
      if (credit && !draft.cardId) list.push('cartão');
    }
    if (draft.recurring && draft.recurrenceCount < 2) list.push('quantidade da recorrência');
    if (draft.saveTemplate && !draft.templateName.trim()) list.push('nome do modelo');
    return list;
  }, [draft, amountCents, benefit, selectedDestination?.name, credit]);

  const duplicate = useMemo(() => {
    if (!draft.description.trim() || !amountCents || !draft.accountId || !draft.eventDate) return null;
    const target = normalizeText(draft.description);
    return data.events.items.find((event) => event.id !== editingEventId
      && normalizeText(event.description) === target
      && Math.round(displayEffect(event) * 100) === (negative ? -amountCents : amountCents)
      && event.accountId === draft.accountId
      && event.date.slice(0, 10) === draft.eventDate) || null;
  }, [data.events.items, editingEventId, draft.description, draft.accountId, draft.eventDate, amountCents, negative]);

  const simpleWriteInput = useMemo(() => {
    if (draft.type === 'transfer') return null;
    return {
      type: draft.type,
      status: effectiveSituation,
      description: draft.description,
      date: draft.eventDate,
      competence: draft.eventDate.slice(0, 7),
      amount: (negative ? -1 : 1) * amountCents / 100,
      accountId: draft.accountId,
      categoryId: draft.categoryId || undefined,
      paymentMethodId: draft.paymentMethodId,
      notes: draft.notes || undefined,
    };
  }, [draft.type, draft.description, draft.eventDate, draft.accountId, draft.categoryId, draft.paymentMethodId, draft.notes, amountCents, negative, effectiveSituation]);

  const cardWriteInput = useMemo(() => {
    if (draft.type !== 'expense' || !credit) return null;
    return {
      cardId: draft.cardId,
      categoryId: draft.categoryId || undefined,
      description: draft.description,
      totalAmount: amountCents / 100,
      purchaseDate: draft.eventDate,
      installments: draft.installments,
    };
  }, [draft.type, draft.cardId, draft.categoryId, draft.description, draft.eventDate, draft.installments, amountCents, credit]);

  const simpleWriteFlow = useMemo(() => ({
    type: draft.type,
    negative,
    benefit,
    credit,
    crediario,
    recurring: draft.recurring,
    saveTemplate: draft.saveTemplate,
    installments: draft.installments,
    manualDue: draft.manualDue,
  }), [draft.type, draft.recurring, draft.saveTemplate, draft.installments, draft.manualDue, negative, benefit, credit, crediario]);

  const duplicateMessage = duplicate
    ? `${duplicate.description}, ${money.format(amountFromEvent(duplicate))}, em ${date.format(new Date(duplicate.date))}.`
    : null;

  useEffect(() => {
    if (launchRequest <= 0) return;
    openLaunch();
    if (launchPreset === 'income') {
      setDraft({ ...initialDraft(), type: 'income', situation: 'paid' });
      setDirty(false);
      return;
    }
    if (launchPreset === 'benefit') {
      setDraft({
        ...initialDraft(),
        type: 'expense',
        situation: 'paid',
        accountId: canonicalBenefitAccount?.id || '',
        paymentMethodId: canonicalVerocardPayment?.id || '',
      });
      setDirty(false);

      let frame = 0;
      let attempts = 0;
      const applyBenefitModality = () => {
        const select = document.querySelector<HTMLSelectElement>('.px-launch-drawer [data-phoenix-modality-select]');
        if (select) {
          if (select.value !== 'ALIMENTAÇÃO') {
            select.value = 'ALIMENTAÇÃO';
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return;
        }
        attempts += 1;
        if (attempts < 12) frame = window.requestAnimationFrame(applyBenefitModality);
      };
      frame = window.requestAnimationFrame(applyBenefitModality);
      return () => window.cancelAnimationFrame(frame);
    }
  }, [launchRequest, launchPreset, canonicalBenefitAccount?.id, canonicalVerocardPayment?.id]);

  useEffect(() => {
    if (draft.type === 'transfer' || !canonicalBenefitAccount || !canonicalVerocardPayment) return;
    const selected = data.accounts.find((item) => item.id === draft.accountId);
    if (selected?.type !== 'benefit') return;
    if (draft.paymentMethodId === canonicalVerocardPayment.id && draft.situation === 'paid') return;
    setDraft((current) => ({
      ...current,
      paymentMethodId: canonicalVerocardPayment.id,
      situation: 'paid',
    }));
  }, [draft.type, draft.accountId, draft.paymentMethodId, draft.situation, canonicalBenefitAccount?.id, canonicalVerocardPayment?.id, data.accounts]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (settlementConfirmOpen) setSettlementConfirmOpen(false);
      else if (deleteConfirmOpen) { setDeleteConfirmOpen(false); setDeleteTargetEvent(null); }
      else if (discardConfirmOpen) setDiscardConfirmOpen(false);
      else if (detailEvent) setDetailEvent(null);
      else if (launchOpen) requestCloseLaunch();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [detailEvent, launchOpen, dirty, discardConfirmOpen, deleteConfirmOpen, settlementConfirmOpen]);

  useEffect(() => {
    const handleAndroidBack = (event: Event) => {
      if (settlementConfirmOpen) {
        event.preventDefault();
        setSettlementConfirmOpen(false);
        return;
      }
      if (deleteConfirmOpen) {
        event.preventDefault();
        setDeleteConfirmOpen(false);
        setDeleteTargetEvent(null);
        return;
      }
      if (discardConfirmOpen) {
        event.preventDefault();
        setDiscardConfirmOpen(false);
        return;
      }
      if (detailEvent) {
        event.preventDefault();
        setDetailEvent(null);
        return;
      }
      if (launchOpen) {
        event.preventDefault();
        requestCloseLaunch();
      }
    };
    window.addEventListener('meg:android-back', handleAndroidBack);
    return () => window.removeEventListener('meg:android-back', handleAndroidBack);
  }, [detailEvent, launchOpen, dirty, discardConfirmOpen, deleteConfirmOpen, settlementConfirmOpen]);

  function markRecentlyUpdated(eventId: string) {
    if (recentTimerRef.current !== null) window.clearTimeout(recentTimerRef.current);
    setRecentEventId(eventId);
    recentTimerRef.current = window.setTimeout(() => {
      setRecentEventId((current) => current === eventId ? null : current);
      recentTimerRef.current = null;
    }, 3600);
  }

  function updateDraft<K extends keyof LaunchDraft>(key: K, value: LaunchDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setReviewed(false);
    setEditMessage('');
  }

  function changeLaunchType(type: TxType) {
    setDraft((current) => ({
      ...current, type, situation: type === 'income' ? 'paid' : 'planned', classification: '', categoryId: '', paymentMethodId: editingBenefit ? current.paymentMethodId : '', cardId: '',
      destinationId: type === 'transfer' ? current.destinationId : ''
    }));
    if (type === 'transfer') setNegative(false);
    setDirty(true);
    setReviewed(false);
    setEditMessage('');
  }

  function changeClassification(classification: string) {
    setDraft((current) => ({ ...current, classification, categoryId: '' }));
    setDirty(true);
    setReviewed(false);
  }

  function resetLaunch() {
    setDraft(initialDraft());
    setAmountCents(0);
    setNegative(false);
    setDirty(false);
    setReviewed(false);
    setValidationVisible(false);
    setEditingEventId(null);
    setEditingEventUpdatedAt(null);
    setSavingEdit(false);
    setEditMessage('');
    setDiscardConfirmOpen(false);
    setSettlementConfirmOpen(false);
    setDeleteConfirmOpen(false);
    setDeleteTargetEvent(null);
    setDeletingEvent(false);
    setLaunchWriteBusy(false);
  }

  function openLaunch(event?: FinancialEvent) {
    if (event) {
      const cardLink = projectedCardPurchase(data, event);
      const visualType = launchTypeForEvent(event.type);
      const classification = visualType === 'expense' ? (event.category?.group || event.sourceDetails?.expenseClass || '') : '';
      const groupName = visualType === 'expense' ? (event.category?.name || event.sourceDetails?.group || '') : '';
      const matchedCategory = visualType === 'expense'
        ? data.categories.find((item) => item.isActive && (!item.type || item.type === 'expense')
          && normalizeText(item.group || '') === normalizeText(classification)
          && normalizeText(item.name) === normalizeText(groupName))
        : null;
      const purchaseDate = cardLink ? String(cardLink.purchase.purchaseDate).slice(0, 10) : event.date.slice(0, 10);
      setDraft({
        ...initialDraft(),
        type: visualType,
        situation: visualType === 'income' ? 'paid' : event.status === 'planned' ? 'planned' : 'paid',
        description: cardLink ? cardLink.purchase.description : event.description,
        accountId: cardLink ? '' : event.accountId || '',
        eventDate: purchaseDate,
        classification,
        categoryId: cardLink?.purchase.category?.id || matchedCategory?.id || event.categoryId || '',
        paymentMethodId: cardLink ? cardPaymentMethodId(data, cardLink.card.name) : event.paymentMethodId || '',
        cardId: cardLink?.card.id || '',
        installments: cardLink ? Math.max(1, Number(cardLink.purchase.installments || 1)) : 1,
        notes: cardLink ? '' : event.notes || ''
      });
      setAmountCents(Math.round((cardLink ? Math.abs(Number(cardLink.purchase.totalAmount || 0)) : amountFromEvent(event)) * 100));
      setNegative(cardLink ? false : displayEffect(event) < 0);
      setEditingEventId(event.id);
      setEditingEventUpdatedAt(event.updatedAt || null);
    } else {
      resetLaunch();
      setEditingEventId(null);
      setEditingEventUpdatedAt(null);
    }
    setDetailEvent(null);
    setLaunchOpen(true);
    setDirty(false);
    setReviewed(false);
    setEditMessage('');
  }

  function openEventForEdit(event: FinancialEvent) {
    openLaunch(event);
  }

  function requestCloseLaunch() {
    if (launchWriteBusy || savingEdit || deletingEvent) {
      setEditMessage('A operação já foi enviada e ainda aguarda a confirmação do servidor. O MEG fechará esta tela automaticamente assim que houver aceite.');
      return;
    }
    if (dirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    setLaunchOpen(false);
    resetLaunch();
  }

  function discardLaunchChanges() {
    setDiscardConfirmOpen(false);
    setLaunchOpen(false);
    resetLaunch();
  }

  function onMoneyChange(value: string) {
    const digits = value.replace(/\D/g, '');
    setAmountCents(Math.min(999999999999, Number(digits || 0)));
    setNegative(value.includes('-'));
    setDirty(true);
    setReviewed(false);
  }

  function changeAmountSign(nextNegative: boolean) {
    if (draft.type === 'transfer') return;
    setNegative(nextNegative);
    setDirty(true);
    setReviewed(false);
    setEditMessage('');
  }

  function onMoneyKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === '-') {
      event.preventDefault();
      changeAmountSign(!negative);
    }
  }

  function reviewLaunch() {
    if (missing.length) {
      setValidationVisible(true);
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('.px-launch-drawer .px-field.is-invalid input, .px-launch-drawer .px-field.is-invalid select, .px-launch-drawer .px-field.is-invalid textarea')?.focus();
      });
      return;
    }
    setValidationVisible(false);
    setReviewed(true);
  }

  function invalidField(key: string) {
    return validationVisible && missing.includes(key);
  }

  async function saveEdit() {
    if (!editingEventId || !editingEvent || missing.length || savingEdit) return;

    if (editingCardPurchase) {
      if (!cardWriteInput || draft.type !== 'expense' || !credit || draft.recurring || draft.saveTemplate || draft.manualDue) {
        setEditMessage('No cartão, mantenha a modalidade Crédito. A data da compra define automaticamente a fatura e o vencimento.');
        return;
      }
      setSavingEdit(true);
      setSettlementConfirmOpen(false);
      setEditMessage('Salvando alteração e recalculando a fatura correspondente…');
      try {
        const { snapshot } = await runPhoenixCardPurchaseEdit(
          editingCardPurchase.purchase.id,
          cardWriteInput,
          data.month,
          () => {
            setDirty(false);
            setLaunchOpen(false);
            resetLaunch();
          },
        );
        if (snapshot) {
          setData(snapshot);
          onDataCommitted?.(snapshot);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'CARD_PURCHASE_UPDATE_FAILED';
        setEditMessage(message.includes('CARD_PURCHASE_ALREADY_PAID')
          ? 'Esta compra possui parcela já paga e foi protegida contra alteração.'
          : `${message}. Os dados foram mantidos para nova tentativa.`);
      } finally {
        setSavingEdit(false);
      }
      return;
    }

    if (!simpleWriteInput) return;
    if (draft.type === 'transfer' || credit || crediario || draft.recurring || draft.saveTemplate || draft.installments > 1 || draft.manualDue) {
      setEditMessage('Esta edição envolve um fluxo protegido ainda não normalizado como compra de cartão. Os dados foram mantidos sem alteração.');
      return;
    }
    if (editingBenefit && negative) {
      setEditMessage('No Vale Alimentação, correções negativas precisam ser feitas por exclusão do lançamento incorreto ou por um fluxo próprio de estorno.');
      return;
    }
    const committedEventId = editingEventId;
    setSavingEdit(true);
    setSettlementConfirmOpen(false);
    setEditMessage('Salvando alteração. Assim que o servidor aceitar, esta tela será liberada e a releitura continuará em segundo plano…');
    const accepted = () => {
      setDirty(false);
      setSettlementConfirmOpen(false);
      setLaunchOpen(false);
      resetLaunch();
    };
    try {
      const result = editingBenefit
        ? await runPhoenixBenefitEventEdit(
            committedEventId,
            { ...simpleWriteInput, status: 'paid', amount: Math.abs(simpleWriteInput.amount) },
            data.month,
            editingEventUpdatedAt || undefined,
            accepted,
          )
        : await runPhoenixSimpleEventEdit(
            committedEventId,
            simpleWriteInput,
            data.month,
            editingEventUpdatedAt || undefined,
            accepted,
          );
      const { snapshot } = result;
      if (snapshot) {
        setData(snapshot);
        onDataCommitted?.(snapshot);
        markRecentlyUpdated(committedEventId);
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : 'PHOENIX_WRITE_FAILED';
      setEditMessage(phoenixWriteMessage(code));
    } finally {
      setSavingEdit(false);
    }
  }

  function requestDeleteEvent(event?: FinancialEvent | null) {
    if (!canArchiveEvent) return;
    const target = event || editingEvent;
    if (!target) return;
    setDeleteTargetEvent(target);
    setDeleteConfirmOpen(true);
  }

  function requestSaveEdit() {
    if (!editingEvent || savingEdit) return;
    if (editingEvent.status === 'planned' && effectiveSituation === 'paid') {
      setSettlementConfirmOpen(true);
      return;
    }
    void saveEdit();
  }

  async function deleteSelectedEvent() {
    const target = deleteTargetEvent || editingEvent;
    if (!target || deletingEvent || !canArchiveEvent) return;
    const cardLink = projectedCardPurchase(data, target);
    setDeletingEvent(true);
    setEditMessage('');
    try {
      if (cardLink) {
        const purchaseId = cardLink.purchase.id;
        const { snapshot } = await runPhoenixCardPurchaseCancel(
          purchaseId,
          data.month,
          () => {
            setData((current) => ({
              ...current,
              events: {
                ...current.events,
                items: current.events.items.filter((event) => projectedCardMeta(event)?.purchaseId !== purchaseId),
              },
            }));
            setDeleteConfirmOpen(false);
            setDeleteTargetEvent(null);
            setDetailEvent(null);
            setDirty(false);
            setLaunchOpen(false);
            resetLaunch();
          },
        );
        if (snapshot) {
          setData(snapshot);
          onDataCommitted?.(snapshot);
        }
        return;
      }

      const { snapshot } = await runPhoenixSimpleEventArchive(
        target.id,
        data.month,
        target.updatedAt || undefined,
        () => {
          setData((current) => ({
            ...current,
            events: { ...current.events, items: current.events.items.filter((event) => event.id !== target.id) },
          }));
          setDeleteConfirmOpen(false);
          setDeleteTargetEvent(null);
          setDetailEvent(null);
          setDirty(false);
          setLaunchOpen(false);
          resetLaunch();
        },
      );
      if (snapshot) {
        setData(snapshot);
        onDataCommitted?.(snapshot);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PHOENIX_WRITE_FAILED';
      setDeleteConfirmOpen(false);
      setDeleteTargetEvent(null);
      setEditMessage(message.includes('CARD_PURCHASE_ALREADY_PAID')
        ? 'Esta compra possui parcela já paga e foi protegida contra exclusão.'
        : phoenixWriteMessage(message));
    } finally {
      setDeletingEvent(false);
    }
  }

  function updateGridFilter(key: GridKey, value: PhoenixGridFilterValue) {
    setGridFilters((current) => ({ ...current, [key]: value }));
  }

  function clearGridFilter(key: GridKey) {
    const fresh = initialGridFilters();
    setGridFilters((current) => ({ ...current, [key]: fresh[key] }));
  }

  function clearAllGridFilters() {
    setGridFilters(initialGridFilters());
    setGridSort(null);
  }

  function gridHeader(label: string, key: GridKey, kind: PhoenixGridFilterKind, options?: PhoenixGridOption[]) {
    return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={gridFilters[key]} options={options} sort={gridSort?.key === key ? gridSort.direction : null} onSort={(direction) => setGridSort({ key, direction })} onChange={(value) => updateGridFilter(key, value)} /></div>;
  }

  return <section className="px-screen px-movements-v15">
    <section className="px-movements-overview">
      <div className="px-movement-hero-row">
        <header className="px-screen-head">
          <div><span className="px-kicker">Lançamentos</span><h1>Controle financeiro</h1><p>Inclua e controle seus eventos financeiros.</p></div>
        </header>

        <section className="px-screen-kpis" aria-label="Resumo do período">
          <article>
            <span className="px-kpi-icon is-income"><MovementIcon name="income" size={17} /></span>
            <div className="px-kpi-copy"><strong>{money.format(displayedIncome)}</strong><small>Receitas monetárias</small></div>
          </article>
          <article>
            <span className="px-kpi-icon is-expense"><MovementIcon name="expense" size={17} /></span>
            <div className="px-kpi-copy"><strong>{money.format(displayedExpense)}</strong><small>Despesas monetárias</small></div>
          </article>
          <article className={displayedResult < 0 ? 'is-negative' : 'is-positive'}>
            <span className="px-kpi-icon is-result"><MovementIcon name="result" size={17} /></span>
            <div className="px-kpi-copy"><strong>{money.format(displayedResult)}</strong><small>{hasActiveFilters ? `Resultado · ${activeFilterCount} filtro(s)` : 'Resultado do período'}</small></div>
          </article>
        </section>

      </div>

    </section>

    <section className="px-card px-table-card">
      <div className="px-table-toolbar-shell">
        <div className="px-table-context-slot" data-phoenix-table-context />
        <div className="px-movement-tools" ref={toolsRef}>
        <div className="px-movement-tool-buttons" aria-label="Ferramentas de consulta">
        <button className={`px-movement-tool-button ${toolPanel === 'search' || search.trim() ? 'active' : ''}`} type="button" aria-label="Buscar lançamentos" data-tooltip="Buscar" aria-expanded={toolPanel === 'search'} onClick={() => setToolPanel((current) => current === 'search' ? null : 'search')}><MovementIcon name="search" />{search.trim() ? <small>1</small> : null}</button>
        <button className={`px-movement-tool-button ${toolPanel === 'filters' || typeFilter !== 'all' || status !== 'all' ? 'active' : ''}`} type="button" aria-label="Filtrar lançamentos" data-tooltip="Filtros" aria-expanded={toolPanel === 'filters'} onClick={() => setToolPanel((current) => current === 'filters' ? null : 'filters')}><MovementIcon name="filters" />{typeFilter !== 'all' || status !== 'all' ? <small>{Number(typeFilter !== 'all') + Number(status !== 'all')}</small> : null}</button>
        <button className="px-movement-tool-button px-movement-period-button" type="button" aria-label={`Selecionar período atual ${formatMonthLabel(data.month)}`} data-tooltip={`Período · ${formatMonthLabel(data.month)}`} onClick={() => { setToolPanel(null); onOpenPeriod?.(); }}><MovementIcon name="calendar" /><span>{formatMonthLabel(data.month)}</span></button>
        <button className={`px-movement-tool-button ${toolPanel === 'account' || account !== 'all' ? 'active' : ''}`} type="button" aria-label="Filtrar por conta" data-tooltip={account === 'all' ? 'Conta' : labelForAccount(data, account)} aria-expanded={toolPanel === 'account'} onClick={() => setToolPanel((current) => current === 'account' ? null : 'account')}><MovementIcon name="wallet" />{account !== 'all' ? <small>1</small> : null}</button>
        </div>
        
        {toolPanel === 'search' ? <div className="px-movement-tool-panel px-movement-search-panel">
        <div className="px-tool-panel-heading"><div><strong>Buscar lançamentos</strong><span>{filtered.length} resultado(s) no filtro atual</span></div><button type="button" onClick={() => setToolPanel(null)} aria-label="Recolher busca"><MovementIcon name="close" size={15} /></button></div>
        <div className="px-search-panel-grid">
        <label className="px-expanded-search"><span><MovementIcon name="search" size={16} /></span><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite descrição, grupo, conta ou forma de pagamento..." />{search ? <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca"><MovementIcon name="close" size={14} /></button> : null}</label>
        {quickSearchSuggestions.length ? <div className="px-search-suggestions"><span>Sugestões</span><div>{quickSearchSuggestions.map((item) => <button type="button" key={item} onClick={() => setSearch(item)}>{item}</button>)}</div></div> : null}
        </div>
        </div> : null}
        
        {toolPanel === 'filters' ? <div className="px-movement-tool-panel">
        <div className="px-tool-panel-heading"><div><strong>Filtros rápidos</strong><span>Combine tipo e situação sem ocupar espaço quando não estiver usando.</span></div><button type="button" onClick={() => setToolPanel(null)} aria-label="Recolher filtros"><MovementIcon name="close" size={15} /></button></div>
        <div className="px-filter-panel-grid">
        <label><span>Tipo</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">Todos os tipos</option><option value="income">Receitas</option><option value="expense">Despesas</option><option value="transfer">Transferências</option></select></label>
        <label><span>Situação</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todas as situações</option><option value="planned">Pendente</option><option value="confirmed">Confirmado</option><option value="paid">Pago</option><option value="reconciled">Conciliado</option></select></label>
        <button className="px-tool-panel-clear" type="button" disabled={typeFilter === 'all' && status === 'all'} onClick={() => { setTypeFilter('all'); setStatus('all'); }}>Limpar filtros</button>
        </div>
        </div> : null}
        
        {toolPanel === 'account' ? <div className="px-movement-tool-panel">
        <div className="px-tool-panel-heading"><div><strong>Conta financeira</strong><span>Restrinja a grade a uma conta específica.</span></div><button type="button" onClick={() => setToolPanel(null)} aria-label="Recolher conta"><MovementIcon name="close" size={15} /></button></div>
        <div className="px-account-panel-grid">
        <label><span>Conta</span><select value={account} onChange={(event) => setAccount(event.target.value)}><option value="all">Todas as contas</option>{accounts.map((item) => <option key={item.id} value={item.id} data-account-type={item.type}>{item.name}</option>)}</select></label>
        <button className="px-tool-panel-clear" type="button" disabled={account === 'all'} onClick={() => setAccount('all')}>Todas as contas</button>
        </div>
        </div> : null}
        </div>
      </div>

      <div className={`px-grid-active-filters ${activeGridFilters.length || gridSort ? '' : 'is-empty'}`} aria-hidden={activeGridFilters.length || gridSort ? undefined : true}><span>Filtros da grade</span>{activeGridFilters.map((key) => <span className="px-grid-filter-chip" key={key}>{filterSummary(gridLabels[key], gridFilters[key])}<button type="button" onClick={() => clearGridFilter(key)} aria-label={`Remover filtro ${gridLabels[key]}`}>×</button></span>)}{gridSort ? <span className="px-grid-filter-chip">Ordenação: {gridLabels[gridSort.key]} {gridSort.direction === 'asc' ? '↑' : '↓'}<button type="button" onClick={() => setGridSort(null)} aria-label="Remover ordenação">×</button></span> : null}{activeGridFilters.length || gridSort ? <button className="px-grid-clear-all" type="button" onClick={clearAllGridFilters}>Limpar grade</button> : null}</div>

      {nativeOperational ? <div className="px-mobile-movement-list" aria-label="Lançamentos do período">
        <header className="px-mobile-movement-list-head">
          <div><strong>{filtered.length} lançamento{filtered.length === 1 ? '' : 's'}</strong><span>{formatMonthLabel(data.month)} · toque para abrir</span></div>
          <button type="button" onClick={() => openLaunch()}><MovementIcon name="plus" size={15} /> Novo</button>
        </header>
        {visibleEvents.map((event) => {
          const visualType = launchTypeForEvent(event.type);
          const isIncome = visualType === 'income';
          const rawSigned = Number(event.signedAmount || (isIncome ? Math.abs(Number(event.amount || 0)) : visualType === 'expense' ? -Math.abs(Number(event.amount || 0)) : 0));
          const group = sourceGroup(event);
          const accountName = event.account?.name || 'Conta não informada';
          const payment = sourcePayment(event);
          const purchaseDate = sourcePurchaseDate(event);
          return <button
            className={`px-mobile-movement-card ${visualType} ${recentEventId === event.id ? 'is-recently-updated' : ''}`}
            type="button"
            key={event.id}
            onClick={() => setDetailEvent(event)}
            aria-label={`${event.description}, ${money.format(rawSigned)}, ${sourceSituation(event)}`}
          >
            <span className={`px-mobile-movement-type ${visualType}`} aria-hidden="true"><MovementIcon name={isIncome ? 'income' : visualType === 'expense' ? 'expense' : 'result'} size={17} /></span>
            <span className="px-mobile-movement-main">
              <span className="px-mobile-movement-topline"><small>{formatIsoDate(purchaseDate)} · {event.sourceDetails?.weekday || weekday(event.date)}</small><em className={`px-mobile-movement-status ${event.status}`}>{sourceSituation(event)}</em></span>
              <strong title={event.description}>{event.description}</strong>
              <span className="px-mobile-movement-meta"><b>{group !== '—' ? group : sourceClassification(event)}</b><i>·</i><span>{accountName}</span></span>
              <span className="px-mobile-movement-submeta">{payment !== '—' ? payment : sourceModality(event)}</span>
            </span>
            <span className={`px-mobile-movement-value ${rawSigned < 0 ? 'negative' : rawSigned > 0 ? 'positive' : ''}`}>
              <strong>{money.format(rawSigned)}</strong>
              <small>›</small>
            </span>
          </button>;
        })}
        {!filtered.length ? <div className="px-mobile-movement-empty"><strong>Nenhum lançamento</strong><span>Revise os filtros ou inclua um novo lançamento.</span></div> : null}
      </div> : null}

      <div className="px-table-scroll">
        <table className="px-data-table px-v15-launch-table" data-meg-export-source="movements">
          <thead><tr><th data-col="dueDate">{gridHeader('Vencimento', 'dueDate', 'date')}</th><th data-col="purchaseDate">{gridHeader('Data da compra', 'purchaseDate', 'date')}</th><th data-col="weekday">{gridHeader('Dia', 'weekday', 'multi', gridOptions.weekday)}</th><th data-col="type">{gridHeader('Tipo', 'type', 'multi', gridOptions.type)}</th><th data-col="description">{gridHeader('Descrição', 'description', 'text')}</th><th data-col="income">{gridHeader('Receita', 'income', 'number')}</th><th data-col="classification">{gridHeader('Classificação', 'classification', 'multi', gridOptions.classification)}</th><th data-col="group">{gridHeader('Grupo', 'group', 'multi', gridOptions.group)}</th><th data-col="expense">{gridHeader('Despesa', 'expense', 'number')}</th><th data-col="paymentMethod">{gridHeader('Forma de pagamento', 'paymentMethod', 'multi', gridOptions.paymentMethod)}</th><th data-col="status">{gridHeader('Situação', 'status', 'multi', gridOptions.status)}</th><th data-col="modality">{gridHeader('Modalidade', 'modality', 'multi', gridOptions.modality)}</th><th data-col="details">Detalhes</th></tr></thead>
          <tbody>{visibleEvents.map((event) => {
            const visualType = launchTypeForEvent(event.type);
            const effect = displayEffect(event);
            const isIncome = visualType === 'income';
            return <tr key={event.id} className={recentEventId === event.id ? 'is-recently-updated' : undefined} onDoubleClick={() => openEventForEdit(event)} title="Duplo clique para editar">
              <td data-col="dueDate" data-label="Vencimento">{formatIsoDate(event.date)}</td>
              <td data-col="purchaseDate" data-label="Data da compra">{formatIsoDate(sourcePurchaseDate(event))}</td>
              <td data-col="weekday" data-label="Dia">{event.sourceDetails?.weekday || weekday(event.date)}</td>
              <td data-col="type" data-label="Tipo"><span className={`px-type-flag ${visualType}`}>{isIncome ? 'RECEITA' : visualType === 'transfer' ? 'TRANSFERÊNCIA' : 'DESPESA'}</span></td>
              <td data-col="description" data-label="Descrição"><strong className="px-description-ellipsis" title={event.description}>{event.description}</strong></td>
              <td data-col="income" data-label="Receita" className={`px-money ${effect < 0 ? 'negative' : 'positive'}`}>{isIncome ? money.format(effect) : '—'}</td>
              <td data-col="classification" data-label="Classificação">{sourceClassification(event)}</td>
              <td data-col="group" data-label="Grupo">{sourceGroup(event)}</td>
              <td data-col="expense" data-label="Despesa" className={`px-money ${effect < 0 ? 'positive' : 'negative'}`}>{visualType === 'expense' ? money.format(effect) : '—'}</td>
              <td data-col="paymentMethod" data-label="Forma de pagamento">{sourcePayment(event)}</td>
              <td data-col="status" data-label="Situação"><span className={`px-status ${event.status}`}>{sourceSituation(event)}</span></td>
              <td data-col="modality" data-label="Modalidade">{sourceModality(event)}</td>
              <td data-col="details" data-label="Detalhes"><button className="px-detail-btn" type="button" onClick={() => setDetailEvent(event)} aria-label={`Detalhes de ${event.description}`}>↘</button></td>
            </tr>;
          })}</tbody>
        </table>
        {!filtered.length ? <p className="px-empty">Nenhum lançamento corresponde aos filtros do período.</p> : null}
      </div>

      <footer className="px-table-pagination" aria-label="Paginação dos lançamentos">
        <div className="px-pagination-summary">
          <strong>{filtered.length ? (expandedList ? `1–${filtered.length}` : `${pageStart + 1}–${pageEnd}`) : '0'} de {filtered.length}</strong>
          <span>{expandedList ? 'lista expandida' : 'lançamentos'}</span>
        </div>
        <div className="px-pagination-controls">
          {!expandedList ? <>
            <button type="button" aria-label="Primeira página" data-tooltip="Primeira página" disabled={currentPage === 1} onClick={() => setPage(1)}><MovementIcon name="chevronsLeft" size={15} /></button>
            <button type="button" aria-label="Página anterior" data-tooltip="Página anterior" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><MovementIcon name="chevronLeft" size={15} /></button>
            <div className="px-pagination-pages">{paginationPages.map((item) => <button key={item} type="button" className={item === currentPage ? 'active' : ''} aria-current={item === currentPage ? 'page' : undefined} onClick={() => setPage(item)}>{item}</button>)}</div>
            <button type="button" aria-label="Próxima página" data-tooltip="Próxima página" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><MovementIcon name="chevronRight" size={15} /></button>
            <button type="button" aria-label="Última página" data-tooltip="Última página" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)}><MovementIcon name="chevronsRight" size={15} /></button>
          </> : null}
        </div>
        <div className="px-pagination-options">
          <label><span>Registros</span><select value={expandedList ? 'all' : String(pageSize)} onChange={(event) => { const value = event.target.value; if (value === 'all') { setExpandedList(true); setPage(1); } else { setExpandedList(false); setPageSize(Number(value)); setPage(1); } }}>{[10,20,30,50,100].map((size) => <option key={size} value={String(size)}>{size} por página</option>)}<option value="all">Todos</option></select></label>
          <button className={expandedList ? 'active' : ''} type="button" aria-label={expandedList ? 'Voltar à paginação' : 'Expandir todos os registros na tabela'} data-tooltip={expandedList ? 'Voltar à paginação' : 'Expandir lista'} onClick={() => setExpandedList((value) => !value)}>{expandedList ? <MovementIcon name="collapse" size={16} /> : <MovementIcon name="expand" size={16} />}</button>
        </div>
      </footer>
    </section>

    {launchOpen ? <>
      <button className="px-launch-backdrop" type="button" aria-label="Fechar lançamento" onClick={requestCloseLaunch} />
      <aside className="px-launch-drawer" data-phoenix-refresh-month={data.month} aria-label={editingEventId ? 'Editar lançamento' : 'Novo lançamento'}>
        <div className="px-drawer-head"><div><span className="px-kicker">{editingEventId ? 'Editar evento' : 'Novo evento'}</span><h2>{editingEventId ? 'Editar lançamento' : 'Lançamento'}</h2></div><button className="px-icon-btn" type="button" aria-label="Fechar lançamento" title="Fechar lançamento" onClick={requestCloseLaunch}>×</button></div>
        <div className="px-launch-form px-card">
          <div className="px-segment" aria-label="Tipo do lançamento">{(['expense','income','transfer'] as TxType[]).map((item) => <button key={item} type="button" className={draft.type === item ? 'active' : ''} onClick={() => changeLaunchType(item)}>{item === 'expense' ? 'Despesa' : item === 'income' ? 'Receita' : 'Transferência'}</button>)}</div>
          <div className="px-launch-section-label">Dados principais</div>
          <label className={`px-field ${invalidField('descrição') ? 'is-invalid' : ''}`}><span>Descrição *</span><input value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} maxLength={120} autoComplete="off" placeholder="Ex.: supermercado, salário ou transferência" />{invalidField('descrição') ? <small className="px-field-error">Preencha a descrição.</small> : null}</label>

          <div className="px-form-row">
            <label className={`px-field ${invalidField(draft.type === 'transfer' ? 'conta de origem' : 'conta') ? 'is-invalid' : ''}`}><span>{draft.type === 'transfer' ? 'Conta de origem *' : 'Conta financeira *'}</span><select data-phoenix-account-select="source" value={draft.accountId} disabled={benefit} onChange={(event) => updateDraft('accountId', event.target.value)}><option value="">Selecione</option>{accounts.map((item) => <option key={item.id} value={item.id} data-account-type={item.type}>{item.name}</option>)}</select>{invalidField(draft.type === 'transfer' ? 'conta de origem' : 'conta') ? <small className="px-field-error">Selecione a conta.</small> : null}</label>
            <label className={`px-field ${invalidField('data') ? 'is-invalid' : ''}`}><span>Data do evento *</span><input type="date" value={draft.eventDate} onChange={(event) => updateDraft('eventDate', event.target.value)} />{invalidField('data') ? <small className="px-field-error">Informe a data.</small> : null}</label>
          </div>

          {draft.type === 'transfer' ? <div className="px-transfer-block"><div className="px-transfer-arrow">Conta de origem ↓ Conta de destino</div><label className={`px-field ${invalidField('conta de destino') || invalidField('destino diferente da origem') || invalidField('contas monetárias válidas') ? 'is-invalid' : ''}`}><span>Conta de destino *</span><select value={draft.destinationId} onChange={(event) => updateDraft('destinationId', event.target.value)}><option value="">Selecione uma conta diferente</option>{accounts.filter((item) => item.id !== draft.accountId).map((item) => <option key={item.id} value={item.id} data-account-type={item.type}>{item.name}</option>)}</select>{invalidField('conta de destino') ? <small className="px-field-error">Selecione a conta de destino.</small> : invalidField('destino diferente da origem') ? <small className="px-field-error">Origem e destino devem ser diferentes.</small> : invalidField('contas monetárias válidas') ? <small className="px-field-error">Use duas contas monetárias válidas.</small> : null}</label></div> : null}

          <div className="px-amount-entry">
            <label className={`px-field ${invalidField('valor') ? 'is-invalid' : ''}`}><span>Valor total *</span><input className="px-money-mask" inputMode="decimal" value={formatInputMoney(amountCents, negative)} onChange={(event) => onMoneyChange(event.target.value)} onKeyDown={onMoneyKeyDown} />{invalidField('valor') ? <small className="px-field-error">Informe um valor diferente de zero.</small> : <small>Informe o valor e escolha abaixo se ele é positivo ou negativo.</small>}</label>
            {draft.type !== 'transfer' ? <div className="px-sign-toggle" role="group" aria-label="Sinal do valor">
              <button type="button" className={!negative ? 'active positive' : ''} aria-pressed={!negative} onClick={() => changeAmountSign(false)}>+ Positivo</button>
              <button type="button" className={negative ? 'active negative' : ''} aria-pressed={negative} onClick={() => changeAmountSign(true)}>− Negativo / estorno</button>
            </div> : null}
          </div>
          {negative && amountCents ? <div className="px-notice warn">Valor negativo identificado. O lançamento será gravado preservando o sinal como estorno/reversão.</div> : null}

          {draft.type !== 'transfer' ? <>
            <div className="px-launch-section-label">{draft.type === 'income' ? 'Recebimento' : 'Classificação da despesa'}</div>
            {draft.type === 'expense' ? <div className="px-form-row">
              <label className={`px-field ${invalidField('classificação') ? 'is-invalid' : ''}`}><span>Classificação *</span><select value={draft.classification} onChange={(event) => changeClassification(event.target.value)}><option value="">Selecione a classificação</option>{expenseClassifications.map((item) => <option key={item} value={item}>{item}</option>)}</select>{invalidField('classificação') ? <small className="px-field-error">Selecione a classificação.</small> : null}</label>
              <label className={`px-field ${invalidField('grupo') ? 'is-invalid' : ''}`}><span>Grupo *</span><select value={draft.categoryId} disabled={!draft.classification} onChange={(event) => updateDraft('categoryId', event.target.value)}><option value="">{draft.classification ? 'Selecione o grupo' : 'Escolha a classificação primeiro'}</option>{expenseGroups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{invalidField('grupo') ? <small className="px-field-error">Selecione o grupo.</small> : null}</label>
            </div> : <label className="px-field"><span>Classificação da receita (opcional)</span><select value={draft.categoryId} onChange={(event) => updateDraft('categoryId', event.target.value)}><option value="">Sem classificação</option>{incomeCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            <div className="px-config-note"><span>{draft.type === 'expense' ? 'A classificação filtra os grupos pertencentes a ela. Ambos vêm da base central de Cadastros.' : 'Receitas não exigem grupo; a classificação é opcional e vem da base central de Cadastros.'}</span><strong>{draft.type === 'expense' ? `${expenseClassifications.length} classificações` : 'Base centralizada'}</strong></div>

            <div className="px-launch-section-label">{draft.type === 'income' ? 'Recebimento' : 'Pagamento e vencimento'}</div>
            <div className="px-form-row">
              <label className={`px-field ${invalidField(draft.type === 'income' ? 'forma de recebimento' : 'forma de pagamento') ? 'is-invalid' : ''}`}><span>{draft.type === 'income' ? 'Forma de recebimento *' : 'Forma de pagamento *'}</span><select data-phoenix-payment-method-select value={draft.paymentMethodId} disabled={benefit} onChange={(event) => updateDraft('paymentMethodId', event.target.value)}><option value="">Selecione</option>{paymentMethods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{invalidField(draft.type === 'income' ? 'forma de recebimento' : 'forma de pagamento') ? <small className="px-field-error">Selecione a forma.</small> : null}</label>
              {draft.type === 'income'
                ? <div className="px-field"><span>Situação</span><strong>Recebida</strong><small>Receitas são registradas sempre como recebidas.</small></div>
                : <label className="px-field"><span>Situação *</span><select value={effectiveSituation} disabled={Boolean(situationRule)} onChange={(event) => updateDraft('situation', event.target.value as LaunchSituation)}><option value="paid">Pago</option><option value="planned">Pendente</option></select><small>{situationRule || 'Escolha se a despesa já foi paga ou permanece pendente.'}</small></label>}
            </div>
          </> : null}

          {credit ? <div className="px-card-box">
            <label className={`px-field ${invalidField('cartão') ? 'is-invalid' : ''}`}><span>Cartão *</span><select value={draft.cardId} onChange={(event) => updateDraft('cardId', event.target.value)}><option value="">Selecione o cartão cadastrado</option>{cards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{invalidField('cartão') ? <small className="px-field-error">Selecione o cartão.</small> : null}</label>
            <div className="px-calculated-due"><span>Vencimento calculado</span><strong>{calculatedDue ? date.format(new Date(`${calculatedDue}T12:00:00Z`)) : 'Definido após selecionar o cartão'}</strong></div>
            <div className="px-rule-box">No crédito, a compra continua sendo um lançamento comum. A data da compra e o fechamento do cartão definem automaticamente a fatura e o vencimento; a baixa ocorre no pagamento da fatura.</div>
          </div> : null}

          {(credit || crediario) ? <div className="px-installment-box"><div className="px-form-row"><label className="px-field"><span>Quantidade de parcelas *</span><input type="number" min={1} max={credit ? 48 : 120} value={draft.installments} onChange={(event) => updateDraft('installments', Math.max(1, Number(event.target.value) || 1))} /></label><label className="px-field"><span>Vencimento da 1ª parcela</span><input type="date" disabled={credit} value={credit ? calculatedDue : draft.firstDue} onChange={(event) => updateDraft('firstDue', event.target.value)} /></label></div><div className="px-rule-box">No cartão, a divisão em parcelas seguirá o contrato da API: centavos são distribuídos sem perda e a primeira fatura depende da data de fechamento.</div></div> : null}

          {benefit ? <div className="px-notice ok">{draft.type === 'income'
            ? 'A receita do benefício é registrada como recebida; a recarga aumenta somente o saldo do benefício e não compõe o caixa monetário.'
            : 'ALIMENTAÇÃO ATIVA: a conta Benefício e a forma VEROCARD são aplicadas automaticamente e permanecem travadas. A despesa fica sempre como Paga e não altera o caixa monetário.'}</div> : null}

          <div className="px-launch-section-label">Repetição e observações</div>
          <label className="px-switch"><div><strong>Lançamento recorrente</strong><small>Simule os próximos eventos conforme a periodicidade.</small></div><input type="checkbox" checked={draft.recurring} onChange={(event) => updateDraft('recurring', event.target.checked)} /></label>
          {draft.recurring ? <div className="px-recurrence-box"><div className="px-form-row"><label className="px-field"><span>Periodicidade *</span><select value={draft.recurrenceFrequency} onChange={(event) => updateDraft('recurrenceFrequency', event.target.value as LaunchDraft['recurrenceFrequency'])}><option>Mensal</option><option>Semanal</option><option>Anual</option></select></label><label className={`px-field ${invalidField('quantidade da recorrência') ? 'is-invalid' : ''}`}><span>Quantidade *</span><input type="number" min={2} max={120} value={draft.recurrenceCount} onChange={(event) => updateDraft('recurrenceCount', Number(event.target.value) || 0)} />{invalidField('quantidade da recorrência') ? <small className="px-field-error">Informe ao menos 2 ocorrências.</small> : null}</label></div><div className="px-calculated-due"><span>Eventos que seriam criados</span><strong>{draft.recurrenceCount} lançamentos {draft.recurrenceFrequency.toLocaleLowerCase('pt-BR')}</strong></div></div> : null}

          <label className="px-switch"><div><strong>Salvar como modelo</strong><small>Validação visual apenas nesta etapa.</small></div><input type="checkbox" checked={draft.saveTemplate} onChange={(event) => updateDraft('saveTemplate', event.target.checked)} /></label>
          {draft.saveTemplate ? <label className={`px-field ${invalidField('nome do modelo') ? 'is-invalid' : ''}`}><span>Nome do modelo *</span><input maxLength={60} value={draft.templateName} onChange={(event) => updateDraft('templateName', event.target.value)} placeholder="Ex.: Compra mensal" />{invalidField('nome do modelo') ? <small className="px-field-error">Informe um nome para o modelo.</small> : null}</label> : null}
          <label className="px-field"><span>Observações opcionais</span><textarea maxLength={500} value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} placeholder="Inclua informações úteis para consulta futura" /></label>

          <div className="px-preview-box"><div className="px-launch-section-label">Resumo antes de confirmar</div><div><span>Tipo</span><strong>{draft.type === 'expense' ? 'Despesa' : draft.type === 'income' ? 'Receita' : 'Transferência'}</strong></div><div><span>Escopo</span><strong>{draft.type === 'transfer' && draft.destinationId ? `${labelForAccount(data, draft.accountId)} para ${labelForAccount(data, draft.destinationId)}` : labelForAccount(data, draft.accountId)}</strong></div>{draft.type === 'expense' ? <><div><span>Classificação</span><strong>{draft.classification || '—'}</strong></div><div><span>Grupo</span><strong>{selectedCategory?.name || '—'}</strong></div></> : null}<div><span>Valor</span><strong>{formatInputMoney(amountCents, negative)}</strong></div><div><span>Situação inicial</span><strong>{draft.type === 'transfer' ? 'Fluxo próprio' : draft.type === 'income' ? 'Recebida' : effectiveSituation === 'paid' ? 'Pago' : 'Pendente'}</strong></div></div>

          {duplicate ? <div className="px-rule-box duplicate">{`Possível duplicidade: ${duplicate.description}, ${money.format(amountFromEvent(duplicate))}, em ${date.format(new Date(duplicate.date))}.`}</div> : null}
          {validationVisible && missing.length ? <div className="px-form-validation-summary">Revise os campos destacados.</div> : null}
          {editMessage ? <div className={`px-notice ${editMessage.includes('protegido') || editMessage.includes('liberada') || editMessage.includes('possível') ? 'warn' : 'ok'}`}>{editMessage}</div> : null}

          {editingEventId ? <div className="px-edit-launch-actions">
            {!reviewed
              ? <button className="px-primary-action px-review-launch" type="button" onClick={reviewLaunch}>{missing.length ? 'Salvar alterações' : 'Revisar alterações'}</button>
              : <button className="px-primary-action px-confirm-launch" type="button" disabled={savingEdit || deletingEvent || Boolean(duplicate)} onClick={requestSaveEdit} aria-busy={savingEdit}>{savingEdit ? 'Salvando e sincronizando…' : duplicate ? 'Revise a possível duplicidade' : 'Salvar alterações'}</button>}
            <button className="px-secondary-action px-cancel-launch" type="button" disabled={savingEdit || deletingEvent} onClick={requestCloseLaunch}>Cancelar</button>
            {canArchiveEvent ? <button className="px-delete-launch" type="button" disabled={savingEdit || deletingEvent} onClick={() => requestDeleteEvent()}>Excluir lançamento</button> : null}
          </div>
            : <PhoenixLaunchWriteControl
              reviewed={reviewed}
              missing={missing}
              input={simpleWriteInput}
              cardInput={cardWriteInput}
              flow={simpleWriteFlow}
              refreshMonth={data.month}
              duplicateMessage={duplicateMessage}
              onReview={reviewLaunch}
              onBusyChange={setLaunchWriteBusy}
              onAccepted={() => {
                setDirty(false);
                setLaunchOpen(false);
                resetLaunch();
              }}
              onCommitted={(snapshot, event) => {
                setData(snapshot);
                onDataCommitted?.(snapshot);
                if (event) markRecentlyUpdated(event.id);
                setDirty(false);
                setLaunchOpen(false);
                resetLaunch();
              }}
            />}
        </div>
      </aside>
    </> : null}

    {discardConfirmOpen ? <div className="px-meg-confirm-overlay">
      <button className="px-meg-confirm-backdrop" type="button" aria-label="Continuar editando" onClick={() => setDiscardConfirmOpen(false)} />
      <section className="px-meg-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="px-discard-title" aria-describedby="px-discard-copy">
        <div className="px-meg-confirm-icon"><MovementIcon name="warning" size={22} /></div>
        <div className="px-meg-confirm-copy">
          <span className="px-kicker">Alterações não salvas</span>
          <h3 id="px-discard-title">Descartar alterações?</h3>
          <p id="px-discard-copy">As mudanças deste lançamento ainda não foram gravadas. Você pode continuar editando ou descartá-las.</p>
        </div>
        <button className="px-meg-confirm-close" type="button" aria-label="Continuar editando" onClick={() => setDiscardConfirmOpen(false)}><MovementIcon name="close" size={16} /></button>
        <div className="px-meg-confirm-actions">
          <button className="px-meg-confirm-secondary" type="button" onClick={() => setDiscardConfirmOpen(false)}>Continuar editando</button>
          <button className="px-meg-confirm-danger" type="button" onClick={discardLaunchChanges}>Descartar alterações</button>
        </div>
      </section>
    </div> : null}

    {settlementConfirmOpen && editingEvent ? <div className="px-meg-confirm-overlay px-settlement-confirm">
      <button className="px-meg-confirm-backdrop" type="button" aria-label="Não baixar a pendência" onClick={() => setSettlementConfirmOpen(false)} />
      <section className="px-meg-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="px-settlement-title" aria-describedby="px-settlement-copy">
        <div className="px-meg-confirm-icon"><MovementIcon name="warning" size={22} /></div>
        <div className="px-meg-confirm-copy">
          <span className="px-kicker">Baixa de pendência</span>
          <h3 id="px-settlement-title">Deseja realmente baixar a pendência?</h3>
          <p id="px-settlement-copy"><strong>{draft.description || editingEvent.description}</strong> · {formatInputMoney(amountCents, negative)}. Ao confirmar, o status será Pago e o MEG registrará a baixa financeira.</p>
        </div>
        <button className="px-meg-confirm-close" type="button" aria-label="Não baixar a pendência" onClick={() => setSettlementConfirmOpen(false)}><MovementIcon name="close" size={16} /></button>
        <div className="px-meg-confirm-actions">
          <button className="px-meg-confirm-secondary" type="button" disabled={savingEdit} onClick={() => setSettlementConfirmOpen(false)}>Não</button>
          <button className="px-meg-confirm-danger" type="button" disabled={savingEdit} aria-busy={savingEdit} onClick={() => { void saveEdit(); }}>{savingEdit ? 'Baixando…' : 'Sim, baixar'}</button>
        </div>
      </section>
    </div> : null}

    {deleteConfirmOpen && (deleteTargetEvent || editingEvent) ? <div className="px-meg-confirm-overlay px-delete-event-confirm">
      <button className="px-meg-confirm-backdrop" type="button" aria-label="Cancelar exclusão" onClick={() => { setDeleteConfirmOpen(false); setDeleteTargetEvent(null); }} />
      <section className="px-meg-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="px-delete-event-title" aria-describedby="px-delete-event-copy">
        <div className="px-meg-confirm-icon"><MovementIcon name="warning" size={22} /></div>
        <div className="px-meg-confirm-copy">
          <span className="px-kicker">Excluir lançamento</span>
          <h3 id="px-delete-event-title">Deseja excluir este lançamento?</h3>
          <p id="px-delete-event-copy"><strong>{(deleteTargetEvent || editingEvent)?.description || draft.description || 'Lançamento selecionado'}</strong> · {money.format(displayEffect((deleteTargetEvent || editingEvent)!))}. A exclusão retira o lançamento dos saldos e da listagem, mantendo o registro de auditoria.</p>
          {dirty && editingEventId === (deleteTargetEvent || editingEvent)?.id ? <p>As alterações ainda não salvas deste formulário serão descartadas.</p> : null}
        </div>
        <button className="px-meg-confirm-close" type="button" aria-label="Cancelar exclusão" onClick={() => { setDeleteConfirmOpen(false); setDeleteTargetEvent(null); }}><MovementIcon name="close" size={16} /></button>
        <div className="px-meg-confirm-actions">
          <button className="px-meg-confirm-secondary" type="button" disabled={deletingEvent} onClick={() => { setDeleteConfirmOpen(false); setDeleteTargetEvent(null); }}>Cancelar</button>
          <button className="px-meg-confirm-danger" type="button" disabled={deletingEvent} aria-busy={deletingEvent} onClick={() => { void deleteSelectedEvent(); }}>{deletingEvent ? 'Excluindo e sincronizando…' : 'Sim, excluir'}</button>
        </div>
      </section>
    </div> : null}

    {detailEvent ? <aside className="px-detail-drawer open" aria-label="Detalhes do lançamento">
      <div className="px-drawer-head"><div><span className="px-kicker">Lançamento</span><h2>Detalhes</h2></div><button className="px-icon-btn" type="button" onClick={() => setDetailEvent(null)}>×</button></div>
      <p className="px-detail-description">{detailEvent.description}</p>
      <div className="px-detail-grid"><div><span>Vencimento</span><strong>{formatIsoDate(detailEvent.date)}</strong></div><div><span>Data da compra</span><strong>{formatIsoDate(sourcePurchaseDate(detailEvent))}</strong></div><div><span>Situação</span><strong>{launchTypeForEvent(detailEvent.type) === 'income' ? 'Recebida' : eventStatus(detailEvent.status)}</strong></div><div><span>Conta</span><strong>{detailEvent.account?.name || 'Não informada'}</strong></div><div><span>Sincronização</span><strong>Confirmada na leitura atual</strong></div><div><span>Tipo</span><strong>{eventType(detailEvent.type)}</strong></div><div><span>Valor</span><strong>{money.format(displayEffect(detailEvent))}</strong></div><div><span>Classificação</span><strong>{sourceClassification(detailEvent)}</strong></div><div><span>Grupo</span><strong>{sourceGroup(detailEvent)}</strong></div><div><span>Forma</span><strong>{sourcePayment(detailEvent)}</strong></div><div><span>Modalidade</span><strong>{detailEvent.sourceDetails?.modality || '—'}</strong></div></div>
      {detailEvent.notes ? <div className="px-notice">{detailEvent.notes}</div> : null}
      {isCardDomainEvent(detailEvent)
        ? <div className="px-notice ok">Compra no cartão: a data da compra define a fatura conforme o fechamento. Editar ou excluir usa o mesmo fluxo de lançamentos e atualiza as parcelas vinculadas automaticamente.</div>
        : <div className="px-notice">Duplo clique na linha ou o botão abaixo abre a edição. Alterações simples são relidas da base antes da grade ser atualizada.</div>}
      <div className="px-detail-actions"><button className="px-primary-action" data-phoenix-generic-edit type="button" onClick={() => openLaunch(detailEvent)}>Editar lançamento</button>{canArchiveEvent ? <button className="px-delete-launch" data-phoenix-generic-delete type="button" onClick={() => requestDeleteEvent(detailEvent)}>Excluir lançamento</button> : null}<button className="px-secondary-action" type="button" onClick={() => { setDetailEvent(null); onNavigateHistory?.(); }}>Ver histórico</button></div>
    </aside> : null}
  </section>;
}
