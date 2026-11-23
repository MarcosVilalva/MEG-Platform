import { Prisma } from '@meg/database';

export type CardLimitMode = 'BLOCK' | 'CONFIRM';
type PolicyRow = { scopeKey: string; mode: string };
type SqlClient = Pick<Prisma.TransactionClient, '$queryRawUnsafe' | '$executeRawUnsafe'>;

export function effectiveCardLimitMode(rows: readonly PolicyRow[], cardId: string): CardLimitMode {
  const cardMode = rows.find((row) => row.scopeKey === 'CARD:' + cardId)?.mode;
  if (cardMode === 'BLOCK' || cardMode === 'CONFIRM') return cardMode;
  const globalMode = rows.find((row) => row.scopeKey === 'GLOBAL')?.mode;
  return globalMode === 'CONFIRM' ? 'CONFIRM' : 'BLOCK';
}

export async function cardLimitPolicyRows(
  tx: Pick<SqlClient, '$queryRawUnsafe'>, workspaceId: string, cardId?: string,
): Promise<PolicyRow[]> {
  if (cardId) {
    return tx.$queryRawUnsafe<PolicyRow[]>(
      'SELECT "scopeKey", "mode" FROM "CardLimitControl" WHERE "workspaceId" = $1 AND "scopeKey" IN ($2, $3)',
      workspaceId, 'GLOBAL', 'CARD:' + cardId,
    );
  }
  return tx.$queryRawUnsafe<PolicyRow[]>(
    'SELECT "scopeKey", "mode" FROM "CardLimitControl" WHERE "workspaceId" = $1',
    workspaceId,
  );
}

export function cardLimitDecision(input: {
  creditLimitCents: number;
  committedCents: number;
  purchaseCents: number;
  mode: CardLimitMode;
  confirmedOverLimit: boolean;
}) {
  const { creditLimitCents, committedCents, purchaseCents } = input;
  if (![creditLimitCents, committedCents, purchaseCents].every(Number.isSafeInteger)
      || creditLimitCents < 0 || purchaseCents <= 0) {
    throw new Error('INVALID_CARD_LIMIT_AMOUNT');
  }
  const availableCents = creditLimitCents - committedCents;
  const excessCents = Math.max(0, purchaseCents - availableCents);
  if (!Number.isSafeInteger(availableCents) || !Number.isSafeInteger(excessCents)) {
    throw new Error('INVALID_CARD_LIMIT_AMOUNT');
  }
  return {
    availableCents,
    excessCents,
    afterCents: availableCents - purchaseCents,
    allowed: excessCents === 0 || (input.mode === 'CONFIRM' && input.confirmedOverLimit),
    requiresConfirmation: excessCents > 0 && input.mode === 'CONFIRM' && !input.confirmedOverLimit,
    confirmedException: excessCents > 0 && input.mode === 'CONFIRM' && input.confirmedOverLimit,
  };
}

export async function putCardLimitMode(
  tx: SqlClient, workspaceId: string, scopeKey: string, mode: CardLimitMode | null,
  id: string,
) {
  if (mode === null) {
    await tx.$executeRawUnsafe(
      'DELETE FROM "CardLimitControl" WHERE "workspaceId" = $1 AND "scopeKey" = $2',
      workspaceId, scopeKey,
    );
  } else {
    await tx.$executeRawUnsafe(
      'INSERT INTO "CardLimitControl" ("id", "workspaceId", "scopeKey", "mode", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW()) ON CONFLICT ("workspaceId", "scopeKey") DO UPDATE SET "mode" = EXCLUDED."mode", "updatedAt" = NOW()',
      id, workspaceId, scopeKey, mode,
    );
  }
}
