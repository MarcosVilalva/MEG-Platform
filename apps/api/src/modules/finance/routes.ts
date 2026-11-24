import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createFinancialEventSchema, updateFinancialEventSchema } from './schemas';
import { listFinancialAudit } from './audit';
import { listSuspectedDuplicateFinancialEvents } from './suspected-duplicates-read';
import { A17ReviewError, resolveSuspectedFinancialEvent, undoSuspectedFinancialEventResolution } from './suspected-duplicates-review';
import {
  deleteFinancialEvent,
  listBudgetOverview,
  upsertBudget,
  deleteBudget,
  listFinancialEvents,
  getFinancialHistorySnapshot,
  getCanonicalFilteredHistorySummary,
  updateFinancialEvent
} from './service';
import { getCanonicalFinancialAnalytics, getCanonicalFinancialCashflow, getCanonicalFinancialSummary } from './read-model';
import {parseHistoryFilters} from './history-filter';
import {getActiveFinancialHistoryRevision} from './history-revision';
import { getPhoenixBenefitSummary, listPhoenixFinancialEventsForMonth } from './phoenix-read';
import { listCanonicalHomeCommitments } from './home-commitments-read';
import { decodeCommitmentCursor } from './home-commitments-core';
import { registerPhoenixPreviewReads } from './phoenix-preview-routes';
import { FinancialEventMutationError, createFinancialEventProtected } from './event-mutation';
import {readStage10QaCreateByOperation} from './stage10-qa-operation-recovery';
import { stage10QaWebWriteEnabled,stage10UnificationSyntheticMirrorEnabled } from '../app-state/stage10-qa-write-gate';
import { archiveMonetaryExpenseInSyntheticQa, Stage10SyntheticArchiveError } from './stage10-synthetic-archive';
import { updateStage10QaMonetaryExpense,Stage10QaEditError } from './stage10-qa-financial-edit';
import { FinancialEventSettlementError, settleLegacyFinancialEventProtected } from './event-settlement';
import { FinancialTransferError, createFinancialTransfer } from './transfer-service';
import {
  CatalogMutationError,
  createAccountCatalog,
  updateAccountCatalog,
  createCategoryCatalog,
  updateCategoryCatalog,
  createPaymentMethodCatalog,
  updatePaymentMethodCatalog,
} from './catalog-mutation';
import { prisma } from '@meg/database';
import { resolveWorkspaceContext } from '../workspaces/service';
import { isMonetaryAccountType, monetaryAccountBalanceAt, monetaryBalanceAt } from './monetary-protection';

const a17CommandBase = z.object({
  peerEventId: z.string().trim().min(1).max(128),
  suspicionGroupId: z.string().trim().min(12).max(300),
  operationId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  reason: z.string().trim().min(10).max(1000),
});
const a17ResolveSchema = a17CommandBase.extend({
  decision: z.enum(['RESOLVED_DUPLICATE','RESOLVED_LEGITIMATE']),
  correctionTargetEventId: z.string().min(1).max(128).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();
const a17UndoSchema = a17CommandBase.extend({
  resolutionAuditId: z.string().min(1).max(128),
}).strict();
function a17Error(reply: FastifyReply, err: unknown) {
  if (err instanceof A17ReviewError) {
    const code=err.code;
    const status=code==='A17_ROLE_DENIED'?403
      :code==='A17_PAIR_NOT_FOUND'?404
      :code==='OPERATION_ID_REUSED'||code==='A17_ALREADY_RESOLVED'
        ||code==='A17_NO_ACTIVE_RESOLUTION'||code==='A17_ACTIVE_CORRECTION_PROTECTED'
        ||code==='A17_COUNTERENTRY_IMMUTABLE'
        ||code==='A17_UNDO_INSUFFICIENT_BALANCE'?409:400;
    return reply.code(status).send({error:code,retryable:false});
  }
  if(err instanceof Error && err.message==='WORKSPACE_ACCESS_REQUIRED')
    return reply.code(403).send({error:'WORKSPACE_ACCESS_REQUIRED'});
  throw err;
}
const readRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as const;
const writeRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
const adminRoles = ['ADMIN', 'MANAGER'] as const;
const operationIdSchema = z.string().trim().min(8).max(128).optional();
const expectedWorkspaceHeaderSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/).optional();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const createEventRequestSchema = createFinancialEventSchema.extend({ operationId: operationIdSchema, allowDuplicate: z.boolean().optional() });
const settleLegacyEventRequestSchema = z.object({
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: z.string().trim().min(1),
  paymentMethodId: z.string().trim().min(1),
  operationId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
});
const transferRequestSchema = z.object({
  operationId: z.string().trim().min(8).max(128),
  sourceAccountId: z.string().trim().min(1).max(128),
  destinationAccountId: z.string().trim().min(1).max(128),
  amount: z.coerce.number().positive().finite(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(2).max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
  allowDuplicate: z.boolean().optional(),
});

const expectedUpdatedAtSchema = z.string().datetime({ offset: true }).optional();

const accountCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(['checking', 'savings', 'cash', 'investment', 'credit', 'benefit']),
  institution: z.string().trim().max(120).optional().nullable(),
  openingBalance: z.coerce.number().finite().default(0),
  isActive: z.boolean().optional(),
  operationId: operationIdSchema,
});
const accountUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  institution: z.string().trim().max(120).optional().nullable(),
  openingBalance: z.coerce.number().finite().optional(),
  isActive: z.boolean().optional(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
  operationId: operationIdSchema,
}).strict();

const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  group: z.string().trim().max(120).optional().nullable(),
  type: z.enum(['income', 'expense']).optional().nullable(),
  isActive: z.boolean().optional(),
  operationId: operationIdSchema,
});
const categoryUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  group: z.string().trim().max(120).optional().nullable(),
  isActive: z.boolean().optional(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
  operationId: operationIdSchema,
}).strict();

const paymentMethodCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(['instant', 'bill', 'credit', 'debit', 'transfer', 'cash', 'other']).optional().nullable(),
  isActive: z.boolean().optional(),
  operationId: operationIdSchema,
});
const paymentMethodUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
  expectedUpdatedAt: expectedUpdatedAtSchema,
  operationId: operationIdSchema,
}).strict();

const catalogDeactivateSchema = z.object({
  expectedUpdatedAt: expectedUpdatedAtSchema,
  operationId: operationIdSchema,
}).strict();

function validationError(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', details });
}

function eventError(reply: FastifyReply, error: unknown) {
  if (error instanceof A17ReviewError) return a17Error(reply, error);
  if (error instanceof FinancialEventMutationError) {
    const status = error.code === 'FINANCIAL_EVENT_NOT_FOUND' ? 404 : ['OPERATION_ID_REUSED', 'POSSIBLE_DUPLICATE', 'WORKSPACE_CONTEXT_CHANGED'].includes(error.code) ? 409 : 400;
    return reply.code(status).send({ error: error.code, ...(error.details || {}) });
  }
  if (!(error instanceof Error)) throw error;
  if (error.message === 'WORKSPACE_ACCESS_REQUIRED') return reply.code(403).send({error:'WORKSPACE_ACCESS_REQUIRED'});
  if (error.message === 'FINANCIAL_EVENT_NOT_FOUND') return reply.code(404).send({ error: error.message });
  if (['FINANCIAL_EVENT_LINKED_DOMAIN', 'FINANCIAL_EVENT_REVERSAL_REQUIRES_CANONICAL_WRITER'].includes(error.message)) {
    return reply.code(409).send({ error: error.message, retryable: false });
  }
  if (['INVALID_ACCOUNT', 'INVALID_CATEGORY', 'INVALID_PAYMENT_METHOD'].includes(error.message)) {
    return reply.code(400).send({ error: error.message });
  }
  throw error;
}

function settlementError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof FinancialEventSettlementError)) throw error;
  const status = error.code === 'FINANCIAL_EVENT_NOT_FOUND' ? 404 : error.code === 'OPERATION_ID_REUSED' ? 409 : 400;
  return reply.code(status).send({ error: error.code, ...(error.details || {}) });
}

function transferError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof FinancialTransferError)) throw error;
  const denied = error.code === 'TRANSFER_WORKSPACE_WRITE_REQUIRED';
  const conflict = ['OPERATION_ID_REUSED', 'POSSIBLE_DUPLICATE', 'INSUFFICIENT_SOURCE_ACCOUNT_BALANCE'].includes(error.code);
  const status = denied ? 403 : conflict ? 409 : 400;
  return reply.code(status).send({ error: error.code, ...(denied ? { retryable: false } : {}), ...(error.details || {}) });
}

function catalogError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof CatalogMutationError)) throw error;
  const notFound = ['ACCOUNT_NOT_FOUND', 'CATEGORY_NOT_FOUND', 'PAYMENT_METHOD_NOT_FOUND'].includes(error.code);
  const conflict = [
    'ACCOUNT_ALREADY_EXISTS',
    'CATEGORY_ALREADY_EXISTS',
    'PAYMENT_METHOD_ALREADY_EXISTS',
    'CATALOG_STALE_VERSION',
    'OPERATION_ID_REUSED',
  ].includes(error.code);
  return reply.code(notFound ? 404 : conflict ? 409 : 400).send({ error: error.code, ...(error.details || {}) });
}

async function financialDataOwnerId(userId: string) {
  const context = await resolveWorkspaceContext(userId);
  return context.workspace.ownerId;
}

export async function financeRoutes(app: FastifyInstance) {
  registerPhoenixPreviewReads(app);
  // Experimental endpoint. Registered only against an ephemeral, local PG17
  // identity. No production access or Android rollout is authorized.
  if(stage10UnificationSyntheticMirrorEnabled()){
    app.post('/events/:id/stage10-synthetic-archive-v2',
      {preHandler:app.authorize([...adminRoles])},async(request,reply)=>{
      if(!stage10UnificationSyntheticMirrorEnabled()){
        return reply.code(403).send({error:'SYNTHETIC_ARCHIVE_DB_REQUIRED'});
      }
      const parsed=z.object({
        operationId:z.guid(),
        expectedUpdatedAt:z.string().datetime({offset:true}),
        expectedRevision:z.number().int().nonnegative(),
      }).strict().safeParse(request.body);
      if(!parsed.success)return validationError(reply,parsed.error.flatten());
      const {id}=request.params as {id:string};
      try {
        return await archiveMonetaryExpenseInSyntheticQa(request.user.sub,id,parsed.data);
      }catch(error){
        if(!(error instanceof Stage10SyntheticArchiveError))throw error;
        const status=error.code==='ARCHIVE_EVENT_NOT_FOUND_OR_ARCHIVED'?404:
          error.code==='ARCHIVE_WORKSPACE_ROLE_REQUIRED'?403:
          error.code==='INVALID_ARCHIVE_REQUEST'?400:409;
        return reply.code(status).send({error:error.code,retryable:false});
      }
    });
  }
  if(stage10QaWebWriteEnabled()){
    // PT90: readback estritamente QA por identidade; nunca reexecuta o POST.
    app.get('/events/stage10-qa-operation/:operationId',
      {preHandler:app.authorize(['ADMIN'])},async(request,reply)=>{
      if(!stage10QaWebWriteEnabled())return reply.code(403).send({error:'STAGE10_QA_WRITE_DISABLED'});
      // Role global ADMIN nao substitui permissao ADMIN no workspace ativo.
      // Esta rota de diagnostico nao pode inicializar workspace legado.
      let workspace;
      try{
        workspace=await resolveWorkspaceContext(request.user.sub,{allowLegacyBootstrap:false});
      }catch(error){
        if(error instanceof Error && error.message==='WORKSPACE_ACCESS_REQUIRED'){
          return reply.code(403).send({error:'WORKSPACE_ACCESS_REQUIRED'});
        }
        throw error;
      }
      if(workspace.membership.role!=='ADMIN'){
        return reply.code(403).send({error:'STAGE10_QA_WORKSPACE_ADMIN_REQUIRED'});
      }
      reply.header('Cache-Control','private, no-store');
      const params=z.object({operationId:z.guid()}).safeParse(request.params);
      const query=z.object({month:monthSchema}).safeParse(request.query);
      if(!params.success||!query.success)return validationError(reply,{
        params:params.success?null:params.error.flatten(),
        query:query.success?null:query.error.flatten(),
      });
      return readStage10QaCreateByOperation(request.user.sub,params.data.operationId,query.data.month);
    });
    app.patch('/events/:id/stage10-qa-edit', {preHandler:app.authorize(['ADMIN'])},async(request,reply)=>{
      if(!stage10QaWebWriteEnabled())return reply.code(403).send({error:'STAGE10_QA_WRITE_DISABLED'});
      const parsed=z.object({
        operationId:z.guid(),
        expectedUpdatedAt:z.string().datetime({offset:true}),
        expectedRevision:z.number().int().nonnegative(),
        description:z.string().trim().min(1).max(160),
        date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        status:z.enum(['planned','paid']),
        amount:z.number().finite().refine(v=>v!==0),
        accountId:z.string().min(1),
        categoryId:z.string().min(1),
        paymentMethodId:z.string().min(1),
        notes:z.string().max(1000),
      }).strict().safeParse(request.body);
      if(!parsed.success)return validationError(reply,parsed.error.flatten());
      const {id}=request.params as {id:string};
      try {return await updateStage10QaMonetaryExpense(request.user.sub,id,parsed.data);}
      catch(error){
        if(!(error instanceof Stage10QaEditError))throw error;
        return reply.code(error.code==='STAGE10_QA_EVENT_NOT_FOUND'?404:409)
          .send({error:error.code,retryable:false});
      }
    });
  }

  app.get('/sync-status', { preHandler: app.authorize([...readRoles]) }, async (request) => {
    const context = await resolveWorkspaceContext(request.user.sub);
    const dataOwnerId = context.workspace.ownerId;
    const [latestMutation, latestAccount, latestCategory, latestPaymentMethod, latestCard, activeHistoryRevision] = await Promise.all([
      prisma.cloudMutationReceipt.findFirst({
        where: { workspaceId: context.workspaceId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true, mutationType: true, createdAt: true },
      }),
      prisma.account.findFirst({
        where: { userId: dataOwnerId },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, updatedAt: true },
      }),
      prisma.category.findFirst({
        where: { userId: dataOwnerId },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, updatedAt: true },
      }),
      prisma.paymentMethod.findFirst({
        where: { userId: dataOwnerId },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, updatedAt: true },
      }),
      prisma.creditCard.findFirst({
        where: { userId: dataOwnerId },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: { id: true, updatedAt: true },
      }),
      getActiveFinancialHistoryRevision(dataOwnerId),
    ]);

    const catalogSources = [
      ['account', latestAccount] as const,
      ['category', latestCategory] as const,
      ['payment-method', latestPaymentMethod] as const,
      ['card', latestCard] as const,
    ];
    const catalogToken = catalogSources
      .map(([kind, item]) => item ? `${kind}:${item.updatedAt.toISOString()}:${item.id}` : `${kind}:empty`)
      .join('|');
    const latestCatalog = catalogSources.reduce<{ kind: string; item: { id: string; updatedAt: Date } } | null>(
      (latest, [kind, item]) => {
        if (!item) return latest;
        if (!latest || item.updatedAt > latest.item.updatedAt) return { kind, item };
        return latest;
      },
      null,
    );
    const mutationToken = latestMutation
      ? `mutation:${latestMutation.createdAt.toISOString()}:${latestMutation.id}`
      : 'mutation:empty';
    const changedAtDate = latestMutation && latestCatalog
      ? (latestMutation.createdAt >= latestCatalog.item.updatedAt ? latestMutation.createdAt : latestCatalog.item.updatedAt)
      : latestMutation?.createdAt || latestCatalog?.item.updatedAt || null;
    const catalogIsNewest = Boolean(latestCatalog && (!latestMutation || latestCatalog.item.updatedAt > latestMutation.createdAt));

    return {
      token: `${mutationToken}|${catalogToken}|${activeHistoryRevision}`,
      changedAt: changedAtDate?.toISOString() || null,
      mutationType: catalogIsNewest ? 'CATALOG_SYNC' : latestMutation?.mutationType || null,
      catalogChangedAt: latestCatalog?.item.updatedAt.toISOString() || null,
      capabilities: {historySnapshotV1:true, filteredSummaryV1:true},
    };
  });


  // Home 06: leitura do saldo monetário consolidado na data informada.
  // Usa EXCLUSIVAMENTE o cálculo canônico, sem somar contas na camada web.
  app.get('/home-available', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    const available = await monetaryBalanceAt(prisma, dataOwnerId, parsed.data.date);
    return { date: parsed.data.date, available, scope: 'monetary' as const };
  });

  app.get('/monetary-balance', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({
      accountId: z.string().trim().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    const account = await prisma.account.findFirst({
      where: { id: parsed.data.accountId, userId: dataOwnerId, isActive: true },
      select: { id: true, name: true, type: true, openingBalance: true },
    });
    if (!account) return reply.code(404).send({ error: 'INVALID_ACCOUNT' });
    if (!isMonetaryAccountType(account.type)) {
      return reply.code(400).send({ error: 'ACCOUNT_NOT_MONETARY', accountId: account.id, accountType: account.type });
    }
    const available = await monetaryAccountBalanceAt(prisma, dataOwnerId, account, parsed.data.date);
    return {
      accountId: account.id,
      accountName: account.name,
      accountType: account.type,
      date: parsed.data.date,
      available,
    };
  });

  app.get('/analytics', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return getCanonicalFinancialAnalytics(dataOwnerId, parsed.data.month);
  });

  app.get('/budgets', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return listBudgetOverview(dataOwnerId, parsed.data.month);
  });

  app.put('/budgets', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = z.object({
      month: monthSchema,
      group: z.string().trim().min(2).max(120),
      amount: z.coerce.number().positive().finite()
    }).safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return upsertBudget(dataOwnerId, parsed.data);
  });

  app.delete('/budgets/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const dataOwnerId = await financialDataOwnerId(request.user.sub);
      return await deleteBudget(dataOwnerId, id);
    } catch (error) {
      if (error instanceof Error && error.message === 'BUDGET_NOT_FOUND') {
        return reply.code(404).send({ error: 'BUDGET_NOT_FOUND' });
      }
      throw error;
    }
  });

  app.get('/cashflow', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return getCanonicalFinancialCashflow(dataOwnerId, parsed.data.month);
  });

  app.get('/summary', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return getCanonicalFinancialSummary(dataOwnerId, parsed.data.month);
  });

  app.get('/benefit-summary', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return getPhoenixBenefitSummary(request.user.sub, parsed.data.month);
  });

  // Leitura limitada, autenticada, sem materialização ou mutação financeira.
  app.get('/home-commitments', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({
      limit: z.coerce.number().int().min(1).max(50).default(8),
      cursor: z.string().min(1).max(512).optional(),
    }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    if (parsed.data.cursor && !decodeCommitmentCursor(parsed.data.cursor)) {
      return reply.code(400).send({ code: 'INVALID_HOME_COMMITMENTS_CURSOR' });
    }
    reply.header('Cache-Control', 'private, no-store');
    return listCanonicalHomeCommitments(request.user.sub, parsed.data);
  });

  app.get('/events/month', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({ month: monthSchema }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return listPhoenixFinancialEventsForMonth(request.user.sub, parsed.data.month);
  });

  // Exclusivo da consulta Web autorizada: resposta integral consistente em
  // uma transação; para históricos grandes o servidor sinaliza fallback.
  app.get('/events/history-snapshot', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return getFinancialHistorySnapshot(dataOwnerId);
  });

  // Somente leitura: os filtros estruturais são validáveis na API.
  // Nunca publica somas do React; se exceder o limite informa indisponibilidade.
  app.get('/events/filtered-summary', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const parsed = z.object({filter:z.string().min(2).max(12000)}).safeParse(request.query);
    if(!parsed.success)return validationError(reply, parsed.error.flatten());
    let filters;
    try {filters=parseHistoryFilters(JSON.parse(parsed.data.filter));}
    catch {return reply.code(400).send({code:'INVALID_HISTORY_FILTER',message:'Filtros financeiros inválidos.'});}
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return getCanonicalFilteredHistorySummary(dataOwnerId, filters);
  });

  // A17 intentionally defaults OFF. No production exposure before review gates.
  if (process.env.MEG_STAGE10_ISSUE699_A17_REVIEW_ENABLED === '1') {
    app.post('/events/:id/resolve', { preHandler: app.authorize([...adminRoles]) }, async(request,reply)=>{
      const params=z.object({id:z.string().min(1).max(128)}).safeParse(request.params);
      const parsed=a17ResolveSchema.safeParse(request.body);
      if(!params.success||!parsed.success)return validationError(reply,{
        params:params.success?undefined:params.error.flatten(),
        body:parsed.success?undefined:parsed.error.flatten(),
      });
      try {return reply.code(201).send(await resolveSuspectedFinancialEvent(
        request.user.sub,params.data.id,parsed.data));}
      catch(error){return a17Error(reply,error);}
    });
    app.post('/events/:id/resolve/undo', { preHandler: app.authorize([...adminRoles]) }, async(request,reply)=>{
      const params=z.object({id:z.string().min(1).max(128)}).safeParse(request.params);
      const parsed=a17UndoSchema.safeParse(request.body);
      if(!params.success||!parsed.success)return validationError(reply,{
        params:params.success?undefined:params.error.flatten(),
        body:parsed.success?undefined:parsed.error.flatten(),
      });
      try {return reply.code(201).send(await undoSuspectedFinancialEventResolution(
        request.user.sub,params.data.id,parsed.data));}
      catch(error){return a17Error(reply,error);}
    });
  }

  // #699 Phase A: durable, authorized, non-blocking support visibility.
  // Read-only; no APK update, new success status, or implicit financial merge.
  app.get('/events/suspected-duplicates', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(50),
    }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    reply.header('Cache-Control', 'no-store');
    return listSuspectedDuplicateFinancialEvents(request.user.sub, parsed.data);
  });

  app.get('/events', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(10).max(100).default(50),
      search: z.string().trim().max(120).optional()
    }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return listFinancialEvents(dataOwnerId, parsed.data);
  });

  app.get('/audit', { preHandler: app.authorize([...readRoles]) }, async (request, reply) => {
    const parsed = z.object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().min(10).max(100).default(50),
      action: z.string().trim().max(80).optional(),
      entity: z.string().trim().max(80).optional(),
    }).safeParse(request.query);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    return listFinancialAudit(request.user.sub, parsed.data);
  });

  app.post('/events', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = createEventRequestSchema.safeParse(request.body);
    const expected = expectedWorkspaceHeaderSchema.safeParse(request.headers['x-meg-expected-workspace-id']);
    if (!parsed.success || !expected.success) return validationError(reply, {
      body: parsed.success ? undefined : parsed.error.flatten(),
      workspaceHeader: expected.success ? undefined : expected.error.flatten(),
    });
    try {
      return reply.code(201).send(await createFinancialEventProtected(request.user.sub, parsed.data, expected.data));
    } catch (error) {
      return eventError(reply, error);
    }
  });

  app.post('/transfers', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = transferRequestSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return reply.code(201).send(await createFinancialTransfer(request.user.sub, parsed.data));
    } catch (error) {
      return transferError(reply, error);
    }
  });

  app.post('/events/:id/settle', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = settleLegacyEventRequestSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return reply.code(201).send(await settleLegacyFinancialEventProtected(request.user.sub, {
        eventId: id,
        ...parsed.data,
      }));
    } catch (error) {
      return settlementError(reply, error);
    }
  });

  app.patch('/events/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateFinancialEventSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return await updateFinancialEvent(request.user.sub, id, parsed.data);
    } catch (error) {
      return eventError(reply, error);
    }
  });

  app.delete('/events/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await deleteFinancialEvent(request.user.sub, id);
    } catch (error) {
      return eventError(reply, error);
    }
  });

  app.get('/accounts', { preHandler: app.authorize([...readRoles]) }, async (request) => {
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return prisma.account.findMany({ where: { userId: dataOwnerId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  });

  app.post('/accounts', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = accountCreateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return reply.code(201).send(await createAccountCatalog(request.user.sub, parsed.data));
    } catch (error) {
      return catalogError(reply, error);
    }
  });

  app.patch('/accounts/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = accountUpdateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    try {
      return await updateAccountCatalog(request.user.sub, id, parsed.data);
    } catch (error) {
      return catalogError(reply, error);
    }
  });

  app.delete('/accounts/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const parsed = catalogDeactivateSchema.safeParse(request.body || {});
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    try {
      return await updateAccountCatalog(request.user.sub, id, { ...parsed.data, isActive: false });
    } catch (error) {
      return catalogError(reply, error);
    }
  });

  app.get('/categories', { preHandler: app.authorize([...readRoles]) }, async (request) => {
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return prisma.category.findMany({ where: { userId: dataOwnerId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  });

  app.post('/categories', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = categoryCreateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return reply.code(201).send(await createCategoryCatalog(request.user.sub, parsed.data));
    } catch (error) {
      return catalogError(reply, error);
    }
  });

  app.patch('/categories/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = categoryUpdateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    try {
      return await updateCategoryCatalog(request.user.sub, id, parsed.data);
    } catch (error) {
      return catalogError(reply, error);
    }
  });

  app.delete('/categories/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const parsed = catalogDeactivateSchema.safeParse(request.body || {});
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    try {
      return await updateCategoryCatalog(request.user.sub, id, { ...parsed.data, isActive: false });
    } catch (error) {
      return catalogError(reply, error);
    }
  });

  app.get('/payment-methods', { preHandler: app.authorize([...readRoles]) }, async (request) => {
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return prisma.paymentMethod.findMany({ where: { userId: dataOwnerId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  });

  app.post('/payment-methods', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = paymentMethodCreateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    try {
      return reply.code(201).send(await createPaymentMethodCatalog(request.user.sub, parsed.data));
    } catch (error) {
      return catalogError(reply, error);
    }
  });

  app.patch('/payment-methods/:id', { preHandler: app.authorize([...writeRoles]) }, async (request, reply) => {
    const parsed = paymentMethodUpdateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    try {
      return await updatePaymentMethodCatalog(request.user.sub, id, parsed.data);
    } catch (error) {
      return catalogError(reply, error);
    }
  });

  app.delete('/payment-methods/:id', { preHandler: app.authorize([...adminRoles]) }, async (request, reply) => {
    const parsed = catalogDeactivateSchema.safeParse(request.body || {});
    if (!parsed.success) return validationError(reply, parsed.error.flatten());
    const { id } = request.params as { id: string };
    try {
      return await updatePaymentMethodCatalog(request.user.sub, id, { ...parsed.data, isActive: false });
    } catch (error) {
      return catalogError(reply, error);
    }
  });

  app.get('/ledger', { preHandler: app.authorize([...readRoles]) }, async (request) => {
    const dataOwnerId = await financialDataOwnerId(request.user.sub);
    return prisma.ledgerEntry.findMany({
      where: { event: { userId: dataOwnerId } },
      orderBy: { date: 'desc' },
      include: { account: true, event: true }
    });
  });
}
