export const REQUIRED_INCOME_PAYMENT_METHODS = [
  'PIX',
  'DINHEIRO',
  'DEPÓSITO BANCÁRIO',
] as const;

export type RequiredIncomePaymentMethod = typeof REQUIRED_INCOME_PAYMENT_METHODS[number];

export type PaymentMethodCatalogItem = {
  id: string;
  name: string;
  userId?: string | null;
  isActive?: boolean;
};

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function canonicalIncomePaymentMethod(value: unknown): RequiredIncomePaymentMethod | null {
  const normalized = normalize(value);
  if (normalized === 'PIX') return 'PIX';
  if (normalized === 'DINHEIRO') return 'DINHEIRO';
  if (normalized === 'DEPOSITO BANCARIO') return 'DEPÓSITO BANCÁRIO';
  return null;
}

export function auditIncomePaymentMethods(items: PaymentMethodCatalogItem[], userId?: string | null) {
  const scoped = items.filter((item) => item.isActive !== false && (!userId || item.userId === userId));
  const available = new Map<RequiredIncomePaymentMethod, PaymentMethodCatalogItem>();

  for (const item of scoped) {
    const canonical = canonicalIncomePaymentMethod(item.name);
    if (canonical && !available.has(canonical)) available.set(canonical, item);
  }

  return {
    required: [...REQUIRED_INCOME_PAYMENT_METHODS],
    available: REQUIRED_INCOME_PAYMENT_METHODS.flatMap((name) => {
      const item = available.get(name);
      return item ? [{ name, id: item.id }] : [];
    }),
    missing: REQUIRED_INCOME_PAYMENT_METHODS.filter((name) => !available.has(name)),
    ready: REQUIRED_INCOME_PAYMENT_METHODS.every((name) => available.has(name)),
  };
}
