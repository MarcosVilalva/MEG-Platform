/**
 * Etapa 10 QA only: atomic PATCH /app-state/properties candidate.
 * Both AppState and CloudMutationReceipt MUST commit in the same transaction.
 * The shared legacy route retains its original behavior outside isolated QA.
 */
import { Prisma, prisma } from '@meg/database';
import { mutationRequestHash, receiptCreateData } from './mutation-receipt';

export type Stage10QaPropertiesPatch = {
  operationId: string;
  expectedRevision: number;
  properties: Record<string, unknown>;
};

export type Stage10QaPropertiesContext = {
  workspaceId: string;
  ownerId: string;
  workspaceName: string;
};

export type Stage10QaValidatedState =
  | { ok: true; data: Prisma.InputJsonValue }
  | { ok: false; details: unknown };

export type Stage10QaPropertiesOutcome = {
  status: 200 | 400 | 409;
  body: Record<string, unknown>;
};

function failed(code: string, revision: number, updatedAt: Date | null): Stage10QaPropertiesOutcome {
  return { status: 409, body: { error: code, revision, updatedAt } };
}

function prismaErrorCode(error: unknown, code: string) {
  return Boolean(error && typeof error === 'object' && 'code' in error
    && (error as { code?: unknown }).code === code);
}

function previousReceiptOutcome(
  previous: { requestHash: string; response: Prisma.JsonValue } | null,
  requestHash: string,
  operationId: string,
): Stage10QaPropertiesOutcome | null {
  if (!previous) return null;
  if (previous.requestHash !== requestHash) {
    return { status: 409, body: { error: 'OPERATION_ID_REUSED', operationId } };
  }
  if (!previous.response || typeof previous.response !== 'object' || Array.isArray(previous.response)) {
    throw new Error('QA_PROPERTIES_RECEIPT_CORRUPTED');
  }
  return { status: 200, body: { ...(previous.response as Record<string, unknown>), replayed: true } };
}

/**
 * Caller must enforce app authorization, workspace identity and isolated QA gate.
 * Validator is provided by the existing route's unchanged stateSchema.
 */
export async function stage10QaPatchPropertiesAtomically(
  context: Stage10QaPropertiesContext,
  input: Stage10QaPropertiesPatch,
  validate: (value: unknown) => Stage10QaValidatedState,
): Promise<Stage10QaPropertiesOutcome> {
  const requestHash = mutationRequestHash(input);
  const unique = { workspaceId_operationId: {
    workspaceId: context.workspaceId,
    operationId: input.operationId,
  } };
  const workspace = { id: context.workspaceId, name: context.workspaceName };

  try {
    return await prisma.$transaction(async (tx) => {
      // Read and write the idempotency receipt in the same SERIALIZABLE transaction.
      const previous = await tx.cloudMutationReceipt.findUnique({ where: unique });
      const replay = previousReceiptOutcome(previous, requestHash, input.operationId);
      if (replay) return replay;

      const current = await tx.appState.findUnique({
        where: { workspaceId: context.workspaceId },
        select: { id: true, state: true, revision: true, updatedAt: true },
      });
      const currentRevision = current?.revision || 0;
      if (currentRevision !== input.expectedRevision) {
        return failed('STATE_CONFLICT', currentRevision, current?.updatedAt || null);
      }

      const currentState = current?.state && typeof current.state === 'object'
        && !Array.isArray(current.state)
        ? current.state as Record<string, unknown>
        : { transactions: [], budgets: {} };
      const parsed = validate({ ...currentState, ...input.properties });
      if (!parsed.ok) {
        return { status: 400, body: { error: 'INVALID_APP_STATE_PROPERTIES', details: parsed.details } };
      }
      // A leitura do PostgreSQL jsonb pode reordenar chaves. Comparacao
      // nao canonica criaria revisoes e recibos de alteracao ficticia.
      const changed = mutationRequestHash(currentState) !== mutationRequestHash(parsed.data);
      let revision = currentRevision;
      let updatedAt: Date | null = current?.updatedAt || null;

      if (changed && !current) {
        const created = await tx.appState.create({
          data: {
            userId: context.ownerId,
            workspaceId: context.workspaceId,
            state: parsed.data,
            revision: 1,
          },
          select: { revision: true, updatedAt: true },
        });
        revision = created.revision;
        updatedAt = created.updatedAt;
      } else if (changed && current) {
        const updated = await tx.appState.updateMany({
          where: { id: current.id, revision: input.expectedRevision },
          data: { state: parsed.data, revision: { increment: 1 } },
        });
        if (updated.count !== 1) {
          return failed('STATE_CONFLICT', currentRevision, current.updatedAt);
        }
        const saved = await tx.appState.findUniqueOrThrow({
          where: { id: current.id }, select: { revision: true, updatedAt: true },
        });
        revision = saved.revision;
        updatedAt = saved.updatedAt;
      }

      const body = {
        operationId: input.operationId,
        revision,
        updatedAt,
        changed,
        propertyNames: Object.keys(input.properties),
        shared: true,
        workspace,
      };
      // If this receipt INSERT fails, ALL changes to AppState roll back.
      await tx.cloudMutationReceipt.create({
        data: receiptCreateData({
          workspaceId: context.workspaceId,
          operationId: input.operationId,
          requestHash,
          mutationType: 'state-properties',
          revision,
          response: body,
        }),
      });
      return { status: 200, body };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 120_000,
    });
  } catch (error) {
    // Concurrent duplicate: the losing transaction must not duplicate a commit.
    if (prismaErrorCode(error, 'P2002')) {
      const previous = await prisma.cloudMutationReceipt.findUnique({ where: unique });
      const replay = previousReceiptOutcome(previous, requestHash, input.operationId);
      if (replay) return replay;
    }
    if (prismaErrorCode(error, 'P2002') || prismaErrorCode(error, 'P2034')) {
      const latest = await prisma.appState.findUnique({
        where: { workspaceId: context.workspaceId },
        select: { revision: true, updatedAt: true },
      });
      return failed('STATE_CONFLICT', latest?.revision || 0, latest?.updatedAt || null);
    }
    // Fail closed; no fallback to legacy mutation or fabricated success.
    throw error;
  }
}
