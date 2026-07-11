import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@meg/database';

const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const payableSchema = z.object({ categoryId: z.string().optional().nullable(), description: z.string().trim().min(2).max(160), totalAmount: z.coerce.number().positive(), dueDate: z.string().min(10), installmentQty: z.coerce.number().int().min(1).max(60).default(1), notes: z.string().max(500).optional().nullable() });
const paymentSchema = z.object({ amount: z.coerce.number().positive(), paidAt: z.string().min(10), interestAmount: z.coerce.number().min(0).default(0), fineAmount: z.coerce.number().min(0).default(0), accountId: z.string().optional().nullable(), paymentMethodId: z.string().optional().nullable(), notes: z.string().max(500).optional().nullable() });
const recurringSchema = z.object({ categoryId: z.string().optional().nullable(), description: z.string().trim().min(2).max(160), amount: z.coerce.number().positive(), frequency: z.enum(['weekly', 'monthly', 'yearly']).default('monthly'), nextDueDate: z.string().min(10), endDate: z.string().optional().nullable(), notes: z.string().max(500).optional().nullable() });
function validationError(reply: FastifyReply, details: unknown) { return reply.code(400).send({ error: 'VALIDATION_ERROR', details }); }
function addPeriod(date: Date, frequency: string) { const next = new Date(date); if (frequency === 'weekly') next.setUTCDate(next.getUTCDate() + 7); else if (frequency === 'yearly') next.setUTCFullYear(next.getUTCFullYear() + 1); else next.setUTCMonth(next.getUTCMonth() + 1); return next; }
async function generateRecurring(userId: string, horizon: Date) {
  const templates = await prisma.recurringExpense.findMany({ where: { userId, isActive: true, nextDueDate: { lte: horizon } } });
  for (const template of templates) {
    let due = template.nextDueDate;
    const rows = [];
    while (due <= horizon && (!template.endDate || due <= template.endDate)) { rows.push({ userId, categoryId: template.categoryId, description: template.description, totalAmount: template.amount, openAmount: template.amount, dueDate: due, recurrenceId: template.id, notes: template.notes }); due = addPeriod(due, template.frequency); }
    if (rows.length) await prisma.payable.createMany({ data: rows, skipDuplicates: true });
    await prisma.recurringExpense.update({ where: { id: template.id }, data: { nextDueDate: due, isActive: !template.endDate || due <= template.endDate } });
  }
}
function addMonths(date: Date, offset: number) { const result = new Date(date); result.setUTCMonth(result.getUTCMonth() + offset); return result; }

export async function payableRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query); if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const [year, month] = parsed.data.month.split('-').map(Number); const start = new Date(Date.UTC(year, month - 1, 1)); const end = new Date(Date.UTC(year, month, 1));
    await generateRecurring(request.user.sub, new Date(end.getTime() - 1));
    return prisma.payable.findMany({ where: { userId: request.user.sub, dueDate: { gte: start, lt: end }, status: { not: 'cancelled' } }, orderBy: { dueDate: 'asc' }, include: { category: true, payments: { orderBy: { paidAt: 'desc' } } } });
  });

  app.post('/', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = payableSchema.safeParse(request.body); if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const totalCents = Math.round(parsed.data.totalAmount * 100); const base = Math.floor(totalCents / parsed.data.installmentQty); const remainder = totalCents - base * parsed.data.installmentQty; const initialDate = new Date(parsed.data.dueDate);
    const rows = Array.from({ length: parsed.data.installmentQty }, (_, index) => { const amount = (base + (index < remainder ? 1 : 0)) / 100; return { userId: request.user.sub, categoryId: parsed.data.categoryId, description: parsed.data.installmentQty > 1 ? `${parsed.data.description} ${index + 1}/${parsed.data.installmentQty}` : parsed.data.description, totalAmount: amount, openAmount: amount, dueDate: addMonths(initialDate, index), installmentNo: index + 1, installmentQty: parsed.data.installmentQty, notes: parsed.data.notes }; });
    await prisma.payable.createMany({ data: rows }); return reply.code(201).send({ created: rows.length });
  });

  app.post('/recurring', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = recurringSchema.safeParse(request.body); if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const template = await prisma.recurringExpense.create({ data: { userId: request.user.sub, ...parsed.data, nextDueDate: new Date(parsed.data.nextDueDate), endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null } });
    await generateRecurring(request.user.sub, addMonths(new Date(parsed.data.nextDueDate), 5)); return reply.code(201).send(template);
  });

  app.post('/:id/payments', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = paymentSchema.safeParse(request.body); if (!parsed.success) return validationError(reply, parsed.error.flatten()); const { id } = request.params as { id: string };
    const payable = await prisma.payable.findFirst({ where: { id, userId: request.user.sub, status: { notIn: ['paid', 'cancelled'] } } }); if (!payable) return reply.code(404).send({ error: 'PAYABLE_NOT_FOUND' });
    const principal = Math.abs(parsed.data.amount); const open = Number(payable.openAmount); if (principal > open) return reply.code(400).send({ error: 'AMOUNT_EXCEEDS_OPEN_BALANCE' });
    return prisma.$transaction(async (tx) => { const paidTotal = principal + parsed.data.interestAmount + parsed.data.fineAmount; const event = await tx.financialEvent.create({ data: { userId: request.user.sub, description: `Pagamento: ${payable.description}`, type: 'expense', status: 'paid', date: new Date(parsed.data.paidAt), competence: parsed.data.paidAt.slice(0, 7), amount: paidTotal, signedAmount: -paidTotal, accountId: parsed.data.accountId, categoryId: payable.categoryId, paymentMethodId: parsed.data.paymentMethodId, notes: parsed.data.notes } }); const payment = await tx.payablePayment.create({ data: { payableId: id, amount: principal, paidAt: new Date(parsed.data.paidAt), interestAmount: parsed.data.interestAmount, fineAmount: parsed.data.fineAmount, accountId: parsed.data.accountId, paymentMethodId: parsed.data.paymentMethodId, financialEventId: event.id, notes: parsed.data.notes } }); const remaining = Math.max(0, open - principal); await tx.payable.update({ where: { id }, data: { openAmount: remaining, status: remaining === 0 ? 'paid' : 'partial' } }); return reply.code(201).send(payment); });
  });

  app.delete('/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => { const { id } = request.params as { id: string }; const result = await prisma.payable.updateMany({ where: { id, userId: request.user.sub, status: { not: 'paid' } }, data: { status: 'cancelled' } }); if (!result.count) return reply.code(404).send({ error: 'PAYABLE_NOT_FOUND' }); return { id, cancelled: true }; });
}