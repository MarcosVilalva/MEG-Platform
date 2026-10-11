import { prisma } from '@meg/database';
import {
  isBenefitFinancialEvent,
  isMonetaryFinancialEvent,
  isPostedFinancialStatus,
} from '../finance/financial-policy';
import { getCanonicalFinancialSummary } from '../finance/read-model';
import { monetaryBalanceAt } from '../finance/monetary-protection';
import { benefitBalanceAt } from '../finance/benefit-event-mutation';
import { resolveWorkspaceContext } from '../workspaces/service';
import type { LegacyTransaction } from './service';

type NotificationEvent = {
  date: Date;
  description: string;
  type: string;
  status: string;
  amount: { toString(): string } | number;
  account: { type: string } | null;
  paymentMethod: { name: string; type: string | null } | null;
};

export type CanonicalNotificationOverview = {
  monetaryOpening: number;
  monetaryIncome: number;
  monetaryPaidExpense: number;
  monetaryPendingExpense: number;
  monetaryAvailable: number;
  projectedClosing: number;
  benefitBalance: number;
  benefitIncome: number;
  benefitExpense: number;
};

const round = (value: number) => Math.round(value * 100) / 100;

function saoPauloDay(referenceDate: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(referenceDate);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Adaptador de leitura. A autoridade de status e escopo financeiro permanece
 * em financial-policy.ts; este módulo não cria ou altera lançamentos.
 */
export function toNotificationTransaction(event: NotificationEvent): LegacyTransaction {
  const isIncome = event.type === 'income' || event.type === 'redemption';
  const isBenefit = isBenefitFinancialEvent(event);
  const posted = isPostedFinancialStatus(event.status);
  const amount = Math.abs(Number(event.amount));
  return {
    date: event.date.toISOString().slice(0, 10),
    description: event.description,
    type: isIncome ? 'income' : 'expense',
    status: posted ? 'paid' : 'pending',
    amount,
    incomeAmount: isIncome ? amount : 0,
    expenseAmount: isIncome ? 0 : amount,
    paymentMethod: event.paymentMethod?.name || '',
    modality: event.paymentMethod?.type?.toLowerCase() === 'credit' ? 'CREDITO' : '',
    financialScope: isBenefit ? 'benefit' : 'monetary',
  };
}

/** O dono do workspace é a autoridade dos eventos para todos os seus membros. */
export async function loadCanonicalNotificationTransactions(userId: string): Promise<LegacyTransaction[]> {
  const context = await resolveWorkspaceContext(userId);
  const events = await prisma.financialEvent.findMany({
    where: {
      userId: context.workspace.ownerId,
      archivedAt: null,
      type: 'expense',
      status: 'planned',
    },
    select: {
      date: true, description: true, type: true, status: true, amount: true,
      account: { select: { type: true } },
      paymentMethod: { select: { name: true, type: true } },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });
  return events.filter(isMonetaryFinancialEvent).map(toNotificationTransaction);
}

/**
 * Números da comunicação vêm dos mesmos serviços do núcleo financeiro.
 * pendingAmount é o total aberto apurado sobre eventos canônicos (inclui
 * pendências vencidas de competências anteriores).
 */
export async function loadCanonicalNotificationOverview(
  userId: string,
  referenceDate = new Date(),
  pendingAmount?: number,
): Promise<CanonicalNotificationOverview> {
  const context = await resolveWorkspaceContext(userId);
  const ownerId = context.workspace.ownerId;
  const day = saoPauloDay(referenceDate);
  const month = day.slice(0, 7);
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const [summary, monetaryAvailable, benefitBalance, benefitEvents] = await Promise.all([
    getCanonicalFinancialSummary(ownerId, month),
    monetaryBalanceAt(prisma, ownerId, day),
    benefitBalanceAt(prisma, ownerId, day),
    prisma.financialEvent.findMany({
      where: { userId: ownerId, archivedAt: null, date: { gte: start, lt: end } },
      select: {
        type: true, status: true, signedAmount: true, description: true,
        account: { select: { type: true } },
        paymentMethod: { select: { name: true } },
      },
    }),
  ]);
  let benefitIncome = 0;
  let benefitExpense = 0;
  for (const event of benefitEvents) {
    if (!isBenefitFinancialEvent(event) || !isPostedFinancialStatus(event.status)) continue;
    if (event.type === 'income' || event.type === 'redemption') benefitIncome += Number(event.signedAmount);
    else if (event.type === 'expense') benefitExpense -= Number(event.signedAmount);
  }
  const monetaryPendingExpense = round(pendingAmount ?? summary.pendingAmount);
  return {
    monetaryOpening: summary.availableBalance,
    monetaryIncome: summary.realizedIncome,
    monetaryPaidExpense: summary.realizedExpense,
    monetaryPendingExpense,
    monetaryAvailable,
    projectedClosing: round(monetaryAvailable - monetaryPendingExpense),
    benefitBalance,
    benefitIncome: round(benefitIncome),
    benefitExpense: round(benefitExpense),
  };
}
