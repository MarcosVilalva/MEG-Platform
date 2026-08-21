const DIACRITIC_PATTERN = /[\u0300-\u036f]/g;

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(DIACRITIC_PATTERN, '')
    .trim()
    .toUpperCase();
}

/**
 * Regra canônica da situação exibida no editor de lançamentos.
 * Lançamentos já existentes nunca são reabertos implicitamente ao editar.
 */
export function transactionStatusPolicy({ type, modality, currentStatus = '', isNew = true } = {}) {
  const normalizedType = normalize(type);
  const normalizedModality = normalize(modality);
  const existingStatus = normalize(currentStatus) === 'PAID' ? 'paid' : normalize(currentStatus) === 'PAGO' ? 'paid' : 'pending';

  if (normalizedType === 'INCOME' || normalizedType === 'RECEITA') {
    return { status: 'paid', locked: true, reason: 'income' };
  }
  if (normalizedModality.includes('ALIMENTA')) {
    return { status: 'paid', locked: true, reason: 'benefit' };
  }
  if (normalizedModality === 'CREDITO') {
    return { status: isNew ? 'pending' : existingStatus, locked: true, reason: 'credit' };
  }
  return { status: isNew ? 'pending' : existingStatus, locked: false, reason: 'selectable' };
}
