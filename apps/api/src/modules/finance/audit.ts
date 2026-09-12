import { Prisma, prisma } from '@meg/database';
import { resolveWorkspaceContext } from '../workspaces/service';

type Tx = Prisma.TransactionClient;

const FINANCIAL_ENTITIES = [
  'FinancialEvent',
  'FinancialTransfer',
  'Payable',
  'RecurringExpense',
  'CreditCard',
  'CardPurchase',
  'Receivable',
  'Receipt',
] as const;

export type FinancialAuditAction =
  | 'FINANCIAL_EVENT_CREATED'
  | 'FINANCIAL_EVENT_UPDATED'
  | 'FINANCIAL_EVENT_ARCHIVED'
  | 'FINANCIAL_TRANSFER_CREATED'
  | 'PAYABLE_CREATED'
  | 'PAYABLE_PAYMENT_CREATED'
  | 'RECURRING_EXPENSE_CREATED'
  | 'CARD_PURCHASE_CREATED'
  | 'CARD_PURCHASE_CANCELLED'
  | 'CARD_STATEMENT_PAID'
  | 'RECEIVABLE_CREATED'
  | 'RECEIVABLE_RECEIVED';

function jsonValue(value: unknown) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as unknown;
}

export function financialAuditMetadata(input: {
  before?: unknown;
  after?: unknown;
  context?: Record<string, unknown>;
}) {
  return JSON.stringify({
    schemaVersion: 1,
    before: jsonValue(input.before),
    after: jsonValue(input.after),
    context: jsonValue(input.context || {}),
  });
}

export async function recordFinancialAudit(tx: Tx, input: {
  actorId: string;
  entity: typeof FINANCIAL_ENTITIES[number];
  entityId: string;
  action: FinancialAuditAction;
  before?: unknown;
  after?: unknown;
  context?: Record<string, unknown>;
}) {
  return tx.auditLog.create({
    data: {
      userId: input.actorId,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      metadata: financialAuditMetadata({ before: input.before, after: input.after, context: input.context }),
    },
  });
}

function parseMetadata(value: string | null) {
  if (!value) return { schemaVersion: 1, before: null, after: null, context: {} };
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return {
      schemaVersion: Number(parsed.schemaVersion || 1),
      before: parsed.before ?? null,
      after: parsed.after ?? null,
      context: parsed.context && typeof parsed.context === 'object' ? parsed.context : {},
    };
  } catch {
    return { schemaVersion: 0, before: null, after: null, context: { legacyMetadata: value } };
  }
}

export async function listFinancialAudit(actorId: string, input: {
  page: number;
  pageSize: number;
  action?: string;
  entity?: string;
}) {
  const workspace = await resolveWorkspaceContext(actorId);
  // Histórico é imutável: ações de um membro que depois foi bloqueado/inativado
  // continuam pertencendo ao histórico financeiro do workspace.
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.workspaceId },
    select: { userId: true },
  });
  const memberIds = members.map((item) => item.userId);
  const allowedEntities = input.entity && FINANCIAL_ENTITIES.includes(input.entity as typeof FINANCIAL_ENTITIES[number])
    ? [input.entity]
    : [...FINANCIAL_ENTITIES];
  const where = {
    userId: { in: memberIds },
    entity: { in: allowedEntities },
    ...(input.action ? { action: input.action } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    items: items.map((item) => ({
      id: item.id,
      at: item.createdAt,
      actor: item.user,
      entity: item.entity,
      entityId: item.entityId,
      action: item.action,
      ...parseMetadata(item.metadata),
    })),
    total,
    page: input.page,
    pageSize: input.pageSize,
  };
}
