export function compareNumbersWithEmptyLast(a, b, direction = 'asc') {
  const aNumber = Number(a);
  const bNumber = Number(b);
  const aValid = Number.isFinite(aNumber);
  const bValid = Number.isFinite(bNumber);

  if (aValid !== bValid) return aValid ? -1 : 1;
  if (!aValid) return 0;

  const difference = aNumber - bNumber;
  return direction === 'desc' ? -difference : difference;
}

export function compareTransactionAmountRows(a, b, key, direction, valueReader) {
  const expectedType = key === 'income' ? 'income' : 'expense';
  const aApplicable = a?.type === expectedType;
  const bApplicable = b?.type === expectedType;

  if (aApplicable !== bApplicable) return aApplicable ? -1 : 1;
  if (!aApplicable) return 0;

  return compareNumbersWithEmptyLast(
    valueReader(a, key),
    valueReader(b, key),
    direction,
  );
}
