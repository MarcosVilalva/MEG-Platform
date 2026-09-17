import { financeClient, type FinancialEvent, type FinancialEventInput } from '../../app/finance-client';
import type { PhoenixReadModel } from '../contracts';
import { clearPhoenixReadModelCache, loadPhoenixReadModel } from './load-phoenix-read-model';

export const PHOENIX_WRITE_CAPABILITIES = {
  simpleEvent: true,
} as const;

export type PhoenixRuntimeWriteCapabilities = {
  simpleEvent: boolean;
  pendingWrite: boolean;
  bulkEventWrite: boolean;
  source: 'preview-runtime' | 'direct-build' | 'unavailable';
  checkedAt: string;
};

export type PhoenixSimpleEventFlow = {
  type: 'income' | 'expense' | 'transfer';
  negative?: boolean;
  benefit?: boolean;
  credit?: boolean;
  crediario?: boolean;
  recurring?: boolean;
  saveTemplate?: boolean;
  installments?: number;
  manualDue?: boolean;
};

export type PhoenixSimpleEventEligibility = {
  eligible: boolean;
  reasons: string[];
};

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

const RUNTIME_CAPABILITY_TTL = 15_000;
let runtimeCapabilitiesCache: PhoenixRuntimeWriteCapabilities | null = null;

function operationId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `phoenix-event-${uuid}`;
  const random = Math.random().toString(36).slice(2, 14);
  return `phoenix-event-${Date.now().toString(36)}-${random}`;
}

function emptyRuntimeCapabilities(source: PhoenixRuntimeWriteCapabilities['source']): PhoenixRuntimeWriteCapabilities {
  return {
    simpleEvent: false,
    pendingWrite: false,
    bulkEventWrite: false,
    source,
    checkedAt: new Date().toISOString(),
  };
}

function isPhoenixPreviewHost() {
  return typeof window !== 'undefined'
    && window.location.hostname.startsWith('meg-phoenix-v15-ux-preview');
}

export async function getPhoenixRuntimeWriteCapabilities(force = false): Promise<PhoenixRuntimeWriteCapabilities> {
  if (!force && runtimeCapabilitiesCache) {
    const age = Date.now() - new Date(runtimeCapabilitiesCache.checkedAt).getTime();
    if (age >= 0 && age <= RUNTIME_CAPABILITY_TTL) return runtimeCapabilitiesCache;
  }

  if (typeof window === 'undefined') {
    runtimeCapabilitiesCache = emptyRuntimeCapabilities('unavailable');
    return runtimeCapabilitiesCache;
  }

  if (!isPhoenixPreviewHost()) {
    runtimeCapabilitiesCache = {
      simpleEvent: import.meta.env.VITE_PHOENIX_SIMPLE_EVENT_WRITE === 'enabled',
      pendingWrite: import.meta.env.VITE_PHOENIX_PENDING_WRITE === 'enabled',
      bulkEventWrite: import.meta.env.VITE_PHOENIX_BULK_EVENT_WRITE === 'enabled',
      source: 'direct-build',
      checkedAt: new Date().toISOString(),
    };
    return runtimeCapabilitiesCache;
  }

  try {
    const response = await fetch('/preview-health', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const payload = await response.json() as {
      capabilities?: {
        simpleEventWrite?: unknown;
        pendingWrite?: unknown;
        bulkEventWrite?: unknown;
      };
    };
    runtimeCapabilitiesCache = {
      simpleEvent: payload.capabilities?.simpleEventWrite === true,
      pendingWrite: payload.capabilities?.pendingWrite === true,
      bulkEventWrite: payload.capabilities?.bulkEventWrite === true,
      source: 'preview-runtime',
      checkedAt: new Date().toISOString(),
    };
    return runtimeCapabilitiesCache;
  } catch {
    runtimeCapabilitiesCache = emptyRuntimeCapabilities('unavailable');
    return runtimeCapabilitiesCache;
  }
}

export function clearPhoenixRuntimeWriteCapabilities() {
  runtimeCapabilitiesCache = null;
}

export function getPhoenixSimpleEventEligibility(flow: PhoenixSimpleEventFlow): PhoenixSimpleEventEligibility {
  const reasons: string[] = [];
  if (flow.type === 'transfer') reasons.push('PHOENIX_TRANSFER_NOT_IN_SIMPLE_FLOW');
  if (flow.negative) reasons.push('PHOENIX_REVERSAL_NOT_IN_SIMPLE_FLOW');
  if (flow.benefit) reasons.push('PHOENIX_BENEFIT_NOT_IN_SIMPLE_FLOW');
  if (flow.credit) reasons.push('PHOENIX_CARD_NOT_IN_SIMPLE_FLOW');
  if (flow.crediario) reasons.push('PHOENIX_INSTALLMENT_NOT_IN_SIMPLE_FLOW');
  if (flow.recurring) reasons.push('PHOENIX_RECURRENCE_NOT_IN_SIMPLE_FLOW');
  if (flow.saveTemplate) reasons.push('PHOENIX_TEMPLATE_NOT_IN_SIMPLE_FLOW');
  if ((flow.installments || 1) > 1) reasons.push('PHOENIX_INSTALLMENT_NOT_IN_SIMPLE_FLOW');
  if (flow.manualDue) reasons.push('PHOENIX_MANUAL_DUE_NOT_IN_SIMPLE_FLOW');
  return { eligible: reasons.length === 0, reasons: [...new Set(reasons)] };
}

function assertSimpleEvent(input: PhoenixSimpleEventInput) {
  if (!input.description.trim()) throw new PhoenixWriteError('PHOENIX_DESCRIPTION_REQUIRED');
  if (!Number.isFinite(input.amount) || input.amount === 0) throw new PhoenixWriteError('PHOENIX_POSITIVE_AMOUNT_REQUIRED');
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
    PHOENIX_POSITIVE_AMOUNT_REQUIRED: 'Informe um valor diferente de zero.',
    PHOENIX_VALID_DATE_REQUIRED: 'Informe uma data válida.',
    PHOENIX_ACCOUNT_REQUIRED: 'Selecione a conta.',
    PHOENIX_RECEIPT_METHOD_REQUIRED: 'Selecione a forma de recebimento.',
    PHOENIX_PAYMENT_METHOD_REQUIRED: 'Selecione a forma de pagamento.',
    PHOENIX_EXPENSE_CATEGORY_REQUIRED: 'Selecione a classificação e o grupo da despesa.',
    PHOENIX_SIMPLE_STATUS_NOT_ALLOWED: 'A situação informada não pertence ao primeiro fluxo de gravação.',
    PHOENIX_TRANSFER_NOT_IN_SIMPLE_FLOW: 'Transferências serão liberadas em um fluxo próprio, com origem e destino protegidos.',
    PHOENIX_REVERSAL_NOT_IN_SIMPLE_FLOW: 'Estornos e reversões precisam do vínculo com o lançamento original antes da gravação.',
    PHOENIX_BENEFIT_NOT_IN_SIMPLE_FLOW: 'Movimentações de benefício serão liberadas em um fluxo separado do caixa monetário.',
    PHOENIX_CARD_NOT_IN_SIMPLE_FLOW: 'Compras no crédito precisam do contrato de cartão e fatura antes da gravação.',
    PHOENIX_INSTALLMENT_NOT_IN_SIMPLE_FLOW: 'Parcelamentos precisam do contrato de parcelas antes da gravação.',
    PHOENIX_RECURRENCE_NOT_IN_SIMPLE_FLOW: 'Recorrências precisam de criação atômica da série antes da gravação.',
    PHOENIX_TEMPLATE_NOT_IN_SIMPLE_FLOW: 'Salvar modelos ainda não pertence ao primeiro fluxo de gravação.',
    PHOENIX_MANUAL_DUE_NOT_IN_SIMPLE_FLOW: 'Vencimento manual de cartão será liberado junto ao contrato de cartão.',
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

async function confirmedSnapshot(refreshMonth: string) {
  clearPhoenixReadModelCache();
  return loadPhoenixReadModel(refreshMonth, { force: true });
}

export async function submitPhoenixSimpleEvent(
  prepared: PreparedPhoenixSimpleEvent,
  refreshMonth: string,
): Promise<{ event: FinancialEvent; snapshot: PhoenixReadModel }> {
  if (!PHOENIX_WRITE_CAPABILITIES.simpleEvent) throw new PhoenixWriteError('PHOENIX_WRITE_NOT_ENABLED');
  const runtimeCapabilities = await getPhoenixRuntimeWriteCapabilities(true);
  if (!runtimeCapabilities.simpleEvent) throw new PhoenixWriteError('PHOENIX_WRITE_NOT_ENABLED');
  assertSimpleEvent(prepared.payload);

  const event = await financeClient.createEvent({
    ...prepared.payload,
    operationId: prepared.operationId,
  });

  const snapshot = await confirmedSnapshot(refreshMonth);
  return { event, snapshot };
}

export async function runPhoenixSimpleEventEdit(
  eventId: string,
  input: PhoenixSimpleEventInput,
  refreshMonth: string,
): Promise<{ event: FinancialEvent; snapshot: PhoenixReadModel }> {
  if (!PHOENIX_WRITE_CAPABILITIES.simpleEvent) throw new PhoenixWriteError('PHOENIX_WRITE_NOT_ENABLED');
  const runtimeCapabilities = await getPhoenixRuntimeWriteCapabilities(true);
  if (!runtimeCapabilities.simpleEvent) throw new PhoenixWriteError('PHOENIX_WRITE_NOT_ENABLED');
  assertSimpleEvent(input);

  const event = await financeClient.updateEvent(eventId, input);
  const snapshot = await confirmedSnapshot(refreshMonth);
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
