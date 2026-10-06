import { Prisma } from '@meg/database';
import { recordFinancialAudit } from './audit';
import { financialAmountValues } from './amount-sign';
import { isMonetaryAccountType } from './financial-policy';

type Tx = Prisma.TransactionClient;

export const OPENING_BALANCE_EVENT_PREFIX = 'opening-balance:';

export function openingBalanceEventId(accountId: string) {
  return `${OPENING_BALANCE_EVENT_PREFIX}${accountId}`;
}

function supportedOpeningBalanceAccount(type: unknown) {
  return isMonetaryAccountType(type) || String(type ?? '').trim().toLowerCase() === 'benefit';
}

function cents(value: unknown) {
  return Math.round(Number(value || 0) * 100);
}

export async function syncOpeningBalanceEvent(tx: Tx, input: {
  actorId: string;
  workspaceId: string;
  userId: string;
  account: {
    id: string;
    name: string;
    type: string;
    createdAt: Date;
  };
  openingBalance: number;
}) {
  if (!supportedOpeningBalanceAccount(input.account.type)) {
    return { event: null, supported: false };
  }

  const legacyTransactionId = openingBalanceEventId(input.account.id);
  const existing = await tx.financialEvent.findFirst({
    where: { workspaceId: input.workspaceId, userId: input.userId, legacyTransactionId },
    include: { ledgerEntries: true },
  });
  const balanceCents = cents(input.openingBalance);

  if (balanceCents === 0) {
    if (!existing || existing.archivedAt) return { event: existing, supported: true };
    await tx.ledgerEntry.deleteMany({ where: { eventId: existing.id } });
    const archived = await tx.financialEvent.update({
      where: { id: existing.id },
      data: { status: 'archived', archivedAt: new Date() },
      include: { ledgerEntries: true },
    });
    await recordFinancialAudit(tx, {
      actorId: input.actorId,
      entity: 'FinancialEvent',
      entityId: archived.id,
      action: 'FINANCIAL_EVENT_ARCHIVED',
      before: existing,
      after: archived,
      context: { systemGenerated: 'OPENING_BALANCE', accountId: input.account.id },
    });
    return { event: archived, supported: true };
  }

  const amount = Math.abs(balanceCents) / 100;
  const type = balanceCents > 0 ? 'income' : 'expense';
  const values = financialAmountValues(type, amount);
  const eventDate = existing?.date || input.account.createdAt;
  const eventData = {
    userId: input.userId,
    workspaceId: input.workspaceId,
    legacyTransactionId,
    description: `SALDO INICIAL - ${input.account.name}`,
    type,
    status: 'paid',
    date: eventDate,
    competence: eventDate.toISOString().slice(0, 7),
    amount: values.amount,
    signedAmount: values.signedAmount,
    accountId: input.account.id,
    sourcePayload: {
      systemGenerated: 'OPENING_BALANCE',
      accountId: input.account.id,
    } as Prisma.InputJsonValue,
    archivedAt: null,
  };

  const event = existing
    ? await tx.financialEvent.update({
        where: { id: existing.id },
        data: eventData,
        include: { ledgerEntries: true },
      })
    : await tx.financialEvent.create({
        data: eventData,
        include: { ledgerEntries: true },
      });

  await tx.ledgerEntry.deleteMany({ where: { eventId: event.id } });
  const ledger = await tx.ledgerEntry.create({
    data: {
      eventId: event.id,
      date: event.date,
      accountId: input.account.id,
      debit: Number(event.signedAmount) >= 0 ? Number(event.amount) : 0,
      credit: Number(event.signedAmount) < 0 ? Number(event.amount) : 0,
      memo: event.description,
    },
  });

  await recordFinancialAudit(tx, {
    actorId: input.actorId,
    entity: 'FinancialEvent',
    entityId: event.id,
    action: existing ? 'FINANCIAL_EVENT_UPDATED' : 'FINANCIAL_EVENT_CREATED',
    before: existing,
    after: { ...event, ledgerEntries: [ledger] },
    context: { systemGenerated: 'OPENING_BALANCE', accountId: input.account.id },
  });

  return { event: { ...event, ledgerEntries: [ledger] }, supported: true };
}

export async function openingBalanceFallbackForAccount(tx: Tx, userId: string, account: {
  id: string;
  openingBalance: Prisma.Decimal | number | string;
}) {
  const supersedingEvent = await tx.financialEvent.findFirst({
    where: { userId, legacyTransactionId: openingBalanceEventId(account.id) },
    select: { id: true },
  });
  return supersedingEvent ? 0 : Math.round(Number(account.openingBalance || 0) * 100) / 100;
}

export async function legacyOpeningBalanceFallbackTotal(tx: Tx, userId: string, accountTypes: string[]) {
  const accounts = await tx.account.findMany({
    where: { userId, type: { in: accountTypes } },
    select: { id: true, openingBalance: true },
  });
  if (!accounts.length) return 0;

  const ids = accounts.map((account) => openingBalanceEventId(account.id));
  const superseding = await tx.financialEvent.findMany({
    where: { userId, legacyTransactionId: { in: ids } },
    select: { legacyTransactionId: true },
  });
  const superseded = new Set(superseding.map((event) => String(event.legacyTransactionId || '')));
  const balance = accounts
    .filter((account) => !superseded.has(openingBalanceEventId(account.id)))
    .reduce((sum, account) => sum + Number(account.openingBalance || 0), 0);
  return Math.round(balance * 100) / 100;
}
