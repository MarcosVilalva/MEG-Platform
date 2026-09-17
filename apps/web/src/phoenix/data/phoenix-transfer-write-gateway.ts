import { authenticatedRequest } from '../../app/auth-client';
import type { PhoenixReadModel } from '../contracts';
import { getPhoenixRuntimeWriteCapabilities } from './phoenix-write-gateway';
import { clearPhoenixReadModelCache, loadPhoenixReadModel } from './load-phoenix-read-model';

export const PHOENIX_TRANSFER_WRITE_ENABLED = true as const;

export type PhoenixTransferInput = {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: string;
  description?: string;
  notes?: string;
};

export type PreparedPhoenixTransfer = {
  operationId: string;
  payload: PhoenixTransferInput;
  preparedAt: string;
};

export type PhoenixTransferResult = {
  transferId: string;
  sourceEventId: string;
  destinationEventId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: string;
  sourceBalanceBefore: number;
  sourceBalanceAfter: number;
  idempotentReplay?: boolean;
};

export type PhoenixTransferWriteState =
  | { status: 'idle' }
  | { status: 'saving'; operationId: string }
  | { status: 'confirmed'; operationId: string; result: PhoenixTransferResult; snapshot: PhoenixReadModel }
  | { status: 'error'; operationId: string; code: string; message: string };

export class PhoenixTransferWriteError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function nextOperationId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `phoenix-transfer-${uuid}`;
  return `phoenix-transfer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function assertTransfer(input: PhoenixTransferInput) {
  if (!input.sourceAccountId) throw new PhoenixTransferWriteError('INVALID_SOURCE_ACCOUNT');
  if (!input.destinationAccountId) throw new PhoenixTransferWriteError('INVALID_DESTINATION_ACCOUNT');
  if (input.sourceAccountId === input.destinationAccountId) throw new PhoenixTransferWriteError('SAME_TRANSFER_ACCOUNT');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new PhoenixTransferWriteError('PHOENIX_TRANSFER_POSITIVE_AMOUNT_REQUIRED');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new PhoenixTransferWriteError('INVALID_TRANSFER_DATE');
  if (input.description !== undefined && input.description.trim().length < 2) throw new PhoenixTransferWriteError('PHOENIX_DESCRIPTION_REQUIRED');
}

export function preparePhoenixTransfer(input: PhoenixTransferInput, existingOperationId?: string): PreparedPhoenixTransfer {
  assertTransfer(input);
  return {
    operationId: existingOperationId || nextOperationId(),
    payload: {
      ...input,
      description: input.description?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    },
    preparedAt: new Date().toISOString(),
  };
}

export function phoenixTransferWriteMessage(code: string) {
  const messages: Record<string, string> = {
    PHOENIX_TRANSFER_WRITE_NOT_ENABLED: 'A gravação de transferências ainda não foi liberada neste ambiente.',
    PHOENIX_TRANSFER_POSITIVE_AMOUNT_REQUIRED: 'Informe um valor maior que zero para a transferência.',
    PHOENIX_DESCRIPTION_REQUIRED: 'Informe uma descrição válida para a transferência.',
    INVALID_SOURCE_ACCOUNT: 'A conta de origem não está mais disponível.',
    INVALID_DESTINATION_ACCOUNT: 'A conta de destino não está mais disponível.',
    SAME_TRANSFER_ACCOUNT: 'Escolha contas diferentes para origem e destino.',
    SOURCE_ACCOUNT_NOT_MONETARY: 'A conta de origem não aceita transferência monetária.',
    DESTINATION_ACCOUNT_NOT_MONETARY: 'A conta de destino não aceita transferência monetária.',
    INSUFFICIENT_SOURCE_ACCOUNT_BALANCE: 'O saldo disponível na conta de origem é insuficiente para esta transferência.',
    FUTURE_TRANSFER_NOT_ALLOWED: 'A transferência não pode ser registrada em data futura.',
    INVALID_TRANSFER_DATE: 'Informe uma data válida para a transferência.',
    OPERATION_ID_REUSED: 'A tentativa atual não corresponde à transferência original. Revise os dados antes de tentar novamente.',
  };
  return messages[code] || 'Não foi possível confirmar a transferência no servidor. Os dados foram mantidos para nova tentativa.';
}

function transferErrorCode(error: unknown) {
  if (error instanceof PhoenixTransferWriteError) return error.code;
  if (error instanceof Error && error.message) return error.message;
  return 'PHOENIX_TRANSFER_WRITE_FAILED';
}

async function confirmedSnapshot(refreshMonth: string) {
  clearPhoenixReadModelCache();
  return loadPhoenixReadModel(refreshMonth, { force: true });
}

export async function submitPhoenixTransfer(
  prepared: PreparedPhoenixTransfer,
  refreshMonth: string,
): Promise<{ result: PhoenixTransferResult; snapshot: PhoenixReadModel }> {
  if (!PHOENIX_TRANSFER_WRITE_ENABLED) throw new PhoenixTransferWriteError('PHOENIX_TRANSFER_WRITE_NOT_ENABLED');
  const runtimeCapabilities = await getPhoenixRuntimeWriteCapabilities(true);
  if (!runtimeCapabilities.transferWrite) throw new PhoenixTransferWriteError('PHOENIX_TRANSFER_WRITE_NOT_ENABLED');
  assertTransfer(prepared.payload);

  const result = await authenticatedRequest<PhoenixTransferResult>('/finance/transfers', {
    method: 'POST',
    body: JSON.stringify({ ...prepared.payload, operationId: prepared.operationId }),
  });
  const snapshot = await confirmedSnapshot(refreshMonth);
  return { result, snapshot };
}

export async function runPhoenixTransferWrite(
  prepared: PreparedPhoenixTransfer,
  refreshMonth: string,
  onState?: (state: PhoenixTransferWriteState) => void,
): Promise<PhoenixTransferWriteState> {
  onState?.({ status: 'saving', operationId: prepared.operationId });
  try {
    const { result, snapshot } = await submitPhoenixTransfer(prepared, refreshMonth);
    const confirmed: PhoenixTransferWriteState = { status: 'confirmed', operationId: prepared.operationId, result, snapshot };
    onState?.(confirmed);
    return confirmed;
  } catch (error) {
    const code = transferErrorCode(error);
    const failed: PhoenixTransferWriteState = {
      status: 'error',
      operationId: prepared.operationId,
      code,
      message: phoenixTransferWriteMessage(code),
    };
    onState?.(failed);
    return failed;
  }
}
