import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { recordFinancialAudit } from '../finance/audit';
import { serializableFinancialTransaction } from '../finance/monetary-protection';
import { resolveWorkspaceContext } from '../workspaces/service';

type Tx = Prisma.TransactionClient;

export class CustomerMutationError extends Error {
  constructor(public code: string, public details?: Record<string, unknown>) {
    super(code);
  }
}

type CustomerMutationMeta = {
  operationId?: string;
  expectedUpdatedAt?: string;
};

export type CustomerCreateInput = CustomerMutationMeta & {
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  notes?: string | null;
};

export type CustomerUpdateInput = CustomerMutationMeta & {
  name?: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

function replay<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');
}

function normalized(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('pt-BR');
}

function clean(value?: string | null) {
  const result = String(value ?? '').trim();
  return result || null;
}

function assertFresh(updatedAt: Date, expectedUpdatedAt?: string) {
  if (!expectedUpdatedAt) return;
  const expected = new Date(expectedUpdatedAt);
  if (Number.isNaN(expected.getTime()) || expected.getTime() !== updatedAt.getTime()) {
    throw new CustomerMutationError('CUSTOMER_STALE_VERSION', { currentUpdatedAt: updatedAt.toISOString() });
  }
}

async function assertAvailable(tx: Tx, userId: string, input: {
  name: string;
  email?: string | null;
  document?: string | null;
}, excludeId?: string) {
  const customers = await tx.customer.findMany({
    where: { userId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, name: true, email: true, document: true },
  });
  const document = normalized(input.document);
  const email = normalized(input.email);
  const name = normalized(input.name);
  const duplicate = customers.find((item) => {
    if (document && normalized(item.document) === document) return true;
    if (email && normalized(item.email) === email) return true;
    return Boolean(name && email && normalized(item.name) === name && normalized(item.email) === email);
  });
  if (duplicate) throw new CustomerMutationError('CUSTOMER_ALREADY_EXISTS', { id: duplicate.id });
}

async function runCustomerMutation<T, I extends CustomerMutationMeta>(
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
          if (previous.requestHash !== requestHash) throw new CustomerMutationError('OPERATION_ID_REUSED');
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
        if (previous.requestHash !== requestHash) throw new CustomerMutationError('OPERATION_ID_REUSED');
        return replay<T>(previous.response);
      }
    }
    throw error;
  }
}

export async function createCustomerProtected(actorId: string, input: CustomerCreateInput) {
  return runCustomerMutation(actorId, input, 'CUSTOMER_CREATE', async (tx, context) => {
    await assertAvailable(tx, context.dataOwnerId, input);
    const result = await tx.customer.create({
      data: {
        userId: context.dataOwnerId,
        name: input.name.trim(),
        email: clean(input.email),
        phone: clean(input.phone),
        document: clean(input.document),
        notes: clean(input.notes),
      },
    });
    await recordFinancialAudit(tx, {
      actorId,
      entity: 'Customer',
      entityId: result.id,
      action: 'CUSTOMER_CREATED',
      before: null,
      after: result,
      context: { workspaceId: context.workspaceId, operationId: input.operationId ?? null },
    });
    return result;
  });
}

export async function updateCustomerProtected(actorId: string, id: string, input: CustomerUpdateInput) {
  return runCustomerMutation(actorId, { ...input, id }, 'CUSTOMER_UPDATE', async (tx, context) => {
    const current = await tx.customer.findFirst({ where: { id, userId: context.dataOwnerId } });
    if (!current) throw new CustomerMutationError('CUSTOMER_NOT_FOUND');
    assertFresh(current.updatedAt, input.expectedUpdatedAt);

    const candidate = {
      name: input.name?.trim() ?? current.name,
      email: input.email !== undefined ? clean(input.email) : current.email,
      document: input.document !== undefined ? clean(input.document) : current.document,
    };
    await assertAvailable(tx, context.dataOwnerId, candidate, id);

    const result = await tx.customer.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.email !== undefined ? { email: clean(input.email) } : {}),
        ...(input.phone !== undefined ? { phone: clean(input.phone) } : {}),
        ...(input.document !== undefined ? { document: clean(input.document) } : {}),
        ...(input.notes !== undefined ? { notes: clean(input.notes) } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    const action = current.isActive !== result.isActive
      ? result.isActive ? 'CUSTOMER_REACTIVATED' : 'CUSTOMER_DEACTIVATED'
      : 'CUSTOMER_UPDATED';

    await recordFinancialAudit(tx, {
      actorId,
      entity: 'Customer',
      entityId: id,
      action,
      before: current,
      after: result,
      context: { workspaceId: context.workspaceId, operationId: input.operationId ?? null },
    });
    return result;
  });
}
