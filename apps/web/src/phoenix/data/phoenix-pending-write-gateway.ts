import { authenticatedRequest } from '../../app/auth-client';
import { cardsClient } from '../../app/cards-client';
import { payablesClient } from '../../app/payables-client';
import type { PhoenixReadModel } from '../contracts';
import { loadPhoenixReadModel } from './load-phoenix-read-model';

export const PHOENIX_PENDING_WRITE_ENABLED = true as const;

export type PhoenixPendingSource = 'payable' | 'event' | 'card';

export type PhoenixPendingSettlementInput = {
  source: PhoenixPendingSource;
  sourceId: string;
  amount: number;
  paidAt: string;
  accountId: string;
  paymentMethodId: string;
  statementMonth?: string;
};

export type PhoenixPendingBatchItem = {
  source: PhoenixPendingSource;
  sourceId: string;
  statementMonth?: string;
};

export type PhoenixPendingBatchSettlementInput = {
  items: PhoenixPendingBatchItem[];
  paidAt: string;
  accountId: string;
  paymentMethodId: string;
};

export type PreparedPhoenixPendingSettlement = {
  operationId: string;
  payload: PhoenixPendingSettlementInput;
  fingerprint: string;
  preparedAt: string;
};

export type PreparedPhoenixPendingBatchSettlement = {
  operationId: string;
  payload: PhoenixPendingBatchSettlementInput;
  fingerprint: string;
  preparedAt: string;
};

export type PhoenixPendingWriteState =
  | { status: 'idle' }
  | { status: 'saving'; operationId: string }
  | { status: 'confirmed'; operationId: string; result: unknown; snapshot: PhoenixReadModel }
  | { status: 'error'; operationId: string; code: string; message: string };

export class PhoenixPendingWriteError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function nextOperationId(source: PhoenixPendingSource | 'batch') {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `phoenix-pending-${source}-${uuid}`;
  return `phoenix-pending-${source}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function assertCommon(paidAt: string, accountId: string, paymentMethodId: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) throw new PhoenixPendingWriteError('PHOENIX_PENDING_DATE_REQUIRED');
  if (!accountId) throw new PhoenixPendingWriteError('PHOENIX_PENDING_ACCOUNT_REQUIRED');
  if (!paymentMethodId) throw new PhoenixPendingWriteError('PHOENIX_PENDING_METHOD_REQUIRED');
}

function assertInput(input: PhoenixPendingSettlementInput) {
  if (!input.sourceId) throw new PhoenixPendingWriteError('PHOENIX_PENDING_REQUIRED');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new PhoenixPendingWriteError('PHOENIX_PENDING_AMOUNT_REQUIRED');
  assertCommon(input.paidAt, input.accountId, input.paymentMethodId);
  if (input.source === 'card' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.statementMonth || '')) {
    throw new PhoenixPendingWriteError('PHOENIX_PENDING_STATEMENT_REQUIRED');
  }
}

function assertBatchInput(input: PhoenixPendingBatchSettlementInput) {
  if (!input.items.length) throw new PhoenixPendingWriteError('PHOENIX_PENDING_REQUIRED');
  assertCommon(input.paidAt, input.accountId, input.paymentMethodId);
  const keys = new Set<string>();
  for (const item of input.items) {
    if (!item.sourceId) throw new PhoenixPendingWriteError('PHOENIX_PENDING_REQUIRED');
    if (item.source === 'card' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.statementMonth || '')) {
      throw new PhoenixPendingWriteError('PHOENIX_PENDING_STATEMENT_REQUIRED');
    }
    const key = `${item.source}|${item.sourceId}|${item.statementMonth || ''}`;
    if (keys.has(key)) throw new PhoenixPendingWriteError('PHOENIX_PENDING_DUPLICATE');
    keys.add(key);
  }
}

function fingerprint(input: PhoenixPendingSettlementInput) {
  return [
    input.source,
    input.sourceId,
    input.statementMonth || '',
    input.amount.toFixed(2),
    input.paidAt,
    input.accountId,
    input.paymentMethodId,
  ].join('|');
}

function batchFingerprint(input: PhoenixPendingBatchSettlementInput) {
  return [
    ...input.items.map((item) => `${item.source}:${item.sourceId}:${item.statementMonth || ''}`).sort(),
    input.paidAt,
    input.accountId,
    input.paymentMethodId,
  ].join('|');
}

export function preparePhoenixPendingSettlement(
  input: PhoenixPendingSettlementInput,
  previous?: PreparedPhoenixPendingSettlement | null,
): PreparedPhoenixPendingSettlement {
  assertInput(input);
  const nextFingerprint = fingerprint(input);
  if (previous?.fingerprint === nextFingerprint) return previous;
  return {
    operationId: nextOperationId(input.source),
    payload: input,
    fingerprint: nextFingerprint,
    preparedAt: new Date().toISOString(),
  };
}

export function preparePhoenixPendingBatchSettlement(
  input: PhoenixPendingBatchSettlementInput,
  previous?: PreparedPhoenixPendingBatchSettlement | null,
): PreparedPhoenixPendingBatchSettlement {
  assertBatchInput(input);
  const nextFingerprint = batchFingerprint(input);
  if (previous?.fingerprint === nextFingerprint) return previous;
  return {
    operationId: nextOperationId('batch'),
    payload: input,
    fingerprint: nextFingerprint,
    preparedAt: new Date().toISOString(),
  };
}

function friendlyMessage(code: string) {
  const messages: Record<string, string> = {
    PHOENIX_PENDING_WRITE_NOT_ENABLED: 'A baixa real de Pendentes está temporariamente bloqueada no preview.',
    PHOENIX_PENDING_REQUIRED: 'Selecione um compromisso válido.',
    PHOENIX_PENDING_DUPLICATE: 'Há uma pendência repetida na seleção. Atualize a tela e tente novamente.',
    PHOENIX_PENDING_AMOUNT_REQUIRED: 'O valor do compromisso precisa ser maior que zero.',
    PHOENIX_PENDING_DATE_REQUIRED: 'Informe a data efetiva do pagamento.',
    PHOENIX_PENDING_ACCOUNT_REQUIRED: 'Selecione a conta financeira usada no pagamento.',
    PHOENIX_PENDING_METHOD_REQUIRED: 'Selecione a forma de pagamento usada na baixa.',
    PHOENIX_PENDING_STATEMENT_REQUIRED: 'A fatura selecionada não possui uma competência válida.',
    PREVIEW_READ_ONLY: 'A baixa real de Pendentes está temporariamente bloqueada no preview.',
    PAYABLE_NOT_FOUND: 'Uma das contas já foi baixada, cancelada ou não está mais disponível.',
    FINANCIAL_EVENT_NOT_FOUND: 'Um dos compromissos não está mais disponível para baixa.',
    FINANCIAL_EVENT_NOT_PENDING: 'Um dos compromissos já foi baixado ou deixou de estar pendente.',
    FINANCIAL_EVENT_NOT_LEGACY_COMPAT: 'Um compromisso precisa ser normalizado antes da baixa por compatibilidade.',
    BENEFIT_SETTLEMENT_NOT_SUPPORTED: 'Compromissos de benefício não podem ser baixados por este fluxo.',
    CARD_NOT_FOUND: 'Um dos cartões selecionados não está mais disponível.',
    CARD_STATEMENT_ALREADY_PAID: 'Uma das faturas já foi paga ou não possui saldo aberto.',
    CARD_STATEMENT_NOT_PAYABLE: 'Uma das faturas não possui parcelas oficiais abertas para pagamento.',
    STATEMENT_CHANGED_RETRY: 'A fatura mudou durante a confirmação. Nada do lote foi gravado; atualize e tente novamente.',
    ACCOUNT_NOT_MONETARY: 'A conta selecionada não é monetária. Escolha uma conta financeira válida.',
    INVALID_ACCOUNT: 'A conta selecionada não está mais disponível.',
    INVALID_PAYMENT_METHOD: 'A forma de pagamento selecionada não está mais disponível para esta baixa.',
    AMOUNT_EXCEEDS_OPEN_BALANCE: 'O valor informado ultrapassa o saldo ainda aberto da conta.',
    INSUFFICIENT_MONETARY_BALANCE: 'O saldo monetário não cobre o total selecionado. Nenhuma baixa foi gravada.',
    OPERATION_ID_REUSED: 'A tentativa atual não corresponde à baixa original. Revise os dados antes de tentar novamente.',
  };
  return messages[code] || 'Não foi possível confirmar a baixa. Nenhuma alteração parcial deve ser considerada concluída.';
}

function codeFromError(error: unknown) {
  if (error instanceof PhoenixPendingWriteError) return error.code;
  if (error instanceof Error && error.message) return error.message;
  return 'PHOENIX_PENDING_WRITE_FAILED';
}

async function refreshConfirmed(operationId: string, result: unknown, refreshMonth: string, onState?: (state: PhoenixPendingWriteState) => void) {
  const snapshot = await loadPhoenixReadModel(refreshMonth, { force: true });
  const confirmed: PhoenixPendingWriteState = { status: 'confirmed', operationId, result, snapshot };
  onState?.(confirmed);
  return confirmed;
}

function failedState(operationId: string, error: unknown, onState?: (state: PhoenixPendingWriteState) => void) {
  const code = codeFromError(error);
  const failed: PhoenixPendingWriteState = { status: 'error', operationId, code, message: friendlyMessage(code) };
  onState?.(failed);
  return failed;
}

export async function runPhoenixPendingSettlement(
  prepared: PreparedPhoenixPendingSettlement,
  refreshMonth: string,
  onState?: (state: PhoenixPendingWriteState) => void,
): Promise<PhoenixPendingWriteState> {
  onState?.({ status: 'saving', operationId: prepared.operationId });
  try {
    if (!PHOENIX_PENDING_WRITE_ENABLED) throw new PhoenixPendingWriteError('PHOENIX_PENDING_WRITE_NOT_ENABLED');
    assertInput(prepared.payload);
    const input = prepared.payload;
    const result = input.source === 'payable'
      ? await payablesClient.pay(input.sourceId, {
          amount: input.amount,
          paidAt: input.paidAt,
          accountId: input.accountId,
          paymentMethodId: input.paymentMethodId,
          operationId: prepared.operationId,
        })
      : input.source === 'card'
        ? await cardsClient.payStatement(input.sourceId, input.statementMonth!, {
            accountId: input.accountId,
            paymentMethodId: input.paymentMethodId,
            paidAt: input.paidAt,
            operationId: prepared.operationId,
          })
        : await authenticatedRequest(`/finance/events/${input.sourceId}/settle`, {
            method: 'POST',
            body: JSON.stringify({
              paidAt: input.paidAt,
              accountId: input.accountId,
              paymentMethodId: input.paymentMethodId,
              operationId: prepared.operationId,
            }),
          });

    return await refreshConfirmed(prepared.operationId, result, refreshMonth, onState);
  } catch (error) {
    return failedState(prepared.operationId, error, onState);
  }
}

export async function runPhoenixPendingBatchSettlement(
  prepared: PreparedPhoenixPendingBatchSettlement,
  refreshMonth: string,
  onState?: (state: PhoenixPendingWriteState) => void,
): Promise<PhoenixPendingWriteState> {
  onState?.({ status: 'saving', operationId: prepared.operationId });
  try {
    if (!PHOENIX_PENDING_WRITE_ENABLED) throw new PhoenixPendingWriteError('PHOENIX_PENDING_WRITE_NOT_ENABLED');
    assertBatchInput(prepared.payload);
    const result = await authenticatedRequest('/finance/pending/batch/settle', {
      method: 'POST',
      body: JSON.stringify({ ...prepared.payload, operationId: prepared.operationId }),
    });
    return await refreshConfirmed(prepared.operationId, result, refreshMonth, onState);
  } catch (error) {
    return failedState(prepared.operationId, error, onState);
  }
}
