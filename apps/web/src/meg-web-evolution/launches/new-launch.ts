import type { Account, Category, PaymentMethod, FinancialEventInput } from '../../app/finance-client';

export type BasicLaunchType = 'income' | 'expense';

/** Format-only validation. All financial rules and final status stay on the server. */
export function parsePositiveBRL(value: string): number | null {
  const text = value.trim();
  if (!/^(?:[0-9]{1,3}(?:\.[0-9]{3})+|[0-9]+)(?:,[0-9]{1,2})?$/.test(text)) return null;
  const clean = text.replace(/\./g, '');
  const [whole, fraction = ''] = clean.split(',');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents / 100;
}

export function validISODate(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(day + 'T00:00:00.000Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

function normalized(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

export function eligibleAccount(account: Account): boolean {
  return account.isActive && ['CHECKING', 'SAVINGS', 'CASH'].includes(normalized(account.type));
}

export function eligiblePaymentMethod(method: PaymentMethod): boolean {
  return method.isActive && !['CREDIT', 'TRANSFER'].includes(normalized(method.type))
    && normalized(method.name) !== 'VEROCARD';
}

/** Prevent unintended Fixo auto-payment in the initial pending-expense slice. */
export function eligibleCategory(category: Category, type: BasicLaunchType): boolean {
  return category.isActive && (!category.type || category.type === type)
    && (type !== 'expense' || (normalized(category.name) !== 'FIXO' && normalized(category.group) !== 'FIXO'));
}

export type BasicLaunchFields = {
  type: BasicLaunchType;
  description: string;
  amount: string;
  day: string;
  accountId: string;
  categoryId: string;
  paymentMethodId: string;
  notes: string;
};

export function basicLaunchInput(
  fields: BasicLaunchFields,
  accounts: Account[],
  categories: Category[],
  methods: PaymentMethod[],
): FinancialEventInput {
  const amount = parsePositiveBRL(fields.amount);
  if (!fields.description.trim() || fields.description.trim().length > 300) throw new Error('Informe uma descrição de até 300 caracteres.');
  if (!validISODate(fields.day)) throw new Error('Informe uma data válida.');
  if (amount === null) throw new Error('Informe um valor positivo com até duas casas decimais.');
  if (!accounts.some(a => a.id === fields.accountId && eligibleAccount(a))) throw new Error('Selecione uma conta monetária ativa.');
  if (!categories.some(c => c.id === fields.categoryId && eligibleCategory(c, fields.type))) throw new Error('Selecione uma categoria válida para este tipo.');
  if (!methods.some(m => m.id === fields.paymentMethodId && eligiblePaymentMethod(m))) throw new Error('Selecione uma forma de pagamento sem vínculo com cartão ou benefício.');
  if (fields.notes.length > 1000) throw new Error('Observações devem ter no máximo 1.000 caracteres.');
  // Requested status only. Income/Fixo classification is authoritative on the backend.
  // Paid expenses are intentionally outside this initial slice while balance protection is audited.
  return {
    type: fields.type,
    status: 'planned',
    description: fields.description.trim(),
    amount,
    date: fields.day,
    accountId: fields.accountId,
    categoryId: fields.categoryId,
    paymentMethodId: fields.paymentMethodId,
    notes: fields.notes.trim(),
  };
}
