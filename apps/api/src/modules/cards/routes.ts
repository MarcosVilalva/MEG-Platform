import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { recordFinancialAudit } from '../finance/audit';
import { serializableFinancialTransaction } from '../finance/monetary-protection';
import { resolveWorkspaceContext } from '../workspaces/service';
import { listCards } from './service';

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
  purchaseDate: z.string().min(10),
  installments: z.coerce.number().int().min(1).max(48).default(1)
});
const purchaseCreateSchema = purchaseSchema.extend({ operationId: operationSchema.optional() });
const purchaseUpdateSchema = purchaseSchema.extend({ operationId: operationSchema });
const purchaseCancelSchema = z.object({ operationId: operationSchema.optional() }).optional();
const statementPaymentSchema = z.object({
  accountId: z.string().trim().min(1),
  paymentMethodId: z.string().trim().min(1).optional().nullable(),
  paidAt: isoDateSchema,
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
  if (error instanceof CardMutationError) {
    return reply.code(error.statusCode).send({ error: error.code, details: error.details });
  }
  throw error;
}

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
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

function installmentRows(input: {
  purchaseDate: string;
  totalAmount: number;
  installments: number;
  closingDay: number;
}) {
  const purchaseDate = new Date(input.purchaseDate);
  const purchaseMonth = input.purchaseDate.slice(0, 7);
  const firstMonth = addMonths(purchaseMonth, purchaseDate.getUTCDate() > input.closingDay ? 1 : 0);
  const totalCents = Math.round(input.totalAmount * 100);
  const baseCents = Math.floor(totalCents / input.installments);
  const remainder = totalCents - baseCents * input.installments;
  return Array.from({ length: input.installments }, (_, index) => ({
    number: index + 1,
    amount: (baseCents + (index < remainder ? 1 : 0)) / 100,
    statementMonth: addMonths(firstMonth, index),
  }));
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
  const paidEntries = purchase.entries.filter((entry) => entry.status === 'paid');
  if (paidEntries.length) {
    throw new CardMutationError(409, 'CARD_PURCHASE_ALREADY_PAID', {
      paidInstallments: paidEntries.map((entry) => entry.number),
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
    const parsed = purchaseCreateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const context = await sharedCardContext(request.user.sub);
    const { operationId, ...purchaseInput } = parsed.data;

    const create = async (tx: Tx): Promise<JsonRecord> => {
      const card = await assertCardAndCategory(tx, context.ownerId, purchaseInput.cardId, purchaseInput.categoryId);
      const purchase = await tx.cardPurchase.create({
        data: {
          userId: context.ownerId,
          cardId: card.id,
          categoryId: purchaseInput.categoryId,
          description: purchaseInput.description,
          totalAmount: purchaseInput.totalAmount,
          purchaseDate: new Date(purchaseInput.purchaseDate),
          installments: purchaseInput.installments,
          entries: {
            create: installmentRows({
              purchaseDate: purchaseInput.purchaseDate,
              totalAmount: purchaseInput.totalAmount,
              installments: purchaseInput.installments,
              closingDay: card.closingDay,
            })
          }
        },
        include: { entries: true, category: true }
      });
      await recordFinancialAudit(tx, {
        actorId: request.user.sub,
        entity: 'CardPurchase',
        entityId: purchase.id,
        action: 'CARD_PURCHASE_CREATED',
        after: purchase,
        context: { workspaceId: context.workspaceId, operationId: operationId || null, cardId: card.id },
      });
      return { purchase };
    };

    try {
      if (operationId) {
        const response = await protectedCardMutation({
          context,
          operationId,
          requestHash: mutationRequestHash(purchaseInput),
          mutationType: 'CARD_PURCHASE_CREATE',
          work: create,
        });
        return reply.code(201).send({ ...(response.purchase as object), idempotentReplay: Boolean(response.idempotentReplay) });
      }
      const response = await serializableFinancialTransaction(create);
      return reply.code(201).send(response.purchase);
    } catch (error) {
      return mutationError(reply, error);
    }
  });

  app.patch('/purchases/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = purchaseUpdateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    const context = await sharedCardContext(request.user.sub);
    const { operationId, ...purchaseInput } = parsed.data;
    const requestHash = mutationRequestHash({ id, purchase: purchaseInput });

    try {
      const response = await protectedCardMutation({
        context,
        operationId,
        requestHash,
        mutationType: 'CARD_PURCHASE_UPDATE',
        work: async (tx): Promise<JsonRecord> => {
          const before = await editablePurchase(tx, context.ownerId, id);
          const card = await assertCardAndCategory(tx, context.ownerId, purchaseInput.cardId, purchaseInput.categoryId);
          const after = await tx.cardPurchase.update({
            where: { id },
            data: {
              cardId: card.id,
              categoryId: purchaseInput.categoryId,
              description: purchaseInput.description,
              totalAmount: purchaseInput.totalAmount,
              purchaseDate: new Date(purchaseInput.purchaseDate),
              installments: purchaseInput.installments,
              entries: {
                deleteMany: {},
                create: installmentRows({
                  purchaseDate: purchaseInput.purchaseDate,
                  totalAmount: purchaseInput.totalAmount,
                  installments: purchaseInput.installments,
                  closingDay: card.closingDay,
                }),
              },
            },
            include: { entries: true, category: true, card: true },
          });
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
              recalculatedInstallments: true,
              previousCardId: before.cardId,
              cardId: after.cardId,
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

    const context = await sharedCardContext(request.user.sub);
    const { operationId, ...payment } = body.data;
    const requestHash = mutationRequestHash({ cardId: params.data.id, month: params.data.month, ...payment });

    try {
      const response = await protectedCardMutation({
        context,
        operationId,
        requestHash,
        mutationType: 'CARD_STATEMENT_PAY',
        work: async (tx): Promise<JsonRecord> => {
          const card = await tx.creditCard.findFirst({
            where: { id: params.data.id, userId: context.ownerId },
            select: { id: true, name: true, isActive: true },
          });
          if (!card) throw new CardMutationError(404, 'CARD_NOT_FOUND');

          const account = await tx.account.findFirst({
            where: { id: payment.accountId, userId: context.ownerId, isActive: true },
            select: { id: true, name: true, type: true, institution: true },
          });
          if (!account) throw new CardMutationError(400, 'INVALID_ACCOUNT');
          if (!monetaryAccountTypes.has(key(account.type))) {
            throw new CardMutationError(400, 'ACCOUNT_NOT_MONETARY', { accountId: account.id, accountType: account.type });
          }

          const paymentMethod = payment.paymentMethodId
            ? await tx.paymentMethod.findFirst({
              where: { id: payment.paymentMethodId, userId: context.ownerId, isActive: true },
              select: { id: true, name: true, type: true },
            })
            : null;
          if (payment.paymentMethodId && !paymentMethod) throw new CardMutationError(400, 'INVALID_PAYMENT_METHOD');
          if (paymentMethod && key(paymentMethod.type) === 'CREDIT') {
            throw new CardMutationError(400, 'INVALID_PAYMENT_METHOD', {
              paymentMethodId: paymentMethod.id,
              reason: 'CREDIT_METHOD_NOT_ALLOWED_FOR_STATEMENT_PAYMENT',
            });
          }

          const entries = await tx.cardInstallment.findMany({
            where: {
              purchase: { cardId: card.id, userId: context.ownerId, status: 'active' },
              statementMonth: params.data.month,
              status: 'open',
            },
            orderBy: { number: 'asc' },
          });
          if (!entries.length) throw new CardMutationError(400, 'EMPTY_STATEMENT');

          const amount = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
          const paidAt = new Date(`${payment.paidAt}T12:00:00.000Z`);
          const updated = await tx.cardInstallment.updateMany({
            where: { id: { in: entries.map((entry) => entry.id) }, status: 'open' },
            data: { status: 'paid', paidAt },
          });
          if (updated.count !== entries.length) {
            throw new CardMutationError(409, 'STATEMENT_CHANGED_RETRY', {
              expectedInstallments: entries.length,
              updatedInstallments: updated.count,
            });
          }

          const event = await tx.financialEvent.create({
            data: {
              userId: context.ownerId,
              workspaceId: context.workspaceId,
              description: `Fatura ${card.name} ${params.data.month}`,
              type: 'expense',
              status: 'paid',
              date: paidAt,
              competence: payment.paidAt.slice(0, 7),
              amount,
              signedAmount: -amount,
              accountId: account.id,
              paymentMethodId: paymentMethod?.id,
            },
          });

          await tx.ledgerEntry.create({
            data: {
              eventId: event.id,
              date: paidAt,
              accountId: account.id,
              debit: 0,
              credit: amount,
              memo: event.description,
            },
          });

          await recordFinancialAudit(tx, {
            actorId: request.user.sub,
            entity: 'CreditCard',
            entityId: card.id,
            action: 'CARD_STATEMENT_PAID',
            after: {
              amount,
              eventId: event.id,
              month: params.data.month,
              paidAt: payment.paidAt,
              card: { id: card.id, name: card.name },
              account,
              paymentMethod,
              installmentIds: entries.map((entry) => entry.id),
            },
            context: {
              workspaceId: context.workspaceId,
              operationId,
              cardId: card.id,
              month: params.data.month,
            },
          });

          return { paid: true, amount, eventId: event.id };
        },
      });
      return reply.send(response);
    } catch (error) {
      return mutationError(reply, error);
    }
  });
}
