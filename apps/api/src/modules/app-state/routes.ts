import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Prisma, prisma } from '@meg/database';
import { resolveWorkspaceContext } from '../workspaces/service';
import { assertWorkspaceWriteAccess } from '../platform-admin/service';
import { applyTransactionPatch } from './transaction-patch';
import { buildMutationConfirmation } from './mutation-confirmation';
import { findMutationReceipt, mutationRequestHash, recordMutationReceipt } from './mutation-receipt';

const MAX_TRANSACTION_PATCH_OPERATIONS = 2000;
const MAX_ACTIVITY_LOG_ITEMS = 500;

const transactionSchema = z.object({
  id: z.string().min(1), date: z.string().min(10), description: z.string().min(1),
  type: z.enum(['income', 'expense']), amount: z.coerce.number().finite()
}).passthrough();
const stateSchema = z.object({
  transactions: z.array(transactionSchema).max(20000),
  budgets: z.record(z.string(), z.coerce.number().nonnegative()).default({})
}).passthrough();
const putSchema = z.object({ state: stateSchema, expectedRevision: z.number().int().nonnegative().optional() });
const transactionPatchSchema = z.object({
  operationId: z.string().uuid().optional(),
  expectedRevision: z.number().int().nonnegative(),
  upserts: z.array(transactionSchema).max(MAX_TRANSACTION_PATCH_OPERATIONS).default([]),
  deletes: z.array(z.string().min(1)).max(MAX_TRANSACTION_PATCH_OPERATIONS).default([]),
  activities: z.array(z.unknown()).max(MAX_ACTIVITY_LOG_ITEMS).default([]),
  activityLog: z.array(z.unknown()).max(MAX_ACTIVITY_LOG_ITEMS).optional(),
}).superRefine((value, context) => {
  if (value.upserts.length + value.deletes.length > MAX_TRANSACTION_PATCH_OPERATIONS) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Muitas alterações em um único lote.' });
  }
  const upsertIds = new Set<string>();
  value.upserts.forEach((item, index) => {
    if (upsertIds.has(item.id)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'ID de lançamento duplicado.', path: ['upserts', index, 'id'] });
    }
    upsertIds.add(item.id);
  });
  const deleteIds = new Set<string>();
  value.deletes.forEach((id, index) => {
    if (deleteIds.has(id)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'ID de exclusão duplicado.', path: ['deletes', index] });
    }
    if (upsertIds.has(id)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'O mesmo lançamento não pode ser alterado e excluído.', path: ['deletes', index] });
    }
    deleteIds.add(id);
  });
});
const statePropertiesPatchSchema = z.object({
  operationId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
  properties: z.record(z.string(), z.unknown()),
}).superRefine((value, context) => {
  ['transactions', 'activityLog'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(value.properties, key)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `A propriedade ${key} possui protocolo próprio.`, path: ['properties', key] });
    }
  });
});

function activityMetadata(activityLog: unknown[] | undefined): Record<string, unknown> {
  return activityLog === undefined ? {} : { activityLog };
}

async function assertWriteAccess(workspaceId: string, reply: { status(code: number): { send(payload: unknown): unknown } }) {
  try {
    await assertWorkspaceWriteAccess(workspaceId);
    return true;
  } catch (error) {
    const code = error instanceof Error ? error.message : 'LICENSE_REQUIRED';
    reply.status(402).send({ error: code, readOnly: true });
    return false;
  }
}

export async function appStateRoutes(app: FastifyInstance) {
  app.get('/revision', { preHandler: app.authenticate }, async (request) => {
    const context = await resolveWorkspaceContext(request.user.sub);
    const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { revision: true, updatedAt: true } });
    return saved
      ? { revision: saved.revision, updatedAt: saved.updatedAt, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } }
      : { revision: 0, updatedAt: null, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } };
  });

  app.get('/', { preHandler: app.authenticate }, async (request) => {
    const context = await resolveWorkspaceContext(request.user.sub);
    const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId } });
    return saved
      ? { state: saved.state, revision: saved.revision, updatedAt: saved.updatedAt, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } }
      : { state: null, revision: 0, updatedAt: null, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } };
  });

  app.patch('/transactions', { preHandler: app.authorize(['ADMIN', 'MANAGER', 'OPERATOR']) }, async (request, reply) => {
    const parsed = transactionPatchSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_TRANSACTION_PATCH', details: parsed.error.flatten() });

    const context = await resolveWorkspaceContext(request.user.sub);
    if (!await assertWriteAccess(context.workspaceId, reply)) return;
    const operationId = parsed.data.operationId || randomUUID();
    const requestHash = mutationRequestHash(parsed.data);
    const previousReceipt = await findMutationReceipt(context.workspaceId, operationId, requestHash);
    if (previousReceipt?.conflict) {
      return reply.status(409).send({ error: 'OPERATION_ID_REUSED', operationId });
    }
    if (previousReceipt?.response) {
      return { ...(previousReceipt.response as Record<string, unknown>), replayed: true };
    }
    const confirm = async (response: Record<string, unknown>) => {
      await recordMutationReceipt({
        workspaceId: context.workspaceId,
        operationId,
        requestHash,
        mutationType: 'transactions',
        revision: Number(response.revision || 0),
        response,
      });
      return response;
    };
    const upsertIds = parsed.data.upserts.map((item) => item.id);
    const activityIds = parsed.data.activities
      .map((item) => typeof item === 'object' && item && typeof (item as { id?: unknown }).id === 'string' ? (item as { id: string }).id : '')
      .filter(Boolean);

    const current = await prisma.appState.findUnique({
      where: { workspaceId: context.workspaceId },
      select: { id: true, state: true, revision: true, updatedAt: true }
    });
    const hasActivityPatch = parsed.data.activityLog !== undefined || parsed.data.activities.length > 0;

    if (!current) {
      if (parsed.data.expectedRevision !== 0) {
        return reply.status(409).send({ error: 'STATE_CONFLICT', revision: 0, updatedAt: null });
      }
      if (parsed.data.upserts.length === 0 && parsed.data.deletes.length === 0 && !hasActivityPatch) {
        return confirm({
          revision: 0, updatedAt: null, changed: false,
          confirmation: buildMutationConfirmation({ transactions: [], activityLog: [] }, operationId, 0, upsertIds, parsed.data.deletes, activityIds),
          shared: true, workspace: { id: context.workspace.id, name: context.workspace.name }
        });
      }
      const initialState = stateSchema.safeParse(applyTransactionPatch(
        { transactions: [], budgets: {} },
        parsed.data.upserts,
        parsed.data.deletes,
        activityMetadata(parsed.data.activityLog),
        parsed.data.activities,
      ));
      if (!initialState.success) {
        return reply.status(400).send({ error: 'INVALID_APP_STATE_PATCH', details: initialState.error.flatten() });
      }
      try {
        const created = await prisma.appState.create({
          data: {
            userId: context.workspace.ownerId,
            workspaceId: context.workspaceId,
            state: initialState.data as Prisma.InputJsonValue,
            revision: 1,
          },
          select: { state: true, revision: true, updatedAt: true }
        });
        return confirm({
          revision: created.revision, updatedAt: created.updatedAt, changed: true,
          confirmation: buildMutationConfirmation(created.state, operationId, created.revision, upsertIds, parsed.data.deletes, activityIds),
          shared: true, workspace: { id: context.workspace.id, name: context.workspace.name }
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const latest = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { revision: true, updatedAt: true } });
          return reply.status(409).send({ error: 'STATE_CONFLICT', revision: latest?.revision || 0, updatedAt: latest?.updatedAt || null });
        }
        throw error;
      }
    }

    if (current.revision !== parsed.data.expectedRevision) {
      return reply.status(409).send({ error: 'STATE_CONFLICT', revision: current.revision, updatedAt: current.updatedAt });
    }
    if (parsed.data.upserts.length === 0 && parsed.data.deletes.length === 0 && !hasActivityPatch) {
      return confirm({
        revision: current.revision, updatedAt: current.updatedAt, changed: false,
        confirmation: buildMutationConfirmation(current.state, operationId, current.revision, upsertIds, parsed.data.deletes, activityIds),
        shared: true, workspace: { id: context.workspace.id, name: context.workspace.name }
      });
    }

    const nextState = stateSchema.safeParse(applyTransactionPatch(
      current.state,
      parsed.data.upserts,
      parsed.data.deletes,
      activityMetadata(parsed.data.activityLog),
      parsed.data.activities,
    ));
    if (!nextState.success) {
      return reply.status(400).send({ error: 'INVALID_APP_STATE_PATCH', details: nextState.error.flatten() });
    }

    const updated = await prisma.appState.updateMany({
      where: { id: current.id, revision: parsed.data.expectedRevision },
      data: { state: nextState.data as Prisma.InputJsonValue, revision: { increment: 1 } }
    });
    if (updated.count !== 1) {
      const latest = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { revision: true, updatedAt: true } });
      return reply.status(409).send({ error: 'STATE_CONFLICT', revision: latest?.revision || current.revision, updatedAt: latest?.updatedAt || current.updatedAt });
    }
    const saved = await prisma.appState.findUniqueOrThrow({
      where: { id: current.id },
      select: { state: true, revision: true, updatedAt: true }
    });
    return confirm({
      revision: saved.revision,
      updatedAt: saved.updatedAt,
      changed: true,
      upserted: parsed.data.upserts.length,
      deleted: parsed.data.deletes.length,
      activitiesMerged: parsed.data.activities.length,
      activityLogUpdated: hasActivityPatch,
      confirmation: buildMutationConfirmation(saved.state, operationId, saved.revision, upsertIds, parsed.data.deletes, activityIds),
      shared: true,
      workspace: { id: context.workspace.id, name: context.workspace.name }
    });
  });

  app.patch('/properties', { preHandler: app.authorize(['ADMIN', 'MANAGER', 'OPERATOR']) }, async (request, reply) => {
    const parsed = statePropertiesPatchSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_STATE_PROPERTIES_PATCH', details: parsed.error.flatten() });

    const context = await resolveWorkspaceContext(request.user.sub);
    if (!await assertWriteAccess(context.workspaceId, reply)) return;
    const requestHash = mutationRequestHash(parsed.data);
    const previousReceipt = await findMutationReceipt(context.workspaceId, parsed.data.operationId, requestHash);
    if (previousReceipt?.conflict) {
      return reply.status(409).send({ error: 'OPERATION_ID_REUSED', operationId: parsed.data.operationId });
    }
    if (previousReceipt?.response) {
      return { ...(previousReceipt.response as Record<string, unknown>), replayed: true };
    }
    const confirm = async (response: Record<string, unknown>) => {
      await recordMutationReceipt({
        workspaceId: context.workspaceId,
        operationId: parsed.data.operationId,
        requestHash,
        mutationType: 'state-properties',
        revision: Number(response.revision || 0),
        response,
      });
      return response;
    };
    const current = await prisma.appState.findUnique({
      where: { workspaceId: context.workspaceId },
      select: { id: true, state: true, revision: true, updatedAt: true }
    });
    const currentRevision = current?.revision || 0;
    if (currentRevision !== parsed.data.expectedRevision) {
      return reply.status(409).send({ error: 'STATE_CONFLICT', revision: currentRevision, updatedAt: current?.updatedAt || null });
    }

    const currentState = current?.state && typeof current.state === 'object' && !Array.isArray(current.state)
      ? current.state as Record<string, unknown>
      : { transactions: [], budgets: {} };
    const nextState = stateSchema.safeParse({ ...currentState, ...parsed.data.properties });
    if (!nextState.success) {
      return reply.status(400).send({ error: 'INVALID_APP_STATE_PROPERTIES', details: nextState.error.flatten() });
    }

    const changed = JSON.stringify(currentState) !== JSON.stringify(nextState.data);
    if (!changed) {
      return confirm({
        operationId: parsed.data.operationId,
        revision: currentRevision,
        updatedAt: current?.updatedAt || null,
        changed: false,
        propertyNames: Object.keys(parsed.data.properties),
        shared: true,
        workspace: { id: context.workspace.id, name: context.workspace.name }
      });
    }

    if (!current) {
      try {
        const created = await prisma.appState.create({
          data: {
            userId: context.workspace.ownerId,
            workspaceId: context.workspaceId,
            state: nextState.data as Prisma.InputJsonValue,
            revision: 1,
          },
          select: { revision: true, updatedAt: true }
        });
        return confirm({
          operationId: parsed.data.operationId,
          revision: created.revision,
          updatedAt: created.updatedAt,
          changed: true,
          propertyNames: Object.keys(parsed.data.properties),
          shared: true,
          workspace: { id: context.workspace.id, name: context.workspace.name }
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const latest = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { revision: true, updatedAt: true } });
          return reply.status(409).send({ error: 'STATE_CONFLICT', revision: latest?.revision || 0, updatedAt: latest?.updatedAt || null });
        }
        throw error;
      }
    }

    const updated = await prisma.appState.updateMany({
      where: { id: current.id, revision: parsed.data.expectedRevision },
      data: { state: nextState.data as Prisma.InputJsonValue, revision: { increment: 1 } }
    });
    if (updated.count !== 1) {
      const latest = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { revision: true, updatedAt: true } });
      return reply.status(409).send({ error: 'STATE_CONFLICT', revision: latest?.revision || currentRevision, updatedAt: latest?.updatedAt || current?.updatedAt || null });
    }
    const saved = await prisma.appState.findUniqueOrThrow({ where: { id: current.id }, select: { revision: true, updatedAt: true } });
    return confirm({
      operationId: parsed.data.operationId,
      revision: saved.revision,
      updatedAt: saved.updatedAt,
      changed: true,
      propertyNames: Object.keys(parsed.data.properties),
      shared: true,
      workspace: { id: context.workspace.id, name: context.workspace.name }
    });
  });

  app.put('/', { preHandler: app.authorize(['ADMIN', 'MANAGER', 'OPERATOR']) }, async (request, reply) => {
    const parsed = putSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_APP_STATE', details: parsed.error.flatten() });

    const context = await resolveWorkspaceContext(request.user.sub);
    if (!await assertWriteAccess(context.workspaceId, reply)) return;
    const current = await prisma.appState.findUnique({
      where: { workspaceId: context.workspaceId },
      select: { id: true, revision: true, updatedAt: true }
    });
    if (current && parsed.data.expectedRevision !== undefined && current.revision !== parsed.data.expectedRevision) {
      return reply.status(409).send({ error: 'STATE_CONFLICT', revision: current.revision, updatedAt: current.updatedAt });
    }

    const jsonState = parsed.data.state as Prisma.InputJsonValue;
    const saved = current
      ? await prisma.appState.update({
          where: { id: current.id },
          data: { state: jsonState, revision: { increment: 1 } },
          select: { revision: true, updatedAt: true }
        })
      : await prisma.appState.create({
          data: { userId: context.workspace.ownerId, workspaceId: context.workspaceId, state: jsonState, revision: 1 },
          select: { revision: true, updatedAt: true }
        });
    return { revision: saved.revision, updatedAt: saved.updatedAt, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } };
  });
}
