import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from '../app-state/mutation-receipt';
import { recordFinancialAudit } from '../finance/audit';
import { serializableFinancialTransaction } from '../finance/monetary-protection';
import { resolveWorkspaceContext } from '../workspaces/service';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const operationSchema = z.string().trim().min(8).max(180);
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
    const shared = await sharedCardContext(request.user.sub);
    await migrateLegacyCards(shared.ownerId, shared.legacy.cards);
    const cards = await prisma.creditCard.findMany({
      where: { userId: shared.ownerId, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        purchases: {
          where: { status: 'active' },
          include: { entries: true, category: true },
          orderBy: { purchaseDate: 'desc' }
        }
      }
    });
    return cards.map((card) => {
      const entries = card.purchases.flatMap((purchase) => purchase.entries);
      const aliases = new Set([key(card.name), ...shared.legacy.cards.filter((item) => key(item.productName) === key(card.name) || key(item.paymentMethod) === key(card.name)).map((item) => key(item.paymentMethod))]);
      const legacyPurchases = shared.legacy.transactions.filter((item) => {
        const method = key(item.paymentMethod || item.account);
        const modality = key(item.modality);
        return aliases.has(method) && key(item.type) === 'EXPENSE' && (!modality || modality === 'CREDITO');
      }).map((item) => {
        const amount = Math.abs(number(item.expenseAmount || item.amount || item.signedAmount));
        const purchaseDate = text(item.purchaseDate || item.date);
        const status = key(item.status || item.situation);
        return { id: `legacy-${text(item.id)}`, description: text(item.description) || 'Compra no cartão', totalAmount: amount, purchaseDate, installments: number(item.installments || item.installmentQty) || 1, status: 'legacy', category: null, entries: [], legacyOpen: !['PAID', 'PAGO', 'RECEIVED', 'RECEBIDO', 'RECONCILED', 'CONCILIADO'].includes(status) };
      });
      const legacyOpen = legacyPurchases.filter((item) => item.legacyOpen);
      const usedLimit = entries.filter((entry) => entry.status === 'open').reduce((sum, entry) => sum + Number(entry.amount), 0) + legacyOpen.reduce((sum, item) => sum + item.totalAmount, 0);
      const payableStatementAmount = entries.filter((entry) => entry.statementMonth === parsed.data.month && entry.status === 'open').reduce((sum, entry) => sum + Number(entry.amount), 0);
      const statementAmount = payableStatementAmount + legacyOpen.filter((item) => item.purchaseDate.startsWith(parsed.data.month)).reduce((sum, item) => sum + item.totalAmount, 0);
      const periodLegacy = legacyPurchases.filter((item) => item.purchaseDate.startsWith(parsed.data.month));
      return { ...card, purchases: [...card.purchases, ...periodLegacy].sort((a, b) => String(b.purchaseDate).localeCompare(String(a.purchaseDate))), usedLimit, availableLimit: Number(card.creditLimit) - usedLimit, statementAmount, payableStatementAmount };
    });
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
    const params = z.object({ id: z.string(), month: monthSchema }).safeParse(request.params);
    const body = z.object({ accountId: z.string().optional().nullable(), paymentMethodId: z.string().optional().nullable(), paidAt: z.string().min(10) }).safeParse(request.body);
    if (!params.success || !body.success) return validationError(reply, { params: params.success ? null : params.error.flatten(), body: body.success ? null : body.error.flatten() });
    const context = await sharedCardContext(request.user.sub);
    const card = await prisma.creditCard.findFirst({ where: { id: params.data.id, userId: context.ownerId } });
    if (!card) return reply.code(404).send({ error: 'CARD_NOT_FOUND' });
    const entries = await prisma.cardInstallment.findMany({ where: { purchase: { cardId: card.id, userId: context.ownerId, status: 'active' }, statementMonth: params.data.month, status: 'open' } });
    if (!entries.length) return reply.code(400).send({ error: 'EMPTY_STATEMENT' });
    const amount = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    return prisma.$transaction(async (tx) => {
      await tx.cardInstallment.updateMany({ where: { id: { in: entries.map((entry) => entry.id) } }, data: { status: 'paid', paidAt: new Date(body.data.paidAt) } });
      const event = await tx.financialEvent.create({ data: {
        userId: context.ownerId,
        description: `Fatura ${card.name} ${params.data.month}`,
        type: 'expense', status: 'paid', date: new Date(body.data.paidAt), competence: body.data.paidAt.slice(0, 7),
        amount, signedAmount: -amount, accountId: body.data.accountId, paymentMethodId: body.data.paymentMethodId
      } });
      await recordFinancialAudit(tx, {
        actorId: request.user.sub,
        entity: 'CreditCard',
        entityId: card.id,
        action: 'CARD_STATEMENT_PAID',
        after: { amount, eventId: event.id, month: params.data.month },
        context: { workspaceId: context.workspaceId },
      });
      return { paid: true, amount, eventId: event.id };
    });
  });
}
