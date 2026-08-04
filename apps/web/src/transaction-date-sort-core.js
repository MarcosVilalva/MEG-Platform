export function compareTransactionPurchaseDates(a, b, direction = 'asc') {
  const first = String(a?.purchaseDate || '');
  const second = String(b?.purchaseDate || '');

  if (!first && !second) {
    return String(b?.date || '').localeCompare(String(a?.date || ''));
  }
  if (!first) return 1;
  if (!second) return -1;

  const result = first.localeCompare(second);
  if (result !== 0) return direction === 'desc' ? -result : result;

  const dueDateResult = String(b?.date || '').localeCompare(String(a?.date || ''));
  if (dueDateResult !== 0) return dueDateResult;
  return String(a?.id || '').localeCompare(String(b?.id || ''));
}
