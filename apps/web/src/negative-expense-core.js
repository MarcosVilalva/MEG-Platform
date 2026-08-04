export function normalizeFinancialText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

export function parseFinancialAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  const raw = String(value ?? '').trim();
  if (!raw) return Number.NaN;

  let normalized = raw
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/[^0-9,.-]/g, '');

  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

export function isInstallmentExpenseModality(modality) {
  const normalized = normalizeFinancialText(modality);
  return normalized === 'CREDITO' || normalized === 'CREDIARIO';
}

export function validateExpenseAmount({
  type = 'expense',
  modality = '',
  amount = '',
  recurrenceEnabled = false,
} = {}) {
  const parsedAmount = parseFinancialAmount(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount >= 0) {
    return {
      valid: true,
      negative: false,
      amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
      creditAmount: 0,
      message: '',
    };
  }

  if (String(type) !== 'expense') {
    return {
      valid: false,
      negative: true,
      amount: parsedAmount,
      creditAmount: Math.abs(parsedAmount),
      message: 'Valor negativo é permitido somente em despesas.',
    };
  }

  if (isInstallmentExpenseModality(modality)) {
    return {
      valid: false,
      negative: true,
      amount: parsedAmount,
      creditAmount: Math.abs(parsedAmount),
      message: 'Crédito e crediário não aceitam valor negativo. Registre o abatimento como uma conta comum.',
    };
  }

  if (recurrenceEnabled) {
    return {
      valid: false,
      negative: true,
      amount: parsedAmount,
      creditAmount: Math.abs(parsedAmount),
      message: 'Valor negativo deve ser lançado isoladamente, sem recorrência mensal.',
    };
  }

  return {
    valid: true,
    negative: true,
    amount: parsedAmount,
    creditAmount: Math.abs(parsedAmount),
    message: 'Crédito ou abatimento que reduz a despesa do período.',
  };
}
