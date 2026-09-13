import { payablesClient } from '../../app/payables-client';
import type { PhoenixReadModel } from '../contracts';
import { clearPhoenixReadModelCache, loadPhoenixReadModel } from './load-phoenix-read-model';

export const PHOENIX_PAYABLE_WRITE_ENABLED = false as const;

export type PhoenixPayablePaymentInput = {
  payableId: string;
  amount: number;
  paidAt: string;
  accountId: string;
  paymentMethodId: string;
  interestAmount?: number;
  fineAmount?: number;
  notes?: string;
};

export type PreparedPhoenixPayablePayment = {
  operationId: string;
  payload: PhoenixPayablePaymentInput;
  preparedAt: string;
};

export type PhoenixPayableWriteState =
  | { status: 'idle' }
  | { status: 'saving'; operationId: string }
  | { status: 'confirmed'; operationId: string; result: unknown; snapshot: PhoenixReadModel }
  | { status: 'error'; operationId: string; code: string; message: string };

export class PhoenixPayableWriteError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function nextOperationId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `phoenix-payable-${uuid}`;
  return `phoenix-payable-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function assertInput(input: PhoenixPayablePaymentInput) {
  if (!input.payableId) throw new PhoenixPayableWriteError('PHOENIX_PAYABLE_REQUIRED');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new PhoenixPayableWriteError('PHOENIX_PAYABLE_AMOUNT_REQUIRED');
  if (!/^\d{4}-\d{2}-\d{2}/.test(input.paidAt)) throw new PhoenixPayableWriteError('PHOENIX_PAYABLE_DATE_REQUIRED');
  if (!input.accountId) throw new PhoenixPayableWriteError('PHOENIX_PAYABLE_ACCOUNT_REQUIRED');
  if (!input.paymentMethodId) throw new PhoenixPayableWriteError('PHOENIX_PAYABLE_METHOD_REQUIRED');
  if ((input.interestAmount || 0) < 0 || (input.fineAmount || 0) < 0) throw new PhoenixPayableWriteError('PHOENIX_PAYABLE_ADDITIONAL_VALUE_INVALID');
}

export function preparePhoenixPayablePayment(
  input: PhoenixPayablePaymentInput,
  existingOperationId?: string,
): PreparedPhoenixPayablePayment {
  assertInput(input);
  return {
    operationId: existingOperationId || nextOperationId(),
    payload: {
      ...input,
      notes: input.notes?.trim() || undefined,
      interestAmount: input.interestAmount || 0,
      fineAmount: input.fineAmount || 0,
    },
    preparedAt: new Date().toISOString(),
  };
}

function message(code: string) {
  const messages: Record<string, string> = {
    PHOENIX_PAYABLE_WRITE_NOT_ENABLED: 'A baixa real de pendentes ainda está aguardando o gate da API.',
    PHOENIX_PAYABLE_REQUIRED: 'Selecione uma conta pendente válida.',
    PHOENIX_PAYABLE_AMOUNT_REQUIRED: 'Informe um valor de baixa maior que zero.',
    PHOENIX_PAYABLE_DATE_REQUIRED: 'Informe a data do pagamento.',
    PHOENIX_PAYABLE_ACCOUNT_REQUIRED: 'Selecione a conta financeira usada no pagamento.',
    PHOENIX_PAYABLE_METHOD_REQUIRED: 'Selecione a forma de pagamento.',
    PHOENIX_PAYABLE_ADDITIONAL_VALUE_INVALID: 'Juros e multa não podem ser negativos.',
    PAYABLE_NOT_FOUND: 'A conta já foi baixada, cancelada ou não está mais disponível.',
    AMOUNT_EXCEEDS_OPEN_BALANCE: 'O valor informado ultrapassa o saldo ainda aberto da conta.',
    INVALID_ACCOUNT: 'A conta financeira selecionada não está mais disponível.',
    INVALID_PAYMENT_METHOD: 'A forma de pagamento selecionada não está mais disponível.',
    OPERATION_ID_REUSED: 'O reenvio não corresponde à baixa original. Revise os dados antes de tentar novamente.',
  };
  return messages[code] || 'Não foi possível confirmar a baixa no servidor. Os dados foram mantidos para nova tentativa.';
}

function codeFromError(error: unknown) {
  if (error instanceof PhoenixPayableWriteError) return error.code;
  if (error instanceof Error && error.message) return error.message;
  return 'PHOENIX_PAYABLE_WRITE_FAILED';
}

export async function runPhoenixPayablePayment(
  prepared: PreparedPhoenixPayablePayment,
  refreshMonth: string,
  onState?: (state: PhoenixPayableWriteState) => void,
): Promise<PhoenixPayableWriteState> {
  onState?.({ status: 'saving', operationId: prepared.operationId });
  try {
    if (!PHOENIX_PAYABLE_WRITE_ENABLED) throw new PhoenixPayableWriteError('PHOENIX_PAYABLE_WRITE_NOT_ENABLED');
    assertInput(prepared.payload);
    const { payableId, ...payload } = prepared.payload;
    const result = await payablesClient.pay(payableId, { ...payload, operationId: prepared.operationId });
    clearPhoenixReadModelCache();
    const snapshot = await loadPhoenixReadModel(refreshMonth, { force: true });
    const confirmed: PhoenixPayableWriteState = { status: 'confirmed', operationId: prepared.operationId, result, snapshot };
    onState?.(confirmed);
    return confirmed;
  } catch (error) {
    const code = codeFromError(error);
    const failed: PhoenixPayableWriteState = { status: 'error', operationId: prepared.operationId, code, message: message(code) };
    onState?.(failed);
    return failed;
  }
}
