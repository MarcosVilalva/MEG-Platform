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
  installmentCount = 1,
  ongoingInstallmentEnabled = false,
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

  if (recurrenceEnabled) {
    return {
      valid: false,
      negative: true,
      amount: parsedAmount,
      creditAmount: Math.abs(parsedAmount),
      message: 'Valor negativo deve ser lançado isoladamente, sem recorrência mensal.',
    };
  }

  if (ongoingInstallmentEnabled) {
    return {
      valid: false,
      negative: true,
      amount: parsedAmount,
      creditAmount: Math.abs(parsedAmount),
      message: 'Parcelamento já em andamento não aceita valor negativo.',
    };
  }

  const installments = Math.max(Number.parseInt(String(installmentCount || 1), 10) || 1, 1);
  if (isInstallmentExpenseModality(modality) && installments > 1) {
    return {
      valid: false,
      negative: true,
      amount: parsedAmount,
      creditAmount: Math.abs(parsedAmount),
      message: 'Crédito ou crediário com valor negativo deve ter somente 1 parcela.',
    };
  }

  return {
    valid: true,
    negative: true,
    amount: parsedAmount,
    creditAmount: Math.abs(parsedAmount),
    message: isInstallmentExpenseModality(modality)
      ? 'Crédito ou estorno lançado em uma única fatura.'
      : 'Crédito ou abatimento que reduz a despesa do período.',
  };
}
