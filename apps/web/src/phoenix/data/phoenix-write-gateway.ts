import { financeClient, type FinancialEvent, type FinancialEventInput } from '../../app/finance-client';
import type { PhoenixReadModel } from '../contracts';
import { clearPhoenixReadModelCache, loadPhoenixReadModel } from './load-phoenix-read-model';

export const PHOENIX_WRITE_CAPABILITIES = {
  simpleEvent: false,
} as const;

export type PhoenixWriteStatus = 'idle' | 'saving' | 'confirmed' | 'error';

export type PhoenixSimpleEventInput = Omit<FinancialEventInput, 'type' | 'status'> & {
  type: 'income' | 'expense';
  status: 'planned' | 'paid';
};

export type PreparedPhoenixSimpleEvent = {
  operationId: string;
  payload: PhoenixSimpleEventInput;
  preparedAt: string;
};

export type PhoenixWriteState =
  | { status: 'idle' }
  | { status: 'saving'; operationId: string }
  | { status: 'confirmed'; operationId: string; event: FinancialEvent; snapshot: PhoenixReadModel }
  | { status: 'error'; operationId: string; code: string; message: string };

export class PhoenixWriteError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function operationId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `phoenix-event-${uuid}`;
  const random = Math.random().toString(36).slice(2, 14);
  return `phoenix-event-${Date.now().toString(36)}-${random}`;
}

function assertSimpleEvent(input: PhoenixSimpleEventInput) {
  if (!input.description.trim()) throw new PhoenixWriteError('PHOENIX_DESCRIPTION_REQUIRED');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new PhoenixWriteError('PHOENIX_POSITIVE_AMOUNT_REQUIRED');
  if (!input.date || !/^\d{4}-\d{2}-\d{2}/.test(input.date)) throw new PhoenixWriteError('PHOENIX_VALID_DATE_REQUIRED');
  if (!input.accountId) throw new PhoenixWriteError('PHOENIX_ACCOUNT_REQUIRED');
  if (!input.paymentMethodId) throw new PhoenixWriteError(input.type === 'income' ? 'PHOENIX_RECEIPT_METHOD_REQUIRED' : 'PHOENIX_PAYMENT_METHOD_REQUIRED');
  if (input.type === 'expense' && !input.categoryId) throw new PhoenixWriteError('PHOENIX_EXPENSE_CATEGORY_REQUIRED');
  if (!['planned', 'paid'].includes(input.status)) throw new PhoenixWriteError('PHOENIX_SIMPLE_STATUS_NOT_ALLOWED');
}

export function preparePhoenixSimpleEvent(input: PhoenixSimpleEventInput, existingOperationId?: string): PreparedPhoenixSimpleEvent {
  assertSimpleEvent(input);
  return {
    operationId: existingOperationId || operationId(),
    payload: {
      ...input,
      description: input.description.trim(),
      notes: input.notes?.trim() || undefined,
    },
    preparedAt: new Date().toISOString(),
  };
}

export function phoenixWriteMessage(code: string) {
  const messages: Record<string, string> = {
    PHOENIX_WRITE_NOT_ENABLED: 'A gravação financeira da Phoenix ainda não foi liberada neste ambiente.',
    PHOENIX_DESCRIPTION_REQUIRED: 'Informe a descrição do lançamento.',
    PHOENIX_POSITIVE_AMOUNT_REQUIRED: 'Informe um valor maior que zero. Estornos continuam bloqueados nesta etapa.',
    PHOENIX_VALID_DATE_REQUIRED: 'Informe uma data válida.',
    PHOENIX_ACCOUNT_REQUIRED: 'Selecione a conta.',
    PHOENIX_RECEIPT_METHOD_REQUIRED: 'Selecione a forma de recebimento.',
    PHOENIX_PAYMENT_METHOD_REQUIRED: 'Selecione a forma de pagamento.',
    PHOENIX_EXPENSE_CATEGORY_REQUIRED: 'Selecione a classificação e o grupo da despesa.',
    PHOENIX_SIMPLE_STATUS_NOT_ALLOWED: 'A situação informada não pertence ao primeiro fluxo de gravação.',
    INVALID_ACCOUNT: 'A conta selecionada não está mais disponível.',
    INVALID_CATEGORY: 'A classificação ou grupo selecionado não está mais disponível.',
    INVALID_PAYMENT_METHOD: 'A forma de pagamento ou recebimento não está mais disponível.',
    OPERATION_ID_REUSED: 'A tentativa de reenvio não corresponde ao lançamento original. Revise os dados antes de tentar novamente.',
    TRANSFER_CONTRACT_NOT_READY: 'Transferências ainda não estão liberadas neste fluxo.',
  };
  return messages[code] || 'Não foi possível confirmar o lançamento no servidor. Os dados foram mantidos para nova tentativa.';
}

function writeErrorCode(error: unknown) {
  if (error instanceof PhoenixWriteError) return error.code;
  if (error instanceof Error && error.message) return error.message;
  return 'PHOENIX_WRITE_FAILED';
}

export async function submitPhoenixSimpleEvent(
  prepared: PreparedPhoenixSimpleEvent,
  refreshMonth: string,
): Promise<{ event: FinancialEvent; snapshot: PhoenixReadModel }> {
  if (!PHOENIX_WRITE_CAPABILITIES.simpleEvent) throw new PhoenixWriteError('PHOENIX_WRITE_NOT_ENABLED');
  assertSimpleEvent(prepared.payload);

  const event = await financeClient.createEvent({
    ...prepared.payload,
    operationId: prepared.operationId,
  });

  clearPhoenixReadModelCache();
  const snapshot = await loadPhoenixReadModel(refreshMonth, { force: true });
  return { event, snapshot };
}

export async function runPhoenixSimpleEventWrite(
  prepared: PreparedPhoenixSimpleEvent,
  refreshMonth: string,
  onState?: (state: PhoenixWriteState) => void,
): Promise<PhoenixWriteState> {
  onState?.({ status: 'saving', operationId: prepared.operationId });
  try {
    const { event, snapshot } = await submitPhoenixSimpleEvent(prepared, refreshMonth);
    const confirmed: PhoenixWriteState = { status: 'confirmed', operationId: prepared.operationId, event, snapshot };
    onState?.(confirmed);
    return confirmed;
  } catch (error) {
    const code = writeErrorCode(error);
    const failed: PhoenixWriteState = {
      status: 'error',
      operationId: prepared.operationId,
      code,
      message: phoenixWriteMessage(code),
    };
    onState?.(failed);
    return failed;
  }
}
