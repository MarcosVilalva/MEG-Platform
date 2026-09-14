import type { FastifyInstance, FastifyReply } from 'fastify';
import { Prisma, prisma } from '@meg/database';
import { z } from 'zod';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { recordFinancialAudit } from '../finance/audit';
import { serializableFinancialTransaction } from '../finance/monetary-protection';
import { resolveWorkspaceContext } from '../workspaces/service';

const adminRoles = ['ADMIN', 'MANAGER'] as const;
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const operationSchema = z.string().trim().min(8).max(180);
const reopenSchema = z.object({
  reason: z.string().trim().min(4).max(240),
  operationId: operationSchema,
});

type Tx = Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;
type ReopenContext = { ownerId: string; workspaceId: string };

class StatementReopenError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, public readonly details?: unknown) {
    super(code);
  }
}

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function mutationError(reply: FastifyReply, error: unknown) {
  if (error instanceof StatementReopenError) {
    return reply.code(error.statusCode).send({ error: error.code, details: error.details });
  }
  throw error;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cents(value: unknown) {
  return Math.round(number(value) * 100);
}

function parseAuditMetadata(value: string | null) {
  if (!value) return { before: {}, after: {}, context: {} };
  try {
    const parsed = record(JSON.parse(value));
    return {
      before: record(parsed.before),
      after: record(parsed.after),
      context: record(parsed.context),
    };
  } catch {
    throw new StatementReopenError(409, 'STATEMENT_PAYMENT_AUDIT_INVALID');
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function replayResponse(value: unknown): JsonRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as JsonRecord), idempotentReplay: true };
  }
  return { value, idempotentReplay: true };
}

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002');
}

async function createMutationReceipt(tx: Tx, input: {
  workspaceId: string;
  operationId: string;
  requestHash: string;
  response: unknown;
}) {
  const state = await tx.appState.findUnique({
    where: { workspaceId: input.workspaceId },
    select: { revision: true },
  });
  await tx.cloudMutationReceipt.create({
    data: receiptCreateData({
      workspaceId: input.workspaceId,
      operationId: input.operationId,
      requestHash: input.requestHash,
      mutationType: 'CARD_STATEMENT_REOPEN',
      revision: state?.revision || 0,
      response: input.response,
    }),
  });
}

async function protectedReopen(input: {
  context: ReopenContext;
  operationId: string;
  requestHash: string;
  work: (tx: Tx) => Promise<JsonRecord>;
}) {
  try {
    return await serializableFinancialTransaction<JsonRecord>(async (tx) => {
      const previous = await tx.cloudMutationReceipt.findUnique({
        where: {
          workspaceId_operationId: {
            workspaceId: input.context.workspaceId,
            operationId: input.operationId,
          },
        },
      });
      if (previous) {
        if (previous.requestHash !== input.requestHash) throw new StatementReopenError(409, 'OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }

      const response = await input.work(tx);
      const protectedResponse = { ...response, idempotentReplay: false };
      await createMutationReceipt(tx, {
        workspaceId: input.context.workspaceId,
        operationId: input.operationId,
        requestHash: input.requestHash,
        response: protectedResponse,
      });
      return protectedResponse;
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      const previous = await prisma.cloudMutationReceipt.findUnique({
        where: {
          workspaceId_operationId: {
            workspaceId: input.context.workspaceId,
            operationId: input.operationId,
          },
        },
      });
      if (previous) {
        if (previous.requestHash !== input.requestHash) throw new StatementReopenError(409, 'OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }
    }
    throw error;
  }
}

async function latestStatementLifecycleAudit(tx: Tx, cardId: string, month: string) {
  return tx.auditLog.findFirst({
    where: {
      entity: 'CreditCard',
      entityId: cardId,
      action: { in: ['CARD_STATEMENT_PAID', 'CARD_STATEMENT_REOPENED'] },
      metadata: { contains: `\"month\":\"${month}\"` },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function cardStatementReopenRoutes(app: FastifyInstance) {
  app.post('/:id/statements/:month/reopen', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const params = z.object({ id: z.string().min(1), month: monthSchema }).safeParse(request.params);
    const body = reopenSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return validationError(reply, {
        params: params.success ? null : params.error.flatten(),
        body: body.success ? null : body.error.flatten(),
      });
    }

    const workspace = await resolveWorkspaceContext(request.user.sub);
    const context: ReopenContext = {
      ownerId: workspace.workspace.ownerId,
      workspaceId: workspace.workspaceId,
    };
    const { operationId, reason } = body.data;
    const requestHash = mutationRequestHash({ cardId: params.data.id, month: params.data.month, reason });

    try {
      const response = await protectedReopen({
        context,
        operationId,
        requestHash,
        work: async (tx): Promise<JsonRecord> => {
          const card = await tx.creditCard.findFirst({
            where: { id: params.data.id, userId: context.ownerId },
            select: { id: true, name: true, isActive: true },
          });
          if (!card) throw new StatementReopenError(404, 'CARD_NOT_FOUND');
          if (!card.isActive) throw new StatementReopenError(409, 'CARD_INACTIVE');

          const lifecycleAudit = await latestStatementLifecycleAudit(tx, card.id, params.data.month);
          if (!lifecycleAudit) throw new StatementReopenError(404, 'STATEMENT_PAYMENT_NOT_FOUND');
          if (lifecycleAudit.action === 'CARD_STATEMENT_REOPENED') {
            throw new StatementReopenError(409, 'STATEMENT_ALREADY_REOPENED');
          }

          const audit = parseAuditMetadata(lifecycleAudit.metadata);
          const eventId = text(audit.after.eventId);
          if (!eventId) throw new StatementReopenError(409, 'STATEMENT_PAYMENT_AUDIT_INVALID');

          const event = await tx.financialEvent.findFirst({
            where: { id: eventId, userId: context.ownerId },
            include: { account: true, paymentMethod: true, ledgerEntries: true },
          });
          if (!event) throw new StatementReopenError(409, 'STATEMENT_PAYMENT_EVENT_MISSING');
          if (event.workspaceId && event.workspaceId !== context.workspaceId) {
            throw new StatementReopenError(409, 'STATEMENT_PAYMENT_EVENT_CHANGED');
          }
          if (event.archivedAt || event.status !== 'paid' || event.type !== 'expense' || cents(event.signedAmount) !== -cents(event.amount)) {
            throw new StatementReopenError(409, 'STATEMENT_PAYMENT_EVENT_CHANGED');
          }

          const auditedAmount = cents(audit.after.amount);
          if (auditedAmount && auditedAmount !== cents(event.amount)) {
            throw new StatementReopenError(409, 'STATEMENT_PAYMENT_EVENT_CHANGED');
          }

          const auditedInstallmentIds = stringArray(audit.after.installmentIds);
          const entries = auditedInstallmentIds.length
            ? await tx.cardInstallment.findMany({
              where: {
                id: { in: auditedInstallmentIds },
                purchase: { cardId: card.id, userId: context.ownerId, status: 'active' },
                statementMonth: params.data.month,
              },
              orderBy: { number: 'asc' },
            })
            : await tx.cardInstallment.findMany({
              where: {
                purchase: { cardId: card.id, userId: context.ownerId, status: 'active' },
                statementMonth: params.data.month,
                status: 'paid',
              },
              orderBy: { number: 'asc' },
            });

          if (!entries.length
            || (auditedInstallmentIds.length && entries.length !== auditedInstallmentIds.length)
            || entries.some((entry) => entry.status !== 'paid')) {
            throw new StatementReopenError(409, 'STATEMENT_REOPEN_CONFLICT');
          }

          const installmentAmount = entries.reduce((sum, entry) => sum + cents(entry.amount), 0);
          if (installmentAmount !== cents(event.amount)) {
            throw new StatementReopenError(409, 'STATEMENT_REOPEN_CONFLICT', {
              eventAmount: Number(event.amount),
              installmentAmount: installmentAmount / 100,
            });
          }

          if (event.ledgerEntries.length > 1) {
            throw new StatementReopenError(409, 'STATEMENT_PAYMENT_LEDGER_CHANGED');
          }
          const ledger = event.ledgerEntries[0];
          if (ledger && (
            ledger.accountId !== event.accountId
            || cents(ledger.credit) !== cents(event.amount)
            || cents(ledger.debit) !== 0
          )) {
            throw new StatementReopenError(409, 'STATEMENT_PAYMENT_LEDGER_CHANGED');
          }

          const reopened = await tx.cardInstallment.updateMany({
            where: { id: { in: entries.map((entry) => entry.id) }, status: 'paid' },
            data: { status: 'open', paidAt: null },
          });
          if (reopened.count !== entries.length) {
            throw new StatementReopenError(409, 'STATEMENT_CHANGED_RETRY', {
              expectedInstallments: entries.length,
              reopenedInstallments: reopened.count,
            });
          }

          if (ledger) await tx.ledgerEntry.delete({ where: { id: ledger.id } });
          const archivedEvent = await tx.financialEvent.update({
            where: { id: event.id },
            data: { status: 'archived', archivedAt: new Date() },
          });

          const installmentIds = entries.map((entry) => entry.id);
          const account = event.account ? {
            id: event.account.id,
            name: event.account.name,
            type: event.account.type,
            institution: event.account.institution,
          } : null;
          const paymentMethod = event.paymentMethod ? {
            id: event.paymentMethod.id,
            name: event.paymentMethod.name,
            type: event.paymentMethod.type,
          } : null;

          await recordFinancialAudit(tx, {
            actorId: request.user.sub,
            entity: 'CreditCard',
            entityId: card.id,
            action: 'CARD_STATEMENT_REOPENED',
            before: {
              amount: Number(event.amount),
              eventId: event.id,
              month: params.data.month,
              paidAt: text(audit.after.paidAt) || event.date.toISOString().slice(0, 10),
              card: { id: card.id, name: card.name },
              account,
              paymentMethod,
              installmentIds,
              financialEventStatus: event.status,
            },
            after: {
              amount: Number(event.amount),
              eventId: event.id,
              month: params.data.month,
              card: { id: card.id, name: card.name },
              account,
              paymentMethod,
              installmentIds,
              reopenedInstallments: reopened.count,
              financialEventStatus: archivedEvent.status,
              installmentStatus: 'open',
              reason,
            },
            context: {
              workspaceId: context.workspaceId,
              operationId,
              cardId: card.id,
              month: params.data.month,
              paymentAuditId: lifecycleAudit.id,
              source: 'card-statement-reopen',
            },
          });

          return {
            reopened: true,
            amount: Number(event.amount),
            eventId: event.id,
            installments: reopened.count,
          };
        },
      });

      return reply.send(response);
    } catch (error) {
      return mutationError(reply, error);
    }
  });
}
