import { authenticatedRequest } from '../../app/auth-client';
import { cardsClient, type CardPurchase } from '../../app/cards-client';
import { financeClient, type FinancialEvent, type FinancialEventInput } from '../../app/finance-client';
import type { PhoenixReadModel } from '../contracts';
import { clearPhoenixReadModelCache, loadPhoenixReadModel } from './load-phoenix-read-model';

export const PHOENIX_WRITE_CAPABILITIES = {
  simpleEvent: true,
  cardPurchase: true,
  benefitEvent: true,
  transfer: true,
} as const;

export type PhoenixRuntimeWriteCapabilities = {
  simpleEvent: boolean;
  cardPurchaseWrite: boolean;
  benefitWrite: boolean;
  transferWrite: boolean;
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

export type PhoenixBenefitEventInput = Omit<PhoenixSimpleEventInput, 'status'> & {
  status: 'paid';
};

export type PhoenixCardPurchaseInput = {
  cardId: string;
  categoryId?: string;
  description: string;
  totalAmount: number;
  purchaseDate: string;
  installments: number;
};

export type PreparedPhoenixSimpleEvent = {
  operationId: string;
  payload: PhoenixSimpleEventInput;
  preparedAt: string;
};

export type PreparedPhoenixBenefitEvent = {
  operationId: string;
  payload: PhoenixBenefitEventInput;
  preparedAt: string;
};

export type PreparedPhoenixCardPurchase = {
  operationId: string;
  payload: PhoenixCardPurchaseInput;
  preparedAt: string;
};

export type PhoenixWriteState =
  | { status: 'idle' }
  | { status: 'saving'; operationId: string }
  | { status: 'confirmed'; operationId: string; event: FinancialEvent; snapshot: PhoenixReadModel }
  | { status: 'error'; operationId: string; code: string; message: string };

export type PhoenixCardPurchaseWriteState =
  | { status: 'idle' }
  | { status: 'saving'; operationId: string }
  | { status: 'accepted'; operationId: string; purchase: CardPurchase }
  | { status: 'confirmed'; operationId: string; purchase: CardPurchase; snapshot: PhoenixReadModel }
  | { status: 'error'; operationId: string; code: string; message: string };

export class PhoenixWriteError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const RUNTIME_CAPABILITY_TTL = 15_000;
let runtimeCapabilitiesCache: PhoenixRuntimeWriteCapabilities | null = null;
const pendingEditOperations = new Map<string, string>();
const pendingBenefitEditOperations = new Map<string, string>();
const pendingArchiveOperations = new Map<string, string>();

function operationId(prefix = 'phoenix-event') {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  const random = Math.random().toString(36).slice(2, 14);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function editRequestKey(eventId: string, input: PhoenixSimpleEventInput, expectedUpdatedAt?: string) {
  return JSON.stringify({
    eventId,
    expectedUpdatedAt: expectedUpdatedAt || null,
    type: input.type,
    status: input.status,
    description: input.description.trim(),
    date: input.date.slice(0, 10),
    amount: input.amount,
    accountId: input.accountId || null,
    categoryId: input.categoryId || null,
    paymentMethodId: input.paymentMethodId || null,
    notes: input.notes?.trim() || null,
  });
}

function emptyRuntimeCapabilities(source: PhoenixRuntimeWriteCapabilities['source']): PhoenixRuntimeWriteCapabilities {
  return {
    simpleEvent: false,
    cardPurchaseWrite: false,
    benefitWrite: false,
    transferWrite: false,
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
      cardPurchaseWrite: import.meta.env.VITE_PHOENIX_CARD_PURCHASE_WRITE === 'enabled',
      benefitWrite: import.meta.env.VITE_PHOENIX_BENEFIT_WRITE === 'enabled',
      transferWrite: import.meta.env.VITE_PHOENIX_TRANSFER_WRITE === 'enabled',
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
        cardPurchaseWrite?: unknown;
        benefitWrite?: unknown;
        transferWrite?: unknown;
        pendingWrite?: unknown;
        bulkEventWrite?: unknown;
      };
    };
    runtimeCapabilitiesCache = {
      simpleEvent: payload.capabilities?.simpleEventWrite === true,
      cardPurchaseWrite: payload.capabilities?.cardPurchaseWrite === true,
      benefitWrite: payload.capabilities?.benefitWrite === true,
      transferWrite: payload.capabilities?.transferWrite === true,
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
  // Receita/despesa simples aceita valor negativo como estorno/reversão.
  // Fluxos especializados (cartão, benefício e transferência) mantêm suas próprias proteções.
  if (flow.benefit) reasons.push('PHOENIX_BENEFIT_NOT_IN_SIMPLE_FLOW');
  if (flow.credit) reasons.push('PHOENIX_CARD_NOT_IN_SIMPLE_FLOW');
  if (flow.crediario) reasons.push('PHOENIX_INSTALLMENT_NOT_IN_SIMPLE_FLOW');
  if (flow.recurring) reasons.push('PHOENIX_RECURRENCE_NOT_IN_SIMPLE_FLOW');
  if (flow.saveTemplate) reasons.push('PHOENIX_TEMPLATE_NOT_IN_SIMPLE_FLOW');
  if ((flow.installments || 1) > 1) reasons.push('PHOENIX_INSTALLMENT_NOT_IN_SIMPLE_FLOW');
  if (flow.manualDue) reasons.push('PHOENIX_MANUAL_DUE_NOT_IN_SIMPLE_FLOW');
  return { eligible: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function getPhoenixTransferEligibility(flow: PhoenixSimpleEventFlow): PhoenixSimpleEventEligibility {
  const reasons: string[] = [];
  if (flow.type !== 'transfer') reasons.push('PHOENIX_TRANSFER_FLOW_REQUIRED');
  if (flow.negative) reasons.push('PHOENIX_TRANSFER_POSITIVE_AMOUNT_REQUIRED');
  if (flow.benefit) reasons.push('PHOENIX_TRANSFER_MONETARY_ACCOUNTS_REQUIRED');
  if (flow.recurring) reasons.push('PHOENIX_TRANSFER_RECURRENCE_NOT_SUPPORTED');
  if (flow.saveTemplate) reasons.push('PHOENIX_TEMPLATE_NOT_IN_SIMPLE_FLOW');
  if ((flow.installments || 1) > 1) reasons.push('PHOENIX_TRANSFER_INSTALLMENTS_NOT_SUPPORTED');
  if (flow.manualDue) reasons.push('PHOENIX_MANUAL_DUE_NOT_IN_SIMPLE_FLOW');
  return { eligible: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function getPhoenixBenefitEventEligibility(flow: PhoenixSimpleEventFlow): PhoenixSimpleEventEligibility {
  const reasons: string[] = [];
  if (!flow.benefit || !['income', 'expense'].includes(flow.type)) reasons.push('PHOENIX_BENEFIT_FLOW_REQUIRED');
  if (flow.negative) reasons.push('PHOENIX_BENEFIT_REVERSAL_NOT_SUPPORTED');
  if (flow.credit) reasons.push('PHOENIX_BENEFIT_PAYMENT_METHOD_REQUIRED');
  if (flow.crediario) reasons.push('PHOENIX_BENEFIT_PAYMENT_METHOD_REQUIRED');
  if (flow.recurring) reasons.push('PHOENIX_RECURRENCE_NOT_IN_SIMPLE_FLOW');
  if (flow.saveTemplate) reasons.push('PHOENIX_TEMPLATE_NOT_IN_SIMPLE_FLOW');
  if ((flow.installments || 1) > 1) reasons.push('PHOENIX_INSTALLMENT_NOT_IN_SIMPLE_FLOW');
  if (flow.manualDue) reasons.push('PHOENIX_MANUAL_DUE_NOT_IN_SIMPLE_FLOW');
  return { eligible: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function getPhoenixCardPurchaseEligibility(flow: PhoenixSimpleEventFlow): PhoenixSimpleEventEligibility {
  const reasons: string[] = [];
  if (flow.type !== 'expense' || !flow.credit) reasons.push('PHOENIX_CARD_FLOW_REQUIRED');
  if (flow.negative) reasons.push('PHOENIX_REVERSAL_NOT_IN_SIMPLE_FLOW');
  if (flow.benefit) reasons.push('PHOENIX_BENEFIT_NOT_IN_SIMPLE_FLOW');
  if (flow.crediario) reasons.push('PHOENIX_INSTALLMENT_NOT_IN_SIMPLE_FLOW');
  if (flow.recurring) reasons.push('PHOENIX_RECURRENCE_NOT_IN_SIMPLE_FLOW');
  if (flow.saveTemplate) reasons.push('PHOENIX_TEMPLATE_NOT_IN_SIMPLE_FLOW');
  if (flow.manualDue) reasons.push('PHOENIX_CARD_MANUAL_DUE_NOT_SUPPORTED');
  if ((flow.installments || 1) < 1 || (flow.installments || 1) > 48) reasons.push('PHOENIX_CARD_INSTALLMENTS_INVALID');
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

function assertBenefitEvent(input: PhoenixBenefitEventInput) {
  if (!input.description.trim()) throw new PhoenixWriteError('PHOENIX_DESCRIPTION_REQUIRED');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new PhoenixWriteError('PHOENIX_POSITIVE_AMOUNT_REQUIRED');
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new PhoenixWriteError('PHOENIX_VALID_DATE_REQUIRED');
  if (!input.accountId) throw new PhoenixWriteError('PHOENIX_BENEFIT_ACCOUNT_REQUIRED');
  if (!input.paymentMethodId) throw new PhoenixWriteError('PHOENIX_BENEFIT_PAYMENT_METHOD_REQUIRED');
  if (input.type === 'expense' && !input.categoryId) throw new PhoenixWriteError('PHOENIX_EXPENSE_CATEGORY_REQUIRED');
  if (input.status !== 'paid') throw new PhoenixWriteError('PHOENIX_BENEFIT_STATUS_REQUIRED');
}

function assertCardPurchase(input: PhoenixCardPurchaseInput) {
  if (!input.description.trim()) throw new PhoenixWriteError('PHOENIX_DESCRIPTION_REQUIRED');
  if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) throw new PhoenixWriteError('PHOENIX_POSITIVE_AMOUNT_REQUIRED');
  if (!input.purchaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.purchaseDate)) throw new PhoenixWriteError('PHOENIX_VALID_DATE_REQUIRED');
  if (!input.cardId) throw new PhoenixWriteError('PHOENIX_CARD_REQUIRED');
  if (!input.categoryId) throw new PhoenixWriteError('PHOENIX_EXPENSE_CATEGORY_REQUIRED');
  if (!Number.isInteger(input.installments) || input.installments < 1 || input.installments > 48) throw new PhoenixWriteError('PHOENIX_CARD_INSTALLMENTS_INVALID');
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

export function preparePhoenixBenefitEvent(input: PhoenixBenefitEventInput, existingOperationId?: string): PreparedPhoenixBenefitEvent {
  assertBenefitEvent(input);
  return {
    operationId: existingOperationId || operationId('phoenix-benefit'),
    payload: {
      ...input,
      description: input.description.trim(),
      notes: input.notes?.trim() || undefined,
    },
    preparedAt: new Date().toISOString(),
  };
}

export function preparePhoenixCardPurchase(input: PhoenixCardPurchaseInput, existingOperationId?: string): PreparedPhoenixCardPurchase {
  assertCardPurchase(input);
  return {
    operationId: existingOperationId || operationId('phoenix-card-purchase'),
    payload: {
      ...input,
      description: input.description.trim(),
    },
    preparedAt: new Date().toISOString(),
  };
}

export function phoenixWriteMessage(code: string) {
  const messages: Record<string, string> = {
    PHOENIX_WRITE_NOT_ENABLED: 'A gravação financeira da Phoenix ainda não foi liberada neste ambiente.',
    PHOENIX_CARD_WRITE_NOT_ENABLED: 'A gravação de compras no cartão ainda não foi liberada neste ambiente.',
    PHOENIX_BENEFIT_WRITE_NOT_ENABLED: 'A gravação do Benefício Alimentação ainda não foi liberada neste ambiente.',
    PHOENIX_TRANSFER_WRITE_NOT_ENABLED: 'A gravação de transferências ainda não foi liberada neste ambiente.',
    PHOENIX_EDIT_WRITE_NOT_ENABLED: 'A edição financeira ainda não foi liberada neste ambiente.',
    PHOENIX_ARCHIVE_WRITE_NOT_ENABLED: 'A exclusão financeira ainda não foi liberada neste ambiente.',
    PHOENIX_EDIT_CONFIRMATION_MISSING: 'O servidor respondeu à edição sem devolver o lançamento confirmado.',
    FINANCIAL_EVENT_LINKED_DOMAIN: 'Este lançamento pertence a outro fluxo financeiro e não pode ser excluído por aqui. Abra o domínio de origem para desfazer corretamente.',
    FINANCIAL_EVENT_STALE_VERSION: 'Este lançamento foi alterado em outro dispositivo ou por outro usuário. Feche e reabra a edição para carregar a versão mais recente antes de salvar.',
    FINANCIAL_EVENT_NOT_FOUND: 'Este lançamento não está mais disponível.',
    FORBIDDEN: 'Seu perfil não possui permissão para excluir lançamentos financeiros.',
    PHOENIX_DESCRIPTION_REQUIRED: 'Informe a descrição do lançamento.',
    PHOENIX_POSITIVE_AMOUNT_REQUIRED: 'Informe um valor maior que zero.',
    PHOENIX_VALID_DATE_REQUIRED: 'Informe uma data válida.',
    PHOENIX_ACCOUNT_REQUIRED: 'Selecione a conta.',
    PHOENIX_CARD_REQUIRED: 'Selecione o cartão.',
    PHOENIX_CARD_FLOW_REQUIRED: 'Este writer é exclusivo para compras no cartão de crédito.',
    PHOENIX_CARD_INSTALLMENTS_INVALID: 'Informe entre 1 e 48 parcelas para a compra no cartão.',
    PHOENIX_CARD_MANUAL_DUE_NOT_SUPPORTED: 'O vencimento manual continua protegido. No crédito, use o vencimento calculado pela data de fechamento do cartão.',
    PHOENIX_TRANSFER_FLOW_REQUIRED: 'Este writer é exclusivo para transferências entre contas monetárias.',
    PHOENIX_TRANSFER_POSITIVE_AMOUNT_REQUIRED: 'Transferências usam valor positivo. Para desfazer, registre a operação inversa.',
    PHOENIX_TRANSFER_MONETARY_ACCOUNTS_REQUIRED: 'Transferências exigem contas monetárias válidas na origem e no destino.',
    PHOENIX_TRANSFER_RECURRENCE_NOT_SUPPORTED: 'Transferências recorrentes ainda não pertencem ao fluxo protegido.',
    PHOENIX_TRANSFER_INSTALLMENTS_NOT_SUPPORTED: 'Transferências não aceitam parcelamento.',
    PHOENIX_BENEFIT_FLOW_REQUIRED: 'Este writer é exclusivo para recargas e despesas do Benefício Alimentação.',
    PHOENIX_BENEFIT_ACCOUNT_REQUIRED: 'Selecione a conta de Benefício Alimentação.',
    PHOENIX_BENEFIT_PAYMENT_METHOD_REQUIRED: 'No Benefício Alimentação, utilize a forma de pagamento VEROCARD.',
    PHOENIX_BENEFIT_STATUS_REQUIRED: 'Movimentações do Benefício Alimentação são registradas sempre como pagas/recebidas.',
    PHOENIX_BENEFIT_REVERSAL_NOT_SUPPORTED: 'Estornos do Benefício Alimentação precisam de um fluxo próprio vinculado ao lançamento original.',
    BENEFIT_DESCRIPTION_REQUIRED: 'Informe a descrição da movimentação do benefício.',
    BENEFIT_EVENT_DOMAIN_MISMATCH: 'Este lançamento não pertence mais ao Vale Alimentação. Reabra o lançamento para carregar a versão atual.',
    BENEFIT_POSITIVE_AMOUNT_REQUIRED: 'Informe um valor maior que zero para o benefício.',
    INVALID_BENEFIT_DATE: 'Informe uma data válida para a movimentação do benefício.',
    INVALID_BENEFIT_ACCOUNT: 'A conta selecionada não é uma conta ativa de Benefício Alimentação.',
    INVALID_BENEFIT_PAYMENT_METHOD: 'A forma selecionada não pertence ao Benefício Alimentação. Utilize VEROCARD.',
    BENEFIT_EXPENSE_CATEGORY_REQUIRED: 'Selecione a classificação e o grupo da despesa do benefício.',
    BENEFIT_CATEGORY_TYPE_MISMATCH: 'A classificação selecionada não corresponde ao tipo da movimentação do benefício.',
    INSUFFICIENT_BENEFIT_BALANCE: 'O saldo do Benefício Alimentação é insuficiente para esta despesa.',
    PHOENIX_RECEIPT_METHOD_REQUIRED: 'Selecione a forma de recebimento.',
    PHOENIX_PAYMENT_METHOD_REQUIRED: 'Selecione a forma de pagamento.',
    PHOENIX_EXPENSE_CATEGORY_REQUIRED: 'Selecione a classificação e o grupo da despesa.',
    PHOENIX_SIMPLE_STATUS_NOT_ALLOWED: 'A situação informada não pertence ao primeiro fluxo de gravação.',
    PHOENIX_TRANSFER_NOT_IN_SIMPLE_FLOW: 'Transferências usam o writer atômico de origem e destino.',
    PHOENIX_REVERSAL_NOT_IN_SIMPLE_FLOW: 'Estornos e reversões precisam do vínculo com o lançamento original antes da gravação.',
    PHOENIX_BENEFIT_NOT_IN_SIMPLE_FLOW: 'Movimentações de benefício usam o writer protegido do Benefício Alimentação.',
    PHOENIX_CARD_NOT_IN_SIMPLE_FLOW: 'Compras no crédito são gravadas pelo writer protegido de cartões e faturas.',
    PHOENIX_INSTALLMENT_NOT_IN_SIMPLE_FLOW: 'Parcelamentos fora do cartão precisam do contrato de parcelas antes da gravação.',
    PHOENIX_RECURRENCE_NOT_IN_SIMPLE_FLOW: 'Recorrências precisam de criação atômica da série antes da gravação.',
    PHOENIX_TEMPLATE_NOT_IN_SIMPLE_FLOW: 'Salvar modelos ainda não pertence ao primeiro fluxo de gravação.',
    PHOENIX_MANUAL_DUE_NOT_IN_SIMPLE_FLOW: 'Vencimento manual de cartão será liberado junto ao contrato de exceção de vencimento.',
    INVALID_ACCOUNT: 'A conta selecionada não está mais disponível.',
    INVALID_CARD: 'O cartão selecionado não está mais disponível.',
    INVALID_PURCHASE_DATE: 'A data da compra não é válida.',
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

export async function submitPhoenixBenefitEvent(
  prepared: PreparedPhoenixBenefitEvent,
  refreshMonth: string,
): Promise<{ event: FinancialEvent; snapshot: PhoenixReadModel }> {
  if (!PHOENIX_WRITE_CAPABILITIES.benefitEvent) throw new PhoenixWriteError('PHOENIX_BENEFIT_WRITE_NOT_ENABLED');
  const runtimeCapabilities = await getPhoenixRuntimeWriteCapabilities(true);
  if (!runtimeCapabilities.benefitWrite) throw new PhoenixWriteError('PHOENIX_BENEFIT_WRITE_NOT_ENABLED');
  assertBenefitEvent(prepared.payload);

  const { status: _status, ...payload } = prepared.payload;
  const event = await authenticatedRequest<FinancialEvent>('/finance/benefit-events', {
    method: 'POST',
    body: JSON.stringify({ ...payload, operationId: prepared.operationId }),
  });

  const snapshot = await confirmedSnapshot(refreshMonth);
  return { event, snapshot };
}

async function createPhoenixCardPurchase(prepared: PreparedPhoenixCardPurchase) {
  if (!PHOENIX_WRITE_CAPABILITIES.cardPurchase) throw new PhoenixWriteError('PHOENIX_CARD_WRITE_NOT_ENABLED');
  const runtimeCapabilities = await getPhoenixRuntimeWriteCapabilities(true);
  if (!runtimeCapabilities.cardPurchaseWrite) throw new PhoenixWriteError('PHOENIX_CARD_WRITE_NOT_ENABLED');
  assertCardPurchase(prepared.payload);

  return cardsClient.createPurchase({
    ...prepared.payload,
    operationId: prepared.operationId,
  });
}

export async function submitPhoenixCardPurchase(
  prepared: PreparedPhoenixCardPurchase,
  refreshMonth: string,
): Promise<{ purchase: CardPurchase; snapshot: PhoenixReadModel }> {
  const purchase = await createPhoenixCardPurchase(prepared);
  const snapshot = await confirmedSnapshot(refreshMonth);
  return { purchase, snapshot };
}

export async function runPhoenixSimpleEventEdit(
  eventId: string,
  input: PhoenixSimpleEventInput,
  refreshMonth: string,
  expectedUpdatedAt?: string,
): Promise<{ event: FinancialEvent; snapshot: PhoenixReadModel }> {
  const runtimeCapabilities = await getPhoenixRuntimeWriteCapabilities(true);
  if (!runtimeCapabilities.bulkEventWrite) throw new PhoenixWriteError('PHOENIX_EDIT_WRITE_NOT_ENABLED');
  assertSimpleEvent(input);

  const requestKey = editRequestKey(eventId, input, expectedUpdatedAt);
  const editOperationId = pendingEditOperations.get(requestKey) || operationId('phoenix-event-edit');
  pendingEditOperations.set(requestKey, editOperationId);

  const result = await financeClient.bulkUpdateEvents({
    ids: [eventId],
    operationId: editOperationId,
    expectedUpdatedAtById: expectedUpdatedAt ? { [eventId]: expectedUpdatedAt } : undefined,
    changes: {
      date: input.date,
      description: input.description.trim(),
      type: input.type,
      status: input.status,
      amount: input.amount,
      notes: input.notes?.trim() || null,
      accountId: input.accountId || null,
      paymentMethodId: input.paymentMethodId || null,
      categoryId: input.categoryId || null,
    },
  });
  const event = result.events[0];
  if (!event) throw new PhoenixWriteError('PHOENIX_EDIT_CONFIRMATION_MISSING');
  const snapshot = await confirmedSnapshot(refreshMonth);
  pendingEditOperations.delete(requestKey);
  return { event, snapshot };
}

export async function runPhoenixBenefitEventEdit(
  eventId: string,
  input: PhoenixBenefitEventInput,
  refreshMonth: string,
  expectedUpdatedAt?: string,
): Promise<{ event: FinancialEvent; snapshot: PhoenixReadModel }> {
  const runtimeCapabilities = await getPhoenixRuntimeWriteCapabilities(true);
  if (!runtimeCapabilities.benefitWrite) throw new PhoenixWriteError('PHOENIX_BENEFIT_WRITE_NOT_ENABLED');
  assertBenefitEvent(input);

  const requestKey = editRequestKey(eventId, input, expectedUpdatedAt);
  const editOperationId = pendingBenefitEditOperations.get(requestKey) || operationId('phoenix-benefit-edit');
  pendingBenefitEditOperations.set(requestKey, editOperationId);

  try {
    const { status: _status, ...payload } = input;
    const event = await authenticatedRequest<FinancialEvent>(`/finance/benefit-events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...payload,
        expectedUpdatedAt: expectedUpdatedAt || undefined,
        operationId: editOperationId,
      }),
    });
    const snapshot = await confirmedSnapshot(refreshMonth);
    pendingBenefitEditOperations.delete(requestKey);
    return { event, snapshot };
  } catch (error) {
    throw error;
  }
}

export async function runPhoenixSimpleEventArchive(
  eventId: string,
  refreshMonth: string,
  expectedUpdatedAt?: string,
): Promise<{ snapshot: PhoenixReadModel }> {
  const runtimeCapabilities = await getPhoenixRuntimeWriteCapabilities(true);
  if (!runtimeCapabilities.bulkEventWrite) throw new PhoenixWriteError('PHOENIX_ARCHIVE_WRITE_NOT_ENABLED');

  const archiveRequestKey = `${eventId}:${expectedUpdatedAt || 'unknown'}`;
  const archiveOperationId = pendingArchiveOperations.get(archiveRequestKey) || operationId('phoenix-event-archive');
  pendingArchiveOperations.set(archiveRequestKey, archiveOperationId);

  await financeClient.bulkArchiveEvents({
    ids: [eventId],
    operationId: archiveOperationId,
    expectedUpdatedAtById: expectedUpdatedAt ? { [eventId]: expectedUpdatedAt } : undefined,
  });

  const snapshot = await confirmedSnapshot(refreshMonth);
  pendingArchiveOperations.delete(archiveRequestKey);
  return { snapshot };
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

export async function runPhoenixBenefitEventWrite(
  prepared: PreparedPhoenixBenefitEvent,
  refreshMonth: string,
  onState?: (state: PhoenixWriteState) => void,
): Promise<PhoenixWriteState> {
  onState?.({ status: 'saving', operationId: prepared.operationId });
  try {
    const { event, snapshot } = await submitPhoenixBenefitEvent(prepared, refreshMonth);
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

export async function runPhoenixCardPurchaseWrite(
  prepared: PreparedPhoenixCardPurchase,
  refreshMonth: string,
  onState?: (state: PhoenixCardPurchaseWriteState) => void,
): Promise<PhoenixCardPurchaseWriteState> {
  onState?.({ status: 'saving', operationId: prepared.operationId });
  let purchase: CardPurchase;
  try {
    purchase = await createPhoenixCardPurchase(prepared);
  } catch (error) {
    const code = writeErrorCode(error);
    const failed: PhoenixCardPurchaseWriteState = {
      status: 'error',
      operationId: prepared.operationId,
      code,
      message: phoenixWriteMessage(code),
    };
    onState?.(failed);
    return failed;
  }

  const accepted: PhoenixCardPurchaseWriteState = { status: 'accepted', operationId: prepared.operationId, purchase };
  onState?.(accepted);

  try {
    const snapshot = await Promise.race([
      confirmedSnapshot(refreshMonth),
      new Promise<never>((_, reject) => window.setTimeout(() => reject(new PhoenixWriteError('PHOENIX_CARD_REFRESH_TIMEOUT')), 12_000)),
    ]);
    const confirmed: PhoenixCardPurchaseWriteState = { status: 'confirmed', operationId: prepared.operationId, purchase, snapshot };
    onState?.(confirmed);
    return confirmed;
  } catch {
    // A compra já foi aceita pela API. Falha/lentidão da releitura não pode manter
    // o formulário preso nem sugerir que o usuário deva gravar a compra novamente.
    window.dispatchEvent(new CustomEvent('meg:data-invalidated', {
      detail: { path: '/cards/purchases', method: 'POST', reason: 'card-refresh-pending' },
    }));
    return accepted;
  }
}
