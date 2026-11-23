import type { FastifyInstance, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Prisma, prisma } from '@meg/database';
import { resolveWorkspaceContext } from '../workspaces/service';
import { assertWorkspaceWriteAccess } from '../platform-admin/service';
import { applyTransactionPatch } from './transaction-patch';
import { canonical } from './normalization-migration-core';
import { buildMutationConfirmation } from './mutation-confirmation';
import { findMutationReceipt, mutationRequestHash, receiptCreateData } from './mutation-receipt';
import {
  activateNormalizationPrimary,
  applyNormalizationShadow,
  normalizationPreview,
  normalizedStateForRead,
  isNormalizedPrimary,
  rollbackNormalizationPrimary,
  synchronizeNormalizedRows,
} from './normalization-migration';
import { reconcilePrimaryAppStateFromNormalized } from './normalized-primary-writeback';
import { normalizationWriteConflictCode, normalizationWriteConflictPayload } from './normalization-conflict-policy';
import { LegacyRestoreError, previewLegacyRestore, restoreLegacyFinancialEventQa, stage10RestoreQaEnabled } from './legacy-restore';
import { stage10QaWebWriteEnabled, MEG_STAGE10_QA_WRITE_PROTOCOL } from './stage10-qa-write-gate';
import { stage10QaPatchPropertiesAtomically } from './stage10-qa-properties-atomic';

const legacyRestoreSchema = z.object({
  operationId: z.guid(),
  eventId: z.string().trim().min(1),
  expectedRevision: z.number().int().nonnegative(),
  expectedArchivedAt: z.string().datetime({offset:true}),
  expectedUpdatedAt: z.string().datetime({offset:true}),
  confirmation: z.literal('CONFIRMAR_RESTAURACAO_EXPLICITA'),
}).strict();

const MAX_TRANSACTION_PATCH_OPERATIONS = 2000;
const MAX_ACTIVITY_LOG_ITEMS = 500;
const NORMALIZATION_METADATA_KEY = '__megNormalization';

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
  operationId: z.guid().optional(),
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
  operationId: z.guid(),
  expectedRevision: z.number().int().nonnegative(),
  properties: z.record(z.string(), z.unknown()),
}).superRefine((value, context) => {
  ['transactions', 'activityLog', NORMALIZATION_METADATA_KEY].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(value.properties, key)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `A propriedade ${key} possui protocolo próprio.`, path: ['properties', key] });
    }
  });
});
const normalizationSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  apply: z.boolean().default(false),
  confirmation: z.string().optional(),
});
const normalizationCutoverSchema = z.object({
  action: z.enum(['activate', 'rollback']),
  expectedRevision: z.number().int().nonnegative(),
  confirmation: z.string(),
});
const normalizationReconcileSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  confirmation: z.literal('RECONCILIAR_ESPELHO_APPSTATE'),
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

async function readWorkspaceOrDeny(userId: string, reply: FastifyReply) {
  try {
    return await resolveWorkspaceContext(userId, { allowLegacyBootstrap: false });
  } catch (error) {
    if (error instanceof Error && error.message === 'WORKSPACE_ACCESS_REQUIRED') {
      reply.status(403).send({ error: 'WORKSPACE_ACCESS_REQUIRED' });
      return null;
    }
    throw error;
  }
}

export async function appStateRoutes(app: FastifyInstance) {
  if (stage10QaWebWriteEnabled()) {
    app.get('/stage10-qa-write-gate', {preHandler:app.authorize(['ADMIN'])}, async (request,reply) => {
      if(!stage10QaWebWriteEnabled())return reply.status(403).send({error:'STAGE10_QA_WRITE_DISABLED'});
      const context=await resolveWorkspaceContext(request.user.sub);
      if(!(await assertWriteAccess(context.workspaceId,reply)))return;
      const state=await prisma.appState.findUnique({where:{workspaceId:context.workspaceId},select:{state:true,revision:true}});
      return {
        protocol:MEG_STAGE10_QA_WRITE_PROTOCOL,
        allowed:Boolean(state&&isNormalizedPrimary(state.state)),
        editSupported:Boolean(state&&isNormalizedPrimary(state.state)),
        revision:state?.revision??null,
      };
    });
  }

  // Nao registra rotas de restauracao fora do PG17 descartavel explicitamente habilitado.
  // O PATCH legado continua proibido de restaurar tombstones implicitamente.
  if (stage10RestoreQaEnabled()) {
    app.get('/legacy-restore/:legacyId', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
      const legacyId = (request.params as {legacyId: string}).legacyId;
      try {
        return await previewLegacyRestore(request.user.sub, legacyId);
      } catch (error) {
        if (!(error instanceof LegacyRestoreError)) throw error;
        return reply.status(error.code === 'RESTORE_EVENT_NOT_FOUND' ? 404 : 409).send({error:error.code});
      }
    });

    app.post('/legacy-restore/:legacyId', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
      const parsed = legacyRestoreSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({error:'RESTORE_INTENT_INVALID',details:parsed.error.flatten()});
      const legacyId = (request.params as {legacyId: string}).legacyId;
      if (!(await assertWriteAccess((await resolveWorkspaceContext(request.user.sub)).workspaceId, reply))) return;
      try {
        return await restoreLegacyFinancialEventQa(request.user.sub, {legacyId,...parsed.data});
      } catch (error) {
        if (!(error instanceof LegacyRestoreError)) throw error;
        const status = error.code === 'RESTORE_EVENT_NOT_FOUND' ? 404 : 409;
        return reply.status(status).send({error:error.code,retryable:false});
      }
    });
  }

  app.get('/normalization-preview', { preHandler: app.authenticate }, async (request, reply) => {
    const context = await readWorkspaceOrDeny(request.user.sub, reply);
    if (!context) return;
    return normalizationPreview(context.workspaceId, context.workspace.ownerId);
  });

  app.post('/normalization-reconcile-primary', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const parsed = normalizationReconcileSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_NORMALIZATION_RECONCILE_REQUEST', details: parsed.error.flatten() });
    const context = await resolveWorkspaceContext(request.user.sub);
    if (!(await assertWriteAccess(context.workspaceId, reply))) return;
    const before = await normalizationPreview(context.workspaceId, context.workspace.ownerId);
    if (!before.primary) return reply.status(409).send({ error: 'NORMALIZATION_PRIMARY_REQUIRED', preview: before });
    if (before.revision !== parsed.data.expectedRevision) {
      return reply.status(409).send({ error: 'NORMALIZATION_REVISION_CONFLICT', revision: before.revision, preview: before });
    }
    try {
      const repair = await reconcilePrimaryAppStateFromNormalized(context.workspaceId, {
        expectedRevision: parsed.data.expectedRevision,
        actorId: request.user.sub,
      });
      const after = await normalizationPreview(context.workspaceId, context.workspace.ownerId);
      if (!after.reconciled) {
        return reply.status(422).send({ error: 'NORMALIZATION_RECONCILIATION_FAILED', repair, preview: after });
      }
      return { repair, preview: after, reconciled: true };
    } catch (error) {
      const code = error instanceof Error ? error.message : 'NORMALIZATION_RECONCILE_FAILED';
      if (code === 'NORMALIZATION_REVISION_CONFLICT' || code === 'NORMALIZED_PRIMARY_MIRROR_CONFLICT') {
        const preview = await normalizationPreview(context.workspaceId, context.workspace.ownerId);
        return reply.status(409).send({ error: 'NORMALIZATION_REVISION_CONFLICT', revision: preview.revision, preview });
      }
      if (code === 'NORMALIZATION_PRIMARY_REQUIRED') {
        return reply.status(409).send({ error: code, preview: await normalizationPreview(context.workspaceId, context.workspace.ownerId) });
      }
      throw error;
    }
  });

  app.post('/normalization-shadow', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const parsed = normalizationSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_NORMALIZATION_REQUEST', details: parsed.error.flatten() });
    const context = await resolveWorkspaceContext(request.user.sub);
    const preview = await normalizationPreview(context.workspaceId, context.workspace.ownerId);
    if (!parsed.data.apply) return { ...preview, dryRun: true };
    if (parsed.data.confirmation !== 'CONFIRMAR_MIGRACAO_SOMBRA') {
      return reply.status(400).send({ error: 'NORMALIZATION_CONFIRMATION_REQUIRED' });
    }
    try {
      return { ...(await applyNormalizationShadow(context.workspaceId, context.workspace.ownerId, parsed.data.expectedRevision)), dryRun: false };
    } catch (error) {
      const code = error instanceof Error ? error.message : 'NORMALIZATION_FAILED';
      if (code === 'NORMALIZATION_REVISION_CONFLICT') return reply.status(409).send({ error: code });
      if (code === 'NORMALIZATION_INVALID_SOURCE' || code === 'NORMALIZATION_SHADOW_REBUILD_REQUIRES_CANONICAL_MIGRATION') {
        return reply.status(422).send({ error: code, preview });
      }
      throw error;
    }
  });

  app.post('/normalization-cutover', { preHandler: app.authorize(['ADMIN']) }, async (request, reply) => {
    const parsed = normalizationCutoverSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_NORMALIZATION_CUTOVER', details: parsed.error.flatten() });
    const context = await resolveWorkspaceContext(request.user.sub);
    const preview = await normalizationPreview(context.workspaceId, context.workspace.ownerId);
    if (preview.revision !== parsed.data.expectedRevision) {
      return reply.status(409).send({ error: 'NORMALIZATION_REVISION_CONFLICT', revision: preview.revision });
    }
    try {
      if (parsed.data.action === 'rollback') {
        if (parsed.data.confirmation !== 'RETORNAR_PARA_APPSTATE') return reply.status(400).send({ error: 'NORMALIZATION_ROLLBACK_CONFIRMATION_REQUIRED' });
        return rollbackNormalizationPrimary(context.workspaceId);
      }
      if (parsed.data.confirmation !== 'ATIVAR_BASE_NORMALIZADA') return reply.status(400).send({ error: 'NORMALIZATION_CUTOVER_CONFIRMATION_REQUIRED' });
      return activateNormalizationPrimary(context.workspaceId, context.workspace.ownerId);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'NORMALIZATION_CUTOVER_FAILED';
      if (code === 'NORMALIZATION_REVISION_CONFLICT') return reply.status(409).send({ error: code });
      if (code === 'NORMALIZATION_INVALID_SOURCE' || code === 'NORMALIZATION_RECONCILIATION_FAILED'
        || code === 'NORMALIZATION_SHADOW_REBUILD_REQUIRES_CANONICAL_MIGRATION') {
        return reply.status(422).send({ error: code, preview: await normalizationPreview(context.workspaceId, context.workspace.ownerId) });
      }
      throw error;
    }
  });

  app.get('/revision', { preHandler: app.authenticate }, async (request, reply) => {
    const context = await readWorkspaceOrDeny(request.user.sub, reply);
    if (!context) return;
    const saved = await prisma.appState.findUnique({ where: { workspaceId: context.workspaceId }, select: { revision: true, updatedAt: true } });
    return saved
      ? { revision: saved.revision, updatedAt: saved.updatedAt, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } }
      : { revision: 0, updatedAt: null, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } };
  });

  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const context = await readWorkspaceOrDeny(request.user.sub, reply);
    if (!context) return;
    const saved = await normalizedStateForRead(context.workspaceId, context.workspace.ownerId);
    return saved
      ? { ...saved, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } }
      : { state: null, revision: 0, updatedAt: null, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } };
  });

  // Etapa 10 candidate: recibo e AppState devem persistir atomicamente.
  // Reusa schema, patch, normalizacao e confirmacao canonicos ja existentes.
  app.patch('/transactions', { preHandler: app.authorize(['ADMIN', 'MANAGER', 'OPERATOR']) }, async (request, reply) => {
    const parsed = transactionPatchSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_TRANSACTION_PATCH', details: parsed.error.flatten() });

    const context = await resolveWorkspaceContext(request.user.sub);
    if (!await assertWriteAccess(context.workspaceId, reply)) return;
    const data = parsed.data;
    const operationId = data.operationId || randomUUID();
    const requestHash = mutationRequestHash(data);
    const unique = { workspaceId_operationId: { workspaceId: context.workspaceId, operationId } };
    const workspace = { id: context.workspace.id, name: context.workspace.name };
    const upsertIds = data.upserts.map(item => item.id);
    const activityIds = data.activities
      .map(item => typeof item === 'object' && item && typeof (item as {id?:unknown}).id === 'string'
        ? (item as {id:string}).id : '')
      .filter(Boolean);
    const activityPatch = data.activityLog !== undefined || data.activities.length > 0;
    const hasMutation = data.upserts.length > 0 || data.deletes.length > 0 || activityPatch;
    const changedIds = [...new Set([...upsertIds, ...data.deletes])];

    try {
      const result = await prisma.$transaction(async (tx) => {
        // A leitura e a insercao do recibo pertencem a mesma transacao
        // serializavel da mutacao. Reenvio concorrente nao cria duas gravacoes.
        const prior = await tx.cloudMutationReceipt.findUnique({where:unique});
        if (prior) {
          if (prior.requestHash !== requestHash) {
            return {status:409, body:{error:'OPERATION_ID_REUSED',operationId}};
          }
          if (!prior.response || typeof prior.response !== 'object' || Array.isArray(prior.response)) {
            throw new Error('MUTATION_RECEIPT_CORRUPTED');
          }
          return {status:200, body:{...(prior.response as Record<string,unknown>),replayed:true}};
        }

        const current = await tx.appState.findUnique({
          where:{workspaceId:context.workspaceId},
          select:{id:true,state:true,revision:true,updatedAt:true},
        });
        const currentRevision = current?.revision || 0;
        if (data.expectedRevision !== currentRevision) {
          return {status:409,body:{
            error:'STATE_CONFLICT',revision:currentRevision,updatedAt:current?.updatedAt || null,
          }};
        }
        let response: Record<string,unknown>;
        if (!hasMutation) {
          response = {
            revision:currentRevision,updatedAt:current?.updatedAt || null,changed:false,
            confirmation:buildMutationConfirmation(
              current?.state || {transactions:[],activityLog:[]},
              operationId,currentRevision,upsertIds,data.deletes,activityIds,
            ),
            shared:true,workspace,
          };
        } else {
          const nextState = stateSchema.safeParse(applyTransactionPatch(
            current?.state || {transactions:[],budgets:{}},
            data.upserts,data.deletes,activityMetadata(data.activityLog),data.activities,
          ));
          if (!nextState.success) {
            return {status:400,body:{
              error:'INVALID_APP_STATE_PATCH',details:nextState.error.flatten(),
            }};
          }
          if (!current) {
            const created = await tx.appState.create({
              data:{
                userId:context.workspace.ownerId,workspaceId:context.workspaceId,
                state:nextState.data as Prisma.InputJsonValue,revision:1,
              },
              select:{state:true,revision:true,updatedAt:true},
            });
            response = {
              revision:created.revision,updatedAt:created.updatedAt,changed:true,
              confirmation:buildMutationConfirmation(
                created.state,operationId,created.revision,upsertIds,data.deletes,activityIds,
              ),
              shared:true,workspace,
            };
          } else {
            const updated = await tx.appState.updateMany({
              where:{id:current.id,revision:data.expectedRevision},
              data:{state:nextState.data as Prisma.InputJsonValue,revision:{increment:1}},
            });
            if (updated.count !== 1) {
              return {status:409,body:{
                error:'STATE_CONFLICT',revision:current.revision,updatedAt:current.updatedAt,
              }};
            }
            let normalization = {active:false,reconciled:false} as Awaited<ReturnType<typeof synchronizeNormalizedRows>>;
            if (changedIds.length) {
              normalization = await synchronizeNormalizedRows(tx,nextState.data,{
                workspaceId:context.workspaceId,userId:context.workspace.ownerId,
                revision:current.revision+1,
              },changedIds);
            }
            const saved = await tx.appState.findUniqueOrThrow({
              where:{id:current.id},
              select:{state:true,revision:true,updatedAt:true},
            });
            response = {
              revision:saved.revision,updatedAt:saved.updatedAt,changed:true,
              upserted:data.upserts.length,deleted:data.deletes.length,
              activitiesMerged:data.activities.length,activityLogUpdated:activityPatch,
              confirmation:buildMutationConfirmation(
                saved.state,operationId,saved.revision,upsertIds,data.deletes,activityIds,
              ),
              normalization,shared:true,workspace,
            };
          }
        }

        // Se o INSERT falhar, a alteracao do AppState e do espelho reverte.
        await tx.cloudMutationReceipt.create({data:receiptCreateData({
          workspaceId:context.workspaceId,operationId,requestHash,
          mutationType:'transactions',revision:Number(response.revision||0),response,
        })});
        return {status:200,body:response};
      }, {
        isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
        maxWait:10_000,timeout:120_000,
      });
      return reply.status(result.status).send(result.body);
    } catch (error) {
      const normalizationCode = normalizationWriteConflictCode(error);
      if (normalizationCode) {
        const latest = await prisma.appState.findUnique({
          where:{workspaceId:context.workspaceId},
          select:{revision:true},
        });
        return reply.status(409).send(
          normalizationWriteConflictPayload(normalizationCode,latest?.revision || 0),
        );
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError
        && ['P2002','P2034','P2025'].includes(error.code)) {
        // Uma segunda tentativa concorrente pode ter sido confirmada primeiro.
        const prior = await findMutationReceipt(context.workspaceId,operationId,requestHash);
        if (prior?.conflict) return reply.status(409).send({
          error:'OPERATION_ID_REUSED',operationId,
        });
        if (prior?.response) {
          return {...(prior.response as Record<string,unknown>),replayed:true};
        }
        const latest = await prisma.appState.findUnique({
          where:{workspaceId:context.workspaceId},
          select:{revision:true,updatedAt:true},
        });
        return reply.status(409).send({
          error:'STATE_CONFLICT',revision:latest?.revision || 0,
          updatedAt:latest?.updatedAt || null,
        });
      }
      throw error;
    }
  });

  // O mesmo escritor atomico de propriedades ja validado no QA preserva a
  // resposta HTTP legada. Integrar aqui exige gates de compatibilidade antes
  // de qualquer merge/deploy: nenhum bypass para escrita nao atomica.
  app.patch('/properties', { preHandler: app.authorize(['ADMIN', 'MANAGER', 'OPERATOR']) }, async (request, reply) => {
    const parsed = statePropertiesPatchSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({
      error:'INVALID_STATE_PROPERTIES_PATCH',details:parsed.error.flatten(),
    });
    const context = await resolveWorkspaceContext(request.user.sub);
    if (!await assertWriteAccess(context.workspaceId,reply)) return;
    const result = await stage10QaPatchPropertiesAtomically({
      workspaceId:context.workspaceId,
      ownerId:context.workspace.ownerId,
      workspaceName:context.workspace.name,
    },parsed.data,(next)=>{
      const validated = stateSchema.safeParse(next);
      return validated.success
        ? {ok:true as const,data:validated.data as Prisma.InputJsonValue}
        : {ok:false as const,details:validated.error.flatten()};
    });
    return reply.status(result.status).send(result.body);
  });

  app.put('/', { preHandler: app.authorize(['ADMIN', 'MANAGER', 'OPERATOR']) }, async (request, reply) => {
    const parsed = putSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_APP_STATE', details: parsed.error.flatten() });

    const context = await resolveWorkspaceContext(request.user.sub);
    if (!await assertWriteAccess(context.workspaceId, reply)) return;
    const current = await prisma.appState.findUnique({
      where: { workspaceId: context.workspaceId },
      select: { id: true, state: true, revision: true, updatedAt: true }
    });
    if (current && isNormalizedPrimary(current.state) && parsed.data.expectedRevision === undefined) {
      return reply.status(409).send({ error: 'NORMALIZATION_EXPECTED_REVISION_REQUIRED', revision: current.revision, updatedAt: current.updatedAt });
    }
    if (current && parsed.data.expectedRevision !== undefined && current.revision !== parsed.data.expectedRevision) {
      return reply.status(409).send({ error: 'STATE_CONFLICT', revision: current.revision, updatedAt: current.updatedAt });
    }

    const currentState = current?.state && typeof current.state === 'object' && !Array.isArray(current.state)
      ? current.state as Record<string, unknown>
      : null;
    const managedNormalization = currentState?.[NORMALIZATION_METADATA_KEY];
    // PUT nao expressa exclusao: a ausencia de uma ID preserva o espelho atual.
    // Arquivar exige PATCH /transactions com deletes explicitos e as guardas
    // financeiras de synchronizeNormalizedRows, nunca omissao em PUT.
    const currentTransactions = Array.isArray(currentState?.transactions)
      ? currentState.transactions as Array<Record<string, unknown>>
      : [];
    const currentById = new Map(currentTransactions.map(item => [String(item?.id || ''), item]));
    // O PUT sincroniza somente IDs realmente alteradas no payload. Eventos
    // omitidos ou reenviados sem mudanca nao podem sofrer side effects.
    const putChangedIds = [...new Set(parsed.data.state.transactions
      .filter(item => JSON.stringify(canonical(currentById.get(item.id))) !== JSON.stringify(canonical(item)))
      .map(item => item.id))];
    const transactions = currentState
      ? applyTransactionPatch(currentState, parsed.data.state.transactions, []).transactions as typeof parsed.data.state.transactions
      : parsed.data.state.transactions;
    const partialPutState = { ...parsed.data.state, transactions };
    const nextState = managedNormalization
      ? { ...partialPutState, [NORMALIZATION_METADATA_KEY]: managedNormalization }
      : partialPutState;
    const jsonState = nextState as Prisma.InputJsonValue;
    let normalization = { active: false, reconciled: false } as Awaited<ReturnType<typeof synchronizeNormalizedRows>>;
    let saved: { revision: number; updatedAt: Date };
    try {
      saved = current
      ? await prisma.$transaction(async (tx) => {
          const updated = await tx.appState.update({
            where: { id: current.id, revision: current.revision },
            data: { state: jsonState, revision: { increment: 1 } },
            select: { revision: true, updatedAt: true }
          });
          normalization = await synchronizeNormalizedRows(tx, nextState, {
            workspaceId: context.workspaceId,
            userId: context.workspace.ownerId,
            revision: updated.revision,
          }, putChangedIds);
          return updated;
        }, { maxWait: 10_000, timeout: 120_000 })
      : await prisma.appState.create({
          data: { userId: context.workspace.ownerId, workspaceId: context.workspaceId, state: jsonState, revision: 1 },
          select: { revision: true, updatedAt: true }
        });
    } catch (error) {
      const code = normalizationWriteConflictCode(error);
      if (code) return reply.status(409).send(normalizationWriteConflictPayload(code, current?.revision || 0));
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return reply.status(409).send({ error: 'STATE_CONFLICT', revision: current?.revision || 0 });
      }
      throw error;
    }
    return { revision: saved.revision, updatedAt: saved.updatedAt, normalization, shared: true, workspace: { id: context.workspace.id, name: context.workspace.name } };
  });
}
