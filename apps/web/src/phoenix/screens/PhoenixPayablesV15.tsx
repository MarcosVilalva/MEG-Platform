import { useEffect, useMemo, useState } from 'react';
import type { CreditCard } from '../../app/cards-client';
import type { Payable } from '../../app/payables-client';
import type { PhoenixReadModel } from '../contracts';
import {
  PHOENIX_PENDING_WRITE_ENABLED,
  preparePhoenixPendingBatchSettlement,
  preparePhoenixPendingSettlement,
  runPhoenixPendingBatchSettlement,
  runPhoenixPendingSettlement,
  type PreparedPhoenixPendingBatchSettlement,
  type PreparedPhoenixPendingSettlement,
  type PhoenixPendingWriteState,
} from '../data/phoenix-pending-write-gateway';
import '../phoenix-screens.css';
import '../phoenix-pending-write.css';
import '../phoenix-pending-v15.css';
import '../phoenix-pending-quick-settle.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const monetaryAccountTypes = new Set(['checking', 'savings', 'cash', 'investment']);

type Priority = 'all' | 'overdue' | 'today' | 'upcoming';
type GroupMode = 'date' | 'category' | 'account' | 'payment-method' | 'none';
type PendingChild = {
  id: string;
  description: string;
  amount: number;
  purchaseDate: string;
  installmentNo: number;
  installmentQty: number;
  sourceEventId?: string;
};
type PendingItem = {
  id: string;
  sourceId: string;
  source: 'payable' | 'event' | 'card';
  description: string;
  dueDate: string;
  openAmount: number;
  installmentNo: number;
  installmentQty: number;
  categoryName: string;
  group: string;
  paymentMethod: string;
  modality: string;
  accountName: string;
  accountId?: string | null;
  paymentMethodId?: string | null;
  statementMonth?: string;
  children?: PendingChild[];
};
type PendingGroup = {
  key: string;
  label: string;
  sortDate: string;
  kind: 'date' | 'card' | 'card-legacy' | 'standard';
  items: PendingItem[];
};
type DateRenderBlock = {
  key: string;
  kind: 'item' | 'card-legacy';
  items: PendingItem[];
};

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function isoDay(value: string | Date) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function installmentFromDescription(description: string) {
  const match = description.match(/(?:^|\s)(\d+)\s*\/\s*(\d+)\s*$/);
  if (!match) return { no: 1, qty: 1 };
  return { no: Number(match[1]) || 1, qty: Number(match[2]) || 1 };
}

function payableItem(item: Payable): PendingItem {
  return {
    id: `payable-${item.id}`,
    sourceId: item.id,
    source: 'payable',
    description: item.description,
    dueDate: isoDay(item.dueDate),
    openAmount: Number(item.openAmount || 0),
    installmentNo: item.installmentNo || 1,
    installmentQty: item.installmentQty || 1,
    categoryName: item.category?.group || item.category?.name || 'Sem classificação',
    group: item.category?.name || 'Sem grupo',
    paymentMethod: 'Não informada',
    modality: '—',
    accountName: 'Sem conta definida',
  };
}

function eventItems(data: PhoenixReadModel): PendingItem[] {
  return data.events.items
    .filter((event) => event.competence === data.month)
    .filter((event) => event.type === 'expense' && event.status === 'planned')
    .filter((event) => normalize(event.account?.type) !== 'benefit')
    .filter((event) => !normalize(`${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''} ${event.description}`).includes('verocard'))
    .map((event) => {
      const installment = installmentFromDescription(event.description);
      return {
        id: `event-${event.id}`,
        sourceId: event.id,
        source: 'event' as const,
        description: event.description,
        dueDate: isoDay(event.date),
        openAmount: -Number(event.signedAmount || 0),
        installmentNo: installment.no,
        installmentQty: installment.qty,
        categoryName: event.sourceDetails?.expenseClass || event.category?.group || event.category?.name || 'Sem classificação',
        group: event.sourceDetails?.group || event.category?.name || 'Sem grupo',
        paymentMethod: event.sourceDetails?.paymentMethod || event.paymentMethod?.name || 'Não informada',
        modality: event.sourceDetails?.modality || '—',
        accountName: event.account?.name || 'Sem conta definida',
        accountId: event.accountId,
        paymentMethodId: event.paymentMethodId,
      };
    });
}

function addMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7);
}

function statementDueIso(card: CreditCard, statementMonth: string) {
  const dueMonth = card.dueDay <= card.closingDay ? addMonth(statementMonth, 1) : statementMonth;
  const [year, month] = dueMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.max(1, Math.min(lastDay, Number(card.dueDay || 1)));
  return `${dueMonth}-${String(day).padStart(2, '0')}`;
}

function statementLabel(month: string) {
  const [year, monthNumber] = month.split('-');
  return `${monthNumber}/${year}`;
}

function isOpenCardStatus(value: unknown) {
  const status = normalize(value);
  return !['paid', 'pago', 'cancelled', 'canceled', 'cancelado', 'archived', 'arquivado'].includes(status);
}

function cardStatementItems(data: PhoenixReadModel): PendingItem[] {
  return data.cards.flatMap((card) => {
    if (card.statement?.month === data.month) {
      // A fatura canônica pode ser formada por parcelas oficiais, por eventos
      // normalizados legados ou por ambos. O writer "card" só pode liquidar
      // CardInstallment; eventos normalizados continuam no writer de eventos.
      // Nunca transforme o total canônico inteiro em uma fatura oficial, pois
      // isso duplicaria os mesmos eventos em Pendentes e perderia estornos.
      const officialLines = card.statement.lines
        .filter((line) => line.isOpen && line.source === 'card-installment');
      if (!officialLines.length) return [];

      const officialOpen = officialLines.reduce((sum, line) => sum + Number(line.effect || 0), 0);
      if (!Number.isFinite(officialOpen) || officialOpen <= 0) return [];

      const children: PendingChild[] = officialLines.map((line) => ({
        id: line.id,
        description: line.description,
        amount: Number(line.effect || 0),
        purchaseDate: line.purchaseDate || line.dueDate,
        installmentNo: Number(line.installmentNo || 1),
        installmentQty: Math.max(1, Number(line.installmentQty || 1)),
        sourceEventId: line.eventId,
      }));
      return [{
        id: `card-statement-${card.id}-${data.month}`,
        sourceId: card.id,
        source: 'card' as const,
        description: `${card.name} · Fatura ${statementLabel(data.month)}`,
        dueDate: card.statement.dueDate || statementDueIso(card, data.month),
        openAmount: officialOpen,
        installmentNo: 1,
        installmentQty: 1,
        categoryName: 'Cartão de crédito',
        group: 'Fatura de cartão',
        paymentMethod: card.name,
        modality: 'CRÉDITO',
        accountName: card.name,
        statementMonth: data.month,
        children,
      }];
    }

    // Compatibilidade com APIs anteriores ao contrato canônico: neste fallback
    // somente parcelas oficiais podem originar um item "card".
    const children: PendingChild[] = [];
    for (const purchase of card.purchases || []) {
      if (String(purchase.id || '').startsWith('legacy-')) continue;
      if (normalize(purchase.status) === 'cancelled' || normalize(purchase.status) === 'cancelado') continue;
      for (const entry of purchase.entries || []) {
        if (entry.statementMonth !== data.month || !isOpenCardStatus(entry.status)) continue;
        const amount = Number(entry.amount || 0);
        if (!Number.isFinite(amount) || amount === 0) continue;
        children.push({
          id: entry.id,
          description: purchase.description,
          amount,
          purchaseDate: isoDay(purchase.purchaseDate),
          installmentNo: Number(entry.number || 1),
          installmentQty: Math.max(1, Number(purchase.installments || 1)),
        });
      }
    }

    const childTotal = children.reduce((sum, item) => sum + item.amount, 0);
    const officialOpen = card.payableStatementAmount !== undefined
      ? Number(card.payableStatementAmount)
      : childTotal;
    if (!Number.isFinite(officialOpen) || officialOpen <= 0) return [];

    return [{
      id: `card-statement-${card.id}-${data.month}`,
      sourceId: card.id,
      source: 'card' as const,
      description: `${card.name} · Fatura ${statementLabel(data.month)}`,
      dueDate: statementDueIso(card, data.month),
      openAmount: officialOpen,
      installmentNo: 1,
      installmentQty: 1,
      categoryName: 'Cartão de crédito',
      group: 'Fatura de cartão',
      paymentMethod: card.name,
      modality: 'CRÉDITO',
      accountName: card.name,
      statementMonth: data.month,
      children,
    }];
  });
}

function signature(item: PendingItem) {
  return `${normalize(item.description)}|${item.dueDate}|${Math.abs(item.openAmount).toFixed(2)}`;
}

function isCardLike(item: PendingItem) {
  if (item.source === 'card') return true;
  const text = normalize(`${item.modality} ${item.paymentMethod}`);
  return text.includes('credito') || text.includes('cartao');
}

function savedGroupMode(): GroupMode {
  try {
    const value = localStorage.getItem('meg-pending-group-mode');
    if (value === 'date' || value === 'category' || value === 'account' || value === 'payment-method' || value === 'none') return value;
  } catch {
    // Preferência opcional: indisponibilidade do storage não impede a tela.
  }
  return 'date';
}

function groupLabel(mode: GroupMode, item: PendingItem) {
  if (mode === 'date') return date.format(new Date(`${item.dueDate}T12:00:00Z`));
  if (mode === 'category') return item.categoryName || 'Sem classificação';
  if (mode === 'account') return item.accountName || 'Sem conta definida';
  if (mode === 'payment-method') return item.paymentMethod || 'Não informada';
  return item.description;
}

function buildGroups(items: PendingItem[], mode: GroupMode): PendingGroup[] {
  const groups = new Map<string, PendingGroup>();

  for (const item of items) {
    if (mode === 'date') {
      const key = `date:${item.dueDate}`;
      const current = groups.get(key);
      if (current) current.items.push(item);
      else groups.set(key, {
        key,
        label: groupLabel('date', item),
        sortDate: item.dueDate,
        kind: 'date',
        items: [item],
      });
      continue;
    }

    const card = isCardLike(item);
    const officialCard = item.source === 'card';
    const key = officialCard
      ? `card:${item.sourceId}:${item.statementMonth || item.dueDate}`
      : card
        ? `card-legacy:${normalize(item.paymentMethod)}:${item.dueDate}`
        : mode === 'none'
          ? `item:${item.id}`
          : `${mode}:${normalize(groupLabel(mode, item))}`;
    const label = officialCard
      ? item.description
      : card
        ? `${item.paymentMethod} · ${date.format(new Date(`${item.dueDate}T12:00:00Z`))}`
        : groupLabel(mode, item);
    const kind: PendingGroup['kind'] = officialCard ? 'card' : card ? 'card-legacy' : 'standard';
    const current = groups.get(key);
    if (current) current.items.push(item);
    else groups.set(key, { key, label, sortDate: item.dueDate, kind, items: [item] });
  }

  return [...groups.values()].sort((left, right) => left.sortDate.localeCompare(right.sortDate) || left.label.localeCompare(right.label, 'pt-BR'));
}

function groupTotal(group: PendingGroup) {
  return group.items.reduce((sum, item) => sum + item.openAmount, 0);
}

function isBatchSelectable(item: PendingItem) {
  return item.openAmount > 0 || (item.source === 'event' && item.openAmount < 0 && isCardLike(item));
}

function batchEligible(items: PendingItem[]) {
  return items.filter(isBatchSelectable);
}

function pendingObligationCount(items: PendingItem[]) {
  const standalone = items.filter((item) => item.source === 'card' || !isCardLike(item)).length;
  const legacyCards = new Set(
    items
      .filter((item) => item.source !== 'card' && isCardLike(item))
      .map((item) => `${normalize(item.paymentMethod)}|${item.dueDate}`)
  );
  return standalone + legacyCards.size;
}

function dateRenderBlocks(group: PendingGroup): DateRenderBlock[] {
  const blocks: DateRenderBlock[] = [];
  const legacyCards = new Map<string, PendingItem[]>();

  for (const item of group.items) {
    if (item.source !== 'card' && isCardLike(item)) {
      const key = `legacy:${normalize(item.paymentMethod)}:${item.dueDate}`;
      const current = legacyCards.get(key);
      if (current) current.push(item); else legacyCards.set(key, [item]);
      continue;
    }
    blocks.push({ key: `item:${item.id}`, kind: 'item', items: [item] });
  }

  for (const [key, items] of legacyCards) {
    blocks.push({ key, kind: items.length > 1 ? 'card-legacy' : 'item', items });
  }

  return blocks.sort((left, right) => {
    const a = left.items[0];
    const b = right.items[0];
    return a.description.localeCompare(b.description, 'pt-BR');
  });
}

export function PhoenixPayables({ data }: { data: PhoenixReadModel }) {
  const [model, setModel] = useState(data);
  const today = todaySaoPaulo();
  const [priority, setPriority] = useState<Priority>('all');
  const [groupMode, setGroupMode] = useState<GroupMode>(savedGroupMode);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [detailItem, setDetailItem] = useState<PendingItem | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(today);
  const [accountId, setAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [prepared, setPrepared] = useState<PreparedPhoenixPendingSettlement | null>(null);
  const [preparedBatch, setPreparedBatch] = useState<PreparedPhoenixPendingBatchSettlement | null>(null);
  const [writeState, setWriteState] = useState<PhoenixPendingWriteState>({ status: 'idle' });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setModel(data);
  }, [data]);

  useEffect(() => {
    try { localStorage.setItem('meg-pending-group-mode', groupMode); } catch { /* preferência opcional */ }
    setExpandedGroups(new Set());
  }, [groupMode]);

  const open = useMemo(() => {
    const official = model.payables
      .filter((item) => !['paid', 'cancelled'].includes(normalize(item.status)) && Number(item.openAmount) > 0)
      .map(payableItem);
    const cards = cardStatementItems(model);
    const representedEventIds = new Set(cards.flatMap((card) => card.children || []).map((child) => child.sourceEventId).filter(Boolean));
    const seen = new Set(official.map(signature));
    const compatibility = eventItems(model).filter((item) => {
      if (representedEventIds.has(item.sourceId)) return false;
      const key = signature(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...cards, ...official, ...compatibility]
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.description.localeCompare(right.description, 'pt-BR'));
  }, [model]);

  const actionable = open.filter((item) => item.openAmount > 0);
  const overdue = actionable.filter((item) => item.dueDate < today);
  const dueToday = actionable.filter((item) => item.dueDate === today);
  const upcoming = actionable.filter((item) => item.dueDate > today);
  const total = open.reduce((sum, item) => sum + item.openAmount, 0);
  const openObligationCount = pendingObligationCount(open);
  const actionableObligationCount = pendingObligationCount(actionable);
  const overdueObligationCount = pendingObligationCount(overdue);
  const dueTodayObligationCount = pendingObligationCount(dueToday);
  const upcomingObligationCount = pendingObligationCount(upcoming);

  const visible = useMemo(() => open.filter((item) => {
    const actionableItem = item.openAmount > 0;
    const matchesPriority = priority === 'all'
      || (priority === 'overdue' && actionableItem && item.dueDate < today)
      || (priority === 'today' && actionableItem && item.dueDate === today)
      || (priority === 'upcoming' && actionableItem && item.dueDate > today);
    const childText = item.children?.map((child) => child.description).join(' ') || '';
    const haystack = normalize(`${item.description} ${item.categoryName} ${item.group} ${item.paymentMethod} ${item.modality} ${item.accountName} ${childText}`);
    return matchesPriority && haystack.includes(normalize(search));
  }), [open, priority, search, today]);

  const grouped = useMemo(() => buildGroups(visible, groupMode), [visible, groupMode]);
  const visibleObligationCount = pendingObligationCount(visible);
  const selectedItems = open.filter((item) => isBatchSelectable(item) && selected.has(item.id));
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.openAmount, 0);
  const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null;
  const batchMode = selectedItems.length > 1;
  const available = model.summary.availableBalance + model.summary.realizedResult;
  const compatibilityCount = open.filter((item) => item.source === 'event').length;
  const adjustmentCount = open.filter((item) => item.openAmount < 0).length;
  const activeAccounts = model.accounts.filter((item) => item.isActive && !['benefit', 'credit'].includes(normalize(item.type)));
  const monetaryAccounts = model.accounts.filter((item) => item.isActive && monetaryAccountTypes.has(normalize(item.type)));
  const activeMethods = model.paymentMethods.filter((item) => item.isActive);
  const cardSourceMethodNames = new Set(open.filter(isCardLike).map((item) => normalize(item.paymentMethod)).filter(Boolean));
  const statementMethods = activeMethods.filter((item) =>
    normalize(item.type) !== 'credit' && !cardSourceMethodNames.has(normalize(item.name)));
  const reviewAccounts = batchMode || selectedItem?.source === 'card' ? monetaryAccounts : activeAccounts;
  const reviewMethods = batchMode || selectedItem?.source === 'card' ? statementMethods : activeMethods;
  const canWrite = PHOENIX_PENDING_WRITE_ENABLED && ['ADMIN', 'MANAGER', 'OPERATOR'].includes(model.user.role);
  const saving = writeState.status === 'saving';

  function resetPrepared() {
    setPrepared(null);
    setPreparedBatch(null);
    if (writeState.status !== 'saving') setWriteState({ status: 'idle' });
  }

  function toggle(id: string) {
    setSuccessMessage('');
    resetPrepared();
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleGroupExpansion(key: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleGroupSelection(group: PendingGroup) {
    if (saving) return;
    const eligible = batchEligible(group.items);
    if (!eligible.length) return;
    const allSelected = eligible.every((item) => selected.has(item.id));
    setSuccessMessage('');
    resetPrepared();
    setSelected((current) => {
      const next = new Set(current);
      for (const item of eligible) {
        if (allSelected) next.delete(item.id); else next.add(item.id);
      }
      return next;
    });
  }

  function clearSelection() {
    if (saving) return;
    setSelected(new Set());
    setReviewOpen(false);
    setPrepared(null);
    setPreparedBatch(null);
    setWriteState({ status: 'idle' });
  }

  function suggestedAccount(items: PendingItem[]) {
    const accounts = items.length > 1 || items.some((item) => item.source === 'card') ? monetaryAccounts : activeAccounts;
    const explicit = items.map((item) => item.accountId).filter(Boolean) as string[];
    const common = explicit.length === items.length && new Set(explicit).size === 1 ? explicit[0] : '';
    if (common && accounts.some((account) => account.id === common)) return common;
    return accounts.find((account) => normalize(account.name).includes('principal'))?.id || accounts[0]?.id || '';
  }

  function suggestedMethod(items: PendingItem[]) {
    const methods = items.length > 1 || items.some((item) => item.source === 'card') ? statementMethods : activeMethods;
    const explicit = items.map((item) => item.paymentMethodId).filter(Boolean) as string[];
    const common = explicit.length === items.length && new Set(explicit).size === 1 ? explicit[0] : '';
    if (common && methods.some((method) => method.id === common)) return common;
    const names = items.map((item) => normalize(item.paymentMethod)).filter(Boolean);
    const commonName = names.length === items.length && new Set(names).size === 1 ? names[0] : '';
    if (commonName) {
      const exact = methods.find((method) => normalize(method.name) === commonName);
      if (exact) return exact.id;
    }
    return methods.find((method) => normalize(method.name).includes('pix'))?.id
      || methods[0]?.id
      || '';
  }

  function openReview(item?: PendingItem) {
    const targets = item ? [item] : selectedItems;
    const net = targets.reduce((sum, target) => sum + target.openAmount, 0);
    if (!targets.length || saving) return;
    if (item && item.openAmount <= 0) return;
    if (!item && (targets.some((target) => !isBatchSelectable(target)) || net <= 0)) return;
    setSuccessMessage('');
    if (item) setSelected(new Set([item.id]));
    setPaidAt(today);
    setAccountId(suggestedAccount(targets));
    setPaymentMethodId(suggestedMethod(targets));
    setWriteState({ status: 'idle' });
    setPrepared(null);
    setPreparedBatch(null);
    setReviewOpen(true);
  }

  function updatePaidAt(value: string) { setPaidAt(value); resetPrepared(); }
  function updateAccount(value: string) { setAccountId(value); resetPrepared(); }
  function updatePaymentMethod(value: string) { setPaymentMethodId(value); resetPrepared(); }

  async function confirmSettlement() {
    const targets = selectedItems;
    if (!targets.length || selectedTotal <= 0 || saving || !canWrite) return;
    const account = reviewAccounts.find((item) => item.id === accountId);
    const method = reviewMethods.find((item) => item.id === paymentMethodId);
    const operationId = targets.length > 1 ? preparedBatch?.operationId || '' : prepared?.operationId || '';
    if (!account || !method || !paidAt) {
      setWriteState({ status: 'error', operationId, code: 'PHOENIX_PENDING_FORM_INCOMPLETE', message: 'Informe data, conta e forma de pagamento antes de confirmar.' });
      return;
    }

    const itemLines = targets.map((item) => `• ${item.description}: ${money.format(item.openAmount)}`).join('\n');
    const title = targets.length > 1
      ? `CONFIRMAR BAIXA DE ${targets.length} SELECIONADOS`
      : targets[0].source === 'card'
        ? 'CONFIRMAR PAGAMENTO DA FATURA'
        : 'CONFIRMAR BAIXA REAL';
    const confirmed = window.confirm(
      `${title}\n\n${itemLines}\n\nTotal: ${money.format(selectedTotal)}\nData da baixa: ${date.format(new Date(`${paidAt}T12:00:00Z`))}\nConta: ${account.name}\nForma: ${method.name}\n\n${targets.length > 1 ? 'A mesma data, conta e forma serão aplicadas a todos os selecionados.\n\n' : ''}Deseja registrar ${targets.length > 1 ? 'essas baixas' : 'esta baixa'}?`
    );
    if (!confirmed) return;

    try {
      const result = targets.length === 1
        ? await (async () => {
            const target = targets[0];
            const nextPrepared = preparePhoenixPendingSettlement({
              source: target.source,
              sourceId: target.sourceId,
              amount: target.openAmount,
              paidAt,
              accountId,
              paymentMethodId,
              statementMonth: target.statementMonth,
            }, prepared);
            setPrepared(nextPrepared);
            return runPhoenixPendingSettlement(nextPrepared, model.month, setWriteState);
          })()
        : await (async () => {
            const nextPrepared = preparePhoenixPendingBatchSettlement({
              items: targets.map((target) => ({
                source: target.source,
                sourceId: target.sourceId,
                amount: target.openAmount,
                statementMonth: target.statementMonth,
              })),
              paidAt,
              accountId,
              paymentMethodId,
            }, preparedBatch);
            setPreparedBatch(nextPrepared);
            return runPhoenixPendingBatchSettlement(nextPrepared, model.month, setWriteState);
          })();
      if (result.status !== 'confirmed') return;

      setModel(result.snapshot);
      setSelected(new Set());
      setReviewOpen(false);
      setPrepared(null);
      setPreparedBatch(null);
      setSuccessMessage(targets.length > 1
        ? `${targets.length} compromissos baixados em ${date.format(new Date(`${paidAt}T12:00:00Z`))} por ${method.name}.`
        : `${targets[0].description} baixado em ${date.format(new Date(`${paidAt}T12:00:00Z`))} por ${method.name}.`);
      window.dispatchEvent(new Event('focus'));
    } catch (error) {
      setWriteState({
        status: 'error',
        operationId,
        code: error instanceof Error ? error.message : 'PHOENIX_PENDING_WRITE_FAILED',
        message: 'Não foi possível preparar a baixa. Revise os dados e tente novamente.'
      });
    }
  }

  function renderRow(item: PendingItem) {
    const adjustment = item.openAmount < 0;
    const late = adjustment ? 0 : item.dueDate < today
      ? Math.max(1, Math.floor((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${item.dueDate}T12:00:00Z`).getTime()) / 86400000))
      : 0;
    const card = isCardLike(item);
    return <div className={`px-pending-row ${adjustment ? 'is-adjustment' : ''} ${item.source === 'card' ? 'is-card-statement' : ''}`} key={item.id}>
      <input type="checkbox" aria-label={`Selecionar ${item.description}`} disabled={adjustment || saving} checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
      <div className="px-pending-date"><strong>{date.format(new Date(`${item.dueDate}T12:00:00Z`))}</strong><small>{adjustment ? 'Ajuste de estorno' : late ? `${late} dia(s) em atraso` : item.dueDate === today ? 'Vence hoje' : 'Programado'}</small></div>
      <div className="px-pending-copy"><strong>{item.description}</strong><small>{item.source === 'card' ? `${item.children?.length || 0} lançamento(s) agrupado(s)` : item.installmentQty > 1 ? `Parcela ${item.installmentNo}/${item.installmentQty}` : 'Pagamento único'} · {item.categoryName} · {item.paymentMethod}</small></div>
      <strong className={`px-pending-amount ${adjustment ? 'positive' : ''}`}>{money.format(item.openAmount)}</strong>
      <span className={`px-status ${adjustment ? 'reconciled' : late ? 'overdue' : 'planned'}`}>{adjustment ? 'ESTORNO' : card ? 'CARTÃO' : late ? 'VENCIDO' : 'PENDENTE'}</span>
      {!adjustment ? <button type="button" className="px-pending-quick-settle" disabled={saving || item.openAmount > available} aria-label={item.source === 'card' ? `Pagar fatura ${item.description}` : `Dar baixa em ${item.description}`} title={item.openAmount > available ? 'Saldo monetário insuficiente para esta baixa.' : 'Abre a revisão protegida antes de gravar.'} onClick={() => openReview(item)}>{item.source === 'card' ? 'Pagar fatura' : 'Dar baixa'}</button> : null}
      <button type="button" className="px-detail-btn" aria-label={`Detalhes de ${item.description}`} onClick={() => setDetailItem(item)}>↘</button>
    </div>;
  }

  function renderDateGroup(group: PendingGroup) {
    const eligible = batchEligible(group.items);
    const selectedCount = eligible.filter((item) => selected.has(item.id)).length;
    const allSelected = eligible.length > 0 && selectedCount === eligible.length;
    const partiallySelected = selectedCount > 0 && !allSelected;
    const expanded = expandedGroups.has(group.key);
    const blocks = dateRenderBlocks(group);

    return <section className={`px-pending-date-cluster ${expanded ? 'is-open' : ''}`} key={group.key}>
      <header
        className="px-pending-date-cluster-head"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => toggleGroupExpansion(group.key)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleGroupExpansion(group.key);
          }
        }}
      >
        <label className="px-pending-group-check" onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            aria-label={`Selecionar todas as pendências de ${group.label}`}
            disabled={!eligible.length || saving}
            checked={allSelected}
            ref={(node) => { if (node) node.indeterminate = partiallySelected; }}
            onChange={() => toggleGroupSelection(group)}
          />
          <span>Selecionar todas</span>
        </label>
        <div className="px-pending-date-cluster-copy">
          <strong>{group.label}</strong>
          <small>{blocks.length} compromisso(s){group.items.length !== blocks.length ? ` · ${group.items.length} lançamento(s)` : ''}{selectedCount ? ` · ${selectedCount} selecionado(s)` : ''}</small>
        </div>
        <strong className="px-pending-date-cluster-total">{money.format(groupTotal(group))}</strong>
        <span className="px-pending-date-cluster-chevron" aria-hidden="true">⌄</span>
      </header>
      {expanded ? <div className="px-pending-date-cluster-body">
        {blocks.map((block) => block.kind === 'card-legacy'
          ? <details className="px-pending-card-group px-pending-card-nested" key={block.key}>
              <summary><div><strong>Fatura · {block.items[0].paymentMethod}</strong><small>{block.items.length} lançamentos agrupados · valor líquido</small></div><strong>{money.format(block.items.reduce((sum, item) => sum + item.openAmount, 0))}</strong></summary>
              <div className="px-pending-card-net-action"><button type="button" disabled={saving || block.items.reduce((sum, item) => sum + item.openAmount, 0) <= 0} onClick={() => toggleGroupSelection({ key: block.key, label: block.items[0].paymentMethod, sortDate: block.items[0].dueDate, kind: 'card-legacy', items: block.items })}>Selecionar fatura líquida</button><span>Inclui automaticamente créditos e estornos do cartão.</span></div>
              <div className="px-pending-card-group-body">{block.items.map(renderRow)}</div>
            </details>
          : renderRow(block.items[0]))}
      </div> : null}
    </section>;
  }

  return <section className="px-screen">
    <header className="px-screen-head">
      <div><span className="px-kicker">Pendentes</span><h1>Prioridades e compromissos</h1><p>Organize por vencimento ou pela visão que preferir. Faturas de cartão permanecem consolidadas para evitar lançamentos espalhados.</p></div>
      <div className="px-screen-head-aside"><span className="px-total-pill">{money.format(total)} pendente</span></div>
    </header>

    {successMessage ? <div className="px-pending-write-banner" role="status"><strong>Baixa confirmada</strong><span>{successMessage}</span></div> : null}

    <section className="px-screen-kpis">
      <article><span>Total pendente líquido</span><strong>{money.format(total)}</strong><small>{actionableObligationCount} compromisso(s){adjustmentCount ? ` · ${adjustmentCount} ajuste(s)` : ''}</small></article>
      <article className="danger"><span>Vencidos</span><strong>{overdueObligationCount}</strong><small>Prioridade máxima</small></article>
      <article className="warn"><span>Vencem hoje</span><strong>{dueTodayObligationCount}</strong><small>Ação imediata</small></article>
      <article><span>Próximos vencimentos</span><strong>{upcomingObligationCount}</strong><small>Agenda ativa</small></article>
    </section>

    <div className="px-priority-tabs">{([['all','Todos'],['overdue','Vencidos'],['today','Hoje'],['upcoming','Próximos']] as const).map(([id,label]) => <button key={id} type="button" className={priority === id ? 'active' : ''} onClick={() => setPriority(id)}>{label}</button>)}</div>

    <div className="px-pending-layout">
      <section className="px-card px-pending-list">
        <div className="px-toolbar px-pending-toolbar-v15">
          <label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar compromisso, cartão, conta ou forma" /></label>
          <label className="px-pending-group-select"><span>Agrupar por</span><select value={groupMode} onChange={(event) => setGroupMode(event.target.value as GroupMode)}><option value="date">Data</option><option value="category">Categoria</option><option value="account">Conta</option><option value="payment-method">Forma de pagamento</option><option value="none">Sem agrupamento</option></select></label>
          <span className="px-toolbar-note">{visibleObligationCount} de {openObligationCount} compromisso(s) exibido(s)</span>
        </div>
        {selectedItems.length ? <div className="px-bulk-action-bar"><div><strong>{selectedItems.length} compromisso(s) selecionado(s)</strong><span>Total {money.format(selectedTotal)} · saldo após baixa {money.format(available - selectedTotal)}</span></div><button type="button" onClick={clearSelection}>Limpar</button><button type="button" className="primary" disabled={saving || selectedTotal <= 0 || selectedTotal > available} onClick={() => openReview()}>{selectedItems.length > 1 ? `Dar baixa nos selecionados (${selectedItems.length})` : 'Revisar baixa'}</button></div> : null}
        {compatibilityCount > 0 ? <div className="px-history-source-note"><strong>Leitura consolidada:</strong> contas, faturas oficiais e compromissos legados ficam na mesma agenda. Cada baixa continua usando o writer oficial do respectivo domínio.</div> : null}

        {grouped.map((group) => group.kind === 'date'
          ? renderDateGroup(group)
          : group.kind === 'card-legacy' && group.items.length > 1
            ? <details className="px-pending-card-group" key={group.key}>
                <summary><div><strong>Fatura · {group.label}</strong><small>{group.items.length} lançamentos agrupados · valor líquido</small></div><strong>{money.format(groupTotal(group))}</strong></summary>
                <div className="px-pending-card-net-action"><button type="button" disabled={saving || groupTotal(group) <= 0} onClick={() => toggleGroupSelection(group)}>Selecionar fatura líquida</button><span>Inclui automaticamente créditos e estornos do cartão.</span></div>
                <div className="px-pending-card-group-body">{group.items.map(renderRow)}</div>
              </details>
            : <section className={`px-pending-group ${group.kind === 'card' ? 'is-card-group' : ''}`} key={group.key}>
                <header><div><strong>{group.label}</strong><small>{group.kind === 'card' ? 'Fatura consolidada' : `${group.items.length} item(ns)`}</small></div><strong>{money.format(groupTotal(group))}</strong></header>
                {group.items.map(renderRow)}
              </section>)}
        {!visible.length ? <p className="px-empty">Nenhum compromisso corresponde ao filtro.</p> : null}
      </section>

      <aside className="px-card px-pending-side">
        <span className="px-kicker">Resumo da seleção</span>
        <h2>{selectedItems.length ? `${selectedItems.length} compromisso(s)` : 'Nenhum selecionado'}</h2>
        <dl><div><dt>Total selecionado</dt><dd>{money.format(selectedTotal)}</dd></div><div><dt>Saldo disponível</dt><dd>{money.format(available)}</dd></div><div><dt>Saldo após baixa</dt><dd>{money.format(available - selectedTotal)}</dd></div></dl>
        <button className="px-primary-action" type="button" disabled={!selectedItems.length || saving || selectedTotal <= 0 || selectedTotal > available} onClick={() => openReview()}>{selectedItems.length > 1 ? `Dar baixa nos ${selectedItems.length} selecionados` : 'Revisar e confirmar baixa'}</button>
        <small className="px-readonly-hint">Na seleção múltipla, data, conta e forma de pagamento são confirmadas uma vez e aplicadas a todos os compromissos selecionados.</small>
      </aside>
    </div>

    {detailItem ? <div className="px-pending-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailItem(null); }}><aside className="px-pending-drawer" role="dialog" aria-modal="true" aria-label={`Detalhes de ${detailItem.description}`}><header><div><span className="px-kicker">{detailItem.source === 'card' ? 'Detalhes da fatura' : 'Detalhes do compromisso'}</span><h2>{detailItem.description}</h2><p>{date.format(new Date(`${detailItem.dueDate}T12:00:00Z`))}</p></div><button type="button" aria-label="Fechar" onClick={() => setDetailItem(null)}>×</button></header><dl><div><dt>Valor</dt><dd>{money.format(detailItem.openAmount)}</dd></div><div><dt>Classificação</dt><dd>{detailItem.categoryName}</dd></div><div><dt>Grupo</dt><dd>{detailItem.group}</dd></div><div><dt>Forma prevista</dt><dd>{detailItem.paymentMethod}</dd></div><div><dt>Modalidade</dt><dd>{detailItem.modality}</dd></div><div><dt>Parcela</dt><dd>{detailItem.source === 'card' ? 'Fatura consolidada' : detailItem.installmentQty > 1 ? `${detailItem.installmentNo}/${detailItem.installmentQty}` : 'Pagamento único'}</dd></div></dl>{detailItem.children?.length ? <section className="px-pending-statement-lines"><div className="px-panel-head"><div><span>Lançamentos da fatura</span><strong>{detailItem.children.length} item(ns)</strong></div></div>{detailItem.children.map((child) => <div key={child.id}><span><strong>{child.description}</strong><small>{date.format(new Date(`${child.purchaseDate}T12:00:00Z`))} · parcela {child.installmentNo}/{child.installmentQty}</small></span><strong>{money.format(child.amount)}</strong></div>)}</section> : null}<footer><button type="button" className="px-secondary-action" onClick={() => setDetailItem(null)}>Fechar</button><button type="button" className="px-primary-action" onClick={() => { toggle(detailItem.id); setDetailItem(null); }}>{selected.has(detailItem.id) ? 'Remover da baixa' : detailItem.source === 'card' ? 'Selecionar fatura' : 'Selecionar para baixa'}</button></footer></aside></div> : null}

    {reviewOpen ? <div className="px-pending-overlay" role="presentation" onMouseDown={(event) => { if (!saving && event.target === event.currentTarget) setReviewOpen(false); }}><aside className="px-pending-drawer px-pending-review" role="dialog" aria-modal="true" aria-label="Revisar baixa"><header><div><span className="px-kicker">Baixa protegida</span><h2>{selectedItems.length === 1 ? `Revisar ${selectedItems[0].description}` : `Revisar ${selectedItems.length} compromisso(s)`}</h2><p>Confirme os dados efetivos do pagamento antes de gravar.</p></div><button type="button" aria-label="Fechar" disabled={saving} onClick={() => setReviewOpen(false)}>×</button></header><div className="px-pending-review-list">{selectedItems.map((item) => <div key={item.id}><span><strong>{item.description}</strong><small>{date.format(new Date(`${item.dueDate}T12:00:00Z`))} · previsto: {item.paymentMethod}</small></span><strong>{money.format(item.openAmount)}</strong></div>)}</div><dl><div><dt>Total selecionado</dt><dd>{money.format(selectedTotal)}</dd></div><div><dt>Saldo antes</dt><dd>{money.format(available)}</dd></div><div><dt>Saldo depois</dt><dd>{money.format(available - selectedTotal)}</dd></div></dl><div className="px-pending-payment-fields"><label><span>Data da baixa</span><input type="date" value={paidAt} max={today} disabled={saving} onChange={(event) => updatePaidAt(event.target.value)} /></label><label><span>Conta financeira</span><select value={accountId} disabled={saving} onChange={(event) => updateAccount(event.target.value)}><option value="">Selecione</option>{reviewAccounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label><label><span>Forma de pagamento</span><select value={paymentMethodId} disabled={saving} onChange={(event) => updatePaymentMethod(event.target.value)}><option value="">Selecione</option>{reviewMethods.map((method) => <option value={method.id} key={method.id}>{method.name}</option>)}</select></label></div>{selectedItems.length > 1 ? <div className="px-pending-write-warning"><strong>Baixa conjunta dos selecionados.</strong><span>A mesma data, conta e forma serão aplicadas a todos. Cada compromisso é confirmado pelo writer oficial; se houver interrupção, o MEG relê a base e mantém somente o que continuar pendente para nova tentativa.</span></div> : null}{writeState.status === 'error' ? <div className="px-pending-write-error" role="alert"><strong>Baixa não confirmada</strong><span>{writeState.message}</span></div> : null}<footer><button type="button" className="px-secondary-action" disabled={saving} onClick={() => setReviewOpen(false)}>Voltar</button><button type="button" className="px-primary-action" disabled={!canWrite || saving || !selectedItems.length || selectedTotal <= 0 || !paidAt || !accountId || !paymentMethodId || selectedTotal > available} onClick={() => { void confirmSettlement(); }}>{saving ? `Confirmando ${selectedItems.length > 1 ? 'baixas' : 'no servidor'}…` : selectedItems.length > 1 ? `Confirmar baixa de ${selectedItems.length} selecionados` : selectedItem?.source === 'card' ? 'Confirmar pagamento da fatura' : 'Confirmar baixa real'}</button><small>{selectedItems.length > 1 ? 'O lote usa identificadores estáveis por compromisso para que uma nova tentativa não duplique baixas já confirmadas.' : 'O botão só conclui após confirmação do servidor. Reenvios usam o mesmo operationId enquanto os dados não mudarem.'}</small></footer></aside></div> : null}
  </section>;
}