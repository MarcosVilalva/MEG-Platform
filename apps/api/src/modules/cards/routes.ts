import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {cardPurchaseStatementMonth} from './purchase-cycle-canonical';
import {cardInstallmentRemaining} from '../finance/card-statement-canonical';
import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { recordFinancialAudit } from '../finance/audit';
import { serializableFinancialTransaction } from '../finance/monetary-protection';
import { resolveWorkspaceContext } from '../workspaces/service';
import { CardDomainError, createCardPurchaseProtected, enforceCardCreditLimitIncrease, listCards, payCardStatementProtected } from './service';
import { cardLimitPolicyRows, effectiveCardLimitMode, putCardLimitMode } from './card-limit-policy';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;
const monetaryAccountTypes = new Set(['CHECKING', 'SAVINGS', 'CASH', 'INVESTMENT']);

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const operationSchema = z.string().trim().min(8).max(180);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'INVALID_DATE');
const cardSchema = z.object({
  name: z.string().trim().min(2).max(80),
  issuer: z.string().trim().max(80).optional().nullable(),
  brand: z.string().trim().max(40).optional().nullable(),
  lastFour: z.string().regex(/^\d{4}$/).optional().nullable(),
  creditLimit: z.coerce.number().positive().finite(),
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
});
const purchaseSchema = z.object({
  cardId: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  description: z.string().trim().min(2).max(160),
  totalAmount: z.coerce.number().positive().finite(),
  purchaseDate: isoDateSchema,
  installments: z.coerce.number().int().min(1).max(48).default(1)
});
const purchaseCreateSchema = purchaseSchema.extend({ operationId: operationSchema.optional(), allowDuplicate: z.boolean().optional() });
const purchaseLimitSchema = purchaseCreateSchema.extend({ allowOverLimit: z.boolean().optional() });
const limitPolicyBodySchema = z.object({ mode: z.enum(['BLOCK', 'CONFIRM']), operationId: operationSchema }).strict();
const cardPolicyBodySchema = z.object({ mode: z.enum(['BLOCK', 'CONFIRM']).nullable(), operationId: operationSchema }).strict();
const purchaseUpdateSchema = z.object({
  cardId: z.string().min(1).optional(),
  categoryId: z.string().optional().nullable(),
  description: z.string().trim().min(2).max(160).optional(),
  purchaseDate: isoDateSchema.optional(),
  operationId: operationSchema,
  allowOverLimit: z.boolean().optional(),
}).refine((value) => value.cardId !== undefined
  || value.categoryId !== undefined
  || value.description !== undefined
  || value.purchaseDate !== undefined, {
  message: 'Informe ao menos uma alteração da compra.',
});
const installmentUpdateSchema = z.object({
  amount: z.coerce.number().positive().finite().optional(),
  statementMonth: monthSchema.optional(),
  operationId: operationSchema,
  allowOverLimit: z.boolean().optional(),
}).refine((value) => value.amount !== undefined || value.statementMonth !== undefined, {
  message: 'Informe valor e/ou competência da parcela.',
});
const purchaseCancelSchema = z.object({ operationId: operationSchema.optional() }).optional();
const statementPaymentSchema = z.object({
  accountId: z.string().trim().min(1),
  paymentMethodId: z.string().trim().min(1).optional().nullable(),
  paidAt: isoDateSchema,
  amount: z.coerce.number().positive().finite().optional(),
  operationId: operationSchema,
});

type Tx = Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;
type LegacyCard = {
  paymentMethod?: unknown; issuer?: unknown; productName?: unknown; brand?: unknown;
  lastFour?: unknown; theme?: unknown; closingDay?: unknown; dueDay?: unknown;
  limit?: unknown; isActive?: unknown;
};
type LegacyTransaction = Record<string, unknown>;

type CardMutationContext = {
  ownerId: string;
  workspaceId: string;
  legacy: ReturnType<typeof legacyState>;
};

class CardMutationError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, public readonly details?: unknown) {
    super(code);
  }
}

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function mutationError(reply: FastifyReply, error: unknown) {
  if (error instanceof CardDomainError) return domainError(reply, error);
  if (error instanceof CardMutationError) {
    return reply.code(error.statusCode).send({ error: error.code, details: error.details });
  }
  throw error;
}

function domainError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof CardDomainError)) throw error;
  const status = error.code === 'CARD_NOT_FOUND' ? 404
    : ['OPERATION_ID_REUSED', 'POSSIBLE_DUPLICATE', 'STATEMENT_CHANGED_RETRY', 'INSUFFICIENT_MONETARY_BALANCE', 'ACCOUNT_BALANCE_WINDOW_TOO_LARGE', 'CARD_LIMIT_EXCEEDED', 'CARD_LIMIT_CONFIRMATION_REQUIRED'].includes(error.code) ? 409
      : 400;
  return reply.code(status).send({ error: error.code, ...(error.details || {}) });
}

function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function key(value: unknown) { return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); }
function legacyState(value: unknown) {
  const state = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const catalogs = state.catalogs && typeof state.catalogs === 'object' ? state.catalogs as Record<string, unknown> : {};
  return {
    cards: Array.isArray(catalogs.cards) ? catalogs.cards as LegacyCard[] : [],
    transactions: Array.isArray(state.transactions) ? state.transactions as LegacyTransaction[] : []
  };
}

async function sharedCardContext(userId: string): Promise<CardMutationContext> {
  const context = await resolveWorkspaceContext(userId);
  const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { state: true } });
  return {
    ownerId: context.workspace.ownerId,
    workspaceId: context.workspaceId,
    legacy: legacyState(saved?.state),
  };
}

async function migrateLegacyCards(ownerId: string, cards: LegacyCard[]) {
  const current = await prisma.creditCard.findMany({ where: { userId: ownerId }, select: { name: true } });
  const existing = new Set(current.map((card) => key(card.name)));
  const valid = cards.filter((card) => card.isActive !== false && text(card.paymentMethod) && number(card.closingDay) >= 1 && number(card.dueDay) >= 1);
  for (const card of valid) {
    const name = text(card.productName) || text(card.paymentMethod);
    if (existing.has(key(name)) || existing.has(key(card.paymentMethod))) continue;
    await prisma.creditCard.create({ data: {
      userId: ownerId, name, issuer: text(card.issuer) || null, brand: text(card.brand) || null,
      lastFour: text(card.lastFour).replace(/\D/g, '').slice(-4) || null,
      creditLimit: Math.max(0, number(card.limit)), closingDay: Math.min(31, number(card.closingDay)),
      dueDay: Math.min(31, number(card.dueDay)), color: '#88796c'
    } });
    existing.add(key(name));
  }
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
  mutationType: string;
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
      mutationType: input.mutationType,
      revision: state?.revision || 0,
      response: input.response,
    }),
  });
}

async function protectedCardMutation(input: {
  context: CardMutationContext;
  operationId: string;
  requestHash: string;
  mutationType: string;
  work: (tx: Tx) => Promise<JsonRecord>;
}): Promise<JsonRecord> {
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
        if (previous.requestHash !== input.requestHash) {
          throw new CardMutationError(409, 'OPERATION_ID_REUSED');
        }
        return replayResponse(previous.response);
      }

      const response = await input.work(tx);
      const protectedResponse: JsonRecord = { ...response, idempotentReplay: false };
      await createMutationReceipt(tx, {
        workspaceId: input.context.workspaceId,
        operationId: input.operationId,
        requestHash: input.requestHash,
        mutationType: input.mutationType,
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
        if (previous.requestHash !== input.requestHash) throw new CardMutationError(409, 'OPERATION_ID_REUSED');
        return replayResponse(previous.response);
      }
    }
    throw error;
  }
}

async function assertCardAndCategory(tx: Tx, ownerId: string, cardId: string, categoryId?: string | null) {
  const card = await tx.creditCard.findFirst({ where: { id: cardId, userId: ownerId, isActive: true } });
  if (!card) throw new CardMutationError(400, 'INVALID_CARD');
  if (categoryId) {
    const category = await tx.category.findFirst({
      where: {
        id: categoryId,
        isActive: true,
        OR: [{ userId: ownerId }, { userId: null }],
      },
    });
    if (!category) throw new CardMutationError(400, 'INVALID_CATEGORY');
  }
  return card;
}

async function editablePurchase(tx: Tx, ownerId: string, id: string) {
  const purchase = await tx.cardPurchase.findFirst({
    where: { id, userId: ownerId, status: 'active' },
    include: { entries: true, category: true, card: true },
  });
  if (!purchase) throw new CardMutationError(404, 'PURCHASE_NOT_FOUND');
  const lockedEntries = purchase.entries.filter((entry) => entry.status === 'paid' || Number(entry.partialPaidAmount || 0) > 0);
  if (lockedEntries.length) {
    throw new CardMutationError(409, 'CARD_PURCHASE_PAYMENT_EXISTS', {
      installments: lockedEntries.map((entry) => ({
        number: entry.number,
        status: entry.status,
        partialPaidAmount: Number(entry.partialPaidAmount || 0),
      })),
    });
  }
  return purchase;
}

export async function cardRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return listCards(request.user.sub, parsed.data.month);
  });

  app.post('/', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = cardSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { ownerId } = await sharedCardContext(request.user.sub);
    return reply.code(201).send(await prisma.creditCard.create({ data: { userId: ownerId, ...parsed.data } }));
  });

  // Preferencia global do workspace; ausencia de registro significa BLOCK.
  app.get('/limit-control', { preHandler: app.authorize([...readRoles]) }, async (request) => {
    const context = await resolveWorkspaceContext(request.user.sub, { allowLegacyBootstrap: false });
    const [rows, cards] = await Promise.all([
      cardLimitPolicyRows(prisma, context.workspaceId),
      prisma.creditCard.findMany({ where: { userId: context.workspace.ownerId, isActive: true }, select: { id: true } }),
    ]);
    const globalMode = effectiveCardLimitMode(rows, '');
    return {
      globalMode,
      cards: cards.map((card) => ({
        id: card.id,
        overrideMode: rows.find((row) => row.scopeKey === 'CARD:' + card.id)?.mode ?? null,
        effectiveMode: effectiveCardLimitMode(rows, card.id),
      })),
    };
  });

  app.patch('/limit-control', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const body = limitPolicyBodySchema.safeParse(request.body);
    if (!body.success) return validationError(reply, body.error.flatten());
    const context = await resolveWorkspaceContext(request.user.sub, { allowLegacyBootstrap: false });
    if (!['ADMIN', 'MANAGER'].includes(context.membership.role)) return reply.code(403).send({ error: 'WORKSPACE_WRITE_ROLE_REQUIRED' });
    try {
      const result = await protectedCardMutation({
        context: { workspaceId: context.workspaceId, ownerId: context.workspace.ownerId, legacy: legacyState(null) },
        operationId: body.data.operationId,
        requestHash: mutationRequestHash({ action: 'card-limit-global', mode: body.data.mode }),
        mutationType: 'CARD_LIMIT_POLICY_UPDATE',
        work: async (tx) => {
          const before = await cardLimitPolicyRows(tx, context.workspaceId);
          await putCardLimitMode(tx, context.workspaceId, 'GLOBAL', body.data.mode, randomUUID());
          await recordFinancialAudit(tx, {
            actorId: request.user.sub, entity: 'Workspace', entityId: context.workspaceId,
            action: 'CARD_LIMIT_POLICY_UPDATED', before: { mode: effectiveCardLimitMode(before, '') },
            after: { mode: body.data.mode },
            context: { scope: 'GLOBAL', workspaceId: context.workspaceId, operationId: body.data.operationId },
          });
          return { globalMode: body.data.mode };
        },
      });
      return reply.send(result);
    } catch (error) {
      return mutationError(reply, error);
    }
  });

  app.patch('/:id/limit-control', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = cardPolicyBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return validationError(reply, {
      params: params.success ? null : params.error.flatten(), body: body.success ? null : body.error.flatten(),
    });
    const context = await resolveWorkspaceContext(request.user.sub, { allowLegacyBootstrap: false });
    if (!['ADMIN', 'MANAGER'].includes(context.membership.role)) return reply.code(403).send({ error: 'WORKSPACE_WRITE_ROLE_REQUIRED' });
    const card = await prisma.creditCard.findFirst({
      where: { id: params.data.id, userId: context.workspace.ownerId, isActive: true }, select: { id: true },
    });
    if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    try {
      const result = await protectedCardMutation({
        context: { workspaceId: context.workspaceId, ownerId: context.workspace.ownerId, legacy: legacyState(null) },
        operationId: body.data.operationId,
        requestHash: mutationRequestHash({ action: 'card-limit-card', cardId: card.id, mode: body.data.mode }),
        mutationType: 'CARD_LIMIT_POLICY_UPDATE',
        work: async (tx) => {
          const before = await cardLimitPolicyRows(tx, context.workspaceId, card.id);
          await putCardLimitMode(tx, context.workspaceId, 'CARD:' + card.id, body.data.mode, randomUUID());
          const after = await cardLimitPolicyRows(tx, context.workspaceId, card.id);
          await recordFinancialAudit(tx, {
            actorId: request.user.sub, entity: 'CreditCard', entityId: card.id,
            action: 'CARD_LIMIT_POLICY_UPDATED',
            before: { effectiveMode: effectiveCardLimitMode(before, card.id) },
            after: { effectiveMode: effectiveCardLimitMode(after, card.id), overrideMode: body.data.mode },
            context: { scope: 'CARD', workspaceId: context.workspaceId, operationId: body.data.operationId },
          });
          return { cardId: card.id, overrideMode: body.data.mode, effectiveMode: effectiveCardLimitMode(after, card.id) };
        },
      });
      return reply.send(result);
    } catch (error) {
      return mutationError(reply, error);
    }
  });

  app.patch('/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = cardSchema.partial().safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const { ownerId } = await sharedCardContext(request.user.sub);
    const card = await prisma.creditCard.findFirst({ where: { id, userId: ownerId } });
    if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    return prisma.creditCard.update({ where: { id }, data: parsed.data });
  });

  app.delete('/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { ownerId } = await sharedCardContext(request.user.sub);
    const card = await prisma.creditCard.findFirst({ where: { id, userId: ownerId } });
    if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    return prisma.creditCard.update({ where: { id }, data: { isActive: false } });
  });

  app.post('/purchases', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = purchaseLimitSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      const purchase = await createCardPurchaseProtected(request.user.sub, parsed.data);
      return reply.code(201).send(purchase);
    } catch (error) {
      return domainError(reply, error);
    }
  });

  app.patch('/purchases/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = purchaseUpdateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const context = await sharedCardContext(request.user.sub);
    const { operationId, allowOverLimit, ...purchaseInput } = parsed.data;
    const requestHash = mutationRequestHash({ id, purchase: purchaseInput, allowOverLimit });

    try {
      const response = await protectedCardMutation({
        context,
        operationId,
        requestHash,
        mutationType: 'CARD_PURCHASE_UPDATE',
        work: async (tx): Promise<JsonRecord> => {
          const before = await editablePurchase(tx, context.ownerId, id);
          const targetCardId = purchaseInput.cardId ?? before.cardId;
          const targetCategoryId = purchaseInput.categoryId !== undefined ? purchaseInput.categoryId : before.categoryId;
          const card = await assertCardAndCategory(tx, context.ownerId, targetCardId, targetCategoryId);
          const nextPurchaseDate = purchaseInput.purchaseDate ?? before.purchaseDate.toISOString().slice(0, 10);
          const shouldRecalculateStatementMonths = targetCardId !== before.cardId
            || nextPurchaseDate !== before.purchaseDate.toISOString().slice(0, 10);
          let overLimitException: Record<string, unknown> | null = null;
          if (targetCardId !== before.cardId) {
            const movedCents = before.entries.reduce(
              (sum, entry) => sum + Math.round(cardInstallmentRemaining(entry) * 100), 0,
            );
            const guard = await enforceCardCreditLimitIncrease(
              tx, context, card, movedCents, allowOverLimit === true,
            );
            if (guard.decision.confirmedException) {
              overLimitException = { excessCents: guard.decision.excessCents, mode: guard.mode };
            }
          }

          await tx.cardPurchase.update({
            where: { id },
            data: {
              ...(purchaseInput.cardId !== undefined ? { cardId: card.id } : {}),
              ...(purchaseInput.categoryId !== undefined ? { categoryId: purchaseInput.categoryId } : {}),
              ...(purchaseInput.description !== undefined ? { description: purchaseInput.description } : {}),
              ...(purchaseInput.purchaseDate !== undefined ? { purchaseDate: new Date(purchaseInput.purchaseDate) } : {}),
            },
          });

          if (shouldRecalculateStatementMonths) {
            for (const entry of before.entries) {
              await tx.cardInstallment.update({
                where: { id: entry.id },
                data: { statementMonth: cardPurchaseStatementMonth(nextPurchaseDate, card.closingDay, entry.number) },
              });
            }
          }

          const after = await tx.cardPurchase.findUnique({
            where: { id },
            include: { entries: true, category: true, card: true },
          });
          if (!after) throw new CardMutationError(404, 'PURCHASE_NOT_FOUND');

          await recordFinancialAudit(tx, {
            actorId: request.user.sub,
            entity: 'CardPurchase',
            entityId: id,
            action: 'CARD_PURCHASE_UPDATED',
            before,
            after,
            context: {
              workspaceId: context.workspaceId,
              operationId,
              recalculatedInstallments: false,
              recalculatedStatementMonths: shouldRecalculateStatementMonths,
              preservedInstallmentIds: before.entries.map((entry) => entry.id),
              previousCardId: before.cardId,
              cardId: after.cardId,
              overLimitException,
            },
          });
          return { purchase: after };
        },
      });
      return reply.send({ ...(response.purchase as object), idempotentReplay: Boolean(response.idempotentReplay) });
    } catch (error) {
      return mutationError(reply, error);
    }
  });

  app.patch('/installments/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = installmentUpdateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const context = await sharedCardContext(request.user.sub);
    const { operationId, allowOverLimit, ...changes } = parsed.data;
    const requestHash = mutationRequestHash({ id, installment: changes, allowOverLimit });

    try {
      const response = await protectedCardMutation({
        context,
        operationId,
        requestHash,
        mutationType: 'CARD_INSTALLMENT_UPDATE',
        work: async (tx): Promise<JsonRecord> => {
          const before = await tx.cardInstallment.findFirst({
            where: {
              id,
              purchase: { userId: context.ownerId, status: 'active' },
            },
            include: { purchase: { include: { card: true, category: true } } },
          });
          if (!before) throw new CardMutationError(404, 'CARD_INSTALLMENT_NOT_FOUND');
          if (before.status !== 'open') {
            throw new CardMutationError(409, 'CARD_INSTALLMENT_ALREADY_PAID', { installmentId: id, status: before.status });
          }
          if (Number(before.partialPaidAmount || 0) > 0) {
            throw new CardMutationError(409, 'CARD_INSTALLMENT_PARTIALLY_PAID', {
              installmentId: id,
              partialPaidAmount: Number(before.partialPaidAmount),
            });
          }

          let overLimitException: Record<string, unknown> | null = null;
          if (changes.amount !== undefined) {
            const increaseCents = Math.round(Number(changes.amount) * 100)
              - Math.round(cardInstallmentRemaining(before) * 100);
            if (increaseCents > 0) {
              const guard = await enforceCardCreditLimitIncrease(
                tx, context, before.purchase.card, increaseCents, allowOverLimit === true,
              );
              if (guard.decision.confirmedException) {
                overLimitException = { excessCents: guard.decision.excessCents, mode: guard.mode };
              }
            }
          }

          const after = await tx.cardInstallment.update({
            where: { id },
            data: {
              ...(changes.amount !== undefined ? { amount: changes.amount } : {}),
              ...(changes.statementMonth !== undefined ? { statementMonth: changes.statementMonth } : {}),
            },
          });

          const entries = await tx.cardInstallment.findMany({
            where: { purchaseId: before.purchaseId },
            orderBy: { number: 'asc' },
          });
          const totalAmount = Math.round(entries.reduce((sum, entry) => sum + Number(entry.amount), 0) * 100) / 100;
          const purchase = await tx.cardPurchase.update({
            where: { id: before.purchaseId },
            data: { totalAmount },
            include: { entries: true, category: true, card: true },
          });

          await recordFinancialAudit(tx, {
            actorId: request.user.sub,
            entity: 'CardPurchase',
            entityId: before.purchaseId,
            action: 'CARD_PURCHASE_UPDATED',
            before: { purchase: before.purchase, installment: before },
            after: { purchase, installment: after },
            context: {
              workspaceId: context.workspaceId,
              operationId,
              singleInstallmentEdit: true,
              installmentId: id,
              preservedInstallmentIds: entries.filter((entry) => entry.id !== id).map((entry) => entry.id),
              reconciledPurchaseTotal: totalAmount,
              overLimitException,
            },
          });

          return { installment: after, purchase };
        },
      });
      return reply.send({
        ...(response.installment as object),
        purchase: response.purchase,
        idempotentReplay: Boolean(response.idempotentReplay),
      });
    } catch (error) {
      return mutationError(reply, error);
    }
  });

  app.delete('/purchases/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const parsed = purchaseCancelSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const context = await sharedCardContext(request.user.sub);
    const operationId = parsed.data?.operationId || `card-cancel:${id}:${Date.now()}`;
    const requestHash = mutationRequestHash({ id, cancel: true });

    try {
      const response = await protectedCardMutation({
        context,
        operationId,
        requestHash,
        mutationType: 'CARD_PURCHASE_CANCEL',
        work: async (tx): Promise<JsonRecord> => {
          const before = await editablePurchase(tx, context.ownerId, id);
          const after = await tx.cardPurchase.update({
            where: { id },
            data: {
              status: 'cancelled',
              entries: {
                updateMany: {
                  where: { status: 'open' },
                  data: { status: 'cancelled' },
                },
              },
            },
            include: { entries: true, category: true, card: true },
          });
          await recordFinancialAudit(tx, {
            actorId: request.user.sub,
            entity: 'CardPurchase',
            entityId: id,
            action: 'CARD_PURCHASE_CANCELLED',
            before,
            after,
            context: { workspaceId: context.workspaceId, operationId },
          });
          return { purchase: after, cancelled: true };
        },
      });
      return reply.send({ ...(response.purchase as object), cancelled: true, idempotentReplay: Boolean(response.idempotentReplay) });
    } catch (error) {
      return mutationError(reply, error);
    }
  });

  app.post('/:id/statements/:month/pay', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const params = z.object({ id: z.string().min(1), month: monthSchema }).safeParse(request.params);
    const body = statementPaymentSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return validationError(reply, {
        params: params.success ? null : params.error.flatten(),
        body: body.success ? null : body.error.flatten(),
      });
    }
    try {
      const result = await payCardStatementProtected(request.user.sub, params.data.id, params.data.month, body.data);
      return reply.code(201).send(result);
    } catch (error) {
      return domainError(reply, error);
    }
  });
}
