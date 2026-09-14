import type { LegacyTransaction } from '@core/finance/events';
import type { Account, PaymentMethod } from './app/finance-client';
import type { CreditCard } from './app/cards-client';

export type LaunchModality = 'cash' | 'credit' | 'benefit';

const normalizedText = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const benefitPattern = /benef|aliment|verocard|refeic|vale[- ]?aliment/;
const creditPattern = /credit|cartao/;
const cashIncomePattern = /pix|dinheiro|deposit|transfer/;

export function isBenefitAccount(account: Pick<Account, 'name' | 'type' | 'institution'>) {
  return benefitPattern.test(normalizedText(`${account.name} ${account.type} ${account.institution || ''}`));
}

export function compatibleAccounts(accounts: Account[], modality: LaunchModality) {
  const active = accounts.filter((item) => item.isActive);
  return modality === 'benefit'
    ? active.filter(isBenefitAccount)
    : active.filter((item) => !isBenefitAccount(item));
}

export function pickDefaultAccount(accounts: Account[], modality: LaunchModality) {
  const compatible = compatibleAccounts(accounts, modality);
  if (!compatible.length) return '';
  if (modality === 'benefit') {
    return compatible.find((item) => /verocard.*aliment|aliment.*verocard/.test(normalizedText(`${item.name} ${item.institution || ''}`)))?.id
      || compatible.find((item) => /aliment|benef/.test(normalizedText(`${item.name} ${item.institution || ''}`)))?.id
      || compatible[0].id;
  }
  return compatible.find((item) => /conta monetaria principal/.test(normalizedText(item.name)))?.id
    || compatible.find((item) => /monet|corrente/.test(normalizedText(`${item.name} ${item.type}`)))?.id
    || compatible[0].id;
}

export function compatiblePaymentMethods(
  methods: PaymentMethod[],
  type: 'income' | 'expense',
  modality: LaunchModality,
) {
  const active = methods.filter((item) => item.isActive);
  if (modality === 'benefit') {
    return active.filter((item) => benefitPattern.test(normalizedText(`${item.name} ${item.type || ''}`)));
  }
  if (modality === 'credit') return [];
  const ordinary = active.filter((item) => {
    const text = normalizedText(`${item.name} ${item.type || ''}`);
    return !benefitPattern.test(text) && !creditPattern.test(text);
  });
  return type === 'income'
    ? ordinary.filter((item) => cashIncomePattern.test(normalizedText(`${item.name} ${item.type || ''}`)))
    : ordinary;
}

export function inferLaunchModality(transaction: LegacyTransaction, cards: CreditCard[]): LaunchModality {
  const explicit = normalizedText(transaction.modality);
  const context = normalizedText(`${transaction.paymentMethod || ''} ${transaction.account || ''}`);
  if (benefitPattern.test(`${explicit} ${context}`)) return 'benefit';
  if (explicit.includes('credit')) return 'credit';
  const payment = normalizedText(transaction.paymentMethod);
  if (cards.some((card) => normalizedText(card.name) === payment)) return 'credit';
  if (creditPattern.test(payment)) return 'credit';
  return 'cash';
}

export function enteredLegacyAmount(transaction: LegacyTransaction) {
  const explicit = Number(transaction.amount);
  if (Number.isFinite(explicit) && transaction.amount != null) return explicit;
  const value = transaction.type === 'income' ? transaction.incomeAmount : transaction.expenseAmount;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function findSimilarTransaction(
  transactions: LegacyTransaction[],
  candidate: Pick<LegacyTransaction, 'id' | 'type' | 'date' | 'description' | 'amount' | 'incomeAmount' | 'expenseAmount'>,
  excludeId = '',
) {
  const candidateDescription = normalizedText(candidate.description);
  const candidateAmount = enteredLegacyAmount(candidate as LegacyTransaction);
  const candidateDate = String(candidate.date || '').slice(0, 10);
  const candidateType = candidate.type === 'income' ? 'income' : 'expense';
  return transactions.find((item) => {
    if (!item.id || item.id === excludeId) return false;
    const itemType = item.type === 'income' ? 'income' : 'expense';
    return itemType === candidateType
      && String(item.date || '').slice(0, 10) === candidateDate
      && normalizedText(item.description) === candidateDescription
      && Math.abs(enteredLegacyAmount(item) - candidateAmount) < 0.005;
  });
}

export function modalityLabel(modality: LaunchModality) {
  if (modality === 'credit') return 'Crédito';
  if (modality === 'benefit') return 'Alimentação';
  return 'À vista';
}
