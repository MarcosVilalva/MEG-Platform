import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { resolveWorkspaceContext } from '../workspaces/service';
import { recordFinancialAudit, type FinancialAuditAction } from './audit';
import { serializableFinancialTransaction } from './monetary-protection';

type Tx = Prisma.TransactionClient;
type CatalogEntity = 'Account' | 'Category' | 'PaymentMethod';

export class CatalogMutationError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

type MutationMeta = {
  operationId?: string;
  expectedUpdatedAt?: string;
};

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');
}

function replay<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleUpperCase('pt-BR');
}

function sameDecimal(left: unknown, right: unknown) {
  return Math.round(Number(left) * 100) === Math.round(Number(right) * 100);
}

async function runCatalogMutation<T, I extends MutationMeta>(
  actorId: string,
  input: I,
  mutationType: string,
  work: (tx: Tx, context: { workspaceId: string; dataOwnerId: string }) => Promise<T>,
) {
  const workspace = await resolveWorkspaceContext(actorId);
  const context = { workspaceId: workspace.workspaceId, dataOwnerId: workspace.workspace.ownerId };
  const requestHash = input.operationId
    ? mutationRequestHash({ ...input, operationId: undefined })
    : null;

  try {
    return await serializableFinancialTransaction(async (tx) => {
      if (input.operationId && requestHash) {
        const previous = await tx.cloudMutationReceipt.findUnique({
          where: { workspaceId_operationId: { workspaceId: context.workspaceId, operationId: input.operationId } },
        });
        if (previous) {
          if (previous.requestHash !== requestHash) throw new CatalogMutationError('OPERATION_ID_REUSED');
          return replay<T>(previous.response);
        }
      }

      const result = await work(tx, context);
      if (input.operationId && requestHash) {
        const state = await tx.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { revision: true } });
        await tx.cloudMutationReceipt.create({
          data: receiptCreateData({
            workspaceId: context.workspaceId,
            operationId: input.operationId,
            requestHash,
            mutationType,
            revision: state?.revision || 0,
            response: result,
          }),
        });
      }
      return result;
    });
  } catch (error) {
    if (input.operationId && requestHash && isUniqueConflict(error)) {
      const previous = await prisma.cloudMutationReceipt.findUnique({
        where: { workspaceId_operationId: { workspaceId: context.workspaceId, operationId: input.operationId } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new CatalogMutationError('OPERATION_ID_REUSED');
        return replay<T>(previous.response);
      }
    }
    throw error;
  }
}

function assertFresh(updatedAt: Date, expectedUpdatedAt?: string) {
  if (!expectedUpdatedAt) return;
  const expected = new Date(expectedUpdatedAt);
  if (Number.isNaN(expected.getTime()) || updatedAt.getTime() !== expected.getTime()) {
    throw new CatalogMutationError('CATALOG_STALE_VERSION', { currentUpdatedAt: updatedAt.toISOString() });
  }
}

async function audit(tx: Tx, input: {
  actorId: string;
  entity: CatalogEntity;
  entityId: string;
  action: FinancialAuditAction;
  before?: unknown;
  after?: unknown;
  context: Record<string, unknown>;
}) {
  await recordFinancialAudit(tx, input);
}

export type AccountCatalogCreate = MutationMeta & {
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'investment' | 'credit' | 'benefit';
  institution?: string | null;
  openingBalance: number;
  isActive?: boolean;
};

export type AccountCatalogUpdate = MutationMeta & {
  name?: string;
  institution?: string | null;
  isActive?: boolean;
};

export async function createAccountCatalog(actorId: string, input: AccountCatalogCreate) {
  return runCatalogMutation(actorId, input, 'ACCOUNT_CREATE', async (tx, context) => {
    const name = input.name.trim();
    const duplicate = await tx.account.findFirst({
      where: { userId: context.dataOwnerId, name: { equals: name, mode: 'insensitive' } },
    });
    if (duplicate) throw new CatalogMutationError('ACCOUNT_ALREADY_EXISTS');
    const result = await tx.account.create({
      data: {
        userId: context.dataOwnerId,
        name,
        type: input.type,
        institution: input.institution?.trim() || null,
        openingBalance: input.openingBalance,
        isActive: input.isActive ?? true,
      },
    });
    await audit(tx, {
      actorId,
      entity: 'Account',
      entityId: result.id,
      action: 'ACCOUNT_CREATED',
      before: null,
      after: result,
      context: { workspaceId: context.workspaceId, operationId: input.operationId ?? null },
    });
    return result;
  });
}

export async function updateAccountCatalog(actorId: string, id: string, input: AccountCatalogUpdate) {
  return runCatalogMutation(actorId, { ...input, id }, 'ACCOUNT_UPDATE', async (tx, context) => {
    const current = await tx.account.findFirst({ where: { id, userId: context.dataOwnerId } });
    if (!current) throw new CatalogMutationError('ACCOUNT_NOT_FOUND');
    assertFresh(current.updatedAt, input.expectedUpdatedAt);
    if (input.name) {
      const name = input.name.trim();
      const duplicate = await tx.account.findFirst({
        where: { userId: context.dataOwnerId, id: { not: id }, name: { equals: name, mode: 'insensitive' } },
      });
      if (duplicate) throw new CatalogMutationError('ACCOUNT_ALREADY_EXISTS');
    }
    const result = await tx.account.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.institution !== undefined ? { institution: input.institution?.trim() || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    const action: FinancialAuditAction = current.isActive !== result.isActive
      ? result.isActive ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DEACTIVATED'
      : 'ACCOUNT_UPDATED';
    await audit(tx, {
      actorId, entity: 'Account', entityId: id, action, before: current, after: result,
      context: { workspaceId: context.workspaceId, operationId: input.operationId ?? null },
    });
    return result;
  });
}

export type CategoryCatalogCreate = MutationMeta & {
  name: string;
  group?: string | null;
  type?: 'income' | 'expense' | null;
  isActive?: boolean;
};
export type CategoryCatalogUpdate = MutationMeta & {
  name?: string;
  group?: string | null;
  isActive?: boolean;
};

async function duplicateCategory(tx: Tx, dataOwnerId: string, input: { name: string; group?: string | null; type?: string | null }, excludeId?: string) {
  const candidates = await tx.category.findMany({
    where: { userId: dataOwnerId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, name: true, group: true, type: true },
  });
  const key = [normalize(input.group), normalize(input.name), normalize(input.type)].join('|');
  return candidates.find((item) => [normalize(item.group), normalize(item.name), normalize(item.type)].join('|') === key) || null;
}

export async function createCategoryCatalog(actorId: string, input: CategoryCatalogCreate) {
  return runCatalogMutation(actorId, input, 'CATEGORY_CREATE', async (tx, context) => {
    if (await duplicateCategory(tx, context.dataOwnerId, input)) throw new CatalogMutationError('CATEGORY_ALREADY_EXISTS');
    const result = await tx.category.create({
      data: {
        userId: context.dataOwnerId,
        name: input.name.trim(),
        group: input.group?.trim() || null,
        type: input.type ?? null,
        isActive: input.isActive ?? true,
      },
    });
    await audit(tx, {
      actorId, entity: 'Category', entityId: result.id, action: 'CATEGORY_CREATED', before: null, after: result,
      context: { workspaceId: context.workspaceId, operationId: input.operationId ?? null },
    });
    return result;
  });
}

export async function updateCategoryCatalog(actorId: string, id: string, input: CategoryCatalogUpdate) {
  return runCatalogMutation(actorId, { ...input, id }, 'CATEGORY_UPDATE', async (tx, context) => {
    const current = await tx.category.findFirst({ where: { id, userId: context.dataOwnerId } });
    if (!current) throw new CatalogMutationError('CATEGORY_NOT_FOUND');
    assertFresh(current.updatedAt, input.expectedUpdatedAt);
    const candidate = {
      name: input.name?.trim() ?? current.name,
      group: input.group !== undefined ? input.group?.trim() || null : current.group,
      type: current.type,
    };
    if (await duplicateCategory(tx, context.dataOwnerId, candidate, id)) throw new CatalogMutationError('CATEGORY_ALREADY_EXISTS');
    const result = await tx.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.group !== undefined ? { group: input.group?.trim() || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    const action: FinancialAuditAction = current.isActive !== result.isActive
      ? result.isActive ? 'CATEGORY_REACTIVATED' : 'CATEGORY_DEACTIVATED'
      : 'CATEGORY_UPDATED';
    await audit(tx, {
      actorId, entity: 'Category', entityId: id, action, before: current, after: result,
      context: { workspaceId: context.workspaceId, operationId: input.operationId ?? null },
    });
    return result;
  });
}

export type PaymentMethodCatalogCreate = MutationMeta & {
  name: string;
  type?: 'instant' | 'bill' | 'credit' | 'debit' | 'transfer' | 'cash' | 'other' | null;
  isActive?: boolean;
};
export type PaymentMethodCatalogUpdate = MutationMeta & {
  name?: string;
  isActive?: boolean;
};

async function assertPaymentMethodNameAvailable(tx: Tx, dataOwnerId: string, name: string, excludeId?: string) {
  const duplicate = await tx.paymentMethod.findFirst({
    where: {
      userId: dataOwnerId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      name: { equals: name.trim(), mode: 'insensitive' },
    },
  });
  if (duplicate) throw new CatalogMutationError('PAYMENT_METHOD_ALREADY_EXISTS');
}

export async function createPaymentMethodCatalog(actorId: string, input: PaymentMethodCatalogCreate) {
  return runCatalogMutation(actorId, input, 'PAYMENT_METHOD_CREATE', async (tx, context) => {
    await assertPaymentMethodNameAvailable(tx, context.dataOwnerId, input.name);
    const result = await tx.paymentMethod.create({
      data: {
        userId: context.dataOwnerId,
        name: input.name.trim(),
        type: input.type ?? null,
        isActive: input.isActive ?? true,
      },
    });
    await audit(tx, {
      actorId, entity: 'PaymentMethod', entityId: result.id, action: 'PAYMENT_METHOD_CREATED', before: null, after: result,
      context: { workspaceId: context.workspaceId, operationId: input.operationId ?? null },
    });
    return result;
  });
}

export async function updatePaymentMethodCatalog(actorId: string, id: string, input: PaymentMethodCatalogUpdate) {
  return runCatalogMutation(actorId, { ...input, id }, 'PAYMENT_METHOD_UPDATE', async (tx, context) => {
    const current = await tx.paymentMethod.findFirst({ where: { id, userId: context.dataOwnerId } });
    if (!current) throw new CatalogMutationError('PAYMENT_METHOD_NOT_FOUND');
    assertFresh(current.updatedAt, input.expectedUpdatedAt);
    if (input.name) await assertPaymentMethodNameAvailable(tx, context.dataOwnerId, input.name, id);
    const result = await tx.paymentMethod.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    const action: FinancialAuditAction = current.isActive !== result.isActive
      ? result.isActive ? 'PAYMENT_METHOD_REACTIVATED' : 'PAYMENT_METHOD_DEACTIVATED'
      : 'PAYMENT_METHOD_UPDATED';
    await audit(tx, {
      actorId, entity: 'PaymentMethod', entityId: id, action, before: current, after: result,
      context: { workspaceId: context.workspaceId, operationId: input.operationId ?? null },
    });
    return result;
  });
}

// Exported only for tests/documentation of the structural lock: these fields are intentionally immutable after creation.
export const ACCOUNT_STRUCTURAL_FIELDS = ['type', 'openingBalance'] as const;
export const CATEGORY_STRUCTURAL_FIELDS = ['type'] as const;
export const PAYMENT_METHOD_STRUCTURAL_FIELDS = ['type'] as const;

export function accountStructureChanged(current: { type: string; openingBalance: unknown }, next: { type?: string; openingBalance?: unknown }) {
  return (next.type !== undefined && next.type !== current.type)
    || (next.openingBalance !== undefined && !sameDecimal(next.openingBalance, current.openingBalance));
}
