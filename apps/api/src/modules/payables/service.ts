import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { resolveWorkspaceContext } from '../workspaces/service';
import {
  addMonthsClamped,
  addRecurringPeriod,
  buildRecurringSchedule,
  isBenefitFinancialEvent,
  isBenefitPaymentMethod,
  isFuturePaymentDay,
  parseIsoDay,
  paymentBalanceDecision,
  recurrenceEndDate,
  type RecurrenceFrequency,
} from './core';

type Tx = Prisma.TransactionClient;

export class PayableDomainError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

export type ProtectedPaymentInput = {
  amount: number;
  paidAt: string;
  interestAmount: number;
  fineAmount: number;
  accountId?: string | null;
  paymentMethodId?: string | null;
  notes?: string | null;
  operationId?: string;
};

export type RecurringExpenseInput = {
  categoryId?: string | null;
  description: string;
  amount: number;
  frequency: RecurrenceFrequency;
  nextDueDate: string;
  endDate?: string | null;
  occurrenceCount?: number;
  notes?: string | null;
};

function dateOnly(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function nextDayExclusive(day: string) {
  const parsed = parseIsoDay(day);
  if (!parsed) throw new PayableDomainError('INVALID_PAYMENT_DATE');
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1));
}

function rollingHorizon(day: string, frequency: RecurrenceFrequency) {
  if (frequency === 'weekly') {
    let current = day;
    for (let index = 0; index < 26; index += 1) current = addRecurringPeriod(current, 'weekly');
    return current;
  }
  return addMonthsClamped(day, frequency === 'yearly' ? 24 : 6);
}

function retryableTransaction(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2034');
}

async function serializable<T>(work: (tx: Tx) => Promise<T>) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!retryableTransaction(error) || attempt === 3) throw error;
    }
  }
  throw new Error('SERIALIZABLE_TRANSACTION_RETRY_EXHAUSTED');
}

export async function monetaryBalanceAt(tx: Tx, userId: string, paidAt: string) {
  const cutoff = nextDayExclusive(paidAt.slice(0, 10));
  const events = await tx.financialEvent.findMany({
    where: { userId, archivedAt: null, date: { lt: cutoff } },
    select: {
      description: true,
      type: true,
      status: true,
      date: true,
      signedAmount: true,
      paymentMethod: { select: { name: true } },
    },
  });
  const posted = new Set(['paid', 'reconciled', 'confirmed']);
  const balance = events
    .filter((event) => !isBenefitFinancialEvent(event))
    .filter((event) => posted.has(event.status) || event.type === 'income' || event.type === 'redemption')
    .reduce((sum, event) => sum + Number(event.signedAmount), 0);
  return Math.round(balance * 100) / 100;
}

export async function listPayables(userId: string, month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return prisma.payable.findMany({
    where: { userId, dueDate: { gte: start, lt: end }, status: { not: 'cancelled' } },
    orderBy: { dueDate: 'asc' },
    include: { category: true, payments: { orderBy: { paidAt: 'desc' } } },
  });
}

async function materializeTemplate(tx: Tx, template: {
  id: string;
  userId: string;
  categoryId: string | null;
  description: string;
  amount: Prisma.Decimal;
  frequency: string;
  nextDueDate: Date;
  endDate: Date | null;
  isActive: boolean;
  notes: string | null;
}, horizonDay: string) {
  if (!template.isActive) return { created: 0, nextDueDate: dateOnly(template.nextDueDate), active: false };
  const frequency = template.frequency as RecurrenceFrequency;
  if (!['weekly', 'monthly', 'yearly'].includes(frequency)) throw new PayableDomainError('INVALID_RECURRENCE_FREQUENCY');
  const firstOccurrence = await tx.payable.findFirst({
    where: { recurrenceId: template.id },
    orderBy: { dueDate: 'asc' },
    select: { dueDate: true },
  });
  const anchorSource = dateOnly(firstOccurrence?.dueDate || template.nextDueDate);
  const anchor = parseIsoDay(anchorSource)?.day || parseIsoDay(dateOnly(template.nextDueDate))?.day || 1;
  const endDate = template.endDate ? dateOnly(template.endDate) : null;
  const schedule = buildRecurringSchedule({
    nextDueDate: dateOnly(template.nextDueDate),
    frequency,
    anchorDay: anchor,
    endDate,
    horizonDate: horizonDay,
  });
  if (!schedule.dates.length) {
    const inactive = Boolean(endDate && dateOnly(template.nextDueDate) > endDate);
    if (inactive) await tx.recurringExpense.update({ where: { id: template.id }, data: { isActive: false } });
    return { created: 0, nextDueDate: dateOnly(template.nextDueDate), active: !inactive };
  }
  const result = await tx.payable.createMany({
    data: schedule.dates.map((dueDate) => ({
      userId: template.userId,
      categoryId: template.categoryId,
      description: template.description,
      totalAmount: template.amount,
      openAmount: template.amount,
      dueDate: new Date(`${dueDate}T00:00:00.000Z`),
      recurrenceId: template.id,
      notes: template.notes,
    })),
    skipDuplicates: true,
  });
  await tx.recurringExpense.update({
    where: { id: template.id },
    data: {
      nextDueDate: new Date(`${schedule.nextDueDate}T00:00:00.000Z`),
      isActive: !schedule.finished,
    },
  });
  return { created: result.count, nextDueDate: schedule.nextDueDate, active: !schedule.finished };
}

export async function createRecurringExpense(userId: string, input: RecurringExpenseInput) {
  if (input.occurrenceCount && input.endDate) throw new PayableDomainError('RECURRENCE_TERMINATION_CONFLICT');
  const firstDay = input.nextDueDate.slice(0, 10);
  if (!parseIsoDay(firstDay)) throw new PayableDomainError('INVALID_RECURRENCE_START');
  const computedEnd = input.occurrenceCount
    ? recurrenceEndDate(firstDay, input.frequency, input.occurrenceCount)
    : input.endDate?.slice(0, 10) || null;
  if (computedEnd && (!parseIsoDay(computedEnd) || computedEnd < firstDay)) throw new PayableDomainError('INVALID_RECURRENCE_END');
  const horizon = computedEnd || rollingHorizon(firstDay, input.frequency);

  return prisma.$transaction(async (tx) => {
    if (input.categoryId) {
      const category = await tx.category.findFirst({ where: { id: input.categoryId, isActive: true } });
      if (!category) throw new PayableDomainError('INVALID_CATEGORY');
    }
    const template = await tx.recurringExpense.create({
      data: {
        userId,
        categoryId: input.categoryId,
        description: input.description.trim(),
        amount: input.amount,
        frequency: input.frequency,
        nextDueDate: new Date(`${firstDay}T00:00:00.000Z`),
        endDate: computedEnd ? new Date(`${computedEnd}T00:00:00.000Z`) : null,
        notes: input.notes?.trim() || null,
      },
    });
    const materialized = await materializeTemplate(tx, template, horizon);
    return { ...template, endDate: computedEnd, materialized };
  });
}

export async function materializeRecurringExpenses(now = new Date()) {
  const templates = await prisma.recurringExpense.findMany({ where: { isActive: true }, orderBy: { nextDueDate: 'asc' } });
  let created = 0;
  let processed = 0;
  for (const template of templates) {
    const frequency = template.frequency as RecurrenceFrequency;
    if (!['weekly', 'monthly', 'yearly'].includes(frequency)) continue;
    const today = dateOnly(now);
    const horizon = template.endDate ? dateOnly(template.endDate) : rollingHorizon(today, frequency);
    if (dateOnly(template.nextDueDate) > horizon) continue;
    const result = await prisma.$transaction((tx) => materializeTemplate(tx, template, horizon));
    created += result.created;
    processed += 1;
  }
  return { processed, created };
}

export async function payPayableProtected(userId: string, payableId: string, input: ProtectedPaymentInput) {
  if (isFuturePaymentDay(input.paidAt)) throw new PayableDomainError('FUTURE_PAYMENT_NOT_ALLOWED', { paidAt: input.paidAt.slice(0, 10) });
  const principal = Math.abs(input.amount);
  const paidTotal = principal + input.interestAmount + input.fineAmount;
  const workspace = input.operationId ? await resolveWorkspaceContext(userId) : null;
  const requestHash = input.operationId ? mutationRequestHash({ payableId, ...input, operationId: undefined }) : null;

  return serializable(async (tx) => {
    if (input.operationId && workspace && requestHash) {
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: workspace.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new PayableDomainError('OPERATION_ID_REUSED');
        return previous.response as unknown;
      }
    }

    const payable = await tx.payable.findFirst({
      where: { id: payableId, userId, status: { notIn: ['paid', 'cancelled'] } },
    });
    if (!payable) throw new PayableDomainError('PAYABLE_NOT_FOUND');
    const open = Number(payable.openAmount);
    if (principal > open) throw new PayableDomainError('AMOUNT_EXCEEDS_OPEN_BALANCE', { requested: principal, open });

    const account = input.accountId
      ? await tx.account.findFirst({ where: { id: input.accountId, isActive: true }, select: { id: true } })
      : null;
    if (input.accountId && !account) throw new PayableDomainError('INVALID_ACCOUNT');
    const paymentMethod = input.paymentMethodId
      ? await tx.paymentMethod.findFirst({ where: { id: input.paymentMethodId, isActive: true }, select: { id: true, name: true } })
      : null;
    if (input.paymentMethodId && !paymentMethod) throw new PayableDomainError('INVALID_PAYMENT_METHOD');

    let protection: Record<string, unknown> = { monetary: false, allowed: true };
    if (!isBenefitPaymentMethod(paymentMethod?.name)) {
      const available = await monetaryBalanceAt(tx, userId, input.paidAt);
      const decision = paymentBalanceDecision(available, paidTotal);
      protection = { monetary: true, ...decision, at: input.paidAt.slice(0, 10) };
      if (!decision.allowed) throw new PayableDomainError('INSUFFICIENT_MONETARY_BALANCE', protection);
    }

    const event = await tx.financialEvent.create({ data: {
      userId,
      description: `Pagamento: ${payable.description}`,
      type: 'expense',
      status: 'paid',
      date: new Date(input.paidAt),
      competence: input.paidAt.slice(0, 7),
      amount: paidTotal,
      signedAmount: -paidTotal,
      accountId: input.accountId,
      categoryId: payable.categoryId,
      paymentMethodId: input.paymentMethodId,
      notes: input.notes,
    } });
    const payment = await tx.payablePayment.create({ data: {
      payableId,
      amount: principal,
      paidAt: new Date(input.paidAt),
      interestAmount: input.interestAmount,
      fineAmount: input.fineAmount,
      accountId: input.accountId,
      paymentMethodId: input.paymentMethodId,
      financialEventId: event.id,
      notes: input.notes,
    } });
    const remaining = Math.max(0, open - principal);
    await tx.payable.update({ where: { id: payableId }, data: { openAmount: remaining, status: remaining === 0 ? 'paid' : 'partial' } });
    const response = {
      ...payment,
      financialEventId: event.id,
      remaining,
      payableStatus: remaining === 0 ? 'paid' : 'partial',
      protection,
      idempotentReplay: false,
    };

    if (input.operationId && workspace && requestHash) {
      const state = await tx.appState.findUnique({ where: { workspaceId: workspace.workspaceId }, select: { revision: true } });
      await tx.cloudMutationReceipt.create({ data: receiptCreateData({
        workspaceId: workspace.workspaceId,
        operationId: input.operationId,
        requestHash,
        mutationType: 'PAYABLE_PAYMENT',
        revision: state?.revision || 0,
        response,
      }) });
    }
    return response;
  });
}
