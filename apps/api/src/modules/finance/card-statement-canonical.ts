export type CanonicalCardStatementLineKind = 'charge' | 'credit';
export type CanonicalCardStatementLineSource = 'financial-event' | 'card-installment';

export type CanonicalCardStatementLine = {
  id: string;
  source: CanonicalCardStatementLineSource;
  eventId?: string;
  purchaseId?: string;
  installmentId?: string;
  description: string;
  effect: number;
  kind: CanonicalCardStatementLineKind;
  purchaseDate: string;
  dueDate: string;
  statementMonth: string;
  installmentNo: number;
  installmentQty: number;
  isOpen: boolean;
  sourceStatus: string;
};

export type CanonicalCardStatement = {
  month: string;
  dueDate: string;
  charges: number;
  credits: number;
  netAmount: number;
  openCharges: number;
  openCredits: number;
  openNetAmount: number;
  payableAmount: number;
  creditBalance: number;
  status: 'empty' | 'open' | 'partial' | 'paid' | 'zero' | 'credit';
  lines: CanonicalCardStatementLine[];
};

type FinancialEventLike = {
  id: string;
  description: string;
  type: string;
  status: string;
  date: Date | string;
  competence?: string | null;
  signedAmount: unknown;
  paymentMethod?: { name?: unknown } | null;
  sourcePayload?: unknown;
};

type CardPurchaseLike = {
  id: string;
  description: string;
  purchaseDate: Date | string;
  installments: number;
  status: string;
  entries: Array<{
    id: string;
    number: number;
    amount: unknown;
    statementMonth: string;
    status: string;
  }>;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function canonicalCardKey(value: unknown) {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function payloadRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function sourceValue(event: FinancialEventLike, key: string) {
  const payload = payloadRecord(event.sourcePayload);
  return payload ? payload[key] : undefined;
}

function isoDay(value: Date | string | unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const source = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(source) ? source : '';
}

function installmentFrom(event: FinancialEventLike) {
  const payload = payloadRecord(event.sourcePayload);
  const directNo = numberValue(payload?.installmentNumber);
  const directQty = numberValue(payload?.installmentCount);
  if (directNo && directQty) return { no: Math.max(1, directNo), qty: Math.max(1, directQty) };
  const match = event.description.match(/(?:^|\s)(\d+)\s*\/\s*(\d+)\s*$/);
  return match ? { no: Number(match[1]) || 1, qty: Number(match[2]) || 1 } : { no: 1, qty: 1 };
}

export function cardStatementEffectFromSignedAmount(signedAmount: unknown) {
  const signed = numberValue(signedAmount);
  return signed === null ? 0 : round(-signed);
}

export function legacyCardStatementEffect(transaction: Record<string, unknown>) {
  const entered = numberValue(transaction.amount);
  if (entered !== null) return round(entered);
  const signed = numberValue(transaction.signedAmount);
  if (signed !== null) return round(-signed);
  const expense = numberValue(transaction.expenseAmount);
  if (expense !== null) return round(expense);
  return 0;
}

export function cardStatementDueDate(month: string, closingDay: number, dueDay: number) {
  const addMonth = (value: string, offset: number) => {
    const [year, monthNumber] = value.split('-').map(Number);
    return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
  };
  const dueMonth = dueDay <= closingDay ? addMonth(month, 1) : month;
  const [year, monthNumber] = dueMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const day = Math.max(1, Math.min(lastDay, Number(dueDay || 1)));
  return `${dueMonth}-${String(day).padStart(2, '0')}`;
}

export function canonicalCardStatementTotals(lines: CanonicalCardStatementLine[]) {
  const charges = round(lines.reduce((sum, line) => sum + Math.max(0, line.effect), 0));
  const credits = round(lines.reduce((sum, line) => sum + Math.max(0, -line.effect), 0));
  const netAmount = round(charges - credits);
  const openLines = lines.filter((line) => line.isOpen !== false);
  const openCharges = round(openLines.reduce((sum, line) => sum + Math.max(0, line.effect), 0));
  const openCredits = round(openLines.reduce((sum, line) => sum + Math.max(0, -line.effect), 0));
  const openNetAmount = round(openCharges - openCredits);
  return {
    charges,
    credits,
    netAmount,
    openCharges,
    openCredits,
    openNetAmount,
    payableAmount: round(Math.max(0, openNetAmount)),
    creditBalance: round(Math.max(0, -openNetAmount)),
  };
}

function eventMatchesCard(event: FinancialEventLike, aliases: Set<string>) {
  if (!['expense', 'adjustment'].includes(String(event.type || '').toLowerCase())) return false;
  const status = String(event.status || '').toLowerCase();
  if (['draft', 'archived', 'cancelled', 'canceled'].includes(status)) return false;
  const paymentMethod = event.paymentMethod?.name
    ?? sourceValue(event, 'paymentMethod')
    ?? sourceValue(event, 'account');
  if (!aliases.has(canonicalCardKey(paymentMethod))) return false;
  const modality = canonicalCardKey(sourceValue(event, 'modality'));
  return !modality || modality.includes('CREDITO') || modality.includes('CARTAO');
}

export function buildCanonicalCardStatement(input: {
  month: string;
  closingDay: number;
  dueDay: number;
  aliases: Iterable<string>;
  events: FinancialEventLike[];
  purchases: CardPurchaseLike[];
}) : CanonicalCardStatement {
  const aliases = new Set([...input.aliases].map(canonicalCardKey).filter(Boolean));
  const dueDate = cardStatementDueDate(input.month, input.closingDay, input.dueDay);
  const officialPurchaseIds = new Set(input.purchases.map((purchase) => purchase.id));
  const lines: CanonicalCardStatementLine[] = [];

  for (const purchase of input.purchases) {
    if (String(purchase.status || '').toLowerCase() === 'cancelled') continue;
    for (const entry of purchase.entries || []) {
      const entryStatus = String(entry.status || '').toLowerCase();
      if (entry.statementMonth !== input.month || ['cancelled', 'canceled'].includes(entryStatus)) continue;
      const effect = round(numberValue(entry.amount) ?? 0);
      if (!effect) continue;
      lines.push({
        id: `installment:${entry.id}`,
        source: 'card-installment',
        purchaseId: purchase.id,
        installmentId: entry.id,
        description: purchase.description,
        effect,
        kind: effect < 0 ? 'credit' : 'charge',
        purchaseDate: isoDay(purchase.purchaseDate),
        dueDate,
        statementMonth: input.month,
        installmentNo: Math.max(1, Number(entry.number || 1)),
        installmentQty: Math.max(1, Number(purchase.installments || 1)),
        isOpen: entryStatus === 'open',
        sourceStatus: entryStatus || 'open',
      });
    }
  }

  for (const event of input.events) {
    const payload = payloadRecord(event.sourcePayload);
    const sourceDueDay = isoDay(payload?.date);
    const eventDay = isoDay(event.date);
    const statementMonth = sourceDueDay.slice(0, 7) || text(event.competence) || eventDay.slice(0, 7);
    if (statementMonth !== input.month || !eventMatchesCard(event, aliases)) continue;
    const purchaseId = text(payload?.purchaseId);
    if (purchaseId && officialPurchaseIds.has(purchaseId)) continue;
    const effect = cardStatementEffectFromSignedAmount(event.signedAmount);
    if (!effect) continue;
    const installment = installmentFrom(event);
    lines.push({
      id: `event:${event.id}`,
      source: 'financial-event',
      eventId: event.id,
      description: event.description,
      effect,
      kind: effect < 0 ? 'credit' : 'charge',
      purchaseDate: isoDay(payload?.purchaseDate) || eventDay,
      dueDate: sourceDueDay || eventDay || dueDate,
      statementMonth: input.month,
      installmentNo: installment.no,
      installmentQty: installment.qty,
      isOpen: String(event.status || '').toLowerCase() === 'planned',
      sourceStatus: String(event.status || '').toLowerCase(),
    });
  }

  lines.sort((left, right) =>
    left.purchaseDate.localeCompare(right.purchaseDate)
    || left.description.localeCompare(right.description, 'pt-BR')
    || left.id.localeCompare(right.id));

  const totals = canonicalCardStatementTotals(lines);
  const hasOpen = lines.some((line) => line.isOpen);
  const hasClosed = lines.some((line) => !line.isOpen);
  const status: CanonicalCardStatement['status'] = !lines.length
    ? 'empty'
    : totals.openNetAmount < 0
      ? 'credit'
      : totals.openNetAmount > 0
        ? hasClosed ? 'partial' : 'open'
        : hasOpen
          ? 'zero'
          : 'paid';

  return { month: input.month, dueDate, ...totals, status, lines };
}
