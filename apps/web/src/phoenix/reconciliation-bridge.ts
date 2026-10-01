import { financeClient, type FinancialEvent } from '../app/finance-client';
import type { PhoenixReadModel } from './contracts';
import { getPhoenixRuntimeWriteCapabilities } from './data/phoenix-write-gateway';
import { loadPhoenixReadModel } from './data/load-phoenix-read-model';

export type PhoenixReconciliationBalance = {
  accountId: string;
  accountName: string;
  accountType: string;
  date: string;
  available: number;
};

export type PreparedPhoenixReconciliationAdjustment = {
  operationId: string;
  refreshMonth: string;
  payload: {
    description: string;
    type: 'income' | 'expense';
    status: 'confirmed';
    date: string;
    amount: number;
    accountId: string;
    notes: string;
  };
};

export type PhoenixReconciliationWriteResult =
  | { status: 'confirmed'; operationId: string; event: FinancialEvent; snapshot: PhoenixReadModel }
  | { status: 'error'; operationId: string; code: string; message: string };

function operationId(existing?: string) {
  if (existing) return existing;
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `phoenix-reconcile-${uuid}` : `phoenix-reconcile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function writeErrorCode(error: unknown) {
  if (error && typeof error === 'object') {
    if ('body' in error) {
      const body = (error as { body?: unknown }).body;
      if (body && typeof body === 'object' && 'error' in body) {
        return String((body as { error?: unknown }).error || 'PHOENIX_RECONCILIATION_WRITE_FAILED');
      }
    }
    if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
      const message = String((error as { message: string }).message);
      const match = message.match(/POSSIBLE_DUPLICATE|OPERATION_ID_REUSED|INVALID_ACCOUNT|FORBIDDEN/);
      if (match) return match[0];
    }
  }
  return 'PHOENIX_RECONCILIATION_WRITE_FAILED';
}

function writeErrorMessage(code: string) {
  const messages: Record<string, string> = {
    PHOENIX_RECONCILIATION_WRITE_NOT_ENABLED: 'A gravação da conciliação ainda não está liberada neste ambiente.',
    POSSIBLE_DUPLICATE: 'Possível ajuste duplicado detectado. Revise a conciliação antes de repetir.',
    OPERATION_ID_REUSED: 'Esta tentativa já foi processada com dados diferentes. Refaça a comparação antes de tentar novamente.',
    INVALID_ACCOUNT: 'A conta selecionada não está mais disponível.',
    FORBIDDEN: 'Seu perfil não possui permissão para registrar ajustes de conciliação.',
    PHOENIX_RECONCILIATION_WRITE_FAILED: 'A base não confirmou o ajuste de conciliação.',
  };
  return messages[code] || code;
}

export async function readPhoenixReconciliationBalance(accountId: string, date: string): Promise<PhoenixReconciliationBalance> {
  return financeClient.getMonetaryBalance(accountId, date);
}

export function preparePhoenixReconciliationAdjustment(input: {
  refreshMonth: string;
  accountId: string;
  date: string;
  difference: number;
  megBalance: number;
  bankBalance: number;
  existingOperationId?: string;
}): PreparedPhoenixReconciliationAdjustment {
  if (!input.accountId) throw new Error('PHOENIX_RECONCILIATION_ACCOUNT_REQUIRED');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('PHOENIX_RECONCILIATION_DATE_REQUIRED');
  if (!Number.isFinite(input.difference) || Math.abs(input.difference) < 0.005) throw new Error('PHOENIX_RECONCILIATION_NO_DIFFERENCE');

  const amount = Math.round(Math.abs(input.difference) * 100) / 100;
  return {
    operationId: operationId(input.existingOperationId),
    refreshMonth: input.refreshMonth,
    payload: {
      description: 'AJUSTE DE CONCILIAÇÃO BANCÁRIA',
      type: input.difference > 0 ? 'income' : 'expense',
      status: 'confirmed',
      date: input.date,
      amount,
      accountId: input.accountId,
      notes: `Conciliação manual Phoenix V15. Saldo MEG antes do ajuste: ${input.megBalance.toFixed(2)}. Saldo real informado: ${input.bankBalance.toFixed(2)}.`,
    },
  };
}

export async function runPhoenixReconciliationAdjustment(
  prepared: PreparedPhoenixReconciliationAdjustment,
): Promise<PhoenixReconciliationWriteResult> {
  const capabilities = await getPhoenixRuntimeWriteCapabilities(true);
  if (!capabilities.simpleEvent) {
    return {
      status: 'error',
      operationId: prepared.operationId,
      code: 'PHOENIX_RECONCILIATION_WRITE_NOT_ENABLED',
      message: writeErrorMessage('PHOENIX_RECONCILIATION_WRITE_NOT_ENABLED'),
    };
  }

  try {
    const event = await financeClient.createEvent({
      ...prepared.payload,
      operationId: prepared.operationId,
    });
    const snapshot = await loadPhoenixReadModel(prepared.refreshMonth, { force: true, forceStatic: true });
    return { status: 'confirmed', operationId: prepared.operationId, event, snapshot };
  } catch (error) {
    const code = writeErrorCode(error);
    return {
      status: 'error',
      operationId: prepared.operationId,
      code,
      message: writeErrorMessage(code),
    };
  }
}
