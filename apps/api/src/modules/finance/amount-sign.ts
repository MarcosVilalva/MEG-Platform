const inflowTypes = new Set(['income', 'redemption']);

export function financialAmountValues(type: string, enteredAmount: number) {
  const direction = inflowTypes.has(type) ? 1 : -1;
  return {
    amount: Math.abs(enteredAmount),
    signedAmount: direction * enteredAmount
  };
}

/** Serializa centavos exatos para campos Prisma.Decimal, sem recriar a politica de sinal. */
export function financialCentsDecimal(value: number): string {
 const cents = Math.round(value * 100);
 if (!Number.isFinite(value) || !Number.isSafeInteger(cents))
  throw new Error('INVALID_FINANCIAL_AMOUNT');
 const abs = Math.abs(cents);
 return (cents < 0 ? '-' : '') + String(Math.trunc(abs / 100)) +
  '.' + String(abs % 100).padStart(2, '0');
}

export function enteredAmountFromStored(type: string, signedAmount: number) {
  return inflowTypes.has(type) ? signedAmount : -signedAmount;
}
