import type { CardPurchase, CreditCard } from '../../app/cards-client';
import type { FinancialEvent } from '../../app/finance-client';
import type { PhoenixReadModel } from '../../phoenix/contracts';
import {
  getPhoenixBenefitEventEligibility,
  getPhoenixCardPurchaseEligibility,
  getPhoenixRuntimeWriteCapabilities,
  getPhoenixSimpleEventEligibility,
  phoenixWriteMessage,
  preparePhoenixBenefitEvent,
  preparePhoenixCardPurchase,
  preparePhoenixSimpleEvent,
  runPhoenixBenefitEventEdit,
  runPhoenixBenefitEventWrite,
  runPhoenixCardPurchaseCancel,
  runPhoenixCardPurchaseEdit,
  runPhoenixCardPurchaseWrite,
  runPhoenixSimpleEventArchive,
  runPhoenixSimpleEventEdit,
  runPhoenixSimpleEventWrite,
  type PhoenixCardPurchaseInput,
  type PhoenixSimpleEventFlow,
  type PhoenixSimpleEventInput,
} from '../../phoenix/data/phoenix-write-gateway';
import {
  phoenixTransferWriteMessage,
  preparePhoenixTransfer,
  runPhoenixTransferWrite,
} from '../../phoenix/data/phoenix-transfer-write-gateway';
import { cardDueDateForPurchase } from '../../phoenix/data/card-dates';

export type WebNextEditorMode = 'expense' | 'income' | 'benefit' | 'transfer';
export type WebNextEditorStatus = 'planned' | 'paid';

export type WebNextEditorDraft = {
  mode: WebNextEditorMode;
  description: string;
  date: string;
  amount: number;
  negative: boolean;
  status: WebNextEditorStatus;
  accountId: string;
  destinationAccountId: string;
  categoryId: string;
  paymentMethodId: string;
  cardId: string;
  installments: number;
  notes: string;
};

export type WebNextEditorContext = {
  month: string;
  accounts: Array<{ id: string; name: string; type: string }>;
  categories: Array<{ id: string; name: string; group: string; type: 'income' | 'expense' | null }>;
  paymentMethods: Array<{ id: string; name: string; type: string }>;
  cards: Array<{ id: string; name: string; closingDay: number; dueDay: number }>;
  canonicalBenefitAccountId: string;
  canonicalBenefitPaymentId: string;
};

export type WebNextEditorTarget = {
  event: FinancialEvent;
  card: CreditCard | null;
  purchase: CardPurchase | null;
};

export type WebNextEditorSaveResult =
  | { status: 'accepted'; message: string }
  | { status: 'confirmed'; message: string; snapshot?: PhoenixReadModel }
  | { status: 'duplicate'; message: string }
  | { status: 'error'; message: string };

function normalize(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ');
}

function today() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const read = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function eventMode(event: FinancialEvent): WebNextEditorMode {
  if (event.type === 'transfer') return 'transfer';
  if (isBenefitEvent(event)) return 'benefit';
  if (event.type === 'income' || event.type === 'redemption') return 'income';
  return 'expense';
}

function sourceCardMeta(event: FinancialEvent) {
  const payload = event.sourcePayload;
  if (!payload || typeof payload !== 'object') return null;
  const cardId = String(payload.cardId || '');
  const purchaseId = String(payload.purchaseId || '');
  return cardId && purchaseId ? { cardId, purchaseId } : null;
}

function isBenefitEvent(event: FinancialEvent) {
  const account = normalize(`${event.account?.name || ''} ${event.account?.type || ''}`);
  const payment = normalize(`${event.paymentMethod?.name || ''} ${event.sourceDetails?.paymentMethod || ''}`);
  const description = normalize(event.description);
  return account.includes('benef') || account.includes('verocard') || account.includes('alimentacao')
    || payment.includes('verocard') || description.includes('verocard');
}

export function isCreditPayment(name?: string | null, type?: string | null) {
  const value = normalize(`${name || ''} ${type || ''}`);
  return value.includes('credito') || value.includes('credit') || value.includes('cartao');
}

export function isPixPayment(name?: string | null, type?: string | null) {
  return normalize(`${name || ''} ${type || ''}`).includes('pix');
}

export function buildWebNextEditorContext(data: PhoenixReadModel): WebNextEditorContext {
  const accounts = data.accounts.filter((item) => item.isActive);
  const paymentMethods = data.paymentMethods.filter((item) => item.isActive);
  const benefitAccount = accounts.find((item) => item.type === 'benefit')
    || accounts.find((item) => normalize(item.name).includes('verocard') || normalize(item.name).includes('benef'));
  const benefitPayment = paymentMethods.find((item) => normalize(item.name).includes('verocard'));
  return {
    month: data.month,
    accounts: accounts.map((item) => ({ id: item.id, name: item.name, type: item.type })),
    categories: data.categories
      .filter((item) => item.isActive)
      .map((item) => ({ id: item.id, name: item.name, group: item.group || 'Outros', type: item.type || null })),
    paymentMethods: paymentMethods.map((item) => ({ id: item.id, name: item.name, type: item.type || '' })),
    cards: data.cards
      .filter((item) => item.isActive)
      .map((item) => ({ id: item.id, name: item.name, closingDay: item.closingDay, dueDay: item.dueDay })),
    canonicalBenefitAccountId: benefitAccount?.id || '',
    canonicalBenefitPaymentId: benefitPayment?.id || '',
  };
}

export function blankWebNextEditorDraft(mode: WebNextEditorMode, context: WebNextEditorContext): WebNextEditorDraft {
  const benefit = mode === 'benefit';
  return {
    mode,
    description: '',
    date: today(),
    amount: 0,
    negative: false,
    status: mode === 'income' || benefit ? 'paid' : 'planned',
    accountId: benefit ? context.canonicalBenefitAccountId : '',
    destinationAccountId: '',
    categoryId: '',
    paymentMethodId: benefit ? context.canonicalBenefitPaymentId : '',
    cardId: '',
    installments: 1,
    notes: '',
  };
}

export function resolveWebNextEditorTarget(data: PhoenixReadModel, eventId: string): WebNextEditorTarget | null {
  const event = data.events.items.find((item) => item.id === eventId);
  if (!event) return null;
  const meta = sourceCardMeta(event);
  const card = meta ? data.cards.find((item) => item.id === meta.cardId) || null : null;
  const purchase = meta && card ? card.purchases.find((item) => item.id === meta.purchaseId) || null : null;
  return { event, card, purchase };
}

export function draftFromWebNextTarget(target: WebNextEditorTarget, context: WebNextEditorContext): WebNextEditorDraft {
  const { event, card, purchase } = target;
  const mode = eventMode(event);
  const benefit = mode === 'benefit';
  const amount = purchase
    ? Math.abs(Number(purchase.totalAmount || 0))
    : Math.abs(Number(event.signedAmount || event.amount || 0));
  return {
    mode,
    description: purchase?.description || event.description,
    date: (purchase?.purchaseDate || event.date).slice(0, 10),
    amount,
    negative: !purchase && Number(event.signedAmount || 0) < 0 && mode === 'income',
    status: mode === 'income' || benefit
      ? 'paid'
      : event.status === 'paid' || event.status === 'confirmed' || event.status === 'reconciled'
        ? 'paid'
        : 'planned',
    accountId: benefit ? context.canonicalBenefitAccountId || event.accountId || '' : event.accountId || '',
    destinationAccountId: String(event.sourcePayload?.counterpartyAccountId || ''),
    categoryId: purchase?.category?.id || event.categoryId || '',
    paymentMethodId: benefit ? context.canonicalBenefitPaymentId || event.paymentMethodId || '' : event.paymentMethodId || '',
    cardId: card?.id || '',
    installments: Math.max(1, Number(purchase?.installments || event.sourcePayload?.installmentCount || 1)),
    notes: event.notes || '',
  };
}

export function webNextEditorDueDate(draft: WebNextEditorDraft, context: WebNextEditorContext) {
  const card = context.cards.find((item) => item.id === draft.cardId);
  return card ? cardDueDateForPurchase(draft.date, card.closingDay, card.dueDay) : '';
}

function selectedPayment(draft: WebNextEditorDraft, context: WebNextEditorContext) {
  return context.paymentMethods.find((item) => item.id === draft.paymentMethodId) || null;
}

export function webNextEditorFlow(draft: WebNextEditorDraft, context: WebNextEditorContext): PhoenixSimpleEventFlow {
  const payment = selectedPayment(draft, context);
  const benefit = draft.mode === 'benefit';
  const credit = draft.mode === 'expense' && isCreditPayment(payment?.name, payment?.type);
  return {
    type: draft.mode === 'transfer' ? 'transfer' : draft.mode === 'income' ? 'income' : 'expense',
    negative: draft.negative,
    benefit,
    credit,
    installments: credit ? draft.installments : 1,
  };
}

export function validateWebNextEditorDraft(draft: WebNextEditorDraft, context: WebNextEditorContext) {
  const errors: string[] = [];
  const flow = webNextEditorFlow(draft, context);
  if (!draft.description.trim()) errors.push('Informe a descrição.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) errors.push('Informe uma data válida.');
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) errors.push('Informe um valor maior que zero.');
  if (draft.mode === 'transfer') {
    if (!draft.accountId) errors.push('Selecione a conta de origem.');
    if (!draft.destinationAccountId) errors.push('Selecione a conta de destino.');
    if (draft.accountId && draft.accountId === draft.destinationAccountId) errors.push('Origem e destino devem ser diferentes.');
  } else {
    if (!flow.credit && !draft.accountId) errors.push('Selecione a conta.');
    if (draft.mode === 'expense' || draft.mode === 'benefit') {
      if (!draft.categoryId) errors.push('Selecione a categoria.');
    }
    if (!draft.paymentMethodId) errors.push(draft.mode === 'income' ? 'Selecione a forma de recebimento.' : 'Selecione a forma de pagamento.');
    if (flow.credit && !draft.cardId) errors.push('Selecione o cartão.');
    if (flow.credit && (draft.installments < 1 || draft.installments > 48)) errors.push('O parcelamento deve ficar entre 1 e 48.');
  }
  if (draft.mode === 'benefit' && (!context.canonicalBenefitAccountId || !context.canonicalBenefitPaymentId)) {
    errors.push('A conta benefício e o Verocard precisam estar cadastrados e ativos.');
  }
  return errors;
}

function simpleInput(draft: WebNextEditorDraft, context: WebNextEditorContext): PhoenixSimpleEventInput {
  const mode = draft.mode === 'income' ? 'income' : 'expense';
  const payment = selectedPayment(draft, context);
  const status: 'planned' | 'paid' = mode === 'income'
    ? 'paid'
    : isPixPayment(payment?.name, payment?.type)
      ? 'paid'
      : draft.status;
  return {
    type: mode,
    status,
    description: draft.description.trim(),
    date: draft.date,
    amount: (draft.negative ? -1 : 1) * Math.abs(draft.amount),
    accountId: draft.accountId,
    categoryId: draft.categoryId || undefined,
    paymentMethodId: draft.paymentMethodId,
    notes: draft.notes.trim() || undefined,
  };
}

function duplicateResult(message: string): WebNextEditorSaveResult {
  return { status: 'duplicate', message };
}

export async function saveNewWebNextMovement(
  draft: WebNextEditorDraft,
  context: WebNextEditorContext,
  allowDuplicate = false,
): Promise<WebNextEditorSaveResult> {
  const errors = validateWebNextEditorDraft(draft, context);
  if (errors.length) return { status: 'error', message: errors[0] };
  const flow = webNextEditorFlow(draft, context);
  const runtime = await getPhoenixRuntimeWriteCapabilities(true);

  if (draft.mode === 'transfer') {
    const eligibility = getPhoenixSimpleEventEligibility({ ...flow, type: 'transfer' });
    void eligibility;
    if (!runtime.transferWrite) return { status: 'error', message: 'Transferências estão protegidas neste ambiente.' };
    const prepared = preparePhoenixTransfer({
      sourceAccountId: draft.accountId,
      destinationAccountId: draft.destinationAccountId,
      amount: Math.abs(draft.amount),
      date: draft.date,
      description: draft.description.trim(),
      notes: draft.notes.trim() || undefined,
      allowDuplicate: allowDuplicate || undefined,
    });
    const result = await runPhoenixTransferWrite(prepared, context.month);
    if (result.status === 'error') {
      if (result.code === 'POSSIBLE_DUPLICATE') return duplicateResult(result.message);
      return { status: 'error', message: result.message || phoenixTransferWriteMessage(result.code) };
    }
    return result.status === 'confirmed'
      ? { status: 'confirmed', message: 'Transferência confirmada e contas atualizadas.', snapshot: result.snapshot }
      : { status: 'accepted', message: 'Transferência salva. A atualização continua em segundo plano.' };
  }

  if (draft.mode === 'benefit') {
    const eligibility = getPhoenixBenefitEventEligibility(flow);
    if (!eligibility.eligible) return { status: 'error', message: phoenixWriteMessage(eligibility.reasons[0]) };
    if (!runtime.benefitWrite) return { status: 'error', message: 'Movimentações do benefício estão protegidas neste ambiente.' };
    const base = simpleInput({ ...draft, status: 'paid', accountId: context.canonicalBenefitAccountId, paymentMethodId: context.canonicalBenefitPaymentId }, context);
    const prepared = preparePhoenixBenefitEvent({ ...base, status: 'paid', allowDuplicate: allowDuplicate || undefined });
    const result = await runPhoenixBenefitEventWrite(prepared, context.month);
    if (result.status === 'error') {
      if (result.code === 'POSSIBLE_DUPLICATE') return duplicateResult(result.message);
      return { status: 'error', message: result.message };
    }
    return result.status === 'confirmed'
      ? { status: 'confirmed', message: 'Benefício confirmado e saldo atualizado.', snapshot: result.snapshot }
      : { status: 'accepted', message: 'Movimentação do benefício salva. O saldo será atualizado em segundo plano.' };
  }

  if (flow.credit) {
    const eligibility = getPhoenixCardPurchaseEligibility(flow);
    if (!eligibility.eligible) return { status: 'error', message: phoenixWriteMessage(eligibility.reasons[0]) };
    if (!runtime.cardPurchaseWrite) return { status: 'error', message: 'Compras no cartão estão protegidas neste ambiente.' };
    const input: PhoenixCardPurchaseInput = {
      cardId: draft.cardId,
      categoryId: draft.categoryId,
      description: draft.description.trim(),
      totalAmount: Math.abs(draft.amount),
      purchaseDate: draft.date,
      installments: draft.installments,
      allowDuplicate: allowDuplicate || undefined,
    };
    const result = await runPhoenixCardPurchaseWrite(preparePhoenixCardPurchase(input), context.month);
    if (result.status === 'error') {
      if (result.code === 'POSSIBLE_DUPLICATE') return duplicateResult(result.message);
      return { status: 'error', message: result.message };
    }
    return result.status === 'confirmed'
      ? { status: 'confirmed', message: 'Compra confirmada e fatura atualizada.', snapshot: result.snapshot }
      : { status: 'accepted', message: 'Compra salva. Fatura e parcelas serão atualizadas em segundo plano.' };
  }

  const eligibility = getPhoenixSimpleEventEligibility(flow);
  if (!eligibility.eligible) return { status: 'error', message: phoenixWriteMessage(eligibility.reasons[0]) };
  if (!runtime.simpleEvent) return { status: 'error', message: 'Lançamentos estão protegidos neste ambiente.' };
  const prepared = preparePhoenixSimpleEvent({ ...simpleInput(draft, context), allowDuplicate: allowDuplicate || undefined });
  const result = await runPhoenixSimpleEventWrite(prepared, context.month);
  if (result.status === 'error') {
    if (result.code === 'POSSIBLE_DUPLICATE') return duplicateResult(result.message);
    return { status: 'error', message: result.message };
  }
  return result.status === 'confirmed'
    ? { status: 'confirmed', message: 'Lançamento confirmado e relido.', snapshot: result.snapshot }
    : { status: 'accepted', message: 'Lançamento salvo. Saldos e grade serão atualizados em segundo plano.' };
}

export async function saveEditedWebNextMovement(
  target: WebNextEditorTarget,
  draft: WebNextEditorDraft,
  context: WebNextEditorContext,
): Promise<WebNextEditorSaveResult> {
  const errors = validateWebNextEditorDraft(draft, context);
  if (errors.length) return { status: 'error', message: errors[0] };
  if (draft.mode === 'transfer') {
    return { status: 'error', message: 'Transferências existentes permanecem somente leitura para preservar a dupla partida.' };
  }
  const flow = webNextEditorFlow(draft, context);
  try {
    if (target.purchase) {
      if (!flow.credit) return { status: 'error', message: 'Uma compra de cartão deve continuar vinculada a um cartão.' };
      await runPhoenixCardPurchaseEdit(target.purchase.id, {
        cardId: draft.cardId,
        categoryId: draft.categoryId,
        description: draft.description.trim(),
        totalAmount: Math.abs(draft.amount),
        purchaseDate: draft.date,
        installments: draft.installments,
      }, context.month);
      return { status: 'accepted', message: 'Compra atualizada. Fatura e parcelas serão relidas em segundo plano.' };
    }
    if (draft.mode === 'benefit') {
      const input = simpleInput({
        ...draft,
        status: 'paid',
        accountId: context.canonicalBenefitAccountId,
        paymentMethodId: context.canonicalBenefitPaymentId,
      }, context);
      await runPhoenixBenefitEventEdit(target.event.id, { ...input, status: 'paid' }, context.month, target.event.updatedAt);
      return { status: 'accepted', message: 'Movimentação do benefício atualizada.' };
    }
    if (flow.credit) {
      return { status: 'error', message: 'Converter um lançamento comum em compra no cartão exige um novo lançamento para preservar a fatura.' };
    }
    await runPhoenixSimpleEventEdit(target.event.id, simpleInput(draft, context), context.month, target.event.updatedAt);
    return { status: 'accepted', message: 'Lançamento atualizado e sincronização iniciada.' };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PHOENIX_EDIT_FAILED';
    return { status: 'error', message: phoenixWriteMessage(code) };
  }
}

export async function deleteWebNextMovement(target: WebNextEditorTarget, context: WebNextEditorContext): Promise<WebNextEditorSaveResult> {
  try {
    if (target.purchase) {
      await runPhoenixCardPurchaseCancel(target.purchase.id, context.month);
      return { status: 'accepted', message: 'Compra excluída. A fatura será atualizada em segundo plano.' };
    }
    await runPhoenixSimpleEventArchive(target.event.id, context.month, target.event.updatedAt);
    return { status: 'accepted', message: 'Lançamento excluído da visão financeira, com auditoria preservada.' };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PHOENIX_ARCHIVE_FAILED';
    return { status: 'error', message: phoenixWriteMessage(code) };
  }
}
