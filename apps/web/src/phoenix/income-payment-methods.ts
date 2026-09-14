import type { PaymentMethod } from '../app/finance-client';

export const PHOENIX_INCOME_PAYMENT_METHODS = [
  'PIX',
  'DINHEIRO',
  'TRANSFERÊNCIA BANCÁRIA',
  'VEROCARD',
] as const;

export type PhoenixIncomePaymentMethodName = typeof PHOENIX_INCOME_PAYMENT_METHODS[number];

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function canonicalPhoenixIncomePaymentMethod(value: unknown): PhoenixIncomePaymentMethodName | null {
  const normalized = normalize(value);
  if (normalized === 'PIX') return 'PIX';
  if (normalized === 'DINHEIRO') return 'DINHEIRO';
  if (normalized === 'TRANSFERENCIA BANCARIA' || normalized === 'DEPOSITO BANCARIO') return 'TRANSFERÊNCIA BANCÁRIA';
  if (normalized.includes('VEROCARD')) return 'VEROCARD';
  return null;
}

export function phoenixIncomePaymentMethodOptions(methods: PaymentMethod[]) {
  return methods
    .filter((item) => item.isActive && canonicalPhoenixIncomePaymentMethod(item.name))
    .sort((left, right) => {
      const leftName = canonicalPhoenixIncomePaymentMethod(left.name);
      const rightName = canonicalPhoenixIncomePaymentMethod(right.name);
      return PHOENIX_INCOME_PAYMENT_METHODS.indexOf(leftName!) - PHOENIX_INCOME_PAYMENT_METHODS.indexOf(rightName!);
    });
}

export function missingPhoenixIncomePaymentMethods(methods: PaymentMethod[]) {
  const available = new Set(phoenixIncomePaymentMethodOptions(methods).map((item) => canonicalPhoenixIncomePaymentMethod(item.name)));
  return PHOENIX_INCOME_PAYMENT_METHODS.filter((name) => !available.has(name));
}
