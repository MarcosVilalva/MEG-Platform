const inflowTypes = new Set(['income', 'redemption']);

export function financialAmountValues(type: string, enteredAmount: number) {
  const direction = inflowTypes.has(type) ? 1 : -1;
  return {
    amount: Math.abs(enteredAmount),
    signedAmount: direction * enteredAmount
  };
}

export function enteredAmountFromStored(type: string, signedAmount: number) {
  return inflowTypes.has(type) ? signedAmount : -signedAmount;
}
